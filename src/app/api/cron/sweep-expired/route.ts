import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// This should ideally be protected by a cron secret in production
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // 1. Delete expired seat holds
    const deletedHolds = await prisma.seatHold.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // 2. Mark expired offers as EXPIRED
    const expiredOffers = await prisma.offer.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 3. (Optional but good) For any expired offers, we should cascade to the next person on the waitlist
    // We would need to find all offers that just expired and trigger the waitlist logic for those seats.
    // To keep the sweep simple and fast, we can just delete/expire them here, and the next time someone
    // looks at the map or a cancel happens, it will clean up. But for completeness, we should 
    // ideally dispatch a job to find next waitlist users. For now, we'll return the counts.

    return NextResponse.json({
      success: true,
      message: 'Sweep completed successfully',
      deletedHolds: deletedHolds.count,
      expiredOffers: expiredOffers.count,
    });
  } catch (error) {
    console.error('Sweep error:', error);
    return NextResponse.json(
      { error: 'Failed to sweep expired records' },
      { status: 500 }
    );
  }
}
