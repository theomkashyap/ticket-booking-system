export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AppNavbar } from '@/app/components/Navbar';
import Link from 'next/link';
import { QRCodeDisplay } from '@/app/components/QRCodeDisplay';
import { TransferTicketButton } from '@/app/components/TransferTicketButton';
import { DownloadTicketButton } from '@/app/components/DownloadTicketButton';

export default async function TicketsPage({ params }: { params: { bookingId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
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
      }
    }
  });

  if (!booking || (booking.userId !== userId && (session.user as any).role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar userName={session.user?.name} activeLink="history" />
        <div className="container-main py-20 text-center">
          <h1 className="font-serif text-3xl text-charcoal mb-4">Ticket Not Found</h1>
          <p className="text-charcoal/60 mb-8">This ticket does not exist or you do not have permission to view it.</p>
          <Link href="/history" className="btn-primary">Return to History</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <AppNavbar userName={session.user?.name} activeLink="history" />
      
      <div className="relative z-10 flex-1">
        {/* Header */}
        <div className="pt-8 pb-10">
          <div className="container-main">
            <Link href="/history" className="text-charcoal/60 hover:text-charcoal text-sm mb-6 inline-flex items-center gap-2 transition-colors">
              ← Back to Bookings
            </Link>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
              <div>
                <span className="eyebrow block mb-2 text-accent tracking-[0.2em] font-bold text-[10px]">Digital Tickets</span>
                <h1 className="font-serif text-4xl md:text-5xl text-charcoal">{booking.show.event.title}</h1>
              </div>
              <div className="text-left md:text-right bg-white border border-charcoal/10 p-3 rounded-lg shadow-sm">
                <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-[0.2em] mb-1">Booking Ref</p>
                <p className="font-mono text-xl font-bold tracking-wider text-accent">{booking.reference}</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-charcoal/70 text-sm border-t border-charcoal/10 pt-4 mt-2">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(booking.show.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}
              </div>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {booking.show.venue.name} <span className="opacity-50 mx-2">•</span> {booking.show.venue.address}
              </div>
            </div>
          </div>
        </div>

        <main className="container-main pb-16">
          <div className="flex flex-col gap-6 mt-4">
            {booking.seats.map((bookingSeat) => {
              const qrData = `ticket:${bookingSeat.id}:${booking.reference}`;
              
              return (
                <div key={bookingSeat.id} id={`ticket-${bookingSeat.id}`} className="ticket-card">
                  <div className="ticket-details-section">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Admit One</p>
                        <div className="bg-white/10 rounded px-2 py-0.5 font-mono text-[10px] text-white/60">
                          ID: {bookingSeat.id.split('-')[0]}
                        </div>
                      </div>
                      <div className="mb-5 pb-4 border-b border-white/10">
                        <h2 className="font-serif text-xl md:text-2xl text-white leading-tight mb-1">{booking.show.event.title}</h2>
                        <div className="flex flex-col gap-0.5 text-white/60 text-xs">
                          <p>{new Date(booking.show.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
                          <p>{booking.show.venue.name}</p>
                        </div>
                      </div>
                      
                      <h3 className="font-serif text-2xl md:text-3xl text-white mb-4">Seat {bookingSeat.seat.row}{bookingSeat.seat.number}</h3>
                      
                      <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/90">
                        <span className="text-accent text-[10px]">★</span> Category: <span className="font-semibold text-white ml-1">{bookingSeat.seat.category}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3">
                      <div className="w-full sm:w-auto z-20 flex flex-col sm:flex-row gap-3" data-html2canvas-ignore="true">
                        <DownloadTicketButton targetId={`ticket-${bookingSeat.id}`} ticketId={bookingSeat.id.split('-')[0]} />
                        {booking.status === 'CONFIRMED' && (
                          <TransferTicketButton bookingId={booking.id} seatId={bookingSeat.seat.id} />
                        )}
                      </div>
                      {booking.status !== 'CONFIRMED' && (
                        <span className="text-sm font-medium text-red-500 py-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>
                          Booking Cancelled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ticket-qr-section">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm">
                      <QRCodeDisplay text={qrData} size={110} />
                    </div>
                    <p className="mt-4 font-mono text-[9px] text-white/40 tracking-[0.2em] uppercase">Scan at entry</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {booking.seats.length === 0 && (
            <div className="border border-charcoal/10 bg-white rounded-2xl text-center py-20 mt-10 shadow-sm">
              <h3 className="font-serif text-2xl mb-3 text-charcoal">No Seats Found</h3>
              <p className="text-charcoal/50">It looks like there are no seats attached to this booking.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
