import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWaitlistOfferEmail } from '@/lib/email';

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
    const waitlistId = params.id;

    // We do this outside the transaction so we can send emails after
    let newOfferToMake: any = null;

    await prisma.$transaction(async (tx) => {
      const waitlist = await tx.waitlist.findUnique({
        where: { id: waitlistId },
        include: { offer: true }
      });

      if (!waitlist) {
        throw new Error('NOT_FOUND');
      }

      if (waitlist.userId !== userId) {
        throw new Error('FORBIDDEN');
      }

      if (waitlist.offer && waitlist.offer.status === 'ACCEPTED') {
        throw new Error('ALREADY_ACCEPTED');
      }

      // If there is an active offer, we need to pass it to the next person
      if (waitlist.offer && waitlist.offer.status === 'PENDING') {
        const seatId = waitlist.offer.seatId;

        // Delete the current offer
        await tx.offer.delete({
          where: { id: waitlist.offer.id }
        });

        // Find the next person in line
        const nextInLine = await tx.waitlist.findFirst({
          where: {
            showId: waitlist.showId,
            category: waitlist.category,
            position: { gt: 0 },
            offer: null,
            id: { not: waitlist.id } // Exclude current
          },
          orderBy: { position: 'asc' },
          include: {
            user: true,
            show: {
              include: { event: true }
            }
          }
        });

        if (nextInLine) {
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 15);

          const newOffer = await tx.offer.create({
            data: {
              waitlistId: nextInLine.id,
              seatId: seatId,
              expiresAt,
            }
          });

          newOfferToMake = {
            to: nextInLine.user.email,
            eventName: nextInLine.show.event.title,
            showTime: nextInLine.show.date,
            expiresAt,
            offerId: newOffer.id,
          };
        }
      } else if (waitlist.offer) {
        // Just delete the expired/declined offer to cleanly delete waitlist
        await tx.offer.delete({
          where: { id: waitlist.offer.id }
        });
      }

      // Decrement position of all waitlist entries behind this one
      await tx.waitlist.updateMany({
        where: {
          showId: waitlist.showId,
          category: waitlist.category,
          position: { gt: waitlist.position }
        },
        data: {
          position: { decrement: 1 }
        }
      });

      // Finally, mark the waitlist entry as LEFT by setting position to -1
      await tx.waitlist.update({
        where: { id: waitlistId },
        data: { position: -1 }
      });
    });

    if (newOfferToMake) {
      await sendWaitlistOfferEmail(newOfferToMake);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Leave waitlist error:', error);
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (error.message === 'ALREADY_ACCEPTED') return NextResponse.json({ error: 'Cannot leave a completed waitlist' }, { status: 400 });
    
    return NextResponse.json({ error: 'Failed to leave waitlist' }, { status: 500 });
  }
}
