const mongoose = require('mongoose');

/**
 * Weekly slot template:  weekday 0..6 (Sun=0), with N slot windows.
 * Each slot has a label like "10:00 AM" — these become dropdown options.
 */
const SlotSchema = new mongoose.Schema(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true }, // "13:00"
    duration: { type: Number, default: 15 }, // minutes per appointment
  },
  { _id: false }
);

const AbsenceSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    reason: { type: String, default: 'Doctor unavailable' },
    reasonTe: { type: String, default: '' },
  },
  { _id: false, timestamps: true }
);

const DoctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameTe: { type: String, default: '' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    speciality: { type: String, default: '' },
    specialityTe: { type: String, default: '' },
    qualifications: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    photoUrl: { type: String, default: '' },
    photoPublicId: { type: String, default: '' },
    consultationFee: { type: Number, default: 0 }, // ₹
    weeklySlots: { type: [SlotSchema], default: [] },
    /** dates the doctor is unavailable (admin marks emergency / leave) */
    absences: { type: [AbsenceSchema], default: [] },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DoctorSchema.index({ department: 1, active: 1, sortOrder: 1 });

module.exports = mongoose.model('Doctor', DoctorSchema);
