/* ============================================================================
   Minimal, dependency-free CSV parser (RFC-4180-ish). Handles quoted fields
   containing commas / newlines, escaped double-quotes ("") and a leading BOM.
   Used by the CRM bulk-import feature. Pairs with the exporters' toCSV().
   ========================================================================= */

/** Parse CSV text into a matrix of string cells (no trimming — caller decides). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/^﻿/, ''); // strip BOM

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 1; } // escaped quote
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c === '\r') {
      /* ignored — handled as part of \r\n */
    } else {
      field += c;
    }
  }
  // Flush the trailing field / row (files without a final newline).
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
