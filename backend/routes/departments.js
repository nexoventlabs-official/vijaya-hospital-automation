const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const Department = require('../models/Department');
const cloudinary = require('../services/cloudinary');
const realtime = require('../services/realtime');
const redis = require('../services/redis');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const items = await Department.find().sort({ sortOrder: 1, name: 1 }).lean();
  res.json(items);
});

router.post('/', auth, upload.single('icon'), async (req, res) => {
  try {
    const body = req.body || {};
    let iconUrl = '';
    let iconPublicId = '';
    if (req.file) {
      const r = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'departments' });
      iconUrl = r.url;
      iconPublicId = r.publicId;
    }
    const doc = await Department.create({
      name: body.name,
      nameTe: body.nameTe || '',
      description: body.description || '',
      descriptionTe: body.descriptionTe || '',
      iconUrl,
      iconPublicId,
      active: body.active !== 'false',
      sortOrder: parseInt(body.sortOrder || '0', 10),
    });
    await redis.delPattern('vh:cache:*');
    await realtime.emit('departments', { kind: 'created', id: String(doc._id) });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, upload.single('icon'), async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const dept = await Department.findById(id);
    if (!dept) return res.status(404).json({ error: 'Not found' });

    if (req.file) {
      if (dept.iconPublicId) await cloudinary.destroy(dept.iconPublicId);
      const r = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'departments' });
      dept.iconUrl = r.url;
      dept.iconPublicId = r.publicId;
    }
    if (body.name !== undefined) dept.name = body.name;
    if (body.nameTe !== undefined) dept.nameTe = body.nameTe;
    if (body.description !== undefined) dept.description = body.description;
    if (body.descriptionTe !== undefined) dept.descriptionTe = body.descriptionTe;
    if (body.active !== undefined) dept.active = body.active === 'true' || body.active === true;
    if (body.sortOrder !== undefined) dept.sortOrder = parseInt(body.sortOrder, 10);
    await dept.save();
    await redis.delPattern('vh:cache:*');
    await realtime.emit('departments', { kind: 'updated', id: String(dept._id) });
    res.json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ error: 'Not found' });
    if (dept.iconPublicId) await cloudinary.destroy(dept.iconPublicId);
    await dept.deleteOne();
    await redis.delPattern('vh:cache:*');
    await realtime.emit('departments', { kind: 'deleted', id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
