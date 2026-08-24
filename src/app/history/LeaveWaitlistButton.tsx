'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '../components/Dialog';
import LoadingMessage from '@/app/components/LoadingMessage';

export default function LeaveWaitlistButton({ waitlistId }: { waitlistId: string }) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const executeLeave = async () => {
    setShowConfirm(false);
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/waitlist/${waitlistId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to leave waitlist');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
      setIsLeaving(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowConfirm(true)} 
        disabled={isLeaving}
        className="btn-ghost py-1.5 px-4 text-sm font-medium"
      >
        {isLeaving ? <LoadingMessage variant="inline" /> : 'Leave Waitlist'}
      </button>

      <Dialog 
        isOpen={showConfirm} 
        onClose={() => setShowConfirm(false)} 
        title="Leave Waitlist"
        actions={
          <>
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors">Cancel</button>
            <button onClick={executeLeave} disabled={isLeaving} className="btn-primary bg-accent hover:bg-red-700 py-2 px-5 text-sm rounded text-white min-w-[140px]">
              {isLeaving ? <LoadingMessage variant="inline" /> : 'Yes, Leave Waitlist'}
            </button>
          </>
        }
      >
        Are you sure you want to leave the waitlist for this event?
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
