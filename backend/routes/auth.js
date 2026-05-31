const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const admin = await Admin.findOne({ username: String(username).toLowerCase() });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  if (admin.active === false) return res.status(403).json({ error: 'This account is disabled' });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: admin._id, username: admin.username, role: admin.role, name: admin.name, email: admin.email },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { id: admin._id, username: admin.username, role: admin.role, name: admin.name, email: admin.email },
  });
});

router.get('/verify', auth, (req, res) => {
  res.json({ user: req.user });
});

/** Change your own password (any authenticated admin / super admin). */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (String(newPassword).length < 4) {
      return res.status(400).json({ error: 'New password is too short' });
    }
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ error: 'Account not found' });
    const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await admin.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
