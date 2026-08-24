# System Design: Critical Mechanisms

This document outlines the technical implementation details for the four critical subsystems in the Ticket Booking System: Concurrency, Seat Holds (TTL), Waitlists, and Time-Limited Offers.

## 1. Seat Hold and TTL Mechanism
When a user selects a seat on the interactive seat map, the system must reserve it temporarily to allow them time to complete checkout without losing the seat to another user.

**Implementation**:
The `SeatHold` table acts as a temporary ledger. When `POST /api/shows/[id]/hold` is called, a record is created linking the user, the show, and the seat. This record contains an `expiresAt` timestamp, calculated by adding the `Show.holdTtlMins` (typically 10 minutes) to the current time. 

During the checkout process, the frontend displays a live countdown. If the user completes the purchase via `POST /api/bookings`, the `SeatHold` is deleted and replaced by a permanent `BookingSeat` record. If the user cancels or navigates away, the `DELETE /api/holds/[id]` endpoint is called to release the hold immediately. If the user abandons the session entirely, the cron sweep job (detailed later) will eventually prune the expired record, returning the seat to the available pool.

## 2. Concurrency Prevention Approach
In a high-demand ticketing scenario (e.g., concert drops), multiple users will attempt to hold the exact same seat at the exact same millisecond. 

**Implementation**:
Concurrency is prevented primarily at the database layer rather than the application layer, ensuring absolute consistency even under heavy load. The Prisma schema defines a composite unique constraint on the `SeatHold` model:
`@@unique([showId, seatId])`

When two users click the same seat simultaneously, two parallel `POST /api/shows/[id]/hold` requests are dispatched. Both trigger a Prisma `$transaction`. The database attempts to insert two `SeatHold` records with the identical `showId` and `seatId`. PostgreSQL enforces the unique constraint, guaranteeing that exactly one insert succeeds. The second insert immediately fails with Prisma error code `P2002` (Unique constraint failed). The API catches this specific error and gracefully returns a "Seat no longer available" response to the runner-up.

## 3. Waitlist Auto-Assignment Flow
When a specific seating category (e.g., VIP) is sold out, users can join a waitlist. If a confirmed booking in that category is later cancelled, the system must automatically allocate those newly freed seats to the waitlist queue.

**Implementation**:
Users join via `POST /api/waitlist`, which creates a `WaitlistEntry` with a timestamp (`createdAt`), category, and requested quantity. 
When a booking is cancelled (`DELETE /api/bookings/[id]`), the API retrieves the seats associated with the cancellation. It then queries the `WaitlistEntry` table, ordered chronologically (`createdAt: 'asc'`), looking for entries matching the cancelled category where the requested quantity is less than or equal to the number of freed seats. 
If a match is found, the system creates a `WaitlistOffer` for that user, assigning the specific freed seats to them, and generates a time-limited expiration timestamp (usually 24 hours). An email notification is dispatched via Resend, and the original `WaitlistEntry` is marked as fulfilled.

## 4. Time-Limited Offer Handling
Waitlist offers cannot pend indefinitely. If the first user in line does not accept their offer in time, the system must revoke it and pass the opportunity to the next eligible person.

**Implementation**:
Offers are managed by the `WaitlistOffer` model and the `GET /api/cron/sweep-expired` endpoint (designed to be triggered via Vercel Cron). 
When the cron job runs, it queries for `WaitlistOffer` records where `status = PENDING` and `expiresAt < now()`. For each expired offer, the system updates its status to `EXPIRED`. 
Crucially, it then re-runs the allocation logic: it takes the seats from the expired offer, queries the `WaitlistEntry` table for the next eligible person in line for that category, and creates a *new* `WaitlistOffer` with a fresh 24-hour TTL. 
If the user accepts the offer before expiry (`POST /api/offers/[id]/accept`), the offer status updates to `ACCEPTED`, and a standard `Booking` is generated.
