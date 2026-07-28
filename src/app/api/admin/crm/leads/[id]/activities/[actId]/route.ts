import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import { isAdminAuthenticated } from '@/lib/auth';
import { serializeActivity } from '@/lib/lead';

/* PATCH  /api/admin/crm/leads/:id/activities/:actId → mark follow-up done / edit
   DELETE /api/admin/crm/leads/:id/activities/:actId → remove an activity          */

async function guard(id: string, actId: string) {
  if (!(await isAdminAuthenticated())) return { status: 401 as const, error: 'Unauthorized' };
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(actId)) {
    return { status: 400 as const, error: 'Invalid id' };
  }
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; actId: string }> }) {
  const { id, actId } = await params;
  const bad = await guard(id, actId);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const activity = await Activity.findOne({ _id: actId, leadId: id });
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    if (body.done !== undefined) activity.done = Boolean(body.done);
    if (body.title !== undefined) activity.title = String(body.title).trim();
    if (body.body !== undefined) activity.body = String(body.body).trim();
    await activity.save();

    // Clearing a completed follow-up clears the record's "next follow-up" flag.
    if (body.done === true && activity.type === 'follow-up') {
      await Lead.updateOne(
        { _id: id, nextFollowUpAt: activity.dueAt },
        { $set: { nextFollowUpAt: null, nextFollowUpNote: '' } },
      ).catch(() => { /* non-fatal */ });
    }

    return NextResponse.json({ success: true, activity: serializeActivity(activity.toObject()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; actId: string }> }) {
  const { id, actId } = await params;
  const bad = await guard(id, actId);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const deleted = await Activity.findOneAndDelete({ _id: actId, leadId: id });
    if (!deleted) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
