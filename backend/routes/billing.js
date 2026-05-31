/**
 * Billing / subscription purchase + renewal — via Razorpay Payment Links.
 *
 *   GET  /api/billing/config           — Razorpay configured flag
 *   GET  /api/billing/status           — current admin's subscription status (premium badge, days left)
 *   POST /api/billing/link             — create a Razorpay Payment Link for a chosen plan (returns hosted URL)
 *   GET  /api/billing/callback         — Razorpay redirects here after payment; verifies + activates + emails invoice
 *   GET  /api/billing/history          — super admin: full purchase/renewal history
 *
 * Payment Links are used instead of the Checkout popup so NO web domain needs
 * to be registered with Razorpay — the same credentials work on any domain.
 * Razorpay credentials belong to the super admin / platform and live in the
 * backend .env. WhatsApp automation unlocks only after a verified payment.
 */
const express = require('express');
const Admin = require('../models/Admin');
const Plan = require('../models/Plan');
const PaymentLink = require('../models/PaymentLink');
const razorpay = require('../services/razorpay');
const subscriptionSvc = require('../services/subscription');
const emailSvc = require('../services/email');
const invoicePdf = require('../services/invoicePdf');
const settingsSvc = require('../services/settings');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

function frontendUrl() {
  return (process.env.FRONTEND_URL || '').replace(/\/+$/, '') || 'http://localhost:5173';
}
function backendUrl() {
  return (process.env.BACKEND_URL || '').replace(/\/+$/, '');
}

/**
 * Normalise an Indian mobile number into the +91XXXXXXXXXX form Razorpay
 * prefills cleanly. Returns undefined if we can't produce a valid 10-digit
 * number (so Razorpay won't reject the whole link for a malformed contact).
 */
function normalizeContact(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return undefined;
}

/** Razorpay availability (no public key needed — payment happens on hosted page). */
router.get('/config', auth, (req, res) => {
  res.json({ configured: razorpay.isConfigured() });
});

/** Current admin subscription status. */
router.get('/status', auth, async (req, res) => {
  try {
    const status = await subscriptionSvc.statusForAdmin(req.user.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a Razorpay Payment Link for the selected plan and return the hosted
 * URL. The frontend redirects the admin there; no domain whitelisting needed.
 */
router.post('/link', auth, async (req, res) => {
  try {
    if (!razorpay.isConfigured()) {
      return res.status(400).json({ error: 'Payments are not configured. Contact the platform owner.' });
    }
    const back = backendUrl();
    if (!back.startsWith('https://')) {
      return res.status(400).json({ error: 'BACKEND_URL must be a public HTTPS URL for payment callbacks.' });
    }

    const { planId } = req.body || {};
    const plan = await Plan.findById(planId);
    if (!plan || !plan.active) return res.status(404).json({ error: 'Plan not found' });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    // Razorpay caps reference_id at 40 chars. Keep it short + unique; the
    // callback matches records by razorpay_payment_link_id, not this value.
    const referenceId = `vh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const callbackUrl = `${back}/api/billing/callback`;
    const link = await razorpay.createPaymentLink({
      amountRupees: plan.price,
      referenceId,
      description: `${plan.name} subscription — ${admin.name || admin.username}`,
      customer: {
        name: admin.name,
        email: admin.email,
        contact: normalizeContact(admin.phone || admin.username),
      },
      callbackUrl,
      notes: { adminId: String(admin._id), planId: String(plan._id), planCode: plan.code },
    });

    await PaymentLink.create({
      razorpayLinkId: link.id,
      referenceId,
      shortUrl: link.short_url,
      admin: admin._id,
      plan: plan._id,
      amount: plan.price,
      status: 'created',
    });

    res.json({ url: link.short_url, linkId: link.id });
  } catch (err) {
    console.error('[billing] link failed:', err.response?.data || err.message);
    res.status(400).json({ error: err.response?.data?.error?.description || err.message });
  }
});

/**
 * Razorpay redirects the customer here (GET) after the hosted payment page.
 * We verify the signature, activate the plan, email the invoice, then redirect
 * the browser back to the frontend Purchase page with a result flag.
 */
router.get('/callback', async (req, res) => {
  const fe = `${frontendUrl()}/purchase`;
  try {
    const {
      razorpay_payment_id,
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      razorpay_signature,
    } = req.query || {};

    const ok = razorpay.verifyPaymentLinkSignature({
      paymentLinkId: razorpay_payment_link_id,
      referenceId: razorpay_payment_link_reference_id,
      status: razorpay_payment_link_status,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!ok) return res.redirect(`${fe}?payment=failed&reason=signature`);

    const record = await PaymentLink.findOne({ razorpayLinkId: razorpay_payment_link_id });
    if (!record) return res.redirect(`${fe}?payment=failed&reason=unknown_link`);

    // Idempotency — if we already processed this link, just bounce to success.
    if (record.status === 'processed') return res.redirect(`${fe}?payment=success`);

    if (razorpay_payment_link_status !== 'paid') {
      record.status = 'failed';
      await record.save();
      return res.redirect(`${fe}?payment=failed&reason=not_paid`);
    }

    const plan = await Plan.findById(record.plan);
    const admin = await Admin.findById(record.admin);
    if (!plan || !admin) return res.redirect(`${fe}?payment=failed&reason=missing`);

    const sub = await subscriptionSvc.activate({
      admin,
      plan,
      payment: {
        orderId: razorpay_payment_link_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
    });

    record.status = 'processed';
    record.subscription = sub._id;
    await record.save();

    // Generate + email invoice (best-effort — never store the PDF).
    try {
      if (admin.email && emailSvc.isConfigured()) {
        const settings = await settingsSvc.get();
        const pdfBuffer = await invoicePdf.buildInvoicePdf({ subscription: sub.toObject(), plan: plan.toObject(), admin, settings });
        await emailSvc.send({
          to: admin.email,
          subject: `Your ${plan.name} subscription invoice — ${sub.invoiceNumber}`,
          text: `Hello ${admin.name || ''},\n\nThank you for your purchase of the "${plan.name}" plan.\n\nInvoice: ${sub.invoiceNumber}\nAmount: INR ${sub.amount}\nValid: ${new Date(sub.startsAt).toDateString()} to ${new Date(sub.endsAt).toDateString()}\n\nYour invoice is attached.\n\n— ${settings?.hospitalName || 'Vijya Hospital'}`,
          attachments: [{ filename: `Invoice-${sub.invoiceNumber}.pdf`, content: pdfBuffer }],
        });
        sub.invoiceSentTo = admin.email;
        sub.invoiceSentAt = new Date();
        await sub.save();
      }
    } catch (mailErr) {
      console.error('[billing] invoice email failed:', mailErr.message);
    }

    return res.redirect(`${fe}?payment=success`);
  } catch (err) {
    console.error('[billing] callback failed:', err.message);
    return res.redirect(`${fe}?payment=failed&reason=error`);
  }
});

/** Super admin: full plan/purchase/renewal history. */
router.get('/history', auth, requireSuperAdmin, async (req, res) => {
  try {
    const list = await subscriptionSvc.history();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
