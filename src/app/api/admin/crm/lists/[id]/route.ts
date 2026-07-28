import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import CrmList from '@/models/CrmList';
import { isAdminAuthenticated } from '@/lib/auth';

/* PATCH /api/admin/crm/lists/:id  — rename / recolour / reorder / archive one value.
   DELETE /api/admin/crm/lists/:id — remove one value.
   (Existing lead records keep any value already assigned to them as free text.) */

async function guard(id: string) {
  if (!(await isAdminAuthenticated())) return { status: 401 as const, error: 'Unauthorized' };
  if (!Types.ObjectId.isValid(id)) return { status: 400 as const, error: 'Invalid id' };
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const item = await CrmList.findById(id);
    if (!item) return NextResponse.json({ error: 'List value not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'A value is required' }, { status: 400 });
      const clash = await CrmList.findOne({ _id: { $ne: id }, kind: item.kind, name })
        .collation({ locale: 'en', strength: 2 }).lean();
      if (clash) return NextResponse.json({ error: `“${name}” already exists in this list` }, { status: 409 });
      item.name = name;
    }
    if (body.color !== undefined) item.color = String(body.color).trim();
    if (body.order !== undefined && Number.isFinite(Number(body.order))) item.order = Number(body.order);
    if (body.archived !== undefined) item.archived = Boolean(body.archived);

    await item.save();
    return NextResponse.json({ success: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update list value';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const deleted = await CrmList.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'List value not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'List value deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete list value';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
