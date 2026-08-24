'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  "Popping the kernels...",
  "Dimming the houselights...",
  "Tuning the instruments...",
  "Printing the tickets...",
  "Unrolling the red carpet...",
  "Setting the stage...",
  "Preparing the marquee..."
];

export default function LoadingMessage({ 
  variant = 'inline',
  className = ''
}: { 
  variant?: 'inline' | 'page';
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Pick a random starting point only on client to avoid hydration mismatch
    setIndex(Math.floor(Math.random() * MESSAGES.length));
    
    const intervalId = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % MESSAGES.length);
        setIsFading(false);
      }, 300); // 300ms fade out
    }, 2500); // cycle every 2.5 seconds

    return () => clearInterval(intervalId);
  }, []);

  if (variant === 'page') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`text-center h-6 overflow-hidden transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          <p className="font-sans font-medium text-charcoal/80 tracking-wide text-sm animate-breathe">
            {MESSAGES[index]}
          </p>
        </div>
      </div>
    );
  }

  // Inline for buttons
  return (
    <div className={`flex items-center justify-center overflow-hidden transition-opacity duration-300 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'} ${className}`}>
      <span className="font-sans text-inherit tracking-wide whitespace-nowrap animate-breathe">
        {MESSAGES[index]}
      </span>
    </div>
  );
}
