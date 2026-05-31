/**
 * Thin wrapper around the WhatsApp Cloud API.
 *
 * Exposes the message types we use: text, image, document, interactive
 * (buttons / cta_url / flow), media-upload, and Flow-management endpoints
 * (createFlow / updateFlowJSON / publishFlow / setFlowEndpoint / uploadBusinessPublicKey).
 */
const axios = require('axios');
const FormData = require('form-data');

function cfg() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const wabaId = process.env.META_WABA_ID;
  const v = process.env.META_GRAPH_VERSION || 'v22.0';
  if (!accessToken || !phoneNumberId || !wabaId) {
    throw new Error('Meta config missing — set META_ACCESS_TOKEN / META_PHONE_NUMBER_ID / META_WABA_ID');
  }
  return {
    accessToken,
    phoneNumberId,
    wabaId,
    graphVersion: v,
    baseUrl: `https://graph.facebook.com/${v}/${phoneNumberId}`,
    graphRoot: `https://graph.facebook.com/${v}`,
  };
}

const api = axios.create({ timeout: 30000 });
const phoneOf = (to) => String(to).replace(/\D/g, '');

async function sendText(to, text) {
  const { baseUrl, accessToken } = cfg();
  const { data } = await api.post(
    `${baseUrl}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneOf(to),
      type: 'text',
      text: { body: text, preview_url: false },
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

async function sendImage(to, imageUrl, caption = '') {
  const { baseUrl, accessToken } = cfg();
  const { data } = await api.post(
    `${baseUrl}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneOf(to),
      type: 'image',
      image: { link: imageUrl, caption },
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

/** Send a document by URL or by media id. */
async function sendDocument(to, { link, mediaId, filename, caption }) {
  const { baseUrl, accessToken } = cfg();
  const document = {};
  if (mediaId) document.id = mediaId;
  else document.link = link;
  if (filename) document.filename = filename;
  if (caption) document.caption = caption;
  const { data } = await api.post(
    `${baseUrl}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneOf(to),
      type: 'document',
      document,
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

/**
 * Upload a buffer to WhatsApp's `/media` endpoint. Returns the `media_id`
 * which can be used as `document.id` in subsequent messages — perfect for
 * generated PDFs we DON'T want to store in Cloudinary.
 */
async function uploadMedia(buffer, { mimeType = 'application/pdf', filename = 'file.pdf' } = {}) {
  const { baseUrl, accessToken } = cfg();
  const fd = new FormData();
  fd.append('messaging_product', 'whatsapp');
  fd.append('type', mimeType);
  fd.append('file', buffer, { filename, contentType: mimeType });
  const { data } = await api.post(`${baseUrl}/media`, fd, {
    headers: { Authorization: `Bearer ${accessToken}`, ...fd.getHeaders() },
    maxContentLength: 20 * 1024 * 1024,
    maxBodyLength: 20 * 1024 * 1024,
  });
  return data.id;
}

/** Reply-buttons interactive message (max 3 buttons). Each = { id, title }. */
async function sendButtons(to, { headerImageUrl, headerText, bodyText, footerText, buttons }) {
  const { baseUrl, accessToken } = cfg();
  let header;
  if (headerImageUrl) header = { type: 'image', image: { link: headerImageUrl } };
  else if (headerText) header = { type: 'text', text: headerText };

  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: 'reply',
        reply: { id: b.id, title: (b.title || '').slice(0, 20) },
      })),
    },
  };
  if (header) interactive.header = header;
  if (footerText) interactive.footer = { text: footerText };

  const { data } = await api.post(
    `${baseUrl}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: phoneOf(to), type: 'interactive', interactive },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

/** cta_url interactive — single tap-to-open URL button. */
async function sendCtaUrl(to, { headerImageUrl, headerDocumentMediaId, headerDocumentUrl, headerDocumentFilename, headerText, bodyText, footerText, ctaText, ctaUrl }) {
  const { baseUrl, accessToken } = cfg();
  let header;
  if (headerDocumentMediaId) header = { type: 'document', document: { id: headerDocumentMediaId, filename: headerDocumentFilename || 'document.pdf' } };
  else if (headerDocumentUrl) header = { type: 'document', document: { link: headerDocumentUrl, filename: headerDocumentFilename || 'document.pdf' } };
  else if (headerImageUrl) header = { type: 'image', image: { link: headerImageUrl } };
  else if (headerText) header = { type: 'text', text: headerText };

  const interactive = {
    type: 'cta_url',
    body: { text: bodyText },
    action: { name: 'cta_url', parameters: { display_text: ctaText, url: ctaUrl } },
  };
  if (header) interactive.header = header;
  if (footerText) interactive.footer = { text: footerText };

  const { data } = await api.post(
    `${baseUrl}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: phoneOf(to), type: 'interactive', interactive },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

/**
 * Interactive Flow message — opens a published Flow via CTA button.
 *
 * `flowAction` defaults to `data_exchange` for backend-driven multi-screen flows.
 * Use `navigate` only if the flow is fully self-contained (rare).
 */
async function sendFlowMessage(to, options) {
  const { baseUrl, accessToken } = cfg();

  const {
    flowId,
    flowCta,
    headerImageUrl,
    headerDocumentMediaId,
    headerDocumentUrl,
    headerDocumentFilename,
    headerText,
    bodyText,
    footerText,
    flowToken,
    mode = 'published',
    flowAction = 'data_exchange',
  } = options;

  let header;
  if (headerDocumentMediaId) header = { type: 'document', document: { id: headerDocumentMediaId, filename: headerDocumentFilename || 'document.pdf' } };
  else if (headerDocumentUrl) header = { type: 'document', document: { link: headerDocumentUrl, filename: headerDocumentFilename || 'document.pdf' } };
  else if (headerImageUrl) header = { type: 'image', image: { link: headerImageUrl } };
  else header = { type: 'text', text: headerText || 'Vijya Hospital' };

  const interactive = {
    type: 'flow',
    header,
    body: { text: bodyText },
    action: {
      name: 'flow',
      parameters: {
        flow_message_version: '3',
        flow_token: flowToken || `welcome_${phoneOf(to)}`,
        flow_id: flowId,
        flow_cta: flowCta,
        mode,
        flow_action: flowAction,
      },
    },
  };
  if (footerText) interactive.footer = { text: footerText };

  const { data } = await api.post(
    `${baseUrl}/messages`,
    { messaging_product: 'whatsapp', recipient_type: 'individual', to: phoneOf(to), type: 'interactive', interactive },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

/* ─── Flow management (used by setup scripts) ──────────────────────────── */

async function createFlow(name, categories = ['OTHER'], { endpointUri } = {}) {
  const { graphRoot, accessToken, wabaId } = cfg();
  const body = { name, categories };
  if (endpointUri) body.endpoint_uri = endpointUri;
  const { data } = await api.post(`${graphRoot}/${wabaId}/flows`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

async function updateFlowJSON(flowId, flowJsonObj) {
  const { graphRoot, accessToken } = cfg();
  const fd = new FormData();
  fd.append('file', Buffer.from(JSON.stringify(flowJsonObj)), {
    filename: 'flow.json',
    contentType: 'application/json',
  });
  fd.append('name', 'flow.json');
  fd.append('asset_type', 'FLOW_JSON');
  const { data } = await api.post(`${graphRoot}/${flowId}/assets`, fd, {
    headers: { Authorization: `Bearer ${accessToken}`, ...fd.getHeaders() },
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  });
  return data;
}

async function publishFlow(flowId) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}/publish`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data;
}

async function setFlowEndpoint(flowId, endpointUri, { autoPublish = true } = {}) {
  const { graphRoot, accessToken } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}`,
    { endpoint_uri: endpointUri },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (autoPublish) {
    try {
      await publishFlow(flowId);
    } catch (err) {
      console.warn('[metaCloud.setFlowEndpoint] re-publish failed:', err.response?.data || err.message);
    }
  }
  return data;
}

async function uploadBusinessPublicKey(publicKeyPem) {
  const { phoneNumberId, accessToken, graphVersion } = cfg();
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/whatsapp_business_encryption`;
  const fd = new URLSearchParams();
  fd.append('business_public_key', publicKeyPem);
  const { data } = await api.post(url, fd.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return data;
}

module.exports = {
  cfg,
  sendText,
  sendImage,
  sendDocument,
  sendButtons,
  sendCtaUrl,
  sendFlowMessage,
  uploadMedia,
  createFlow,
  updateFlowJSON,
  publishFlow,
  setFlowEndpoint,
  uploadBusinessPublicKey,
};
