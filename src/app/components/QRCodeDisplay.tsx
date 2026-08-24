'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeDisplay({ text, size = 250 }: { text: string, size?: number }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(text, { 
      width: size, 
      margin: 1, 
      color: { dark: '#1e1e1e', light: '#ffffff' } 
    })
      .then(setSrc)
      .catch(console.error);
  }, [text, size]);

  if (!src) return <div style={{ width: size, height: size }} className="bg-charcoal/5 animate-pulse rounded-xl mx-auto"></div>;

  return (
    <img 
      src={src} 
      alt="QR Code" 
      width={size} 
      height={size} 
      className="mx-auto rounded-xl shadow-sm border border-charcoal/10 p-2 bg-white" 
    />
  );
}
