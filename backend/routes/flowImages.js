const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const flowImages = require('../services/flowImages');
const cloudinary = require('../services/cloudinary');
const flowEndpoint = require('./flowEndpoint');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const list = await flowImages.listAll();
  res.json(list);
});

router.put('/:key', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image required' });
    const r = await cloudinary.uploadBuffer(req.file.buffer, { folder: 'flow-images', publicId: req.params.key });
    const doc = await flowImages.setUrl(req.params.key, { imageUrl: r.url, publicId: r.publicId });
    flowEndpoint.clearImageCache && flowEndpoint.clearImageCache();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:key', auth, async (req, res) => {
  try {
    const list = await flowImages.listAll();
    const doc = list.find((d) => d.key === req.params.key);
    if (doc?.publicId) await cloudinary.destroy(doc.publicId);
    await flowImages.setUrl(req.params.key, { imageUrl: '', publicId: '' });
    flowEndpoint.clearImageCache && flowEndpoint.clearImageCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
