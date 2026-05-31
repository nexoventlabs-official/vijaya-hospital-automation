/**
 * Reset script — wipes the *vijya_hospital* MongoDB database, the
 * `vijya_hospital/` Cloudinary folder, and clears every Google Sheet tab
 * the appointment automation owns.
 *
 * Other projects (kavitha_pg etc) sharing the same Cloudinary cloud, Mongo
 * cluster, or Google Sheet are NOT affected because:
 *   • Mongo:       we only drop the database referenced in MONGODB_URI (vijya_hospital)
 *   • Cloudinary:  we only delete resources under CLOUDINARY_FOLDER (vijya_hospital/)
 *   • Sheets:      we only clear our four named tabs
 *
 * Run with `--yes` to skip the prompt. Usage: npm run reset:all -- --yes
 */
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

async function confirm() {
  if (process.argv.includes('--yes')) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('This will wipe ALL Vijya Hospital data. Type YES to continue: ', (a) => {
      rl.close();
      resolve(a.trim() === 'YES');
    });
  });
}

(async () => {
  const ok = await confirm();
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  // ─── Mongo ────────────────────────────────────────────────────────────
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log(`• Dropping Mongo database: ${mongoose.connection.name}`);
      await mongoose.connection.dropDatabase();
      console.log('✅ Mongo wiped');
      await mongoose.disconnect();
    } catch (err) {
      console.warn('[reset] Mongo:', err.message);
    }
  }

  // ─── Cloudinary ──────────────────────────────────────────────────────
  try {
    const cloudinary = require('../services/cloudinary');
    if (cloudinary.ensureConfigured()) {
      const r = await cloudinary.purgeBaseFolder();
      console.log(`✅ Cloudinary folder purged (${r.prefix})`);
    } else {
      console.log('• Cloudinary not configured — skipped');
    }
  } catch (err) {
    console.warn('[reset] Cloudinary:', err.message);
  }

  // ─── Google Sheets ───────────────────────────────────────────────────
  try {
    const sheets = require('../services/googleSheets');
    if (sheets.isReady()) {
      await sheets.purgeAll();
      console.log('✅ Google Sheets tabs cleared');
    } else {
      console.log('• Google Sheets not configured — skipped');
    }
  } catch (err) {
    console.warn('[reset] Sheets:', err.message);
  }

  console.log('\nDone. Now re-run:');
  console.log('  npm run seed:admin');
  console.log('  npm run seed:departments');
  console.log('  npm run flow:setup     # if you need to recreate the flow');
})();
