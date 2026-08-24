'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminNavbar } from '../../../components/Navbar';
import LoadingMessage from '@/app/components/LoadingMessage';

export default function CreateVenuePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    rowCount: 10,
    seatsPerRow: 15,
    category: 'Tiered',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          rowCount: Number(formData.rowCount),
          seatsPerRow: Number(formData.seatsPerRow),
          category: formData.category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to create venue');
        setIsLoading(false);
        return;
      }

      router.push('/admin/venues');
      router.refresh();
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const totalSeats = Number(formData.rowCount) * Number(formData.seatsPerRow);

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar activePage="new-venue" />

      {/* Hero band */}
      <div className="bg-white border-b border-charcoal/8">
        <div className="container-main py-10">
          <span className="eyebrow">Admin</span>
          <h1 className="font-serif text-4xl text-charcoal">Create Venue</h1>
          <p className="text-charcoal/50 mt-1">Configure a new venue and generate its default seat layout.</p>
        </div>
      </div>

      <main className="page-main">
        <div className="card p-6 md:p-8 max-w-2xl mx-auto">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name">Venue Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="address">Address</label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                className="input"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="rowCount">Number of Rows</label>
                <input
                  id="rowCount"
                  name="rowCount"
                  type="number"
                  min="1"
                  max="26"
                  value={formData.rowCount}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="seatsPerRow">Seats Per Row</label>
                <input
                  id="seatsPerRow"
                  name="seatsPerRow"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.seatsPerRow}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="category">Default Seat Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
                disabled={isLoading}
              >
                <option value="Tiered">Tiered (General front, Premium middle, VIP back)</option>
                <option value="Premium">All Premium</option>
                <option value="General">All General Admission</option>
                <option value="VIP">All VIP</option>
              </select>
            </div>

            <div className="pt-6 border-t border-charcoal/10">
              <p className="text-sm text-charcoal/60 mb-4">
                This will generate {totalSeats} seats automatically.
              </p>
              <button
                type="submit"
                className="btn-primary w-full py-3"
                disabled={isLoading}
              >
                {isLoading ? <LoadingMessage variant="inline" /> : 'Create Venue'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}