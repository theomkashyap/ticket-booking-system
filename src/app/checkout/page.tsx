'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingMessage from '@/app/components/LoadingMessage';
import { AppNavbar } from '@/app/components/Navbar';
import { playSuccessSound } from '@/lib/audio';

export default function CheckoutPage() {
  const router = useRouter();

  const [holdIds, setHoldIds] = useState<string[]>([]);
  const [showId, setShowId] = useState<string>('');
  const [showData, setShowData] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Get user name for navbar (client-side)
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setUserName(data?.user?.name ?? null))
      .catch(() => setUserName(null));
  }, []);

  useEffect(() => {
    // Read selected hold IDs and show from sessionStorage
    const storedHolds = sessionStorage.getItem('checkout_holds');
    const storedShow = sessionStorage.getItem('checkout_showId');

    if (storedHolds && storedShow) {
      setHoldIds(JSON.parse(storedHolds));
      setShowId(storedShow);
    } else {
      setIsLoading(false);
      setError('No selected seats found. Please go back to the seat map.');
    }
  }, []);

  useEffect(() => {
    if (!showId) return;

    fetch(`/api/shows/${showId}/seatmap`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setShowData(data.show);

        // Find the seats corresponding to our holds
        const selectedSeats = data.seats.filter((s: any) => holdIds.includes(s.holdId));

        if (selectedSeats.length !== holdIds.length) {
          setError('Some of your seat holds have expired. Please go back and select again.');
        } else {
          setSeats(selectedSeats);
          const earliestExpiry = Math.min(
            ...selectedSeats.map((s: any) => new Date(s.expiresAt).getTime())
          );
          setExpiresAt(earliestExpiry);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [showId, holdIds]);

  useEffect(() => {
    if (!expiresAt || bookingSuccess) return;

    const interval = setInterval(() => {
      const remaining = Math.floor((expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        setError('Your seat holds have expired. Please return to the seat map to select new seats.');
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    // Initial calculation
    const initialRemaining = Math.floor((expiresAt - Date.now()) / 1000);
    if (initialRemaining <= 0) {
      setTimeLeft(0);
      setError('Your seat holds have expired. Please return to the seat map to select new seats.');
    } else {
      setTimeLeft(initialRemaining);
    }

    return () => clearInterval(interval);
  }, [expiresAt, bookingSuccess]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          holdIds
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      playSuccessSound();
      setBookingSuccess(data);
      sessionStorage.removeItem('checkout_holds');
      sessionStorage.removeItem('checkout_showId');
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    // Immediately release holds
    setIsProcessing(true);
    try {
      await Promise.all(
        holdIds.map(id => fetch(`/api/holds/${id}`, { method: 'DELETE' }))
      );
    } catch (e) {
      console.error(e);
    }
    sessionStorage.removeItem('checkout_holds');
    sessionStorage.removeItem('checkout_showId');
    router.push(`/shows/${showId}/seatmap`);
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

  if (bookingSuccess) {
    const ticketSeats = seats.map(s => `${s.row}${s.number}`).join(', ');
    const eventDate = new Date(showData?.date);

    return (
      <div className="min-h-screen bg-background">
        <AppNavbar userName={userName} activeLink="events" />
        <div className="min-h-screen flex flex-col bg-[#0a0a0a] relative overflow-hidden items-center justify-center py-16 px-4">
          {/* Subtle abstract background */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-[#0a0a0a] to-[#0a0a0a]" />
          </div>

          <div className="relative z-10 w-full max-w-4xl animate-[fadeIn_0.8s_ease-out]">
            <div className="text-center mb-10">
              <span className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Booking Confirmed</span>
              <h1 className="font-serif text-4xl md:text-5xl text-white">You're going to<br/><span className="italic text-white/90">{showData?.event.title}!</span></h1>
            </div>

            {/* Horizontal Ticket Container */}
            <div className="flex flex-col md:flex-row w-full shadow-2xl max-w-3xl mx-auto">

              {/* Main Ticket Body (Left) */}
              <div className="bg-white rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl p-8 md:p-10 flex-1 relative">
                <p className="eyebrow text-charcoal/50 mb-1">{showData?.event.type === 'MOVIE' ? 'Cinema' : 'Live Event'}</p>
                <h2 className="font-serif text-3xl md:text-4xl text-charcoal leading-tight mb-8">{showData?.event.title}</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 mb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-charcoal/40 font-bold mb-1">Date</p>
                    <p className="font-medium text-charcoal whitespace-nowrap">{eventDate.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-charcoal/40 font-bold mb-1">Time</p>
                    <p className="font-medium text-charcoal whitespace-nowrap">{eventDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-charcoal/40 font-bold mb-1">Venue</p>
                    <p className="font-medium text-charcoal">{showData?.venue.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-charcoal/40 font-bold mb-1">Seats</p>
                    <p className="font-medium text-charcoal">{ticketSeats}</p>
                  </div>
                </div>

                {/* Cutout circles for vertical tear (mobile) */}
                <div className="md:hidden absolute -bottom-3 -left-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>
                <div className="md:hidden absolute -bottom-3 -right-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>

                {/* Cutout circles for horizontal tear (desktop) */}
                <div className="hidden md:block absolute -top-3 -right-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>
                <div className="hidden md:block absolute -bottom-3 -right-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>
              </div>

              {/* Dashed line separator */}
              <div className="w-full md:w-0 h-0 md:h-auto border-t-2 md:border-t-0 md:border-l-2 border-dashed border-charcoal/20 relative bg-white"></div>

              {/* Ticket Stub (Right) */}
              <div className="bg-white rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl p-8 md:p-10 flex flex-col items-center justify-center relative md:w-72 shrink-0">
                {/* Cutout circles for vertical tear (mobile) */}
                <div className="md:hidden absolute -top-3 -left-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>
                <div className="md:hidden absolute -top-3 -right-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>

                {/* Cutout circles for horizontal tear (desktop) */}
                <div className="hidden md:block absolute -top-3 -left-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>
                <div className="hidden md:block absolute -bottom-3 -left-3 w-6 h-6 bg-[#0a0a0a] rounded-full"></div>

                {bookingSuccess.qrCodeDataUrl ? (
                  <img src={bookingSuccess.qrCodeDataUrl} alt="Ticket QR Code" className="w-32 h-32 md:w-40 md:h-40 mb-5 mix-blend-multiply opacity-90" />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-charcoal/5 flex items-center justify-center mb-5">
                    <span className="text-xs text-charcoal/40">QR Unavailable</span>
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-1">Booking Ref</p>
                <p className="font-mono text-xl md:text-2xl tracking-widest text-charcoal">{bookingSuccess.reference}</p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link href="/history" className="text-white/60 hover:text-white border-b border-white/20 hover:border-white transition-colors pb-1 text-sm tracking-wide">
                View All My Tickets →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate prices
  let totalPrice = 0;
  const pricedSeats = seats.map(seat => {
    const priceRule = showData?.prices.find((p: any) => p.category === seat.category);
    const price = priceRule ? Number(priceRule.price) : 0;
    totalPrice += price;
    return { ...seat, price };
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar userName={userName} activeLink="events" />
      <div className="min-h-screen bg-background py-12 md:py-16 px-4 md:px-6">
        <div className="container-main">
          <h1 className="font-serif text-4xl md:text-5xl mb-10 md:mb-12 text-charcoal">Checkout</h1>

          {error ? (
            <div className="card text-center max-w-md mx-auto">
              <svg className="mx-auto mb-4 text-accent w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-accent mb-6 text-lg">{error}</p>
              <Link href={`/shows/${showId}/seatmap`} className="btn-secondary">
                Return to Seat Map
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                <div className="card p-6 md:p-8">
                  <h2 className="font-serif text-2xl md:text-3xl mb-6 text-charcoal pb-4 border-b border-charcoal/10">Order Summary</h2>
                  <div className="mb-6">
                    <h3 className="font-medium text-charcoal">{showData?.event.title}</h3>
                    <p className="text-sm text-charcoal/60 mt-1">{new Date(showData?.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
                    <p className="text-sm text-charcoal/60">{showData?.venue.name}</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {pricedSeats.map(seat => (
                      <div key={seat.id} className="flex justify-between items-center text-sm py-2 border-b border-charcoal/10 last:border-0">
                        <div>
                          <span className="font-medium text-charcoal">Seat {seat.row}{seat.number}</span>
                          <span className="text-charcoal/60 ml-2">({seat.category})</span>
                        </div>
                        <span className="text-charcoal">₹{seat.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-charcoal/10 text-lg font-medium text-charcoal">
                    <span>Total</span>
                    <span>₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="card p-6 md:p-8 sticky top-6 lg:sticky top-24">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-charcoal/10">
                    <h3 className="font-serif text-xl text-charcoal">Payment</h3>
                    {timeLeft !== null && timeLeft > 0 && (
                      <span className="text-accent font-mono font-bold tracking-wider bg-accent/10 px-3 py-1 rounded">
                        {formatTime(timeLeft)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-charcoal/60 mb-8">
                    You have a limited time to complete this purchase before your seats are released.
                  </p>

                  <button
                    onClick={handleConfirm}
                    disabled={isProcessing || timeLeft === 0}
                    className="btn-primary w-full py-3 mb-4 min-h-[48px]"
                  >
                    {isProcessing ? (
                      <div className="flex justify-center items-center gap-2">
                        <LoadingMessage variant="inline" />
                      </div>
                    ) : (
                      'Confirm Booking'
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className="btn-ghost w-full py-2 min-h-[48px] text-sm text-charcoal/60 hover:text-accent"
                  >
                    Cancel & Release Seats
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
  }