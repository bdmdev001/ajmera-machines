import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Enquiry from '@/models/Enquiry';
import { sendEnquiryNotification } from '@/lib/mailer';
import { isAdminAuthenticated } from '@/lib/auth';
import { isValidEmail, isValidPhone, isValidGST, isValidPAN } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { productId, productTitle, stockNo, name, email, phone, company, companyAddress, gstNumber, panNumber, message } = body;

    // Validation — Company Address is now required alongside the core fields.
    if (!name || !email || !phone || !message || !companyAddress) {
      return NextResponse.json(
        { error: 'Missing required fields. Name, email, phone, company address, and message are required.' },
        { status: 400 }
      );
    }
    // Format checks mirror the client so bad data can never bypass the UI.
    if (!isValidEmail(String(email))) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!isValidPhone(String(phone))) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }
    if (gstNumber && !isValidGST(String(gstNumber))) {
      return NextResponse.json({ error: 'Please enter a valid 15-character GST number.' }, { status: 400 });
    }
    if (panNumber && !isValidPAN(String(panNumber))) {
      return NextResponse.json({ error: 'Please enter a valid 10-character PAN.' }, { status: 400 });
    }

    const newEnquiry = new Enquiry({
      productId,
      productTitle,
      stockNo,
      name,
      email,
      phone,
      company,
      companyAddress,
      gstNumber,
      panNumber,
      message,
      status: 'Pending',
    });

    await newEnquiry.save();

    // Notify admin by email — best-effort. The enquiry is already saved, so a
    // mail failure must never fail the request; it's logged, not surfaced.
    try {
      const result = await sendEnquiryNotification({
        name, email, phone, company, companyAddress, gstNumber, panNumber, message,
        productTitle, stockNo, productId,
      });
      if (!result.sent) console.error('[enquiry] admin email not sent:', result.error);
    } catch (mailErr) {
      console.error('[enquiry] admin email threw:', mailErr);
    }

    return NextResponse.json(
      { message: 'Enquiry submitted successfully!', enquiry: newEnquiry },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Enquiry API Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();

    // In production, you would authenticate this route so only admins can read it.
    // For our admin dashboard, we can fetch all enquiries sorted by date.
    const enquiries = await Enquiry.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(enquiries);
  } catch (error: any) {
    console.error('Enquiry Fetch API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch enquiries' }, { status: 500 });
  }
}

/**
 * Bulk-delete enquiries (admin only).
 * Body: { ids: string[] }. Ids are validated as Mongo ObjectIds before use, so
 * malformed input can never affect the query. Returns how many were removed.
 */
export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const ids = rawIds.filter(
      (id: unknown): id is string => typeof id === 'string' && Types.ObjectId.isValid(id),
    );

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid enquiry ids provided' }, { status: 400 });
    }

    await dbConnect();
    const result = await Enquiry.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount ?? 0 });
  } catch (error: any) {
    console.error('Enquiry Bulk Delete API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete enquiries' }, { status: 500 });
  }
}
