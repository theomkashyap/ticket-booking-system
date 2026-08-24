import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWaitlistJoinEmail } from '@/lib/email';
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    const body = await req.json();
    const { showId, category } = body;

    if (!showId || !category) {
      return NextResponse.json({ error: 'Show ID and category are required' }, { status: 400 });
    }

    const waitlistEntry = await prisma.$transaction(async (tx) => {
      // Find the current max position for this show and category
      const maxPositionEntry = await tx.waitlist.findFirst({
        where: {
          showId,
          category,
        },
        orderBy: {
          position: 'desc',
        },
      });

      const nextPosition = maxPositionEntry ? maxPositionEntry.position + 1 : 1;

      // Create new waitlist entry
      return tx.waitlist.create({
        data: {
          showId,
          userId,
          category,
          position: nextPosition,
        },
        include: {
          user: true,
          show: {
            include: { event: true }
          }
        }
      });
    });

    // Send confirmation email
    if (waitlistEntry.user?.email) {
      await sendWaitlistJoinEmail({
        to: waitlistEntry.user.email,
        eventName: waitlistEntry.show.event.title,
        showTime: waitlistEntry.show.date,
        category: waitlistEntry.category,
      });
    }

    return NextResponse.json(waitlistEntry, { status: 201 });
  } catch (error: any) {
    console.error('Waitlist join error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist' }, 
      { status: 500 }
    );
  }
}
