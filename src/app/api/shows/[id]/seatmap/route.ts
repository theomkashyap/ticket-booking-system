import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { unstable_cache } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const getCachedShow = unstable_cache(
  async (showId: string) => {
    return prisma.show.findUnique({
      where: { id: showId },
      include: {
        event: true,
        venue: {
          include: {
            seats: true
          }
        },
        prices: true,
      }
    });
  },
  ['show-seatmap'],
  { revalidate: 3600, tags: ['shows'] }
);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session ? (session.user as any).id : null;
    const showId = params.id;

    const show = await getCachedShow(showId);

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Get active holds and bookings for this show
    const now = new Date();
    const [activeHolds, bookings, activeOffers] = await Promise.all([
      prisma.seatHold.findMany({
        where: { showId, expiresAt: { gt: now } }
      }),
      prisma.bookingSeat.findMany({
        where: { booking: { showId, status: 'CONFIRMED' } }
      }),
      prisma.offer.findMany({
        where: {
          waitlist: { showId },
          status: 'PENDING',
          expiresAt: { gt: now }
        }
      })
    ]);

    // Map seat statuses
    const holdMap = new Map(activeHolds.map(h => [h.seatId, h]));
    const bookedSet = new Set(bookings.map(b => b.seatId));
    const offerSet = new Set(activeOffers.map(o => o.seatId));

    const seats = show.venue.seats.map(seat => {
      let status = 'AVAILABLE';
      let isHeldByMe = false;
      let holdId = null;
      let expiresAt = null;

      if (bookedSet.has(seat.id)) {
        status = 'BOOKED';
      } else if (offerSet.has(seat.id)) {
        status = 'HELD'; // Treat active offers as held so others can't take them
      } else if (holdMap.has(seat.id)) {
        status = 'HELD';
        const hold = holdMap.get(seat.id)!;
        if (userId && hold.userId === userId) {
          isHeldByMe = true;
          holdId = hold.id;
          expiresAt = hold.expiresAt;
        }
      }

      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        category: seat.category,
        status,
        isHeldByMe,
        holdId,
        expiresAt
      };
    });

    return NextResponse.json({ show, seats });
  } catch (error: any) {
    console.error('Seatmap API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate seatmap' },
      { status: 500 }
    );
  }
}
