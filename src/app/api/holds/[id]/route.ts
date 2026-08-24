import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const holdId = params.id;

    // Verify ownership
    const hold = await prisma.seatHold.findUnique({
      where: { id: holdId }
    });

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    if (hold.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the hold immediately
    await prisma.seatHold.delete({
      where: { id: holdId }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Delete hold error:', error);
    return NextResponse.json(
      { error: 'Failed to delete hold' },
      { status: 500 }
    );
  }
}
