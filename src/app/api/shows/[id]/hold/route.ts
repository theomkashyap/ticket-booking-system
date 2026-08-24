import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const HoldSeatSchema = z.object({
  seatId: z.string().uuid({ message: "Invalid seat ID format" })
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const showId = params.id;
    
    const body = await req.json();
    const parsed = HoldSeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { seatId } = parsed.data;

    // Verify the show exists and get its TTL
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { holdTtlMins: true }
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + show.holdTtlMins);

    // Attempt to create the hold inside a transaction
    // The @@unique([showId, seatId]) constraint will make this fail if the seat is already held
    const hold = await prisma.$transaction(async (tx) => {
      // Lazy expiry check: First check if there's an expired hold we should clean up
      const existingHold = await tx.seatHold.findUnique({
        where: {
          showId_seatId: {
            showId,
            seatId,
          }
        }
      });

      // Check for active offers on this seat
      const activeOffer = await tx.offer.findFirst({
        where: {
          seatId,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        }
      });

      if (activeOffer) {
        throw new Error('SEAT_UNAVAILABLE');
      }

      if (existingHold) {
        if (existingHold.expiresAt < new Date()) {
          // It's expired, delete it so we can create a new one
          await tx.seatHold.delete({
            where: { id: existingHold.id }
          });
        } else if (existingHold.userId === userId) {
          // The same user already holds it, just refresh the TTL
          return tx.seatHold.update({
            where: { id: existingHold.id },
            data: { expiresAt }
          });
        } else {
          // Someone else holds it and it's not expired
          throw new Error('SEAT_UNAVAILABLE');
        }
      }

      // Create new hold
      return tx.seatHold.create({
        data: {
          showId,
          seatId,
          userId,
          expiresAt,
        }
      });
    });

    return NextResponse.json(hold, { status: 201 });

  } catch (error: any) {
    if (error.message === 'SEAT_UNAVAILABLE' || error.code === 'P2002') {
      // P2002 is Prisma's unique constraint violation error code
      return NextResponse.json(
        { error: 'This seat is no longer available' }, 
        { status: 409 }
      );
    }

    console.error('Seat hold error:', error);
    return NextResponse.json(
      { error: 'Failed to hold seat' }, 
      { status: 500 }
    );
  }
}

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
    const showId = params.id;
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      // Fallback to searchParams if no JSON body
      const url = new URL(req.url);
      body = { seatId: url.searchParams.get('seatId') };
    }

    const parsed = HoldSeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { seatId } = parsed.data;

    // Delete the specific seat hold for this user
    await prisma.seatHold.deleteMany({
      where: {
        showId,
        seatId,
        userId
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Seat hold release error:', error);
    return NextResponse.json(
      { error: 'Failed to release seat hold' }, 
      { status: 500 }
    );
  }
}
