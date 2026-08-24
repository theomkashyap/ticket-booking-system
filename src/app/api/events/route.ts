import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, EventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || ((session.user as any).role !== 'ORGANISER' && (session.user as any).role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organiserId = (session.user as any).id;
    const body = await req.json();
    const { title, type, description, imageUrl, venueId, date, holdTtlMins, prices } = body;

    if (!title || !type || !venueId || !date || !prices || !Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title,
          type: type as EventType,
          description,
          imageUrl,
          organiserId,
        },
      });

      const newShow = await tx.show.create({
        data: {
          eventId: newEvent.id,
          venueId,
          date: new Date(date),
          holdTtlMins: Number(holdTtlMins) || 10,
        },
      });

      const pricesToCreate = prices.map((p: any) => ({
        showId: newShow.id,
        category: p.category,
        price: p.price,
      }));

      await tx.showPrice.createMany({
        data: pricesToCreate,
      });

      return newEvent;
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
