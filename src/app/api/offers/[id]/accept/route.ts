import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendBookingConfirmationEmail } from '@/lib/email';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

function generateReference() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

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
    const userEmail = session.user.email!;
    const offerId = params.id;

    const booking = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: {
          waitlist: {
            include: {
              show: {
                include: {
                  event: true,
                  prices: true,
                }
              }
            }
          },
        }
      });

      if (!offer) {
        throw new Error('NOT_FOUND');
      }

      if (offer.waitlist.userId !== userId) {
        throw new Error('FORBIDDEN');
      }

      if (offer.status !== 'PENDING') {
        throw new Error('NOT_PENDING');
      }

      if (offer.expiresAt < new Date()) {
        throw new Error('EXPIRED');
      }

      const show = offer.waitlist.show;
      const priceRecord = show.prices.find(p => p.category === offer.waitlist.category);
      if (!priceRecord) {
        throw new Error('PRICE_NOT_FOUND');
      }
      const totalAmount = Number(priceRecord.price);

      // Create booking
      const reference = generateReference();
      const newBooking = await tx.booking.create({
        data: {
          userId,
          showId: show.id,
          reference,
          totalAmount,
          status: 'CONFIRMED',
          seats: {
            create: [
              { seatId: offer.seatId }
            ]
          }
        },
        include: {
          seats: {
            include: { seat: true }
          },
          show: {
            include: { event: true }
          }
        }
      });

      // Mark offer as accepted
      await tx.offer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED' }
      });

      return newBooking;
    });

    // Send confirmation email
    const seatNames = booking.seats.map(bs => `${bs.seat.row}${bs.seat.number} (${bs.seat.category})`);
    
    await sendBookingConfirmationEmail({
      to: userEmail,
      eventName: booking.show.event.title,
      showTime: booking.show.date,
      reference: booking.reference,
      seats: seatNames,
    });

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
    console.error('Offer accept error:', error);
    
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (error.message === 'NOT_PENDING') return NextResponse.json({ error: 'Offer is not pending' }, { status: 400 });
    if (error.message === 'EXPIRED') return NextResponse.json({ error: 'Offer has expired' }, { status: 400 });
    if (error.message === 'PRICE_NOT_FOUND') return NextResponse.json({ error: 'Configuration error: seat price not found' }, { status: 500 });
    
    return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 });
  }
}
