import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enquiry from '@/models/Enquiry';
import { isAdminAuthenticated } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { status, customerId } = body;

    // Build a partial update from whichever fields were supplied. Status (when
    // present) is validated; customerId links the enquiry to a Customer record.
    const update: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!['Pending', 'Reviewed', 'Resolved'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      update.status = status;
    }
    if (customerId !== undefined) {
      update.customerId = customerId || null;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updatedEnquiry = await Enquiry.findByIdAndUpdate(id, update, { new: true });

    if (!updatedEnquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, enquiry: updatedEnquiry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update enquiry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const deleted = await Enquiry.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete enquiry' }, { status: 500 });
  }
}
