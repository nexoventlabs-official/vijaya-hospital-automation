/**
 * Shared "mark an appointment as paid" pipeline for online (Meta Native
 * WhatsApp Pay) payments — patient → hospital admin.
 *
 * Called from:
 *   - routes/webhook.js   (Meta Native WhatsApp Pay — `payment` interactive)
 *   - routes/payment.js   (Razorpay webhook backup confirmation)
 *
 * Pipeline:
 *   1. Set paymentStatus = 'paid' (+ txn id / status)
 *   2. Re-sync the Google Sheets row
 *   3. Send the "Payment Received" message + appointment confirmation PDF
 */
const Appointment = require('../models/Appointment');
const sheets = require('./googleSheets');
const realtime = require('./realtime');
const redis = require('./redis');
const chatbot = require('./chatbot');

/**
 * Resolve an appointment from a Meta Native Pay reference id.
 * Reference ids we send are `APPT-<appointmentId>`; also accept the raw id.
 */
async function findApptByReference(referenceId) {
  if (!referenceId) return null;
  let appt = await Appointment.findOne({ metaReferenceId: referenceId });
  if (appt) return appt;
  const stripped = String(referenceId).replace(/^APPT-/i, '');
  if (/^[a-f0-9]{24}$/i.test(stripped)) {
    appt = await Appointment.findById(stripped);
  }
  return appt;
}

/**
 * @param {object} appt - Appointment mongoose doc (NOT lean)
 * @param {object} opts
 * @param {string} [opts.paymentId]
 * @param {string} [opts.metaPaymentStatus]
 * @param {string} [opts.source]
 * @returns {Promise<boolean>} true if it transitioned to paid here
 */
async function markApptPaid(appt, opts = {}) {
  if (!appt) return false;
  if (appt.paymentStatus === 'paid') return false;

  appt.paymentStatus = 'paid';
  appt.paymentMode = 'online';
  if (opts.paymentId) appt.paymentTxnId = opts.paymentId;
  if (opts.metaPaymentStatus) appt.metaPaymentStatus = opts.metaPaymentStatus;
  await appt.save();

  // Re-sync the sheet row (non-blocking)
  if (sheets.isReady()) {
    sheets.upsertRow(
      appt.status === 'completed'
        ? sheets.TAB_COMPLETED
        : (new Date(`${appt.date}T00:00:00`).getTime() === new Date().setHours(0, 0, 0, 0)
            ? sheets.TAB_TODAY
            : sheets.TAB_UPCOMING),
      appt.toObject()
    ).catch((err) => console.warn('[apptPayments] sheet sync failed:', err.message));
  }

  await realtime.emit('appointments', { kind: 'payment_updated', code: appt.code });

  // Invalidate caches so admin panel reflects the paid status immediately.
  redis.delPattern('vh:cache:appointments:*').catch(() => {});
  redis.del('vh:cache:dashboard:stats').catch(() => {});

  // WhatsApp confirmation (non-blocking)
  (async () => {
    try {
      const lang = await chatbot.getLanguage(appt.patientPhone);
      await chatbot.sendPaymentSuccess(appt.patientPhone, appt.toObject(), lang);
    } catch (err) {
      console.error('[apptPayments] WhatsApp delivery failed:', err.response?.data || err.message);
    }
  })();

  console.log('[apptPayments] appointment marked paid', {
    code: appt.code,
    source: opts.source || '',
    paymentId: opts.paymentId || '',
  });
  return true;
}

module.exports = { markApptPaid, findApptByReference };
