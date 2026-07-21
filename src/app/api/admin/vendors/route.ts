import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import { isAdminAuthenticated } from '@/lib/auth';
import { isValidEmail, isValidPhone, isValidGST, isValidPAN } from '@/lib/validation';

/* Admin-only vendors/suppliers collection: paginated + searchable list, create.
   GET  /api/admin/vendors?page=1&limit=25&q=term&status=Active
   POST /api/admin/vendors                                                      */

const ALLOWED_LIMITS = [25, 50, 100];
const SHOW_ALL_CAP = 2000;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validateVendor(body: any): { data?: Record<string, string>; error?: string } {
  const companyName = String(body?.companyName ?? '').trim();
  if (!companyName) return { error: 'Company name is required.' };
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (email && !isValidEmail(email)) return { error: 'Please provide a valid email address.' };
  const phone = String(body?.phone ?? '').trim();
  if (phone && !isValidPhone(phone)) return { error: 'Please provide a valid phone number.' };
  const whatsapp = String(body?.whatsapp ?? '').trim();
  if (whatsapp && !isValidPhone(whatsapp)) return { error: 'Please provide a valid WhatsApp number.' };
  const gstNumber = String(body?.gstNumber ?? '').trim();
  if (gstNumber && !isValidGST(gstNumber)) return { error: 'Please provide a valid 15-character GST number.' };
  const panNumber = String(body?.panNumber ?? '').trim();
  if (panNumber && !isValidPAN(panNumber)) return { error: 'Please provide a valid 10-character PAN.' };
  const status = body?.status === 'Inactive' ? 'Inactive' : 'Active';
  return {
    data: {
      companyName,
      gstNumber,
      panNumber,
      address: String(body?.address ?? '').trim(),
      contactPerson: String(body?.contactPerson ?? '').trim(),
      email,
      phone,
      whatsapp,
      notes: String(body?.notes ?? '').trim(),
      status,
    },
  };
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const status = searchParams.get('status') || '';
    const limitParam = (searchParams.get('limit') || '25').toLowerCase();
    const isAll = limitParam === 'all';
    let limit = parseInt(limitParam, 10);
    if (!isAll && !ALLOWED_LIMITS.includes(limit)) limit = 25;

    const filter: Record<string, unknown> = {};
    if (status === 'Active' || status === 'Inactive') filter.status = status;
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { companyName: rx }, { contactPerson: rx }, { email: rx },
        { phone: rx }, { whatsapp: rx }, { gstNumber: rx }, { panNumber: rx },
      ];
    }

    const total = await Vendor.countDocuments(filter);
    const effectiveLimit = isAll ? SHOW_ALL_CAP : limit;
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const skip = isAll ? 0 : (page - 1) * limit;

    const docs = await Vendor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit).lean();
    const vendors = docs.map((d) => ({
      _id: String(d._id),
      companyName: d.companyName || '',
      gstNumber: d.gstNumber || '',
      panNumber: d.panNumber || '',
      address: d.address || '',
      contactPerson: d.contactPerson || '',
      email: d.email || '',
      phone: d.phone || '',
      whatsapp: d.whatsapp || '',
      notes: d.notes || '',
      status: d.status || 'Active',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    }));

    return NextResponse.json({
      vendors, total, page, totalPages,
      limit: isAll ? 'all' : limit,
      capped: isAll && total > SHOW_ALL_CAP, cap: SHOW_ALL_CAP,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load vendors';
    console.error('Vendors GET error:', message);
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
    const { data, error } = validateVendor(body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid data' }, { status: 400 });
    const created = await Vendor.create(data);
    return NextResponse.json({ success: true, vendor: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create vendor';
    console.error('Vendors POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
