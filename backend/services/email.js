/**
 * Email sender (nodemailer / SMTP). Used to deliver the dynamically generated
 * subscription invoice to the admin's email after a successful purchase.
 *
 * Configure via .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false)
 *   SMTP_USER, SMTP_PASS
 *   MAIL_FROM        e.g. "Vijya Hospital <billing@vijyahospital.com>"
 *
 * Invoices are NOT stored anywhere — the PDF buffer is built on the fly and
 * attached directly to the outgoing mail.
 */
const nodemailer = require('nodemailer');

let _transporter = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  if (_transporter) return _transporter;
  if (!isConfigured()) throw new Error('SMTP not configured — set SMTP_HOST / SMTP_USER / SMTP_PASS');
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
}

function fromAddress() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@vijyahospital.com';
}

/**
 * Send an email with optional attachments.
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {Array}  [opts.attachments]  nodemailer attachment objects
 */
async function send({ to, subject, text, html, attachments = [] }) {
  if (!to) throw new Error('email "to" is required');
  const info = await transporter().sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
    attachments,
  });
  return info;
}

module.exports = { isConfigured, send, fromAddress };
