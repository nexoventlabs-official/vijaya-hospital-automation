const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Re-validate against the DB so deleted / disabled accounts are logged out
  // immediately (e.g. when a super admin deletes or disables an admin), instead
  // of staying valid until the 7-day token expiry.
  try {
    const admin = await Admin.findById(payload.id).lean();
    if (!admin) return res.status(401).json({ error: 'Account no longer exists' });
    if (admin.active === false) return res.status(401).json({ error: 'Account disabled' });
    // Keep token claims but trust current role/email from DB.
    req.user = { ...payload, role: admin.role, email: admin.email, name: admin.name };
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
  next();
}

/** Allow only super admins past this point. Use after `auth`. */
function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

module.exports = { auth, requireSuperAdmin };
