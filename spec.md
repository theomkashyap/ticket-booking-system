# Ticket Booking System — FINAL Build Plan

**Assessment:** Unthinkable — Round 1
**Timeline:** 1-2 days
**Type:** Movie & Concert ticket booking web app
**Approach:** Build UI directly in code with design tokens baked in (no external UI design tool) — guarantees visual consistency and ships working functionality in the same pass.

---

## 1. Objective (from assessment PDF)

Build a ticket booking platform for movies and concerts where:
- Customers book seats from a visual seat map
- Held seats auto-release on checkout abandonment
- Sold-out events have a waitlist with automatic seat assignment on cancellation
- Every confirmed booking produces an email with a QR code ticket

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + backend API routes in one repo, one Vercel deploy |
| Database | PostgreSQL via Supabase | Free hosted Postgres + built-in Realtime for live seat map updates |
| ORM | Prisma | Fast schema iteration, transactions, migrations |
| Styling | Tailwind CSS with custom design tokens (below) | Guarantees identical fonts/colors/radius across every screen — no drift |
| Auth | NextAuth.js (credentials provider) or custom JWT + bcrypt | Role-based: customer / organiser / admin |
| Realtime | Supabase Realtime (Postgres change subscriptions) | Push seat status updates to all connected clients instantly |
| QR Codes | `qrcode` npm package | Encodes booking reference, generated server-side |
| Email | Resend (free tier) | Simple API, supports HTML + attachments for QR ticket emails |
| Scheduled Jobs | Vercel Cron | Sweeps expired holds/offers every 30-60s as backup to lazy expiry |
| Hosting | Vercel (app) + Supabase (DB) | Free tiers, deploy in minutes |

---

## 3. Design System (baked into Tailwind config, not a design tool)

```js
// tailwind.config.js — colors, fonts, radius
colors: {
  background: '#FAFAF8',   // warm off-white
  charcoal:   '#1A1A1A',   // primary text/headers
  accent:     '#C8102E',   // cinema red — buttons & active states ONLY
  available:  '#8FA88A',   // muted sage green
  held:       '#D4A017',   // muted amber
  booked:     '#B0B0B0',   // flat gray
},
fontFamily: {
  serif: ['Georgia', 'serif'],        // headings/titles
  sans:  ['system-ui', '-apple-system', 'sans-serif'],  // body/labels/buttons
},
borderRadius: {
  DEFAULT: '5px',   // max 4-6px everywhere, never the default 16-24px
},
```

**Rules applied everywhere:**
- No gradients, no glassmorphism, no blur, no neon, no drop shadows
- Thin 1px solid borders (`border-charcoal/10`) instead of shadows
- Generous whitespace, flat colors, sharp contrast
- Editorial/print aesthetic — like a cinema or concert hall's own ticketing site, not a generic SaaS template

Because this lives in the Tailwind config and `globals.css` instead of being re-generated per screen by an external tool, every component automatically inherits the same look — zero consistency drift.

---

## 4. Screens (all required, matched against the PDF)

1. Login / Register (role selector: Customer / Organiser only — Admin seeded directly in DB)
2. Event Browse / Filter (customer)
3. Event Detail + Showtime Selector
4. Seat Map (core graded feature — live status, countdown on held seats)
5. Checkout + Booking Confirmation (with QR ticket success state)
6. Payment Failed / Cancelled (calm state, triggers immediate seat release, not required by PDF but expected UX)
7. Booking History (customer, with cancel action)
8. Organiser — Create Event/Show + per-category pricing
9. Organiser — Booking Summary / Revenue
10. Admin — Venue & Seat Layout Creator

---

## 5. Core Domain Model

`Event` (movie or concert) → has one or more `Show`s (date/time/venue) → each `Show` has a seat map from the `Venue` layout → each seat has a `SeatCategory` (Premium/Standard/VIP/General) with per-show, per-category pricing. Movies and concerts share the same model via an `EventType` enum — no movie-only fields hardcoded.

---

## 6. Database Schema (Prisma — copy directly into `schema.prisma`)

```prisma
enum Role {
  CUSTOMER
  ORGANISER
  ADMIN
}

enum EventType {
  MOVIE
  CONCERT
}

enum SeatStatus {
  AVAILABLE
  HELD
  BOOKED
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
}

enum OfferStatus {
  PENDING
  ACCEPTED
  EXPIRED
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())

  events    Event[]      @relation("OrganiserEvents")
  bookings  Booking[]
  waitlists Waitlist[]
}

model Venue {
  id       String  @id @default(uuid())
  name     String
  address  String
  admin    User?   @relation(fields: [adminId], references: [id])
  adminId  String?
  seats    Seat[]
  shows    Show[]
}

model Seat {
  id           String        @id @default(uuid())
  venue        Venue         @relation(fields: [venueId], references: [id])
  venueId      String
  row          String
  number       Int
  category     String
  seatHolds    SeatHold[]
  bookingSeats BookingSeat[]

  @@unique([venueId, row, number])
}

model Event {
  id          String     @id @default(uuid())
  title       String
  type        EventType
  description String?
  organiser   User       @relation("OrganiserEvents", fields: [organiserId], references: [id])
  organiserId String
  shows       Show[]
  createdAt   DateTime   @default(now())
}

model Show {
  id          String      @id @default(uuid())
  event       Event       @relation(fields: [eventId], references: [id])
  eventId     String
  venue       Venue       @relation(fields: [venueId], references: [id])
  venueId     String
  date        DateTime
  holdTtlMins Int         @default(10)
  prices      ShowPrice[]
  seatHolds   SeatHold[]
  bookings    Booking[]
  waitlists   Waitlist[]
}

model ShowPrice {
  id       String  @id @default(uuid())
  show     Show    @relation(fields: [showId], references: [id])
  showId   String
  category String
  price    Decimal

  @@unique([showId, category])
}

model SeatHold {
  id        String   @id @default(uuid())
  show      Show     @relation(fields: [showId], references: [id])
  showId    String
  seat      Seat     @relation(fields: [seatId], references: [id])
  seatId    String
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@unique([showId, seatId])
}

model Booking {
  id          String        @id @default(uuid())
  user        User          @relation(fields: [userId], references: [id])
  userId      String
  show        Show          @relation(fields: [showId], references: [id])
  showId      String
  status      BookingStatus @default(CONFIRMED)
  reference   String        @unique
  totalAmount Decimal
  seats       BookingSeat[]
  createdAt   DateTime      @default(now())
}

model BookingSeat {
  id        String  @id @default(uuid())
  booking   Booking @relation(fields: [bookingId], references: [id])
  bookingId String
  seat      Seat    @relation(fields: [seatId], references: [id])
  seatId    String

  @@unique([bookingId, seatId])
}

model Waitlist {
  id        String   @id @default(uuid())
  show      Show     @relation(fields: [showId], references: [id])
  showId    String
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  category  String
  position  Int
  offer     Offer?
  createdAt DateTime @default(now())
}

model Offer {
  id         String      @id @default(uuid())
  waitlist   Waitlist    @relation(fields: [waitlistId], references: [id])
  waitlistId String      @unique
  seatId     String
  status     OfferStatus @default(PENDING)
  expiresAt  DateTime
  createdAt  DateTime    @default(now())
}
```

---

## 7. Concurrency & Locking Strategy

**Problem:** Two customers must never hold or book the same seat simultaneously.

1. `SeatHold` has `@@unique([showId, seatId])` — DB rejects a second hold on an already-held seat.
2. Wrap hold creation in a transaction; catch the unique-constraint violation and return "seat no longer available" to the losing request.
3. Booking confirmation converts a valid, non-expired hold into a `BookingSeat` and deletes the `SeatHold` row inside the same transaction, so a hold can't expire mid-confirmation and cause a double-booking.

**Result:** first request wins, second fails cleanly — no double-booking under simultaneous load. This is the #1 graded mechanic — get it bulletproof and demonstrate it (two simultaneous requests, one fails) in the README.

---

## 8. Seat Hold TTL & Auto-Release

- Each `Show` has configurable `holdTtlMins` (default 10, organiser-adjustable per show — not hardcoded).
- **Lazy expiry:** any read of seat status checks `expiresAt < now()` and treats the seat as available even before cleanup runs.
- **Active expiry (cron):** scheduled job every 30-60s deletes expired `SeatHold` rows and pushes a Realtime update so seat maps refresh instantly.
- **Immediate release on failed/cancelled payment:** don't wait for TTL — release the hold the moment checkout is abandoned or fails.

---

## 9. Waitlist Auto-Assignment & Time-Limited Offer Flow

1. Customer joins waitlist **per seat category** (not per specific seat) when sold out. Entries get an incrementing `position`.
2. On cancellation: system finds the oldest waitlist entry for that show + category → creates an `Offer` with its own short `expiresAt` (e.g. 15-30 min) → sends email with a time-limited claim link.
3. Completed within window → `Offer` marked `ACCEPTED`, seat becomes a normal booking.
4. Expired unclaimed → cron marks `EXPIRED`, offer moves to next person in queue.

---

## 10. QR Code & Email

- On booking: `qrcode` npm package generates a QR encoding `Booking.reference` (a unique string, not the raw DB ID).
- Resend sends the QR embedded in an HTML email with showtime + seat details.
- Waitlist offer emails use a distinct template with the time-limited claim link.

---

## 11. Roles & Permissions

| Role | Can do |
|---|---|
| Admin | Create/manage venues, seat layouts, seat categories |
| Organiser | Register, log in, create movie/concert listings + shows, set per-category pricing, view booking summary + revenue per event |
| Customer | Register, log in, browse/filter events, view live seat map, hold seats, book, receive QR email, view booking history, cancel bookings, join waitlist |

---

## 12. API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login

POST   /api/venues                       (admin)
GET    /api/venues/:id

POST   /api/events                       (organiser)
GET    /api/events?type=&date=&venue=    (filter support)
GET    /api/events/:id

POST   /api/shows                        (organiser)
GET    /api/shows/:id/seatmap            (live seat status)

POST   /api/shows/:id/hold               (create seat hold)
DELETE /api/holds/:id                    (manual release / on abandon-cancel)

POST   /api/bookings                     (confirm booking from valid holds)
GET    /api/bookings/me                  (booking history)
DELETE /api/bookings/:id                 (cancel → triggers waitlist offer)

POST   /api/waitlist                     (join waitlist for show+category)
POST   /api/offers/:id/accept            (complete booking from offer)

GET    /api/organiser/events/:id/summary (bookings + revenue per event)

POST   /api/cron/sweep-expired           (cron: expire holds + offers)
```

---

## 13. Build Phases (1-2 days)

### Phase 1 — Setup, Design Tokens, Schema (2-3 hrs)
- Init Next.js + Tailwind + Prisma + Supabase project
- Add design tokens (Section 3) to `tailwind.config.js` + `globals.css` — do this FIRST so every component styled after is automatically consistent
- Write Prisma schema (Section 6), run migrations, seed sample venues/events/shows
- Set up NextAuth/JWT with role-based middleware

### Phase 2 — Auth + Core Booking Logic (4-5 hrs) — highest priority, most heavily graded
- Login/Register screen (real, working, role selection)
- Seat hold endpoint with concurrency-safe locking (Section 7)
- TTL expiry — lazy check + cron sweep (Section 8)
- Booking confirmation (hold → booking transaction)
- QR generation + Resend email on confirmation

### Phase 3 — Waitlist & Cancellation Flow (3-4 hrs)
- Join waitlist endpoint
- Cancellation trigger → next in queue → time-limited offer → email
- Offer accept endpoint + expiry sweep → cascades to next in queue

### Phase 4 — Remaining Screens, Wired to Real Data (4-5 hrs)
- Event browse/filter, event detail, seat map (with Realtime subscription + countdown badges), checkout + confirmation, payment failed state, booking history
- Organiser: create event/show, revenue/summary
- Admin: venue + seat layout creator
- All screens use the shared Tailwind tokens — no per-screen restyling needed

### Phase 5 — Docs, Testing, Deploy (2-3 hrs)
- Deploy to Vercel + Supabase
- Manual concurrency test: two simultaneous hold requests on the same seat, confirm one fails cleanly — document/screenshot this for the README
- Write README: setup guide, `.env.example`, API docs, DB schema, seat hold/waitlist logic explanation
- Write the 800-word system design doc last (so it matches final implementation): seat hold/TTL mechanism, concurrency prevention, waitlist auto-assignment flow, time-limited offer handling

---

## 14. Deliverables Checklist

- [ ] Zip of complete source code
- [ ] README.md — setup guide, `.env.example`, API docs, DB schema, seat hold/waitlist logic
- [ ] Hosted app URL (Vercel) — test fresh in incognito before submitting
- [ ] System design write-up (≤800 words, 4 required sections)

---

## 15. Differentiators (to stand out)

1. Real Realtime seat map (Supabase push) instead of polling
2. Visible countdown timer on held seats in the UI
3. Documented, demonstrable concurrency proof in the README
4. Precise, non-padded 800-word design doc with a simple sequence diagram
5. Configurable TTL per show, exposed in the organiser UI
6. Consistent, editorial visual design across all 10 screens via shared design tokens (not templated defaults)
