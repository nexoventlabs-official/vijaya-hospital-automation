/**
 * Super-admin-only management of hospital admin accounts.
 *
 *   GET    /api/admins            — list admins (role 'admin')
 *   POST   /api/admins            — create a new admin (mobile number + password + email)
 *   PUT    /api/admins/:id        — update name/email/phone/active
 *   POST   /api/admins/:id/password — reset an admin's password
 *   DELETE /api/admins/:id        — remove an admin
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Subscription = require('../models/Subscription');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(auth, requireSuperAdmin);

function publicAdmin(a) {
  return {
    id: a._id,
    username: a.username,
    name: a.name,
    email: a.email,
    phone: a.phone,
    role: a.role,
    active: a.active,
    createdAt: a.createdAt,
  };
}

/** List all hospital admins (excludes super admins). */
router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find({ role: 'admin' }).sort({ createdAt: -1 }).lean();
    // attach active-subscription flag for each
    const now = new Date();
    const out = await Promise.all(
      admins.map(async (a) => {
        const active = await Subscription.findOne({ admin: a._id, status: 'active', endsAt: { $gt: now } })
          .sort({ endsAt: -1 })
          .lean();
        return {
          ...publicAdmin(a),
          subscription: active
            ? { planName: active.planName, endsAt: active.endsAt, active: true }
            : { active: false },
        };
      })
    );
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create an admin. The mobile number is used as the login username, and an
 * email is required so subscription invoices can be sent there.
 */
router.post('/', async (req, res) => {
  try {
    const { phone, password, name, email } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: 'Mobile number and password are required' });
    if (!email) return res.status(400).json({ error: 'Email is required (invoices are sent here)' });

    const normPhone = String(phone).replace(/\s+/g, '');
    const username = normPhone.toLowerCase();

    const existing = await Admin.findOne({ username });
    if (existing) return res.status(409).json({ error: 'An admin with this mobile number already exists' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const admin = await Admin.create({
      username,
      passwordHash,
      name: name || 'Hospital Admin',
      email: String(email).toLowerCase().trim(),
      phone: normPhone,
      role: 'admin',
      active: true,
    });
    res.status(201).json(publicAdmin(admin));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin || admin.role !== 'admin') return res.status(404).json({ error: 'Admin not found' });
    const { name, email, phone, active } = req.body || {};
    if (name !== undefined) admin.name = name;
    if (email !== undefined) admin.email = String(email).toLowerCase().trim();
    if (phone !== undefined) {
      const normPhone = String(phone).replace(/\s+/g, '');
      admin.phone = normPhone;
      admin.username = normPhone.toLowerCase();
    }
    if (active !== undefined) admin.active = !!active;
    await admin.save();
    res.json(publicAdmin(admin));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/password', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'New password is required' });
    const admin = await Admin.findById(req.params.id);
    if (!admin || admin.role !== 'admin') return res.status(404).json({ error: 'Admin not found' });
    admin.passwordHash = await bcrypt.hash(String(password), 10);
    await admin.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin || admin.role !== 'admin') return res.status(404).json({ error: 'Admin not found' });
    await admin.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
