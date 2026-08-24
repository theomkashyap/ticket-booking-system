# 🏗️ Curtain — System Design

> **Word Count:** ~780 / 800

This document details the four critical subsystems that power **Curtain**: **Seat Holds (TTL)**, **Concurrency Prevention**, **Waitlist Auto-Assignment**, and **Time-Limited Offer Handling**.

---

## 1. Seat Hold & TTL Mechanism

### Problem

When a customer selects a seat on the interactive seat map, that seat must be temporarily reserved while they complete checkout. Without this, another user could book the same seat during the payment window, leading to conflicts and a poor user experience.

### Solution

The system uses a dedicated `SeatHold` table as a temporary reservation ledger.

| Step | Action |
|---|---|
| **Hold Created** | `POST /api/shows/[id]/hold` creates a `SeatHold` record linking the user, show, and seat with an `expiresAt` timestamp |
| **TTL Calculation** | `expiresAt = now() + Show.holdTtlMins` — configurable per show (default: 10 minutes), adjustable by the organiser |
| **Live Countdown** | The frontend renders a real-time countdown timer so the customer knows exactly how long they have |
| **Successful Checkout** | `POST /api/bookings` atomically deletes the `SeatHold` and creates a permanent `Booking` + `BookingSeat` record inside a single Prisma `$transaction` |
| **Manual Release** | If the user cancels checkout, `DELETE /api/holds/[id]` releases the seat immediately — no waiting for TTL |
| **Abandoned Session** | If the user closes their browser entirely, the seat is reclaimed through two mechanisms: |

**Dual Expiry Strategy:**

- **Lazy Expiry:** Every seat status query filters out holds where `expiresAt < now()`, treating them as available even before physical deletion. This means stale holds never block new customers.
- **Active Expiry (Cron):** A Vercel Cron job (`GET /api/cron/sweep-expired`) runs every 60 seconds, bulk-deleting all expired `SeatHold` rows. An `@@index([expiresAt])` on the model ensures this sweep is fast even at scale.

This dual approach guarantees that no seat is ever locked indefinitely, regardless of how the user exits the flow.

---

## 2. Concurrency Prevention

### Problem

During high-demand ticket drops (e.g., a popular concert going on sale), hundreds of users may attempt to hold the **exact same seat at the exact same millisecond**. Application-level checks alone (e.g., "check if seat is available, then insert") are vulnerable to race conditions — two requests can both read "available" before either writes.

### Solution

Concurrency is enforced at the **database layer**, not the application layer, guaranteeing absolute consistency regardless of server load.

**The mechanism:**

```
model SeatHold {
  @@unique([showId, seatId])   // PostgreSQL unique constraint
}
```

**How it works under simultaneous load:**

```
User A clicks Seat 5A ──► POST /api/shows/[id]/hold ──► Prisma $transaction ──► INSERT SeatHold ──► ✅ SUCCESS
User B clicks Seat 5A ──► POST /api/shows/[id]/hold ──► Prisma $transaction ──► INSERT SeatHold ──► ❌ P2002 (Unique Constraint Violation)
```

1. Two parallel requests arrive at the server simultaneously.
2. Both initiate a Prisma `$transaction` to insert a `SeatHold` with the same `showId` + `seatId`.
3. PostgreSQL's unique constraint guarantees that **exactly one insert succeeds**. The second insert immediately fails with Prisma error code `P2002`.
4. The API catches this specific error and returns a clean `409 Conflict` response: `"Seat is no longer available"`.

**Result:** The first request wins; the second fails gracefully. No race conditions, no double-booking, no distributed locks required. The database itself is the single source of truth.

Additionally, booking confirmation (`POST /api/bookings`) converts holds into `BookingSeat` records and deletes the `SeatHold` inside the **same transaction**, preventing a hold from expiring mid-confirmation.

---

## 3. Waitlist Auto-Assignment Flow

### Problem

When a seat category (e.g., VIP) is completely sold out, interested customers have no way to get tickets unless they manually keep checking. If a confirmed booking is later cancelled, those freed seats should automatically go to the next waiting customer — not back into the general pool where bots or faster clickers win.

### Solution

The system implements a **FIFO (First-In, First-Out) waitlist queue** per show and per seat category.

**The flow:**

```
Customer joins waitlist ──► Booking cancelled ──► System finds next in queue
     ──► Offer created with TTL ──► Email sent via Resend ──► Customer accepts ──► Booking confirmed
```

| Step | Detail |
|---|---|
| **Join** | `POST /api/waitlist` creates a `Waitlist` entry with `showId`, `category`, `position`, and `createdAt` |
| **Cancellation Trigger** | When `DELETE /api/bookings/[id]` is called, the API retrieves the freed seats and their categories |
| **Match** | The system queries the `Waitlist` table ordered by `createdAt ASC` for entries matching the freed category |
| **Offer** | If a match is found, an `Offer` record is created linking the waitlist entry to the specific freed seat, with a time-limited `expiresAt` |
| **Notification** | An email is dispatched via Resend containing a direct claim link, and an in-app `Notification` is created |

---

## 4. Time-Limited Offer Handling

### Problem

Waitlist offers cannot remain pending forever. If the first person in line ignores their offer, the freed seat becomes indefinitely locked — unavailable to the public and unavailable to the next person in the queue.

### Solution

Every `Offer` is created with a strict `expiresAt` timestamp (default: 24 hours). Two paths resolve the offer:

**Path A — User Accepts:**

| Step | Action |
|---|---|
| User clicks claim link | `POST /api/offers/[id]/accept` is called |
| Validation | System verifies `status = PENDING` and `expiresAt > now()` |
| Booking created | A standard `Booking` + `BookingSeat` record is generated |
| Offer finalized | Status updated to `ACCEPTED` |

**Path B — Offer Expires (Cascading Reallocation):**

| Step | Action |
|---|---|
| Cron sweep runs | `GET /api/cron/sweep-expired` queries for `Offer` records where `status = PENDING AND expiresAt < now()` |
| Mark expired | Status updated to `EXPIRED` |
| **Re-run allocation** | The system takes the seats from the expired offer and queries for the **next eligible person** in the waitlist queue |
| New offer created | A fresh `Offer` with a new 24-hour TTL is generated and emailed |

This cascading mechanism continues automatically — if the second person also ignores the offer, it passes to the third, and so on — until someone accepts or the waitlist is exhausted, at which point the seat returns to the general available pool.

```
Offer expires ──► Next in queue gets offer ──► Expires again? ──► Next in queue...
     ──► Accepted? ──► Booking confirmed ✅
     ──► Queue empty? ──► Seat returns to available pool 🪑
```
