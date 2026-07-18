/* ============================================================================
   Dependency-free tabular exporters (CSV + Excel), used by the admin export
   endpoints. No third-party spreadsheet library is added.

   - CSV: RFC-4180 quoting + a UTF-8 BOM so Microsoft Excel, Google Sheets and
     Google Docs all open it with correct encoding.
   - Excel: SpreadsheetML 2003 (.xls XML) which Microsoft Excel opens natively.
   ========================================================================= */

export interface ExportColumn { header: string; key: string }
export type ExportRow = Record<string, unknown>;

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(columns: ExportColumn[], rows: ExportRow[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(',')).join('\r\n');
  return `﻿${head}\r\n${body}${rows.length ? '\r\n' : ''}`;
}

function xml(v: unknown): string {
  const s = v == null ? '' : String(v);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toExcelXML(sheetName: string, columns: ExportColumn[], rows: ExportRow[]): string {
  const headerRow = `<Row>${columns.map((c) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xml(c.header)}</Data></Cell>`).join('')}</Row>`;
  const dataRows = rows
    .map((r) => `<Row>${columns.map((c) => `<Cell><Data ss:Type="String">${xml(r[c.key])}</Data></Cell>`).join('')}</Row>`)
    .join('');
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#DDEBF7" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${xml(sheetName)}">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;
}
