// services/ownerNotify.js
// SYNHA — Loop 4: Owner notification on appointment confirmation.
//
// Sends a WhatsApp message to config.ownerPhone the moment an appointment
// is booked (both pay-at-hospital and online modes).
//
// Guarantees (same contract as the Restarunt notifier):
//   - Non-blocking: never throws; booking is never blocked by this.
//   - Idempotent: de-duplicates by appointment code within the process
//     lifetime so it never double-notifies.
//   - Config-driven: message body from config.ownerNotifyTemplate.
//   - No new dependency: reuses the existing metaCloud.sendText sender.

const meta = require('./metaCloud');

const DEFAULT_TEMPLATE =
  '🔔 New Appointment — {reference}\n\n' +
  'Patient: {customerName} ({customerPhone})\n' +
  'Doctor: {doctor} ({department})\n' +
  'When: {when}\n' +
  'Payment: {paymentMode}\n' +
  'Booked: {time}';

// Process-lifetime dedupe of owner notifications, keyed by appointment code.
const _notified = new Set();
const _clear = setInterval(() => _notified.clear(), 60 * 60 * 1000);
if (typeof _clear.unref === 'function') _clear.unref();

function _paymentLabel(mode) {
  return mode === 'online' ? 'Online' : 'Pay at Hospital';
}

/**
 * Build the owner message from an appointment document and config template.
 * @param {Object} appt   - Appointment document (or plain object)
 * @param {Object} config - hospital.config
 * @returns {string}
 */
function buildOwnerMessage(appt, config) {
  const template = (config && config.ownerNotifyTemplate) || DEFAULT_TEMPLATE;
  const when = `${appt.date || ''} ${appt.timeLabel || appt.time || ''}`.trim();
  return template
    .replace(/{reference}/g, appt.code || '')
    .replace(/{customerName}/g, appt.patientName || 'Patient')
    .replace(/{customerPhone}/g, appt.patientPhone || '')
    .replace(/{doctor}/g, appt.doctorName || '')
    .replace(/{department}/g, appt.departmentName || '')
    .replace(/{when}/g, when)
    .replace(/{paymentMode}/g, _paymentLabel(appt.paymentMode))
    .replace(/{time}/g, new Date().toLocaleString('en-IN'));
}

/**
 * Notify the business owner on WhatsApp. Fire-and-forget: never rejects.
 * @param {Object} appt   - Appointment document (or plain object)
 * @param {Object} config - hospital.config
 */
async function notifyOwner(appt, config) {
  try {
    if (!appt) return;
    const ownerPhone = config && config.ownerPhone;
    if (!ownerPhone) return; // not configured → skip silently
    const ref = appt.code;
    if (ref) {
      if (_notified.has(ref)) return;
      _notified.add(ref);
    }
    const message = buildOwnerMessage(appt, config);
    await meta.sendText(ownerPhone, message);
  } catch (err) {
    // Never throw — appointment confirmation must never be blocked.
    console.error('[ownerNotify] failed:', err && err.message);
  }
}

module.exports = { notifyOwner, buildOwnerMessage };
