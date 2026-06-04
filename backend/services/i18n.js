/**
 * Bilingual copy (English + Telugu) for every bot-facing message.
 * Use {placeholder} tokens for runtime substitution via the small `t()` helper.
 */

const STRINGS = {
  // ─── Welcome / language ─────────────────────────────────────────────────
  welcome_body: {
    en: 'Welcome to *Vijya Hospital* 🏥\n\nPlease choose your language to continue.',
    te: '*విజయ హాస్పిటల్*-కు స్వాగతం 🏥\n\nదయచేసి కొనసాగించడానికి మీ భాషను ఎంచుకోండి.',
  },
  welcome_footer: { en: 'Vijya Hospital', te: 'విజయ హాస్పిటల్' },
  lang_button_en: { en: 'English', te: 'English' },
  lang_button_te: { en: 'తెలుగు', te: 'తెలుగు' },
  lang_set: {
    en: '✅ Language set to *English*.',
    te: '✅ భాష *తెలుగు*గా అమర్చబడింది.',
  },

  // ─── Choose Service ────────────────────────────────────────────────────
  choose_service_body: {
    en: 'How can we help you today?\n\nTap *Choose Service* below to see all options.',
    te: 'ఈరోజు మేము ఎలా సహాయపడగలము?\n\nఅన్ని ఎంపికలను చూడటానికి కింద *సేవను ఎంచుకోండి* నొక్కండి.',
  },
  choose_service_cta: { en: 'Choose Service', te: 'సేవను ఎంచుకోండి' },
  choose_service_footer: { en: 'Vijya Hospital', te: 'విజయ హాస్పిటల్' },

  // ─── Service tiles ─────────────────────────────────────────────────────
  svc_book_appointment: { en: 'Book Appointment', te: 'అపాయింట్‌మెంట్ బుక్' },
  svc_book_appointment_desc: { en: 'Schedule a doctor visit', te: 'డాక్టర్ అపాయింట్‌మెంట్' },
  svc_my_appointments: { en: 'My Appointments', te: 'నా అపాయింట్‌మెంట్లు' },
  svc_my_appointments_desc: { en: 'View bookings', te: 'మీ బుకింగ్‌లు చూడండి' },
  svc_reschedule: { en: 'Reschedule Appointment', te: 'రీషెడ్యూల్ చేయండి' },
  svc_reschedule_desc: { en: 'Change date / time', te: 'తేదీ / సమయం మార్చండి' },
  svc_cancel: { en: 'Cancel Appointment', te: 'అపాయింట్‌మెంట్ రద్దు' },
  svc_cancel_desc: { en: 'Cancel a booking', te: 'బుకింగ్ రద్దు చేయండి' },
  svc_website: { en: 'Our Website', te: 'మా వెబ్‌సైట్' },
  svc_website_desc: { en: 'Visit our site', te: 'మా సైట్ చూడండి' },
  svc_contact: { en: 'Contact Us', te: 'మమ్మల్ని సంప్రదించండి' },
  svc_contact_desc: { en: 'Call the hospital', te: 'హాస్పిటల్‌కు ఫోన్' },

  // ─── Booking flow / departments / doctors ──────────────────────────────
  flow_welcome_heading: { en: 'How can we help you?', te: 'మేము ఎలా సహాయపడగలము?' },
  flow_welcome_sub: { en: 'Tap a service to continue.', te: 'కొనసాగించడానికి సేవను నొక్కండి.' },

  flow_pick_department: { en: 'Pick a department', te: 'డిపార్ట్‌మెంట్ ఎంచుకోండి' },
  flow_pick_department_sub: {
    en: 'Choose the speciality you need.',
    te: 'మీకు అవసరమైన స్పెషాలిటీని ఎంచుకోండి.',
  },
  flow_pick_doctor: { en: 'Pick a doctor', te: 'డాక్టర్‌ను ఎంచుకోండి' },
  flow_pick_doctor_sub: {
    en: 'Available doctors are listed below.',
    te: 'అందుబాటులో ఉన్న డాక్టర్లు కింద ఉన్నారు.',
  },

  // ─── Appointment form ──────────────────────────────────────────────────
  form_heading: { en: 'Appointment details', te: 'అపాయింట్‌మెంట్ వివరాలు' },
  form_sub: {
    en: 'Please fill in your details. Your WhatsApp number is locked.',
    te: 'మీ వివరాలు నింపండి. మీ WhatsApp నంబర్ లాక్ చేయబడింది.',
  },
  form_name: { en: 'Patient Name', te: 'రోగి పేరు' },
  form_phone: { en: 'WhatsApp Number', te: 'WhatsApp నంబర్' },
  form_age: { en: 'Age', te: 'వయస్సు' },
  form_gender: { en: 'Gender', te: 'లింగం' },
  form_reason: { en: 'Reason for visit', te: 'రాకకు కారణం' },
  form_date: { en: 'Date', te: 'తేదీ' },
  form_slot: { en: 'Available slot', te: 'అందుబాటులో ఉన్న స్లాట్' },
  form_continue: { en: 'Continue', te: 'కొనసాగించండి' },
  form_male: { en: 'Male', te: 'పురుషుడు' },
  form_female: { en: 'Female', te: 'స్త్రీ' },
  form_other: { en: 'Other', te: 'ఇతర' },

  // ─── Payment screen ────────────────────────────────────────────────────
  pay_heading: { en: 'Payment method', te: 'చెల్లింపు పద్ధతి' },
  pay_sub: {
    en: 'Consultation fee: ₹{fee}\nChoose how you want to pay.',
    te: 'కన్సల్టేషన్ ఫీజు: ₹{fee}\nమీరు ఎలా చెల్లించాలనుకుంటున్నారో ఎంచుకోండి.',
  },
  pay_at_hospital: { en: 'Pay at hospital', te: 'హాస్పిటల్‌లో చెల్లించండి' },
  pay_at_hospital_desc: {
    en: 'Pay at the reception when you arrive.',
    te: 'మీరు చేరుకున్నప్పుడు రిసెప్షన్‌లో చెల్లించండి.',
  },
  pay_online: { en: 'Pay online now', te: 'ఇప్పుడే ఆన్‌లైన్ చెల్లింపు' },
  pay_online_desc: { en: 'UPI / cards / netbanking', te: 'UPI / కార్డులు / నెట్‌బ్యాంకింగ్' },

  // ─── My appointments ───────────────────────────────────────────────────
  my_appts_heading: { en: 'Your appointments', te: 'మీ అపాయింట్‌మెంట్లు' },
  my_appts_sub_some: {
    en: 'Tap any appointment to view details.',
    te: 'వివరాలు చూడటానికి ఏదైనా అపాయింట్‌మెంట్‌ను నొక్కండి.',
  },
  my_appts_sub_none: {
    en: 'You have no appointments yet. Tap *Book Appointment* from the menu.',
    te: 'మీకు ఇంకా అపాయింట్‌మెంట్లు లేవు. మెను నుండి *అపాయింట్‌మెంట్ బుక్* నొక్కండి.',
  },
  appt_status_booked: { en: 'Booked', te: 'బుక్ అయింది' },
  appt_status_arrived: { en: 'Arrived', te: 'వచ్చారు' },
  appt_status_completed: { en: 'Completed', te: 'పూర్తయింది' },
  appt_status_cancelled: { en: 'Cancelled', te: 'రద్దు చేయబడింది' },
  appt_status_rescheduled: { en: 'Rescheduled', te: 'రీషెడ్యూల్ చేయబడింది' },
  appt_status_postponed: { en: 'Postponed', te: 'వాయిదా వేయబడింది' },

  appt_details_heading: { en: 'Appointment {code}', te: 'అపాయింట్‌మెంట్ {code}' },

  // ─── Reschedule / cancel ───────────────────────────────────────────────
  reschedule_heading: { en: 'Reschedule appointment', te: 'రీషెడ్యూల్ చేయండి' },
  reschedule_pick_appt: { en: 'Pick the appointment to reschedule.', te: 'రీషెడ్యూల్ చేయవలసిన అపాయింట్‌మెంట్ ఎంచుకోండి.' },
  reschedule_pick_slot: { en: 'Choose a new slot.', te: 'కొత్త స్లాట్ ఎంచుకోండి.' },
  reschedule_no_slots: {
    en: 'No alternative slots are available right now. Please try later or call the hospital.',
    te: 'ప్రస్తుతం ప్రత్యామ్నాయ స్లాట్లు అందుబాటులో లేవు. దయచేసి తర్వాత ప్రయత్నించండి లేదా హాస్పిటల్‌కు కాల్ చేయండి.',
  },

  cancel_heading: { en: 'Cancel appointment', te: 'అపాయింట్‌మెంట్ రద్దు' },
  cancel_pick_appt: { en: 'Pick the appointment to cancel.', te: 'రద్దు చేయవలసిన అపాయింట్‌మెంట్ ఎంచుకోండి.' },

  // ─── Outbound message bodies ───────────────────────────────────────────
  appt_pdf_body: {
    en:
      '🩺 *Appointment Confirmed*\n\n' +
      'Code: *{code}*\nDoctor: *{doctor}*\nDate: *{date} at {time}*\nFee: ₹{fee} ({payMode})\n\n' +
      '{directions}',
    te:
      '🩺 *అపాయింట్‌మెంట్ నిర్ధారించబడింది*\n\n' +
      'కోడ్: *{code}*\nడాక్టర్: *{doctor}*\nతేదీ: *{date} {time}*\nఫీజు: ₹{fee} ({payMode})\n\n' +
      '{directions}',
  },
  appt_pdf_filename: { en: 'Appointment-{code}.pdf', te: 'Appointment-{code}.pdf' },
  pay_mode_at_hospital: { en: 'Pay at Hospital', te: 'హాస్పిటల్‌లో చెల్లించండి' },
  pay_mode_online: { en: 'Online (Paid)', te: 'ఆన్‌లైన్ (చెల్లించబడింది)' },
  directions_cta: { en: 'Get Directions', te: 'దారి చూపండి' },

  // ─── Online payment (Meta Native WhatsApp Pay) ─────────────────────────
  pay_request_body: {
    en:
      '💳 *Complete your payment*\n\n' +
      'Consultation with *{doctor}*\nDate: *{date} at {time}*\nAmount: *₹{fee}*\n\n' +
      'Tap *Review and Pay* to pay securely inside WhatsApp. Your appointment is confirmed once payment succeeds.',
    te:
      '💳 *మీ చెల్లింపును పూర్తి చేయండి*\n\n' +
      '*{doctor}* తో సంప్రదింపు\nతేదీ: *{date} {time}*\nమొత్తం: *₹{fee}*\n\n' +
      'WhatsApp లోనే సురక్షితంగా చెల్లించడానికి *Review and Pay* నొక్కండి. చెల్లింపు విజయవంతమైన తర్వాత అపాయింట్‌మెంట్ నిర్ధారించబడుతుంది.',
  },
  pay_item_consultation: { en: 'Consultation Fee', te: 'సంప్రదింపు ఫీజు' },
  pay_order_footer: { en: 'Secure payment via WhatsApp', te: 'WhatsApp ద్వారా సురక్షిత చెల్లింపు' },
  pay_success_body: {
    en:
      '✅ *Payment Received*\n\n' +
      'Code: *{code}*\nDoctor: *{doctor}*\nAmount paid: *₹{fee}*\n\n' +
      'Your appointment is confirmed. See the attached confirmation below.',
    te:
      '✅ *చెల్లింపు అందింది*\n\n' +
      'కోడ్: *{code}*\nడాక్టర్: *{doctor}*\nచెల్లించిన మొత్తం: *₹{fee}*\n\n' +
      'మీ అపాయింట్‌మెంట్ నిర్ధారించబడింది. కింద నిర్ధారణ పత్రం చూడండి.',
  },
  pay_failed_body: {
    en: '⚠️ Your payment could not be completed. Please try again, or choose *Pay at Hospital*.',
    te: '⚠️ మీ చెల్లింపు పూర్తి కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి లేదా *హాస్పిటల్‌లో చెల్లించండి* ఎంచుకోండి.',
  },

  reschedule_pdf_body: {
    en:
      '🔄 *Appointment Rescheduled*\n\n' +
      'Code: *{code}*\nDoctor: *{doctor}*\nNew date: *{date} at {time}*\n\n' +
      '{directions}',
    te:
      '🔄 *అపాయింట్‌మెంట్ రీషెడ్యూల్ చేయబడింది*\n\n' +
      'కోడ్: *{code}*\nడాక్టర్: *{doctor}*\nకొత్త తేదీ: *{date} {time}*\n\n' +
      '{directions}',
  },

  cancel_pdf_body: {
    en:
      '❌ *Appointment Cancelled*\n\n' +
      'Code: *{code}*\nDoctor: *{doctor}*\nWas: *{date} at {time}*\n\n' +
      'Tap *Choose Service* to book another visit any time.',
    te:
      '❌ *అపాయింట్‌మెంట్ రద్దు చేయబడింది*\n\n' +
      'కోడ్: *{code}*\nడాక్టర్: *{doctor}*\nతేదీ: *{date} {time}*\n\n' +
      'మరొక బుకింగ్‌కు *సేవను ఎంచుకోండి* నొక్కండి.',
  },

  postpone_message_body: {
    en:
      '⚠️ *Appointment Postponed*\n\n' +
      'Code: *{code}*\nDoctor: *{doctor}*\n\n' +
      'Old date: *{oldDate} at {oldTime}*\nNew date: *{newDate} at {newTime}*\n\n' +
      'Reason: {reason}\n\nWe apologise for the inconvenience. The updated appointment PDF is attached.{directions}',
    te:
      '⚠️ *అపాయింట్‌మెంట్ వాయిదా వేయబడింది*\n\n' +
      'కోడ్: *{code}*\nడాక్టర్: *{doctor}*\n\n' +
      'పాత తేదీ: *{oldDate} {oldTime}*\nకొత్త తేదీ: *{newDate} {newTime}*\n\n' +
      'కారణం: {reason}\n\nఅసౌకర్యానికి క్షమించండి. నవీకరించబడిన అపాయింట్‌మెంట్ PDF జతచేయబడింది.{directions}',
  },

  arrival_confirmed_body: {
    en: '✅ {name}, our reception has confirmed your arrival for *{code}* with {doctor}. Please wait — the doctor will see you shortly.',
    te: '✅ {name}, రిసెప్షన్ మీ రాకను *{code}* కోసం {doctor}తో నిర్ధారించింది. దయచేసి వేచి ఉండండి — డాక్టర్ త్వరలో మిమ్మల్ని చూస్తారు.',
  },
  consultation_done_body: {
    en:
      '🙏 Thank you, {name}.\n\nYour consultation with *{doctor}* (Code *{code}*) is complete. Wishing you a speedy recovery!\n\nFor any new bookings, type *hi* to reopen the menu.',
    te:
      '🙏 ధన్యవాదాలు, {name}.\n\n*{doctor}*తో మీ కన్సల్టేషన్ (కోడ్ *{code}*) పూర్తయింది. త్వరగా కోలుకోవాలని కోరుకుంటున్నాము!\n\nకొత్త బుకింగ్ కోసం, మెను తెరవడానికి *hi* అని టైప్ చేయండి.',
  },

  // ─── Website / contact ─────────────────────────────────────────────────
  website_body: {
    en: '🌐 *Vijya Hospital*\n\nTap below to visit our website.',
    te: '🌐 *విజయ హాస్పిటల్*\n\nమా వెబ్‌సైట్‌ను సందర్శించడానికి కింద నొక్కండి.',
  },
  website_cta: { en: 'Open Website', te: 'వెబ్‌సైట్ తెరవండి' },

  contact_body: {
    en:
      '📞 *Contact Vijya Hospital*\n\n' +
      'Phone: {phone}\nAddress: {address}\n\nTap *Call Now* below to reach the front desk.',
    te:
      '📞 *విజయ హాస్పిటల్‌ను సంప్రదించండి*\n\n' +
      'ఫోన్: {phone}\nచిరునామా: {address}\n\nరిసెప్షన్‌ను చేరుకోవడానికి *Call Now* నొక్కండి.',
  },
  contact_cta: { en: 'Call Now', te: 'ఇప్పుడే కాల్ చేయండి' },

  fallback_prompt: {
    en: 'Type *hi* to open the menu.',
    te: 'మెను తెరవడానికి *hi* అని టైప్ చేయండి.',
  },

  generic_error: {
    en: 'Something went wrong. Please type *hi* to start again.',
    te: 'ఏదో తప్పు జరిగింది. మళ్లీ ప్రారంభించడానికి *hi* అని టైప్ చేయండి.',
  },

  no_doctors: {
    en: 'No doctors are configured for this department right now. Please try another department.',
    te: 'ఈ డిపార్ట్‌మెంట్‌కు ప్రస్తుతం డాక్టర్లు ఎవరూ లేరు. దయచేసి మరొక డిపార్ట్‌మెంట్ ప్రయత్నించండి.',
  },
  no_slots: {
    en: 'No appointment slots available for this doctor in the next 14 days.',
    te: 'రాబోయే 14 రోజుల్లో ఈ డాక్టర్‌కు అపాయింట్‌మెంట్ స్లాట్లు అందుబాటులో లేవు.',
  },
};

function t(key, lang = 'en', vars = {}) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const raw = entry[lang] || entry.en || '';
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : ''));
}

module.exports = { t, STRINGS };
