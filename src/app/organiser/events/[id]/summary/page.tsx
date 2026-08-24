'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingMessage from '@/app/components/LoadingMessage';
import { OrganiserNavbar } from '../../../../components/Navbar';

export default function EventSummaryPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/organiser/events/${eventId}/summary`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch summary');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <OrganiserNavbar activePage="events" />
        <main className="page-main flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <LoadingMessage variant="page" />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background py-12 md:py-16 px-4 md:px-6">
        <div className="card max-w-md mx-auto text-accent text-center">{error || 'Something went wrong'}</div>
      </div>
    );
  }

  const { event, summary, recentBookings } = data;
  const occupancyRate = summary.totalCapacity > 0 ? (summary.totalSeatsSold / summary.totalCapacity) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <OrganiserNavbar activePage="events" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="eyebrow !mb-0">Summary</span>
            <span className={`badge ${event.type === 'MOVIE' ? 'badge-movie' : 'badge-concert'}`}>
              {event.type}
            </span>
          </div>
          <h1 className="font-serif text-4xl text-charcoal">{event.title}</h1>
        </div>
      </div>

      <main className="page-main">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <div className="card">
            <h3 className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-2">Total Revenue</h3>
            <p className="font-serif text-3xl text-charcoal">₹{summary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="card">
            <h3 className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-2">Total Bookings</h3>
            <p className="font-serif text-3xl text-charcoal">{summary.totalBookingsCount}</p>
          </div>
          <div className="card">
            <h3 className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-2">Seats Sold</h3>
            <p className="font-serif text-3xl text-charcoal">
              {summary.totalSeatsSold} <span className="text-lg text-charcoal/40 font-sans">/ {summary.totalCapacity}</span>
            </p>
          </div>
          <div className="card">
            <h3 className="text-xs font-bold text-charcoal/50 uppercase tracking-wider mb-2">Occupancy</h3>
            <p className="font-serif text-3xl text-charcoal">{occupancyRate.toFixed(1)}%</p>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-charcoal mb-6 border-b border-charcoal/8 pb-4">Recent Bookings</h2>
          {recentBookings.length === 0 ? (
            <div className="card text-center py-20">

              <h3 className="font-serif text-xl mb-2 text-charcoal">No bookings yet</h3>
              <p className="text-charcoal/50">No bookings have been made for this event.</p>
            </div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-charcoal/5 border-b border-charcoal/10 text-charcoal/70 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4">Ref</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Seats</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/10">
                    {recentBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-charcoal/3 transition-colors">
                        <td className="px-6 py-4 font-mono text-charcoal/60">{b.reference}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-charcoal">{b.userName}</div>
                          <div className="text-charcoal/50 text-xs mt-0.5">{b.userEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="stat-pill">{b.seatsCount}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-charcoal">₹{b.totalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-charcoal/60">
                          {new Date(b.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}