import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendTicketTransferEmail } from '@/lib/email';
import { z } from 'zod';

const TransferSchema = z.object({
  seatId: z.string().uuid({ message: "Invalid seat ID format" }),
  transferEmail: z.string().email({ message: "Invalid email address" })
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const bookingId = params.id;
    
    const body = await request.json();
    const parsed = TransferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { seatId, transferEmail } = parsed.data;

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { email: transferEmail }
    });

    if (!recipient) {
      return NextResponse.json({ 
        error: 'No account found with this email. They must create an account first.' 
      }, { status: 404 });
    }

    if (recipient.id === userId) {
      return NextResponse.json({ error: 'You cannot transfer a ticket to yourself.' }, { status: 400 });
    }

    // Start a transaction
    await prisma.$transaction(async (tx) => {
      // Find the booking and verify ownership
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { 
          seats: { include: { seat: true } },
          show: { include: { event: true } }
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new Error('You do not have permission to transfer this ticket');
      }

      if (booking.status !== 'CONFIRMED') {
        throw new Error('Cannot transfer seats from a cancelled booking');
      }

      // Find the specific BookingSeat
      const bookingSeat = booking.seats.find((s: any) => s.seatId === seatId);
      
      if (!bookingSeat) {
        throw new Error('This seat is not part of the booking');
      }

      // We will create a new Booking for the recipient with cost 0 (since it's a transfer)
      const reference = 'TRF-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      const newBooking = await tx.booking.create({
        data: {
          userId: recipient.id,
          showId: booking.showId,
          status: 'CONFIRMED',
          reference,
          totalAmount: 0,
        }
      });

      // Update the BookingSeat to point to the new Booking
      await tx.bookingSeat.update({
        where: { id: bookingSeat.id },
        data: { bookingId: newBooking.id }
      });
      
      // Get sender details
      const sender = await tx.user.findUnique({ where: { id: userId } });

      // Create TicketTransfer record
      await tx.ticketTransfer.create({
        data: {
          senderId: userId,
          recipientId: recipient.id,
          seatId: seatId,
          originalBookingId: bookingId,
          newBookingId: newBooking.id
        }
      });

      // Create Notification for recipient
      await tx.notification.create({
        data: {
          userId: recipient.id,
          title: 'Ticket Transferred',
          message: `${sender?.name || 'A friend'} transferred a ticket for ${booking.show.event.title} to you!`,
          link: '/history'
        }
      });

      // Keep the original booking's totalAmount untouched so the buyer's receipt remains accurate.
      
      // Send email notification
      sendTicketTransferEmail({
        to: recipient.email,
        eventName: booking.show.event.title,
        showTime: booking.show.date,
        reference: newBooking.reference,
        seat: `${bookingSeat.seat.row}${bookingSeat.seat.number}`,
        fromName: sender?.name || 'A friend'
      }).catch(console.error);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Transfer error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
