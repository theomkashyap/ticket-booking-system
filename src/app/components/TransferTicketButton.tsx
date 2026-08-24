'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from './Dialog';
import LoadingMessage from './LoadingMessage';

export function TransferTicketButton({ bookingId, seatId }: { bookingId: string, seatId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const executeTransfer = async () => {
    if (!email) {
      setErrorMsg('Please enter an email address.');
      return;
    }
    
    setIsTransferring(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/bookings/${bookingId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, transferEmail: email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transfer ticket');
      
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-2 px-3 text-sm font-medium border border-white/20 text-white/80 hover:bg-white/10 transition-colors duration-150 rounded"
      >
        Transfer Ticket
      </button>

      <Dialog 
        isOpen={isOpen} 
        onClose={() => { setIsOpen(false); setEmail(''); setErrorMsg(''); }} 
        title="Transfer Ticket"
        actions={
          <>
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-charcoal/70 hover:text-charcoal transition-colors">Cancel</button>
            <button onClick={executeTransfer} disabled={isTransferring} className="btn-primary py-2 px-5 text-sm rounded min-w-[120px]">
              {isTransferring ? <LoadingMessage variant="inline" /> : 'Transfer'}
            </button>
          </>
        }
      >
        <p className="mb-4 text-charcoal/70">
          Enter the email address of the person you want to transfer this ticket to. 
          They must already have an account registered with this email.
        </p>
        <input 
          type="email" 
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-charcoal/20 rounded p-2 text-charcoal focus:ring-1 focus:ring-accent outline-none"
        />
        {errorMsg && <p className="text-red-500 text-sm mt-3">{errorMsg}</p>}
      </Dialog>
    </>
  );
}
