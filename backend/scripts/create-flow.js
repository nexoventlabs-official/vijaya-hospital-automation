/**
 * Create + publish the Vijya Hospital flow on Meta and persist its id to .env.
 *
 * Requires:
 *   • BACKEND_URL set to a public HTTPS URL (use ngrok in dev)
 *   • Public key already uploaded (`npm run flow:upload-key`)
 *
 * Usage: npm run flow:create
 */
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (!backend.startsWith('https://')) {
    console.error('❌ BACKEND_URL must be HTTPS. Current:', backend || '(empty)');
    console.error('   Start ngrok and set BACKEND_URL in .env first.');
    process.exit(1);
  }

  const endpointUri = `${backend}/api/flow-endpoint`;
  console.log('• Creating flow with endpoint:', endpointUri);

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
      console.warn('⚠️  Validation warnings:', JSON.stringify(res.validation_errors, null, 2));
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
  console.log('\n────── .env updated ──────');
  console.log(`WHATSAPP_FLOW_ID=${flowId}`);
  console.log(`WHATSAPP_FLOW_STATUS=${status}`);
})();
