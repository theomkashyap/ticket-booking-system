export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CancelButton from './CancelButton';
import LeaveWaitlistButton from './LeaveWaitlistButton';
import { prisma } from '@/lib/prisma';
import { AppNavbar } from '../components/Navbar';

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  let bookings: any[] = [];
  let waitlists: any[] = [];
  let dbError = false;

  try {
    bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            event: true,
            venue: true
          }
        },
        seats: {
          include: {
            seat: true
          }
        },
        originalTransfers: {
          include: { recipient: true, seat: true }
        },
        newTransfers: {
          include: { sender: true }
        }
      }
    });
    
    waitlists = await prisma.waitlist.findMany({
      where: { userId },
      include: {
        show: {
          include: {
            event: true,
            venue: true
          }
        },
        offer: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate real-time active queue position
    for (const wl of waitlists) {
      if (!wl.offer) {
        const activeAheadCount = await prisma.waitlist.count({
          where: {
            showId: wl.showId,
            category: wl.category,
            createdAt: { lt: wl.createdAt },
            offer: null // Only count people who haven't received an offer yet
          }
        });
        wl.currentPosition = activeAheadCount + 1;
      }
    }
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    dbError = true;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar userName={session.user?.name} activeLink="history" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10">
          <span className="eyebrow">Your Account</span>
          <h1 className="font-serif text-4xl text-charcoal">My Bookings</h1>
          <p className="text-charcoal/50 mt-1">All your confirmed and past tickets.</p>
        </div>
      </div>

      <main className="page-main">
        {dbError ? (
          <div className="card border-accent/20 bg-accent/5 text-center py-16">
            <div className="text-3xl mb-4">⚠️</div>
            <h3 className="font-serif text-xl mb-2 text-accent">Connection Error</h3>
            <p className="text-charcoal/60 max-w-md mx-auto">We couldn't reach the database. Try a mobile hotspot or VPN.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="card text-center py-20">

            <h3 className="font-serif text-xl mb-2 text-charcoal">No bookings yet</h3>
            <p className="text-charcoal/50 mb-6">Browse events and grab your first ticket!</p>
            <Link href="/events" className="btn-primary">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="card-hover">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-serif text-xl text-charcoal">{booking.show.event.title}</h3>
                      <span className={`badge ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                        booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                        'bg-charcoal/10 text-charcoal'
                      }`}>
                        {booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal/55">
                      {new Date(booking.show.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                      &nbsp;&bull;&nbsp;{booking.show.venue.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs text-charcoal/40 uppercase tracking-wider">Ref</p>
                    <p className="font-mono text-sm font-semibold text-charcoal">{booking.reference}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-charcoal/8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 text-sm text-charcoal/60">
                    <span>
                      <span className="font-semibold text-charcoal">Seats:</span>{' '}
                      {booking.seats.map((s: any) => `${s.seat.row}${s.seat.number}`).join(', ')}
                    </span>
                    <span>
                      <span className="font-semibold text-charcoal">Total:</span>{' '}
                      ₹{Number(booking.totalAmount).toFixed(2)}
                    </span>
                    {booking.newTransfers?.length > 0 && (
                      <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                        Received from {booking.newTransfers[0].sender.name}
                      </span>
                    )}
                    {booking.originalTransfers?.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {booking.originalTransfers.map((t: any) => (
                          <span key={t.id} className="bg-charcoal/10 text-charcoal/70 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block">
                            Transferred {t.seat.row}{t.seat.number} to {t.recipient.name} ({t.recipient.email})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {booking.status === 'CONFIRMED' && booking.seats.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Link href={`/tickets/${booking.id}`} className="btn-primary py-1.5 px-4 text-sm font-medium rounded">
                        View Tickets
                      </Link>
                      <CancelButton bookingId={booking.id} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Waitlist Section */}
        {!dbError && waitlists.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-3xl text-charcoal mb-6 border-b border-charcoal/10 pb-4">Waitlists & Offers</h2>
            <div className="space-y-4">
              {waitlists.map(waitlist => (
                <div key={waitlist.id} className="card-hover border border-charcoal/10 relative overflow-hidden">
                  {waitlist.offer?.status === 'PENDING' && (
                    <div className="absolute top-0 right-0 bg-accent text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                      ACTION REQUIRED
                    </div>
                  )}
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-serif text-xl text-charcoal">{waitlist.show.event.title}</h3>
                        <span className={`badge ${
                          waitlist.position === -1 ? 'bg-charcoal/10 text-charcoal/50' :
                          waitlist.offer?.status === 'PENDING' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          waitlist.offer?.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          waitlist.offer?.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                          waitlist.offer?.status === 'DECLINED' ? 'bg-charcoal/20 text-charcoal/60' :
                          'bg-charcoal/10 text-charcoal'
                        }`}>
                          {waitlist.position === -1 ? 'LEFT' : (waitlist.offer?.status || 'WAITING')}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal/60 mb-2">
                        {new Date(waitlist.show.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                        &nbsp;&bull;&nbsp;{waitlist.show.venue.name}
                      </p>
                      <p className="text-sm font-medium text-charcoal/70">
                        Category: {waitlist.category}
                        {!waitlist.offer && waitlist.position !== -1 && (
                          <span className="ml-4 opacity-70">Queue Position: #{waitlist.currentPosition}</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      {waitlist.position === -1 ? (
                        <p className="text-sm text-charcoal/50 font-medium">Left Waitlist</p>
                      ) : waitlist.offer?.status === 'PENDING' ? (
                        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                          <p className="text-xs text-orange-600 font-medium">Expires: {new Date(waitlist.offer.expiresAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
                          <Link href={`/offers/${waitlist.offer.id}`} className="btn-primary py-2 px-6">
                            Accept Offer
                          </Link>
                          <LeaveWaitlistButton waitlistId={waitlist.id} />
                        </div>
                      ) : waitlist.offer?.status === 'ACCEPTED' ? (
                        <p className="text-sm text-green-600 font-medium">Booked</p>
                      ) : waitlist.offer?.status === 'EXPIRED' ? (
                        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                          <p className="text-sm text-red-600 font-medium">Offer Expired</p>
                        </div>
                      ) : waitlist.offer?.status === 'DECLINED' ? (
                        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                          <p className="text-sm text-charcoal/50 font-medium">Offer Declined</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                          <p className="text-sm text-charcoal/40 italic">Waiting for availability...</p>
                          <LeaveWaitlistButton waitlistId={waitlist.id} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}