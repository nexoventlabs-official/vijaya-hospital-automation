const mongoose = require('mongoose');

/**
 * Appointment lifecycle:
 *
 *   booked → arrived → completed
 *      └── rescheduled (creates new appointment, old gets status "rescheduled")
 *      └── cancelled
 *      └── postponed (doctor absent — moved to next available date for same doctor)
 *
 * Once an appointment is `completed` or `cancelled`, it is mirrored into Google Sheets
 * and (per requirement) removed from MongoDB to save active-storage. The Sheets row is
 * the long-term record.
 */
const AppointmentSchema = new mongoose.Schema(
  {
    /** Human-readable code shown in PDFs and WhatsApp messages (e.g. VH-A1B2C3) */
    code: { type: String, required: true, unique: true, index: true },

    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientPhone: { type: String, required: true, index: true }, // denormalised for fast lookup
    patientName: { type: String, required: true },
    patientAge: { type: Number },
    patientGender: { type: String, default: '' },
    reason: { type: String, default: '' },

    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    departmentName: { type: String, required: true }, // snapshot
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    doctorName: { type: String, required: true }, // snapshot
    doctorSpeciality: { type: String, default: '' }, // snapshot

    /** Slot — date + time string */
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm  (24h)
    timeLabel: { type: String, default: '' }, // human "10:00 AM"

    /** Fee snapshot at booking time */
    fee: { type: Number, default: 0 },
    paymentMode: {
      type: String,
      enum: ['pay_at_hospital', 'online'],
      default: 'pay_at_hospital',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentTxnId: { type: String, default: '' },

    /** Meta Native WhatsApp Pay (order_details / payment interactive) */
    metaReferenceId: { type: String, default: '', index: true },
    metaPaymentStatus: { type: String, default: '' }, // pending|captured|failed|...

    status: {
      type: String,
      enum: ['booked', 'arrived', 'completed', 'cancelled', 'rescheduled', 'postponed'],
      default: 'booked',
      index: true,
    },

    /** Reschedule lineage */
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    rescheduledTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    /** Postpone metadata (when doctor marks absent) */
    postponeReason: { type: String, default: '' },
    postponedFromDate: { type: String, default: '' }, // YYYY-MM-DD
    postponedFromTime: { type: String, default: '' },

    /** Lifecycle timestamps */
    arrivedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: '' },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

AppointmentSchema.index({ doctor: 1, date: 1, time: 1 });
AppointmentSchema.index({ patientPhone: 1, status: 1 });
AppointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
