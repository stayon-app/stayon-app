// Content guard for pre-booking chat.
//
// Until a booking is confirmed, neither host nor guest may share contact details
// (phone numbers, street addresses, email) — otherwise they could take the deal
// off-platform. This must catch a number written ANY way: plain digits, spaced,
// dashed, spelled out ("nine eight five six"), mixed ("nine8-five-six"), with
// "double"/"triple", in any order or separator. After confirmation, sharing is
// allowed and the guard is bypassed by the caller.

export type GuardReason = 'phone' | 'address' | 'email';

export interface GuardResult {
  blocked: boolean;
  reason?: GuardReason;
  message?: string;
}

const MESSAGES: Record<GuardReason, string> = {
  phone:
    'For your safety, phone numbers can’t be shared until the booking is confirmed. Once it’s confirmed you can share contact details here.',
  address:
    'For your safety, addresses can’t be shared until the booking is confirmed. Once it’s confirmed you can share the exact address here.',
  email:
    'For your safety, email or off‑platform contacts can’t be shared until the booking is confirmed. Keep chatting here until then.',
};

// Single-digit words (1 digit each). "oh"/"o" = zero (as in "nine oh five").
const DIGIT_WORDS: Record<string, number> = {
  zero: 1, oh: 1, nought: 1, naught: 1,
  one: 1, two: 1, three: 1, four: 1, five: 1, six: 1, seven: 1, eight: 1, nine: 1,
};
// Multi-digit number words → how many digits they contribute.
const MULTI_WORDS: Record<string, number> = {
  ten: 2, eleven: 2, twelve: 2, thirteen: 2, fourteen: 2, fifteen: 2, sixteen: 2,
  seventeen: 2, eighteen: 2, nineteen: 2, twenty: 2, thirty: 2, forty: 2, fifty: 2,
  sixty: 2, seventy: 2, eighty: 2, ninety: 2, hundred: 3, thousand: 4,
};
// Words that join numeric tokens without breaking the run.
const CONNECTOR_WORDS = new Set(['and', 'dash', 'dot', 'hyphen', 'space', 'point']);
// Multipliers: repeat the next numeric token.
const MULTIPLIERS: Record<string, number> = { double: 2, triple: 3, twice: 2 };

// Words that hint a phone is being exchanged — lower the trigger threshold.
const PHONE_HINTS = [
  'call', 'whatsapp', 'whats app', 'wsp', 'telegram', 'signal', 'phone', 'mobile',
  'cell', 'dial', 'number', 'num', 'contact', 'ph no', 'phno', 'reach me', 'ring me',
  'imo', 'viber', 'sms', 'text me',
];

// Strong address signals — a number near any of these means an address. These
// are matched as whole words (so "breakfast" doesn't trip "st").
const ADDRESS_WORD_RE = /\b(street|st|road|rd|avenue|ave|lane|ln|boulevard|blvd|sector|flat|apartment|apt|suite|plot|building|bldg|colony|nagar|layout|pincode|zipcode|zip|postal|hno)\b/i;
// Multi-word address phrases (matched as substrings).
const ADDRESS_STRONG_PHRASES = [
  'pin code', 'zip code', 'po box', 'door no', 'door number', 'house no',
  'house number', 'h.no', 'flat no', 'building no', 'block no',
];
// Phrases that reveal a location regardless of numbers.
const ADDRESS_PHRASES = [
  'my address', 'address is', 'i live at', 'i live in', 'located at', 'come to my',
  'reach me at', 'my place is at', 'directions to', 'find me at', 'drop by at',
  'my home is at', 'stay is at',
];

const EMAIL_RE = /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\s+at\s+)\s*[a-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\s+dot\s+)\s*[a-z]{2,}/i;

/** Longest run of contiguous digits, where number-words, digits and pure
 *  separators all count as part of the same run. Returns the max digit count. */
function maxNumericRun(text: string): { run: number; total: number } {
  // Split into letter-groups, digit-groups and "other" (separators/symbols).
  const tokens = text.toLowerCase().match(/[a-z]+|\d+|[^a-z\d]+/gi) || [];
  let run = 0;
  let best = 0;
  let total = 0;
  let pendingMultiplier = 1;

  for (const tok of tokens) {
    if (/^\d+$/.test(tok)) {
      const add = tok.length * pendingMultiplier;
      run += add; total += add; pendingMultiplier = 1;
      if (run > best) best = run;
    } else if (/^[a-z]+$/.test(tok)) {
      if (tok in DIGIT_WORDS) {
        const add = DIGIT_WORDS[tok] * pendingMultiplier;
        run += add; total += add; pendingMultiplier = 1;
        if (run > best) best = run;
      } else if (tok in MULTI_WORDS) {
        const add = MULTI_WORDS[tok] * pendingMultiplier;
        run += add; total += add; pendingMultiplier = 1;
        if (run > best) best = run;
      } else if (tok in MULTIPLIERS) {
        pendingMultiplier = MULTIPLIERS[tok]; // applies to the next numeric token
      } else if (CONNECTOR_WORDS.has(tok)) {
        // keep the run going
      } else {
        run = 0; pendingMultiplier = 1; // a real word breaks the sequence
      }
    } else {
      // separators like space, -, ., (), + — keep the run going, but a newline
      // or sentence break (two+ of certain chars) still counts as connector.
    }
  }
  return { run: best, total };
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Inspect a chat message. Returns { blocked } and a reason/message when it
 * contains contact info that must not be shared before confirmation.
 */
export function inspectMessage(raw: string): GuardResult {
  const text = ` ${(raw || '').toLowerCase()} `;

  // Email / off-platform handle.
  if (EMAIL_RE.test(raw || '')) {
    return { blocked: true, reason: 'email', message: MESSAGES.email };
  }

  const { run } = maxNumericRun(raw || '');
  const phoneHint = hasAny(text, PHONE_HINTS);

  // Phone: a long numeric run in any representation, or a shorter one alongside
  // a phone hint word ("call me 4 5 6 7 8").
  if (run >= 7 || (phoneHint && run >= 5)) {
    return { blocked: true, reason: 'phone', message: MESSAGES.phone };
  }

  // Address: a strong street keyword plus a number, or a revealing phrase.
  const addressStrong = ADDRESS_WORD_RE.test(text) || hasAny(text, ADDRESS_STRONG_PHRASES);
  const addressPhrase = hasAny(text, ADDRESS_PHRASES);
  const hasNumber = run >= 1;
  if (addressPhrase || (addressStrong && hasNumber)) {
    return { blocked: true, reason: 'address', message: MESSAGES.address };
  }

  return { blocked: false };
}
