import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendWaitlistOfferEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const bookingId = params.id;

    // We do this outside the transaction so we can send emails after
    let waitlistOffersToMake: Array<{
      waitlistEntryId: string;
      seatId: string;
      category: string;
    }> = [];

    const cancelledBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          seats: {
            include: { seat: true }
          },
          show: true
        }
      });

      if (!booking) {
        throw new Error('NOT_FOUND');
      }

      if (booking.userId !== userId) {
        throw new Error('FORBIDDEN');
      }

      if (booking.status === 'CANCELLED') {
        throw new Error('ALREADY_CANCELLED');
      }

      // Mark cancelled
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      });

      // Find waitlist users for these seats
      // We process seats by category
      const seatsByCategory: Record<string, string[]> = {};
      for (const bs of booking.seats) {
        if (!seatsByCategory[bs.seat.category]) {
          seatsByCategory[bs.seat.category] = [];
        }
        seatsByCategory[bs.seat.category].push(bs.seatId);
      }

      for (const [category, seatIds] of Object.entries(seatsByCategory)) {
        // Find the oldest waitlist entries for this category that don't have an active offer
        const waitlistEntries = await tx.waitlist.findMany({
          where: {
            showId: booking.showId,
            category: category,
            offer: null, // No existing offer
          },
          orderBy: {
            position: 'asc'
          },
          take: seatIds.length,
          include: {
            user: true
          }
        });

        // Match seats to waitlist entries
        for (let i = 0; i < waitlistEntries.length; i++) {
          const entry = waitlistEntries[i];
          const seatId = seatIds[i];

          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min to claim

          const newOffer = await tx.offer.create({
            data: {
              waitlistId: entry.id,
              seatId: seatId,
              expiresAt,
            }
          });

          waitlistOffersToMake.push({
            waitlistEntryId: entry.id,
            seatId: seatId,
            category: category
          });
        }
      }

      return updated;
    });

    // Send emails for the new offers
    for (const offerData of waitlistOffersToMake) {
      const offer = await prisma.offer.findFirst({
        where: { waitlistId: offerData.waitlistEntryId },
        include: {
          waitlist: {
            include: {
              user: true,
              show: {
                include: { event: true }
              }
            }
          }
        }
      });

      if (offer && offer.waitlist.user.email) {
        await sendWaitlistOfferEmail({
          to: offer.waitlist.user.email,
          eventName: offer.waitlist.show.event.title,
          showTime: offer.waitlist.show.date,
          expiresAt: offer.expiresAt,
          offerId: offer.id,
        });
      }
    }

    return NextResponse.json(cancelledBooking, { status: 200 });

  } catch (error: any) {
    console.error('Booking cancellation error:', error);
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (error.message === 'ALREADY_CANCELLED') return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
    
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
