'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingMessage from '@/app/components/LoadingMessage';
import { AppNavbar } from '@/app/components/Navbar';
import { Dialog } from '@/app/components/Dialog';

function SeatCountdown({ expiresAt, onExpire }: { expiresAt: string, onExpire: () => void }) {
  const calculateRemaining = () => Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, calculateRemaining()));

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        onExpire();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, timeLeft, onExpire]);

  if (timeLeft <= 0) return null;

  const m = Math.floor(timeLeft / 60).toString();
  const s = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
      {m}:{s}
      {/* Little triangle pointing down */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-[3px] border-r-[3px] border-t-[4px] border-transparent border-t-charcoal"></div>
    </div>
  );
}

export default function SeatMapPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;

  const [show, setShow] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isHolding, setIsHolding] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<Record<string, 'idle'|'loading'|'success'|'error'>>({});
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setUserName(data?.user?.name ?? null))
      .catch(() => setUserName(null));
  }, []);

  // Poll for seat updates
  const fetchSeatData = async () => {
    try {
      const res = await fetch(`/api/shows/${showId}/seatmap`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load seat map');
      }
      const data = await res.json();
      setShow(data.show);
      setSeats(data.seats);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeatData();

    // Polling fallback - in production replace with Supabase Realtime subscription
    // const channel = supabase.channel(`show:${showId}`).on('postgres_changes', ...).subscribe();
    const interval = setInterval(() => {
      fetchSeatData();
    }, 3000);

    return () => clearInterval(interval);
  }, [showId]);

  const handleSeatClick = async (seat: any) => {
    // If the seat is already held by this user, release it
    if (seat.isHeldByMe) {
      setIsHolding(true);
      try {
        const res = await fetch(`/api/shows/${showId}/hold`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seatId: seat.id })
        });
        if (!res.ok) throw new Error('Failed to release seat');
        
        // Optimistically update selection
        setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: 'AVAILABLE', isHeldByMe: false, expiresAt: null, holdId: null } : s));
        setSelectedSeatIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(seat.id);
          return newSet;
        });
      } catch (err: any) {
        setErrorMsg(err.message);
        fetchSeatData();
      } finally {
        setIsHolding(false);
      }
      return;
    }

    if (seat.status !== 'AVAILABLE') return;

    setIsHolding(true);
    try {
      const res = await fetch(`/api/shows/${showId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId: seat.id })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to hold seat');
      }

      // Optimistically update selection
      setSelectedSeatIds(prev => {
        const newSet = new Set(prev);
        newSet.add(seat.id);
        return newSet;
      });

      // Refetch immediately to get the latest hold state
      await fetchSeatData();
    } catch (err: any) {
      setErrorMsg(err.message);
      fetchSeatData(); // Refresh to see if someone else got it
    } finally {
      setIsHolding(false);
    }
  };

  const handleHoldExpired = (seatId: string) => {
    // Optimistically revert seat to available
    setSeats(prev => prev.map(s =>
      s.id === seatId
        ? { ...s, status: 'AVAILABLE', isHeldByMe: false, expiresAt: null, holdId: null }
        : s
    ));

    setSelectedSeatIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(seatId);
      return newSet;
    });
  };

  const getSeatClass = (seat: any) => {
    if (selectedSeatIds.has(seat.id) || seat.isHeldByMe) return 'seat-selected relative overflow-hidden';
    if (seat.status === 'AVAILABLE') return 'seat-available';
    if (seat.status === 'HELD') return 'seat-held relative'; // relative for countdown
    return 'seat-booked';
  };

  const handleJoinWaitlist = async (category: string) => {
    setWaitlistStatus(prev => ({ ...prev, [category]: 'loading' }));
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId, category })
      });
      if (!res.ok) {
        throw new Error('Failed to join waitlist');
      }
      setWaitlistStatus(prev => ({ ...prev, [category]: 'success' }));
    } catch (err: any) {
      setErrorMsg(err.message);
      setWaitlistStatus(prev => ({ ...prev, [category]: 'error' }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNavbar userName={userName} activeLink="events" />
        <main className="page-main flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <LoadingMessage variant="page" />
        </main>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar userName={userName} activeLink="events" />
        <div className="container-main py-12 md:py-16">
          <div className="card text-accent text-center">{error || 'Show not found'}</div>
        </div>
      </div>
    );
  }

  // Group seats by row
  const rows: Record<string, any[]> = {};
  seats.forEach(seat => {
    if (!rows[seat.row]) rows[seat.row] = [];
    rows[seat.row].push(seat);
  });

  // Sort rows alphabetically, and seats numerically
  const sortedRowKeys = Object.keys(rows).sort();
  sortedRowKeys.forEach(k => {
    rows[k].sort((a, b) => a.number - b.number);
  });

  // Calculate category availability
  const categoryStats: Record<string, { total: number, available: number }> = {};
  seats.forEach(seat => {
    if (!categoryStats[seat.category]) {
      categoryStats[seat.category] = { total: 0, available: 0 };
    }
    categoryStats[seat.category].total++;
    if (seat.status === 'AVAILABLE') {
      categoryStats[seat.category].available++;
    }
  });

  // Collect held seats to pass to checkout
  const myHolds = seats.filter(s => s.isHeldByMe);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar userName={userName} activeLink="events" />

      {/* Hero band with show info */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-8 md:py-10">
          <p className="font-serif text-2xl md:text-3xl text-charcoal leading-tight mb-2">{show.event.title}</p>
          <p className="text-charcoal/60">
            {new Date(show.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} &bull; {show.venue.name}
          </p>
        </div>
      </div>

      <main className="page-main">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8 text-sm" role="img" aria-label="Seat availability legend">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-available bg-available/10 min-w-[20px]" aria-hidden="true"></div>
            <span className="text-charcoal/70">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-accent bg-accent/10 min-w-[20px]" aria-hidden="true"></div>
            <span className="text-charcoal/70">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-held bg-held/10 min-w-[20px]" aria-hidden="true"></div>
            <span className="text-charcoal/70">Held</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-booked bg-booked/10 min-w-[20px]" aria-hidden="true"></div>
            <span className="text-charcoal/70">Booked</span>
          </div>
        </div>

        {/* Seat Grid - horizontal scroll on mobile */}
        <div className="card overflow-x-auto">
          <div className="w-max min-w-full pb-8 pt-8 px-4 mx-auto flex flex-col items-center">
            {/* Screen */}
            <div className="w-3/4 max-w-2xl mx-auto h-8 bg-charcoal/5 border border-charcoal/10 rounded-t-[50%] mb-16 flex items-center justify-center text-xs text-charcoal/40 uppercase tracking-widest">
              Stage / Screen
            </div>

            {/* Seat Grid */}
            <div className="flex flex-col gap-3 md:gap-4 items-center">
              {sortedRowKeys.map((rowLetter, index) => {
                const currentCategory = rows[rowLetter][0]?.category;
                const prevCategory = index > 0 ? rows[sortedRowKeys[index - 1]][0]?.category : null;
                const showDivider = currentCategory !== prevCategory;

                return (
                  <Fragment key={rowLetter}>
                    {showDivider && (
                      <div className="w-full flex items-center justify-center gap-4 my-4 opacity-70">
                        <div className="h-px border-b border-dashed border-charcoal/30 flex-1 max-w-[120px]"></div>
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-charcoal/50 bg-charcoal/5 px-3 py-1 rounded-full">{currentCategory}</span>
                        <div className="h-px border-b border-dashed border-charcoal/30 flex-1 max-w-[120px]"></div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-6 md:w-8 text-right font-mono text-charcoal/40 text-sm hidden md:block">{rowLetter}</div>
                  <div className="flex gap-2 md:gap-3 flex-nowrap justify-center">
                    {rows[rowLetter].map(seat => (
                      <button
                        key={seat.id}
                        className={`${getSeatClass(seat)} group min-w-[44px] min-h-[44px] md:min-w-[40px] md:min-h-[40px]`}
                        disabled={seat.status !== 'AVAILABLE' && !seat.isHeldByMe || isHolding}
                        onClick={() => handleSeatClick(seat)}
                        title={`${seat.row}${seat.number} - ${seat.category}`}
                        aria-label={`${seat.row}${seat.number}, ${seat.category}, ${seat.status === 'AVAILABLE' ? 'available' : seat.status.toLowerCase()}`}
                      >
                        {seat.number}
                        {seat.isHeldByMe && (
                          <div className="absolute inset-0 bg-accent text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity duration-150" aria-hidden="true" title="Click to remove">
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </div>
                        )}
                        {seat.status === 'HELD' && !seat.isHeldByMe && (
                          <span className="seat-countdown">held</span>
                        )}
                        {seat.status === 'HELD' && seat.isHeldByMe && seat.expiresAt && (
                          <SeatCountdown
                            expiresAt={seat.expiresAt}
                            onExpire={() => handleHoldExpired(seat.id)}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="w-6 md:w-8 text-left font-mono text-charcoal/40 text-sm hidden md:block">{rowLetter}</div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Waitlist Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h3 className="font-serif text-2xl text-charcoal mb-6 border-b border-charcoal/10 pb-2">Ticket Availability</h3>
          <div className="space-y-4">
            {Object.entries(categoryStats).map(([category, stats]) => {
              const status = waitlistStatus[category] || 'idle';
              const priceMatch = show.prices?.find((p: any) => p.category === category);
              const priceStr = priceMatch ? `₹${Number(priceMatch.price).toFixed(2)}` : '';

              return (
                <div key={category} className="card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-charcoal/10">
                  <div>
                    <h4 className="font-serif text-lg text-charcoal">{category}</h4>
                    <p className="text-sm text-charcoal/60">{priceStr}</p>
                  </div>

                  {stats.available > 0 ? (
                    <div className="text-right">
                      <span className="badge bg-green-100 text-green-800 border border-green-200">
                        {stats.available} Available
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto mt-2 md:mt-0">
                      <span className="text-xs font-bold uppercase tracking-widest text-charcoal/50 bg-charcoal/5 px-2 py-1.5 rounded self-start sm:self-auto shrink-0">
                        Sold Out
                      </span>

                      {status === 'success' ? (
                        <div className="flex items-center gap-2 text-xs text-green-800 bg-green-50 px-3 py-1.5 rounded border border-green-200 font-medium">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          You're on the waitlist
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <button
                            onClick={() => handleJoinWaitlist(category)}
                            disabled={status === 'loading'}
                            className={`bg-held text-white hover:bg-amber-600 px-3 py-1.5 rounded font-medium text-xs shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 ${status === 'loading' ? 'opacity-70' : 'hover:-translate-y-0.5 hover:shadow'}`}
                          >
                            {status === 'loading' ? <LoadingMessage variant="inline" /> : (
                              <>
                                Join Waitlist
                                <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                              </>
                            )}
                          </button>
                          {status !== 'error' && (
                            <p className="text-xs text-charcoal/60 leading-tight max-w-[200px]">
                              We'll email you the moment a seat opens up.
                            </p>
                          )}
                        </div>
                      )}

                      {status === 'error' && (
                        <span className="text-xs text-red-500 font-medium">Failed to join waitlist.</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Checkout Panel — visible on lg screens */}
        <div className="hidden lg:block mt-12 max-w-2xl mx-auto">
          <div className="card p-6 border border-charcoal/10">
            <h3 className="font-serif text-xl text-charcoal mb-4 pb-3 border-b border-charcoal/10">Your Selection</h3>

            {myHolds.length === 0 ? (
              <p className="text-sm text-charcoal/50 py-4 text-center">Click on available seats above to select them.</p>
            ) : (
              <>
                <div className="space-y-2 mb-6">
                  {myHolds.map(seat => {
                    const priceRule = show.prices?.find((p: any) => p.category === seat.category);
                    const seatPrice = priceRule ? Number(priceRule.price) : 0;
                    return (
                      <div key={seat.id} className="flex justify-between items-center text-sm py-1.5">
                        <div>
                          <span className="font-medium text-charcoal">Seat {seat.row}{seat.number}</span>
                          <span className="text-charcoal/50 ml-2">({seat.category})</span>
                        </div>
                        <span className="text-charcoal font-medium">₹{seatPrice.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-charcoal/10 mb-6">
                  <span className="font-semibold text-charcoal">Total</span>
                  <span className="font-serif text-xl text-charcoal">
                    ₹{myHolds.reduce((sum, seat) => {
                      const priceRule = show.prices?.find((p: any) => p.category === seat.category);
                      return sum + (priceRule ? Number(priceRule.price) : 0);
                    }, 0).toFixed(2)}
                  </span>
                </div>

                <button
                  className="btn-primary w-full py-3 min-h-[48px] text-base"
                  disabled={myHolds.length === 0}
                  onClick={() => {
                    sessionStorage.setItem('checkout_holds', JSON.stringify(myHolds.map(h => h.holdId)));
                    sessionStorage.setItem('checkout_showId', showId);
                    router.push('/checkout');
                  }}
                >
                  Proceed to Checkout →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sticky Checkout Bar on Mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-charcoal/10 p-4 shadow-xl z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="text-sm text-charcoal/70">
              {myHolds.length} seat{myHolds.length !== 1 ? 's' : ''} selected
            </div>
            <button
              className="btn-primary flex-1 py-3 min-h-[48px]"
              disabled={myHolds.length === 0}
              onClick={() => {
                sessionStorage.setItem('checkout_holds', JSON.stringify(myHolds.map(h => h.holdId)));
                sessionStorage.setItem('checkout_showId', showId);
                router.push('/checkout');
              }}
            >
              Checkout ({myHolds.length})
            </button>
          </div>
        </div>

        {/* Bottom padding for mobile sticky bar */}
        <div className="lg:hidden h-20" aria-hidden="true"></div>
      </main>

      <Dialog 
        isOpen={!!errorMsg} 
        onClose={() => setErrorMsg('')} 
        title="Notice"
        actions={
          <button onClick={() => setErrorMsg('')} className="btn-primary py-2 px-6 text-sm rounded">OK</button>
        }
      >
        {errorMsg}
      </Dialog>
    </div>
  );
}