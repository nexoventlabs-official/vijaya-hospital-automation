// config/hospital.config.js
// SYNHA — Hospital / Clinic Configuration (Loop 4)
// This is the ONLY file that changes per client.
//
// RULES:
//   - Business identity / content lives here.
//   - SECRETS DO NOT LIVE HERE. Credential fields read from .env via
//     process.env so secrets stay in .env.
//   - vijya-hospital already reads live values from the Settings DB
//     collection (seeded from these env vars); this file is the single
//     deployment source for identity + fallbacks.

module.exports = {

  // ── BUSINESS IDENTITY ────────────────────────────────────────────────
  businessName:        process.env.HOSPITAL_NAME || 'Vijya Hospital',
  businessNameLocal:   process.env.HOSPITAL_NAME_TE || 'విజయ హాస్పిటల్', // localised (Telugu) name
  speciality:          process.env.HOSPITAL_SPECIALITY || '',
  logoUrl:             '',

  // ── CONTACT ──────────────────────────────────────────────────────────
  ownerPhone:          process.env.HOSPITAL_OWNER_PHONE || process.env.HOSPITAL_PHONE || '', // owner notifications (Loop 4)
  supportPhone:        process.env.HOSPITAL_PHONE || '',
  address:             process.env.HOSPITAL_ADDRESS || '',
  googleMapsUrl:       process.env.HOSPITAL_MAPS_URL || '',
  websiteUrl:          process.env.HOSPITAL_WEBSITE || '',

  // ── WORKING HOURS (deployment defaults; live values in Settings DB) ───
  workingHours: {
    open:              '09:00',
    close:             '20:00',
    days:              ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    timezone:          'Asia/Kolkata',
  },
  offlineMessage:      '',

  // ── WHATSAPP (secrets — sourced from .env, not stored here) ───────────
  whatsappNumberId:    process.env.META_PHONE_NUMBER_ID || '',
  metaToken:           process.env.META_ACCESS_TOKEN || '',
  verifyToken:         process.env.META_VERIFY_TOKEN || '',

  // ── PAYMENT (secrets — sourced from .env, not stored here) ────────────
  paymentEnabled:      true,
  payAtHospitalEnabled: true,
  razorpayKeyId:       process.env.RAZORPAY_KEY_ID || '',
  razorpaySecret:      process.env.RAZORPAY_KEY_SECRET || '',
  currency:            'INR',
  appointmentPrefix:   'VH-',   // appointment code prefix

  // ── DATABASE (secrets — sourced from .env, not stored here) ───────────
  mongoUri:            process.env.MONGODB_URI || '',
  redisUrl:            process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : ''),

  // ── LANGUAGE ─────────────────────────────────────────────────────────
  defaultLanguage:     process.env.DEFAULT_LANGUAGE || 'en',   // 'en' or 'te'

  // ── CONTENT ──────────────────────────────────────────────────────────
  greetingMessage:     '',   // reserved (existing i18n greeting kept)
  confirmationMessage: '',   // reserved

  // Owner notification (Loop 4). Placeholders: {reference} {customerName}
  // {customerPhone} {doctor} {department} {when} {paymentMode} {time}
  ownerNotifyTemplate:
    '🔔 New Appointment — {reference}\n\n' +
    'Patient: {customerName} ({customerPhone})\n' +
    'Doctor: {doctor} ({department})\n' +
    'When: {when}\n' +
    'Payment: {paymentMode}\n' +
    'Booked: {time}',

  reminderTemplate24h: '',   // reserved
  reminderTemplate1h:  '',   // reserved

  // ── CRM BRIDGE (Loop 5) — leave URL empty until SIGNAL CRM is located ──
  crmWebhookUrl:       process.env.CRM_WEBHOOK_URL || '',
  crmApiKey:           process.env.CRM_API_KEY || '',
  systemSource:        'synha-hospital',
};
