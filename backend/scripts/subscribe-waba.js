/**
 * Diagnose & fix the WABA → app subscription so Meta forwards inbound messages
 * to our webhook.
 *
 * 1. GET  /{waba-id}/subscribed_apps   – list current subscribers
 * 2. POST /{waba-id}/subscribed_apps   – subscribe our app (messages field)
 * 3. GET again to confirm
 *
 * Usage: node scripts/subscribe-waba.js
 */
require('dotenv').config();
const axios = require('axios');
const meta = require('../services/metaCloud');

(async () => {
  const c = meta.cfg();
  const headers = { Authorization: `Bearer ${c.accessToken}` };

  console.log('— Current subscribed apps —');
  try {
    const before = await axios.get(`${c.graphRoot}/${c.wabaId}/subscribed_apps`, { headers });
    console.log(JSON.stringify(before.data, null, 2));
  } catch (e) {
    console.error('GET failed:', JSON.stringify(e.response?.data || e.message, null, 2));
  }

  console.log('\n— Subscribing app to messages —');
  try {
    const sub = await axios.post(
      `${c.graphRoot}/${c.wabaId}/subscribed_apps`,
      { subscribed_fields: ['messages'] },
      { headers }
    );
    console.log('Subscribe result:', JSON.stringify(sub.data, null, 2));
  } catch (e) {
    console.error('Subscribe failed:', JSON.stringify(e.response?.data || e.message, null, 2));
  }

  console.log('\n— After subscribe —');
  try {
    const after = await axios.get(`${c.graphRoot}/${c.wabaId}/subscribed_apps`, { headers });
    console.log(JSON.stringify(after.data, null, 2));
  } catch (e) {
    console.error('GET failed:', JSON.stringify(e.response?.data || e.message, null, 2));
  }
})();
