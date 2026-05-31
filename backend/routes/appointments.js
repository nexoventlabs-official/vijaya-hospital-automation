const express = require('express');
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const apptService = require('../services/appointmentService');
const chatbot = require('../services/chatbot');
const settingsSvc = require('../services/settings');
const pdfGen = require('../services/pdfGen');
const slotsSvc = require('../services/slots');

const router = express.Router();

/** GET /api/appointments?status=today|upcoming|active|all */
router.get('/', auth, async (req, res) => {
  try {
    const today = slotsSvc.ymd(new Date());
    const filter = {};
    const status = (req.query.status || 'active').toLowerCase();
    if (status === 'today') {
      filter.date = today;
      filter.status = { $in: ['booked', 'arrived'] };
    } else if (status === 'upcoming') {
      filter.date = { $gt: today };
      filter.status = { $in: ['booked', 'arrived'] };
    } else if (status === 'arrived') {
      filter.status = 'arrived';
    } else if (status === 'active') {
      filter.status = { $in: ['booked', 'arrived'] };
    }
    if (req.query.doctor) filter.doctor = req.query.doctor;
    if (req.query.phone) filter.patientPhone = String(req.query.phone).replace(/\D/g, '');
    const list = await Appointment.find(filter).sort({ date: 1, time: 1 }).limit(500).lean();
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const a = await Appointment.findById(req.params.id).lean();
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

router.post('/:id/arrive', auth, async (req, res) => {
  try {
    const a = await apptService.markArrived(req.params.id);
    const lang = await chatbot.getLanguage(a.patientPhone);
    chatbot.sendArrivedConfirmation(a.patientPhone, a.toObject(), lang).catch(() => {});
    res.json(a);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { paymentReceived, notes } = req.body || {};
    const a = await apptService.markCompleted(req.params.id, { paymentReceived: !!paymentReceived, notes: notes || '' });
    const lang = await chatbot.getLanguage(a.patientPhone);
    chatbot.sendCompletedConfirmation(a.patientPhone, a.toObject(), lang).catch(() => {});
    res.json(a);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/payment', auth, async (req, res) => {
  try {
    const a = await apptService.markPaymentReceived(req.params.id);
    res.json(a);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const a = await apptService.cancelAppointment(req.params.id, { reason: req.body?.reason || 'Cancelled by admin' });
    const lang = await chatbot.getLanguage(a.patientPhone);
    chatbot.sendCancelledPdf(a.patientPhone, a.toObject(), lang).catch(() => {});
    res.json(a);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/appointments/:id/pdf — stream the PDF for browser preview / printing.
 *  No file is stored anywhere — buffer is generated on-demand. */
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const a = await Appointment.findById(req.params.id).lean();
    if (!a) return res.status(404).json({ error: 'Not found' });
    const settings = await settingsSvc.get();
    const buffer = await pdfGen.buildAppointmentPdf({ appointment: a, settings, title: 'Appointment' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Appointment-${a.code}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Re-syncs all active appointments to Google Sheets (admin-triggered refresh). */
router.post('/sync-sheets', auth, async (req, res) => {
  try {
    const n = await apptService.refreshAllSheets();
    res.json({ ok: true, count: n });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
