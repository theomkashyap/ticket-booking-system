'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingMessage from '@/app/components/LoadingMessage';
import { playSuccessSound } from '@/lib/audio';

export default function AcceptOfferClient({ offer, price, seat }: { offer: any, price: number, seat?: any }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    const calculateRemaining = () => Math.max(0, Math.floor((new Date(offer.expiresAt).getTime() - Date.now()) / 1000));
    setTimeLeft(calculateRemaining());
    
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        // Refresh page to show expired state
        router.refresh();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [offer.expiresAt, router]);

  const handleAccept = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/offers/${offer.id}/accept`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept offer');
      }
      
      playSuccessSound();
      setSuccessData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/offers/${offer.id}/decline`, {
        method: 'POST',
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to decline offer');
      }
      
      router.push('/history');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (successData) {
    const eventDate = new Date(offer.waitlist.show.date);
    const ticketSeats = seat ? `${seat.row}${seat.number}` : '1 Seat';

    return (
      <div className="flex flex-col bg-[#0a0a0a] rounded-2xl relative overflow-hidden items-center justify-center py-16 px-4">
        {/* Subtle abstract background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-[#0a0a0a] to-[#0a0a0a]" />
        </div>

        <div className="relative z-10 w-full max-w-4xl animate-[fadeIn_0.8s_ease-out]">
          <div className="text-center mb-10">
            <span className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Waitlist Offer Accepted</span>
            <h1 className="font-serif text-3xl md:text-5xl text-white">You're going to<br/><span className="italic text-white/90">{offer.waitlist.show.event.title}!</span></h1>
          </div>

          {/* Horizontal Ticket Container */}
          <div className="flex flex-col md:flex-row w-full shadow-2xl max-w-3xl mx-auto">
            
            {/* Main Ticket Body (Left) */}
            <div className="bg-white rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl p-8 md:p-10 flex-1 relative">
              <p className="eyebrow text-charcoal/50 mb-1">{offer.waitlist.show.event.type === 'MOVIE' ? 'Cinema' : 'Live Event'}</p>
              <h2 className="font-serif text-3xl md:text-4xl text-charcoal leading-tight mb-8">{offer.waitlist.show.event.title}</h2>
              
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
                  <p className="font-medium text-charcoal">{offer.waitlist.show.venue.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-charcoal/40 font-bold mb-1">Seat</p>
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

              {successData.qrCodeDataUrl ? (
                <img src={successData.qrCodeDataUrl} alt="Ticket QR Code" className="w-32 h-32 md:w-40 md:h-40 mb-5 mix-blend-multiply opacity-90" />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 bg-charcoal/5 flex items-center justify-center mb-5">
                  <span className="text-xs text-charcoal/40">QR Unavailable</span>
                </div>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-charcoal/40 font-bold mb-1">Booking Ref</p>
              <p className="font-mono text-xl md:text-2xl tracking-widest text-charcoal">{successData.reference}</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button onClick={() => router.push('/history')} className="text-white/60 hover:text-white border-b border-white/20 hover:border-white transition-colors pb-1 text-sm tracking-wide bg-transparent border-0 cursor-pointer">
              View All My Tickets →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const m = Math.floor(timeLeft / 60).toString();
  const s = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="w-full">
      <h1 className="font-serif text-4xl md:text-5xl mb-10 md:mb-12 text-charcoal">Offer Checkout</h1>

      {error ? (
        <div className="card text-center max-w-md mx-auto">
          <svg className="mx-auto mb-4 text-accent w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-accent mb-6 text-lg">{error}</p>
          <button onClick={() => router.push('/history')} className="btn-secondary">
            Return to Waitlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 text-left">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="card p-6 md:p-8">
              <h2 className="font-serif text-2xl md:text-3xl mb-6 text-charcoal pb-4 border-b border-charcoal/10">Order Summary</h2>
              <div className="mb-6">
                <span className="eyebrow text-accent block mb-2">Waitlist Offer</span>
                <h3 className="font-medium text-charcoal text-xl">{offer.waitlist.show.event.title}</h3>
                <p className="text-sm text-charcoal/60 mt-1">{new Date(offer.waitlist.show.date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
                <p className="text-sm text-charcoal/60">{offer.waitlist.show.venue.name}</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm py-2 border-b border-charcoal/10">
                  <div>
                    <span className="font-medium text-charcoal">
                      Seat {seat ? `${seat.row}${seat.number}` : '1'}
                    </span>
                    <span className="text-charcoal/60 ml-2">({offer.waitlist.category})</span>
                  </div>
                  <span className="text-charcoal">₹{price.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-charcoal/10 text-lg font-medium text-charcoal">
                <span>Total</span>
                <span>₹{price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 md:p-8 sticky top-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-charcoal/10">
                <h3 className="font-serif text-xl text-charcoal">Payment</h3>
                <span className="text-accent font-mono font-bold tracking-wider bg-accent/10 px-3 py-1 rounded">
                  {m}:{s}
                </span>
              </div>
              <p className="text-sm text-charcoal/60 mb-8">
                You have a limited time to complete this purchase before your seat is released to the next person.
              </p>

              <button
                onClick={handleAccept}
                disabled={isLoading || timeLeft <= 0}
                className="btn-primary w-full py-3 mb-4"
              >
                {isLoading ? (
                  <LoadingMessage variant="inline" />
                ) : (
                  'Confirm Booking'
                )}
              </button>
              <button
                onClick={handleDecline}
                disabled={isLoading}
                className="btn-ghost w-full py-2 text-sm text-charcoal/60 hover:text-accent"
              >
                Decline Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
