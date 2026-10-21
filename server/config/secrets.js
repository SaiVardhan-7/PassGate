// Single source of truth for secrets so signing and verifying always agree.
// dotenv must already be loaded (server.js / seed.js do this first).
const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || !process.env.QR_SECRET)) {
  console.error('[Config Error]: JWT_SECRET and QR_SECRET must be set in production.');
  process.exit(1);
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'jwt_secret_dev_key',
  QR_SECRET: process.env.QR_SECRET || 'default_fallback_qr_secret_key_38291',
};
