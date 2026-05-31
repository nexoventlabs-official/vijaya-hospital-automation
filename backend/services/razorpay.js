/**
 * Minimal Razorpay integration using the REST API directly (axios + crypto)
 * so we don't pull in the heavy SDK. Credentials live in the backend .env and
 * belong to the super admin / platform owner:
 *
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *
 * Only after a payment is verified server-side do we activate the admin's plan
 * and unlock WhatsApp automation.
 */
const axios = require('axios');
const crypto = require('crypto');

function cfg() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay not configured — set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET');
  }
  return { keyId, keySecret };
}

function isConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Public key id for the frontend Checkout widget. */
function publicKeyId() {
  return process.env.RAZORPAY_KEY_ID || '';
}

/**
 * Create an order. Amount is in rupees; Razorpay wants paise.
 * @returns {Promise<{id,amount,currency,...}>}
 */
async function createOrder({ amountRupees, receipt, notes = {} }) {
  const { keyId, keySecret } = cfg();
  const body = {
    amount: Math.round(Number(amountRupees) * 100),
    currency: 'INR',
    receipt: receipt || `rcpt_${Date.now()}`,
    payment_capture: 1,
    notes,
  };
  const { data } = await axios.post('https://api.razorpay.com/v1/orders', body, {
    auth: { username: keyId, password: keySecret },
    timeout: 20000,
  });
  return data;
}

/**
 * Verify the checkout signature returned by Razorpay Checkout.
 * signature == HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = cfg();
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

module.exports = { isConfigured, publicKeyId, createOrder, verifyPaymentSignature };
