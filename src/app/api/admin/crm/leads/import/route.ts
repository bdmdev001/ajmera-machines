import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import Category from '@/models/Category';
import CrmList from '@/models/CrmList';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  recordsFromMatrix, validateAndMapRow, normalizeHeader,
  type ImportType, type Lookups,
} from '@/lib/crmImport';
import { parseSpreadsheet, isXlsxBuffer, isLegacyXls } from '@/lib/xlsx';
import { parseCsv } from '@/lib/csv';

/* POST /api/admin/crm/leads/import
   Body: { recordType: 'Lead'|'Customer', commit?: boolean } plus either
         csv:  string                       — raw CSV text, or
         file: { name, data }               — base64 bytes of a .csv/.xlsx/.xls

   commit=false (default) → validate only and return a preview report.
   commit=true            → insert the valid, non-duplicate rows.

   Never modifies existing records; duplicates (by email or phone, against the DB
   and within the file) are skipped, invalid rows are reported with line numbers,
   and unknown product-groups / list values are surfaced as warnings (categories
   are never auto-created). */

interface Issue { row: number; status: 'failed' | 'duplicate' | 'warning'; messages: string[] }

/** Cap the base64 payload — a CRM import is thousands of rows, not megabytes. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

class ImportError extends Error {}

/** Resolve the request body to a cell matrix, whatever format was uploaded. */
function matrixFrom(body: Record<string, unknown>): { matrix: string[][]; source: 'CSV' | 'Excel' } {
  const file = body.file as { name?: unknown; data?: unknown } | undefined;

  if (file && typeof file.data === 'string' && file.data) {
    const buf = Buffer.from(file.data, 'base64');
    if (buf.length === 0) throw new ImportError('The uploaded file is empty.');
    if (buf.length > MAX_FILE_BYTES) throw new ImportError('That file is larger than 10 MB — split it into smaller batches.');

    // Trust the bytes over the extension — a workbook saved as .csv (or a CSV
    // saved as .xlsx) still imports, and the name is only a tie-breaker.
    if (!isXlsxBuffer(buf) && !isLegacyXls(buf)) {
      const text = buf.toString('utf8');
      if (!/<\?xml/i.test(text.slice(0, 200))) return { matrix: parseCsv(text), source: 'CSV' };
    }
    try {
      return { matrix: parseSpreadsheet(buf).matrix, source: 'Excel' };
    } catch (err) {
      throw new ImportError(err instanceof Error ? err.message : 'Could not read the uploaded file.');
    }
  }

  const csv = String(body.csv || '');
  if (!csv.trim()) throw new ImportError('The uploaded file is empty.');
  return { matrix: parseCsv(csv), source: 'CSV' };
}

function toMap(rows: { name?: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) { const n = (r.name || '').trim(); if (n) m.set(n.toLowerCase(), n); }
  return m;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const type: ImportType = body?.recordType === 'Customer' ? 'Customer' : 'Lead';
    const commit = body?.commit === true;

    const { matrix, source } = matrixFrom(body ?? {});
    const { headers, records, emptyRows } = recordsFromMatrix(matrix);

    // Verify the required header columns are present (tolerant matching).
    const presentKeys = new Set(headers.map(normalizeHeader));
    const requiredHeaders = type === 'Customer'
      ? ['Company Name', 'Contact Person', 'Email', 'Phone Number']
      : ['First Name', 'Email', 'Phone Number'];
    const missing = requiredHeaders.filter((h) => !presentKeys.has(normalizeHeader(h)));
    if (missing.length) {
      return NextResponse.json({ error: `The file is missing required column(s): ${missing.join(', ')}. Download the sample template for the correct headers.` }, { status: 400 });
    }
    if (records.length === 0) {
      return NextResponse.json({ error: 'No data rows found — the first row must be the column headers.' }, { status: 400 });
    }

    // Allowed-value lookups (categories are the single source for product groups).
    const [cats, lists] = await Promise.all([
      Category.find({}, { name: 1 }).lean(),
      CrmList.find({ kind: { $in: ['customerGroup', 'leadStage', 'leadPotential'] } }, { kind: 1, name: 1 }).lean(),
    ]);
    const look: Lookups = {
      categories: toMap(cats as { name?: string }[]),
      customerGroups: toMap((lists as { kind: string; name?: string }[]).filter((l) => l.kind === 'customerGroup')),
      leadStages: toMap((lists as { kind: string; name?: string }[]).filter((l) => l.kind === 'leadStage')),
      leadPotentials: toMap((lists as { kind: string; name?: string }[]).filter((l) => l.kind === 'leadPotential')),
    };

    // Pass 1 — validate + map every row.
    type Ok = { row: number; email: string; phone: string; record: Record<string, unknown>; warnings: string[] };
    const issues: Issue[] = [];
    const oks: Ok[] = [];
    let failed = 0;
    for (const rec of records) {
      const res = validateAndMapRow(rec.values, type, look);
      if (res.errors.length) { failed += 1; issues.push({ row: rec.row, status: 'failed', messages: res.errors }); continue; }
      oks.push({ row: rec.row, email: res.email, phone: res.phone, record: res.record as Record<string, unknown>, warnings: res.warnings });
    }

    // Existing duplicates — query only the emails/phones that appear in the file.
    const emails = [...new Set(oks.map((o) => o.email).filter(Boolean))];
    const phones = [...new Set(oks.map((o) => o.phone).filter(Boolean))];
    const existing = await Lead.find(
      { $or: [{ email: { $in: emails } }, { mobile: { $in: phones } }] },
      { email: 1, mobile: 1 },
    ).lean();
    const existEmail = new Set(existing.map((e) => (e.email || '').toLowerCase()).filter(Boolean));
    const existPhone = new Set(existing.map((e) => (e.mobile || '')).filter(Boolean));

    // Pass 2 — flag duplicates (DB + within-file), collect valid rows in order.
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    const valid: Ok[] = [];
    let duplicates = 0;
    for (const o of oks) {
      const dupDb = (o.email && existEmail.has(o.email)) || (o.phone && existPhone.has(o.phone));
      const dupFile = (o.email && seenEmail.has(o.email)) || (o.phone && seenPhone.has(o.phone));
      if (dupDb || dupFile) {
        duplicates += 1;
        issues.push({ row: o.row, status: 'duplicate', messages: [`Duplicate — ${dupDb ? 'a record with this email/phone already exists' : 'appears more than once in this file'}.`] });
        continue;
      }
      if (o.email) seenEmail.add(o.email);
      if (o.phone) seenPhone.add(o.phone);
      if (o.warnings.length) issues.push({ row: o.row, status: 'warning', messages: o.warnings });
      valid.push(o);
    }

    const report = {
      type,
      totalRows: records.length + emptyRows,
      dataRows: records.length,
      emptyRows,
      validCount: valid.length,
      failed,
      duplicates,
      issues: issues.sort((a, b) => a.row - b.row).slice(0, 500),
      committed: false,
      imported: 0,
    };

    if (!commit) {
      return NextResponse.json({ success: true, report });
    }

    // Commit — insert the valid records (order preserved) and log an activity.
    let imported = 0;
    if (valid.length) {
      try {
        const docs = await Lead.insertMany(valid.map((v) => v.record), { ordered: false });
        imported = docs.length;
        await Activity.insertMany(
          docs.map((d) => ({ leadId: d._id, type: 'created', title: `Imported from ${source}` })),
          { ordered: false },
        ).catch(() => { /* non-fatal */ });
      } catch (err) {
        const inserted = (err as { insertedDocs?: unknown[] })?.insertedDocs;
        imported = Array.isArray(inserted) ? inserted.length : 0;
      }
    }

    return NextResponse.json({ success: true, report: { ...report, committed: true, imported } });
  } catch (error) {
    // Bad uploads are the admin's problem to fix, not a server fault.
    if (error instanceof ImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Import failed';
    console.error('CRM import error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
