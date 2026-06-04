/**
 * Singleton wrapper around the Settings collection. Cached for 30s to avoid
 * Mongo round-trips on every WhatsApp message.
 */
const Settings = require('../models/Settings');
const realtime = require('./realtime');

let cache = null;
let cacheAt = 0;
const TTL = 30 * 1000;

async function get(force = false) {
  if (!force && cache && Date.now() - cacheAt < TTL) return cache;
  let doc = await Settings.findOne({ key: 'main' }).lean();
  if (!doc) {
    doc = await Settings.create({
      key: 'main',
      hospitalName: process.env.HOSPITAL_NAME || 'Vijya Hospital',
      contactPhone: process.env.HOSPITAL_PHONE || '',
      addressLine: process.env.HOSPITAL_ADDRESS || '',
      websiteUrl: process.env.HOSPITAL_WEBSITE || '',
      googleMapsUrl: process.env.HOSPITAL_MAPS_URL || '',
    });
    doc = doc.toObject();
  }
  cache = doc;
  cacheAt = Date.now();
  return cache;
}

async function update(patch) {
  const doc = await Settings.findOneAndUpdate(
    { key: 'main' },
    { $set: { ...patch, key: 'main' } },
    { upsert: true, new: true }
  ).lean();
  cache = doc;
  cacheAt = Date.now();
  await realtime.emit('settings', { kind: 'updated' });
  // Re-prime the PDF image cache whenever logo/stamps change
  const { primeImageCache } = require('./pdfGen');
  primeImageCache(doc).catch(() => {});
  return doc;
}

/** Return the Google Maps directions URL set by the admin. Falls back to a generic maps search. */
function directionsUrl(settings) {
  const { googleMapsUrl, addressLine, hospitalName } = settings || {};
  if (googleMapsUrl && googleMapsUrl.trim()) return googleMapsUrl.trim();
  if (addressLine) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${hospitalName || ''} ${addressLine}`.trim())}`;
  }
  return 'https://www.google.com/maps';
}

module.exports = { get, update, directionsUrl };
