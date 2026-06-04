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

router.put(
  '/',
  auth,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'stampConfirmed', maxCount: 1 },
    { name: 'stampCompleted', maxCount: 1 },
  ]),
  async (req, res) => {
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
        'googleMapsUrl',
      ].forEach((k) => {
        if (body[k] !== undefined) patch[k] = body[k];
      });

      const files = req.files || {};
      const current = await Settings.findOne({ key: 'main' }).lean();

      // Logo
      if (files.logo?.[0]) {
        if (current?.logoPublicId) await cloudinary.destroy(current.logoPublicId);
        const r = await cloudinary.uploadBuffer(files.logo[0].buffer, { folder: 'settings' });
        patch.logoUrl = r.url;
        patch.logoPublicId = r.publicId;
      }
      // Confirmed stamp
      if (files.stampConfirmed?.[0]) {
        if (current?.stampConfirmedPublicId) await cloudinary.destroy(current.stampConfirmedPublicId);
        const r = await cloudinary.uploadBuffer(files.stampConfirmed[0].buffer, { folder: 'settings' });
        patch.stampConfirmedUrl = r.url;
        patch.stampConfirmedPublicId = r.publicId;
      }
      // Completed stamp
      if (files.stampCompleted?.[0]) {
        if (current?.stampCompletedPublicId) await cloudinary.destroy(current.stampCompletedPublicId);
        const r = await cloudinary.uploadBuffer(files.stampCompleted[0].buffer, { folder: 'settings' });
        patch.stampCompletedUrl = r.url;
        patch.stampCompletedPublicId = r.publicId;
      }

      const updated = await settingsSvc.update(patch);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

module.exports = router;
