export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AppNavbar, PublicNavbar } from '../../components/Navbar';

export default async function EventDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions);

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      shows: {
        where: {
          date: { gte: new Date() }
        },
        orderBy: {
          date: 'asc'
        },
        include: {
          venue: true,
          prices: true
        }
      }
    }
  });

  if (!event) {
    notFound();
  }

  const isMovie = event.type === 'MOVIE';
  const userRole = session ? (session.user as any).role : null;
  const canBook = !userRole || userRole === 'CUSTOMER';

  return (
    <div className="min-h-screen bg-background">
      {session ? (
        <AppNavbar userName={session.user?.name} activeLink="events" />
      ) : (
        <PublicNavbar />
      )}

      {/* Split layout */}
      <main className="container-main py-10 md:py-16">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16 items-start">

          {/* Left Column: Poster / Info */}
          <div className="w-full md:w-[360px] shrink-0">
            {/* The Poster visual */}
            <div className={`relative h-[400px] rounded-xl mb-6 overflow-hidden ${!event.imageUrl && (isMovie ? 'poster-bg-movie' : 'poster-bg-concert')}`}>
              {event.imageUrl && (
                <>
                  <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent pointer-events-none" />
                </>
              )}
              
              {!event.imageUrl && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: isMovie
                      ? `linear-gradient(135deg, transparent 20%, rgba(200,16,46,0.2) 100%)`
                      : `linear-gradient(135deg, transparent 20%, rgba(200,140,30,0.2) 100%)`
                  }}
                />
              )}
              <div className="absolute top-4 left-4 z-10">
                <span className={isMovie ? 'badge-movie' : 'badge-concert'}>
                  {isMovie ? 'Movie' : 'Concert'}
                </span>
              </div>
            </div>

            <h1 className="font-serif text-4xl leading-snug text-charcoal mb-4">{event.title}</h1>
            {event.description && (
              <p className="text-sm text-charcoal/60 leading-relaxed">{event.description}</p>
            )}
          </div>

          {/* Right Column: Showtimes */}
          <div className="flex-1 w-full">
            <div className="bg-white border border-charcoal/10 rounded-xl p-8">
              <span className="eyebrow">{event.type}</span>
              <h2 className="font-serif text-3xl text-charcoal mb-8 border-b border-charcoal/8 pb-6">
                Available Showtimes
              </h2>

              {event.shows.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-3xl mb-3">🗓️</div>
                  <h3 className="font-serif text-lg mb-1 text-charcoal">No upcoming shows</h3>
                  <p className="text-sm text-charcoal/50">Check back later for new dates.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {event.shows.map(show => {
                    const price = Math.min(...show.prices.map(p => Number(p.price))).toFixed(2);
                    const showtimeRow = (
                      <div className={`showtime-row ${canBook ? 'group cursor-pointer' : ''}`}>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 flex-1">
                          <span className={`font-semibold text-charcoal transition-colors ${canBook ? 'group-hover:text-accent' : ''}`}>
                            {new Date(show.date).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-charcoal/30">•</span>
                          <span className="text-charcoal/80 font-medium">
                            {new Date(show.date).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="text-charcoal/30">•</span>
                          <span className="text-charcoal/60">{show.venue.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xs text-charcoal/40">From ₹{price}</span>
                          {canBook && (
                            <span className="text-accent group-hover:translate-x-1 transition-transform">→</span>
                          )}
                        </div>
                      </div>
                    );

                    return canBook ? (
                      <Link key={show.id} href={`/shows/${show.id}/seatmap`} className="block">
                        {showtimeRow}
                      </Link>
                    ) : (
                      <div key={show.id} className="block opacity-75">
                        {showtimeRow}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}