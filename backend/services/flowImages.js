/**
 * Manage the named image slots used across the WhatsApp chat + Flow.
 *
 * Slots are stored in the FlowImage Mongo collection (key → Cloudinary URL),
 * preset at server boot if missing. Admin can update each slot's image via the
 * admin panel.
 */
const FlowImage = require('../models/FlowImage');
const realtime = require('./realtime');

const REQUIRED_KEYS = [
  // Chat-message headers (WhatsApp interactive messages)
  { key: 'chat_welcome_header', label: 'Welcome message header (image)' },
  { key: 'chat_choose_service_header', label: 'Choose Service header (image)' },
  { key: 'chat_book_appointment_header', label: 'Book Appointment header' },
  { key: 'chat_my_appointments_header', label: 'My Appointments header' },
  { key: 'chat_reschedule_header', label: 'Reschedule header' },
  { key: 'chat_cancel_header', label: 'Cancel header' },
  { key: 'chat_website_header', label: 'Website CTA header' },
  { key: 'chat_contact_header', label: 'Contact CTA header' },
  { key: 'chat_appointment_pdf_header', label: 'Appointment PDF message header' },
  { key: 'chat_consultation_complete_header', label: 'Consultation Completed message header' },

  // Flow-screen banners (rendered inside the WhatsApp Flow)
  { key: 'flow_welcome_banner', label: 'Service-select flow banner (1000×125)' },
  { key: 'flow_book_banner', label: 'Department list banner' },
  { key: 'flow_doctor_banner', label: 'Doctor list banner' },
  { key: 'flow_form_banner', label: 'Appointment form banner' },
  { key: 'flow_payment_banner', label: 'Payment screen banner' },
  { key: 'flow_my_appts_banner', label: 'My Appointments banner' },
  { key: 'flow_appt_details_banner', label: 'Appointment details banner' },
  { key: 'flow_reschedule_banner', label: 'Reschedule banner' },
  { key: 'flow_cancel_banner', label: 'Cancel banner' },

  // Inline service icons
  { key: 'icon_book_appointment', label: 'Service icon — Book Appointment' },
  { key: 'icon_my_appointments', label: 'Service icon — My Appointments' },
  { key: 'icon_reschedule', label: 'Service icon — Reschedule' },
  { key: 'icon_cancel', label: 'Service icon — Cancel' },
  { key: 'icon_website', label: 'Service icon — Website' },
  { key: 'icon_contact', label: 'Service icon — Contact' },

  // Payment-mode icons (shown in WhatsApp Flow payment step)
  { key: 'icon_pay_at_hospital', label: 'Pay at Hospital icon' },
  { key: 'icon_pay_online', label: 'Online Pay icon' },
];

async function ensureKeysExist() {
  for (const { key, label } of REQUIRED_KEYS) {
    await FlowImage.updateOne(
      { key },
      { $setOnInsert: { key, label, imageUrl: '', publicId: '' } },
      { upsert: true }
    );
  }
  return REQUIRED_KEYS.length;
}

async function getUrl(key) {
  const doc = await FlowImage.findOne({ key }).lean();
  return doc?.imageUrl || '';
}

async function getMap(keys) {
  const docs = await FlowImage.find({ key: { $in: keys } }).lean();
  return Object.fromEntries(docs.map((d) => [d.key, d.imageUrl || '']));
}

async function setUrl(key, { imageUrl, publicId }) {
  const updated = await FlowImage.findOneAndUpdate(
    { key },
    { $set: { imageUrl: imageUrl || '', publicId: publicId || '' } },
    { upsert: true, new: true }
  );
  await realtime.emit('flow-images', { key, imageUrl: updated.imageUrl });
  return updated;
}

async function listAll() {
  const docs = await FlowImage.find().sort({ key: 1 }).lean();
  // ensure missing required keys still show up as empty rows
  const have = new Set(docs.map((d) => d.key));
  for (const r of REQUIRED_KEYS) if (!have.has(r.key)) docs.push({ key: r.key, label: r.label, imageUrl: '', publicId: '' });
  return docs.sort((a, b) => a.key.localeCompare(b.key));
}

module.exports = { ensureKeysExist, getUrl, getMap, setUrl, listAll, REQUIRED_KEYS };
