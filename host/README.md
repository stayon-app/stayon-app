# StayOn — Host App

This folder holds **everything for the host side** of StayOn (the app hosts use to
list properties, manage reservations, message guests, handle check‑in/checkout, get
paid, and review guests).

It's a sibling of the guest app at `d:/Stayon/user`.

## Start here
- **[HOST_REQUIREMENTS.md](./HOST_REQUIREMENTS.md)** — *what to build.* The complete
  spec derived by reading the entire guest app line by line: listing data model, full
  booking lifecycle (request → confirm → check‑in → checkout → host reviews the guest),
  messaging/reviews/notifications/support, payouts, the advisory **Host Assistant (AI)**,
  what code to reuse, the host navigation/screen list, and build order.
- **[HOST_PLAN.md](./HOST_PLAN.md)** — *how we build.* Design approach + build
  milestones (M0 scaffold → M10 polish), what's reused vs new, definition of done.
- **[HOST_DESIGN.md](./HOST_DESIGN.md)** — *how it looks.* Full visual + UX + analytics
  design spec: the **StayOn Host splash**, typography, colour, layout, buttons, icons,
  spacing, accessibility, micro‑interactions, and every analytics chart/dashboard.

## Status
Requirements captured. The host app (`src/…`, `App.tsx`, `index.ts`) will be built
here, mirroring the guest app's structure and reusing its design system, contexts and
shared primitives.

## Conventions (same as the guest app)
- Dark mode via `useTheme()` + `makeStyles(colors)` — never hardcode colors.
- **Ionicons only, no emojis.**
- Prices authored in **USD**, rendered with `useCurrency().format()`.
- 4px spacing grid + type tokens; one `STAYON_GRADIENT` CTA per screen.
- `npx tsc --noEmit` stays clean.
