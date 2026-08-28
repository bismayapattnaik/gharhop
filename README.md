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
| Owner  | 9800000001   | Priya, PG operator — DLF Cyber City. Has one intentionally stale bed to demo freshness enforcement. |
| Owner  | 9800000002   | Mr. Rao — Golf Course Road flat (approval-required booking) + Sohna Road room (instant booking). |
| Admin  | 0000000000   | Ops console. |
| Seeker | *any number* | First login with a new number creates the account. |

## What's actually implemented (the hard part)

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

## Scope cuts from the full PRD (deliberate, for a first prototype)

- **Auth**: mock OTP (any phone number), no real SMS/DLT provider.
- **Database**: SQLite file (`prisma/dev.db`), not PostgreSQL/PostGIS. Swap
  the Prisma datasource + `haversineKm` geo helper for real geo queries when
  moving off the prototype.
- **No mobile app** — this is a responsive web app covering both the seeker
  and owner experience, not the Flutter app from the technical blueprint.
- **No payments, escrow, KYC/identity verification, masked calling, or
  Hop Tour routing** — all P1/P2 in the PRD, and all require third-party
  provider contracts that don't make sense to wire up before the core loop
  is validated.
- **No background jobs** — slot-hold expiry is checked lazily on read
  (`releaseIfExpired` in `scheduling.ts`) rather than via a cron worker.
  Fine for a prototype; replace with a real queue before production.

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
