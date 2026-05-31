/**
 * Cloudinary helper — used ONLY for logos / icons / banners.
 * Generated PDFs are NEVER stored here (they are streamed back to WhatsApp / browser).
 */
const cloudinary = require('cloudinary').v2;
const streamifier = { createReadStream: (buf) => require('stream').Readable.from(buf) };

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
  return true;
}

const baseFolder = () => process.env.CLOUDINARY_FOLDER || 'vijya_hospital';

/** Upload a buffer to Cloudinary; returns { url, publicId }. */
function uploadBuffer(buffer, { folder = '', publicId, resourceType = 'image', overwrite = true } = {}) {
  if (!ensureConfigured()) {
    return Promise.reject(new Error('Cloudinary not configured'));
  }
  const fullFolder = [baseFolder(), folder].filter(Boolean).join('/');
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: fullFolder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite,
        invalidate: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(upload);
  });
}

async function destroy(publicId, { resourceType = 'image' } = {}) {
  if (!publicId) return;
  if (!ensureConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (err) {
    console.warn('[cloudinary] destroy failed:', err.message);
  }
}

/** Delete every asset under the project's base folder (used by reset script). */
async function purgeBaseFolder() {
  if (!ensureConfigured()) return { ok: false };
  const prefix = baseFolder();
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'image' });
  } catch (err) {
    console.warn('[cloudinary] delete_resources_by_prefix images:', err.message);
  }
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: 'raw' });
  } catch (err) {
    console.warn('[cloudinary] delete_resources_by_prefix raw:', err.message);
  }
  try {
    await cloudinary.api.delete_folder(prefix);
  } catch {} // folder may already be gone
  return { ok: true, prefix };
}

module.exports = { uploadBuffer, destroy, purgeBaseFolder, ensureConfigured };
