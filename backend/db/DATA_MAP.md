# StayOn — Data Map (tables → app screens)

> **Current live schema** (what exists and runs today), mapped to the screen/
> surface that shows it, what each field stores, and how tables connect. This is
> the "which table feeds which screen" reference. For the *proposed* normalized
> redesign (accounts split, SOU/SOH codes, payments/settings tables), see
> `SCHEMA_PROPOSAL.md` — that is NOT applied yet.
>
> ✅ Verified end-to-end on the live database — see §E2E at the bottom.

Legend:  📱 user app · 🖥️ website · 🏠 host app/site · ⚙️ ops

---

## IDENTITY & LOGIN

### `users` — the account (one per human; guest + host are the same row)
`id` · `phone` · `email` · `clerk_id` · `name` · `avatar_url` · `country_code` ·
`status` · `push_token` · `payout_account_id` · `payouts_enabled` · `created_at`
- **Stores:** who you are + the keys every login maps to (phone→OTP, email/clerk_id→Google/Apple via Clerk).
- **Feeds:** 📱 Profile / View profile · 🖥️ header avatar / `UserButton`.
- **Connects to:** *everything* (it's the parent). `bookings.guest_id`, `listings.host_id`, `wishlists.user_id`, etc. all point here.

### `otp_codes` — the OTP challenge
`id` · `user_id` · `phone` · `code` · `expires_at` · `used` · `attempts` · `created_at`
- **Stores:** the 6-digit code, expiry, whether used, attempt count.
- **Feeds:** 📱 OTP screen (send/verify), "regenerate on logout / new phone".
- **Connects to:** `users`.

### `refresh_tokens` — "stay logged in" per device
`id` · `user_id` · `token` · `expires_at` · `revoked` · `created_at`
- **Stores:** the device session. Present → no re-login; `revoked`/absent → must verify (logout, uninstall, new phone).
- **Connects to:** `users`.

### `identities` — verification / KYC
`user_id` · `legal_name` · `dob` · `id_type` · `id_last4` · `id_hash` · `docs`(jsonb: front/back/**selfie** URLs) · `provider` · `provider_ref` · `status` · `submitted_at` · `reviewed_by` · `reviewed_at`
- **Stores:** legal name, DOB, ID type, ID last-4 (+ hash for one-ID-one-account), document photos and the **selfie** (images in Storage, URLs here), review status.
- **Feeds:** 📱 Identity verification screen · ⚙️ KYC review queue.
- **Rule:** `id_hash` unique → same document can't verify two accounts. `status='approved'` is the "verified" gate.
- **Connects to:** `users`.

---

## PER-USER DEDICATED SPACES

### `wishlists` — saved stays
`id` · `user_id` · `listing_id` · `created_at` · unique(user_id, listing_id)
- **Feeds:** 📱 Wishlist screen · 🖥️ `/saved` *(note: website currently uses localStorage — should write here).* 
- **Connects to:** `users`, `listings`.

### `bookings` — TRIPS + receipts (guest's record)
`id` · `code`(STY-XXXXXX = confirmation id) · `listing_id` · `guest_id` · `host_id` · `check_in/out` · `nights` · `guests` · `subtotal_usd` · `cleaning_usd` · `taxes_usd` · `total_usd` · `status` · `cancel_reason` · `refund_usd` · `payment_intent_id` · `payment_status` · `transfer_id` · `payout_*` · `created_at`
- **Stores:** the booking + money + payment ids + confirmation code.
- **Feeds:** 📱 Trips (upcoming / completed / cancelled = filter on `status`+dates) · Trip spending · Booking confirmation · receipts (`code`).
- **Connects to:** `listings`, `users`(guest+host), `reservations`(by `code`), `reviews`, `threads`.

### `reservations` — host's mirror of the same booking
`id` · `code` · `listing_id` · `host_id` · `guest_id` · `check_in/out` · `nights` · `rate_usd` · `status` · `instant` · `created_at`
- **Feeds:** 🏠 host Reservations (accept/decline/check-in/out).
- **Connects to:** kept in sync with `bookings` by `code`.

### `threads` + `messages` — chats with host
threads: `id` · `listing_id` · `guest_id` · `host_id` · `last_at`
messages: `id` · `thread_id` · `sender` · `text` · `created_at`
- **Feeds:** 📱🏠 Messages / Chat.
- **Connects to:** `users`, `listings`.

### `notifications`
`id` · `user_id` · `type` · `payload`(jsonb) · `read` · `created_at`
- **Feeds:** 📱 Notification center (+ Expo push). **Connects to:** `users`.

### `reviews`
`id` · `booking_id` · `listing_id` · `author_id` · `author_name` · `direction`(guest↔host) · `rating` · `text` · `response` · `removed` · `created_at`
- **Feeds:** 📱 Write/Read review; drives `listings.rating_avg/count`.
- **Connects to:** `bookings`, `listings`, `users`.

---

## LISTING & MONEY (host side)

### `listings` — a property
`id` · `host_id` · title/type/`place_type` · address/city/state/zipcode/lat/lng · guests/bedrooms/beds/bathrooms · `price_usd`/`weekend_price_usd`/`cleaning_fee_usd` · `images[]` · `amenities[]`/`highlights[]`/`vibes[]` · `instant_book` · `status`(draft→pending_review→published) · `rating_avg/count` · `extra`(jsonb)
- **Feeds:** 📱🖥️ search / detail (public shape hides address) · 🏠 host dashboard.
- **Connects to:** `users`(host), `calendar`, `bookings`, `wishlists`, `reviews`.

### `calendar` — availability
`listing_id` · `day` · `price_usd` · `blocked` — host date-blocking; feeds availability.

### `payout_methods` / `bank_accounts` — host payout (host_id → users). 🏠 only.

---

## Relationship map (current)
```
users ─┬─< otp_codes / refresh_tokens / identities / notifications / wishlists
       ├─< bookings (as guest_id)   ─< reviews
       ├─< reservations (as host_id / guest_id)
       ├─< listings (as host_id)    ─< calendar
       └─< payout_methods / bank_accounts (host)
listings ─< wishlists · bookings · reviews · threads
bookings ⇄ reservations (by code) · ─1 threads ─< messages
```
Every child row holds a `*_id` foreign key → `users.id` / `listings.id` / etc.

---

## GAPS (not stored in the DB today → in `SCHEMA_PROPOSAL.md` to add)
- **User settings** (language/currency/notif/privacy/accessibility) — device-local only, no table.
- **Guest saved cards** — no `payment_methods` table (app uses a local mock).
- **Payments** are embedded in `bookings` rather than a normalized `payments` table.
- **Website wishlist** writes to localStorage instead of the `wishlists` table.

---

## §E2E — verified on the LIVE database (test run)
A fresh account was driven through the real HTTP API; each row was read back:

| Step | Endpoint | Table written | Verified retrieve |
|---|---|---|---|
| 1 Sign-up | `POST /auth/send-otp` | `users` + `otp_codes` | user row + code stored ✅ |
| 2 Verify | `POST /auth/verify-otp` | `refresh_tokens` | session stored, JWT issued ✅ |
| 3 Verification | `POST /identity/submit` | `identities` | name+DOB+ID+**selfie**+docs stored, status=pending ✅ |
| 4 Search | `GET /search?q=vijayawada` | (read `listings`) | 1 result returned ✅ |
| 5 Book | `POST /bookings` | `bookings` + `reservations` + `notifications` | code STY-…, total, host mirror, host notified ✅ |
| 6 Confirm | `GET /bookings` | (read `bookings`) | trip retrieved + **address revealed only after booking** ✅ |

**Result:** login → verify → book → confirmation all **push to their dedicated
tables and retrieve back correctly** on the live database. If it goes live, data
stores in exactly these tables.

*Last verified: 2026-07-08.*
