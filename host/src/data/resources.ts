// Hosting resources — an in-app help library for StayOn hosts. The topic map
// mirrors a full hosting help centre (getting started → listing → calendar →
// reservations → payouts → reviews → safety → account → regulations), but every
// article is written for StayOn's model: 0% platform fee for hosts AND guests,
// fixed listing location, locked identity after verification. Original content —
// no third-party help text is reproduced.

export interface Article {
  id: string;
  title: string;
  read: string;        // "3 min read"
  summary: string;
  body: string[];      // paragraphs / bullet lines
}

export interface ResourceCategory {
  id: string;
  title: string;
  icon: string;        // Ionicons name
  image: string;       // cover photo (also used as each article's hero)
  blurb: string;
  articles: Article[];
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  // 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'getting-started', title: 'Getting started', icon: 'rocket-outline',
    image: img('photo-1560448204-e02f11c3d0e2'),
    blurb: 'From first photo to first booking.',
    articles: [
      {
        id: 'prepare-to-host', title: 'Preparing to host your home', read: '4 min read',
        summary: 'What to sort out before you go live.',
        body: [
          'Decide what you’re offering: an entire place, a private room, or a shared room. Be honest — it sets guest expectations from the first tap.',
          'Get the space guest-ready: deep clean, fix anything broken, and make sure every light, tap and lock works.',
          'Gather the essentials guests expect — fresh linens, towels, soap, toilet paper, and basic kitchen items.',
          'Verify your identity once (Profile → Identity & verification). It’s required before you can publish and is locked after approval.',
          'Add a payout method so you get paid. StayOn takes 0% — what you set is what you keep, plus cleaning; only taxes pass through.',
        ],
      },
      {
        id: 'ways-to-host', title: 'Ways to host on StayOn', read: '3 min read',
        summary: 'Entire place, private room, or shared — and how involved you want to be.',
        body: [
          'Entire place: guests have the whole home to themselves. Best for privacy and higher rates.',
          'Private room: guests get their own room and share common areas with you or others.',
          'Shared room: a shared sleeping space — usually the most budget-friendly option.',
          'Choose your involvement: hands-on with self check-in and quick replies, or fully hands-off with Instant Book and clear house rules.',
        ],
      },
      {
        id: 'host-standards', title: 'Hosting standards & expectations', read: '3 min read',
        summary: 'The basics every StayOn host commits to.',
        body: [
          'Accuracy: your listing, photos and amenities match reality. Surprises cause bad reviews.',
          'Communication: reply quickly and share check-in details before arrival.',
          'Cleanliness: the place is spotless at check-in, every time.',
          'Reliability: don’t cancel on guests. Keep your calendar accurate so you never double-book.',
        ],
      },
      {
        id: 'first-booking', title: 'Win your first booking', read: '3 min read',
        summary: 'Small moves that get you off the ground.',
        body: [
          'Price a little below comparable places at first — a few great early reviews are worth more than a few extra dollars.',
          'Turn on Instant Book to appear in more searches, or use Request to Book if you want to approve each guest.',
          'Respond fast to every enquiry; your response speed affects how often you’re shown.',
          'Once you have 3–5 five-star stays, nudge your price up to match your quality.',
        ],
      },
    ],
  },

  // 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'your-listing', title: 'Your listing', icon: 'home-outline',
    image: img('photo-1522708323590-d24dbb6b0267'),
    blurb: 'Create, price and edit a listing guests love.',
    articles: [
      {
        id: 'listing-details', title: 'Listing details that convert', read: '4 min read',
        summary: 'Photos, title and description that earn the click.',
        body: [
          'Lead with light. Bright, daytime photos get the most clicks — shoot near a window with tidy surfaces and a crisp made bed.',
          'Use all your photo slots (min 6, aim for 12+). Show every room plus the view and any standout feature.',
          'Write a title that names the feeling: “Sunlit loft, 5 min to the beach” beats “2BHK apartment”.',
          'In the description, cover the space, who it suits, and the neighbourhood. Be specific about beds and bathrooms.',
          'Tick every accurate amenity — guests filter by Wi-Fi, AC, parking and kitchen, so each one widens your reach.',
        ],
      },
      {
        id: 'pricing', title: 'Pricing your home', read: '4 min read',
        summary: 'Because StayOn is fee-free, every rupee of your rate is yours.',
        body: [
          'Start near comparable nearby places, then adjust by demand. Lots of views but no bookings? Nudge down a little.',
          'Use weekend pricing for Friday/Saturday demand, and weekly or monthly discounts to fill longer gaps.',
          'Set an honest cleaning fee — guests expect it; keep it realistic so your total stays competitive.',
          'Remember the math: your payout = nightly rate × nights + cleaning fee. No platform cut. Only government taxes are added for the guest and passed through.',
        ],
      },
      {
        id: 'availability', title: 'Listing availability', read: '3 min read',
        summary: 'Control when guests can book.',
        body: [
          'Block dates you’re unavailable directly on your calendar so you’re never double-booked.',
          'Set a minimum and maximum nights stay to match how you like to host.',
          'Use preparation time between bookings if you need a day to clean and reset.',
          'Set how far in advance guests can book — from same-day to months ahead.',
        ],
      },
      {
        id: 'instant-book', title: 'Booking settings & Instant Book', read: '3 min read',
        summary: 'Approve each guest, or let bookings flow automatically.',
        body: [
          'Instant Book: qualified guests book without waiting for approval. It boosts visibility and bookings.',
          'Request to Book: you review each guest and accept or decline within 24 hours.',
          'Either way, set clear house rules and requirements so the right guests self-select.',
          'You can switch between the two anytime under your listing’s booking settings.',
        ],
      },
      {
        id: 'marketing', title: 'Marketing & promoting your listing', read: '3 min read',
        summary: 'Get seen by more of the right guests.',
        body: [
          'Keep your calendar open and prices competitive — both lift you in search.',
          'Refresh your cover photo seasonally; a strong first image drives most of your clicks.',
          'Earn reviews fast in your first month — listings with reviews convert far better.',
          'Offer a first-booking or weekly discount to kick-start momentum.',
        ],
      },
      {
        id: 'editing', title: 'Editing your listing (what’s fixed)', read: '3 min read',
        summary: 'Almost everything is editable — two things aren’t.',
        body: [
          'Editable anytime: title, photos, videos, description, price, amenities, house rules, availability and booking settings.',
          'Fixed: the listing’s address. Location is locked once created, because it’s tied to verification and guest trust. To move, create a new listing.',
          'Fixed: your verified legal identity. Your public profile (name shown, bio, photo) stays editable.',
          'Changes go live immediately and apply to new bookings, not ones already confirmed.',
        ],
      },
    ],
  },

  // 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'calendar', title: 'Calendar & bookings', icon: 'calendar-outline',
    image: img('photo-1506784983877-45594efa4cbe'),
    blurb: 'Manage availability, enquiries and offers.',
    articles: [
      {
        id: 'enquiries', title: 'Booking enquiries & requests', read: '3 min read',
        summary: 'Answer questions and approve requests well.',
        body: [
          'Enquiries are questions before booking — reply promptly and warmly to build trust.',
          'Requests to book need your decision within 24 hours, or they expire. Accept or decline from Reservations or Today.',
          'Read the guest’s message and profile, check your house rules fit, then respond.',
          'Declining is fine when it’s a poor fit — just do it politely and quickly.',
        ],
      },
      {
        id: 'requirements', title: 'Your booking requirements', read: '2 min read',
        summary: 'Set the bar guests must meet to book.',
        body: [
          'Require a verified identity and a profile photo for added confidence.',
          'Set minimum and maximum nights, and guest count limits that fit your space.',
          'Add clear house rules — quiet hours, parties, smoking, pets — that guests agree to before booking.',
          'These requirements apply automatically to every booking, including Instant Book.',
        ],
      },
      {
        id: 'managing-calendar', title: 'Managing your calendar', read: '3 min read',
        summary: 'Keep dates accurate so you never double-book.',
        body: [
          'Block any dates you’re away or the place is unavailable — tap a date to toggle it.',
          'Confirmed bookings auto-block those nights for you.',
          'Set seasonal pricing by adjusting nightly rates for busy periods.',
          'Review your calendar weekly so availability always reflects reality.',
        ],
      },
      {
        id: 'special-offers', title: 'Special offers & pre-approvals', read: '2 min read',
        summary: 'Nudge an interested guest to book.',
        body: [
          'Send a special offer with a custom price to a guest who enquired — great for longer stays or quiet dates.',
          'Pre-approve a guest so they can book with one tap, no further review.',
          'Offers are time-limited; the guest sees exactly what they’ll pay (your rate + cleaning + taxes).',
        ],
      },
    ],
  },

  // 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'reservations', title: 'Reservations', icon: 'clipboard-outline',
    image: img('photo-1564013799919-ab600027ffc6'),
    blurb: 'From confirmation to checkout.',
    articles: [
      {
        id: 'how-reservations-work', title: 'How reservations work', read: '3 min read',
        summary: 'The journey from request to completed stay.',
        body: [
          'A booking becomes confirmed via Instant Book or when you accept a request.',
          'Before arrival, send check-in details: address, access code, parking and Wi-Fi (use Check-in prep on the reservation).',
          'During the stay, stay reachable for questions.',
          'At checkout, use the Checkout flow to inspect, optionally report damage, and mark the stay completed.',
          'Your payout is released 24 hours after check-in to your default payout method.',
        ],
      },
      {
        id: 'cancellations', title: 'Cancellations', read: '3 min read',
        summary: 'Host and guest cancellations explained.',
        body: [
          'Your cancellation policy (flexible, moderate or strict) decides what a guest is refunded when they cancel.',
          'Avoid cancelling on a guest — it harms their trip and your standing. Use it only for genuine emergencies.',
          'If you must cancel, message the guest first and help them rebook where you can.',
          'Choose a policy that matches your risk: flexible fills more nights; strict protects against last-minute gaps.',
        ],
      },
      {
        id: 'changes', title: 'Changes to a reservation', read: '2 min read',
        summary: 'Adjusting dates, guests or price.',
        body: [
          'Either side can propose a change to dates or guest count; both must agree before it takes effect.',
          'Price changes from a date change are recalculated automatically — you still keep 100% (StayOn takes 0%).',
          'Confirm the new details in the app, never just verbally, so everything stays recorded.',
        ],
      },
      {
        id: 'refunds', title: 'Refunds & reimbursements', read: '3 min read',
        summary: 'How money moves when something changes.',
        body: [
          'Refunds to guests follow your cancellation policy and any agreed adjustments.',
          'For damage, document it at checkout with photos and a note. Since StayOn takes 0%, any agreed reimbursement is settled directly between you and the guest.',
          'Keep all communication and money on StayOn so there’s a clear record if a dispute arises.',
        ],
      },
      {
        id: 'issues', title: 'Issues with a reservation', read: '2 min read',
        summary: 'When a stay doesn’t go to plan.',
        body: [
          'Talk to the guest first — most issues resolve with a quick, calm message.',
          'Document anything important (photos, timestamps) inside the app.',
          'If you can’t resolve it together, contact StayOn support from Help & support.',
        ],
      },
      {
        id: 'messaging', title: 'Messaging your guests', read: '2 min read',
        summary: 'Clear, on-platform communication.',
        body: [
          'Reply fast — quick responses before booking lift your response rate and bookings.',
          'Send a friendly check-in message the day before with everything they need to arrive.',
          'Keep all messages on StayOn; off-platform chats lose you protection and a record.',
        ],
      },
    ],
  },

  // 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'payouts', title: 'Payouts & taxes', icon: 'cash-outline',
    image: img('photo-1554224155-6726b3ff858f'),
    blurb: 'Getting paid — and keeping 100%.',
    articles: [
      {
        id: 'how-payouts-work', title: 'How payouts work', read: '3 min read',
        summary: 'When and how you get paid.',
        body: [
          'Add a payout method first (Profile → Payout method): bank, UPI or PayPal.',
          'Your payout is released about 24 hours after the guest checks in.',
          'You keep 100%: nightly rate × nights + cleaning fee. StayOn charges no platform fee to hosts or guests.',
          'Only government taxes are added on top for the guest and passed straight through — they’re never your earnings or your cost.',
          'Track it all under Earnings → Monthly earnings, month by month since you started.',
        ],
      },
      {
        id: 'payout-method', title: 'Setting up your payout method', read: '2 min read',
        summary: 'Choose how the money reaches you.',
        body: [
          'Bank account: direct deposit — add account number and IFSC/routing code.',
          'UPI: instant transfer to your UPI ID.',
          'PayPal: paid into your PayPal balance.',
          'Your default method receives all payouts; you can replace or remove it anytime.',
        ],
      },
      {
        id: 'taxes', title: 'Taxes for hosts', read: '3 min read',
        summary: 'What you’re responsible for.',
        body: [
          'Hosting income may be taxable where you live — keep your own records of earnings.',
          'Use Earnings → Monthly earnings to see totals per month for your filings.',
          'Any tax shown to the guest at booking is a pass-through (e.g. local occupancy tax), separate from your payout.',
          'StayOn doesn’t take a cut, so your taxable income is simply your payouts. Consult a local tax professional for specifics.',
        ],
      },
    ],
  },

  // 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'reviews', title: 'Reviews', icon: 'star-outline',
    image: img('photo-1556742049-0cfed4f6a45d'),
    blurb: 'Earn great reviews and review your guests.',
    articles: [
      {
        id: 'review-basics', title: 'Review basics', read: '2 min read',
        summary: 'How reviews work for everyone.',
        body: [
          'After checkout, both host and guest can leave a review within the review window.',
          'Reviews appear once both sides submit, or when the window closes — so neither can react to the other first.',
          'They’re public and permanent, so keep them honest and specific.',
        ],
      },
      {
        id: 'understanding-reviews', title: 'Understanding reviews as a host', read: '3 min read',
        summary: 'What guests rate and how to improve.',
        body: [
          'Guests rate overall plus cleanliness, accuracy, check-in, communication, location and value.',
          'Accuracy and cleanliness are the most common reasons for less-than-five stars — nail those first.',
          'Read every review for patterns; one comment is feedback, three is a to-do.',
          'A warm, professional reply to a review shows future guests how you handle things.',
        ],
      },
      {
        id: 'reviewing-guests', title: 'Reviewing your guest', read: '2 min read',
        summary: 'Help the whole community.',
        body: [
          'Rate communication, cleanliness and whether house rules were followed, then say if you’d host them again.',
          'Be fair and factual — your review helps other hosts decide.',
          'Leave it soon after checkout while details are fresh (Reservations → completed stay → Review guest).',
        ],
      },
      {
        id: 'after-review', title: 'After a review is submitted', read: '1 min read',
        summary: 'What you can and can’t change.',
        body: [
          'Once both reviews post, they’re public. You can usually add a response but not edit the rating.',
          'If a review breaks the content rules (e.g. abusive or irrelevant), report it to support.',
        ],
      },
    ],
  },

  // 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'safety', title: 'Safety & trust', icon: 'shield-checkmark-outline',
    image: img('photo-1558002038-1055907df827'),
    blurb: 'Protect your home, guests and yourself.',
    articles: [
      {
        id: 'safety-tips', title: 'Safety tips & guidelines', read: '3 min read',
        summary: 'The essentials for a safe home.',
        body: [
          'Fit and test smoke and carbon-monoxide alarms, and list them under safety so guests know.',
          'Provide a fire extinguisher and a basic first-aid kit, and mark exits clearly.',
          'Keep walkways, stairs and outdoor areas well lit and free of hazards.',
          'Leave emergency contacts and the nearest hospital in your house guide.',
        ],
      },
      {
        id: 'disclosures', title: 'What to disclose', read: '2 min read',
        summary: 'Be upfront — surprises break trust.',
        body: [
          'Disclose stairs, pools, pets, weapons stored on-site, or anything that affects safety or comfort.',
          'Declare any security cameras and where they are. Cameras are never allowed in bedrooms or bathrooms.',
          'Note shared spaces or other people who may be present during the stay.',
        ],
      },
      {
        id: 'reporting', title: 'Reporting issues', read: '2 min read',
        summary: 'When you need help.',
        body: [
          'For an urgent safety threat, contact local emergency services first.',
          'Report safety concerns, harassment or policy violations to StayOn support from Help & support.',
          'Keep evidence in-app (messages, photos) so the team can act quickly.',
        ],
      },
      {
        id: 'accessibility', title: 'Accessibility & inclusion', read: '2 min read',
        summary: 'Welcome more guests.',
        body: [
          'Describe accessibility features honestly — step-free entry, grab rails, lift access — and add clear photos.',
          'Never decline a guest for who they are; host inclusively and within the rules.',
          'Accurate accessibility info helps the right guests book with confidence.',
        ],
      },
    ],
  },

  // 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'account', title: 'Your account', icon: 'person-circle-outline',
    image: img('photo-1633265486064-086b219458ec'),
    blurb: 'Security, identity and profile.',
    articles: [
      {
        id: 'account-security', title: 'Account security', read: '2 min read',
        summary: 'Keep your account safe.',
        body: [
          'Use a strong, unique password and never share your login.',
          'Keep all communication and payments on StayOn — be wary of anyone asking you to move off-platform.',
          'If anything looks off, change your password and contact support.',
        ],
      },
      {
        id: 'identity-verification', title: 'Identity verification', read: '3 min read',
        summary: 'Verify once — it’s then locked.',
        body: [
          'You submit your legal name, date of birth and a government ID once, under Profile → Identity & verification.',
          'After it’s approved, your legal identity is locked and can’t be edited — this protects guest trust.',
          'Your documents are encrypted and never shared with guests.',
          'Your public profile (display name, bio, photo) stays editable separately.',
        ],
      },
      {
        id: 'managing-account', title: 'Managing your account & profile', read: '2 min read',
        summary: 'What you can change anytime.',
        body: [
          'Edit your public profile — photo, bio, languages — to help guests get to know you.',
          'Update notification and dark-mode preferences in Profile.',
          'Manage your payout method and listings from the same place.',
        ],
      },
    ],
  },

  // 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'regulations', title: 'Rules & regulations', icon: 'document-text-outline',
    image: img('photo-1450101499163-c8848c66ca85'),
    blurb: 'Hosting responsibly where you live.',
    articles: [
      {
        id: 'local-rules', title: 'Understanding local rules', read: '3 min read',
        summary: 'Short-term rental laws vary by place.',
        body: [
          'Many cities require registration, permits or limits on short-term rentals — check your local council before hosting.',
          'You may need to collect or remit a local occupancy/tourist tax; in StayOn this is shown to the guest as a pass-through.',
          'Check building, society or HOA rules and any landlord agreement before listing.',
          'Regulations differ across Asia-Pacific, Europe, the Americas and Africa — always follow the rules where your property is.',
          'Hosting legally protects you, your guests and your earnings.',
        ],
      },
    ],
  },
];

// Flattened article index for search.
export interface FlatArticle extends Article { category: string; categoryIcon: string; categoryImage: string; }
export const ALL_ARTICLES: FlatArticle[] = RESOURCE_CATEGORIES.flatMap((c) =>
  c.articles.map((a) => ({ ...a, category: c.title, categoryIcon: c.icon, categoryImage: c.image }))
);
