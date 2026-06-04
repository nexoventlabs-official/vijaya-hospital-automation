/**
 * High-level outbound WhatsApp messaging.
 *
 * Owns:
 *   • Welcome → language-pick reply buttons
 *   • Choose-Service flow message
 *   • Sending appointment PDFs + Get Directions CTA
 *   • Sending website / contact CTA messages
 *   • Sending lifecycle notifications (arrival confirmed / consultation complete / postpone)
 */
const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const settingsSvc = require('./settings');
const pdfGen = require('./pdfGen');
const subscriptionSvc = require('./subscription');
const InboundMessage = require('../models/InboundMessage');
const Patient = require('../models/Patient');
const { t } = require('./i18n');

const GREETING_RE = /^(hi+|h?ello+|hey+|menu|services|help|start|namaste|namaskaram)\b/i;

function isGreeting(text) {
  if (!text) return false;
  return GREETING_RE.test(String(text).trim());
}
function normPhone(p) {
  return String(p || '').replace(/\D/g, '');
}

/* ───────── inbound tracking ──────────────────────────────────────────── */
async function trackInbound({ phone, profileName, text, language }) {
  if (!phone) return;
  try {
    const update = {
      $setOnInsert: { firstSeenAt: new Date() },
      $set: {
        profileName: profileName || '',
        lastSeenAt: new Date(),
        lastMessage: (text || '').slice(0, 500),
      },
      $inc: { messageCount: 1 },
    };
    if (language) update.$set.language = language;
    await InboundMessage.findOneAndUpdate({ phone }, update, { upsert: true });
  } catch (err) {
    console.warn('[chatbot] trackInbound failed:', err.message);
  }
}

async function getLanguage(phone) {
  const patient = await Patient.findOne({ phone }).lean();
  if (patient?.language) return patient.language;
  const inb = await InboundMessage.findOne({ phone }).lean();
  return inb?.language || 'en';
}

async function setLanguage(phone, language) {
  if (!['en', 'te'].includes(language)) language = 'en';
  await InboundMessage.findOneAndUpdate({ phone }, { $set: { language } }, { upsert: true });
  await Patient.findOneAndUpdate({ phone }, { $set: { language } }, { upsert: true });
}

/* ───────── outbound helpers ──────────────────────────────────────────── */

async function sendLanguageChoice(phone, lang = 'en') {
  const headerImageUrl = await flowImages.getUrl('chat_welcome_header');
  await meta.sendButtons(phone, {
    headerImageUrl: headerImageUrl || undefined,
    headerText: !headerImageUrl ? 'Vijya Hospital' : undefined,
    bodyText: t('welcome_body', lang),
    footerText: t('welcome_footer', lang),
    buttons: [
      { id: 'lang_en', title: t('lang_button_en', lang) },
      { id: 'lang_te', title: t('lang_button_te', lang) },
    ],
  });
}

async function sendChooseService(phone, lang = 'en') {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    await meta.sendText(phone, 'Service menu is being configured. Please try again shortly.');
    return;
  }
  const headerImageUrl = await flowImages.getUrl('chat_choose_service_header');
  const mode = String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED' ? 'published' : 'draft';

  await meta.sendFlowMessage(phone, {
    flowId,
    flowCta: t('choose_service_cta', lang),
    headerImageUrl: headerImageUrl || undefined,
    headerText: !headerImageUrl ? 'Vijya Hospital' : undefined,
    bodyText: t('choose_service_body', lang),
    footerText: t('choose_service_footer', lang),
    flowToken: `vh_${phone}_${lang}`,
    mode,
  });
}

/** Helper: upload a generated PDF as WhatsApp media; returns the mediaId. */
async function uploadAppointmentPdf(appointment, settings, title) {
  const buffer = await pdfGen.buildAppointmentPdf({ appointment, settings, title });
  const filename = `Appointment-${appointment.code}.pdf`;
  const mediaId = await meta.uploadMedia(buffer, { mimeType: 'application/pdf', filename });
  return { mediaId, filename };
}

/**
 * Whether patient → hospital online payment via Meta Native WhatsApp Pay is
 * configured (the hospital admin's Razorpay linked to a Meta payment config).
 */
function nativePayConfigured() {
  return !!process.env.META_PAYMENT_CONFIGURATION_NAME;
}

/**
 * Send a native WhatsApp "Review and Pay" message for an appointment fee.
 * Payment settles to the hospital admin's Razorpay. The appointment stays
 * `unpaid` until the `payment` interactive confirmation arrives at the webhook.
 */
async function sendPaymentRequest(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const headerImageUrl = await flowImages.getUrl('chat_appointment_pdf_header');
  const fee = appointment.fee || 0;

  await meta.sendOrderDetails(phone, {
    referenceId: `APPT-${appointment._id}`,
    configurationName: process.env.META_PAYMENT_CONFIGURATION_NAME,
    headerImageUrl: headerImageUrl || undefined,
    headerText: !headerImageUrl ? (settings?.hospitalName || 'Vijya Hospital') : undefined,
    bodyText: t('pay_request_body', lang, {
      doctor: appointment.doctorName,
      date: appointment.date,
      time: appointment.timeLabel || appointment.time,
      fee,
    }),
    footerText: t('pay_order_footer', lang),
    items: [
      {
        retailerId: appointment.code,
        name: `${t('pay_item_consultation', lang)} — ${appointment.doctorName}`,
        amount: fee,
        quantity: 1,
      },
    ],
    subtotal: fee,
    totalAmount: fee,
    notes: { appointment_id: String(appointment._id), code: appointment.code },
  });
}

/** Sent after a successful online payment — success note + confirmation PDF. */
async function sendPaymentSuccess(phone, appointment, lang) {
  await meta.sendText(
    phone,
    t('pay_success_body', lang, {
      code: appointment.code,
      doctor: appointment.doctorName,
      fee: appointment.fee || 0,
    })
  );
  await sendAppointmentPdf(phone, appointment, lang);
}

/** "Pay at Hospital" / online: PDF document with appointment details + directions link in caption. */
async function sendAppointmentPdf(phone, appointment, lang) {
  const settings = await settingsSvc.get();

  const { mediaId, filename } = await uploadAppointmentPdf(appointment, settings, 'Appointment Confirmation');
  const directions = settingsSvc.directionsUrl(settings);

  // WhatsApp Cloud API does NOT support document.id (media ID) in cta_url
  // interactive headers — only document.link (public URL) is accepted there.
  // Send the PDF as a plain document with the full confirmation text + directions
  // link embedded directly in the caption.
  await meta.sendDocument(phone, {
    mediaId,
    filename,
    caption: t('appt_pdf_body', lang, {
      code: appointment.code,
      doctor: appointment.doctorName,
      date: appointment.date,
      time: appointment.timeLabel || appointment.time,
      fee: appointment.fee || 0,
      payMode: appointment.paymentMode === 'online' ? t('pay_mode_online', lang) : t('pay_mode_at_hospital', lang),
      directions: `📍 ${lang === 'te' ? 'దారి' : 'Get Directions'}: ${directions}`,
    }),
  });
}

async function sendRescheduledPdf(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const { mediaId, filename } = await uploadAppointmentPdf(appointment, settings, 'Appointment Rescheduled');
  const directions = settingsSvc.directionsUrl(settings);

  // Send PDF with full details + directions link in caption — no separate message needed.
  await meta.sendDocument(phone, {
    mediaId,
    filename,
    caption: t('reschedule_pdf_body', lang, {
      code: appointment.code,
      doctor: appointment.doctorName,
      date: appointment.date,
      time: appointment.timeLabel || appointment.time,
      directions: `📍 ${lang === 'te' ? 'దారి' : 'Get Directions'}: ${directions}`,
    }),
  });
}

async function sendCancelledPdf(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const { mediaId, filename } = await uploadAppointmentPdf(appointment, settings, 'Appointment Cancelled');
  await meta.sendDocument(phone, {
    mediaId,
    filename,
    caption: t('cancel_pdf_body', lang, {
      code: appointment.code,
      doctor: appointment.doctorName,
      date: appointment.date,
      time: appointment.timeLabel || appointment.time,
    }),
  });
  await sendChooseService(phone, lang);
}

async function sendPostponePdf(phone, oldAppt, newAppt, lang) {
  const settings = await settingsSvc.get();
  const { mediaId, filename } = await uploadAppointmentPdf(newAppt || oldAppt, settings, 'Appointment Postponed');

  if (newAppt) {
    // New slot assigned — include directions link in caption.
    const directions = settingsSvc.directionsUrl(settings);
    await meta.sendDocument(phone, {
      mediaId,
      filename,
      caption: t('postpone_message_body', lang, {
        code: newAppt.code,
        doctor: oldAppt.doctorName,
        oldDate: oldAppt.date,
        oldTime: oldAppt.timeLabel || oldAppt.time,
        newDate: newAppt.date,
        newTime: newAppt.timeLabel || newAppt.time,
        reason: oldAppt.postponeReason || 'Doctor unavailable',
        directions: `\n\n📍 ${lang === 'te' ? 'దారి' : 'Get Directions'}: ${directions}`,
      }),
    });
  } else {
    // No new slot — just the PDF with the postpone note (no directions).
    await meta.sendDocument(phone, {
      mediaId,
      filename,
      caption: t('postpone_message_body', lang, {
        code: oldAppt.code,
        doctor: oldAppt.doctorName,
        oldDate: oldAppt.date,
        oldTime: oldAppt.timeLabel || oldAppt.time,
        newDate: '—',
        newTime: '—',
        reason: oldAppt.postponeReason || 'Doctor unavailable',
        directions: '',
      }),
    });
  }
}

async function sendArrivedConfirmation(phone, appointment, lang) {
  await meta.sendText(
    phone,
    t('arrival_confirmed_body', lang, {
      name: appointment.patientName.split(' ')[0],
      code: appointment.code,
      doctor: appointment.doctorName,
    })
  );
}

async function sendCompletedConfirmation(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const headerImageUrl = await flowImages.getUrl('chat_consultation_complete_header');
  const mode = String(process.env.WHATSAPP_FLOW_STATUS || '').toUpperCase() === 'PUBLISHED' ? 'published' : 'draft';

  if (flowId) {
    // Rich message: image header + completion text + "Choose Service" flow CTA
    await meta.sendFlowMessage(phone, {
      flowId,
      flowCta: t('choose_service_cta', lang),
      headerImageUrl: headerImageUrl || undefined,
      headerText: !headerImageUrl ? (settings?.hospitalName || 'Vijya Hospital') : undefined,
      bodyText: t('consultation_done_body', lang, {
        name: appointment.patientName.split(' ')[0],
        code: appointment.code,
        doctor: appointment.doctorName,
      }),
      footerText: settings?.hospitalName || 'Vijya Hospital',
      flowToken: `vh_done_${phone}`,
      mode,
    });
  } else {
    // Fallback: plain text if flow not configured
    await meta.sendText(
      phone,
      t('consultation_done_body', lang, {
        name: appointment.patientName.split(' ')[0],
        code: appointment.code,
        doctor: appointment.doctorName,
      })
    );
  }
}

async function sendWebsite(phone, lang) {
  const settings = await settingsSvc.get();
  const url = (settings?.websiteUrl || process.env.HOSPITAL_WEBSITE || '').trim() || 'https://example.com';
  const headerImageUrl = await flowImages.getUrl('chat_website_header');
  await meta.sendCtaUrl(phone, {
    headerImageUrl: headerImageUrl || undefined,
    headerText: !headerImageUrl ? 'Our Website' : undefined,
    bodyText: t('website_body', lang),
    footerText: settings?.hospitalName || 'Vijya Hospital',
    ctaText: t('website_cta', lang),
    ctaUrl: url,
  });
}

async function sendContact(phone, lang) {
  const settings = await settingsSvc.get();
  const phoneNum = settings?.contactPhone || process.env.HOSPITAL_PHONE || '';
  const address = settings?.addressLine || process.env.HOSPITAL_ADDRESS || '';
  const headerImageUrl = await flowImages.getUrl('chat_contact_header');

  // CTA URL: "tel:" link triggers the dialer on most WhatsApp clients
  const telUrl = phoneNum ? `tel:${String(phoneNum).replace(/[^\d+]/g, '')}` : 'tel:';
  await meta.sendCtaUrl(phone, {
    headerImageUrl: headerImageUrl || undefined,
    headerText: !headerImageUrl ? 'Contact Us' : undefined,
    bodyText: t('contact_body', lang, { phone: phoneNum, address }),
    footerText: settings?.hospitalName || 'Vijya Hospital',
    ctaText: t('contact_cta', lang),
    ctaUrl: telUrl,
  });
}

/* ───────── inbound dispatcher (text / button replies) ────────────────── */

async function handleInbound({ phone, profileName, type, text, interactive }) {
  const norm = normPhone(phone);

  // ── Plan gate ──────────────────────────────────────────────────────────
  // WhatsApp automation only works while an admin holds an active plan. With
  // no active subscription we stay completely silent — even a "hi" gets no
  // reply. We still record the inbound message so history isn't lost.
  const automationOn = await subscriptionSvc.isAutomationEnabled();
  if (!automationOn) {
    await trackInbound({ phone: norm, profileName, text });
    return;
  }

  await trackInbound({ phone: norm, profileName, text });
  const lang = await getLanguage(norm);

  if (type === 'interactive' && interactive?.type === 'button_reply') {
    const id = interactive.button_reply?.id || '';
    if (id === 'lang_en' || id === 'lang_te') {
      const newLang = id === 'lang_en' ? 'en' : 'te';
      await setLanguage(norm, newLang);
      await meta.sendText(norm, t('lang_set', newLang));
      await sendChooseService(norm, newLang);
      return;
    }
  }

  if (isGreeting(text) || !text) {
    await sendLanguageChoice(norm, lang);
    return;
  }

  await meta.sendText(norm, t('fallback_prompt', lang));
}

module.exports = {
  handleInbound,
  sendLanguageChoice,
  sendChooseService,
  sendAppointmentPdf,
  sendPaymentRequest,
  sendPaymentSuccess,
  nativePayConfigured,
  sendRescheduledPdf,
  sendCancelledPdf,
  sendPostponePdf,
  sendArrivedConfirmation,
  sendCompletedConfirmation,
  sendWebsite,
  sendContact,
  getLanguage,
  setLanguage,
  normPhone,
};
