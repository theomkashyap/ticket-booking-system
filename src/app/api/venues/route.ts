import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const venueSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  rowCount: z.number().int().min(1).max(26),
  seatsPerRow: z.number().int().min(1).max(100),
  category: z.string().min(1, 'Category is required'),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = venueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, address, rowCount, seatsPerRow, category } = parsed.data;

    // Create the venue and its seats in a transaction
    const venue = await prisma.$transaction(async (tx) => {
      const newVenue = await tx.venue.create({
        data: {
          name,
          address,
          adminId,
        },
      });

      const seatsToCreate = [];
      const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (let r = 0; r < rowCount; r++) {
        const rowLetter = rows[r % 26]; // Just wrap around for simplicity if > 26 rows
        
        let seatCategory = 'VIP';
        if (category === 'Tiered') {
            if (r < Math.ceil(rowCount * 0.5)) seatCategory = 'General'; // First 50%
            else if (r < Math.ceil(rowCount * 0.8)) seatCategory = 'Premium'; // Next 30%
            else seatCategory = 'VIP'; // Last 20%
        } else {
            seatCategory = category;
        }

        for (let n = 1; n <= seatsPerRow; n++) {
          seatsToCreate.push({
            venueId: newVenue.id,
            row: rowLetter,
            number: n,
            category: seatCategory,
          });
        }
      }

      await tx.seat.createMany({
        data: seatsToCreate,
      });

      return newVenue;
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error: any) {
    console.error('Venue creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(venues);
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}
