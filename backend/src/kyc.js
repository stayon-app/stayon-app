// KYC provider abstraction.
//
// StayOn enforces ONE person = ONE identity at the data layer (unique ID hash).
// This module is the seam where a real document-verification provider plugs in
// to also prove the ID is GENUINE (not just unique). Swap `verifyIdentity` for a
// call to Onfido / Persona / HyperVerge in production — set KYC_PROVIDER +
// KYC_API_KEY and implement the branch.
//
// Returns: { status: 'pending'|'verified'|'rejected', providerRef, reason }

async function verifyIdentity(input) {
  const provider = (process.env.KYC_PROVIDER || '').toLowerCase();
  const key = process.env.KYC_API_KEY;

  // No provider configured → submit goes to the Ops KYC queue for manual review
  // (current behaviour). Nothing is auto-approved, so fakes don't slip through.
  if (!provider || !key) {
    return { status: 'pending', providerRef: null, reason: 'manual_review' };
  }

  // ---- Real provider integration goes here ----
  // Example shape (Persona/Onfido): create an inquiry with the document images,
  // poll/await the decision, map it back to our status.
  //
  //   if (provider === 'persona') {
  //     const r = await fetch('https://withpersona.com/api/v1/inquiries', {
  //       method: 'POST',
  //       headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  //       body: JSON.stringify({ data: { attributes: { /* name, dob, doc */ } } }),
  //     });
  //     const j = await r.json();
  //     const decision = j?.data?.attributes?.status; // 'completed' | 'failed' | ...
  //     return {
  //       status: decision === 'completed' ? 'verified' : decision === 'failed' ? 'rejected' : 'pending',
  //       providerRef: j?.data?.id || null,
  //       reason: decision,
  //     };
  //   }

  // Unknown provider name → be safe, queue for manual review.
  return { status: 'pending', providerRef: null, reason: 'provider_not_implemented' };
}

module.exports = { verifyIdentity };
