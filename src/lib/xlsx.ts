/* ============================================================================
   Dependency-free spreadsheet reader for the CRM bulk import. Server-only —
   it uses node:zlib to inflate the OOXML package, so never import it from a
   client component. Pairs with the exporters' toExcelXML().

   Handles the three things an admin actually drops on the importer:

   - .xlsx  — the OOXML zip written by Excel 365, LibreOffice and, crucially,
              Google Sheets' "Download → Microsoft Excel (.xlsx)".
   - .xls   — only the SpreadsheetML 2003 XML flavour, which is what this admin
              panel's own Excel export emits (so exports round-trip). The old
              binary BIFF format is detected and rejected with advice.
   - dates  — Excel stores them as serial numbers, so the number format of each
              cell is inspected and date-formatted cells are rendered back to
              YYYY-MM-DD rather than leaking "46249" into the importer.
   ========================================================================= */

import { inflateRawSync } from 'node:zlib';

/* ---- ZIP (the .xlsx container) ------------------------------------------ */

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const ZIP64_MARKER = 0xffffffff;

/** Read a ZIP archive into a name → bytes map. Only the stored (0) and
 *  deflate (8) methods exist in practice for spreadsheet packages. */
function unzip(buf: Buffer): Map<string, Buffer> {
  // The end-of-central-directory record lives in the last 64 KB or so.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('The file isn’t a readable .xlsx package (no ZIP directory found).');

  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  if (ptr === ZIP64_MARKER) throw new Error('ZIP64 spreadsheets aren’t supported — re-save the file as a normal .xlsx.');

  const files = new Map<string, Buffer>();
  for (let n = 0; n < count && ptr + 46 <= buf.length; n += 1) {
    if (buf.readUInt32LE(ptr) !== CD_SIG) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localAt = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    if (compSize === ZIP64_MARKER || localAt === ZIP64_MARKER) continue; // oversized entry — skip
    if (buf.readUInt32LE(localAt) !== LOCAL_SIG) continue;

    // The local header repeats the name/extra lengths; only they are reliable.
    const dataAt = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
    const raw = buf.subarray(dataAt, dataAt + compSize);
    try {
      files.set(name, method === 0 ? raw : inflateRawSync(raw));
    } catch {
      /* unreadable entry — ignore; the caller reports the missing part */
    }
  }
  return files;
}

/* ---- Tiny XML helpers ---------------------------------------------------- */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

/** Iterate <tag> elements, handling the self-closing form. The self-closing
 *  alternative has to be tried FIRST: `[^>]*` happily eats the "/" of `<row/>`,
 *  so an open-tag pattern would match an empty row and then run on to the next
 *  element's closing tag, swallowing it whole. */
function* elements(xml: string, tag: string): Generator<{ attrs: string; body: string }> {
  const re = new RegExp(`<${tag}\\b([^>]*?)/>|<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) yield { attrs: m[1], body: '' };
    else yield { attrs: m[2] ?? '', body: m[3] ?? '' };
  }
}

/** Concatenated text of every <t> descendant — rich-text runs come as several. */
function textOf(fragment: string): string {
  let out = '';
  for (const t of elements(fragment, 't')) out += decodeXml(t.body);
  return out;
}

function attr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`));
  return m ? decodeXml(m[1]) : '';
}

/* ---- Dates --------------------------------------------------------------- */

// Built-in number formats that Excel renders as a date or time.
const DATE_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/** A custom format code is a date if it uses date/time tokens outside of any
 *  literal text (quoted runs, escaped chars and the colour/condition blocks). */
function isDateFormatCode(code: string): boolean {
  const bare = code
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\\./g, '');
  return /[dmyhs]/i.test(bare) && !/^[^dmyhs]*$/i.test(bare);
}

/** Excel serial → YYYY-MM-DD (or with a time when the value has a fraction). */
function serialToDate(serial: number, date1904: boolean): string {
  // Day 0 is 1899-12-30 because of Excel's phantom 1900-02-29; serials at or
  // below 60 predate that bug and need the extra day back.
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const adjusted = !date1904 && serial < 61 ? serial + 1 : serial;
  const ms = base + Math.round(adjusted * 86400000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(serial);
  const iso = d.toISOString();
  return iso.slice(11, 19) === '00:00:00' ? iso.slice(0, 10) : iso.slice(0, 19).replace('T', ' ');
}

/** Render a numeric cell without exponent notation. */
function numToString(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return String(parseFloat(n.toPrecision(15)));
}

/* ---- Column refs --------------------------------------------------------- */

/** "AB12" → 27 (0-based column index). */
function colIndex(ref: string): number {
  let n = 0;
  for (let i = 0; i < ref.length; i += 1) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break; // stop at the row digits
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/* ---- .xlsx --------------------------------------------------------------- */

function sharedStrings(files: Map<string, Buffer>): string[] {
  const xml = files.get('xl/sharedStrings.xml');
  if (!xml) return [];
  const out: string[] = [];
  for (const si of elements(xml.toString('utf8'), 'si')) out.push(textOf(si.body));
  return out;
}

/** cellXf index → true when that style renders as a date. */
function dateStyles(files: Map<string, Buffer>): boolean[] {
  const xml = files.get('xl/styles.xml');
  if (!xml) return [];
  const s = xml.toString('utf8');

  const custom = new Map<number, string>();
  for (const fmt of elements(s, 'numFmt')) {
    const id = parseInt(attr(fmt.attrs, 'numFmtId'), 10);
    if (Number.isFinite(id)) custom.set(id, attr(fmt.attrs, 'formatCode'));
  }

  // Only the cellXfs block maps a cell's s="N" to a number format.
  const block = s.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/)?.[0] ?? '';
  const out: boolean[] = [];
  for (const xf of elements(block, 'xf')) {
    const id = parseInt(attr(xf.attrs, 'numFmtId'), 10);
    if (!Number.isFinite(id)) { out.push(false); continue; }
    const code = custom.get(id);
    out.push(code !== undefined ? isDateFormatCode(code) : DATE_FMT_IDS.has(id));
  }
  return out;
}

/** Path of the first worksheet, resolved through the workbook relationships. */
function firstSheetPath(files: Map<string, Buffer>): string | undefined {
  const wb = files.get('xl/workbook.xml')?.toString('utf8');
  const rels = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  if (wb && rels) {
    const sheet = wb.match(/<sheet\b[^>]*>/)?.[0];
    const rid = sheet ? attr(sheet, 'r:id') || attr(sheet, 'id') : '';
    if (rid) {
      for (const rel of elements(rels, 'Relationship')) {
        if (attr(rel.attrs, 'Id') !== rid) continue;
        const target = attr(rel.attrs, 'Target').replace(/^\/?xl\//, '').replace(/^\//, '');
        if (files.has(`xl/${target}`)) return `xl/${target}`;
      }
    }
  }
  // Fall back to the conventional location / the first worksheet part present.
  if (files.has('xl/worksheets/sheet1.xml')) return 'xl/worksheets/sheet1.xml';
  return [...files.keys()].filter((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k)).sort()[0];
}

function readXlsx(buf: Buffer): string[][] {
  const files = unzip(buf);
  const sheetPath = firstSheetPath(files);
  if (!sheetPath) throw new Error('No worksheet found in the workbook.');

  const wb = files.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const date1904 = /date1904\s*=\s*"(1|true)"/i.test(wb);
  const strings = sharedStrings(files);
  const styleIsDate = dateStyles(files);

  const sheet = files.get(sheetPath)!.toString('utf8');
  const matrix: string[][] = [];
  let cursor = 0; // running row number for rows without an r attribute

  for (const row of elements(sheet, 'row')) {
    const rNum = parseInt(attr(row.attrs, 'r'), 10);
    const rowAt = Number.isFinite(rNum) && rNum > 0 ? rNum - 1 : cursor;
    cursor = rowAt + 1;

    const cells: string[] = [];
    let auto = 0;
    for (const cell of elements(row.body, 'c')) {
      const ref = attr(cell.attrs, 'r');
      const at = ref ? colIndex(ref) : auto;
      auto = at + 1;

      const type = attr(cell.attrs, 't') || 'n';
      let value = '';
      if (type === 'inlineStr') {
        value = textOf(cell.body);
      } else {
        const raw = decodeXml([...elements(cell.body, 'v')][0]?.body ?? '');
        if (type === 's') {
          value = strings[parseInt(raw, 10)] ?? '';
        } else if (type === 'str') {
          value = raw; // cached formula result
        } else if (type === 'b') {
          value = raw === '1' ? 'TRUE' : 'FALSE';
        } else if (type === 'e') {
          value = ''; // #N/A and friends import as blank
        } else if (raw !== '') {
          const n = Number(raw);
          const styleAt = parseInt(attr(cell.attrs, 's'), 10);
          const isDate = Number.isFinite(styleAt) && styleIsDate[styleAt] === true;
          value = Number.isFinite(n) ? (isDate ? serialToDate(n, date1904) : numToString(n)) : raw;
        }
      }
      if (at >= 0) cells[at] = value;
    }

    for (let i = 0; i < cells.length; i += 1) if (cells[i] === undefined) cells[i] = '';
    matrix[rowAt] = cells;
  }

  for (let i = 0; i < matrix.length; i += 1) if (!matrix[i]) matrix[i] = [];
  return matrix;
}

/* ---- SpreadsheetML 2003 (.xls XML, this admin's own Excel export) -------- */

function readSpreadsheetML(text: string): string[][] {
  const table = text.match(/<Table\b[\s\S]*?<\/Table>/)?.[0] ?? text;
  const matrix: string[][] = [];

  let rowAt = 0;
  for (const row of elements(table, 'Row')) {
    const rIndex = parseInt(attr(row.attrs, 'ss:Index'), 10);
    if (Number.isFinite(rIndex) && rIndex > 0) rowAt = rIndex - 1;

    const cells: string[] = [];
    let at = 0;
    for (const cell of elements(row.body, 'Cell')) {
      const cIndex = parseInt(attr(cell.attrs, 'ss:Index'), 10);
      if (Number.isFinite(cIndex) && cIndex > 0) at = cIndex - 1;
      cells[at] = decodeXml([...elements(cell.body, 'Data')][0]?.body ?? '');
      at += 1;
    }
    for (let i = 0; i < cells.length; i += 1) if (cells[i] === undefined) cells[i] = '';
    matrix[rowAt] = cells;
    rowAt += 1;
  }

  for (let i = 0; i < matrix.length; i += 1) if (!matrix[i]) matrix[i] = [];
  return matrix;
}

/* ---- Entry point --------------------------------------------------------- */

export type SheetFormat = 'xlsx' | 'spreadsheetml';

export function isXlsxBuffer(buf: Buffer): boolean {
  return buf.length > 3 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

/** True for the legacy binary .xls (OLE2 compound document) we can't read. */
export function isLegacyXls(buf: Buffer): boolean {
  return buf.length > 7 && buf.readUInt32BE(0) === 0xd0cf11e0 && buf.readUInt32BE(4) === 0xa1b11ae1;
}

/** Parse a spreadsheet file into a cell matrix. Throws with an admin-readable
 *  message when the bytes aren't a format we can read. */
export function parseSpreadsheet(buf: Buffer): { matrix: string[][]; format: SheetFormat } {
  if (isLegacyXls(buf)) {
    throw new Error('This is an old binary .xls file. Open it in Excel or Google Sheets and re-save as .xlsx (or .csv), then upload again.');
  }
  if (isXlsxBuffer(buf)) {
    return { matrix: readXlsx(buf), format: 'xlsx' };
  }
  const text = buf.toString('utf8');
  if (/<\?xml/i.test(text) && /<Workbook\b/i.test(text)) {
    return { matrix: readSpreadsheetML(text), format: 'spreadsheetml' };
  }
  throw new Error('Unrecognised spreadsheet file. Upload a .xlsx workbook (Google Sheets → Download → Microsoft Excel) or a .csv.');
}
