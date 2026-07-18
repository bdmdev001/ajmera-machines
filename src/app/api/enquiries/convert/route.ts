import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Enquiry from '@/models/Enquiry';
import Customer from '@/models/Customer';
import { isAdminAuthenticated } from '@/lib/auth';

/**
 * Convert one or more enquiries into customers (admin only).
 * Body: { ids: string[] }.
 *
 * Dedupe strategy — never create a duplicate customer:
 *   • If the enquiry is already linked (customerId) → skipped.
 *   • If a customer with the same email already exists → the enquiry is LINKED
 *     to it (no new record).
 *   • Otherwise a new customer is created from the enquiry and linked.
 * Returns a summary { created, linked, skipped }.
 */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const ids = rawIds.filter((id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id));
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid enquiry ids provided' }, { status: 400 });
    }

    const enquiries = await Enquiry.find({ _id: { $in: ids } }).lean();

    let created = 0, linked = 0, skipped = 0;
    const createdCustomerIds: string[] = [];

    for (const enq of enquiries) {
      // Already converted → skip.
      if (enq.customerId) { skipped += 1; continue; }

      const email = String(enq.email || '').trim().toLowerCase();
      if (!email || !enq.name || !enq.phone) { skipped += 1; continue; }

      // Dedupe by email (case-insensitive via lowercase-stored field).
      let customer = await Customer.findOne({ email });
      if (customer) {
        linked += 1;
      } else {
        customer = await Customer.create({
          companyName: (enq.company || enq.name || '').trim() || enq.name,
          gstNumber: enq.gstNumber || '',
          panNumber: enq.panNumber || '',
          companyAddress: enq.companyAddress || '',
          fullName: enq.name,
          email,
          phone: enq.phone,
          whatsapp: enq.phone || '',
        });
        created += 1;
        createdCustomerIds.push(String(customer._id));
      }

      await Enquiry.updateOne({ _id: enq._id }, { $set: { customerId: customer._id } });
    }

    return NextResponse.json({ success: true, created, linked, skipped, createdCustomerIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to convert enquiries';
    console.error('Enquiry convert error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
