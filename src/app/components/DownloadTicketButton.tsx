'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export function DownloadTicketButton({ targetId, ticketId }: { targetId: string, ticketId: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;

    setIsDownloading(true);

    try {
      // Capture the ticket element as a canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true, // Allow cross-origin images
        backgroundColor: '#111111', // Ensure black background for the PDF
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Dynamically set orientation based on ticket layout (mobile vs desktop)
      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`ticket-${ticketId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={isDownloading}
      className="btn-ghost text-white border-white/20 hover:bg-white/10 w-full sm:w-auto whitespace-nowrap"
    >
      {isDownloading ? 'Generating PDF...' : 'Download PDF'}
    </button>
  );
}
