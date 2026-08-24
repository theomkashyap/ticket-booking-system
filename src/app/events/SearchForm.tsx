'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';

  // Keep form in sync with URL
  useEffect(() => {
    if (formRef.current) {
      const qInput = formRef.current.elements.namedItem('q') as HTMLInputElement;
      const typeSelect = formRef.current.elements.namedItem('type') as HTMLSelectElement;

      if (qInput) qInput.value = q;
      if (typeSelect) typeSelect.value = type;
    }
  }, [q, type]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get('q')?.toString() || '';
    const typeQuery = formData.get('type')?.toString() || '';

    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (typeQuery) params.set('type', typeQuery);

    router.push(`/events?${params.toString()}`);
  };

  const handleClear = () => {
    if (formRef.current) {
      formRef.current.reset();
      const qInput = formRef.current.elements.namedItem('q') as HTMLInputElement;
      const typeSelect = formRef.current.elements.namedItem('type') as HTMLSelectElement;
      if (qInput) qInput.value = '';
      if (typeSelect) typeSelect.value = '';
    }
    router.push('/events');
  };

  const handleTypeClick = (newType: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (newType) params.set('type', newType);
    router.push(`/events?${params.toString()}`);
  };

  // Unified height for all form controls: h-10 (40px)
  const controlHeight = 'h-10';

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full"
      role="search"
      aria-label="Event search and filter"
    >
      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 p-1 bg-charcoal/5 rounded border border-charcoal/10 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => handleTypeClick('')}
          className={`${controlHeight} px-3 rounded text-xs font-bold tracking-wide transition-colors flex items-center min-w-[56px] justify-center ${
            !type ? 'bg-accent text-white' : 'text-charcoal/60 hover:text-charcoal hover:bg-white/50'
          }`}
          aria-pressed={!type}
        >
          ALL
        </button>
        <button
          type="button"
          onClick={() => handleTypeClick('MOVIE')}
          className={`${controlHeight} px-3 rounded text-xs font-bold tracking-wide transition-colors flex items-center min-w-[56px] justify-center ${
            type === 'MOVIE' ? 'bg-accent text-white' : 'text-charcoal/60 hover:text-charcoal hover:bg-white/50'
          }`}
          aria-pressed={type === 'MOVIE'}
        >
          MOVIE
        </button>
        <button
          type="button"
          onClick={() => handleTypeClick('CONCERT')}
          className={`${controlHeight} px-3 rounded text-xs font-bold tracking-wide transition-colors flex items-center min-w-[56px] justify-center ${
            type === 'CONCERT' ? 'bg-accent text-white' : 'text-charcoal/60 hover:text-charcoal hover:bg-white/50'
          }`}
          aria-pressed={type === 'CONCERT'}
        >
          CONCERT
        </button>
      </div>

      {/* Search Input + Buttons */}
      <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
        <label htmlFor="q" className="sr-only">
          Search events
        </label>
        <input
          id="q"
          name="q"
          type="text"
          placeholder="Search events..."
          defaultValue={q}
          className={`${controlHeight} bg-white border border-charcoal/15 rounded px-3 text-sm text-charcoal placeholder-charcoal/35 w-full sm:w-[220px] min-w-0 flex-1`}
          aria-label="Search events"
        />
        <button type="submit" className={`${controlHeight} btn-secondary px-4 whitespace-nowrap flex-shrink-0`}>
          Search
        </button>
        {q && (
          <button type="button" onClick={handleClear} className={`${controlHeight} btn-ghost px-4 whitespace-nowrap flex-shrink-0`}>
            Clear
          </button>
        )}
      </div>
    </form>
  );
}