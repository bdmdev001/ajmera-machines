import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Subscriber from '@/models/Subscriber';
import { isAdminAuthenticated } from '@/lib/auth';

/** DELETE /api/admin/subscribers/:id — remove one subscriber (admin only). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid subscriber id' }, { status: 400 });
    }

    await dbConnect();
    const deleted = await Subscriber.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Subscriber deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subscriber';
    console.error('Subscriber DELETE error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
