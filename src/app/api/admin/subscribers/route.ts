import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Subscriber from '@/models/Subscriber';
import { isAdminAuthenticated } from '@/lib/auth';

/* Server-side paginated list of newsletter subscribers (admin only).
   GET /api/admin/subscribers?page=1&limit=25   (limit: 25 | 50 | 100 | all)   */

const ALLOWED_LIMITS = [25, 50, 100];
/** Safety cap for "Show All" so a huge collection can't be pulled in one go. */
const SHOW_ALL_CAP = 1000;

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limitParam = (searchParams.get('limit') || '25').toLowerCase();
    const isAll = limitParam === 'all';

    let limit = parseInt(limitParam, 10);
    if (!isAll && !ALLOWED_LIMITS.includes(limit)) limit = 25;

    const total = await Subscriber.countDocuments({});

    // "All" collapses to a single (capped) page; otherwise standard skip/limit.
    const effectiveLimit = isAll ? SHOW_ALL_CAP : limit;
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const skip = isAll ? 0 : (page - 1) * limit;

    const docs = await Subscriber.find({})
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(effectiveLimit)
      .lean();

    const subscribers = docs.map((d) => ({
      _id: String(d._id),
      email: d.email,
      status: d.status,
      subscribedAt: d.subscribedAt ? new Date(d.subscribedAt).toISOString() : null,
    }));

    return NextResponse.json({
      subscribers,
      total,
      page,
      totalPages,
      limit: isAll ? 'all' : limit,
      capped: isAll && total > SHOW_ALL_CAP, // true when "All" hit the safety cap
      cap: SHOW_ALL_CAP,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load subscribers';
    console.error('Subscribers GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
