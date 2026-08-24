'use client';

import Link from 'next/link';
import { AccountDropdown } from './AccountDropdown';
import { useSession } from 'next-auth/react';

// ─── Shared light nav shell ───────────────────────────────────────────────────
const lightHeader = 'bg-white border-b border-charcoal/10 sticky top-0 z-50';

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-opacity px-1 py-0.5 border-b-2 ${
        active
          ? 'text-charcoal border-accent'
          : 'text-charcoal/60 border-transparent hover:text-charcoal'
      }`}
    >
      {children}
    </Link>
  );
}

function RolePill({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded">
      {label}
    </span>
  );
}

// ─── Public Navbar (logged-out) ───────────────────────────────────────────────
export function PublicNavbar() {

  return (
    <header className={lightHeader}>
      <div className="container-main">
        <div className="flex items-center justify-between h-16">
          <Link href="/events" className="font-serif text-3xl tracking-tight text-charcoal" aria-label="Curtain home">
            Curtain
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors px-4 py-2 rounded min-h-[40px] flex items-center">
              Log In
            </Link>
            <Link href="/auth/register" className="text-sm font-medium text-charcoal/70 border border-charcoal/20 hover:border-charcoal/40 transition-colors px-4 py-2 rounded min-h-[40px] flex items-center">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── App Navbar (logged-in customer) ──────────────────────────────────────────
export function AppNavbar({ userName, activeLink }: { userName?: string | null; activeLink?: 'events' | 'history' }) {
  const { data: session } = useSession();
  const displayName = userName || session?.user?.name;
  const userRole = (session?.user as any)?.role?.toLowerCase() || 'customer';
  
  return (
    <header className={lightHeader}>
      <div className="container-main">
        <div className="flex items-center justify-between h-16">
          <Link href="/events" className="font-serif text-3xl tracking-tight text-charcoal" aria-label="Curtain home">
            Curtain
          </Link>
          <AccountDropdown name={displayName} role={userRole as 'customer' | 'organiser' | 'admin'} />
        </div>
      </div>
    </header>
  );
}

// ─── Organiser Navbar ─────────────────────────────────────────────────────────
export function OrganiserNavbar({
  userName,
  activePage,
}: {
  userName?: string | null;
  showBack?: boolean;
  activePage?: 'events' | 'new-event';
}) {
  const { data: session } = useSession();
  const displayName = userName || session?.user?.name;
  const userRole = (session?.user as any)?.role?.toLowerCase() || 'organiser';

  return (
    <header className={lightHeader}>
      <div className="container-main">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/events" className="font-serif text-3xl tracking-tight text-charcoal" aria-label="Curtain home">
              Curtain
            </Link>
            <RolePill label="Organiser" />
          </div>
          <AccountDropdown name={displayName} role={userRole as 'customer' | 'organiser' | 'admin'} />
        </div>
      </div>
    </header>
  );
}

// ─── Admin Navbar ─────────────────────────────────────────────────────────────
export function AdminNavbar({
  userName,
  activePage,
}: {
  userName?: string | null;
  showBack?: boolean;
  activePage?: 'venues' | 'new-venue';
}) {
  const { data: session } = useSession();
  const displayName = userName || session?.user?.name;
  const userRole = (session?.user as any)?.role?.toLowerCase() || 'admin';

  return (
    <header className={lightHeader}>
      <div className="container-main">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/events" className="font-serif text-3xl tracking-tight text-charcoal" aria-label="Curtain home">
              Curtain
            </Link>
            <RolePill label="Admin" />
          </div>
          <AccountDropdown name={displayName} role={userRole as 'customer' | 'organiser' | 'admin'} />
        </div>
      </div>
    </header>
  );
}