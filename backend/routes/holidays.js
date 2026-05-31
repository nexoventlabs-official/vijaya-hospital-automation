const express = require('express');
const { auth } = require('../middleware/auth');
const Holiday = require('../models/Holiday');
const realtime = require('../services/realtime');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const items = await Holiday.find().sort({ date: 1 }).lean();
  res.json(items);
});

router.post('/', auth, async (req, res) => {
  try {
    const { date, label, labelTe } = req.body || {};
    if (!date || !label) return res.status(400).json({ error: 'date and label required' });
    const doc = await Holiday.findOneAndUpdate(
      { date },
      { $set: { date, label, labelTe: labelTe || '' } },
      { upsert: true, new: true }
    );
    await realtime.emit('holidays', { kind: 'upserted', date });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    await realtime.emit('holidays', { kind: 'deleted', id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
