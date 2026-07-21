import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Vendor from '@/models/Vendor';
import { isAdminAuthenticated } from '@/lib/auth';
import { toCSV, toExcelXML, type ExportColumn, type ExportRow } from '@/lib/exporters';

/* GET /api/admin/vendors/export?format=csv|xlsx — admin-only backend export.
   Exports the complete Add/Edit Vendor form, not just the listing columns. */

const COLUMNS: ExportColumn[] = [
  { header: 'Company Name', key: 'companyName' },
  { header: 'Contact Person', key: 'contactPerson' },
  { header: 'Email ID', key: 'email' },
  { header: 'Phone Number', key: 'phone' },
  { header: 'WhatsApp Number', key: 'whatsapp' },
  { header: 'Address', key: 'address' },
  { header: 'GST Number', key: 'gstNumber' },
  { header: 'PAN Number', key: 'panNumber' },
  { header: 'Notes', key: 'notes' },
  { header: 'Status', key: 'status' },
  { header: 'Created Date', key: 'createdAt' },
];

function fmtDate(d: Date | undefined | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const format = (new URL(request.url).searchParams.get('format') || 'csv').toLowerCase();
    const docs = await Vendor.find({}).sort({ createdAt: -1 }).lean();
    const rows: ExportRow[] = docs.map((d) => ({
      companyName: d.companyName || '',
      contactPerson: d.contactPerson || '',
      email: d.email || '',
      phone: d.phone || '',
      whatsapp: d.whatsapp || '',
      address: d.address || '',
      gstNumber: d.gstNumber || '',
      panNumber: d.panNumber || '',
      notes: d.notes || '',
      status: d.status || 'Active',
      createdAt: fmtDate(d.createdAt),
    }));

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx' || format === 'xls' || format === 'excel') {
      const body = toExcelXML('Vendors', COLUMNS, rows);
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="vendors-${stamp}.xls"`,
        },
      });
    }

    const body = toCSV(COLUMNS, rows);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vendors-${stamp}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export vendors';
    console.error('Vendors export error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
