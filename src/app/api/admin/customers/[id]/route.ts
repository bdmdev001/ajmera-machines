import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Customer from '@/models/Customer';
import { isAdminAuthenticated } from '@/lib/auth';
import { validateCustomer } from '../route';

async function guard(id: string) {
  if (!(await isAdminAuthenticated())) return { status: 401 as const, error: 'Unauthorized' };
  if (!Types.ObjectId.isValid(id)) return { status: 400 as const, error: 'Invalid customer id' };
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const doc = await Customer.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ customer: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load customer';
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
    const { data, error } = validateCustomer(body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid data' }, { status: 400 });

    const updated = await Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ success: true, customer: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bad = await guard(id);
  if (bad) return NextResponse.json({ error: bad.error }, { status: bad.status });
  try {
    await dbConnect();
    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
