/**
 * Push the latest flowJson.js to the existing flow and re-publish.
 * Usage: npm run flow:sync
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');

(async () => {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    console.error('WHATSAPP_FLOW_ID missing — run `npm run flow:create` first.');
    process.exit(1);
  }
  try {
    const res = await meta.updateFlowJSON(flowId, buildFlowJSON());
    if (res?.validation_errors?.length) {
      console.warn('⚠️  Validation warnings:', JSON.stringify(res.validation_errors, null, 2));
    } else {
      console.log('✅ Flow JSON uploaded');
    }
  } catch (err) {
    console.error('❌ updateFlowJSON failed:', err.response?.data || err.message);
    process.exit(1);
  }
  try {
    await meta.publishFlow(flowId);
    console.log('✅ Flow re-published');
  } catch (err) {
    console.warn('⚠️  publish failed:', err.response?.data || err.message);
  }
})();
