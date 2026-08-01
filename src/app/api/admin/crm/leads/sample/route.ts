import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { buildSampleCsv, sampleSheet, type ImportType } from '@/lib/crmImport';
import { toXlsx } from '@/lib/xlsxWrite';

/* GET /api/admin/crm/leads/sample?type=lead|customer&format=csv|xlsx
   Admin-only downloadable import template (headers + example rows). Both
   formats are generated from the same column definition as the importer, so a
   template can always be filled in and uploaded back without edits. */

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type: ImportType = (searchParams.get('type') || 'lead').toLowerCase() === 'customer' ? 'Customer' : 'Lead';
  const format = (searchParams.get('format') || 'csv').toLowerCase();
  const label = type === 'Customer' ? 'customers' : 'leads';

  if (format === 'xlsx' || format === 'excel' || format === 'xls') {
    const { columns, rows } = sampleSheet(type);
    // Identifier columns are Text so Excel can't eat a leading zero or a "+".
    const book = toXlsx(`${label} import`, columns, rows, {
      textColumns: ['Country Code', 'Phone Number', 'WhatsApp Number', 'ZIP Code', 'GST Number', 'PAN Number'],
    });
    return new NextResponse(new Uint8Array(book), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${label}-import-sample.xlsx"`,
      },
    });
  }

  return new NextResponse(buildSampleCsv(type), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${label}-import-sample.csv"`,
    },
  });
}
