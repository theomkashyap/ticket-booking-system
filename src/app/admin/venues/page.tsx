export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AdminNavbar } from '../../components/Navbar';

export default async function AdminVenuesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }
  
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/events?error=unauthorized_admin');
  }

  const [venues, totalShows, totalBookings, totalUsers] = await Promise.all([
    prisma.venue.findMany({
      include: { seats: true },
      orderBy: { name: 'asc' },
    }),
    prisma.show.count(),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.user.count()
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar userName={session.user?.name} activePage="venues" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <span className="eyebrow">Admin Dashboard</span>
            <h1 className="font-serif text-4xl text-charcoal">System Overview</h1>
            <p className="text-charcoal/50 mt-1">Manage your platform and venues.</p>
          </div>
          <Link href="/admin/venues/new" className="btn-primary shrink-0">
            + New Venue
          </Link>
        </div>
      </div>

      <main className="page-main">
        {/* Analytics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Total Users</p>
            <p className="font-serif text-3xl text-charcoal">{totalUsers}</p>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Active Venues</p>
            <p className="font-serif text-3xl text-charcoal">{venues.length}</p>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Total Shows</p>
            <p className="font-serif text-3xl text-charcoal">{totalShows}</p>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-bold text-charcoal/50 uppercase tracking-widest mb-1">Tickets Booked</p>
            <p className="font-serif text-3xl text-accent">{totalBookings}</p>
          </div>
        </div>
        {venues.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-4xl mb-4">🏛️</div>
            <h3 className="font-serif text-xl mb-2 text-charcoal">No venues yet</h3>
            <p className="text-charcoal/50 mb-6">Create your first venue to get started.</p>
            <Link href="/admin/venues/new" className="btn-primary">
              Create Venue
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-charcoal/40 mb-6">{venues.length} venue{venues.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {venues.map((venue) => (
                <div key={venue.id} className="card-hover flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-charcoal/40 uppercase tracking-wider">Venue</span>
                    <span className="stat-pill">{venue.seats.length} seats</span>
                  </div>
                  <h3 className="font-serif text-xl text-charcoal mt-3 mb-1 flex-grow">{venue.name}</h3>
                  <p className="text-sm text-charcoal/50 mb-5">{venue.address}</p>

                  <div className="mt-auto pt-4 border-t border-charcoal/8">
                    <Link
                      href={`/admin/venues/${venue.id}`}
                      className="btn-primary block text-center"
                    >
                      View Layout →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}