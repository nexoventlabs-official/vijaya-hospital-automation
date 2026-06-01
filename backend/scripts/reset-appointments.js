/**
 * Reset ONLY appointment + patient data (clears test bookings).
 *
 * Wipes:
 *   • Appointment collection
 *   • Patient collection
 *   • The four Google Sheets appointment tabs (Today / Upcoming / Completed / Cancelled)
 *   • The cached dashboard stats (so the panel shows 0 immediately)
 *
 * PRESERVES everything else: doctors, departments, holidays, settings, admins,
 * subscriptions, plans, inbound messages.
 *
 * Usage:
 *   node scripts/reset-appointments.js --yes
 */
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

async function confirm() {
  if (process.argv.includes('--yes')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      'This will DELETE all appointments and patients (test data). Doctors, departments,\nsettings, admins and subscriptions are kept. Type YES to continue: ',
      (a) => {
        rl.close();
        resolve(a.trim() === 'YES');
      }
    );
  });
}

(async () => {
  const ok = await confirm();
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not configured');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Mongo] connected:', mongoose.connection.name);

  const Appointment = require('../models/Appointment');
  const Patient = require('../models/Patient');

  const apptRes = await Appointment.deleteMany({});
  console.log(`✅ Deleted ${apptRes.deletedCount} appointments`);

  const patRes = await Patient.deleteMany({});
  console.log(`✅ Deleted ${patRes.deletedCount} patients`);

  // Clear Google Sheets appointment tabs
  try {
    const sheets = require('../services/googleSheets');
    if (sheets.isReady()) {
      await sheets.purgeAll();
      console.log('✅ Google Sheets appointment tabs cleared');
    } else {
      console.log('• Google Sheets not configured — skipped');
    }
  } catch (err) {
    console.warn('[reset] Sheets:', err.message);
  }

  // Bust caches so dashboard stats reflect 0 immediately
  try {
    const redis = require('../services/redis');
    await redis.del('vh:cache:dashboard:stats');
    await redis.delPattern('vh:cache:appointments:*');
    console.log('✅ Dashboard / appointment caches cleared');
  } catch (err) {
    console.warn('[reset] cache:', err.message);
  }

  await mongoose.disconnect();
  console.log('\nDone. Appointments, patients, and pending-payment stats are now reset to 0.');
  process.exit(0);
})().catch((err) => {
  console.error('[reset] failed:', err.message);
  process.exit(1);
});
