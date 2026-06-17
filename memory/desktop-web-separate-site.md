---
name: card-design-lives-in-apps
description: StayOn premium card/visual polish goes into the user & host Expo apps, not a separate website
metadata:
  type: project
---

The user wants Airbnb-grade visual polish (rounded framed images, clean alignment, premium type) applied **inside the existing `user/` (guest+host) and `host/` Expo apps** — NOT in a separate website, and NOT as a desktop-responsive rework.

History (2026-06-16): I first proposed a desktop max-width frame (rejected), then scaffolded a separate `website/` (Vite) — the user rejected that too: "i need on the user app and host app not on website." A `website/` folder may still exist in the repo from that detour; treat it as abandoned unless the user revisits it.

**Key design note — the "frame-on-frame" complaint:** the guest `user/src/components/PropertyCard.tsx` used to wrap its rounded image in an outer card (background + padding + shadow), so a rounded frame sat inside another frame. Airbnb uses a single clean rounded image with text directly beneath, a borderless heart, and a hairline image edge. Fixed PropertyCard to that. The host `ListingCard` (both `user/src/host/` and `host/`) is a different overlay-style single-frame card and was left as-is.

**How to apply:** Keep premium UI work in the apps' components. Match Airbnb's clean aesthetic: one rounded image as the frame, no nested card chrome, tight type, borderless heart with soft shadow.
