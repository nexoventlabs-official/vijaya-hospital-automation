const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const settingsSvc = require('../services/settings');
const cloudinary = require('../services/cloudinary');
const Settings = require('../models/Settings');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const s = await settingsSvc.get(true);
  res.json(s);
});

router.put('/', auth, upload.single('logo'), async (req, res) => {
  try {
    const body = req.body || {};
    const patch = {};
    [
      'hospitalName',
      'hospitalNameTe',
      'contactPhone',
      'contactPhoneAlt',
      'websiteUrl',
      'addressLine',
      'addressLineTe',
      'locationLabel',
      'googleMapsPlaceId',
    ].forEach((k) => {
      if (body[k] !== undefined) patch[k] = body[k];
    });
    if (body.locationLat !== undefined) patch.locationLat = parseFloat(body.locationLat) || 0;
    if (body.locationLng !== undefined) patch.locationLng = parseFloat(body.locationLng) || 0;

    if (req.file) {
      const current = await Settings.findOne({ key: 'main' }).lean();
      if (current?.logoPublicId) await cloudinary.destroy(current.logoPublicId);
      const r = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'settings' });
      patch.logoUrl = r.url;
      patch.logoPublicId = r.publicId;
    }

    const updated = await settingsSvc.update(patch);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
