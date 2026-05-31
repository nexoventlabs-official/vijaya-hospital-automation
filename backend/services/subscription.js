/**
 * Subscription state + WhatsApp automation gating.
 *
 * WhatsApp automation (welcome message, chatbot, booking flow) is enabled only
 * when at least one admin (the hospital operator) holds an active, non-expired
 * subscription. Until a plan is purchased — or after it expires — inbound
 * messages are silently ignored: a user sending "hi" gets no reply.
 *
 * The "global automation enabled" flag is cached briefly to avoid a Mongo
 * round-trip on every inbound WhatsApp event.
 */
const Subscription = require('../models/Subscription');
const Admin = require('../models/Admin');

let _enabledCache = { value: false, at: 0 };
const TTL = 20 * 1000;

/** Lazily flip any past-due "active" subscriptions to "expired". */
async function expireStale() {
  const now = new Date();
  await Subscription.updateMany(
    { status: 'active', endsAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );
}

/**
 * The current (most relevant) subscription for an admin:
 * the active one with the furthest end date, else the latest record overall.
 */
async function getCurrentForAdmin(adminId) {
  await expireStale();
  const active = await Subscription.findOne({ admin: adminId, status: 'active', endsAt: { $gt: new Date() } })
    .sort({ endsAt: -1 })
    .lean();
  if (active) return active;
  return Subscription.findOne({ admin: adminId }).sort({ createdAt: -1 }).lean();
}

/** Full status object used by the admin UI (premium badge, days left, etc). */
async function statusForAdmin(adminId) {
  const sub = await getCurrentForAdmin(adminId);
  const now = Date.now();
  const isActive = !!(sub && sub.status === 'active' && new Date(sub.endsAt).getTime() > now);
  let daysLeft = 0;
  if (isActive) {
    daysLeft = Math.max(0, Math.ceil((new Date(sub.endsAt).getTime() - now) / (24 * 60 * 60 * 1000)));
  }
  return {
    active: isActive,
    daysLeft,
    plan: sub
      ? {
          planCode: sub.planCode,
          planName: sub.planName,
          amount: sub.amount,
          startsAt: sub.startsAt,
          endsAt: sub.endsAt,
          status: sub.status,
          renewalCount: sub.renewalCount || 0,
        }
      : null,
  };
}

/** True when ANY admin currently has an active subscription. Cached ~20s. */
async function isAutomationEnabled(force = false) {
  if (!force && Date.now() - _enabledCache.at < TTL) return _enabledCache.value;
  await expireStale();
  const count = await Subscription.countDocuments({ status: 'active', endsAt: { $gt: new Date() } });
  _enabledCache = { value: count > 0, at: Date.now() };
  return _enabledCache.value;
}

function clearCache() {
  _enabledCache = { value: false, at: 0 };
}

/**
 * Activate a plan for an admin after a verified payment.
 * Handles renewal stacking: if the admin already has an active subscription,
 * the new period starts when the current one ends and the renewal count is
 * carried forward + incremented.
 *
 * @returns {Promise<Subscription>}
 */
async function activate({ admin, plan, payment }) {
  await expireStale();

  const existing = await Subscription.findOne({ admin: admin._id, status: 'active', endsAt: { $gt: new Date() } })
    .sort({ endsAt: -1 });

  const isRenewal = !!existing;
  const startsAt = isRenewal ? new Date(existing.endsAt) : new Date();
  const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const renewalCount = isRenewal ? (existing.renewalCount || 0) + 1 : 0;

  const invoiceNumber = generateInvoiceNumber();

  const sub = await Subscription.create({
    admin: admin._id,
    adminUsername: admin.username,
    adminName: admin.name,
    adminEmail: admin.email,
    plan: plan._id,
    planCode: plan.code,
    planName: plan.name,
    durationDays: plan.durationDays,
    amount: plan.price,
    status: 'active',
    startsAt,
    endsAt,
    isRenewal,
    renewalCount,
    razorpayOrderId: payment?.orderId || '',
    razorpayPaymentId: payment?.paymentId || '',
    razorpaySignature: payment?.signature || '',
    invoiceNumber,
  });

  // If this is a renewal, keep the renewal count in sync on the prior record too.
  if (isRenewal) {
    existing.renewalCount = renewalCount;
    await existing.save();
  }

  clearCache();
  return sub;
}

function generateInvoiceNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `VH-${ymd}-${rand}`;
}

/** History for super admin — all subscriptions, newest first. */
async function history() {
  await expireStale();
  return Subscription.find().sort({ createdAt: -1 }).lean();
}

module.exports = {
  expireStale,
  getCurrentForAdmin,
  statusForAdmin,
  isAutomationEnabled,
  clearCache,
  activate,
  history,
  generateInvoiceNumber,
};
