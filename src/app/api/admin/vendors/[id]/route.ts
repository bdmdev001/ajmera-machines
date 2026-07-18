import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import { isAdminAuthenticated } from '@/lib/auth';
import { validateVendor } from '../route';

async function guard(id: string) {
  if (!(await isAdminAuthenticated())) return { status: 401 as const, error: 'Unauthorized' };
  if (!Types.ObjectId.isValid(id)) return { status: 400 as const, error: 'Invalid vendor id' };
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const doc = await Vendor.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json({ vendor: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load vendor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const { data, error } = validateVendor(body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid data' }, { status: 400 });
    const updated = await Vendor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json({ success: true, vendor: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update vendor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const deleted = await Vendor.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Vendor deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete vendor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
