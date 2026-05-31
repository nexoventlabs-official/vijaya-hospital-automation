const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Administrator' },
    // superadmin: platform owner (manages admins + plans + billing history)
    // admin: hospital operator (needs an active subscription for WhatsApp automation)
    role: { type: String, enum: ['superadmin', 'admin'], default: 'admin' },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', lowercase: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
