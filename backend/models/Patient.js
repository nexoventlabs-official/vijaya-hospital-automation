const mongoose = require('mongoose');

/** Lightweight patient profile keyed by WhatsApp phone (digits only). */
const PatientSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    email: { type: String, default: '' },
    altPhone: { type: String, default: '' },
    address: { type: String, default: '' },
    language: { type: String, enum: ['en', 'te'], default: 'en' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', PatientSchema);
