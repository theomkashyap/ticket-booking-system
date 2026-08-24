# Ticket Booking System

A robust, full-stack Next.js 14 application for booking movie and concert tickets. Built with a focus on concurrency safety, role-based access, and a clean, accessible design system.

## Features
- **Role-Based Access Control**: Separate flows and dashboards for Customers, Organisers, and Admins.
- **Concurrency-Safe Seat Holds**: Prevents double-booking using Prisma transactions and database-level unique constraints.
- **Seat Map & Live Polling**: Real-time representation of seat availability and hold statuses.
- **Waitlist & Auto-Offers**: Sold-out categories allow users to join a waitlist. Cancellations trigger time-limited offers to the next person in line.
- **Automated Expiry**: A cron job periodically sweeps and releases expired seat holds and unaccepted waitlist offers.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (hosted on Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Credentials Provider + JWT)
- **Styling**: Tailwind CSS (Custom design system with strict tokens)
- **Email/QR**: Resend API & node-qrcode

## Setup Guide

### 1. Clone & Install
```bash
git clone <repo-url>
cd ticket-booking-system
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"
NEXTAUTH_SECRET="your-super-secret-random-string"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_your_api_key_here" # Optional, app works without it
```

### 3. Database Setup (Prisma)
Push the schema to your database and generate the client:
```bash
npx prisma generate
npx prisma db push
```

Seed the database with default roles and venues:
```bash
npm run db:seed
```

### 4. Run the Dev Server
```bash
npm run dev
```
Open `http://localhost:3000`. You can log in with:
- Admin: `admin@ticketbook.com` / `admin123`
- Organiser: `organiser@ticketbook.com` / `organiser123`
- Customer: `customer@ticketbook.com` / `customer123`

---

## Testing Concurrency

A standalone script is provided to test the application's robust concurrency controls (preventing double-booking). 
To run the script, which attempts to simultaneously book the same seat twice:

```bash
npx ts-node test-concurrency.ts
```

---

## API Documentation

### Auth
- `POST /api/auth/register` — Register a new user (Customer or Organiser).
- `POST /api/auth/callback/credentials` (NextAuth) — Login.

### Core Booking Flow
- `POST /api/shows/[id]/hold`
  - **Purpose**: Creates a temporary hold on a specific seat.
  - **Body**: `{ seatId: string }`
  - **Response**: `{ hold: SeatHold }`
- `DELETE /api/holds/[id]`
  - **Purpose**: Releases a seat hold immediately (e.g., when a user cancels checkout).
- `POST /api/bookings`
  - **Purpose**: Converts active seat holds into confirmed bookings and generates a ticket QR code.
  - **Body**: `{ showId: string, holdIds: string[] }`
  - **Response**: `{ booking: Booking }`
- `DELETE /api/bookings/[id]`
  - **Purpose**: Cancels a booking, frees the seats, and triggers the Waitlist offer flow.

### Waitlist & Offers
- `POST /api/waitlist`
  - **Purpose**: Adds the user to the waitlist for a specific show category.
  - **Body**: `{ showId: string, category: string, quantity: number }`
- `POST /api/offers/[id]/accept`
  - **Purpose**: Accepts a time-limited waitlist offer and converts it into a booking.

### Organiser & Admin
- `POST /api/events` (Organiser)
  - **Purpose**: Creates an Event, Show, and ShowPrices in one transaction.
- `GET /api/organiser/events/[id]/summary` (Organiser)
  - **Purpose**: Aggregates total revenue, capacity, and recent bookings.
- `POST /api/venues` (Admin)
  - **Purpose**: Creates a Venue and bulk generates its seats layout.

### System Jobs
- `GET /api/cron/sweep-expired`
  - **Purpose**: Deletes expired `SeatHold` records and expires `WaitlistOffer` records, passing them to the next in line. Intended to be called by a Vercel Cron job.

---

## Architecture & Mechanisms

Please refer to `SYSTEM_DESIGN.md` for a detailed technical breakdown of the concurrency prevention, TTL expiry, waitlist handling, and time-limited offer mechanisms.