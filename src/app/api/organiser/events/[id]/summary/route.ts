import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || ((session.user as any).role !== 'ORGANISER' && (session.user as any).role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const organiserId = (session.user as any).id;

    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        shows: {
          include: {
            venue: {
              include: {
                seats: true
              }
            },
            bookings: {
              where: {
                status: 'CONFIRMED'
              },
              include: {
                user: true,
                seats: {
                  include: { seat: true }
                }
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.organiserId !== organiserId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Aggregate data
    let totalRevenue = 0;
    let totalBookingsCount = 0;
    let totalSeatsSold = 0;
    let totalCapacity = 0;
    const recentBookings: any[] = [];

    event.shows.forEach(show => {
      totalCapacity += show.venue.seats.length;
      totalBookingsCount += show.bookings.length;
      
      show.bookings.forEach(booking => {
        totalRevenue += Number(booking.totalAmount);
        totalSeatsSold += booking.seats.length;
        recentBookings.push({
          id: booking.id,
          reference: booking.reference,
          userName: booking.user.name,
          userEmail: booking.user.email,
          seatsCount: booking.seats.length,
          totalAmount: Number(booking.totalAmount),
          createdAt: booking.createdAt,
        });
      });
    });

    // Sort recent bookings by newest
    recentBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        type: event.type,
      },
      summary: {
        totalRevenue,
        totalBookingsCount,
        totalSeatsSold,
        totalCapacity,
      },
      recentBookings: recentBookings.slice(0, 50), // Return top 50
    });

  } catch (error: any) {
    console.error('Summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
