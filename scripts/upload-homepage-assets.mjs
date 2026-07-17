/**
 * Upload the homepage's STATIC brand/hero assets (logos + hero background) from
 * /public to Cloudinary, under a clean `ajmera/homepage` folder, and print the
 * resulting secure_urls so they can be pasted into the code.
 *
 * Deterministic public_ids (overwrite:true) => idempotent: re-running never
 * creates duplicates and keeps the same stable delivery URLs.
 *
 *   node --env-file=.env scripts/upload-homepage-assets.mjs
 */
import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';
import path from 'node:path';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary CLOUDINARY_* vars missing (run with --env-file=.env)');
  process.exit(1);
}
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true,
});

const FOLDER = 'ajmera/homepage';
const PUBLIC = path.join(process.cwd(), 'public');

/** file in /public  ->  public_id (inside FOLDER) */
const ASSETS = [
  { file: 'hero-light.jpg', id: 'hero-light' },
  { file: 'ajmera-logo.webp', id: 'ajmera-logo' },
  { file: 'ajmera-logo-footer.png', id: 'ajmera-logo-footer' },
  { file: 'BDM-logo.png', id: 'bdm-logo' },
];

async function main() {
  console.log(`\n=== Upload homepage static assets -> ${FOLDER} ===\n`);
  const out = {};
  for (const a of ASSETS) {
    const filePath = path.join(PUBLIC, a.file);
    if (!fs.existsSync(filePath)) { console.error(`  ⚠ missing local file: ${a.file} — skipped`); continue; }
    const res = await cloudinary.uploader.upload(filePath, {
      public_id: `${FOLDER}/${a.id}`,
      overwrite: true, resource_type: 'image', use_filename: false, unique_filename: false,
    });
    out[a.file] = res.secure_url;
    console.log(`  ✓ ${a.file}`);
    console.log(`      url      : ${res.secure_url}`);
    console.log(`      public_id: ${res.public_id}  (${res.width}x${res.height} ${res.format})\n`);
  }
  console.log('--- JSON (for reference) ---');
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error('UPLOAD ERROR:', e); process.exit(1); });
