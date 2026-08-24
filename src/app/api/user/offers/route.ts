export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const offers = await prisma.offer.findMany({
      where: {
        waitlist: { userId },
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        waitlist: {
          include: {
            show: {
              include: {
                event: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ offers });
  } catch (error: any) {
    console.error('Fetch offers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' }, 
      { status: 500 }
    );
  }
}
