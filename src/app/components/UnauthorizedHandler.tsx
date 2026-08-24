'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dialog } from './Dialog';

export function UnauthorizedHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'unauthorized_admin' || err === 'unauthorized_organiser') {
      setErrorType(err);
      setIsOpen(true);
      
      // Clean up the URL so it doesn't pop up again on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
  }, [searchParams]);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Access Denied"
      actions={
        <button 
          onClick={() => setIsOpen(false)} 
          className="btn-primary py-2 px-5 text-sm rounded"
        >
          Okay
        </button>
      }
    >
      <p className="mb-4 text-charcoal/70">
        {errorType === 'unauthorized_admin' 
          ? "You do not have permission to access the admin area. Only administrators can view venues and layout settings."
          : "You do not have permission to access the organiser area. Only event organisers can view this section."}
      </p>
    </Dialog>
  );
}
