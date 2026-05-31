/**
 * Upload FLOW_PUBLIC_KEY (from .env) to Meta's WhatsApp Business Encryption endpoint.
 *
 * Usage: npm run flow:upload-key
 */
require('dotenv').config();
const meta = require('../services/metaCloud');

(async () => {
  const raw = process.env.FLOW_PUBLIC_KEY;
  if (!raw) {
    console.error('FLOW_PUBLIC_KEY missing — run `npm run flow:keys` first.');
    process.exit(1);
  }
  const publicKey = raw.split('\\n').join('\n').trim();
  try {
    const r = await meta.uploadBusinessPublicKey(publicKey);
    console.log('✅ Uploaded:', r);
  } catch (err) {
    console.error('❌ uploadBusinessPublicKey failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
