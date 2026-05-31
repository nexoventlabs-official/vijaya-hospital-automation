const mongoose = require('mongoose');

/**
 * A medical department / specialty (e.g. Neurology, Cardiology).
 * Logo image is shown in the WhatsApp Flow inside the doctor-pick step.
 */
const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    nameTe: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionTe: { type: String, default: '' },
    iconUrl: { type: String, default: '' }, // Cloudinary URL
    iconPublicId: { type: String, default: '' },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DepartmentSchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model('Department', DepartmentSchema);
