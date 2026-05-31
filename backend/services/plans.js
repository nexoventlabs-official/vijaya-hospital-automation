/**
 * Plan helpers — seeds the three default plans and exposes lookups.
 *
 * Defaults (editable later by the super admin in the Plans page):
 *   • 1 month   → ₹3,000   (MRP ₹4,000)
 *   • 6 months  → ₹15,000  (MRP ₹24,000)
 *   • 12 months → ₹25,000  (MRP ₹48,000)
 */
const Plan = require('../models/Plan');

const DEFAULT_PLANS = [
  {
    code: 'monthly',
    name: '1 Month',
    durationDays: 30,
    price: 3000,
    mrp: 4000,
    description: 'Full access for 1 month',
    sortOrder: 1,
  },
  {
    code: 'half_yearly',
    name: '6 Months',
    durationDays: 180,
    price: 15000,
    mrp: 24000,
    description: 'Full access for 6 months — save more',
    sortOrder: 2,
  },
  {
    code: 'yearly',
    name: '12 Months',
    durationDays: 365,
    price: 25000,
    mrp: 48000,
    description: 'Best value — full access for 1 year',
    sortOrder: 3,
  },
];

/** Create default plans if the collection is empty. Idempotent. */
async function ensureDefaults() {
  const count = await Plan.countDocuments();
  if (count > 0) return;
  await Plan.insertMany(DEFAULT_PLANS);
  console.log('[Seed] Default plans created (1m / 6m / 12m)');
}

async function listActive() {
  return Plan.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
}

async function listAll() {
  return Plan.find().sort({ sortOrder: 1, price: 1 }).lean();
}

module.exports = { ensureDefaults, listActive, listAll, DEFAULT_PLANS };
