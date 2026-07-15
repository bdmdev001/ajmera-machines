import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enquiry from '@/models/Enquiry';
import { sendEnquiryNotification } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { productId, productTitle, stockNo, name, email, phone, company, message } = body;

    // Validation
    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { error: 'Missing required fields. Name, email, phone, and message are required.' },
        { status: 400 }
      );
    }

    const newEnquiry = new Enquiry({
      productId,
      productTitle,
      stockNo,
      name,
      email,
      phone,
      company,
      message,
      status: 'Pending',
    });

    await newEnquiry.save();

    // Notify admin by email — best-effort. The enquiry is already saved, so a
    // mail failure must never fail the request; it's logged, not surfaced.
    try {
      const result = await sendEnquiryNotification({
        name, email, phone, company, message,
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
