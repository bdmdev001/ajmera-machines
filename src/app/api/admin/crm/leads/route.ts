import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import { isAdminAuthenticated } from '@/lib/auth';
import { validateLead, serializeLead } from '@/lib/lead';
import { buildLeadFilter, buildLeadSort } from '@/lib/leadQuery';

/* Unified Leads & Customers collection — paginated + searchable + filterable
   list, and create.
   GET  /api/admin/crm/leads?page=&limit=&q=&recordType=&leadStage=&leadPotential=
                            &customerGroup=&productGroup=&tag=&from=&to=&sort=
   POST /api/admin/crm/leads                                                    */

const ALLOWED_LIMITS = [25, 50, 100];
const SHOW_ALL_CAP = 2000;

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

    const filter = buildLeadFilter(searchParams);
    const sort = buildLeadSort(searchParams);

    const total = await Lead.countDocuments(filter);
    const effectiveLimit = isAll ? SHOW_ALL_CAP : limit;
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const skip = isAll ? 0 : (page - 1) * limit;

    const docs = await Lead.find(filter).sort(sort).skip(skip).limit(effectiveLimit).lean();
    const leads = docs.map((d) => serializeLead(d as Record<string, unknown>));

    // Headline counts for the record-type tabs (respect all filters except type).
    const typeFilter = { ...filter };
    delete typeFilter.recordType;
    const [leadCount, customerCount] = await Promise.all([
      Lead.countDocuments({ ...typeFilter, recordType: 'Lead' }),
      Lead.countDocuments({ ...typeFilter, recordType: 'Customer' }),
    ]);

    return NextResponse.json({
      leads, total, page, totalPages,
      limit: isAll ? 'all' : limit,
      counts: { lead: leadCount, customer: customerCount, all: leadCount + customerCount },
      capped: isAll && total > SHOW_ALL_CAP, cap: SHOW_ALL_CAP,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load records';
    console.error('Leads GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const { data, error } = validateLead(body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid data' }, { status: 400 });

    const created = await Lead.create(data);

    // Seed the timeline with a creation entry (best-effort).
    await Activity.create({
      leadId: created._id,
      type: 'created',
      title: `${created.recordType} created`,
    }).catch(() => { /* non-fatal */ });

    // If a follow-up was scheduled inline, log it too.
    if (created.nextFollowUpAt) {
      await Activity.create({
        leadId: created._id,
        type: 'follow-up',
        title: 'Follow-up scheduled',
        body: created.nextFollowUpNote || '',
        dueAt: created.nextFollowUpAt,
      }).catch(() => { /* non-fatal */ });
    }

    return NextResponse.json({ success: true, lead: serializeLead(created.toObject()) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create record';
    console.error('Leads POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
