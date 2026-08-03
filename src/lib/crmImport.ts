/* ============================================================================
   CRM bulk-import: column definitions, sample templates, CSV → record parsing,
   and per-row validation + mapping onto the unified Lead model. Pure/server-safe
   (no DB, no browser) — the API route supplies the allowed-value lookups
   (categories, customer groups, lead stages, lead potentials).

   VALIDATION SCOPE — this file is the import pipeline's OWN validation layer and
   is intentionally more permissive than the rest of the app:

     Bulk import (here, validateAndMapRow)  every column optional; a supplied
                                            value is format-checked, a blank one
                                            is imported as empty.
     Manual add/edit (src/lib/lead.ts,      First Name, Email and Mobile stay
     validateLead + the form modals)        REQUIRED — unchanged.

   Nothing is shared between the two: validateAndMapRow() is called only by
   /api/admin/crm/leads/import, and validateLead() only by the manual create
   (POST /api/admin/crm/leads) and edit (PATCH /api/admin/crm/leads/[id])
   routes. Relaxing a rule here must never be mirrored into lead.ts.
   ========================================================================= */

import { isValidEmail, isValidPhone, isValidGST, isValidPAN, isValidUrl } from '@/lib/validation';
import { toCSV, type ExportColumn, type ExportRow } from '@/lib/exporters';
import { parseCsv } from '@/lib/csv';

export type ImportType = 'Lead' | 'Customer';

/** Column headers (canonical order) per record type — used by BOTH the sample
 *  template download and the importer, so they always match. */
export const LEAD_HEADERS = [
  'First Name', 'Last Name', 'Company Name', 'Designation', 'Email', 'Country Code', 'Phone Number',
  'WhatsApp Number', 'Website', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Country', 'ZIP Code',
  'Product Groups', 'Customer Group', 'Lead Stage', 'Lead Potential', 'Deal Size', 'Source', 'Assigned To',
  'Follow-up Date', 'Tags', 'Notes',
];

export const CUSTOMER_HEADERS = [
  'Company Name', 'Contact Person', 'Designation', 'Email', 'Country Code', 'Phone Number', 'WhatsApp Number',
  'GST Number', 'PAN Number', 'Website', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Country', 'ZIP Code',
  'Product Groups', 'Customer Group', 'Tags', 'Notes',
];

const LEAD_SAMPLE: string[][] = [
  ['Rajesh', 'Kumar', 'Kumar Engineering Works', 'Purchase Manager', 'rajesh@kumareng.com', '+91', '9876543210', '9876543210', 'https://kumareng.com', 'Plot 12, MIDC', 'Phase 2', 'Pune', 'Maharashtra', 'India', '411018', 'CNC Machines; Lathes', 'Manufacturer', 'New', 'Hot', '500000', 'Website', 'Priya Shah', '2026-08-15', 'High Value; Follow-up', 'Interested in a used CNC lathe.'],
  ['Anita', 'Desai', 'Desai Tools', 'Director', 'anita@desaitools.com', '+91', '9822011223', '', 'https://desaitools.com', '45 Industrial Estate', '', 'Rajkot', 'Gujarat', 'India', '360002', 'Grinding Machines', 'Dealer / Trader', 'Contacted', 'Warm', '250000', 'Referral', '', '', 'Referral', 'Repeat enquiry.'],
];

const CUSTOMER_SAMPLE: string[][] = [
  ['Shah Industries', 'Mahesh Shah', 'Owner', 'mahesh@shahind.com', '+91', '9812345678', '9812345678', '27ABCDE1234F1Z5', 'ABCDE1234F', 'https://shahind.com', 'Plot 8, GIDC', 'Phase 1', 'Ahmedabad', 'Gujarat', 'India', '382330', 'CNC Machines', 'Manufacturer', 'Repeat Buyer', 'Bought a VMC in 2025.'],
  ['Patel CNC', 'Nilesh Patel', 'Manager', 'nilesh@patelcnc.com', '+91', '9898989898', '', '24FGHIJ5678K1Z9', 'FGHIJ5678K', 'https://patelcnc.com', '22 Ring Road', '', 'Surat', 'Gujarat', 'India', '395002', 'Milling Machines', 'End User', 'High Value', 'Interested in AMC.'],
];

export function headersFor(type: ImportType): string[] {
  return type === 'Customer' ? CUSTOMER_HEADERS : LEAD_HEADERS;
}

/** Headers + example rows for the downloadable template, in canonical order.
 *  Shared by the CSV and Excel templates so the two never drift apart. */
export function sampleSheet(type: ImportType): { columns: ExportColumn[]; rows: ExportRow[] } {
  const headers = headersFor(type);
  const sample = type === 'Customer' ? CUSTOMER_SAMPLE : LEAD_SAMPLE;
  return {
    columns: headers.map((h) => ({ header: h, key: h })),
    rows: sample.map((vals) => Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))),
  };
}

/** Build the downloadable sample CSV (headers + one or two example rows). */
export function buildSampleCsv(type: ImportType): string {
  const { columns, rows } = sampleSheet(type);
  return toCSV(columns, rows);
}

/** Normalize a header for tolerant matching ("First Name" → "first name"). */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface ParsedRecord { row: number; values: Record<string, string> }

/** Turn a cell matrix into header-keyed, trimmed records (empty rows dropped).
 *  The `row` is the 1-based line/row number as the admin sees it in their file
 *  (header is row 1), so the validation report points at the right line whether
 *  the source was a CSV or a worksheet. */
export function recordsFromMatrix(matrix: string[][]): { headers: string[]; records: ParsedRecord[]; emptyRows: number } {
  if (matrix.length === 0) return { headers: [], records: [], emptyRows: 0 };
  const headers = (matrix[0] ?? []).map((h) => (h ?? '').trim());
  const keys = headers.map(normalizeHeader);
  const records: ParsedRecord[] = [];
  let emptyRows = 0;
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? [];
    if (cells.every((c) => (c ?? '').trim() === '')) { emptyRows += 1; continue; } // ignore blank rows
    const values: Record<string, string> = {};
    keys.forEach((k, idx) => { if (k) values[k] = (cells[idx] ?? '').trim(); });
    records.push({ row: i + 1, values });
  }
  return { headers, records, emptyRows };
}

/** Parse CSV text into header-keyed, trimmed records. */
export function parseRecords(csv: string): { headers: string[]; records: ParsedRecord[]; emptyRows: number } {
  return recordsFromMatrix(parseCsv(csv));
}

export interface Lookups {
  categories: Map<string, string>; // lowercase → canonical category name
  customerGroups: Map<string, string>;
  leadStages: Map<string, string>;
  leadPotentials: Map<string, string>;
}

export interface RowResult {
  errors: string[];
  warnings: string[];
  email: string;
  phone: string;
  record?: Record<string, unknown>;
}

const splitMulti = (s: string): string[] => s.split(/[;|,]/).map((x) => x.trim()).filter(Boolean);

/** Combine a country code + local number into an E.164-ish string. */
function combinePhone(code: string, num: string): string {
  const raw = String(num || '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return `+${raw.replace(/\D/g, '')}`;
  const digits = raw.replace(/\D/g, '');
  const cc = String(code || '').replace(/\D/g, '');
  return cc ? `+${cc}${digits}` : digits; // no code ⇒ bare digits (validated by length)
}

/** Parse an import date. Returns a Date, null (empty) or 'invalid'. */
function parseImportDate(s: string): Date | null | 'invalid' {
  const v = (s || '').trim();
  if (!v) return null;
  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/); // DD/MM/YYYY
  if (m) {
    const [, dd, mm, yy] = m;
    const year = yy.length === 2 ? `20${yy}` : yy;
    const d = new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return 'invalid';
}

/** Validate + map one parsed record onto a Lead insert object.
 *
 *  IMPORT-ONLY VALIDATION POLICY — every column is optional here:
 *    · a blank cell imports as an empty value and NEVER raises an error;
 *    · a supplied value is still format-checked and a bad one IS an error.
 *
 *  This deliberately differs from manual create/edit, which goes through
 *  validateLead() in src/lib/lead.ts and still requires First Name, Email and
 *  Mobile. The two paths share no validation code — see the note at the top of
 *  this file. Do not call this function from the manual create/edit routes. */
export function validateAndMapRow(values: Record<string, string>, type: ImportType, look: Lookups): RowResult {
  const pick = (header: string) => values[normalizeHeader(header)] ?? '';
  const errors: string[] = [];
  const warnings: string[] = [];

  // A row whose every template column is blank would import as an entirely
  // empty contact. That is a malformed row rather than "missing values", so it
  // is reported instead of silently creating a blank record.
  if (!headersFor(type).some((h) => pick(h) !== '')) {
    return { errors: ['Row has no data in any recognised column.'], warnings, email: '', phone: '' };
  }

  // Names — optional. A Customer's "Contact Person" is split into first/last.
  let firstName = '';
  let lastName = '';
  if (type === 'Customer') {
    const parts = pick('Contact Person').split(/\s+/).filter(Boolean);
    firstName = parts.shift() || '';
    lastName = parts.join(' ');
  } else {
    firstName = pick('First Name');
    lastName = pick('Last Name');
  }

  // Email — optional; validated only when supplied.
  const email = pick('Email').toLowerCase();
  if (email && !isValidEmail(email)) errors.push(`Invalid email “${email}”.`);

  // Phone (Country Code + Phone Number) — optional; validated only when supplied.
  const code = pick('Country Code');
  const phone = combinePhone(code, pick('Phone Number'));
  if (phone && !isValidPhone(phone)) errors.push(`Invalid phone number “${phone}”.`);
  const whatsapp = combinePhone(code, pick('WhatsApp Number'));
  if (whatsapp && !isValidPhone(whatsapp)) warnings.push(`WhatsApp number “${whatsapp}” looks invalid — left blank.`);

  // Website
  const website = pick('Website');
  if (website && !isValidUrl(website)) warnings.push(`Website “${website}” isn’t a valid URL — left blank.`);

  // Tax (customers)
  const gstNumber = pick('GST Number').toUpperCase();
  if (gstNumber && !isValidGST(gstNumber)) errors.push(`Invalid GST number “${gstNumber}”.`);
  const panNumber = pick('PAN Number').toUpperCase();
  if (panNumber && !isValidPAN(panNumber)) errors.push(`Invalid PAN “${panNumber}”.`);

  // Product Groups → existing Product Categories (never auto-created).
  const productGroups: string[] = [];
  for (const g of splitMulti(pick('Product Groups'))) {
    const hit = look.categories.get(g.toLowerCase());
    if (hit) productGroups.push(hit);
    else warnings.push(`Product group “${g}” has no matching Product Category (skipped — not created).`);
  }

  // Customer Group / Lead Stage / Lead Potential → map to existing CRM lists.
  const mapList = (header: string, look2: Map<string, string>, label: string): string => {
    const v = pick(header);
    if (!v) return '';
    const hit = look2.get(v.toLowerCase());
    if (hit) return hit;
    warnings.push(`${label} “${v}” isn’t in the CRM list yet — imported as-is.`);
    return v;
  };
  const customerGroup = mapList('Customer Group', look.customerGroups, 'Customer group');
  const leadStage = type === 'Customer' ? 'Won' : mapList('Lead Stage', look.leadStages, 'Lead stage');
  const leadPotential = type === 'Customer' ? '' : mapList('Lead Potential', look.leadPotentials, 'Lead potential');

  // Follow-up date (leads)
  let nextFollowUpAt: Date | null = null;
  if (type !== 'Customer') {
    const parsed = parseImportDate(pick('Follow-up Date'));
    if (parsed === 'invalid') warnings.push(`Follow-up Date “${pick('Follow-up Date')}” couldn’t be read — left blank.`);
    else nextFollowUpAt = parsed;
  }

  if (errors.length) return { errors, warnings, email, phone };

  const now = new Date();
  const record: Record<string, unknown> = {
    recordType: type,
    stage: type === 'Customer' ? 'Customer' : 'Lead',
    firstName,
    lastName,
    designation: pick('Designation'),
    organisation: pick('Company Name'),
    email,
    mobile: phone,
    whatsapp: whatsapp && isValidPhone(whatsapp) ? whatsapp : '',
    website: website && isValidUrl(website) ? website : '',
    addressLine1: pick('Address Line 1'),
    addressLine2: pick('Address Line 2'),
    city: pick('City'),
    state: pick('State'),
    country: pick('Country'),
    zip: pick('ZIP Code'),
    gstNumber,
    panNumber,
    productGroups,
    customerGroup,
    leadStage,
    leadPotential,
    dealSize: pick('Deal Size'),
    assignedTo: type === 'Customer' ? '' : pick('Assigned To'),
    listName: type === 'Customer' ? '' : pick('Source'),
    tags: splitMulti(pick('Tags')),
    notes: pick('Notes'),
    nextFollowUpAt,
    ...(type === 'Customer' ? { convertedAt: now } : {}),
  };

  return { errors, warnings, email, phone, record };
}
