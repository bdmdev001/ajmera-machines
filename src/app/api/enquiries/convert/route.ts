import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Enquiry from '@/models/Enquiry';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import ConversionLog from '@/models/ConversionLog';
import { isAdminAuthenticated } from '@/lib/auth';

/**
 * Convert one or more website enquiries into LEADS (admin only) — pipeline
 * stage 2 (Enquiry → Lead → Customer). This never auto-runs; the admin triggers
 * it after confirming an enquiry is a genuine opportunity.
 *
 * Body: { ids: string[] }.
 *
 * The original enquiry is PRESERVED and linked (`enquiry.leadId`), and the Lead
 * keeps `sourceEnquiryId`, so the full customer journey stays traceable. The
 * enquiry's requirement (message) becomes the Lead's requirement details, and
 * the enquired machine becomes an interested product.
 *
 * Dedupe strategy — never create a duplicate:
 *   • Enquiry already converted (leadId) → skipped.
 *   • A record with the same email already exists → the enquiry is LINKED to it.
 *   • Otherwise a new Lead (recordType 'Lead', stage 'New') is created + linked.
 * Returns { created, linked, skipped, createdLeadIds }.
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
    const createdLeadIds: string[] = [];

    for (const enq of enquiries) {
      // Already converted → skip.
      if (enq.leadId || enq.customerId) { skipped += 1; continue; }

      const email = String(enq.email || '').trim().toLowerCase();
      if (!email || !enq.name || !enq.phone) { skipped += 1; continue; }

      // Dedupe by email against the unified Leads/Customers collection.
      let record = await Lead.findOne({ email });
      if (record) {
        linked += 1;
      } else {
        const parts = String(enq.name).trim().split(/\s+/);
        const firstName = parts.shift() || enq.name;
        const lastName = parts.join(' ');
        record = await Lead.create({
          recordType: 'Lead',
          stage: 'Lead',
          firstName,
          lastName,
          organisation: (enq.company || '').trim(),
          email,
          mobile: enq.phone,
          whatsapp: enq.phone || '',
          gstNumber: enq.gstNumber || '',
          panNumber: enq.panNumber || '',
          addressLine1: enq.companyAddress || '',
          leadStage: 'New',
          requirementDetails: enq.message || '',
          interestedProducts: enq.productTitle ? [enq.productTitle] : [],
          sourceEnquiryId: enq._id,
        });
        created += 1;
        createdLeadIds.push(String(record._id));
        await Activity.create({
          leadId: record._id,
          type: 'created',
          title: 'Converted from enquiry',
          body: enq.productTitle ? `Enquiry about: ${enq.productTitle}` : (enq.message ? String(enq.message).slice(0, 200) : ''),
        }).catch(() => { /* non-fatal */ });
        // Record the Enquiry → Lead transition in the immutable audit trail.
        await ConversionLog.create({
          leadId: record._id, fromStage: 'Enquiry', toStage: 'Lead',
          reason: 'Converted from enquiry', comments: '', admin: 'Admin',
        }).catch(() => { /* non-fatal */ });
      }

      // Preserve + link the enquiry, and mark it Qualified now that it is a lead.
      await Enquiry.updateOne({ _id: enq._id }, { $set: { leadId: record._id, status: 'Qualified' } });
    }

    return NextResponse.json({ success: true, created, linked, skipped, createdLeadIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to convert enquiries';
    console.error('Enquiry convert error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
