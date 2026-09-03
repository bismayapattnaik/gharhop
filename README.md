# GharHop — prototype

A working prototype of the "Availability OS" concept from the GharHop PRD: a
visit-liquidity marketplace, not another listings feed. This is intentionally
scoped down from the full product spec — see **Scope** below — to prove the
hard mechanics (freshness enforcement, atomic scheduling, no double-booking,
visit lifecycle, reliability signals) end to end before investing in mobile
apps, payments, KYC, and trust tooling.

Scoped to a single controlled-beta locality — **Gurgaon (Gurugram)** — per
the "don't launch across multiple cities" decision. `MICRO_MARKETS` in
`src/lib/geo.ts` is the only place a real deployment would need to touch to
change or add a corridor.

## Run it

```
npm install
npx prisma generate
npx prisma db push
node prisma/seed.mjs   # demo owners, properties, slots
npm run dev
```

Open http://localhost:3000.

### Demo accounts (mock OTP — any phone "logs in", no SMS is sent)

| Role   | Phone        | Notes |
|--------|--------------|-------|
| Owner  | 9800000001   | Priya, PG operator — DLF Cyber City. Has one intentionally stale bed to demo freshness enforcement, plus a seeded active FastFill subscription. |
| Owner  | 9800000002   | Mr. Rao — Golf Course Road flat (approval-required booking) + Sohna Road room (instant booking, seeded with owner-sponsored visits on). |
| Admin  | 0000000000   | Ops console. |
| Seeker | *any number* | First login with a new number creates the account. |

## What's actually implemented (the hard part)

- **Phase 1 monetization** — the rolling visit-access model (7-day free
  window, Rush Credit, MoveNow Pass/Plus/Concierge, owner FastFill/Success
  plans, owner-sponsored visits, verified move-in fees), all backed by real
  `Order`/`Subscription`/`CreditWallet`/`CreditLedgerEntry` rows rather than
  a hardcoded `isPremium` flag — see FEATURES.md section 7 and
  `src/lib/billing.ts`. Payments are mocked, same spirit as the mock OTP
  login below.

- **Freshness TTL** — a listing's `ACTIVE`/`STALE` state is *derived* at read
  time from `lastConfirmedAt`, not stored — so a missed reconfirmation always
  shows correctly, and stale units automatically disappear from seeker
  discovery (`src/lib/freshness.ts`).
- **Atomic slot holds, no double-booking** — every hold/confirm/cancel goes
  through a Prisma transaction that re-checks slot state before committing,
  with idempotency keys so a retried request never creates a duplicate
  booking (`src/lib/scheduling.ts`). Verified live: two seekers racing for the
  same slot — the second gets a 409, not a double booking.
- **Instant vs. approval booking modes** — per listing, matching PRD GH-504.
- **Visit state machine** — REQUESTED → CONFIRMED → CHECKED_IN → COMPLETED,
  plus cancellation/no-show branches that release capacity and adjust the
  seeker's reliability score.
- **Owner tools** — one-tap reconfirm, per-listing booking mode, request
  inbox, performance dashboard against the PRD's own decision-gate
  thresholds (≥60% visit completion, ≥15% serious next-step rate).
- **Three booking modes** — instant confirm, owner-approval, and a
  counter-proposal/reschedule flow (owner proposes a different open slot;
  seeker accepts or declines) — `proposeReschedule`/`acceptReschedule` in
  `src/lib/scheduling.ts`.
- **In-app notification center** — event-triggered notices (requested,
  confirmed, declined, cancelled, reschedule proposed/accepted) via a
  `Notification` model and a bell icon in the top nav. Deliberately does
  *not* cover time-based reminders ("visit in 1 hour") — that needs a
  background scheduler, which this prototype doesn't have.
- **Ops console with real overrides** — stale queue, an all-listings view
  with pause/reactivate/mark-rented, a visit timeline with force-confirm/
  cancel, and trust report intake/action. This is the "minimum admin
  dashboard" — support can unblock a stuck booking without touching the DB.
- **Real demo photos + owner photo upload + room-organized Room Tour** —
  every listing is auto-assigned a real photo set by inventory type
  (`src/lib/photos.ts`, images in `public/photos/`, sourced from
  free-license Unsplash photos) until an owner uploads real ones as the
  *cover* set (`src/app/api/items/[id]/photos/route.ts`, replaces the demo
  set on first upload) and/or organizes real photos into named **rooms**
  ("Living Room", "Bedroom", ...) via `Room`/`RoomPhoto` models and
  `src/app/api/items/[id]/rooms/**` — a listing with no rooms yet falls back
  to its flat cover set as a single unlabeled room. Seekers get a "Room
  Tour": a room-tab bar to switch rooms, prev/next within a room, and
  drag-to-pan on each photo (`components/Panorama360.tsx`). All uploads are
  local-disk (`public/uploads/`), ownership-checked, type/size-validated,
  and cleaned up on delete. Honest framing: this is a drag-to-pan photo
  viewer, not a true equirectangular/spherical or photogrammetry-based 3D
  reconstruction — that's a genuinely hard ML/capture problem
  (Matterport-style), not something to fake.
- **Admin listing verification** — the PRD's own listing lifecycle
  (`DRAFT → PENDING_VERIFICATION → ACTIVE`, or `→ REJECTED` with a reason
  the owner can see and fix before resubmitting). A new/edited listing never
  reaches seeker search until an admin approves it
  (`src/app/api/admin/items/[id]/approve|reject`); rejecting requires a
  reason, both sides get notified. Owner and admin UI updated to only
  expose actions valid for each state (e.g. no pause/rent controls on a
  draft still in review).
- **Real browser geolocation** — a "📍 Use my current location" button calls
  the actual Geolocation API and re-sorts the feed by real distance from the
  device's GPS position (`components/seeker/UseLocationButton.tsx`), falling
  back to the manual micro-market picker on denial/error (PRD GH-201 "denial
  never blocks search"). Explicitly **not** built: scraping competitor
  listings (99acres/Magicbricks/Housing.com/NoBroker) to seed "real" nearby
  inventory — that would violate their terms of service and is explicitly
  against the PRD's own guidance ("do not scrape and republish competitor
  inventory"). Nearby results are only ever GharHop's own listings.

## Scope cuts from the full PRD (deliberate, for a first prototype)

- **Auth**: mock OTP (any phone number), no real SMS/DLT provider.
- **Database**: SQLite file (`prisma/dev.db`), not PostgreSQL/PostGIS. Swap
  the Prisma datasource + `haversineKm` geo helper for real geo queries when
  moving off the prototype.
- **No mobile app** — this is a responsive web app covering both the seeker
  and owner experience, not the Flutter app from the technical blueprint.
- **No real payment gateway, escrow, KYC/identity verification, masked
  calling, or Hop Tour routing** — all P1/P2 in the PRD, and all require
  third-party provider contracts that don't make sense to wire up before
  the core loop is validated. Phase 1 monetization (Rush Credit, MoveNow
  passes, owner FastFill/Success plans, owner-sponsored visits — see
  FEATURES.md section 7) *is* built, but payments are mocked the same way
  auth is mocked: every purchase is a real `Order` + ledger entry
  (`src/lib/billing.ts`), just with no real money moving.
- **No background jobs** — slot-hold expiry is checked lazily on read
  (`releaseIfExpired` in `scheduling.ts`) rather than via a cron worker.
  Fine for a prototype; replace with a real queue before production.
- **Uploads go to local disk, not object storage** — `public/uploads/` works
  fine for `next dev` but isn't durable/scalable; swap for S3-compatible
  storage (per the PRD technical blueprint) before any real deployment. No
  media provenance/verification pipeline (PRD GH-404) either.

## Environment notes

This was built on a machine with no admin rights and a corporate TLS-inspecting
proxy. Node.js and the Prisma engine binaries were installed via portable/
user-scope installs rather than machine-wide MSIs — see the parent
`tools/` directory (outside this repo) for the portable Node install and the
exported CA bundle needed for `npm`/`node` to trust the proxy
(`NODE_EXTRA_CA_CERTS`). If you're on a normal machine, ignore this — plain
`npm install` will work.

Also: `prisma`/`@prisma/client` are pinned to `6.19.3`. Prisma 7 changed the
schema format significantly (no more `url` in `datasource`, driver adapters
required instead) — worth revisiting once that's stable, but not worth
building against a release candidate for a prototype.

## Next steps (in priority order)

1. Run the four-week concierge validation from PRD section 12 using this as
   the actual booking tool instead of spreadsheets.
2. Add the freshness/slot-coverage/completion metrics from the pilot
   scorecard as a real dashboard (the owner performance page already tracks
   the same definitions — extend it marketplace-wide).
3. Replace mock auth with real OTP once there's a demand-side pilot cohort.
4. Add a background worker for time-based visit reminders (SMS/WhatsApp) —
   the notification center currently only covers event-triggered notices.
5. Only then: mobile app, payments, KYC, Hop Tour.
