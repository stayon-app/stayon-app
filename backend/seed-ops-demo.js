// Demo data for the Ops portal — realistic rows in each module so you can see
// how they look. Idempotent-ish: skips a table if it already has demo rows.
// Run:  node --env-file-if-exists=.env seed-ops-demo.js
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seed(table, rows) {
  const { data, error } = await sb.from(table).select('id').limit(3);
  if (error) { console.log(`- ${table}: skipped (table missing — run migration)`); return; }
  if ((data || []).length >= 2) { console.log(`- ${table}: already has data (${data.length}+) — skipped`); return; }
  const { error: e2 } = await sb.from(table).insert(rows);
  console.log(`- ${table}: ${e2 ? 'ERROR ' + e2.message : 'seeded ' + rows.length + ' rows ✓'}`);
}

(async () => {
  // real ids to reference
  const { data: users } = await sb.from('users').select('id,name').limit(20);
  const { data: listings } = await sb.from('listings').select('id,title,host_id').limit(20);
  const { data: bookings } = await sb.from('bookings').select('code,host_id,guest_id').limit(20);
  const u = (i) => (users && users[i % (users.length || 1)]) || {};
  const l = (i) => (listings && listings[i % (listings.length || 1)]) || {};
  const b = (i) => (bookings && bookings[i % (bookings.length || 1)]) || {};
  console.log(`refs: ${users?.length || 0} users · ${listings?.length || 0} listings · ${bookings?.length || 0} bookings\n`);

  await seed('tickets', [
    { subject: 'Refund not received', body: 'Guest says refund for STY-... not in account.', category: 'payments', priority: 'high', status: 'open', user_id: u(0).id },
    { subject: 'Cannot upload listing photos', body: 'Host upload spins forever on iOS.', category: 'technical', priority: 'normal', status: 'in_progress', user_id: u(1).id },
    { subject: 'Change check-in time', body: 'Guest requests early check-in.', category: 'general', priority: 'low', status: 'open', user_id: u(2).id },
  ]);

  await seed('disputes', [
    { booking_code: b(0).code, kind: 'damage', opened_by: b(0).host_id, against_id: b(0).guest_id, amount_usd: 120, status: 'open' },
    { booking_code: b(1).code, kind: 'refund', opened_by: b(1).guest_id, against_id: b(1).host_id, amount_usd: 80, status: 'open' },
  ]);

  await seed('safety_cases', [
    { severity: 'high', kind: 'guest_safety', description: 'Guest reported a faulty smoke alarm at the stay.', user_id: u(3).id, listing_id: l(0).id, status: 'open' },
    { severity: 'medium', kind: 'host_safety', description: 'Host reported a guest behaving aggressively.', user_id: u(4).id, listing_id: l(1).id, status: 'open' },
  ]);

  await seed('field_tasks', [
    { title: 'Verify amenities at Cliff Villa', kind: 'inspection', city: 'Goa', listing_id: l(0).id, assignee: 'Field Agent A', status: 'open', notes: 'Confirm pool + wifi as listed.' },
    { title: 'Photo re-shoot — Lake House', kind: 'photo', city: 'Udaipur', listing_id: l(1).id, assignee: 'Field Agent B', status: 'open' },
  ]);

  await seed('risk_flags', [
    { user_id: u(5).id, subject: 'Guest', kind: 'high_cancellations', severity: 'medium', detail: '4 cancelled bookings in 30 days', status: 'open' },
    { user_id: u(6).id, subject: 'Host', kind: 'bank_change', severity: 'high', detail: 'Bank account changed twice this week', status: 'open' },
    { user_id: u(7).id, subject: 'Guest', kind: 'velocity', severity: 'low', detail: '6 bookings in 1 hour', status: 'open' },
  ]);

  await seed('bank_accounts', [
    { host_id: l(0).host_id, host_name: 'Asha R', masked: '•••• 4421', bank: 'HDFC Bank', country: 'India', status: 'pending' },
    { host_id: l(1).host_id, host_name: 'Rahul M', masked: '•••• 9087', bank: 'ICICI Bank', country: 'India', status: 'pending' },
  ]);

  await seed('maintenance', [
    { listing_id: l(0).id, listing_title: l(0).title || 'Cliff Villa', kind: 'damage', description: 'Cracked bathroom mirror reported by guest', severity: 'medium', status: 'open' },
    { listing_id: l(1).id, listing_title: l(1).title || 'Lake House', kind: 'repair', description: 'AC not cooling — needs servicing', severity: 'high', status: 'open' },
  ]);

  await seed('incidents', [
    { title: 'Elevated payment failures (gateway)', severity: 'major', area: 'payments', status: 'open', notes: '~3% checkout failures last hour.' },
    { title: 'Search latency spike', severity: 'minor', area: 'search', status: 'open' },
  ]);

  // markets / partners / region_rules are seeded by migration-004; top up if empty
  await seed('partners', [
    { name: 'SparkleClean', kind: 'cleaning', city: 'Mumbai', status: 'active' },
    { name: 'CityKeys PM', kind: 'property_manager', city: 'Goa', status: 'active' },
  ]);

  console.log('\nDemo seed complete. Refresh the Ops portal to see populated modules.');
})();
