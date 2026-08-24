import QRCode from 'qrcode';
import { Resend } from 'resend';

// Use real Resend client if API key is provided and not a placeholder
const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your-api-key')
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function generateQRCode(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code');
  }
}

interface BookingEmailData {
  to: string;
  eventName: string;
  showTime: Date;
  reference: string;
  seats: string[];
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  try {
    const qrCodeDataUrl = await generateQRCode(data.reference);
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

    if (!resend) {
      console.warn('RESEND_API_KEY not set. Skipping booking confirmation email for', data.to);

      return;
    }

    // In a real app, use the actual Resend SDK
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Curtain <onboarding@resend.dev>',
      to: data.to, // Using actual user email
      subject: `Your Tickets: ${data.eventName}`,
      html: `
        <h1>Booking Confirmed!</h1>
        <p>Your tickets for <strong>${data.eventName}</strong> are confirmed.</p>
        <p><strong>Showtime:</strong> ${data.showTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
        <p><strong>Seats:</strong> ${data.seats.join(', ')}</p>
        <p><strong>Reference:</strong> ${data.reference}</p>
        <p>Present the QR code below at the venue:</p>
        <img src="cid:ticket-qr.png" alt="Ticket QR Code" />
      `,
      attachments: [
        {
          filename: 'ticket-qr.png',
          content: base64Data,
          content_id: 'ticket-qr.png'
        }
      ] as any[],
    });
  } catch (error) {
    console.error('Failed to send booking email:', error);
    // Fail gracefully so booking still succeeds even if email fails
  }
}

interface WaitlistOfferEmailData {
  to: string;
  eventName: string;
  showTime: Date;
  expiresAt: Date;
  offerId: string;
}

export async function sendWaitlistOfferEmail(data: WaitlistOfferEmailData) {
  try {
    if (!resend) {
      console.warn('RESEND_API_KEY not set. Skipping waitlist offer email for', data.to);

      return;
    }

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Curtain <onboarding@resend.dev>',
      to: [data.to, 'omkashyap209@gmail.com'], // Send to both actual and verified test email
      subject: `Tickets Available: ${data.eventName}`,
      html: `
        <h1>Great News!</h1>
        <p>Tickets are now available for <strong>${data.eventName}</strong>.</p>
        <p><strong>Showtime:</strong> ${data.showTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
        <p>You have until <strong>${data.expiresAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}</strong> to claim your tickets.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/offers/${data.offerId}">
          Click here to accept offer and book tickets
        </a>
      `,
    });

  } catch (error) {
    console.error('Failed to send waitlist email:', error);
  }
}

interface WaitlistJoinEmailData {
  to: string;
  eventName: string;
  showTime: Date;
  category: string;
}

export async function sendWaitlistJoinEmail(data: WaitlistJoinEmailData) {
  try {
    if (!resend) {
      console.warn('RESEND_API_KEY not set. Skipping waitlist join email for', data.to);

      return;
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Curtain <onboarding@resend.dev>',
      to: data.to, // Using actual user email
      subject: `You're on the waitlist for ${data.eventName}`,
      html: `
        <h1>You're on the Waitlist!</h1>
        <p>You have successfully joined the waitlist for <strong>${data.eventName}</strong>.</p>
        <p><strong>Showtime:</strong> ${data.showTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p>We'll email you immediately if any tickets in this category become available.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send waitlist join email:', error);
  }
}

interface TransferEmailData {
  to: string;
  eventName: string;
  showTime: Date;
  reference: string;
  seat: string;
  fromName: string;
}

export async function sendTicketTransferEmail(data: TransferEmailData) {
  try {
    if (!resend) {
      console.warn('RESEND_API_KEY not set. Skipping transfer email for', data.to);

      return;
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Curtain <onboarding@resend.dev>',
      to: [data.to, 'omkashyap209@gmail.com'], // using the same pattern to ensure delivery in sandbox
      subject: `Ticket Transfer: ${data.eventName}`,
      html: `
        <h1>You've received a ticket!</h1>
        <p><strong>${data.fromName}</strong> just transferred a ticket to you for <strong>${data.eventName}</strong>.</p>
        <p><strong>Showtime:</strong> ${data.showTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
        <p><strong>Seat:</strong> ${data.seat}</p>
        <p><strong>Reference:</strong> ${data.reference}</p>
        <br/>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/history" style="display:inline-block;padding:12px 24px;background-color:#111111;color:white;text-decoration:none;border-radius:4px;font-weight:bold;">
          View Your Ticket
        </a>
      `,
    });
  } catch (error) {
    console.error('Failed to send transfer email:', error);
  }
}
