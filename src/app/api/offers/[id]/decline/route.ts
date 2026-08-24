import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const offerId = params.id;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { waitlist: true }
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (offer.waitlist.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (offer.status !== 'PENDING') {
      return NextResponse.json({ error: 'Offer is no longer pending' }, { status: 400 });
    }

    // Mark the offer as DECLINED
    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: 'DECLINED' }
    });

    return NextResponse.json(updatedOffer, { status: 200 });
  } catch (error: any) {
    console.error('Decline offer error:', error);
    return NextResponse.json(
      { error: 'Failed to decline offer' }, 
      { status: 500 }
    );
  }
}
