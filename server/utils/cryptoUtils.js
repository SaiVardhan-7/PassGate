const crypto = require('crypto');
const { QR_SECRET } = require('../config/secrets');

/**
 * Generate HMAC-SHA256 signature for ticket and event.
 * Signature is computed as: HMAC(ticketId + ":" + eventId, process.env.QR_SECRET)
 */
const generateQRSignature = (ticketId, eventId) => {
  const secret = QR_SECRET;
  const data = `${ticketId.toString()}:${eventId.toString()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify HMAC-SHA256 signature using timingSafeEqual to prevent timing attacks.
 */
const verifyQRSignature = (ticketId, eventId, signature) => {
  if (!ticketId || !eventId || !signature) return false;

  const expectedSignature = generateQRSignature(ticketId, eventId);

  try {
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (err) {
    return false;
  }
};

/**
 * Construct standard encoded QR payload JSON string
 */
const constructQRPayload = (ticketId, eventId, signature) => {
  return JSON.stringify({
    t: ticketId.toString(),
    e: eventId.toString(),
    s: signature,
  });
};

module.exports = {
  generateQRSignature,
  verifyQRSignature,
  constructQRPayload,
};
