const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const cloudinary = require('../services/cloudinary');
const realtime = require('../services/realtime');
const redis = require('../services/redis');
const apptService = require('../services/appointmentService');
const chatbot = require('../services/chatbot');

const router = express.Router();

function parseSlots(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

router.get('/', auth, async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  const items = await Doctor.find(filter).populate('department').sort({ sortOrder: 1, name: 1 }).lean();
  res.json(items);
});

router.get('/:id', auth, async (req, res) => {
  const doc = await Doctor.findById(req.params.id).populate('department').lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name || !body.department) return res.status(400).json({ error: 'name and department required' });
    const dept = await Department.findById(body.department);
    if (!dept) return res.status(400).json({ error: 'department not found' });

    let photoUrl = '';
    let photoPublicId = '';
    if (req.file) {
      const r = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'doctors' });
      photoUrl = r.url;
      photoPublicId = r.publicId;
    }
    const doc = await Doctor.create({
      name: body.name,
      nameTe: body.nameTe || '',
      department: body.department,
      speciality: body.speciality || '',
      specialityTe: body.specialityTe || '',
      qualifications: body.qualifications || '',
      experienceYears: parseInt(body.experienceYears || '0', 10),
      photoUrl,
      photoPublicId,
      consultationFee: parseInt(body.consultationFee || '0', 10),
      weeklySlots: parseSlots(body.weeklySlots),
      active: body.active !== 'false',
      sortOrder: parseInt(body.sortOrder || '0', 10),
    });
    await redis.delPattern('vh:cache:*');
    await realtime.emit('doctors', { kind: 'created', id: String(doc._id) });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    if (req.file) {
      if (doc.photoPublicId) await cloudinary.destroy(doc.photoPublicId);
      const r = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'doctors' });
      doc.photoUrl = r.url;
      doc.photoPublicId = r.publicId;
    }
    [
      'name',
      'nameTe',
      'speciality',
      'specialityTe',
      'qualifications',
    ].forEach((f) => {
      if (body[f] !== undefined) doc[f] = body[f];
    });
    if (body.department) doc.department = body.department;
    if (body.experienceYears !== undefined) doc.experienceYears = parseInt(body.experienceYears, 10);
    if (body.consultationFee !== undefined) doc.consultationFee = parseInt(body.consultationFee, 10);
    if (body.sortOrder !== undefined) doc.sortOrder = parseInt(body.sortOrder, 10);
    if (body.active !== undefined) doc.active = body.active === 'true' || body.active === true;
    if (body.weeklySlots !== undefined) doc.weeklySlots = parseSlots(body.weeklySlots);
    await doc.save();
    await redis.delPattern('vh:cache:*');
    await realtime.emit('doctors', { kind: 'updated', id: String(doc._id) });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.photoPublicId) await cloudinary.destroy(doc.photoPublicId);
    await doc.deleteOne();
    await redis.delPattern('vh:cache:*');
    await realtime.emit('doctors', { kind: 'deleted', id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Mark a doctor absent on a date (with reason). Postpones every active
 * appointment that day to the next available slot for the same doctor and
 * notifies the affected patients on WhatsApp.
 */
router.post('/:id/absent', auth, async (req, res) => {
  try {
    const { date, reason } = req.body || {};
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    const moved = await apptService.postponeDoctorDay(req.params.id, date, reason || 'Doctor unavailable');
    // notify patients
    for (const { old, newAppt } of moved) {
      try {
        const lang = await chatbot.getLanguage(old.patientPhone);
        await chatbot.sendPostponePdf(old.patientPhone, old, newAppt, lang);
      } catch (err) {
        console.warn('[postpone] notify failed:', err.message);
      }
    }
    res.json({ ok: true, moved: moved.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/absent/:date', auth, async (req, res) => {
  try {
    const doc = await Doctor.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    doc.absences = (doc.absences || []).filter((a) => a.date !== req.params.date);
    await doc.save();
    await realtime.emit('doctors', { kind: 'absence_removed', id: String(doc._id) });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
