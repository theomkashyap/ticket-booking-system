export const dynamic = 'force-dynamic';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { AppNavbar, PublicNavbar } from './components/Navbar';
import PosterCard from './components/PosterCard';
import { prisma } from '@/lib/prisma';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const getRecentEvents = unstable_cache(
    async () => {
      return prisma.event.findMany({
        select: {
          id: true,
          title: true,
          type: true,
          imageUrl: true,
          description: true,
          shows: { select: { id: true } },
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });
    },
    ['home-recent-events'],
    { revalidate: 60 }
  );

  const getLiveStats = unstable_cache(
    async () => {
      return Promise.all([
        prisma.event.count(),
        prisma.booking.count({ where: { status: 'CONFIRMED' } }),
        prisma.show.count(),
      ]);
    },
    ['home-stats'],
    { revalidate: 60 }
  );

  const events = await getRecentEvents();
  const [totalEvents, totalBookings, totalShows] = await getLiveStats();

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {session ? (
        <AppNavbar userName={session.user?.name} />
      ) : (
        <PublicNavbar />
      )}

      {/* ── Cinematic Hero ── */}
      <section className="relative flex-1 flex items-center justify-center py-32 md:py-48 overflow-hidden bg-[#0a0a0a]">
        {/* Background Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        >
          <source src="/vid.mp4" type="video/mp4" />
        </video>

        {/* Layered cinematic overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top-right radial accent glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent opacity-60" />
          {/* Bottom vignette for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40" />
          {/* Subtle noise texture via CSS */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        </div>

        {/* Animated accent line at top */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] bg-accent/60"
          style={{ animation: 'lineExpand 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        />
        
        <div 
          className="container-main text-center relative z-10"
          style={{ animation: 'fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Eyebrow with decorative elements */}
          <div 
            className="flex items-center justify-center gap-4 mb-10"
            style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}
          >
            <div className="h-[1px] w-8 bg-accent/40" />
            <p className="text-accent text-xs font-bold uppercase tracking-[0.35em] drop-shadow-md">Premium Ticket Experience</p>
            <div className="h-[1px] w-8 bg-accent/40" />
          </div>

          {/* Main heading */}
          <h1 
            className="font-serif text-6xl md:text-8xl lg:text-[108px] text-white mb-8 leading-[1.05] tracking-tight drop-shadow-xl"
            style={{ animation: 'slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}
          >
            The best seats.<br />
            <span className="italic text-white/90">No waiting.</span>
          </h1>

          {/* Subline */}
          <p 
            className="text-white/45 text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-12"
            style={{ animation: 'slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both' }}
          >
            Book movies & concerts with real-time seat selection, instant QR tickets, and zero queues.
          </p>

          {/* CTA group */}
          <div 
            className="flex items-center justify-center gap-5 mb-20"
            style={{ animation: 'slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both' }}
          >
            <Link href="/events" className="btn-primary text-base px-10 py-4 rounded-sm tracking-wide shadow-[0_4px_24px_rgba(200,16,46,0.25)] hover:shadow-[0_8px_32px_rgba(200,16,46,0.35)] transition-all duration-300">
              Explore Events
            </Link>
            {!session && (
              <Link href="/auth/register" className="btn-ghost text-base px-8 py-4 rounded-sm tracking-wide border-white/20 text-white/70 hover:bg-white/5 hover:border-white/40">
                Create Account
              </Link>
            )}
          </div>

          {/* Floating stats bar */}
          <div 
            className="inline-flex items-center gap-0 bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-sm px-2 py-4"
            style={{ animation: 'fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.7s both' }}
          >
            <div className="hero-stat">
              <span className="hero-stat-value">{totalEvents}</span>
              <span className="hero-stat-label">Events</span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="hero-stat">
              <span className="hero-stat-value">{totalShows}</span>
              <span className="hero-stat-label">Shows</span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="hero-stat">
              <span className="hero-stat-value">{totalBookings}</span>
              <span className="hero-stat-label">Booked</span>
            </div>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* ── Featured Events ── */}
      <section className="py-24 bg-background">
        <div className="container-main">
          <div 
            className="flex items-end justify-between mb-14"
            style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <div>
              <p className="eyebrow">Now Showing</p>
              <h2 className="font-serif text-4xl text-charcoal">Featured Events</h2>
            </div>
            <Link href="/events" className="link text-sm font-semibold mb-2 flex items-center gap-1.5 group">
              View all 
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {events.map((event, i) => (
              <div 
                key={event.id} 
                style={{ animation: `scaleIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.12}s both` }}
              >
                <PosterCard
                  id={event.id}
                  title={event.title}
                  type={event.type}
                  imageUrl={event.imageUrl}
                  description={event.description}
                  showCount={event.shows.length}
                  href={`/events/${event.id}`}
                />
              </div>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-20">
              <p className="text-charcoal/40 text-lg">No events yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 bg-white border-t border-charcoal/8">
        <div className="container-main">
          <div className="text-center mb-20">
            <p className="eyebrow mb-4">The Process</p>
            <h2 className="font-serif text-4xl text-charcoal mb-4">Effortless Booking</h2>
            <p className="text-charcoal/45 max-w-lg mx-auto text-base leading-relaxed">
              Three simple steps from browsing to your digital ticket — no queues, no hassle.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            {[
              { 
                num: '01', 
                title: 'Browse Collection', 
                body: 'Explore our curated selection of upcoming movies and highly anticipated concerts.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                )
              },
              { 
                num: '02', 
                title: 'Secure Your Seat', 
                body: 'Interact with our live seat map and lock in your perfect view instantly.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                )
              },
              { 
                num: '03', 
                title: 'Instant Access', 
                body: 'Receive your digital tickets immediately. No printing required, just scan and enter.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                  </svg>
                )
              },
            ].map((f, i) => (
              <div 
                key={f.num} 
                className="feature-card group cursor-default"
                style={{ animation: `fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.15}s both` }}
              >
                {/* Large ghost number */}
                <div className="font-serif text-[120px] leading-none absolute -top-8 -left-4 text-charcoal opacity-[0.04] group-hover:text-accent group-hover:opacity-[0.08] transition-all duration-500 z-0 select-none pointer-events-none">
                  {f.num}
                </div>
                <div className="relative z-10 pt-4">
                  {/* Icon */}
                  <div className="text-accent/70 mb-5 group-hover:text-accent transition-colors duration-300">
                    {f.icon}
                  </div>
                  <h3 className="font-serif text-2xl mb-4 text-charcoal group-hover:text-charcoal transition-colors">{f.title}</h3>
                  <p className="text-charcoal/55 leading-relaxed text-base">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features ── */}
      <section className="py-20 bg-white border-t border-charcoal/8">
        <div className="container-main">
          <div className="mb-14">
            <p className="eyebrow mb-3">Everything You Need</p>
            <h2 className="font-serif text-4xl text-charcoal">Platform Features</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
            {[
              ['Real-Time Seat Map', 'Powered by Postgres subscriptions. See seats change status the millisecond they are held.'],
              ['Concurrency-Safe Locks', 'Bulletproof database transactions guarantee zero double-bookings, even under extreme load.'],
              ['Waitlist Offers', 'Sold out? Join the queue. Cancellations trigger instant, time-limited offers to the next in line.'],
              ['Live Hold Countdowns', 'Visible countdown timers on every held seat create urgency and clarify availability.'],
              ['Secure Ticket Transfers', 'Easily and securely transfer your booked tickets to friends directly within the platform.'],
              ['QR Code Ticketing', 'Embedded QR codes delivered via email. Scan and enter, no physical tickets required.'],
              ['Smart Auto-Release', 'Instant seat release on checkout abandonment, backed by automated cron sweeping for expired holds.'],
              ['Multi-Role Dashboards', 'Dedicated flows for Customers to book, Organisers to manage, and Admins to draw venue layouts.'],
              ['In-App Notifications', 'Stay updated with real-time alerts for waitlist offers, ticket transfers, and booking confirmations.'],
            ].map(([title, desc], i) => (
              <div
                key={title}
                className="group flex items-start gap-4 py-3 border-b border-charcoal/6 last:border-b-0 md:last:border-b sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0 cursor-default"
                style={{ animation: `fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.03 + i * 0.03}s both` }}
              >
                <div className="font-serif text-xs text-charcoal/30 mt-0.5 group-hover:text-accent transition-colors duration-300 select-none">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal mb-0.5 group-hover:text-accent transition-colors duration-300">{title}</p>
                  <p className="text-xs text-charcoal/40 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-charcoal py-16 border-t border-white/10">
        <div className="container-main">
          {/* Footer top — brand + navigation */}
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-14">
            {/* Brand column */}
            <div className="max-w-xs">
              <p className="font-serif text-white/90 text-2xl tracking-wide mb-3">Curtain</p>
              <p className="text-white/35 text-sm leading-relaxed">
                Premium movie & concert ticket booking. Real-time seats, instant QR tickets, zero queues.
              </p>
            </div>


          </div>

          {/* Divider */}
          <div className="h-[1px] bg-white/8 mb-8" />

          {/* Footer bottom — copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
            <p>© 2026 Curtain. All rights reserved.</p>
            <p className="text-xs text-white/20">Built for premium experiences</p>
          </div>
        </div>
      </footer>
    </main>
  );
}