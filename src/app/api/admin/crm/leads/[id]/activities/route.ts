import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity, { ACTIVITY_TYPES, type ActivityType } from '@/models/Activity';
import { isAdminAuthenticated } from '@/lib/auth';
import { serializeActivity } from '@/lib/lead';

/* GET  /api/admin/crm/leads/:id/activities  → timeline (newest first)
   POST /api/admin/crm/leads/:id/activities  → add note / call / email / follow-up
   A follow-up entry (with dueAt) also updates the record's nextFollowUp fields.  */

async function guard(id: string) {
  if (!(await isAdminAuthenticated())) return { status: 401 as const, error: 'Unauthorized' };
  if (!Types.ObjectId.isValid(id)) return { status: 400 as const, error: 'Invalid record id' };
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const acts = await Activity.find({ leadId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ activities: acts.map((a) => serializeActivity(a as Record<string, unknown>)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load activities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const lead = await Lead.findById(id);
    if (!lead) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const type = (ACTIVITY_TYPES as readonly string[]).includes(body?.type) ? (body.type as ActivityType) : 'note';
    const title = String(body?.title || '').trim();
    const text = String(body?.body || '').trim();
    if (!title && !text) return NextResponse.json({ error: 'Add a note or title for this activity.' }, { status: 400 });

    let dueAt: Date | null = null;
    if (body?.dueAt) {
      const d = new Date(String(body.dueAt));
      if (!Number.isNaN(d.getTime())) dueAt = d;
    }

    const activity = await Activity.create({ leadId: id, type, title, body: text, dueAt });

    // A scheduled follow-up becomes the record's "next follow-up".
    if (type === 'follow-up' && dueAt) {
      lead.nextFollowUpAt = dueAt;
      lead.nextFollowUpNote = text || title;
      await lead.save().catch(() => { /* non-fatal */ });
    }

    return NextResponse.json({ success: true, activity: serializeActivity(activity.toObject()) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
