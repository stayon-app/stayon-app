# StayOn — Production / Go-Live Roadmap

Honest status of each engineering domain, what's missing, and the concrete steps to
reach industrial, worldwide scale. Legend: ✅ done · 🟡 prototype/partial · ❌ not started.

> Reality check: a globally-live, "perfectly working" Airbnb-class platform is a
> **multi-team, ongoing effort**, not a one-shot build. The product surfaces (web,
> user app, host app, Ops) and the API are built. The items below are what turn a
> working prototype into a hardened, scalable, compliant live service.

---

## What was hardened in this pass (✅ shipped)
- **CI pipeline** (`.github/workflows/ci.yml`) — every push typechecks + builds website, typechecks both apps, syntax-checks the backend, runs a **dependency audit** (matrix over all 4 packages), and **builds the backend Docker image**.
- **Backend hardening** (no new deps): security headers, per-IP rate limiting (429s), structured JSON request logs + latency metric, 404 + central error handler, **graceful shutdown** (SIGTERM/SIGINT) for clean rolling deploys, `unhandledRejection` safety, `/health` probe.
- **Containerization**: `backend/Dockerfile` (+ `.dockerignore`) — production image with a `HEALTHCHECK`, ready to deploy to any container host.
- **Dependency scanning**: `.github/dependabot.yml` — weekly npm + GitHub-Actions update PRs across all packages.
- **GDPR / CCPA**: `GET /v1/me/export` (data portability, ID docs excluded) and `POST /v1/me/delete` (right to erasure — PII + identity removed, financial records de-identified).

---

## 1. Backend Engineering — 🟡 → needs scale work
**Have:** full Express API (auth, listings, search, booking engine, reservations, messaging, reviews, KYC, payments, payouts, Ops), Supabase/Postgres, now rate-limited + logged + graceful shutdown.
**Missing for scale:** it's a **single monolith**; no caching layer; no connection pooling tuning; no load balancing.
**Do:** put it behind a load balancer with ≥2 instances; add **Redis** (shared rate-limit + cache for hot reads like search/listing); move the in-memory rate limiter to Redis; add DB indexes for search columns; consider extracting payments + search into separate services only when traffic demands it.

## 2. Frontend Engineering — ✅ solid
**Have:** React+TS website, RN/Expo apps, responsive phone→TV, fail-safe API wiring, live/offline pill.
**Do:** formal **WCAG** accessibility audit (focus states, aria, contrast); add error boundaries + a crash reporter (Sentry); bundle-split the website; lighthouse budget in CI.

## 3. Infrastructure & Platform — ❌ → start here for "live"
**Have:** `render.yaml`, Supabase, CI typecheck/build.
**Do:** containerize the backend (**Dockerfile**); deploy via Render/Fly/AWS ECS with autoscaling; add **CD** (deploy job after CI on `main`); managed Postgres with read replicas; CDN for the website + media; **observability** (metrics → Grafana, logs → Loki/Datadog, traces → OpenTelemetry); uptime alerts; staging environment.

## 4. Data Engineering — ❌
**Have:** operational Postgres + `audit_log`.
**Do:** stream events (bookings, searches, views) to a warehouse (BigQuery/Snowflake) via **Kafka/Kinesis**; build **ETL** (dbt/Spark) for analytics + personalization features; data-quality checks; PII governance/retention policies.

## 5. Payments Engineering — 🟡
**Have:** `payments.js` with intent/escrow/refund + pluggable provider, 0% fee model, FX conversion.
**Do:** integrate a **real provider** (Stripe Connect for host payouts + escrow); **PCI DSS** scope reduction (never touch raw card data — use provider tokens/elements); idempotency keys on charge/refund; webhook handlers for async payment events; reconciliation jobs; multi-currency settlement.

## 6. Trust & Safety — 🟡
**Have:** identity/KYC with one-person-one-account dedup + doc storage + Ops review queue; reports/moderation; contact-share block in chat.
**Do:** integrate a real **ID-verification API** (Onfido/Persona/HyperVerge — `KYC_PROVIDER` hook already exists); **risk scoring** on bookings; background-check partners where legally required; device fingerprinting; an emergency/safety escalation path.

## 7. Search & Discovery — 🟡
**Have:** SQL search (location/price/amenities/dates/geo-radius).
**Do:** move to a search engine (**OpenSearch/Elasticsearch/Typesense**) for relevance + speed at scale; **ranking model** (personalization, quality, fairness across hosts); A/B-test ranking changes; typeahead.

## 8. Security Engineering — 🟡
**Have:** JWT auth, salted identity hash, TOTP/2FA, audit log, security headers, rate limiting, encryption-at-rest (Supabase).
**Do:** rotate secrets via a vault; **pen-testing** + a bug-bounty; WAF; real-time breach monitoring/SIEM; dependency scanning (Dependabot/Snyk) in CI; **GDPR/CCPA** data-export + delete endpoints; secure-coding review gates.

## 9. Data Science & AI — 🟡
**Have:** AI listing-photo classification (Gemini/Claude vision), in-app assistant bots.
**Do:** **dynamic pricing** + **demand forecasting** (time-series); **fraud-detection** models; recommendation system feeding Search; a feature store + model serving + monitoring (drift).

## 10. Operations Tech — ✅ strong
**Have:** full Ops portal (listing/KYC/reel moderation, refunds, force-cancel, suspend/ban, payout approvals, reports/disputes, audit, dashboard) + Ops modules; host tools (listings/calendar/pricing).
**Do:** SLA-driven support ticketing; workflow automation (e.g. auto-route disputes); role/permission audit; regional compliance rule engine.

---

## Suggested order to actually go live
1. **Infra first** — Dockerize backend, deploy to a cloud host with autoscaling + managed Postgres, add CD + observability + a staging env. (Without this, nothing else is "live".)
2. **Payments real** — Stripe Connect + webhooks + reconciliation (you can't take real money without this).
3. **Trust & Safety real** — wire a KYC provider + risk scoring (legal requirement in most markets).
4. **Security pass** — secrets vault, dependency scanning in CI, GDPR export/delete, pen-test.
5. **Search engine + ranking**, then **Data pipeline**, then **DS/AI models** (each builds on real traffic/data).

Each of these is a workstream a focused engineer/team can pick up; the code foundations
(API, Ops, payments hook, KYC hook, CI, hardening) are already in place to build on.
