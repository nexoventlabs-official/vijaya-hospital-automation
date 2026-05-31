const mongoose = require('mongoose');

/**
 * A subscription record created when an admin successfully pays for a plan.
 *
 * The "current" subscription for an admin is the one with the latest `endsAt`
 * whose `status === 'active'`. WhatsApp automation is enabled only while an
 * admin has an active, non-expired subscription.
 *
 * Renewals reuse the same logical subscription "line" via `renewalOf` so the
 * super admin can see how many times a plan was renewed. Each paid period is
 * still stored as its own document for a clean audit trail / plan history.
 */
const SubscriptionSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    adminUsername: { type: String, default: '' },
    adminName: { type: String, default: '' },
    adminEmail: { type: String, default: '' },

    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planCode: { type: String, default: '' },
    planName: { type: String, default: '' },
    durationDays: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }, // rupees actually charged

    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },

    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true, index: true },

    // Renewal tracking
    isRenewal: { type: Boolean, default: false },
    renewalCount: { type: Number, default: 0 }, // how many times THIS line was renewed

    // Razorpay payment details
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },

    // Invoice
    invoiceNumber: { type: String, default: '' },
    invoiceSentTo: { type: String, default: '' },
    invoiceSentAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);
