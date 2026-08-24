# 🎬 Curtain

A full-stack ticket booking platform featuring real-time seat holds, concurrency protection, and automated waitlist management.

Built with **Next.js 14**, **Prisma**, **PostgreSQL**, and **Tailwind CSS** — designed to handle high-demand movie and concert ticket drops without double-booking.

**Curtain** — because every great show starts when the curtain rises.

> **Live Demo:** [https://curtain-green.vercel.app](https://curtain-green.vercel.app)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🪑 **Interactive Seat Map** | Real-time visual seat selection with live status updates (available, held, booked) |
| 🔒 **Concurrency-Safe Booking** | Database-level unique constraints prevent double-booking even under simultaneous load |
| ⏱️ **Seat Hold TTL** | Temporary seat reservations with configurable expiry (default 10 min) and live countdown |
| 📋 **Waitlist System** | Automatic queue management per seat category when shows are sold out |
| 🎫 **Time-Limited Offers** | Waitlisted users receive expiring offers when seats free up via cancellation |
| 📧 **QR Code Tickets** | Confirmed bookings generate QR code tickets delivered via email (Resend) |
| 👥 **Role-Based Access** | Three distinct roles — Customer, Organiser, Admin — with protected routes and dashboards |
| 🔄 **Ticket Transfers** | Customers can transfer individual seats to other registered users |
| 🔔 **In-App Notifications** | Real-time notification bell for waitlist offers, transfers, and booking updates |
| 🧹 **Automated Cleanup** | Vercel Cron job sweeps expired holds and offers every 60 seconds |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework with API routes |
| **Database** | PostgreSQL (Supabase) | Hosted relational database with connection pooling |
| **ORM** | Prisma | Type-safe database access, migrations, and schema management |
| **Auth** | NextAuth.js (Credentials + JWT) | Session management with role-based middleware |
| **Styling** | Tailwind CSS | Custom design system with editorial cinema aesthetic |
| **Email** | Resend | Transactional emails for QR tickets and waitlist offers |
| **QR Codes** | node-qrcode | Server-side QR code generation for booking references |
| **Validation** | Zod | Runtime schema validation for API inputs |
| **Hosting** | Vercel + Supabase | Zero-config deployment with serverless functions |

---

## 🚀 Setup Guide

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **PostgreSQL** database (free tier on [Supabase](https://supabase.com), [Neon](https://neon.tech), or local)
- A **Resend** API key (free tier at [resend.com](https://resend.com)) — _optional, app works without it_

### 1. Clone & Install

```bash
git clone https://github.com/theomkashyap/ticket-booking-system.git
cd ticket-booking-system
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Your `.env` file should contain:

```env
# Database (Supabase, Neon, or local PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:password@host/dbname"

# NextAuth (run: openssl rand -base64 32)
NEXTAUTH_SECRET="your_generated_secret"
NEXTAUTH_URL="http://localhost:3000"

# Email - Resend (optional)
RESEND_API_KEY="re_your_api_key_here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron Job Protection
CRON_SECRET="your_secure_cron_secret"
```

> See [`.env.example`](.env.example) for full documentation of each variable.

### 3. Set Up the Database

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

Seed the database with sample venues, events, shows, and demo users:

```bash
npm run db:seed
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Demo Credentials

After seeding, you can log in with:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@curtain.com` | _(set in seed file)_ |
| **Organiser** | `organiser@curtain.com` | _(set in seed file)_ |
| **Customer** | Register a new account via the sign-up page |

---

## 🗄️ Database Schema

The system uses **12 models** across 4 core domains. Below is the entity relationship overview:

```
User ──┬── Event ── Show ──┬── ShowPrice
       │                   ├── SeatHold
       │                   ├── Booking ── BookingSeat
       │                   └── Waitlist ── Offer
       ├── Notification
       └── TicketTransfer
       
Venue ── Seat
```

### Core Models

| Model | Purpose |
|---|---|
| `User` | Stores credentials and role (`CUSTOMER`, `ORGANISER`, `ADMIN`) |
| `Venue` | Physical locations with an admin owner |
| `Seat` | Individual seats within a venue, identified by `row` + `number` + `category` |
| `Event` | Movie or concert listing created by an organiser |
| `Show` | A specific date/time screening of an event at a venue |
| `ShowPrice` | Per-category pricing for each show (e.g., VIP: ₹2500, Standard: ₹250) |
| `SeatHold` | Temporary reservation with TTL — unique constraint on `[showId, seatId]` |
| `Booking` | Confirmed purchase with a unique reference code |
| `BookingSeat` | Junction table linking bookings to specific seats |
| `Waitlist` | Queue entries per show + category, ordered by `position` |
| `Offer` | Time-limited seat offer created from waitlist when a cancellation occurs |
| `Notification` | In-app notification messages for users |
| `TicketTransfer` | Records of seat transfers between users |
| `OrganiserKey` | Registration keys required for organiser sign-up |

### Key Constraints

```prisma
// Prevents double-booking at the database level
model SeatHold {
  @@unique([showId, seatId])    // Only ONE hold per seat per show
  @@index([expiresAt])          // Fast expiry sweeps
}

// Ensures seat uniqueness within a venue
model Seat {
  @@unique([venueId, row, number])
}

// One price per category per show
model ShowPrice {
  @@unique([showId, category])
}
```

> Full schema: [`prisma/schema.prisma`](prisma/schema.prisma)

---

## 📡 API Documentation

All API routes are under `/api/` and use Next.js App Router route handlers.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new Customer or Organiser account |
| `POST` | `/api/auth/callback/credentials` | Public | Login via NextAuth credentials provider |

### Events & Shows

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | List events with optional filters (`?type=MOVIE&search=...`) |
| `GET` | `/api/events/[id]` | Public | Get event details with all associated shows |
| `POST` | `/api/events` | Organiser | Create a new event with shows and per-category pricing |
| `GET` | `/api/shows/[id]/seatmap` | Public | Get live seat availability map for a show |

### Seat Holds

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shows/[id]/hold` | Customer | Create a temporary hold on a seat. Body: `{ seatId }` |
| `DELETE` | `/api/holds/[id]` | Customer | Release a seat hold immediately (e.g., user cancels checkout) |

### Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Customer | Convert active holds into a confirmed booking. Body: `{ showId, holdIds[] }` |
| `GET` | `/api/bookings/me` | Customer | Get authenticated user's booking history |
| `DELETE` | `/api/bookings/[id]` | Customer | Cancel a booking → frees seats → triggers waitlist offer flow |

### Waitlist & Offers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/waitlist` | Customer | Join waitlist for a sold-out category. Body: `{ showId, category, quantity }` |
| `POST` | `/api/offers/[id]/accept` | Customer | Accept a time-limited waitlist offer → creates a new booking |

### Organiser Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/organiser/events/[id]/summary` | Organiser | Revenue, capacity, and recent bookings for an event |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/venues` | Admin | Create a venue and bulk-generate its seat layout |

### System Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cron/sweep-expired` | Cron Secret | Deletes expired `SeatHold` records, expires stale `Offer` records, and cascades offers to next waitlist entry |

---

## 🔐 Seat Hold & Waitlist Logic

This section explains the four critical mechanisms that power the booking system.

### 1. Seat Hold & TTL (Time-To-Live)

When a customer selects a seat on the interactive seat map, a `SeatHold` record is created with an `expiresAt` timestamp calculated from the show's configurable `holdTtlMins` (default: 10 minutes).

- **Frontend countdown:** A live timer shows the remaining hold duration during checkout.
- **Immediate release:** If the user cancels checkout, `DELETE /api/holds/[id]` releases the seat instantly.
- **Lazy expiry:** Any seat status read treats holds with `expiresAt < now()` as available, even before cleanup.
- **Active expiry:** A Vercel Cron job runs every 60 seconds to sweep and delete expired holds.

### 2. Concurrency Prevention (Double-Booking Protection)

The system prevents two users from booking the same seat using **database-level enforcement**, not application-level locks:

```
SeatHold: @@unique([showId, seatId])
```

When two users click the same seat simultaneously:
1. Two parallel `POST /api/shows/[id]/hold` requests are dispatched.
2. Both trigger a Prisma `$transaction` to insert a `SeatHold`.
3. PostgreSQL's unique constraint guarantees **exactly one insert succeeds**.
4. The second insert fails with Prisma error `P2002` (unique constraint violation).
5. The API catches this and returns `"Seat is no longer available"` to the losing request.

**Result:** First request wins, second fails cleanly. No race conditions, no double-booking.

### 3. Waitlist Auto-Assignment

When a seat category (e.g., VIP) is sold out, customers can join a waitlist ordered by `createdAt`.

On booking cancellation (`DELETE /api/bookings/[id]`):
1. The cancelled seats are freed.
2. The system queries the `Waitlist` table for the next eligible entry matching the freed category.
3. A time-limited `Offer` is created, assigning the specific freed seats.
4. An email notification is sent via Resend with a claim link.

### 4. Time-Limited Offer Handling

Waitlist offers expire after a configurable window (default: 24 hours).

- **User accepts in time →** Offer status becomes `ACCEPTED`, a standard `Booking` is generated.
- **Offer expires unclaimed →** The cron sweep marks it `EXPIRED` and re-runs the allocation logic, passing the seats to the **next person** in the waitlist queue.
- This cascading continues until someone accepts or the waitlist is exhausted.

---

## 🏗️ Project Structure

```
curtain/
├── prisma/
│   ├── schema.prisma          # Database schema (12 models)
│   └── seed.ts                # Demo data seeder
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── api/               # 12 API route groups
│   │   ├── admin/             # Admin dashboard (venue management)
│   │   ├── auth/              # Login & registration pages
│   │   ├── checkout/          # Seat hold checkout flow
│   │   ├── events/            # Event browsing & detail pages
│   │   ├── history/           # Booking history
│   │   ├── offers/            # Waitlist offer acceptance
│   │   ├── organiser/         # Organiser dashboard
│   │   ├── shows/             # Showtime selection & seat map
│   │   ├── tickets/           # QR code ticket view
│   │   └── globals.css        # Design system tokens
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── email.ts           # Resend email templates (QR tickets, offers)
│   │   └── prisma.ts          # Prisma client singleton
│   ├── middleware.ts           # Role-based route protection
│   └── types/                 # TypeScript type definitions
├── .env.example               # Environment variable template
├── SYSTEM_DESIGN.md           # 800-word system design write-up
├── tailwind.config.js         # Custom design tokens
└── package.json
```

---

## 📄 Related Documents

- **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)** — Detailed 800-word write-up covering seat hold TTL, concurrency prevention, waitlist auto-assignment, and time-limited offer handling.
- **[.env.example](.env.example)** — Full environment variable reference with setup instructions.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).