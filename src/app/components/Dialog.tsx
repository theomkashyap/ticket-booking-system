'use client';

import { ReactNode, useEffect } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}

export function Dialog({ isOpen, onClose, title, children, actions }: DialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl border border-charcoal/10 w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
        <div className="p-6">
          <h3 className="font-serif text-xl font-medium text-charcoal mb-2">{title}</h3>
          <div className="text-sm text-charcoal/70 leading-relaxed">
            {children}
          </div>
        </div>
        <div className="bg-charcoal/3 px-6 py-4 flex items-center justify-end gap-3 border-t border-charcoal/5">
          {actions}
        </div>
      </div>
    </div>
  );
}
