const mongoose = require('mongoose');

/**
 * Tracks a Razorpay Payment Link created for a plan purchase, so the (stateless)
 * Razorpay callback can be tied back to the right admin + plan and processed
 * exactly once.
 *
 * Payment Links are used instead of the Checkout popup because the hosted
 * Razorpay page does NOT require per-domain whitelisting — the same credentials
 * work on any domain.
 */
const PaymentLinkSchema = new mongoose.Schema(
  {
    razorpayLinkId: { type: String, required: true, unique: true, index: true }, // plink_xxx
    referenceId: { type: String, default: '' },
    shortUrl: { type: String, default: '' },

    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    amount: { type: Number, default: 0 },

    status: { type: String, enum: ['created', 'paid', 'processed', 'failed'], default: 'created' },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentLink', PaymentLinkSchema);
