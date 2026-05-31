const mongoose = require('mongoose');

/**
 * A purchasable subscription plan. Seeded with three defaults
 * (1 month / 6 months / 12 months) and editable by the super admin.
 *
 * `price`        — final price the admin pays (₹, INR)
 * `mrp`          — optional "strike-through" original price used to show a discount
 * `durationDays` — how long the subscription stays active after purchase
 */
const PlanSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // e.g. 'monthly'
    name: { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // in rupees
    mrp: { type: Number, default: 0, min: 0 }, // original price for discount display
    description: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Discount percentage derived from mrp vs price (0 if no mrp / no discount). */
PlanSchema.virtual('discountPercent').get(function () {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

PlanSchema.set('toJSON', { virtuals: true });
PlanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Plan', PlanSchema);
