import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import CrmList from '@/models/CrmList';
import { isAdminAuthenticated } from '@/lib/auth';

/* PATCH /api/admin/crm/leads/:id/customer-group
   Body: { customerGroup: string }   ('' clears it — "No group")

   Single-field endpoint for the inline dropdown in the Leads & Customers
   listing. It exists rather than reusing PATCH /api/admin/crm/leads/:id
   because that route runs validateLead(), which requires First Name, Email and
   Mobile — a whole-record contract that a one-field inline edit can't satisfy
   and that must not be relaxed. Nothing else on the record is touched.

   The submitted value must be one of the admin's own non-archived Customer
   Groups, so the dropdown can't be used to write arbitrary strings. */

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });
    }

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const requested = String(body?.customerGroup ?? '').trim();

    // Resolve against the admin-managed list so the stored value always matches
    // a real group in its canonical casing. '' is allowed and means "no group".
    let customerGroup = '';
    if (requested) {
      const groups = await CrmList.find(
        { kind: 'customerGroup', archived: { $ne: true } },
        { name: 1 },
      ).lean();
      const hit = groups.find((g) => (g.name || '').toLowerCase() === requested.toLowerCase());
      if (!hit) {
        return NextResponse.json(
          { error: `“${requested}” isn’t an active customer group. Refresh the page and try again.` },
          { status: 400 },
        );
      }
      customerGroup = hit.name;
    }

    const before = await Lead.findById(id).select('customerGroup').lean();
    if (!before) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const previous = (before as { customerGroup?: string }).customerGroup || '';
    if (previous === customerGroup) {
      // Nothing changed — succeed without writing or logging a no-op activity.
      return NextResponse.json({ success: true, customerGroup, changed: false });
    }

    await Lead.updateOne({ _id: id }, { $set: { customerGroup } });

    // Audit trail — the same timeline the detail page renders (best-effort).
    await Activity.create({
      leadId: id,
      type: 'note',
      title: 'Customer group changed',
      body: `${previous || 'No group'} → ${customerGroup || 'No group'}`,
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({ success: true, customerGroup, previous, changed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update customer group';
    console.error('Customer group update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
