/**
 * Publish an already-created flow (WHATSAPP_FLOW_ID) and persist status to .env.
 * Useful when the first publish failed because the endpoint was cold-starting.
 *
 * Usage: node scripts/publish-flow.js
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { setKeys } = require('./_envFile');

(async () => {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    console.error('❌ WHATSAPP_FLOW_ID missing — run `npm run flow:create` first.');
    process.exit(1);
  }
  try {
    await meta.publishFlow(flowId);
    setKeys({ WHATSAPP_FLOW_STATUS: 'PUBLISHED' });
    console.log(`✅ Flow ${flowId} published. WHATSAPP_FLOW_STATUS=PUBLISHED saved to .env`);
  } catch (err) {
    console.error('❌ publish failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
