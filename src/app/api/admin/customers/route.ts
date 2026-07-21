import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Customer from '@/models/Customer';
import { isAdminAuthenticated } from '@/lib/auth';
import { isValidPhone, isValidGST, isValidPAN } from '@/lib/validation';

/* Admin-only customers collection: paginated + searchable list, and create.
   GET  /api/admin/customers?page=1&limit=25&q=term
   POST /api/admin/customers                                                    */

const ALLOWED_LIMITS = [25, 50, 100];
const SHOW_ALL_CAP = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Shared body validator for create/update. Returns a cleaned object or an error. */
export function validateCustomer(body: any): { data?: Record<string, string>; error?: string } {
  const companyName = String(body?.companyName ?? '').trim();
  const fullName = String(body?.fullName ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  if (!companyName || !fullName || !email || !phone) {
    return { error: 'Company name, full name, email and phone are required.' };
  }
  if (!EMAIL_RE.test(email)) return { error: 'Please provide a valid email address.' };
  if (!isValidPhone(phone)) return { error: 'Please provide a valid phone number.' };
  const whatsapp = String(body?.whatsapp ?? '').trim();
  if (whatsapp && !isValidPhone(whatsapp)) return { error: 'Please provide a valid WhatsApp number.' };
  const gstNumber = String(body?.gstNumber ?? '').trim();
  if (gstNumber && !isValidGST(gstNumber)) return { error: 'Please provide a valid 15-character GST number.' };
  const panNumber = String(body?.panNumber ?? '').trim();
  if (panNumber && !isValidPAN(panNumber)) return { error: 'Please provide a valid 10-character PAN.' };
  return {
    data: {
      companyName,
      gstNumber,
      panNumber,
      companyAddress: String(body?.companyAddress ?? '').trim(),
      fullName,
      email: email.toLowerCase(),
      phone,
      whatsapp,
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
    const limitParam = (searchParams.get('limit') || '25').toLowerCase();
    const isAll = limitParam === 'all';
    let limit = parseInt(limitParam, 10);
    if (!isAll && !ALLOWED_LIMITS.includes(limit)) limit = 25;

    const filter: Record<string, unknown> = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { companyName: rx }, { fullName: rx }, { email: rx },
        { phone: rx }, { whatsapp: rx }, { gstNumber: rx }, { panNumber: rx },
      ];
    }

    const total = await Customer.countDocuments(filter);
    const effectiveLimit = isAll ? SHOW_ALL_CAP : limit;
    const totalPages = isAll ? 1 : Math.max(1, Math.ceil(total / limit));

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const skip = isAll ? 0 : (page - 1) * limit;

    const docs = await Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit).lean();
    const customers = docs.map((d) => ({
      _id: String(d._id),
      companyName: d.companyName || '',
      gstNumber: d.gstNumber || '',
      panNumber: d.panNumber || '',
      companyAddress: d.companyAddress || '',
      fullName: d.fullName || '',
      email: d.email || '',
      phone: d.phone || '',
      whatsapp: d.whatsapp || '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    }));

    return NextResponse.json({
      customers, total, page, totalPages,
      limit: isAll ? 'all' : limit,
      capped: isAll && total > SHOW_ALL_CAP, cap: SHOW_ALL_CAP,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load customers';
    console.error('Customers GET error:', message);
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
    const { data, error } = validateCustomer(body);
    if (error || !data) return NextResponse.json({ error: error || 'Invalid data' }, { status: 400 });

    const created = await Customer.create(data);
    return NextResponse.json({ success: true, customer: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create customer';
    console.error('Customers POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
