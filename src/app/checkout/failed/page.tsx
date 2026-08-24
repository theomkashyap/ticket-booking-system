'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppNavbar } from '@/app/components/Navbar';

export default function PaymentFailedPage({
  searchParams,
}: {
  searchParams: { showId?: string; error?: string }
}) {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setUserName(data?.user?.name ?? null))
      .catch(() => setUserName(null));
  }, []);

  const showId = searchParams?.showId;
  const error = searchParams?.error || 'Your payment could not be processed. Your seats have been released.';

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar userName={userName} activeLink="events" />
      <div className="min-h-screen bg-background flex items-center justify-center py-12 md:py-16 px-4 md:px-6">
        <div className="card max-w-md w-full text-center">
          <svg className="mx-auto mb-6 text-accent w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>

          <h1 className="font-serif text-3xl mb-4 text-charcoal">Payment Failed</h1>

          <div className="mb-8 p-4 bg-accent/5 border border-accent/20 rounded text-accent text-sm">
            <p>{error}</p>
            <p className="mt-2 text-xs text-accent/80">Your seat holds have been automatically released.</p>
          </div>

          <div className="flex flex-col gap-3">
            {showId && (
              <Link href={`/shows/${showId}/seatmap`} className="btn-primary min-h-[48px]">
                Try Again
              </Link>
            )}
            <Link href="/events" className="btn-secondary min-h-[48px]">
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}