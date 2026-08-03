import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import Enquiry from '@/models/Enquiry';
import ConversionLog from '@/models/ConversionLog';
import { isAdminAuthenticated } from '@/lib/auth';

/* POST /api/admin/crm/leads/bulk-delete
   Body: { ids: string[] }

   Deletes the selected leads/customers and everything that hangs off them, so
   the collection is left without orphans — exactly the same cleanup the
   single-record DELETE performs, just batched:
     · the records themselves
     · their activity timeline
     · their conversion history
     · enquiries are unlinked (never deleted — an enquiry is its own record) */

/** Guard rail: a UI selection is at most a page or a filtered set, not a whole DB. */
const MAX_IDS = 500;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const raw: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
    const ids = [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one record to delete.' }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `Delete at most ${MAX_IDS} records at a time.` }, { status: 400 });
    }

    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) {
      return NextResponse.json({ error: 'None of the selected ids are valid.' }, { status: 400 });
    }
    const objectIds = valid.map((id) => new Types.ObjectId(id));

    // Remove the records first — if anything below fails the records are still
    // gone, which is the state the admin asked for.
    const result = await Lead.deleteMany({ _id: { $in: objectIds } });

    await Promise.all([
      Activity.deleteMany({ leadId: { $in: objectIds } }).catch(() => { /* non-fatal */ }),
      ConversionLog.deleteMany({ leadId: { $in: objectIds } }).catch(() => { /* non-fatal */ }),
      Enquiry.updateMany({ customerId: { $in: objectIds } }, { $unset: { customerId: '' } }).catch(() => { /* non-fatal */ }),
    ]);

    return NextResponse.json({
      success: true,
      requested: ids.length,
      deleted: result.deletedCount ?? 0,
      // Already-gone rows (deleted in another tab, say) are reported, not an error.
      notFound: Math.max(0, valid.length - (result.deletedCount ?? 0)),
      invalid: ids.length - valid.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete records';
    console.error('CRM bulk delete error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
