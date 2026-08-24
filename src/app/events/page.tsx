export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

import Link from 'next/link';
import SearchForm from './SearchForm';
import { prisma } from '@/lib/prisma';
import { AppNavbar, PublicNavbar } from '../components/Navbar';
import PosterCard from '../components/PosterCard';
import { UnauthorizedHandler } from '../components/UnauthorizedHandler';
import { Suspense } from 'react';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string }
}) {
  const session = await getServerSession(authOptions);


  const { type, q } = searchParams;

  const whereClause: any = {};
  if (type && (type === 'MOVIE' || type === 'CONCERT')) {
    whereClause.type = type;
  }
  if (q) {
    whereClause.title = { contains: q, mode: 'insensitive' };
  }

  // Fetch upcoming events based on filters
  let events: any[] = [];
  let dbError = false;

  try {
    events = await prisma.event.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        type: true,
        imageUrl: true,
        description: true,
        shows: {
          select: { id: true },
          where: {
            date: {
              gte: new Date(),
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    dbError = true;
  }

  return (
    <div className="min-h-screen bg-background">
      {session ? (
        <AppNavbar userName={session.user?.name} activeLink="events" />
      ) : (
        <PublicNavbar />
      )}

      <Suspense fallback={null}>
        <UnauthorizedHandler />
      </Suspense>

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10">
          <span className="eyebrow">Discover</span>
          <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-1">Browse Events</h1>
          <p className="text-charcoal/50 mt-2 mb-6">Movies and concerts, all in one place.</p>

          {/* Search inline in hero */}
          <SearchForm />
        </div>
      </div>

      <main className="page-main">
        {dbError ? (
          <div className="card border-accent/20 bg-accent/5 text-center py-16">
            <div className="text-3xl mb-4">⚠️</div>
            <h3 className="font-serif text-xl mb-2 text-accent">Connection Error</h3>
            <p className="text-charcoal/60 max-w-md mx-auto">We couldn't reach the database. Your network may be blocking the connection — try a mobile hotspot or VPN.</p>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="font-serif text-xl mb-2 text-charcoal">No events found</h3>
            <p className="text-charcoal/50 mb-6">No events match your current filters.</p>
            {(q || type) && (
              <Link href="/events" className="btn-ghost inline-block">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Section divider + spacing between filter bar and results grid */}
            <div className="mb-10 md:mb-12 flex items-center gap-4">
              <hr className="flex-1 border-charcoal/10" aria-hidden="true" />
              <p className="text-sm text-charcoal/40 whitespace-nowrap shrink-0">{events.length} event{events.length !== 1 ? 's' : ''} found</p>
            </div>
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
                  href={`/events/${event.id}`}
                  cta="View →"
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}