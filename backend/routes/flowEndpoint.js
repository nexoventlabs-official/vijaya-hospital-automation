/**
 * WhatsApp Flow Endpoint — RSA + AES-128-GCM encrypted exchange with Meta.
 *
 * Each `data_exchange` action computes the next screen with dynamic data:
 *
 *   INIT                                        →  SERVICE_SELECT
 *   SERVICE_SELECT.service_pick                 →  BOOK_DEPT | MY_APPTS | RESCHEDULE_PICK | CANCEL_PICK | INFO
 *   BOOK_DEPT.dept_pick                         →  BOOK_DOCTOR
 *   BOOK_DOCTOR.doctor_pick                     →  BOOK_FORM
 *   BOOK_FORM.form_submit                       →  BOOK_PAYMENT (with booking_token)
 *   MY_APPTS.appt_view                          →  APPT_DETAILS
 *   RESCHEDULE_PICK.reschedule_pick             →  RESCHEDULE_SLOTS
 *
 * Terminal screens (`complete` action) are NOT processed here — they arrive
 * at the webhook as `nfm_reply` and are handled in routes/webhook.js.
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const flowImages = require('../services/flowImages');
const { urlToBase64 } = require('../services/imageBase64');
const { t } = require('../services/i18n');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const settingsSvc = require('../services/settings');
const slotsSvc = require('../services/slots');
const redis = require('../services/redis');

const router = express.Router();

const LOG_PATH = path.join(__dirname, '..', 'flow-debug.log');
function dbg(...args) {
  const line = `[${new Date().toISOString()}] ` + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ') + '\n';
  try {
    fs.appendFileSync(LOG_PATH, line);
  } catch {}
  console.log('[FlowEndpoint]', ...args);
}

/* ───────────────────── encryption helpers ─────────────────────────────── */
const FLOW_PRIVATE_KEY_RAW = process.env.FLOW_PRIVATE_KEY || '';
const FLOW_PRIVATE_KEY = FLOW_PRIVATE_KEY_RAW.split('\\n').join('\n');

function decryptRequest(body) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body || {};
  if (!FLOW_PRIVATE_KEY) {
    return { decryptedBody: body, aesKeyBuffer: null, ivBuffer: null };
  }
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new Error('Missing encryption fields');
  }
  const privateKey = crypto.createPrivateKey({ key: FLOW_PRIVATE_KEY, format: 'pem' });
  const aesKeyBuffer = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encrypted_aes_key, 'base64')
  );
  const ivBuffer = Buffer.from(initial_vector, 'base64');
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const TAG_LEN = 16;
  const authTag = flowDataBuffer.slice(-TAG_LEN);
  const ciphertext = flowDataBuffer.slice(0, -TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-128-gcm', aesKeyBuffer, ivBuffer);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return { decryptedBody: JSON.parse(plain.toString('utf-8')), aesKeyBuffer, ivBuffer };
}

function encryptResponse(obj, aesKeyBuffer, ivBuffer) {
  if (!aesKeyBuffer || !ivBuffer) return obj;
  const flipped = Buffer.alloc(ivBuffer.length);
  for (let i = 0; i < ivBuffer.length; i++) flipped[i] = ~ivBuffer[i] & 0xff;
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, flipped);
  const out = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf-8'), cipher.final(), cipher.getAuthTag()]);
  return out.toString('base64');
}

/* ───────────────────── image-base64 cache ─────────────────────────────── */
let imgCache = { data: null, ts: 0 };
const IMG_TTL = 5 * 60 * 1000;

function clearImageCache() {
  imgCache = { data: null, ts: 0 };
}

async function loadImagesB64() {
  if (imgCache.data && Date.now() - imgCache.ts < IMG_TTL) return imgCache.data;
  const keys = [
    'flow_welcome_banner',
    'flow_book_banner',
    'flow_doctor_banner',
    'flow_form_banner',
    'flow_payment_banner',
    'flow_my_appts_banner',
    'flow_appt_details_banner',
    'flow_reschedule_banner',
    'flow_cancel_banner',

    'icon_book_appointment',
    'icon_my_appointments',
    'icon_reschedule',
    'icon_cancel',
    'icon_website',
    'icon_contact',
    'icon_pay_at_hospital',
    'icon_pay_online',
  ];
  const map = await flowImages.getMap(keys);
  const entries = await Promise.all(
    keys.map(async (k) => {
      const url = map[k];
      if (!url) return [k, ''];
      const isBanner = k.startsWith('flow_');
      const opts = isBanner
        ? { width: 1000, height: 125, crop: 'fill', quality: 70, format: 'jpg' }
        : { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' };
      const b64 = await urlToBase64(url, opts);
      return [k, b64];
    })
  );
  imgCache = { data: Object.fromEntries(entries), ts: Date.now() };
  return imgCache.data;
}

/* ───────────────────── token helpers ──────────────────────────────────── */
function phoneFromToken(token) {
  if (!token) return '';
  const m = String(token).match(/^vh_(\d+)(?:_(\w+))?$/);
  return m ? m[1] : String(token).replace(/\D/g, '');
}

function langFromToken(token) {
  const m = String(token || '').match(/^vh_\d+_(\w+)$/);
  return m && (m[1] === 'te' || m[1] === 'en') ? m[1] : 'en';
}

function withImage(item, b64) {
  if (b64) item.image = b64;
  return item;
}

function fmtNiceDate(date, time) {
  const d = new Date(`${date}T${time || '00:00'}:00`);
  if (Number.isNaN(d.getTime())) return `${date} ${time || ''}`;
  const ds = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const [hRaw, m] = (time || '00:00').split(':');
  let h = parseInt(hRaw, 10) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${ds} — ${h}:${m || '00'} ${ampm}`;
}

/* ───────────────────── booking token store ────────────────────────────── */
/**
 * The form-submit step generates a small token that captures the data the
 * patient typed. The terminal payment step echoes that token back, and the
 * webhook uses it to actually create the appointment. Tokens live in Redis
 * (or in-memory fallback) for 30 minutes.
 */
async function saveBookingToken(token, payload) {
  await redis.set(`vh:book:${token}`, payload, 30 * 60);
}
async function loadBookingToken(token) {
  return redis.get(`vh:book:${token}`);
}
async function dropBookingToken(token) {
  await redis.del(`vh:book:${token}`);
}

/* ───────────────────── screen builders ────────────────────────────────── */

async function buildServiceSelect(lang, images) {
  const services = [
    withImage({ id: 'book_appointment', title: t('svc_book_appointment', lang), description: t('svc_book_appointment_desc', lang) }, images.icon_book_appointment),
    withImage({ id: 'my_appointments', title: t('svc_my_appointments', lang), description: t('svc_my_appointments_desc', lang) }, images.icon_my_appointments),
    withImage({ id: 'reschedule', title: t('svc_reschedule', lang), description: t('svc_reschedule_desc', lang) }, images.icon_reschedule),
    withImage({ id: 'cancel', title: t('svc_cancel', lang), description: t('svc_cancel_desc', lang) }, images.icon_cancel),
    withImage({ id: 'website', title: t('svc_website', lang), description: t('svc_website_desc', lang) }, images.icon_website),
    withImage({ id: 'contact', title: t('svc_contact', lang), description: t('svc_contact_desc', lang) }, images.icon_contact),
  ];
  return {
    screen: 'SERVICE_SELECT',
    data: {
      welcome_banner: images.flow_welcome_banner || '',
      has_welcome_banner: !!images.flow_welcome_banner,
      heading: t('flow_welcome_heading', lang),
      subheading: t('flow_welcome_sub', lang),
      services,
    },
  };
}

async function buildDeptScreen(lang, images) {
  const depts = await Department.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
  const items = await Promise.all(
    depts.map(async (d) => {
      const item = {
        id: String(d._id),
        title: lang === 'te' && d.nameTe ? d.nameTe : d.name,
        description: (lang === 'te' && d.descriptionTe ? d.descriptionTe : d.description) || '',
      };
      if (d.iconUrl) {
        const b64 = await urlToBase64(d.iconUrl, { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' });
        if (b64) item.image = b64;
      }
      return item;
    })
  );
  return {
    screen: 'BOOK_DEPT',
    data: {
      banner: images.flow_book_banner || '',
      has_banner: !!images.flow_book_banner,
      heading: t('flow_pick_department', lang),
      subheading: t('flow_pick_department_sub', lang),
      departments: items,
    },
  };
}

async function buildDoctorScreen(lang, images, departmentId) {
  const docs = await Doctor.find({ department: departmentId, active: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const items = await Promise.all(
    docs.map(async (d) => {
      const desc = [
        lang === 'te' && d.specialityTe ? d.specialityTe : d.speciality,
        d.consultationFee ? `₹${d.consultationFee}` : '',
        d.experienceYears ? `${d.experienceYears} yrs exp` : '',
      ]
        .filter(Boolean)
        .join(' • ');
      const item = {
        id: String(d._id),
        title: lang === 'te' && d.nameTe ? d.nameTe : d.name,
        description: desc,
      };
      if (d.photoUrl) {
        const b64 = await urlToBase64(d.photoUrl, { width: 200, height: 200, crop: 'fill', quality: 75, format: 'jpg' });
        if (b64) item.image = b64;
      }
      return item;
    })
  );
  if (!items.length) {
    return buildInfo(lang, t('flow_pick_doctor', lang), t('no_doctors', lang));
  }
  return {
    screen: 'BOOK_DOCTOR',
    data: {
      banner: images.flow_doctor_banner || '',
      has_banner: !!images.flow_doctor_banner,
      heading: t('flow_pick_doctor', lang),
      subheading: t('flow_pick_doctor_sub', lang),
      department_id: String(departmentId),
      doctors: items,
    },
  };
}

async function buildFormScreen(lang, images, doctorId, departmentId, phone) {
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) return buildInfo(lang, 'Error', 'Doctor not found.');
  const slots = await slotsSvc.listAvailableSlots(doctor, { days: 14 });
  if (!slots.length) return buildInfo(lang, t('flow_pick_doctor', lang), t('no_slots', lang));

  // patient lookup for prefill
  const patient = await Patient.findOne({ phone }).lean();

  return {
    screen: 'BOOK_FORM',
    data: {
      banner: images.flow_form_banner || '',
      has_banner: !!images.flow_form_banner,
      heading: t('form_heading', lang),
      subheading: t('form_sub', lang),
      init_phone: phone,
      init_name: patient?.name || '',
      doctor_id: String(doctorId),
      department_id: String(departmentId || doctor.department),
      slot_options: slots.map((s) => ({ id: `${s.date}|${s.time}`, title: fmtNiceDate(s.date, s.time) })),
      gender_options: [
        { id: 'male', title: t('form_male', lang) },
        { id: 'female', title: t('form_female', lang) },
        { id: 'other', title: t('form_other', lang) },
      ],
      name_label: t('form_name', lang),
      phone_label: t('form_phone', lang),
      age_label: t('form_age', lang),
      gender_label: t('form_gender', lang),
      reason_label: t('form_reason', lang),
      slot_label: t('form_slot', lang),
      continue_label: t('form_continue', lang),
    },
  };
}

async function buildPaymentScreen(lang, images, formData) {
  const doctor = await Doctor.findById(formData.doctor_id).lean();
  const fee = doctor?.consultationFee || 0;
  const token = crypto.randomBytes(8).toString('hex');
  await saveBookingToken(token, { ...formData, fee });

  const items = [
    withImage(
      {
        id: 'pay_at_hospital',
        title: t('pay_at_hospital', lang),
        description: t('pay_at_hospital_desc', lang),
      },
      images.icon_pay_at_hospital
    ),
    withImage(
      {
        id: 'online',
        title: t('pay_online', lang),
        description: t('pay_online_desc', lang),
      },
      images.icon_pay_online
    ),
  ];

  return {
    screen: 'BOOK_PAYMENT',
    data: {
      banner: images.flow_payment_banner || '',
      has_banner: !!images.flow_payment_banner,
      heading: t('pay_heading', lang),
      subheading: t('pay_sub', lang, { fee }),
      payment_methods: items,
      booking_token: token,
      confirm_label: lang === 'te' ? 'బుకింగ్‌ను నిర్ధారించండి' : 'Confirm Booking',
    },
  };
}

async function buildMyApptsScreen(lang, images, phone, mode = 'view') {
  // mode = 'view' | 'reschedule' | 'cancel'
  const filter = { patientPhone: phone };
  if (mode === 'view') filter.status = { $in: ['booked', 'arrived', 'postponed', 'rescheduled', 'completed', 'cancelled'] };
  else filter.status = { $in: ['booked', 'arrived', 'postponed'] }; // only pending can be rescheduled/cancelled

  const appts = await Appointment.find(filter).sort({ date: 1, time: 1 }).limit(20).lean();
  const items = appts.map((a) => ({
    id: String(a._id),
    title: fmtNiceDate(a.date, a.time),
    description: `${a.doctorName} • ${t('appt_status_' + a.status, lang)}`,
  }));

  if (mode === 'view') {
    return {
      screen: 'MY_APPTS',
      data: {
        banner: images.flow_my_appts_banner || '',
        has_banner: !!images.flow_my_appts_banner,
        heading: t('my_appts_heading', lang),
        subheading: items.length ? t('my_appts_sub_some', lang) : t('my_appts_sub_none', lang),
        appointments: items.length ? items : [{ id: 'none', title: '—', description: t('my_appts_sub_none', lang) }],
      },
    };
  }
  if (mode === 'reschedule') {
    if (!items.length) return buildInfo(lang, t('reschedule_heading', lang), t('my_appts_sub_none', lang));
    return {
      screen: 'RESCHEDULE_PICK',
      data: {
        banner: images.flow_reschedule_banner || '',
        has_banner: !!images.flow_reschedule_banner,
        heading: t('reschedule_heading', lang),
        subheading: t('reschedule_pick_appt', lang),
        appointments: items,
      },
    };
  }
  // cancel
  if (!items.length) return buildInfo(lang, t('cancel_heading', lang), t('my_appts_sub_none', lang));
  return {
    screen: 'CANCEL_PICK',
    data: {
      banner: images.flow_cancel_banner || '',
      has_banner: !!images.flow_cancel_banner,
      heading: t('cancel_heading', lang),
      subheading: t('cancel_pick_appt', lang),
      appointments: items,
    },
  };
}

async function buildApptDetailsScreen(lang, images, apptId) {
  const a = await Appointment.findById(apptId).lean();
  if (!a) return buildInfo(lang, 'Error', 'Appointment not found.');
  const rows = [
    { id: 'r_doctor', title: lang === 'te' ? 'డాక్టర్' : 'Doctor', description: a.doctorName },
    { id: 'r_dept', title: lang === 'te' ? 'డిపార్ట్‌మెంట్' : 'Department', description: a.departmentName },
    { id: 'r_date', title: lang === 'te' ? 'తేదీ' : 'Date', description: a.date },
    { id: 'r_time', title: lang === 'te' ? 'సమయం' : 'Time', description: a.timeLabel || a.time },
    { id: 'r_status', title: lang === 'te' ? 'స్థితి' : 'Status', description: t('appt_status_' + a.status, lang) },
    { id: 'r_fee', title: lang === 'te' ? 'ఫీజు' : 'Fee', description: `₹${a.fee || 0}` },
    {
      id: 'r_pay',
      title: lang === 'te' ? 'చెల్లింపు' : 'Payment',
      description: a.paymentMode === 'online' ? t('pay_mode_online', lang) : t('pay_mode_at_hospital', lang),
    },
    { id: 'r_pay_status', title: lang === 'te' ? 'చెల్లింపు స్థితి' : 'Payment status', description: a.paymentStatus },
  ];
  return {
    screen: 'APPT_DETAILS',
    data: {
      banner: images.flow_appt_details_banner || '',
      has_banner: !!images.flow_appt_details_banner,
      heading: t('appt_details_heading', lang, { code: a.code }),
      status_line: `${t('appt_status_' + a.status, lang)} • ${a.code}`,
      rows,
    },
  };
}

async function buildRescheduleSlotsScreen(lang, images, apptId) {
  const a = await Appointment.findById(apptId).lean();
  if (!a) return buildInfo(lang, 'Error', 'Appointment not found.');
  const doc = await Doctor.findById(a.doctor).lean();
  if (!doc) return buildInfo(lang, 'Error', 'Doctor not available.');
  const slots = await slotsSvc.listAvailableSlots(doc, { days: 21, excludeAppointmentId: apptId });
  if (!slots.length) return buildInfo(lang, t('reschedule_heading', lang), t('reschedule_no_slots', lang));
  return {
    screen: 'RESCHEDULE_SLOTS',
    data: {
      banner: images.flow_reschedule_banner || '',
      has_banner: !!images.flow_reschedule_banner,
      heading: t('reschedule_heading', lang),
      subheading: t('reschedule_pick_slot', lang),
      appt_id: String(apptId),
      slot_options: slots.map((s) => ({ id: `${s.date}|${s.time}`, title: fmtNiceDate(s.date, s.time) })),
    },
  };
}

function buildInfo(lang, title, body) {
  return {
    screen: 'INFO',
    data: { info_title: title || (lang === 'te' ? 'సమాచారం' : 'Info'), info_body: body || '' },
  };
}

/* ───────────────────── handler ───────────────────────────────────────── */

router.post('/', async (req, res) => {
  let aesKeyBuffer, ivBuffer, decryptedBody;
  try {
    ({ decryptedBody, aesKeyBuffer, ivBuffer } = decryptRequest(req.body));
  } catch (err) {
    console.error('[FlowEndpoint] decrypt failed:', err.message);
    return res.status(421).send();
  }

  const { action, screen, data, flow_token } = decryptedBody || {};
  dbg('REQUEST', { action, screen, flow_token, data });

  if (action === 'ping') return sendResponse(res, { data: { status: 'active' } }, aesKeyBuffer, ivBuffer);
  if (data?.error) {
    dbg('CLIENT_ERROR', data);
    return sendResponse(res, { data: { acknowledged: true } }, aesKeyBuffer, ivBuffer);
  }

  const phone = phoneFromToken(flow_token);
  const lang = langFromToken(flow_token);
  const images = await loadImagesB64();

  try {
    let response;

    if (action === 'INIT') {
      response = await buildServiceSelect(lang, images);
    } else if (action === 'BACK') {
      // route back to service select for safety
      response = await buildServiceSelect(lang, images);
    } else if (action === 'data_exchange') {
      const screenAction = data?.screen_action;
      switch (screenAction) {
        case 'service_pick': {
          switch (data.selected_service) {
            case 'book_appointment':
              response = await buildDeptScreen(lang, images);
              break;
            case 'my_appointments':
              response = await buildMyApptsScreen(lang, images, phone, 'view');
              break;
            case 'reschedule':
              response = await buildMyApptsScreen(lang, images, phone, 'reschedule');
              break;
            case 'cancel':
              response = await buildMyApptsScreen(lang, images, phone, 'cancel');
              break;
            case 'website':
            case 'contact':
              // These are handled outside the flow as plain WhatsApp messages.
              // The flow shows a closing INFO screen here; the webhook also
              // handles a "service_pick" complete action if it ever arrives.
              response = buildInfo(lang, '', lang === 'te' ? 'తెరిచిన మెను చూడండి' : 'Please see your chat for the link.');
              break;
            default:
              response = buildInfo(lang, '', t('fallback_prompt', lang));
          }
          break;
        }
        case 'dept_pick':
          response = await buildDoctorScreen(lang, images, data.selected_department);
          break;
        case 'doctor_pick':
          response = await buildFormScreen(lang, images, data.selected_doctor, data.department_id, phone);
          break;
        case 'form_submit':
          response = await buildPaymentScreen(lang, images, {
            doctor_id: data.doctor_id,
            department_id: data.department_id,
            patient_name: data.patient_name,
            patient_phone: data.patient_phone || phone,
            patient_age: data.patient_age,
            patient_gender: data.patient_gender,
            reason: data.reason,
            slot: data.slot,
          });
          break;
        case 'appt_view':
          response = await buildApptDetailsScreen(lang, images, data.selected_appt);
          break;
        case 'reschedule_pick':
          response = await buildRescheduleSlotsScreen(lang, images, data.selected_appt);
          break;
        default:
          response = buildInfo(lang, '', t('fallback_prompt', lang));
      }
    } else {
      response = await buildServiceSelect(lang, images);
    }

    dbg('RESPONSE', { screen: response.screen });
    return sendResponse(res, response, aesKeyBuffer, ivBuffer);
  } catch (err) {
    dbg('HANDLER_ERROR', { message: err.message, stack: err.stack });
    return sendResponse(res, buildInfo(lang, 'Error', t('generic_error', lang)), aesKeyBuffer, ivBuffer);
  }
});

function sendResponse(res, obj, aesKeyBuffer, ivBuffer) {
  const payload = { version: '3.0', ...obj };
  const out = encryptResponse(payload, aesKeyBuffer, ivBuffer);
  if (typeof out === 'string') {
    res.set('Content-Type', 'text/plain');
    return res.send(out);
  }
  return res.json(out);
}

module.exports = router;
module.exports.clearImageCache = clearImageCache;
module.exports.loadBookingToken = loadBookingToken;
module.exports.dropBookingToken = dropBookingToken;
