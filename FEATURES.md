# GharHop — what it does and why

A plain-language walkthrough of the idea, for anyone who wants to understand
the product without reading the full 60-page PRD. If you want the underlying
business rationale (market sizing, competition, unit economics), that lives
in the original market research document — this file is scoped to **what the
product actually does**, feature by feature, and why each one exists.

---

## 1. The one-sentence pitch

**GharHop is not a listings site. It's a booking engine for home visits.**

Every other rental app (99acres, Magicbricks, NoBroker) answers "what's
available?" GharHop answers "can I actually go see it, and will it still be
available when I show up?" That second question is the one that's broken
today — stale listings, unanswered calls, no-shows — and it's the one this
product is built around.

---

## 2. Who uses it

| Role | What they are | What they get |
|---|---|---|
| **Seeker** | Someone looking for a flat, room, or PG bed | A swipe-based way to find nearby places, book a real visit slot, and track it through to move-in |
| **Owner / Operator** | Someone with a property (or a PG with many beds) to rent out | A calendar, a request inbox, and tools to keep their listing from going stale |
| **Admin / Ops** | The platform's internal trust & operations team | A dashboard to catch stale listings, watch visit health, and handle fraud reports |

---

## 3. The seeker experience, feature by feature

### 3.1 Discover feed (swipe)
A stack of nearby cards — swipe or tap to say "interested" (♥) or "pass" (✕).
Each card shows:
- **Distance** from your chosen area
- **Freshness** — literally how many hours ago the owner last confirmed this
  is still available
- **Price, deposit, configuration, furnishing** — no hidden numbers
- **Next open visit slot**, if the owner has published one

**Why it matters:** a swipe here is *not* a match. It's just interest —
exactly like liking a post. The real commitment happens at step 3.3.

### 3.2 Filters
Area, property type (flat / private room / PG bed), and max budget. Filters
are a plain form — they work even if JavaScript fails to load, because
finding a place to live shouldn't depend on your connection being perfect.

### 3.3 Booking a visit — the actual product
Open a listing, pick one of the owner's real open time slots, and the system
**holds that slot for you for 10 minutes** while you confirm. If the owner
has "instant confirm" turned on, you're done — it's now a real appointment
with a calendar entry. If they require approval, it becomes a request they
have to accept or decline.

**Why it matters:** this is the feature that doesn't exist anywhere else.
Every competitor stops at "here's a phone number, good luck." GharHop turns
"interested" into a mutually-agreed appointment, atomically — meaning two
people can never accidentally book the same slot.

### 3.4 Visit day
Once confirmed, a visit shows up on "My Visits" with:
- **Check-in** — a one-tap "I've arrived" (not GPS tracking — just an
  explicit action, on purpose, for privacy)
- **Cancel** — with a reason, so the platform can tell the difference
  between "something came up" and "this person ghosts every visit"
- **No-show reporting** — either side can flag the other

### 3.5 After the visit
You're asked one question: what's next? *Not for me / Still deciding /
Shortlisted / Ready to offer / Couldn't actually visit.* That single signal
is what lets the whole system measure whether visits are actually working —
not just happening.

### 3.6 Reporting
Every listing has a "report this listing" link — wrong price, fake listing,
unsafe situation, discriminatory content. Reports go straight to the ops
dashboard (section 5).

---

## 4. The owner/operator experience, feature by feature

### 4.1 Adding a property
An owner enters the property once (address, area, coordinates) and then adds
one or more **inventory items** under it — a flat is one item, but a PG
building can have many rooms and many beds, each independently rentable.
This mirrors how PG operators actually think about their business (a bed is
the sellable unit, not the building).

### 4.2 The freshness system — the actual moat
This is the single most important mechanic in the whole product, and it's
almost invisible to the seeker:

- Every listing has a **freshness clock** (default: 72 hours).
- If the owner doesn't reconfirm within that window, the listing **silently
  disappears from seeker search** — not deleted, just hidden, until
  reconfirmed.
- Reconfirming is one button: **"Still available? ✓ Confirm."**

**Why it matters:** the #1 reason rental apps lose trust is stale inventory —
you call about a flat that was rented three weeks ago. GharHop makes staleness
structurally impossible to show to a seeker, rather than relying on owners to
remember to take listings down.

### 4.3 The calendar
Owners publish specific visit slots (a date, a time, how many people can
book it). Seekers can only request times that are genuinely open — there's
no "call to check if anyone's free." Owners choose, per listing:
- **Instant confirm** — any request in an open slot is automatically a
  booked visit
- **Requires approval** — owner sees the request and accepts or declines
- **Counter-proposal** — if neither the requested nor any other obvious time
  works, the owner can propose a different one of their own open slots
  instead of just declining. The seeker then accepts or declines *that* —
  nobody's visit silently disappears just because the original time didn't work.

### 4.4 Request inbox
Every pending "requires approval" request lands here, with the seeker's
name and requested time. Accept, decline, or **propose a different time**
in one tap. The PRD's own target is a **median response time under 30
minutes** — this inbox exists to make that achievable. (While a
counter-proposal is pending, it moves out of this inbox — the owner is now
the one waiting on the seeker, not the other way around.)

### 4.5 Performance dashboard
Owners see, for their own listings: active vs. stale count, shortlists
received, confirmed and completed visits, completion rate, no-show count,
and "serious next step" rate (visits that led to an offer or a shortlist).
These are the exact numbers the PRD uses as pilot pass/fail gates — so an
owner and the company are always looking at the same yardstick.

---

## 5. The ops/admin console

A single screen for the trust & operations side of the business:

- **Stale queue** — every listing currently past its freshness window,
  with the owner's contact info, so ops can chase it down manually if a
  listing matters enough. **Pause or mark-rented right from this screen** —
  no need to log in as the owner.
- **All listings** — the same pause/reactivate/mark-rented controls across
  every listing in the marketplace, not just the stale ones — for handling
  a fraud report or an owner request over the phone.
- **Visit operations timeline** — a live feed of every visit and its status
  across the whole marketplace, with **force-confirm** (when an owner has
  gone unresponsive past their SLA and support needs to unblock the seeker)
  and **cancel** as direct overrides.
- **Trust cases** — open fraud/safety reports, with one-tap "action" or
  "no violation" resolution
- **Marketplace health numbers** — active/stale counts, visit completion
  rate — checked against the same thresholds the business plan uses to
  decide whether to expand to a new city

This is deliberately the "minimum admin dashboard" from the launch plan:
support can unstick almost any broken booking without touching the
database directly.

---

## 6. The mechanics nobody sees but that make it actually work

These aren't "features" a user clicks on, but they're what stops the product
from silently breaking in ways that would destroy trust:

- **Atomic slot holds.** When you tap a time slot, it's held just for you
  for 10 minutes via a database transaction — if someone else tries to grab
  the same slot in that window, they're told it's gone, instantly. No two
  people can ever walk in for the same appointment.
- **Idempotency.** If your phone hiccups and re-sends a booking request,
  the system recognizes the retry and doesn't create a duplicate visit or
  double-charge anything.
- **A real visit state machine.** A visit can only move through
  Requested → Confirmed → Checked-in → Completed (or branch into
  Cancelled/No-show) in ways that make sense — you can't "complete" a visit
  that was never confirmed, for instance.
- **Reliability scoring.** Seekers who cancel late or no-show see their
  internal reliability score drop. It's not shown as a public shaming
  mechanic — it's a quiet signal the platform can use later (e.g., to
  prioritize responses to more reliable seekers).
- **In-app notifications.** Every state change that leaves someone waiting
  (a new request, a confirmation, a decline, a cancellation, a proposed
  reschedule) creates a notification for the other party — a bell icon with
  an unread count, not a hope that someone happens to refresh the page.
  This covers *event-triggered* notices only; there's no background worker
  yet for *time-based* ones like "your visit is in one hour."

---

## 7. What's deliberately *not* built yet, and why

Every one of these is a real feature in the long-term product vision — they're
just sequenced after the core loop above is proven to work:

| Not yet built | Why it's sequenced later |
|---|---|
| Real OTP/SMS login | Needs a paid SMS/DLT provider contract — not worth it before there's a real user base |
| Payments, deposits, escrow | Legally needs a regulated payment partner; the product explicitly should never custody money itself |
| Identity/KYC verification | Needs a verification provider contract + legal review |
| Masked calling | Needs a telephony provider |
| Time-based reminders ("visit in 1 hour") | Needs a background job scheduler; the notification center only fires on state changes today, not on a clock |
| "Hop Tour" (bundling 2-4 confirmed visits into one efficient route) | A real differentiator, but only matters once there's enough density that seekers are booking multiple visits in one area |
| Native mobile app | The current build is a responsive web app that behaves like a phone app (see below) — a real Flutter app is a much later investment |
| Real property photos | No media upload pipeline yet — cards use color-graded placeholder art instead |

---

## 8. Why the app looks like a dating app

The swipe-card interaction is deliberately styled like a modern dating app
(dark background, warm gradient accents, floating action buttons, drag-to-swipe
with LIKE/NOPE feedback) rather than a traditional real-estate listing page.
That's not decoration — it's a deliberate bet: **renting a home should feel
as fast and low-friction as swiping through profiles**, because the emotional
job (excitement, momentum, "let's see what's next") is closer to that than to
filling out a real-estate search form. The owner and admin sides stay in a
plain, functional, light "business dashboard" style on purpose — those are
work tools, not something anyone should enjoy scrolling through.

---

## 9. The single metric that matters most

Everything above serves one number: **verified move-ins.** Not swipes, not
listings, not app downloads — completed, confirmed, actually-happened visits
that turn into someone actually moving in. Every feature in this document
exists to move that number, or to stop something (staleness, fraud,
double-booking, no-shows) from getting in its way.
