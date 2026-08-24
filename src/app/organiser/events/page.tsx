export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { OrganiserNavbar } from '../../components/Navbar';
import PosterCard from '../../components/PosterCard';

export default async function OrganiserEventsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }
  
  if ((session.user as any).role !== 'ORGANISER' && (session.user as any).role !== 'ADMIN') {
    redirect('/events?error=unauthorized_organiser');
  }

  const userId = (session.user as any).id;

  const [events, totalShows, totalBookings] = await Promise.all([
    prisma.event.findMany({
      where: { organiserId: userId },
      include: { shows: { include: { venue: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.show.count({ where: { event: { organiserId: userId } } }),
    prisma.booking.count({ 
      where: { 
        status: 'CONFIRMED',
        show: { event: { organiserId: userId } }
      } 
    })
  ]);

  return (
    <div className="min-h-screen bg-background">
      <OrganiserNavbar userName={session.user?.name} activePage="events" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <span className="eyebrow">Organiser Dashboard</span>
            <h1 className="font-serif text-4xl text-charcoal">My Events</h1>
            <p className="text-charcoal/50 mt-1">Manage your events, shows, and ticket sales.</p>
          </div>
          <Link href="/organiser/events/new" className="btn-primary shrink-0">
            + New Event
          </Link>
        </div>
      </div>

      <main className="page-main">
        {/* Analytics Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Total Events</p>
            <p className="font-serif text-3xl text-charcoal">{events.length}</p>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Active Shows</p>
            <p className="font-serif text-3xl text-charcoal">{totalShows}</p>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Tickets Sold</p>
            <p className="font-serif text-3xl text-accent">{totalBookings}</p>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-4xl mb-4">🎬</div>
            <h3 className="font-serif text-xl mb-2 text-charcoal">No events yet</h3>
            <p className="text-charcoal/50 mb-6">Create your first event to get started.</p>
            <Link href="/organiser/events/new" className="btn-primary">
              Create Event
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-charcoal/40 mb-6">{events.length} event{events.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((event) => (
                <PosterCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  type={event.type}
                  imageUrl={event.imageUrl}
                  description={event.description}
                  showCount={event.shows.length}
                  href={`/organiser/events/${event.id}/summary`}
                  cta="View Summary →"
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
