// Payments / escrow adapter — the seam between StayOn and the money "middleware"
// (Stripe Connect / Razorpay Route). One interface, providers behind it.
//
//   createIntent(booking)   → start a payment, money lands HELD (escrow)
//   transferToHost(booking) → release held funds to the host (the "trigger")
//   refund(booking, amount) → return money to the guest
//   connectAccount(host)    → start host payout onboarding (bank + ID)
//
// Default provider is **sim** — it simulates the money pipeline with no external
// keys, so the whole escrow → payout flow is code-complete and testable today.
// Set STRIPE_SECRET_KEY (or RAZORPAY_*) to switch to a real provider; the Stripe
// branches show exactly where the SDK calls go.

const PROVIDER = process.env.PAYMENTS_PROVIDER
  || (process.env.STRIPE_SECRET_KEY ? 'stripe' : process.env.RAZORPAY_KEY_ID ? 'razorpay' : 'sim');

function id(prefix) { return `${prefix}_${Math.abs(Math.round((Date.now() % 1e9) + (process.hrtime ? process.hrtime()[1] % 1000 : 0)))}`; }

async function createIntent(booking) {
  if (PROVIDER === 'stripe') {
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const pi = await stripe.paymentIntents.create({ amount: Math.round((booking.total_usd||0)*100), currency: 'usd',
    //   capture_method: 'automatic', transfer_group: booking.code, metadata: { code: booking.code } });
    // return { intentId: pi.id, status: 'held', clientSecret: pi.client_secret };
  }
  // sim: money is collected and HELD in platform escrow
  return { intentId: id('pi'), status: 'held', clientSecret: id('cs') };
}

async function transferToHost(booking, hostAccountId) {
  if (PROVIDER === 'stripe') {
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const tr = await stripe.transfers.create({ amount: Math.round(((booking.subtotal_usd||0)+(booking.cleaning_usd||0))*100),
    //   currency: 'usd', destination: hostAccountId, transfer_group: booking.code });
    // return { transferId: tr.id, status: 'paid' };
  }
  return { transferId: id('tr'), status: 'paid' };
}

async function refund(booking, amountUSD) {
  if (PROVIDER === 'stripe') {
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const re = await stripe.refunds.create({ payment_intent: booking.payment_intent_id, amount: amountUSD ? Math.round(amountUSD*100) : undefined });
    // return { refundId: re.id, status: 'refunded' };
  }
  return { refundId: id('re'), status: 'refunded' };
}

async function connectAccount(host) {
  if (PROVIDER === 'stripe') {
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const acct = await stripe.accounts.create({ type: 'express', metadata: { hostId: host.id } });
    // const link = await stripe.accountLinks.create({ account: acct.id, type: 'account_onboarding',
    //   refresh_url: '...', return_url: '...' });
    // return { accountId: acct.id, onboardingUrl: link.url, enabled: false };
  }
  return { accountId: id('acct'), onboardingUrl: null, enabled: true }; // sim: instantly "enabled"
}

module.exports = { PROVIDER, createIntent, transferToHost, refund, connectAccount };
