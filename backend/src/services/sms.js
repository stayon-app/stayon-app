// SMS service abstraction. In dev mode logs to console; in production wire up
// your provider of choice (Twilio, AWS SNS, etc.) in sendReal().

const DEV = process.env.NODE_ENV !== 'production';

/**
 * Send an OTP code via SMS.
 * In dev mode it just logs the code to console — no external dependency needed.
 * @param {string} phone  – E.164 phone number (e.g. "+919876543210")
 * @param {string} code   – The OTP code to send
 */
async function sendOtp(phone, code) {
  if (DEV) {
    console.log(`\n📱 [DEV OTP] Phone: ${phone}  Code: ${code}\n`);
    return;
  }
  await sendReal(phone, code);
}

/**
 * Production SMS sender. Replace the body with your preferred provider.
 * Example providers: Twilio, AWS SNS, MSG91, Textlocal.
 */
async function sendReal(phone, code) {
  // ── Twilio example ─────────────────────────────────────────────
  // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  // await twilio.messages.create({
  //   body: `Your StayOn verification code is: ${code}`,
  //   from: process.env.TWILIO_FROM,
  //   to: phone,
  // });
  // ───────────────────────────────────────────────────────────────

  throw new Error('SMS provider not configured — set NODE_ENV=development for console OTPs');
}

module.exports = { sendOtp };
