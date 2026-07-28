import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import ConversionLog from '@/models/ConversionLog';
import { isAdminAuthenticated } from '@/lib/auth';
import { serializeLead, serializeConversionLog } from '@/lib/lead';
import { TRANSITIONS, stageOf, type LifecycleStage } from '@/types/crm';

/* POST /api/admin/crm/leads/:id/transition
   Body: { to: 'Enquiry'|'Lead'|'Customer', reason: string, comments?: string }

   Moves the single master record forward or backward through the lifecycle
   (Enquiry ↔ Lead ↔ Customer). ONLY the workflow stage changes — every activity,
   note, follow-up, purchase, tag, custom field and relationship is preserved
   (nothing is copied or deleted, so no duplicates are ever created). Each move
   is recorded on the timeline (Activity) and in the immutable ConversionLog. */

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid record id' }, { status: 400 });

  try {
    await dbConnect();
    const lead = await Lead.findById(id);
    if (!lead) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const to = String(body?.to || '') as LifecycleStage;
    const reason = String(body?.reason || '').trim();
    const comments = String(body?.comments || '').trim();

    const from = stageOf({ stage: lead.stage as LifecycleStage | undefined, recordType: lead.recordType });

    // Only the adjacent forward/back moves defined for the current stage are allowed.
    const def = TRANSITIONS[from]?.find((t) => t.to === to);
    if (!def) {
      return NextResponse.json({ error: `Cannot move from ${from} to ${to || '(none)'}.` }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ error: 'A reason is required.' }, { status: 400 });
    if (reason === 'Other' && !comments) {
      return NextResponse.json({ error: 'Please add an explanation when the reason is “Other”.' }, { status: 400 });
    }

    // Apply — stage is authoritative; recordType stays synced for existing
    // filters/exports. convertedAt is stamped once and kept (marks a former
    // customer even after a move back to Lead).
    lead.stage = to;
    lead.recordType = to === 'Customer' ? 'Customer' : 'Lead';
    if (to === 'Customer' && !lead.convertedAt) lead.convertedAt = new Date();
    await lead.save();

    const title = def.direction === 'forward' ? `Converted to ${to}` : `Moved back to ${to}`;
    await Activity.create({
      leadId: lead._id,
      type: to === 'Customer' ? 'converted' : 'stage-change',
      title,
      body: `Reason: ${reason}${comments ? ` — ${comments}` : ''}`,
    }).catch(() => { /* non-fatal */ });

    const logDoc = await ConversionLog.create({
      leadId: lead._id, fromStage: from, toStage: to, reason, comments, admin: 'Admin',
    });

    return NextResponse.json({
      success: true,
      lead: serializeLead(lead.toObject()),
      conversionLog: serializeConversionLog(logDoc.toObject()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to move record';
    console.error('Lead transition error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
