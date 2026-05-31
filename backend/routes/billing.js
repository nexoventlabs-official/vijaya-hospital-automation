/**
 * Billing / subscription purchase + renewal.
 *
 *   GET  /api/billing/config           — Razorpay public key + configured flag
 *   GET  /api/billing/status           — current admin's subscription status (premium badge, days left)
 *   POST /api/billing/order            — create a Razorpay order for a chosen plan
 *   POST /api/billing/verify           — verify payment, activate plan, email invoice
 *   GET  /api/billing/history          — super admin: full purchase/renewal history
 *
 * Razorpay credentials belong to the super admin / platform and live in the
 * backend .env. WhatsApp automation unlocks only after a verified payment.
 */
const express = require('express');
const Admin = require('../models/Admin');
const Plan = require('../models/Plan');
const razorpay = require('../services/razorpay');
const subscriptionSvc = require('../services/subscription');
const emailSvc = require('../services/email');
const invoicePdf = require('../services/invoicePdf');
const settingsSvc = require('../services/settings');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

/** Public Razorpay key for the Checkout widget. */
router.get('/config', auth, (req, res) => {
  res.json({
    configured: razorpay.isConfigured(),
    keyId: razorpay.publicKeyId(),
  });
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

/** Create a Razorpay order for the selected plan. */
router.post('/order', auth, async (req, res) => {
  try {
    if (!razorpay.isConfigured()) {
      return res.status(400).json({ error: 'Payments are not configured. Contact the platform owner.' });
    }
    const { planId } = req.body || {};
    const plan = await Plan.findById(planId);
    if (!plan || !plan.active) return res.status(404).json({ error: 'Plan not found' });

    const order = await razorpay.createOrder({
      amountRupees: plan.price,
      receipt: `sub_${req.user.id}_${Date.now()}`.slice(0, 40),
      notes: { adminId: String(req.user.id), planCode: plan.code, planName: plan.name },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpay.publicKeyId(),
      plan: { id: plan._id, name: plan.name, price: plan.price, durationDays: plan.durationDays },
    });
  } catch (err) {
    console.error('[billing] order failed:', err.response?.data || err.message);
    res.status(400).json({ error: err.response?.data?.error?.description || err.message });
  }
});

/** Verify payment, activate the plan, then email the invoice dynamically. */
router.post('/verify', auth, async (req, res) => {
  try {
    const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const ok = razorpay.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!ok) return res.status(400).json({ error: 'Payment verification failed' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const sub = await subscriptionSvc.activate({
      admin,
      plan,
      payment: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
    });

    // Generate + email invoice (best-effort — never store the PDF).
    let invoiceEmailed = false;
    let invoiceError = '';
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
        invoiceEmailed = true;
      } else if (!admin.email) {
        invoiceError = 'No email on file for this admin.';
      } else {
        invoiceError = 'Email service not configured.';
      }
    } catch (mailErr) {
      console.error('[billing] invoice email failed:', mailErr.message);
      invoiceError = 'Invoice email could not be sent.';
    }

    const status = await subscriptionSvc.statusForAdmin(req.user.id);
    res.json({ ok: true, subscription: { invoiceNumber: sub.invoiceNumber, endsAt: sub.endsAt }, status, invoiceEmailed, invoiceError });
  } catch (err) {
    console.error('[billing] verify failed:', err.message);
    res.status(400).json({ error: err.message });
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
