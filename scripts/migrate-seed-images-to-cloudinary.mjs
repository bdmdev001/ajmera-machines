/**
 * Rewrite the bundled seed catalogue (src/data/products.json) so every image
 * reference becomes a structured Cloudinary object { url, public_id } instead of
 * a bare local filename ("2005_1.jpeg").
 *
 * The homepage category cards + the seed fallback for featured/latest read this
 * file directly, so migrating it removes the last local `/machines/...` image
 * paths from the homepage.
 *
 * Strategy (idempotent, reuses the existing `ajmera/machines/<name>` convention
 * already populated by the DB migration):
 *   1. If an entry is already a Cloudinary object -> keep as-is.
 *   2. Else derive public_id `ajmera/machines/<filename-without-ext>` and build
 *      the deterministic delivery URL for it. These assets already live on
 *      Cloudinary (uploaded by the DB migration), so NO API call is needed —
 *      which also means this never touches the Admin-API rate limit.
 *   3. Store { url, public_id }.
 *
 * The local file in /public/machines is checked only to flag broken references.
 *
 *   node --env-file=.env scripts/migrate-seed-images-to-cloudinary.mjs            # dry-run
 *   node --env-file=.env scripts/migrate-seed-images-to-cloudinary.mjs --apply    # write products.json
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const { CLOUDINARY_CLOUD_NAME } = process.env;
if (!CLOUDINARY_CLOUD_NAME) {
  console.error('❌ CLOUDINARY_CLOUD_NAME missing (run with --env-file=.env)');
  process.exit(1);
}

const FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'ajmera/machines';
const BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const MACHINES_DIR = path.join(process.cwd(), 'public', 'machines');
const SEED_PATH = path.join(process.cwd(), 'src', 'data', 'products.json');

const isCloud = (s) => typeof s === 'string' && /res\.cloudinary\.com/i.test(s);

/** Bare filename ("2005_1.jpeg") -> deterministic Cloudinary { url, public_id }. */
function resolveFile(file, missing) {
  const bare = file.replace(/^\/machines\//, '');
  const publicId = `${FOLDER}/${bare.replace(/\.[^.]+$/, '')}`;
  if (!fs.existsSync(path.join(MACHINES_DIR, bare))) missing.add(bare);
  // Extensionless delivery URL — Cloudinary serves the original stored format.
  return { url: `${BASE}/${publicId}`, public_id: publicId };
}

function main() {
  console.log(`\n=== Seed image migration ${APPLY ? '(APPLY — will rewrite products.json)' : '(DRY-RUN)'} ===\n`);
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const seen = new Set();
  const missing = new Set();
  let alreadyDone = 0;

  for (const p of seed) {
    const imgs = Array.isArray(p.images) ? p.images : [];
    const next = [];
    for (const im of imgs) {
      if (im && typeof im === 'object' && isCloud(im.url) && im.public_id) { next.push(im); alreadyDone++; seen.add(im.public_id); continue; }
      const file = typeof im === 'string' ? im : (im && im.url) || '';
      if (!file) continue;
      if (isCloud(file)) { next.push({ url: file, public_id: '' }); alreadyDone++; continue; }
      const ref = resolveFile(file, missing);
      seen.add(ref.public_id);
      next.push(ref);
    }
    p.images = next;
  }

  console.log(`--- summary ---`);
  console.log(`unique assets referenced  : ${seen.size}`);
  console.log(`entries already Cloudinary : ${alreadyDone}`);
  console.log(`local files MISSING (broken): ${missing.size}${missing.size ? ' -> ' + [...missing].slice(0, 20).join(', ') : ''}`);

  if (APPLY) {
    fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + '\n', 'utf8');
    console.log(`\n✅ Wrote ${SEED_PATH}`);
  } else {
    console.log('\nDRY-RUN complete. Re-run with --apply to rewrite products.json.');
  }
}
main();
