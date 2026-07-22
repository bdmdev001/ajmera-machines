/**
 * Safe product data update from a CSV (default: ./ajmera.csv).
 *
 * For every CSV row it:
 *   1. Matches the CSV "StockID" to a product by EXACT id (or stockNo). Never
 *      creates products; unmatched StockIDs are reported, not inserted.
 *   2. Updates the video link (`videoUrl`) ONLY when the CSV provides a valid
 *      one — a blank/NULL video never overwrites an existing link.
 *   3. Regenerates a professional, specs-based `description` from the product's
 *      OWN existing data (never from unverified CSV text).
 *   4. Writes only `videoUrl` / `description` via $set — no other field is
 *      touched, so titles, categories, brands, specs, stock, images stay intact.
 *
 * Descriptions never contain any disclaimer/commercial note — those are internal
 * content guidelines only and are not displayed anywhere on the product.
 *
 * SAFETY: dry-run by default (reads only). Pass --apply to write. A full report
 * is printed and saved to scripts/update-products-from-csv.report.txt.
 *
 *   node --env-file=.env scripts/update-products-from-csv.mjs             # dry-run
 *   node --env-file=.env scripts/update-products-from-csv.mjs --apply     # write
 *   node --env-file=.env scripts/update-products-from-csv.mjs --csv=path  # other CSV
 */
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const csvArg = process.argv.find((a) => a.startsWith('--csv='));
const CSV_PATH = csvArg ? csvArg.slice('--csv='.length) : 'ajmera.csv';
const REPORT_PATH = 'scripts/update-products-from-csv.report.txt';

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }

/* ------------------------------------------------------------------ */
/* CSV parsing — RFC-4180-ish: quoted fields, "" escapes, embedded     */
/* newlines and commas. Returns an array of string[] rows.             */
/* ------------------------------------------------------------------ */
function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  let sawAny = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
      sawAny = true;
    } else if (c === ',') {
      row.push(field); field = ''; sawAny = true;
    } else if (c === '\r') {
      // ignore; handled by \n
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; sawAny = false;
    } else {
      field += c; sawAny = true;
    }
  }
  if (sawAny || field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const isBlank = (v) => { const s = (v ?? '').trim(); return !s || s.toUpperCase() === 'NULL'; };
const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test((v ?? '').trim());

/* ------------------------------------------------------------------ */
/* Professional description generator — MUST stay identical to         */
/* src/lib/productDescription.ts (buildProductDescription).            */
/* ------------------------------------------------------------------ */
const clean = (v) => (v ?? '').toString().trim();
const meaningful = (v) => { const s = clean(v); return s && s !== 'N/A' ? s : ''; };

function machineApplication(category, title) {
  const h = `${category} ${title}`.toLowerCase();
  const rules = [
    [/tester|testing/, 'Machines of this type are used to inspect and check gears for running accuracy and quality, supporting quality control in gear and transmission manufacturing.'],
    [/sharp|tool\s*&?\s*cutter/, 'Machines of this type are used to sharpen and recondition cutting tools such as hobs and cutters, helping workshops keep their tooling accurate and productive.'],
    [/thread/, 'Machines of this type are used to produce accurate external or internal threads, supporting the manufacture of fasteners, lead screws and other threaded components.'],
    [/gun/, 'Deep-hole drilling machines of this type are used to produce long, straight and accurate bores, such as those needed in shafts, moulds and hydraulic components.'],
    [/gear|hob|skiv|bevel|shob/, 'Machines of this type are used to cut and finish gear teeth to consistent quality, supporting gearbox, transmission and power-transmission component manufacturing.'],
    [/\bvtl\b|vertical turning|vertical lathe|vertical boring/, 'Vertical turning machines of this type are used to turn, face and bore large-diameter, heavy rotational parts that are difficult to hold on a horizontal lathe, suiting heavy engineering and casting work.'],
    [/lathe|turning/, 'Lathes of this type are used to turn, face and machine cylindrical components such as shafts, bushes and rollers, a mainstay of general machining and repair work.'],
    [/facing|centering|centring/, 'Machines of this type are used to face and centre-drill the ends of shafts and bar stock in preparation for turning, a common first step in shaft and axle production.'],
    [/hone|honing/, 'Honing machines of this type are used to produce a precise, fine finish inside bores and cylinders, typical of hydraulic, engine and precision component work.'],
    [/bore|boring/, 'Machines of this type are used to enlarge and finish holes to accurate diameters and positions in medium to large components, common in tool rooms and heavy fabrication.'],
    [/drill/, 'Machines of this type are used to drill, ream and tap holes accurately across a range of components, suiting fabrication and general engineering workshops.'],
    [/broach/, 'Broaching machines of this type are used to cut internal or external profiles such as keyways, splines and slots in a single, repeatable pass.'],
    [/centreless|centerless/, 'Centreless grinders of this type are used to grind the outside diameter of cylindrical parts at high throughput, suiting volume production of pins, rollers and shafts.'],
    [/internal grind|grinder internal/, 'Internal grinders of this type are used to grind bores and internal diameters to a fine finish and accurate size.'],
    [/cylindrical/, 'Cylindrical grinders of this type are used to grind the outside diameter of round components to precise size and surface finish, common in precision and tool-room work.'],
    [/surface/, 'Surface grinders of this type are used to grind flat surfaces to a fine finish and close tolerance, widely used in tool rooms and precision machining.'],
    [/grind/, 'Grinding machines of this type are used to finish components to a precise size and surface quality, a key step in precision manufacturing.'],
    [/mill/, 'Milling machines of this type are used to machine flat faces, slots, pockets and contours on a wide variety of components, a versatile mainstay of tool rooms and general engineering.'],
    [/saw/, 'Sawing machines of this type are used to cut bar, billet and section stock to length accurately, a common first operation in machining and fabrication.'],
    [/brake|bending/, 'Press brakes of this type are used to bend and form sheet and plate into accurate angles and profiles, essential to sheet-metal fabrication.'],
    [/shear/, 'Shearing machines of this type are used to cut sheet and plate cleanly to size, a fundamental operation in sheet-metal work.'],
    [/notch/, 'Notching machines of this type are used to cut corners and notches in sheet metal, aiding fabrication and panel work.'],
    [/press|punch/, 'Presses of this type are used to stamp, punch and form sheet-metal components, supporting volume production in press shops.'],
    [/shap/, 'Shaping machines of this type are used to machine flat surfaces, slots and keyways on smaller components, a useful capability in tool rooms and maintenance work.'],
    [/tap/, 'Tapping machines of this type are used to cut internal threads quickly and consistently, supporting fastening and assembly operations.'],
    [/level/, 'Levelling machines of this type are used to flatten sheet and strip stock, improving material quality ahead of cutting and forming.'],
    [/pantograph|engrav/, 'Pantograph machines of this type are used to engrave and copy profiles and lettering, useful for die, mould and marking work.'],
  ];
  for (const [re, sentence] of rules) if (re.test(h)) return sentence;
  return 'Machines of this type support a range of machining and production tasks across engineering and manufacturing workshops.';
}

function buildProductDescription(p) {
  const make = meaningful(p.make);
  const title = clean(p.title);
  const model = meaningful(p.model);
  const country = meaningful(p.country);
  const year = clean(p.myear);
  const category = meaningful(p.category) || 'industrial machine';

  const firstTok = (s) => (s.toLowerCase().match(/[a-z0-9]+/) || [''])[0];
  const titleHasBrand = !!(title && make && (title.toLowerCase().includes(make.toLowerCase()) || firstTok(title) === firstTok(make)));
  const name = titleHasBrand ? title : ([make, title].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || `used ${category}`);
  const catPhrase = /machines?$/i.test(category) ? category : `${category} machine`;

  let s1 = `The ${name} is a pre-owned ${catPhrase}`;
  const origin = [];
  if (country) origin.push(`of ${country} origin`);
  if (year) origin.push(`manufactured in ${year}`);
  if (origin.length) s1 += ` ${origin.join(' and ')}`;
  s1 += `, available from Ajmera Enterprise in Navi Mumbai, India.`;

  const s2 = machineApplication(category, title);

  const s3 = `${model ? `Offered as model ${model}, it has` : 'It has'} been inspected and tested under power before listing, providing a cost-effective, ready-to-use option for buyers of reliable pre-owned machinery — contact us for current pricing, photographs and availability.`;

  return `${s1} ${s2} ${s3}`.replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */

async function main() {
  const lines = [];
  const log = (s = '') => { console.log(s); lines.push(s); };

  log(`\n=== Product update from CSV ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===`);
  log(`CSV: ${CSV_PATH}`);

  // --- Validate CSV structure ---
  let raw;
  try { raw = readFileSync(CSV_PATH, 'utf8'); }
  catch { console.error(`❌ Cannot read CSV at ${CSV_PATH}`); process.exit(1); }

  const table = parseCsv(raw);
  if (table.length < 2) { console.error('❌ CSV has no data rows.'); process.exit(1); }

  const header = table[0].map((h) => h.trim());
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iId = idx('StockID');
  const iVideo = idx('Videos');
  if (iId === -1 || iVideo === -1) {
    console.error(`❌ CSV missing required columns. Found: [${header.join(', ')}]. Need "StockID" and "Videos".`);
    process.exit(1);
  }
  log(`Columns OK. StockID @${iId}, Videos @${iVideo}. Data rows: ${table.length - 1}`);

  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const products = client.db().collection('products');

  const summary = {
    rows: table.length - 1,
    updated: [],          // ids with any change
    videoUpdated: [],     // ids whose videoUrl changed
    descUpdated: [],      // ids whose description changed
    notFound: [],         // StockIDs with no matching product
    invalidRows: [],      // { line, reason }
    unchanged: [],        // matched but nothing to change
    duplicates: [],       // StockIDs appearing more than once in the CSV
  };
  const seen = new Set();

  for (let r = 1; r < table.length; r++) {
    const cols = table[r];
    const lineNo = r + 1; // 1-based incl. header for humans
    const sid = clean(cols[iId]);

    if (!sid) { summary.invalidRows.push({ line: lineNo, reason: 'missing StockID' }); continue; }
    if (seen.has(sid)) { summary.duplicates.push(sid); }
    seen.add(sid);

    // EXACT id match (also accept stockNo equal to the CSV value); never fuzzy.
    const doc = await products.findOne({ $or: [{ id: sid }, { stockNo: sid }] });
    if (!doc) { summary.notFound.push(sid); continue; }

    const set = {};

    // 1) Video — update only when the CSV provides a valid URL.
    const rawVideo = cols[iVideo];
    if (!isBlank(rawVideo)) {
      const url = clean(rawVideo);
      if (isHttpUrl(url)) {
        if (url !== clean(doc.videoUrl)) { set.videoUrl = url; summary.videoUpdated.push(sid); }
      } else {
        summary.invalidRows.push({ line: lineNo, reason: `invalid video URL for ${sid}: "${url.slice(0, 60)}"` });
      }
    }

    // 2) Description — regenerate from the product's OWN existing data.
    const desc = buildProductDescription(doc);
    if (desc && desc !== clean(doc.description)) { set.description = desc; summary.descUpdated.push(sid); }

    if (Object.keys(set).length === 0) { summary.unchanged.push(sid); continue; }

    summary.updated.push(sid);
    if (APPLY) {
      await products.updateOne({ _id: doc._id }, { $set: { ...set, updatedAt: new Date() } });
    }
  }

  await client.close();

  // --- Report ---
  log('\n--- SUMMARY ---');
  log(`CSV data rows            : ${summary.rows}`);
  log(`Products ${APPLY ? 'updated' : 'to update'}        : ${summary.updated.length}`);
  log(`  • video link changed   : ${summary.videoUpdated.length}`);
  log(`  • description changed  : ${summary.descUpdated.length}`);
  log(`Matched, no change       : ${summary.unchanged.length}`);
  log(`StockIDs NOT found       : ${summary.notFound.length}`);
  log(`Invalid rows             : ${summary.invalidRows.length}`);
  log(`Duplicate StockIDs       : ${summary.duplicates.length}`);

  const list = (label, arr) => { if (arr.length) log(`\n${label} (${arr.length}):\n  ${arr.join(', ')}`); };
  list('Video links updated', summary.videoUpdated);
  list('Descriptions updated', summary.descUpdated);
  list('StockIDs not found in DB', summary.notFound);
  list('Duplicate StockIDs in CSV', [...new Set(summary.duplicates)]);
  if (summary.invalidRows.length) {
    log(`\nInvalid rows (${summary.invalidRows.length}):`);
    for (const iv of summary.invalidRows) log(`  line ${iv.line}: ${iv.reason}`);
  }

  log(`\nNote: descriptions carry no disclaimer text (internal guideline only).`);
  if (!APPLY) log('\nDRY-RUN complete — nothing was written. Re-run with --apply to save.');
  else log('\n✅ APPLY complete — changes saved.');

  try { writeFileSync(REPORT_PATH, lines.join('\n') + '\n'); console.log(`\nReport written to ${REPORT_PATH}`); }
  catch { /* non-fatal */ }
}

main().catch((e) => { console.error('UPDATE ERROR:', e); process.exit(1); });
