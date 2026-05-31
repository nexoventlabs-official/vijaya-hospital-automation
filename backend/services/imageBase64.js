/**
 * Fetches an image URL and returns it as a base64 string suitable for WhatsApp Flow
 * Image components (which require inline base64 data, not URLs).
 *
 * Supports Cloudinary transformation params via the `opts` argument.
 */
const axios = require('axios');

function buildCloudinaryTransform(url, opts = {}) {
  if (!url || !url.includes('/upload/')) return url;
  const parts = [];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);
  if (opts.quality) parts.push(`q_${opts.quality}`);
  if (opts.format) parts.push(`f_${opts.format}`);
  if (!parts.length) return url;
  return url.replace('/upload/', `/upload/${parts.join(',')}/`);
}

async function urlToBase64(url, opts = {}) {
  if (!url) return '';
  const transformed = buildCloudinaryTransform(url, opts);
  try {
    const resp = await axios.get(transformed, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 6 * 1024 * 1024,
    });
    return Buffer.from(resp.data).toString('base64');
  } catch (err) {
    console.warn('[imageBase64] failed for', transformed, err.message);
    return '';
  }
}

module.exports = { urlToBase64, buildCloudinaryTransform };
