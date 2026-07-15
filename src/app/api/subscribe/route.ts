import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Subscriber from '@/models/Subscriber';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST — newsletter signup. Validates, de-duplicates (friendly), stores. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Subscriber.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json({ ok: true, already: true, message: "You're already subscribed." });
    }

    await Subscriber.create({ email });
    return NextResponse.json({ ok: true, already: false, message: 'Subscribed successfully!' }, { status: 201 });
  } catch (error) {
    // Duplicate key from the unique index (race condition) is a friendly no-op.
    if (error && typeof error === 'object' && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ ok: true, already: true, message: "You're already subscribed." });
    }
    console.error('Subscribe error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
