/**
 * Seed a starter set of departments (for quick demo).
 * Usage: npm run seed:departments
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('../models/Department');

const DEFAULTS = [
  { name: 'General Medicine', nameTe: 'జనరల్ మెడిసిన్', description: 'Common illnesses', sortOrder: 10 },
  { name: 'Neurology', nameTe: 'న్యూరాలజీ', description: 'Brain & nervous system', sortOrder: 20 },
  { name: 'Cardiology', nameTe: 'కార్డియాలజీ', description: 'Heart care', sortOrder: 30 },
  { name: 'Orthopedics', nameTe: 'ఆర్థోపెడిక్స్', description: 'Bones & joints', sortOrder: 40 },
  { name: 'Pediatrics', nameTe: 'పీడియాట్రిక్స్', description: 'Children', sortOrder: 50 },
  { name: 'Gynecology', nameTe: 'గైనకాలజీ', description: 'Women health', sortOrder: 60 },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const d of DEFAULTS) {
    await Department.updateOne({ name: d.name }, { $setOnInsert: { ...d, active: true } }, { upsert: true });
  }
  console.log(`✅ Seeded ${DEFAULTS.length} departments`);
  await mongoose.disconnect();
})();
