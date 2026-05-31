/**
 * Wrap @ngrok/ngrok to spin up an HTTPS tunnel for the local backend, write
 * the URL into BACKEND_URL in .env, and print the callback URLs you need to
 * paste into Meta dashboard.
 *
 * Usage:
 *   • Set NGROK_AUTHTOKEN in .env (one-time)
 *   • In one terminal:   npm run dev      (starts the API on PORT 5050)
 *   • In another:        npm run ngrok    (this script)
 */
require('dotenv').config();
const ngrok = require('@ngrok/ngrok');
const { setKeys } = require('./_envFile');

(async () => {
  const port = parseInt(process.env.PORT || '5050', 10);
  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.error('❌ NGROK_AUTHTOKEN missing in .env. Get it from https://dashboard.ngrok.com');
    process.exit(1);
  }

  const opts = { addr: port, authtoken };
  if (process.env.NGROK_DOMAIN) opts.domain = process.env.NGROK_DOMAIN;

  let listener;
  try {
    listener = await ngrok.forward(opts);
  } catch (err) {
    console.error('❌ ngrok forward failed:', err.message);
    process.exit(1);
  }

  const url = listener.url();
  setKeys({ BACKEND_URL: url });

  console.log('\n────────── ngrok ready ──────────');
  console.log(`Public URL:        ${url}`);
  console.log(`Health check:      ${url}/api/health`);
  console.log('\n────────── Meta Dashboard ──────────');
  console.log(`Webhook callback URL:  ${url}/api/webhook/meta`);
  console.log(`Verify token:          ${process.env.META_VERIFY_TOKEN || 'vijya_hospital_verify'}`);
  console.log(`Flow endpoint URI:     ${url}/api/flow-endpoint`);
  console.log('\nLeave this terminal running. Now in another terminal run:');
  console.log('  npm run flow:setup       # creates + publishes the WhatsApp Flow');
  console.log('\nThen go to Meta → WhatsApp → Configuration → Webhook → Edit and paste the callback URL above.');
  console.log('Subscribe to fields:  messages,  message_template_status_update');

  // keep alive
  await new Promise(() => {});
})();
