import Link from 'next/link';

type PosterCardProps = {
  id: string;
  title: string;
  type: 'MOVIE' | 'CONCERT' | string;
  description?: string | null;
  showCount?: number;
  venue?: string;
  imageUrl?: string | null;
  href: string;
  cta?: string;
};

/** Deterministic accent stripe based on title length (fallback only) */
function accentLeft(title: string) {
  return `${((title.length * 7) % 60) + 10}%`;
}

export default function PosterCard({
  id,
  title,
  type,
  description,
  showCount,
  venue,
  imageUrl,
  href,
  cta = 'View →',
}: PosterCardProps) {
  const isMovie = type === 'MOVIE';

  return (
    <Link href={href} className="block group">
      <div className="rounded-xl overflow-hidden border border-charcoal/10 hover:border-charcoal/30 transition-colors duration-200 flex flex-col h-full bg-white">

        {/* Poster visual — consistent aspect ratio */}
        <div className="relative aspect-[2/3] w-full flex flex-col justify-end p-4">
          {/* Real image if provided */}
          {imageUrl && (
            <>
              <img
                src={imageUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {/* Consistent charcoal gradient overlay for text readability — same for ALL cards */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent pointer-events-none" />
            </>
          )}

          {/* Fallback gradient backgrounds (only if no image) */}
          {!imageUrl && (
            <div
              className="absolute inset-0"
              style={{
                background: isMovie
                  ? `linear-gradient(145deg, #111 0%, #1e1e1e 40%, #2a0808 70%, #1A1A1A 100%)`
                  : `linear-gradient(145deg, #1a120a 0%, #2e1d0e 40%, #3d2606 70%, #1e1408 100%)`,
              }}
            />
          )}

          {/* Red/amber diagonal accent (only if no image) */}
          {!imageUrl && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isMovie
                  ? `linear-gradient(135deg, transparent ${accentLeft(title)}, rgba(200,16,46,0.18) 100%)`
                  : `linear-gradient(135deg, transparent ${accentLeft(title)}, rgba(200,140,30,0.18) 100%)`,
              }}
            />
          )}

          {/* Type badge */}
          <div className="relative z-10 mb-2">
            <span className={isMovie ? 'badge-movie' : 'badge-concert'}>
              {isMovie ? 'Movie' : 'Concert'}
            </span>
          </div>

          {/* Title on poster */}
          <h3 className="relative z-10 font-serif text-white text-xl leading-snug drop-shadow-sm group-hover:text-accent/90 transition-colors">
            {title}
          </h3>
        </div>

        {/* Card meta */}
        <div className="p-4 flex flex-col flex-1 pt-6">
          {description && (
            <p className="text-sm text-charcoal/55 line-clamp-2 leading-relaxed mb-4">{description}</p>
          )}

          <div className="mt-auto flex items-center justify-between pt-3 border-t border-charcoal/8">
            <div className="text-xs text-charcoal/45 space-y-0.5">
              {venue && <p>📍 {venue}</p>}
              {showCount !== undefined && (
                <p>{showCount > 0 ? `${showCount} show${showCount !== 1 ? 's' : ''}` : 'No shows yet'}</p>
              )}
            </div>
            <span className="text-xs font-semibold text-accent">{cta}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}