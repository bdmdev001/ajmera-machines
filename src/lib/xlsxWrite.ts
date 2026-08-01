/* ============================================================================
   Dependency-free .xlsx writer — the counterpart to xlsx.ts's reader, used for
   the downloadable import templates. Server-only (node:zlib).

   Emits a genuine OOXML package rather than the SpreadsheetML 2003 XML that
   exporters.ts produces, so the template opens without a format warning in
   Excel and imports cleanly into Google Sheets. Every cell is written as an
   inline string: a template is for typing into, and text cells stop Excel
   reformatting phone numbers or reading "01/02" as a date.
   ========================================================================= */

import { deflateRawSync } from 'node:zlib';
import type { ExportColumn, ExportRow } from '@/lib/exporters';

/* ---- ZIP writing --------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Build a ZIP archive from name → text entries (all deflated). */
function zip(entries: [string, string][]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const [name, text] of entries) {
    const raw = Buffer.from(text, 'utf8');
    const body = deflateRawSync(raw);
    const nameBuf = Buffer.from(name, 'utf8');
    const sum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, body);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4); // version made by
    dir.writeUInt16LE(20, 6); // version needed
    dir.writeUInt16LE(8, 10); // deflate
    dir.writeUInt32LE(sum, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }

  const localBuf = Buffer.concat(locals);
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(localBuf.length, 16);

  return Buffer.concat([localBuf, centralBuf, end]);
}

/* ---- Sheet XML ----------------------------------------------------------- */

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are illegal in XML 1.0 and make Excel refuse the file.
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
function colName(i: number): string {
  let n = i + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function cell(ref: string, value: unknown, style: number): string {
  const text = value == null ? '' : String(value);
  if (!text) return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}

const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/* Style slots: 0 = default, 1 = bold header, 2 = text (numFmt 49). Fill slots
   0 and 1 must stay "none" and "gray125" — Excel requires both. */
const S_DEFAULT = 0;
const S_HEADER = 1;
const S_TEXT = 2;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${SHEET_NS}">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

interface XlsxOptions {
  /** Headers whose column should be Text-formatted. Without this Excel turns a
   *  freshly typed "05001" into 5001 and "+91" into 91, silently losing digits
   *  from ZIPs, phone numbers and tax IDs the moment the admin edits a cell. */
  textColumns?: string[];
}

/** Render a single-sheet workbook as .xlsx bytes. */
export function toXlsx(sheetName: string, columns: ExportColumn[], rows: ExportRow[], options: XlsxOptions = {}): Buffer {
  const asText = new Set((options.textColumns ?? []).map((h) => h.toLowerCase()));
  const styleFor = (c: ExportColumn) => (asText.has(c.header.toLowerCase()) ? S_TEXT : S_DEFAULT);

  const headerRow = `<row r="1">${columns.map((c, i) => cell(`${colName(i)}1`, c.header, S_HEADER)).join('')}</row>`;
  const dataRows = rows
    .map((r, ri) => `<row r="${ri + 2}">${columns.map((c, i) => cell(`${colName(i)}${ri + 2}`, r[c.key], styleFor(c))).join('')}</row>`)
    .join('');

  // Roughly size each column to its header so the template is readable. The
  // column-level style also covers the blank rows below the examples, which is
  // where the admin actually types.
  const cols = `<cols>${columns
    .map((c, i) => {
      const width = Math.min(40, Math.max(12, c.header.length + 4));
      const style = styleFor(c) === S_TEXT ? ` style="${S_TEXT}"` : '';
      return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"${style}/>`;
    })
    .join('')}</cols>`;

  const lastRef = `${colName(Math.max(0, columns.length - 1))}${rows.length + 1}`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="${SHEET_NS}"><dimension ref="A1:${lastRef}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${headerRow}${dataRows}</sheetData></worksheet>`;

  // Excel rejects sheet names over 31 chars or containing : \ / ? * [ ]
  const safeName = esc(sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet1');

  return zip([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],

    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_RELS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],

    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="${SHEET_NS}" xmlns:r="${DOC_RELS}"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`],

    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_RELS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${DOC_RELS}/styles" Target="styles.xml"/></Relationships>`],

    ['xl/styles.xml', STYLES],
    ['xl/worksheets/sheet1.xml', sheet],
  ]);
}
