/**
 * Meta WhatsApp webhook receiver.
 *
 * Handles:
 *   • GET  /api/webhook/meta  — Meta verification handshake
 *   • POST /api/webhook/meta  — every inbound event (messages, flow-completes,
 *                               status updates). Signature-verified.
 *
 * Flow-completion (`nfm_reply`) actions are dispatched here:
 *   • kind = 'book_confirm'         → finalise booking + send PDF + directions
 *   • kind = 'reschedule_confirm'   → run reschedule + send new PDF
 *   • kind = 'cancel_confirm'       → cancel + send cancellation PDF
 *   • kind = 'service_pick'         → fallback handler for website/contact buttons
 */
const express = require('express');
const crypto = require('crypto');

const chatbot = require('../services/chatbot');
const meta = require('../services/metaCloud');
const flowEndpoint = require('./flowEndpoint');
const apptService = require('../services/appointmentService');
const subscriptionSvc = require('../services/subscription');
const Appointment = require('../models/Appointment');
const { t } = require('../services/i18n');

const router = express.Router();

/* ─── verify handshake ─────────────────────────────────────────────────── */
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) return res.sendStatus(500);
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  if (!mode && !token) return res.json({ status: 'webhook active' });
  return res.sendStatus(403);
});

/* ─── signature verification ──────────────────────────────────────────── */
function verifySignature(req) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ─── flow-completion dispatcher ──────────────────────────────────────── */
async function handleFlowCompletion(msg) {
  const nfm = msg.interactive?.nfm_reply;
  if (!nfm || !nfm.response_json) return false;

  let payload = {};
  try {
    payload = JSON.parse(nfm.response_json) || {};
  } catch {
    return false;
  }

  const phone = chatbot.normPhone(msg.from);
  const lang = await chatbot.getLanguage(phone);

  try {
    switch (payload.kind) {
      case 'book_confirm': {
        const data = await flowEndpoint.loadBookingToken(payload.booking_token);
        if (!data) {
          await meta.sendText(phone, t('generic_error', lang));
          await chatbot.sendChooseService(phone, lang);
          return true;
        }
        const [date, time] = String(data.slot || '').split('|');
        if (!date || !time) {
          await meta.sendText(phone, t('generic_error', lang));
          return true;
        }
        const appt = await apptService.bookAppointment({
          patientPhone: phone,
          patientName: data.patient_name,
          patientAge: data.patient_age ? parseInt(data.patient_age, 10) : undefined,
          patientGender: data.patient_gender || '',
          reason: data.reason || '',
          doctorId: data.doctor_id,
          date,
          time,
          paymentMode: payload.payment_mode === 'online' ? 'online' : 'pay_at_hospital',
        });
        await flowEndpoint.dropBookingToken(payload.booking_token);
        await chatbot.sendAppointmentPdf(phone, appt.toObject(), lang);
        return true;
      }

      case 'reschedule_confirm': {
        const apptId = payload.appt_id;
        const [date, time] = String(payload.new_slot || '').split('|');
        if (!apptId || !date || !time) {
          await meta.sendText(phone, t('generic_error', lang));
          return true;
        }
        const { newAppt } = await apptService.rescheduleAppointment(apptId, { newDate: date, newTime: time });
        await chatbot.sendRescheduledPdf(phone, newAppt.toObject(), lang);
        return true;
      }

      case 'cancel_confirm': {
        const apptId = payload.selected_appt;
        if (!apptId) {
          await meta.sendText(phone, t('generic_error', lang));
          return true;
        }
        const cancelled = await apptService.cancelAppointment(apptId, { reason: 'Cancelled via WhatsApp' });
        await chatbot.sendCancelledPdf(phone, cancelled.toObject(), lang);
        return true;
      }

      case 'service_pick': {
        // The flow's INFO terminal screen relays website/contact picks here.
        if (payload.selected_service === 'website') {
          await chatbot.sendWebsite(phone, lang);
          return true;
        }
        if (payload.selected_service === 'contact') {
          await chatbot.sendContact(phone, lang);
          return true;
        }
        await chatbot.sendChooseService(phone, lang);
        return true;
      }

      case 'appt_view_close':
        return true;

      default:
        return true;
    }
  } catch (err) {
    console.error('[webhook] dispatch failed:', err.response?.data || err.message);
    try {
      await meta.sendText(phone, t('generic_error', lang));
    } catch {}
    return true;
  }
}

/* ─── main POST receiver ──────────────────────────────────────────────── */
router.post('/meta', async (req, res) => {
  res.sendStatus(200);

  if (process.env.META_APP_SECRET && !verifySignature(req)) {
    console.warn('[webhook] invalid signature');
    return;
  }

  try {
    const body = req.body || {};
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          const from = msg.from;
          const profileName = contacts[0]?.profile?.name || '';
          let text = '';
          const type = msg.type;
          let interactive;

          if (msg.type === 'text') text = msg.text?.body || '';
          else if (msg.type === 'interactive') {
            interactive = msg.interactive;
            if (msg.interactive?.type === 'nfm_reply') {
              // Flow completions (booking/reschedule/cancel) only run while an
              // admin holds an active plan. Otherwise stay silent.
              const automationOn = await subscriptionSvc.isAutomationEnabled();
              if (!automationOn) continue;
              const handled = await handleFlowCompletion(msg);
              if (handled) continue;
            }
            text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
          } else if (msg.type === 'button') {
            text = msg.button?.text || '';
          }

          await chatbot.handleInbound({ phone: from, profileName, type, text, interactive });
        }
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err.message);
  }
});

module.exports = router;
