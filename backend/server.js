require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const flowEndpointRoutes = require('./routes/flowEndpoint');
const dashboardRoutes = require('./routes/dashboard');
const departmentsRoutes = require('./routes/departments');
const doctorsRoutes = require('./routes/doctors');
const holidaysRoutes = require('./routes/holidays');
const settingsRoutes = require('./routes/settings');
const flowImagesRoutes = require('./routes/flowImages');
const appointmentsRoutes = require('./routes/appointments');
const realtimeRoutes = require('./routes/realtime');
const adminsRoutes = require('./routes/admins');
const plansRoutes = require('./routes/plans');
const billingRoutes = require('./routes/billing');
const paymentRoutes = require('./routes/payment');

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const backendUrl = process.env.BACKEND_URL || '';
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (backendUrl && origin === backendUrl) return cb(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
  })
);

// Body parser — capture raw body for Meta signature verification
app.use(
  express.json({
    limit: '20mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/webhook/meta')) {
        req.rawBody = buf.toString();
      }
      if (req.originalUrl && req.originalUrl.startsWith('/api/payment/razorpay-webhook')) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health
app.get('/', (_req, res) => res.json({ name: 'Vijya Hospital API', status: 'ok', time: new Date().toISOString() }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/flow-endpoint', flowEndpointRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/flow-images', flowImagesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/admins', adminsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payment', paymentRoutes);

// 404 / errors
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));
app.use((err, _req, res, _next) => {
  console.error('[ErrorHandler]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '5050', 10);

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not configured');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('[Mongo] connected');
  } catch (err) {
    console.error('[Mongo] connection failed:', err.message);
    process.exit(1);
  }

  // Seed default super admin if none exists
  try {
    const Admin = require('./models/Admin');
    const bcrypt = require('bcryptjs');
    const superCount = await Admin.countDocuments({ role: 'superadmin' });
    if (superCount === 0) {
      const username = (process.env.SUPERADMIN_USERNAME || process.env.ADMIN_USERNAME || 'superadmin').toLowerCase();
      const password = process.env.SUPERADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin';
      const email = (process.env.SUPERADMIN_EMAIL || '').toLowerCase();
      // If a legacy default 'admin' account exists, promote it to super admin.
      const legacy = await Admin.findOne({ username });
      if (legacy) {
        legacy.role = 'superadmin';
        if (email) legacy.email = email;
        await legacy.save();
        console.log(`[Seed] Promoted existing user to super admin: ${username}`);
      } else {
        const passwordHash = await bcrypt.hash(password, 10);
        await Admin.create({ username, passwordHash, role: 'superadmin', name: 'Super Admin', email });
        console.log(`[Seed] Default super admin created: ${username}`);
      }
    }
  } catch (err) {
    console.warn('[Seed] super admin seed skipped:', err.message);
  }

  // Seed default subscription plans (1m / 6m / 12m) if none exist
  try {
    const plansSvc = require('./services/plans');
    await plansSvc.ensureDefaults();
  } catch (err) {
    console.warn('[Seed] plans seed skipped:', err.message);
  }

  // Ensure flow image keys exist + Settings doc
  try {
    const flowImages = require('./services/flowImages');
    const settingsSvc = require('./services/settings');
    await flowImages.ensureKeysExist();
    await settingsSvc.get();
  } catch (err) {
    console.warn('[Seed] flow image keys / settings skipped:', err.message);
  }

  // Initialise Google Sheets tabs (idempotent)
  try {
    const sheets = require('./services/googleSheets');
    if (sheets.isReady()) await sheets.ensureTabs();
  } catch (err) {
    console.warn('[Sheets] init skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT}`);
  });
}

if (require.main === module) start();

module.exports = app; // for tests
