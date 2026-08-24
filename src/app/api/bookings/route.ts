import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

function generateReference() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g., 'A1B2C3D4'
}

import { z } from 'zod';

const bookingSchema = z.object({
  holdIds: z.array(z.string()).min(1, 'At least one hold ID is required'),
  showId: z.string().min(1, 'Show ID is required'),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email!;
    
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { holdIds, showId } = parsed.data;

    const booking = await prisma.$transaction(async (tx) => {
      // 1. Fetch the holds and verify they exist, belong to the user, and are not expired
      const holds = await tx.seatHold.findMany({
        where: {
          id: { in: holdIds },
          userId,
          showId,
        },
        include: {
          seat: true,
          show: {
            include: {
              event: true,
              prices: true,
            }
          }
        }
      });

      if (holds.length !== holdIds.length) {
        throw new Error('INVALID_HOLDS');
      }

      const now = new Date();
      for (const hold of holds) {
        if (hold.expiresAt < now) {
          throw new Error('EXPIRED_HOLDS');
        }
      }

      // 2. Calculate total amount
      const showWithPrices = await tx.show.findUnique({
        where: { id: showId },
        include: { prices: true }
      });

      if (!showWithPrices || !showWithPrices.prices) {
        console.error('Show or prices missing:', showWithPrices);
        throw new Error('PRICE_NOT_FOUND: Show prices missing from database');
      }

      let totalAmount = 0;
      for (const hold of holds) {
        const priceRecord = showWithPrices.prices.find(p => p.category === hold.seat.category);
        if (!priceRecord) {
          console.error('Price missing for category:', hold.seat.category);
          console.error('Available prices for show:', showWithPrices.prices);
          throw new Error(`PRICE_NOT_FOUND: No price for category ${hold.seat.category}`);
        }
        totalAmount += Number(priceRecord.price);
      }

      // 3. Create the Booking and BookingSeats
      const reference = generateReference();
      
      const newBooking = await tx.booking.create({
        data: {
          userId,
          showId,
          reference,
          totalAmount,
          status: 'CONFIRMED',
          seats: {
            create: holds.map(hold => ({
              seatId: hold.seatId
            }))
          }
        },
        include: {
          seats: {
            include: {
              seat: true,
            }
          },
          show: {
            include: {
              event: true,
            }
          }
        }
      });

      // 4. Delete the holds
      await tx.seatHold.deleteMany({
        where: {
          id: { in: holdIds }
        }
      });

      return newBooking;
    },
    {
      maxWait: 5000, // default: 2000
      timeout: 15000, // default: 5000
    });

    // Send confirmation email (fails gracefully)
    const seatNames = booking.seats.map(bs => `${bs.seat.row}${bs.seat.number} (${bs.seat.category})`);
    
    await sendBookingConfirmationEmail({
      to: userEmail,
      eventName: booking.show.event.title,
      showTime: booking.show.date,
      reference: booking.reference,
      seats: seatNames,
    });

    // Clear Next.js cache so the UI updates immediately
    revalidatePath('/history');
    revalidatePath(`/shows/${showId}/seatmap`);

    // Generate QR code for the booking reference
    const qrCodeDataUrl = await QRCode.toDataURL(booking.reference, {
      color: {
        dark: '#2A2A2A', // charcoal
        light: '#FFFFFF'
      },
      margin: 2
    });

    return NextResponse.json({ ...booking, qrCodeDataUrl }, { status: 201 });

  } catch (error: any) {
    console.error('Booking creation error:', error);
    
    if (error.message === 'INVALID_HOLDS') {
      return NextResponse.json({ error: 'One or more holds are invalid or do not belong to you' }, { status: 400 });
    }
    if (error.message === 'EXPIRED_HOLDS') {
      return NextResponse.json({ error: 'One or more holds have expired' }, { status: 400 });
    }
    if (error.message && error.message.startsWith('PRICE_NOT_FOUND')) {
      return NextResponse.json({ error: 'Configuration error: seat price not found' }, { status: 500 });
    }
    
    return NextResponse.json(
      { error: 'Failed to create booking' }, 
      { status: 500 }
    );
  }
}
