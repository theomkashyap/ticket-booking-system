'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '../components/Dialog';
import LoadingMessage from '@/app/components/LoadingMessage';

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isCanceling, setIsCanceling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const executeCancel = async () => {
    setShowConfirm(false);
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to cancel');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
      setIsCanceling(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowConfirm(true)} 
        disabled={isCanceling}
        className="btn-ghost py-1 px-3 text-sm text-accent"
      >
        {isCanceling ? <LoadingMessage variant="inline" /> : 'Cancel Booking'}
      </button>

      <Dialog 
        isOpen={showConfirm} 
        onClose={() => setShowConfirm(false)} 
        title="Cancel Booking"
        actions={
          <>
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors">Go Back</button>
            <button onClick={executeCancel} disabled={isCanceling} className="btn-primary bg-accent hover:bg-red-700 py-2 px-5 text-sm rounded text-white min-w-[120px]">
              {isCanceling ? <LoadingMessage variant="inline" /> : 'Yes, Cancel It'}
            </button>
          </>
        }
      >
        Are you sure you want to cancel this booking? This action cannot be undone.
      </Dialog>

      <Dialog 
        isOpen={!!errorMsg} 
        onClose={() => setErrorMsg('')} 
        title="Error"
        actions={
          <button onClick={() => setErrorMsg('')} className="btn-primary py-2 px-6 text-sm rounded">OK</button>
        }
      >
        {errorMsg}
      </Dialog>
    </>
  );
}
