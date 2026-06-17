// SMS service abstraction. The transport is chosen by OTP_TRANSPORT (NOT NODE_ENV),
// so the server can run in production while still using console OTPs until a real
// SMS provider is wired:
//   OTP_TRANSPORT=console  → log the code to the server console (default)
//   OTP_TRANSPORT=twilio   → send via Twilio (configure in sendReal)
// When the transport is 'console', the code is also surfaced to the client as
// `devCode` so closed testing works without an SMS provider.

const OTP_TRANSPORT = (process.env.OTP_TRANSPORT || 'console').toLowerCase();
const isConsoleTransport = OTP_TRANSPORT === 'console';

/**
 * Send an OTP code via the configured transport.
 * @param {string} phone  – E.164 phone number (e.g. "+919876543210")
 * @param {string} code   – The OTP code to send
 */
async function sendOtp(phone, code) {
  if (isConsoleTransport) {
    console.log(`\n📱 [OTP · console] Phone: ${phone}  Code: ${code}\n`);
    return;
  }
  await sendReal(phone, code);
}

/**
 * Production SMS sender. Dispatches by OTP_TRANSPORT. Replace the body with your
 * preferred provider. Example providers: Twilio, AWS SNS, MSG91, Textlocal.
 */
async function sendReal(phone, code) {
  // ── Twilio example ─────────────────────────────────────────────
  // if (OTP_TRANSPORT === 'twilio') {
  //   const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  //   await twilio.messages.create({
  //     body: `Your StayOn verification code is: ${code}`,
  //     from: process.env.TWILIO_FROM,
  //     to: phone,
  //   });
  //   return;
  // }
  // ───────────────────────────────────────────────────────────────

  throw new Error(`OTP_TRANSPORT='${OTP_TRANSPORT}' has no sender configured — set OTP_TRANSPORT=console or wire a provider in sms.js`);
}

module.exports = { sendOtp, isConsoleTransport, OTP_TRANSPORT };
