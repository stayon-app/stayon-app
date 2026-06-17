// OTP generation, storage, and verification against Supabase.
// Codes live in the otp_codes table (migration-011). Each code expires after
// OTP_EXPIRY seconds (default 300 = 5 min) and allows up to MAX_ATTEMPTS
// failed verifications before being invalidated.

const crypto = require('crypto');
const { supabase } = require('../supabase');
const { sendOtp: smsSend } = require('./sms');

const OTP_LENGTH   = parseInt(process.env.OTP_LENGTH, 10) || 6;
const OTP_EXPIRY   = parseInt(process.env.OTP_EXPIRY_SECONDS, 10) || 300; // 5 min
const MAX_ATTEMPTS = 5;
const DEV = process.env.NODE_ENV !== 'production';

/** Generate a cryptographically random N-digit numeric code. */
function generateCode(len = OTP_LENGTH) {
  const max = Math.pow(10, len);
  const num = crypto.randomInt(0, max);
  return String(num).padStart(len, '0');
}

/**
 * Create an OTP for a phone number, store it, and send via SMS.
 * @param {string} phone   – Full phone with dial code, e.g. "+919876543210"
 * @param {string} userId  – UUID of the user (may be newly created)
 * @returns {{ expiresIn: number, devCode?: string }}
 */
async function createOtp(phone, userId) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY * 1000).toISOString();

  // Invalidate any previous unused codes for this phone
  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('phone', phone)
    .eq('used', false);

  // Insert the new code
  const { error } = await supabase.from('otp_codes').insert({
    user_id: userId,
    phone,
    code,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to store OTP: ${error.message}`);

  // Send via SMS (console in dev)
  await smsSend(phone, code);

  const result = { expiresIn: OTP_EXPIRY };
  if (DEV) result.devCode = code; // Return code in dev mode for testing
  return result;
}

/**
 * Verify an OTP code for a phone number.
 * @param {string} phone – Full phone with dial code
 * @param {string} code  – 6-digit code entered by user
 * @returns {{ userId: string }} on success
 * @throws {Error} with code INVALID_OTP / EXPIRED_OTP / MAX_ATTEMPTS
 */
async function verifyOtp(phone, code) {
  // Find the latest unused code for this phone
  const { data: rows, error } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`OTP lookup failed: ${error.message}`);

  const otp = rows?.[0];
  if (!otp) {
    const err = new Error('No active OTP found. Please request a new code.');
    err.code = 'INVALID_OTP';
    throw err;
  }

  // Check expiry
  if (new Date(otp.expires_at) < new Date()) {
    await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id);
    const err = new Error('Code has expired. Please request a new one.');
    err.code = 'EXPIRED_OTP';
    throw err;
  }

  // Check max attempts
  if (otp.attempts >= MAX_ATTEMPTS) {
    await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id);
    const err = new Error('Too many failed attempts. Please request a new code.');
    err.code = 'MAX_ATTEMPTS';
    throw err;
  }

  // Check the code
  if (otp.code !== code) {
    await supabase
      .from('otp_codes')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id);
    const err = new Error('Invalid verification code.');
    err.code = 'INVALID_OTP';
    throw err;
  }

  // Mark as used
  await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id);

  return { userId: otp.user_id };
}

module.exports = { createOtp, verifyOtp, generateCode };
