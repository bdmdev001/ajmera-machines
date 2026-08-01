import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';
import { normalizePriority } from '@/lib/latestArrivals';

/* PATCH /api/products/latest-arrivals
   Body: { ids: string[], action: 'add' | 'remove', priority?: number }

   Bulk-toggles the homepage Latest Arrivals flag for the selected machines.
   'add' switches them on (optionally at a shared priority) and clears any
   leftover schedule so a re-added product can't inherit an expired window;
   'remove' switches them off. Nothing else about the products is touched. */

const MAX_IDS = 1000;

export async function PATCH(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const action = body?.action === 'remove' ? 'remove' : body?.action === 'add' ? 'add' : '';
    if (!action) {
      return NextResponse.json({ error: 'action must be "add" or "remove".' }, { status: 400 });
    }

    const ids = Array.isArray(body?.ids)
      ? [...new Set(body.ids.map((v: unknown) => String(v).trim()).filter(Boolean))]
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one machine.' }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `Select at most ${MAX_IDS} machines at a time.` }, { status: 400 });
    }

    const update = action === 'add'
      ? {
        isLatestArrival: true,
        latestArrivalPriority: normalizePriority(body?.priority ?? 0),
        latestArrivalFrom: null,
        latestArrivalUntil: null,
      }
      : { isLatestArrival: false, latestArrivalPriority: 0, latestArrivalFrom: null, latestArrivalUntil: null };

    const result = await Product.updateMany({ id: { $in: ids } }, { $set: update });

    // The homepage section is cached (revalidate = 3600) — reflect the change now.
    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json({
      success: true,
      action,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      latestArrival: update,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update Latest Arrivals';
    console.error('Bulk Latest Arrivals API Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
