/**
 * Backfill/migration: move legacy local product images (bare filenames in
 * /public/machines) up to Cloudinary and rewrite each product's `images`
 * field into the structured [{ url, public_id }] shape.
 *
 * Safe by design:
 *   • DRY-RUN by default — prints a plan, uploads nothing, writes nothing.
 *   • Pass --apply to actually upload + update MongoDB.
 *   • --limit N     : only process the first N products (great for a test run).
 *   • --product ID  : only process the product with this `id`.
 *   • Idempotent    : images already on Cloudinary are skipped; deterministic
 *                     public_ids mean a re-run never creates duplicates.
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-images-to-cloudinary.mjs            # dry-run, all
 *   node --env-file=.env scripts/migrate-images-to-cloudinary.mjs --limit 1  # dry-run, 1 product
 *   node --env-file=.env scripts/migrate-images-to-cloudinary.mjs --apply --limit 1
 *   node --env-file=.env scripts/migrate-images-to-cloudinary.mjs --apply    # migrate everything
 */
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const ONLY = args.includes('--product') ? args[args.indexOf('--product') + 1] : null;

const { MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
const FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ajmera/machines';
const MACHINES_DIR = path.join(process.cwd(), 'public', 'machines');

if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary CLOUDINARY_* vars missing'); process.exit(1);
}
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true,
});

const isHttp = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);
const isCloud = (s) => typeof s === 'string' && /res\.cloudinary\.com/i.test(s);

/** Upload with retry/backoff — transient network errors (ECONNRESET, timeouts)
 *  must not abort a 500-image migration. */
async function uploadWithRetry(filePath, options, tries = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await cloudinary.uploader.upload(filePath, options);
    } catch (e) {
      lastErr = e;
      if (attempt < tries) {
        const wait = 1000 * attempt;
        process.stdout.write(`\n  retry ${attempt}/${tries - 1} after error (${e?.message || e?.error?.message || e}) — waiting ${wait}ms\n`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

/** Classify one stored image entry (string filename | url | structured object). */
function classify(img) {
  if (img && typeof img === 'object') {
    if (isCloud(img.url) && img.public_id) return { kind: 'done', value: { url: img.url, public_id: img.public_id } };
    if (isHttp(img.url)) return { kind: 'external', value: { url: img.url, public_id: img.public_id || '' } };
    if (typeof img.url === 'string' && img.url) return { kind: 'file', file: img.url.replace(/^\/machines\//, '') };
    return { kind: 'empty' };
  }
  if (typeof img === 'string' && img) {
    if (isCloud(img)) return { kind: 'external', value: { url: img, public_id: '' } };
    if (isHttp(img)) return { kind: 'external', value: { url: img, public_id: '' } };
    return { kind: 'file', file: img.replace(/^\/machines\//, '') };
  }
  return { kind: 'empty' };
}

async function main() {
  console.log(`\n=== Cloudinary image migration ${APPLY ? '(APPLY — will upload + write)' : '(DRY-RUN — no changes)'} ===`);
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const products = client.db().collection('products');

  const query = ONLY ? { id: ONLY } : {};
  const docs = await products.find(query).sort({ id: -1 }).toArray();
  const slice = docs.slice(0, LIMIT === Infinity ? docs.length : LIMIT);
  console.log(`Products in scope: ${slice.length}${docs.length !== slice.length ? ` (of ${docs.length})` : ''}\n`);

  let uploaded = 0, skippedDone = 0, missing = 0, productsChanged = 0;
  const brokenFiles = [];

  for (const doc of slice) {
    const imgs = Array.isArray(doc.images) ? doc.images : [];
    const nextImages = [];
    let changed = false;

    for (let i = 0; i < imgs.length; i++) {
      const c = classify(imgs[i]);
      if (c.kind === 'done') { nextImages.push(c.value); skippedDone++; continue; }
      if (c.kind === 'external') { nextImages.push(c.value); continue; }
      if (c.kind === 'empty') { changed = true; continue; } // drop empties
      // c.kind === 'file'
      const filePath = path.join(MACHINES_DIR, c.file);
      if (!fs.existsSync(filePath)) {
        missing++; brokenFiles.push({ id: doc.id, stockNo: doc.stockNo, file: c.file });
        changed = true; // dropping a broken ref counts as a change
        continue;
      }
      const publicId = `${FOLDER}/${c.file.replace(/\.[^.]+$/, '')}`;
      if (APPLY) {
        const res = await uploadWithRetry(filePath, {
          public_id: publicId, overwrite: true, resource_type: 'image',
          use_filename: false, unique_filename: false,
        });
        nextImages.push({ url: res.secure_url, public_id: res.public_id });
      } else {
        nextImages.push({ url: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`, public_id: publicId });
      }
      uploaded++; changed = true;
      process.stdout.write(`  ${APPLY ? 'uploaded' : 'would upload'} ${doc.id} <- ${c.file}\r`);
    }

    if (changed) {
      productsChanged++;
      if (APPLY) {
        await products.updateOne(
          { _id: doc._id },
          { $set: { images: nextImages }, $unset: { imagePublicIds: '' } },
        );
      }
    }
  }

  console.log('\n\n--- summary ---');
  console.log(`images ${APPLY ? 'uploaded' : 'to upload'} : ${uploaded}`);
  console.log(`images already on Cloudinary (skipped): ${skippedDone}`);
  console.log(`missing local files (broken refs)      : ${missing}`);
  console.log(`products ${APPLY ? 'updated' : 'that would change'}      : ${productsChanged}`);
  if (brokenFiles.length) {
    console.log('\nBROKEN (need manual re-upload):');
    for (const b of brokenFiles.slice(0, 50)) console.log(`  product ${b.id} (${b.stockNo}) -> missing ${b.file}`);
    if (brokenFiles.length > 50) console.log(`  ...and ${brokenFiles.length - 50} more`);
  }
  if (!APPLY) console.log('\nDRY-RUN complete. Re-run with --apply to perform the migration.');

  await client.close();
}

main().catch((e) => { console.error('\nMIGRATION ERROR:', e); process.exit(1); });
