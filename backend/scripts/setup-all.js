/**
 * Orchestrated setup: keys → upload public key → create flow → publish.
 *
 * Requires BACKEND_URL set to your public HTTPS URL (start ngrok first and
 * paste the https URL into .env's BACKEND_URL).
 *
 * Usage: npm run flow:setup
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { setKeys } = require('./_envFile');
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');

const KEYS_DIR = path.join(__dirname, '..', 'flow_keys');
const PRIV_PATH = path.join(KEYS_DIR, 'private.pem');
const PUB_PATH = path.join(KEYS_DIR, 'public.pem');

function ensureKeypair() {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  if (fs.existsSync(PRIV_PATH) && fs.existsSync(PUB_PATH)) {
    console.log('• Reusing existing keypair in flow_keys/');
    return {
      privateKey: fs.readFileSync(PRIV_PATH, 'utf8'),
      publicKey: fs.readFileSync(PUB_PATH, 'utf8'),
    };
  }
  console.log('• Generating new RSA-2048 keypair…');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  fs.writeFileSync(PRIV_PATH, privateKey);
  fs.writeFileSync(PUB_PATH, publicKey);
  return { privateKey, publicKey };
}

const escapeNl = (s) => s.replace(/\r?\n/g, '\\n').trim();

(async () => {
  const { privateKey, publicKey } = ensureKeypair();
  setKeys({
    FLOW_PRIVATE_KEY: escapeNl(privateKey),
    FLOW_PUBLIC_KEY: escapeNl(publicKey),
  });
  console.log('✅ FLOW_PRIVATE_KEY / FLOW_PUBLIC_KEY saved to .env');

  delete require.cache[require.resolve('dotenv')];
  require('dotenv').config({ override: true });

  try {
    await meta.uploadBusinessPublicKey(publicKey.trim());
    console.log('✅ Public key uploaded to Meta');
  } catch (err) {
    console.error('❌ uploadBusinessPublicKey failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (!backend.startsWith('https://')) {
    console.error('❌ BACKEND_URL must be HTTPS. Current:', backend || '(empty)');
    console.error('   Start ngrok and set BACKEND_URL in .env first.');
    process.exit(1);
  }
  const endpointUri = `${backend}/api/flow-endpoint`;
  console.log(`• Endpoint URI: ${endpointUri}`);

  let flowId;
  try {
    const r = await meta.createFlow('Vijya Hospital Welcome', ['OTHER'], { endpointUri });
    flowId = r.id;
    console.log('✅ Flow created:', flowId);
  } catch (err) {
    console.error('❌ createFlow failed:', err.response?.data || err.message);
    process.exit(1);
  }

  try {
    const res = await meta.updateFlowJSON(flowId, buildFlowJSON());
    if (res?.validation_errors?.length) {
      console.warn('⚠️  Validation warnings:');
      console.warn(JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('✅ Flow JSON uploaded');
    }
  } catch (err) {
    console.error('❌ updateFlowJSON failed:', err.response?.data || err.message);
    process.exit(1);
  }

  let status = 'DRAFT';
  try {
    await meta.publishFlow(flowId);
    status = 'PUBLISHED';
    console.log('✅ Flow published');
  } catch (err) {
    console.warn('⚠️  publish failed — kept as DRAFT:', err.response?.data || err.message);
  }

  setKeys({ WHATSAPP_FLOW_ID: flowId, WHATSAPP_FLOW_STATUS: status });

  console.log('\n────────── DONE ──────────');
  console.log(`Flow ID:      ${flowId}`);
  console.log(`Flow status:  ${status}`);
  console.log(`Endpoint:     ${endpointUri}`);
  console.log(`Webhook URL:  ${backend}/api/webhook/meta`);
  console.log(`Verify token: ${process.env.META_VERIFY_TOKEN}`);
  console.log('\nNow set the same Webhook URL + Verify Token in Meta Dashboard');
  console.log('  →  WhatsApp → Configuration → Webhooks → Edit');
  console.log('  Subscribe to: messages, message_template_status_update');
})();
