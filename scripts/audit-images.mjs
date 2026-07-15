/**
 * Read-only audit of product image references in MongoDB.
 * Reports how many products still need re-uploading to Cloudinary and which
 * ones have broken (missing-file) references.
 *
 *   node --env-file=.env scripts/audit-images.mjs
 */
import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }

const machinesDir = path.join(process.cwd(), 'public', 'machines');
const localFiles = new Set(fs.existsSync(machinesDir) ? fs.readdirSync(machinesDir) : []);
const isCloud = (s) => typeof s === 'string' && /res\.cloudinary\.com/i.test(s);

function urlOf(img) {
  if (img && typeof img === 'object') return img.url || '';
  return typeof img === 'string' ? img : '';
}
function publicIdOf(img) {
  return img && typeof img === 'object' ? (img.public_id || '') : '';
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const docs = await client.db().collection('products').find({}).toArray();
  console.log(`\n=== Image audit (db: ${client.db().databaseName}, ${docs.length} products) ===`);

  let onCloud = 0, legacyExists = 0, legacyMissing = 0, structured = 0;
  const needReupload = [];
  const broken = [];

  for (const p of docs) {
    const imgs = Array.isArray(p.images) ? p.images : [];
    let anyCloud = false, anyBroken = false;
    for (const im of imgs) {
      const url = urlOf(im);
      if (typeof im === 'object' && im) structured++;
      if (isCloud(url) && publicIdOf(im)) { onCloud++; anyCloud = true; }
      else if (/^https?:\/\//i.test(url)) { /* external */ }
      else if (localFiles.has(url.replace(/^\/machines\//, ''))) { legacyExists++; }
      else { legacyMissing++; anyBroken = true; }
    }
    if (imgs.length === 0 || !anyCloud) needReupload.push({ id: p.id, stockNo: p.stockNo, images: imgs.length });
    if (anyBroken) broken.push({ id: p.id, stockNo: p.stockNo });
  }

  console.log(`per-image: on Cloudinary=${onCloud}, structured objects=${structured}, legacy-exists=${legacyExists}, legacy-MISSING=${legacyMissing}`);
  console.log(`products needing re-upload: ${needReupload.length}/${docs.length}`);
  console.log(`products with BROKEN refs : ${broken.length}`);
  if (needReupload.length) console.log('  ids:', needReupload.map((x) => x.id).join(', '));
  if (broken.length) console.log('  broken ids:', broken.map((x) => x.id).join(', '));

  await client.close();
}
main().catch((e) => { console.error('AUDIT ERROR:', e); process.exit(1); });
