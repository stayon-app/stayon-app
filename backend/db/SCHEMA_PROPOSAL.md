# StayOn — Data Model Proposal (v2)

> Proposed normalized schema for **accounts, login, verification, and every
> per-user dedicated space** the user app + website display. Grounded in the
> current live tables. **Nothing here is applied yet** — review, mark changes,
> then it becomes one migration (`db/migration-013-accounts-v2.sql`).
>
> Design goals: 3NF (no duplicated data), one human = one identity, stable
> relational keys, clear names a new dev instantly understands, and a clean
> separation of *how you log in* vs *who you are* vs *what you own/do*.

---

## 0. Two decisions to confirm first

### (a) IDs — SOU / SOH as human-readable CODES, not primary keys
A person can be **both** a guest and a host (same login). So we should NOT make
the primary key `SOU…`/`SOH…` (a person would need two PKs — breaks relationships).

**Recommended:** every table keeps a stable internal **`id uuid`** primary key
(used for all foreign keys), PLUS human-readable reference codes on the account:
- `user_code`  → **`SOU-XXXXXXXX`** — assigned to every account at signup
- `host_code`  → **`SOH-XXXXXXXX`** — assigned the first time they list a place

These codes are what you show in support, receipts, and dashboards ("user
SOU-4F9K2A1B"). UUIDs stay invisible and keep the database correct. This gives
you exactly the SOU/SOH scheme without breaking one-person-one-identity.

### (b) Split "login" from "identity" from "profile" (normalization)
Today `users` mixes auth (phone/clerk_id), display (name/avatar), and payout
flags in one table. We separate them so each fact lives in exactly one place:
- **accounts** = the identity anchor (one per human)
- **auth_methods** = every way that human can log in (phone / Google / Apple / email)
- **profiles** = editable display/personal info
- **verifications** = legal KYC (locked once approved)

---

## 1. IDENTITY & LOGIN LAYER

### `accounts` — one row per human (the anchor everything hangs off)
| field | type | notes |
|---|---|---|
| `id` | uuid PK | internal key for all FKs |
| `user_code` | text unique | **SOU-XXXXXXXX** (always) |
| `host_code` | text unique null | **SOH-XXXXXXXX** (set on first listing) |
| `is_host` | bool | true once they publish a listing |
| `status` | enum | `active` / `suspended` / `deleted` |
| `verify_state` | enum | `unverified` / `contact_verified` / `id_verified` (derived, cached) |
| `created_at` / `updated_at` | timestamptz | |

*Used for:* the single identity per person. **Connects to:** everything below via
`account_id`. Replaces the identity part of today's `users`.

### `auth_methods` — every login method (normalized; "phone OR Gmail OR Apple")
| field | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK → accounts | |
| `kind` | enum | `phone` / `email` / `google` / `apple` |
| `identifier` | text | the phone number / email / provider subject |
| `provider_ref` | text null | Clerk id / Google sub / Apple sub |
| `verified` | bool | **phone & email each verified independently** |
| `verified_at` | timestamptz null | |
| `is_primary` | bool | the main login |
| `created_at` | timestamptz | |
| — | | **unique(kind, identifier)** → one phone/email can't map to two people |

*Used for:* "login might be done with phone number or Gmail or Apple." Each
method carries its own `verified` flag. **Rule:** an account is
`contact_verified` when it has ≥1 verified `phone` AND ≥1 verified `email`.
**Connects to:** `accounts`. Feeds `accounts.verify_state`.

### `otp_codes` — phone/email OTP challenges (keep, minor)
`id` · `account_id` FK · `auth_method_id` FK · `channel`(phone/email) · `code` ·
`expires_at` · `used` · `attempts` · `created_at`
*Used for:* OTP send/verify, expiry, re-generate on logout, anti-fraud attempts.

### `refresh_tokens` — "stay logged in" per device (keep)
`id` · `account_id` FK · `token` · `device_label` · `expires_at` · `revoked` · `created_at`
*Used for:* keeping a device signed in; logout/uninstall/new-phone ⇒ no token ⇒
re-verify. This IS the "same phone = no re-login; new phone = must verify" logic.

---

## 2. PROFILE & VERIFICATION LAYER

### `profiles` — editable personal / display info
| field | type | notes |
|---|---|---|
| `account_id` | uuid PK/FK → accounts | 1:1 |
| `first_name` / `last_name` | text | |
| `display_name` | text | |
| `gender` | enum null | `male`/`female`/`other`/`prefer_not` |
| `dob` | date null | |
| `avatar_url` | text null | Storage URL |
| `bio` | text null | |
| `city` / `country_code` | text | |
| `languages` | text[] | |
| `updated_at` | timestamptz | |

*Used for:* the editable "Personal info" screen. **Connects to:** `accounts`.
Kept separate from `verifications` so display edits never touch verified legal data.

### `verifications` — KYC (renamed from `identities`; LOCKED once approved)
| field | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK → accounts | |
| `legal_first_name` / `legal_last_name` | text | from the ID document |
| `dob` | date | |
| `gender` | enum | |
| `id_type` | enum | `passport`/`aadhaar`/`driving_licence`/`national_id` |
| `id_number_enc` | text | **encrypted** full number |
| `id_last4` | text | for display |
| `id_hash` | text | dedupe / uniqueness (one ID = one account) |
| `id_doc_front_url` | text | Storage |
| `id_doc_back_url` | text null | Storage |
| `selfie_url` | text | Storage — the required selfie |
| `status` | enum | `pending`/`approved`/`rejected` |
| `locked` | bool | **true once approved → not editable** |
| `provider` / `provider_ref` | text | KYC vendor |
| `submitted_at` / `reviewed_by` / `reviewed_at` | | ops trail |
| — | | **unique(id_hash)** → same document can't verify two accounts |

*Used for:* name/last-name/DOB/gender + ID type + full ID number + document
photos + selfie — all viewable in the app but stored here (images in Storage,
URLs here). `locked` enforces "once approved, cannot edit." **Connects to:**
`accounts`. Together with `auth_methods`, sets `accounts.verify_state=id_verified`.

> **Booking gate:** a stay can only be booked when
> `accounts.verify_state = 'id_verified'` (contact verified **and** KYC approved).
> Enforced server-side in `POST /bookings`.

---

## 3. PER-USER DEDICATED SPACES (what the app shows)

### `user_settings` — **NEW** (currently only device-local, doesn't sync)
`account_id` PK/FK · `language` · `currency` · `notif_push` · `notif_email` ·
`notif_sms` · `privacy` jsonb · `accessibility` jsonb · `updated_at`
*Used for:* Settings / Language & currency / Notifications / Privacy /
Accessibility screens — synced across devices. **Connects to:** `accounts`.

### `wishlists` — saved stays (keep; make single source of truth)
`id` · `account_id` FK · `listing_id` FK → listings · `created_at` ·
**unique(account_id, listing_id)**
*Used for:* Wishlist screen. **Fix:** website must write here too (today it uses
localStorage). **Connects to:** `accounts`, `listings`.

### `bookings` — TRIPS (keep; slim — payment fields move out, see §4)
`id` · `code`(STY-XXXXXX confirmation) · `listing_id` FK · `guest_id` FK →
accounts · `host_id` FK → accounts · `check_in` · `check_out` · `nights` ·
`guests` · `subtotal_usd` · `cleaning_usd` · `discount_usd` · `promo_code` ·
`taxes_usd` · `total_usd` · `status`(pending/confirmed/completed/cancelled) ·
`cancel_reason` · `created_at`
*Used for:* Trips (upcoming/completed/cancelled derive from `status` + dates) and
receipts (`code`). **Connects to:** `listings`, `accounts` (guest & host),
`payments`, `reviews`, `threads`.

### `reservations` — host's mirror of the same booking (keep)
`id` · `code`(same as booking) · `listing_id` · `host_id` FK · `guest_id` FK ·
`check_in/out` · `nights` · `rate_usd` · `status` · `instant` · `created_at`
*Used for:* host "Reservations" screen. **Kept in sync** with `bookings` by `code`.
*(Normalization note: this duplicates booking data for the host view; acceptable
for read-speed, but could become a VIEW over `bookings` later.)*

### `threads` + `messages` — chats with host (keep)
threads: `id` · `booking_id` FK null · `listing_id` FK · `guest_id` FK ·
`host_id` FK · `last_at` · `created_at`
messages: `id` · `thread_id` FK · `sender_id` FK → accounts · `text` ·
`attachments` jsonb null · `read` · `created_at`
*Used for:* Messages/Chat screens. **Connects to:** `accounts`, `listings`,
`bookings`.

### `notifications` — (keep)
`id` · `account_id` FK · `type` · `payload` jsonb · `read` · `created_at`
*Used for:* Notification center. **Connects to:** `accounts`.

### `reviews` — (keep)
`id` · `booking_id` FK · `listing_id` FK · `author_id` FK → accounts ·
`direction`(guest_to_host/host_to_guest) · `rating` · `text` · `response` ·
`removed` · `created_at`
*Used for:* Write/Read review; drives `listings.rating_avg/count`.
**Connects to:** `bookings`, `listings`, `accounts`.

---

## 4. MONEY LAYER (normalize payments OUT of bookings)

### `payment_methods` — **NEW** (guest saved cards — the gap)
`id` · `account_id` FK · `kind`(card/upi/wallet) · `brand` · `masked_last4` ·
`provider_ref`(gateway token) · `is_default` · `created_at`
*Used for:* Payment methods screen. **Never stores raw card data** — only masked
+ gateway token. **Connects to:** `accounts`, `payments`.

### `payments` — **NEW** (one row per money movement; today it's stuffed in `bookings`)
`id` · `booking_id` FK · `account_id` FK → accounts · `kind`(charge/refund/payout) ·
`amount_usd` · `currency` · `provider`(stripe/razorpay/sim) · `provider_intent_id` ·
`provider_transfer_id` · `payment_method_id` FK null · `status`(held/captured/refunded/failed) ·
`created_at`
*Used for:* Trip spending, receipts, host payouts — each is a payment row.
**Connects to:** `bookings`, `accounts`, `payment_methods`.
*(Removes `payment_intent_id/payment_status/transfer_id/payout_*` from `bookings`.)*

### `receipts` — issued receipts (thin; mostly derivable)
`id` · `booking_id` FK · `number`(RCPT-XXXX) · `issued_at` · `pdf_url` null
*Used for:* downloadable receipt per booking. **Connects to:** `bookings`,
`payments`. *(Optional — a VIEW over booking+payments can serve most needs.)*

### Host payout (keep as-is)
`payout_methods` / `bank_accounts` — `host_id` FK → accounts. Host-only.

---

## 5. LISTING LAYER (host side; unchanged, FKs tightened)
`listings` — `host_id` FK → accounts, all property fields, `status`
(`draft`/`pending_review`/`published`), `rating_avg/count`, `extra` jsonb.
`calendar` — `listing_id` FK, `day`, `blocked`, `price_usd` (host date-blocking).

---

## 6. Relationship map (who points to whom)

```
accounts (1) ──< auth_methods            (login methods)
accounts (1) ──< otp_codes / refresh_tokens
accounts (1) ──1 profiles                (personal info)
accounts (1) ──< verifications           (KYC, locked)
accounts (1) ──1 user_settings           (prefs)
accounts (1) ──< wishlists >── (n) listings
accounts (1 as guest_id) ──< bookings >── (1) listings
accounts (1 as host_id)  ──< listings ──< calendar
bookings (1) ──< payments >── payment_methods
bookings (1) ──1 receipts
bookings (1) ──< reviews
bookings (1) ──1 threads ──< messages
accounts (1) ──< notifications
accounts (as host) ──< payout_methods / bank_accounts
```

Every arrow is a foreign key on the **child** table → parent's `id` (uuid).
`ON DELETE`: restrict for money/bookings; cascade for wishlists/settings/tokens.

---

## 7. Naming conventions (so any dev reads it instantly)
- snake_case columns; `*_id` = a foreign key; `*_at` = timestamptz; `*_url` =
  Storage link; `*_usd` = money in USD; `is_*`/`*_verified`/`locked` = booleans.
- One fact, one column, one table (no duplicated user name across tables — it
  lives in `profiles`; `bookings.guest_name` etc. become optional denormalized
  snapshots only if we keep them for history).
- Enums for fixed sets (`status`, `kind`, `direction`) — not free text.

## 8. What changes vs today (summary)
| Change | Type |
|---|---|
| Split `users` → `accounts` + `auth_methods` + `profiles` | restructure |
| Add `user_code` (SOU) / `host_code` (SOH) | add |
| Rename `identities` → `verifications`; add `gender`, `selfie_url`, `id_doc_*`, `locked` | modify |
| Add `user_settings` | new |
| Add `payment_methods` | new |
| Add `payments` (move payment fields out of `bookings`) | new + slim |
| Add `receipts` (optional) | new |
| Make `wishlists` the single source (website writes here) | wiring |
| Tighten all FKs + enums; add SOU/SOH generators | integrity |

## 9. What the backend must wire after the migration
- `auth.js`: issue `user_code` on signup; `host_code` on first listing; write
  `auth_methods` rows; set `verify_state`.
- `bookings.js`: **gate on `verify_state = id_verified`**; write `payments` rows.
- New routes: `GET/PUT /me/settings`, `GET/POST/DELETE /me/payment-methods`,
  `GET /bookings/:code/receipt`.
- User app + website: read settings/payment-methods/wishlist from backend
  (not local), so every device + both surfaces agree.

---
*Proposal only — awaiting your edits before it becomes migration-013.*
