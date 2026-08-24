'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OrganiserNavbar } from '../../../components/Navbar';
import LoadingMessage from '@/app/components/LoadingMessage';

export default function CreateEventPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'MOVIE',
    imageUrl: '',
    description: '',
    venueId: '',
    date: '',
    holdTtlMins: 10,
    pricePremium: 15.00,
    priceGeneral: 10.00,
    priceVIP: 30.00,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch venues for the dropdown
    fetch('/api/venues')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setVenues(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, venueId: data[0].id }));
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          imageUrl: formData.imageUrl,
          description: formData.description,
          venueId: formData.venueId,
          date: new Date(formData.date).toISOString(),
          holdTtlMins: Number(formData.holdTtlMins),
          prices: [
            { category: 'Premium', price: Number(formData.pricePremium) },
            { category: 'General', price: Number(formData.priceGeneral) },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to create event');
        setIsLoading(false);
        return;
      }

      router.push('/organiser/events');
      router.refresh();
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <OrganiserNavbar activePage="new-event" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10">
          <span className="eyebrow">Organiser</span>
          <h1 className="font-serif text-4xl text-charcoal">Create Event</h1>
          <p className="text-charcoal/50 mt-1">Create a new movie or concert and schedule its first show.</p>
        </div>
      </div>

      <main className="page-main">
        <div className="card max-w-3xl mx-auto">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title">Event Title</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="input"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="imageUrl">Poster Image URL (optional)</label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://example.com/poster.jpg"
                value={formData.imageUrl}
                onChange={handleChange}
                className="input"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="type">Event Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="input"
                  disabled={isLoading}
                >
                  <option value="MOVIE">Movie</option>
                  <option value="CONCERT">Concert</option>
                </select>
              </div>
              <div>
                <label htmlFor="venueId">Venue</label>
                <select
                  id="venueId"
                  name="venueId"
                  value={formData.venueId}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading || venues.length === 0}
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                  {venues.length === 0 && <option value="">No venues available</option>}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="input"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="date">Show Date & Time</label>
                <input
                  id="date"
                  name="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="holdTtlMins">Seat Hold TTL (minutes)</label>
                <input
                  id="holdTtlMins"
                  name="holdTtlMins"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.holdTtlMins}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="pricePremium">Premium Seat Price ($)</label>
                <input
                  id="pricePremium"
                  name="pricePremium"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePremium}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="priceGeneral">General Seat Price ($)</label>
                <input
                  id="priceGeneral"
                  name="priceGeneral"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.priceGeneral}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="priceVIP">VIP Seat Price ($)</label>
                <input
                  id="priceVIP"
                  name="priceVIP"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.priceVIP}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-charcoal/10">
                <button
                  type="submit"
                  className="btn-primary w-full sm:w-auto px-8 py-3"
                  disabled={isLoading || venues.length === 0}
                >
                  {isLoading ? <LoadingMessage variant="inline" /> : 'Create Event & Show'}
                </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}