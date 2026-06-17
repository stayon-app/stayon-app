// Quick test: verify otp_codes and refresh_tokens tables exist in Supabase
const { supabase, configured } = require('./src/supabase');

async function test() {
  console.log('Supabase configured:', configured);
  if (!configured) { console.log('FAIL: Supabase not configured'); return; }

  // Test 1: Can we query the users table?
  console.log('\n--- Test 1: users table ---');
  const { data: users, error: e1 } = await supabase.from('users').select('id').limit(1);
  console.log('users:', e1 ? `ERROR: ${e1.code} ${e1.message}` : `OK (${users.length} rows)`);

  // Test 2: Can we query the otp_codes table?
  console.log('\n--- Test 2: otp_codes table ---');
  const { data: otps, error: e2 } = await supabase.from('otp_codes').select('id').limit(1);
  console.log('otp_codes:', e2 ? `ERROR: ${e2.code} ${e2.message}` : `OK (${otps.length} rows)`);

  // Test 3: Can we query the refresh_tokens table?
  console.log('\n--- Test 3: refresh_tokens table ---');
  const { data: tokens, error: e3 } = await supabase.from('refresh_tokens').select('id').limit(1);
  console.log('refresh_tokens:', e3 ? `ERROR: ${e3.code} ${e3.message}` : `OK (${tokens.length} rows)`);
}

test().catch(e => console.error('FATAL:', e));
