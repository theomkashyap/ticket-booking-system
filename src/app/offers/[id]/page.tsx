export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AppNavbar } from '@/app/components/Navbar';
import AcceptOfferClient from './AcceptOfferClient';

export default async function OfferPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/login?callbackUrl=/offers/${params.id}`);
  }

  const userId = (session.user as any).id;

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: {
      waitlist: {
        include: {
          show: {
            include: {
              event: true,
              venue: true,
              prices: true,
            }
          }
        }
      }
    }
  });

  if (!offer || offer.waitlist.userId !== userId) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar userName={session.user?.name} activeLink="history" />
        <div className="container-main py-20 text-center">
          <div className="card max-w-md mx-auto">
            <h1 className="font-serif text-3xl text-charcoal mb-4">Offer Not Found</h1>
            <p className="text-charcoal/60 mb-6">This offer doesn't exist or doesn't belong to you.</p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = offer.status === 'EXPIRED' || offer.expiresAt < new Date();
  const isAccepted = offer.status === 'ACCEPTED';
  
  const priceRecord = offer.waitlist.show.prices.find(p => p.category === offer.waitlist.category);
  const price = priceRecord ? Number(priceRecord.price) : 0;

  // Fetch the specific seat details for the offer
  const seat = await prisma.seat.findUnique({
    where: { id: offer.seatId }
  });

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar userName={session.user?.name} activeLink="history" />
      <div className="container-main py-12 md:py-20">
        <div className="w-full">
          {isAccepted ? (
            <div className="card text-center p-8 border-green-100 bg-green-50/30 max-w-xl mx-auto">
              <div className="text-4xl mb-4">🎟️</div>
              <h1 className="font-serif text-3xl text-charcoal mb-2">Offer Accepted!</h1>
              <p className="text-charcoal/60">You have successfully booked this ticket.</p>
            </div>
          ) : isExpired ? (
            <div className="card text-center p-8 border-red-100 bg-red-50/30 max-w-xl mx-auto">
              <div className="text-4xl mb-4">⌛</div>
              <h1 className="font-serif text-3xl text-charcoal mb-2">Offer Expired</h1>
              <p className="text-charcoal/60">This offer has expired and the seat has been released to the next person on the waitlist.</p>
            </div>
          ) : (
            <AcceptOfferClient offer={offer} price={price} seat={seat} />
          )}
        </div>
      </div>
    </div>
  );
}
