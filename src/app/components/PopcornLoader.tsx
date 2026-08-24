'use client';

interface PopcornLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PopcornLoader({ 
  text, 
  size = 'md', 
  className = '' 
}: PopcornLoaderProps) {
  const sizeMap = {
    sm: { wrapper: 'w-5 h-6', kernel: 'w-[4px] h-[4px]', textCls: 'text-xs' },
    md: { wrapper: 'w-10 h-12', kernel: 'w-2 h-2', textCls: 'text-sm' },
    lg: { wrapper: 'w-16 h-20', kernel: 'w-3 h-3', textCls: 'text-lg' },
  };

  const { wrapper, kernel, textCls } = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`relative flex flex-col items-center justify-end ${wrapper}`}>
        
        {/* Popcorn Kernels Animating */}
        <div className="absolute top-0 w-[120%] flex justify-center items-center gap-[12%] z-0">
          <div className={`${kernel} bg-amber-400 rounded-[40%] animate-bounce [animation-delay:-0.3s] shadow-sm`} />
          <div className={`${kernel} bg-amber-300 rounded-[45%] animate-bounce [animation-delay:-0.15s] shadow-sm`} />
          <div className={`${kernel} bg-amber-500 rounded-full animate-bounce shadow-sm`} />
        </div>
        
        {/* Popcorn Box (Flat Minimalist SVG) */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-[65%] z-10"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Box Base (Off-white) */}
          <path d="M15 0 L85 0 L75 100 L25 100 Z" fill="#FAFAF8" />
          
          {/* Accent Red Stripes */}
          <path d="M15 0 L25 0 L28 100 L25 100 Z" fill="#C8102E" />
          <path d="M35 0 L45 0 L44 100 L38 100 Z" fill="#C8102E" />
          <path d="M55 0 L65 0 L60 100 L56 100 Z" fill="#C8102E" />
          <path d="M75 0 L85 0 L75 100 L72 100 Z" fill="#C8102E" />
          
          {/* Top border line for separation */}
          <path d="M15 0 L85 0" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" opacity="0.1" />
        </svg>
      </div>

      {text && size !== 'sm' && (
        <div className="text-center animate-pulse">
          <p className={`font-serif text-charcoal/80 ${textCls}`}>{text}</p>
        </div>
      )}
    </div>
  );
}
