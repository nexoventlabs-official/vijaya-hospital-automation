/**
 * Seed (or reset) the default super admin user, and seed default plans.
 * Usage: npm run seed:admin
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const plansSvc = require('../services/plans');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const username = (process.env.SUPERADMIN_USERNAME || process.env.ADMIN_USERNAME || 'superadmin').toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin';
  const email = (process.env.SUPERADMIN_EMAIL || '').toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.findOneAndUpdate(
    { username },
    { $set: { passwordHash, role: 'superadmin', name: 'Super Admin', email, active: true } },
    { upsert: true }
  );
  await plansSvc.ensureDefaults();
  console.log(`✅ Super admin ready — username: ${username}, password: ${password}`);
  console.log('✅ Default plans ensured (1 month / 6 months / 12 months)');
  await mongoose.disconnect();
})();
