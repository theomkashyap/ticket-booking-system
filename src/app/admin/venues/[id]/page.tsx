export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AdminNavbar } from '../../../components/Navbar';

export default async function VenueDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }
  
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/events?error=unauthorized_admin');
  }

  const venue = await prisma.venue.findUnique({
    where: { id: params.id },
    include: {
      seats: {
        orderBy: [{ row: 'asc' }, { number: 'asc' }],
      },
    },
  });

  if (!venue) {
    notFound();
  }

  // Group seats by row
  const rows: Record<string, typeof venue.seats> = {};
  for (const seat of venue.seats) {
    if (!rows[seat.row]) rows[seat.row] = [];
    rows[seat.row].push(seat);
  }
  const sortedRows = Object.keys(rows).sort();

  // Category colours
  const categoryColor: Record<string, string> = {
    VIP:      'bg-amber-50 border-amber-300 text-amber-700',
    Premium:  'bg-blue-50 border-blue-200 text-blue-700',
    General:  'bg-charcoal/5 border-charcoal/20 text-charcoal/70',
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar userName={(session.user as any).name} activePage="venues" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="eyebrow">Venue Layout</span>
            <h1 className="font-serif text-4xl text-charcoal">{venue.name}</h1>
            <p className="text-charcoal/50 mt-1">{venue.address}</p>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-charcoal/60 shrink-0">
            <span className="bg-charcoal/5 border border-charcoal/10 px-3 py-1.5 rounded-md">
              {venue.seats.length} total seats
            </span>
            <span className="bg-charcoal/5 border border-charcoal/10 px-3 py-1.5 rounded-md">
              {sortedRows.length} rows
            </span>
          </div>
        </div>
      </div>

      <main className="page-main">

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8 text-xs">
          {Object.entries(categoryColor).map(([cat, cls]) => (
            <div key={cat} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded border-2 ${cls}`} />
              <span className="text-charcoal/70 font-medium">{cat}</span>
            </div>
          ))}
        </div>

        {/* Seat grid */}
        <div className="card overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Stage indicator */}
            <div className="w-3/4 max-w-xl mx-auto h-7 bg-charcoal/5 border border-charcoal/10 rounded-t-[50%] mb-12 flex items-center justify-center text-xs text-charcoal/40 uppercase tracking-widest">
              Stage / Screen
            </div>

            <div className="flex flex-col gap-3 items-center">
              {sortedRows.map(rowLetter => (
                <div key={rowLetter} className="flex items-center gap-3">
                  <span className="w-6 text-right font-mono text-charcoal/40 text-xs">{rowLetter}</span>
                  <div className="flex gap-2 flex-wrap">
                    {rows[rowLetter].map(seat => (
                      <div
                        key={seat.id}
                        title={`${seat.row}${seat.number} — ${seat.category}`}
                        className={`w-7 h-7 md:w-8 md:h-8 rounded border-2 flex items-center justify-center text-[10px] font-medium ${categoryColor[seat.category] ?? 'bg-charcoal/5 border-charcoal/20 text-charcoal/60'}`}
                      >
                        {seat.number}
                      </div>
                    ))}
                  </div>
                  <span className="w-6 text-left font-mono text-charcoal/40 text-xs">{rowLetter}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="mt-8">
          <Link href="/admin/venues" className="text-sm text-charcoal/60">
            ← Back to Venues
          </Link>
        </div>
      </main>
    </div>
  );
}
