const mongoose = require('mongoose');

/**
 * Hospital-wide holidays (no doctors available). Booking flow skips these days.
 */
const HolidaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    label: { type: String, required: true },
    labelTe: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', HolidaySchema);
