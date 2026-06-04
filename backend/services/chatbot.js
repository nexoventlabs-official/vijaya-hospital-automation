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
const cloudinary = require('./cloudinary');
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

/**
 * Upload PDF buffer to Cloudinary as a raw asset to get a public URL for use
 * as a WhatsApp cta_url document header. Schedules deletion after a delay so
 * Meta's servers have time to fetch the file before it's removed.
 * Falls back gracefully if Cloudinary is not configured.
 */
async function uploadPdfForCtaUrl(buffer, code) {
  const filename = `Appointment-${code}.pdf`;
  try {
    const { url, publicId } = await cloudinary.uploadBuffer(buffer, {
      folder: 'appt_pdfs',
      publicId: `appt_${code}_${Date.now()}`,
      resourceType: 'raw',
      overwrite: true,
    });
    // Delete after 60 s — enough time for Meta to fetch the file,
    // but short enough that nothing lingers in Cloudinary storage.
    setTimeout(() => {
      cloudinary.destroy(publicId, { resourceType: 'raw' }).catch(() => {});
    }, 60_000);
    return { url, publicId, filename };
  } catch (err) {
    console.warn('[chatbot] Cloudinary PDF upload failed, falling back to mediaId:', err.message);
    return null;
  }
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

/** Single message: PDF as document header + appointment body + Get Directions CTA button. */
async function sendAppointmentPdf(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const buffer = await pdfGen.buildAppointmentPdf({ appointment, settings, title: 'Appointment Confirmation' });
  const filename = `Appointment-${appointment.code}.pdf`;
  const directions = settingsSvc.directionsUrl(settings);

  const bodyText = t('appt_pdf_body', lang, {
    code: appointment.code,
    doctor: appointment.doctorName,
    date: appointment.date,
    time: appointment.timeLabel || appointment.time,
    fee: appointment.fee || 0,
    payMode: appointment.paymentMode === 'online' ? t('pay_mode_online', lang) : t('pay_mode_at_hospital', lang),
  });

  const cloudResult = await uploadPdfForCtaUrl(buffer, appointment.code);
  if (cloudResult) {
    await meta.sendCtaUrl(phone, {
      headerDocumentUrl: cloudResult.url,
      headerDocumentFilename: filename,
      bodyText,
      footerText: settings?.hospitalName || 'Vijya Hospital',
      ctaText: t('directions_cta', lang),
      ctaUrl: directions,
    });
  } else {
    // Fallback: upload as WhatsApp media ID + separate CTA message
    const mediaId = await meta.uploadMedia(buffer, { mimeType: 'application/pdf', filename });
    await meta.sendDocument(phone, { mediaId, filename, caption: bodyText });
    await meta.sendCtaUrl(phone, {
      headerText: settings?.hospitalName || 'Vijya Hospital',
      bodyText: t('directions_cta_body', lang),
      footerText: settings?.hospitalName || 'Vijya Hospital',
      ctaText: t('directions_cta', lang),
      ctaUrl: directions,
    });
  }
}

async function sendRescheduledPdf(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const buffer = await pdfGen.buildAppointmentPdf({ appointment, settings, title: 'Appointment Rescheduled' });
  const filename = `Appointment-${appointment.code}.pdf`;
  const directions = settingsSvc.directionsUrl(settings);

  const bodyText = t('reschedule_pdf_body', lang, {
    code: appointment.code,
    doctor: appointment.doctorName,
    date: appointment.date,
    time: appointment.timeLabel || appointment.time,
  });

  const cloudResult = await uploadPdfForCtaUrl(buffer, appointment.code);
  if (cloudResult) {
    await meta.sendCtaUrl(phone, {
      headerDocumentUrl: cloudResult.url,
      headerDocumentFilename: filename,
      bodyText,
      footerText: settings?.hospitalName || 'Vijya Hospital',
      ctaText: t('directions_cta', lang),
      ctaUrl: directions,
    });
  } else {
    const mediaId = await meta.uploadMedia(buffer, { mimeType: 'application/pdf', filename });
    await meta.sendDocument(phone, { mediaId, filename, caption: bodyText });
    await meta.sendCtaUrl(phone, {
      headerText: settings?.hospitalName || 'Vijya Hospital',
      bodyText: t('directions_cta_body', lang),
      footerText: settings?.hospitalName || 'Vijya Hospital',
      ctaText: t('directions_cta', lang),
      ctaUrl: directions,
    });
  }
}

async function sendCancelledPdf(phone, appointment, lang) {
  const settings = await settingsSvc.get();
  const buffer = await pdfGen.buildAppointmentPdf({ appointment, settings, title: 'Appointment Cancelled' });
  const filename = `Appointment-${appointment.code}.pdf`;
  const mediaId = await meta.uploadMedia(buffer, { mimeType: 'application/pdf', filename });
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
  const apptToUse = newAppt || oldAppt;
  const buffer = await pdfGen.buildAppointmentPdf({ appointment: apptToUse, settings, title: 'Appointment Postponed' });
  const filename = `Appointment-${apptToUse.code}.pdf`;

  const caption = t('postpone_message_body', lang, {
    code: apptToUse.code,
    doctor: oldAppt.doctorName,
    oldDate: oldAppt.date,
    oldTime: oldAppt.timeLabel || oldAppt.time,
    newDate: newAppt ? newAppt.date : '—',
    newTime: newAppt ? (newAppt.timeLabel || newAppt.time) : '—',
    reason: oldAppt.postponeReason || 'Doctor unavailable',
  });

  if (newAppt) {
    // New slot assigned — single message: PDF + body + Directions CTA
    const directions = settingsSvc.directionsUrl(settings);
    const cloudResult = await uploadPdfForCtaUrl(buffer, apptToUse.code);
    if (cloudResult) {
      await meta.sendCtaUrl(phone, {
        headerDocumentUrl: cloudResult.url,
        headerDocumentFilename: filename,
        bodyText: caption,
        footerText: settings?.hospitalName || 'Vijya Hospital',
        ctaText: t('directions_cta', lang),
        ctaUrl: directions,
      });
    } else {
      const mediaId = await meta.uploadMedia(buffer, { mimeType: 'application/pdf', filename });
      await meta.sendDocument(phone, { mediaId, filename, caption });
      await meta.sendCtaUrl(phone, {
        headerText: settings?.hospitalName || 'Vijya Hospital',
        bodyText: t('directions_cta_body', lang),
        footerText: settings?.hospitalName || 'Vijya Hospital',
        ctaText: t('directions_cta', lang),
        ctaUrl: directions,
      });
    }
  } else {
    // No new slot — just the PDF with the postpone note (no directions button)
    const mediaId = await meta.uploadMedia(buffer, { mimeType: 'application/pdf', filename });
    await meta.sendDocument(phone, { mediaId, filename, caption });
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
