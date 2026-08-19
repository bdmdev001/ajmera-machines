import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CrmList, { CRM_LIST_KINDS, seedDefaultsIfEmpty, type CrmListKind } from '@/models/CrmList';
import Lead from '@/models/Lead';
import { isAdminAuthenticated } from '@/lib/auth';

/* Admin-configurable CRM option lists (Product/Customer groups, Lead stages,
   potentials, tags). Powers every qualifier dropdown in the Leads module.
   GET  /api/admin/crm/lists            → { lists: { [kind]: item[] } }
   POST /api/admin/crm/lists            → create one value                     */

export interface CrmListItem {
  _id: string;
  kind: CrmListKind;
  name: string;
  order: number;
  color: string;
  archived: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  usage?: number;
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function serialize(d: Record<string, unknown>): CrmListItem {
  return {
    _id: String(d._id),
    kind: d.kind as CrmListKind,
    name: (d.name as string) || '',
    order: (d.order as number) ?? 0,
    color: (d.color as string) || '',
    archived: Boolean(d.archived),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

/** How many Lead/Customer records sit in each customer group, keyed lowercase.
 *  Feeds the "in use" count in Manage lists and the delete guard, so a group
 *  that is still assigned to someone can be deactivated but not removed. */
export async function customerGroupUsage(): Promise<Map<string, number>> {
  const rows = await Lead.aggregate<{ _id: string; n: number }>([
    { $match: { customerGroup: { $nin: ['', null] } } },
    { $group: { _id: '$customerGroup', n: { $sum: 1 } } },
  ]);
  const map = new Map<string, number>();
  for (const r of rows) map.set(String(r._id).trim().toLowerCase(), r.n);
  return map;
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    await seedDefaultsIfEmpty();

    const [docs, usage] = await Promise.all([
      CrmList.find({}).sort({ kind: 1, order: 1, name: 1 }).lean(),
      customerGroupUsage(),
    ]);
    const lists: Record<string, CrmListItem[]> = {};
    for (const kind of CRM_LIST_KINDS) lists[kind] = [];
    for (const d of docs) {
      const item = serialize(d as unknown as Record<string, unknown>);
      if (item.kind === 'customerGroup') item.usage = usage.get(item.name.trim().toLowerCase()) ?? 0;
      lists[d.kind as string]?.push(item);
    }

    return NextResponse.json({ lists });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load lists';
    console.error('CRM lists GET error:', message);
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
    const kind = String(body?.kind || '') as CrmListKind;
    if (!CRM_LIST_KINDS.includes(kind)) {
      return NextResponse.json({ error: 'Invalid list type' }, { status: 400 });
    }
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'A value is required' }, { status: 400 });

    const clash = await CrmList.findOne({ kind, name }).collation({ locale: 'en', strength: 2 }).lean();
    if (clash) return NextResponse.json({ error: `“${name}” already exists in this list` }, { status: 409 });

    const last = await CrmList.findOne({ kind }).sort({ order: -1 }).lean();
    const order = last ? (last.order ?? 0) + 1 : 0;
    const color = String(body?.color || '').trim();

    const created = await CrmList.create({ kind, name, order, color });
    return NextResponse.json({ success: true, item: serialize(created.toObject() as unknown as Record<string, unknown>) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create list value';
    console.error('CRM lists POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
