/**
 * Appointment payment endpoints (PATIENT → HOSPITAL admin via Meta Native Pay).
 *
 *   POST /api/payment/razorpay-webhook   — server-side confirmation backup from
 *                                          the hospital admin's Razorpay account
 *
 * The primary confirmation path is the Meta `payment` interactive handled in
 * routes/webhook.js. This webhook is a reliable backup in case the in-chat
 * status message is missed. Both converge on apptPayments.markApptPaid().
 *
 * NOTE: this uses the hospital admin's Razorpay webhook secret
 * (RAZORPAY_WEBHOOK_SECRET) — separate from the super-admin subscription keys.
 */
const express = require('express');
const crypto = require('crypto');
const { markApptPaid, findApptByReference } = require('../services/apptPayments');

const router = express.Router();

router.post('/razorpay-webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[payment] webhook called but RAZORPAY_WEBHOOK_SECRET not set');
      return res.status(500).json({ error: 'webhook secret not configured' });
    }
    const signature = req.headers['x-razorpay-signature'];
    const body = req.rawBody || JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (!signature || signature !== expected) {
      console.warn('[payment] webhook signature verification failed');
      return res.status(401).json({ error: 'invalid signature' });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(body);
    console.log('[payment] razorpay webhook', { event: event.event, id: event.id });

    if (event.event === 'payment_link.paid' || event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const notes = paymentEntity?.notes || event.payload?.payment_link?.entity?.notes || {};
      const paymentId = paymentEntity?.id || '';
      const referenceId = notes.reference_id || notes.appointment_id || '';

      const appt = await findApptByReference(referenceId);
      if (appt) {
        if (appt.paymentStatus !== 'paid') {
          await markApptPaid(appt, { paymentId, metaPaymentStatus: 'captured', source: 'razorpay_webhook' });
        }
      } else {
        console.warn('[payment] no appointment found for reference', referenceId);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[payment] webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
