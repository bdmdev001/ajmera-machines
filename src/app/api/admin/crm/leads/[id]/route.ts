import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import Enquiry from '@/models/Enquiry';
import ConversionLog from '@/models/ConversionLog';
import { isAdminAuthenticated } from '@/lib/auth';
import { validateLead, serializeLead, serializeActivity, serializeConversionLog } from '@/lib/lead';

/* GET    /api/admin/crm/leads/:id  → record + activity timeline + related enquiries
   PATCH  /api/admin/crm/leads/:id  → update (logs a stage-change activity)
   DELETE /api/admin/crm/leads/:id  → remove record and its activities            */

async function guard(id: string) {
  if (!(await isAdminAuthenticated())) return { status: 401 as const, error: 'Unauthorized' };
  if (!Types.ObjectId.isValid(id)) return { status: 400 as const, error: 'Invalid record id' };
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const doc = await Lead.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const lead = serializeLead(doc as Record<string, unknown>);

    const acts = await Activity.find({ leadId: id }).sort({ createdAt: -1 }).lean();
    const activities = acts.map((a) => serializeActivity(a as Record<string, unknown>));

    // Immutable lifecycle audit trail (oldest → newest).
    const logs = await ConversionLog.find({ leadId: id }).sort({ createdAt: 1 }).lean();
    const conversionLogs = logs.map((l) => serializeConversionLog(l as Record<string, unknown>));

    // Related website enquiries — matched by the same email or mobile number.
    const or: Record<string, unknown>[] = [];
    if (lead.email) or.push({ email: new RegExp(`^${escapeRegex(lead.email)}$`, 'i') });
    if (lead.mobile) or.push({ phone: lead.mobile });
    let enquiries: unknown[] = [];
    if (or.length) {
      const eDocs = await Enquiry.find({ $or: or }).sort({ createdAt: -1 }).limit(50).lean();
      enquiries = eDocs.map((e) => ({
        _id: String(e._id),
        productTitle: e.productTitle || '',
        stockNo: e.stockNo || '',
        message: e.message || '',
        status: e.status || 'New',
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      }));
    }

    return NextResponse.json({ lead, activities, enquiries, conversionLogs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const existing = await Lead.findById(id).lean();
    if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { data, error } = validateLead(body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid data' }, { status: 400 });

    const updated = await Lead.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    // Log a stage change on the timeline when it actually changed.
    const prevStage = (existing as Record<string, unknown>).leadStage as string || '';
    if (data.leadStage && data.leadStage !== prevStage) {
      await Activity.create({
        leadId: id,
        type: 'stage-change',
        title: `Stage changed to ${data.leadStage}`,
        body: prevStage ? `Previously: ${prevStage}` : '',
      }).catch(() => { /* non-fatal */ });
    }

    return NextResponse.json({ success: true, lead: serializeLead(updated.toObject()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    await Activity.deleteMany({ leadId: id }).catch(() => { /* non-fatal */ });
    // Unlink any enquiries that pointed at this record (best-effort).
    await Enquiry.updateMany({ customerId: id }, { $unset: { customerId: '' } }).catch(() => { /* non-fatal */ });
    return NextResponse.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
