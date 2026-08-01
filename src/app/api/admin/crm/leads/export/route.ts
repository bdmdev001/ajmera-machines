import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import { isAdminAuthenticated } from '@/lib/auth';
import { toCSV, toExcelXML, type ExportColumn, type ExportRow } from '@/lib/exporters';
import { buildLeadFilter, buildLeadSort } from '@/lib/leadQuery';

/* GET /api/admin/crm/leads/export?format=csv|xlsx&scope=filtered|all
        &q=&recordType=&leadStage=&leadPotential=&customerGroup=&productGroup=
        &tag=&assignedTo=&from=&to=&sort=
   Admin-only export of the unified Leads & Customers list.

   The search/filter/sort params are the same ones the listing route takes, so
   the file mirrors what the admin is looking at. `scope=all` ignores every
   filter except the record-type tab; omitting all params exports everything. */

const COLUMNS: ExportColumn[] = [
  { header: 'Type', key: 'recordType' },
  { header: 'First Name', key: 'firstName' },
  { header: 'Last Name', key: 'lastName' },
  { header: 'Designation', key: 'designation' },
  { header: 'Organisation', key: 'organisation' },
  { header: 'Email', key: 'email' },
  { header: 'Mobile', key: 'mobile' },
  { header: 'WhatsApp', key: 'whatsapp' },
  { header: 'Website', key: 'website' },
  { header: 'Telephone (Direct)', key: 'telephoneDirect' },
  { header: 'Telephone (Office)', key: 'telephoneOffice' },
  { header: 'Address Line 1', key: 'addressLine1' },
  { header: 'Address Line 2', key: 'addressLine2' },
  { header: 'City', key: 'city' },
  { header: 'State', key: 'state' },
  { header: 'Country', key: 'country' },
  { header: 'ZIP', key: 'zip' },
  { header: 'GST Number', key: 'gstNumber' },
  { header: 'PAN Number', key: 'panNumber' },
  { header: 'List Name', key: 'listName' },
  { header: 'Product Groups', key: 'productGroups' },
  { header: 'Customer Group', key: 'customerGroup' },
  { header: 'Deal Size', key: 'dealSize' },
  { header: 'Lead Potential', key: 'leadPotential' },
  { header: 'Lead Stage', key: 'leadStage' },
  { header: 'Tags', key: 'tags' },
  { header: 'Notes', key: 'notes' },
  { header: 'Next Follow-up', key: 'nextFollowUpAt' },
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

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const recordType = searchParams.get('recordType');

    // `scope=all` drops the search & filters but keeps the record-type tab, so
    // "export all customers" still means customers.
    const scopeAll = (searchParams.get('scope') || 'filtered').toLowerCase() === 'all';
    const filter = scopeAll
      ? (recordType === 'Lead' || recordType === 'Customer' ? { recordType } : {})
      : buildLeadFilter(searchParams);
    const sort = scopeAll ? { createdAt: -1 as const } : buildLeadSort(searchParams);

    const docs = await Lead.find(filter).sort(sort).lean();
    const rows: ExportRow[] = docs.map((d) => ({
      recordType: d.recordType || '',
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      designation: d.designation || '',
      organisation: d.organisation || '',
      email: d.email || '',
      mobile: d.mobile || '',
      whatsapp: d.whatsapp || '',
      website: d.website || '',
      telephoneDirect: d.telephoneDirect || '',
      telephoneOffice: d.telephoneOffice || '',
      addressLine1: d.addressLine1 || '',
      addressLine2: d.addressLine2 || '',
      city: d.city || '',
      state: d.state || '',
      country: d.country || '',
      zip: d.zip || '',
      gstNumber: d.gstNumber || '',
      panNumber: d.panNumber || '',
      listName: d.listName || '',
      productGroups: Array.isArray(d.productGroups) ? d.productGroups.join(', ') : '',
      customerGroup: d.customerGroup || '',
      dealSize: d.dealSize || '',
      leadPotential: d.leadPotential || '',
      leadStage: d.leadStage || '',
      tags: Array.isArray(d.tags) ? d.tags.join(', ') : '',
      notes: d.notes || '',
      nextFollowUpAt: fmtDate(d.nextFollowUpAt),
      createdAt: fmtDate(d.createdAt),
    }));

    const stamp = new Date().toISOString().slice(0, 10);
    const label = recordType === 'Customer' ? 'customers' : recordType === 'Lead' ? 'leads' : 'leads-customers';

    if (format === 'xlsx' || format === 'xls' || format === 'excel') {
      const bodyXml = toExcelXML('Leads & Customers', COLUMNS, rows);
      return new NextResponse(bodyXml, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${label}-${stamp}.xls"`,
        },
      });
    }

    const bodyCsv = toCSV(COLUMNS, rows);
    return new NextResponse(bodyCsv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${label}-${stamp}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export records';
    console.error('Leads export error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
