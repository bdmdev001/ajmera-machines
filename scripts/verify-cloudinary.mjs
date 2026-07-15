/**
 * End-to-end pipeline check (STEP 5):
 *   1. Upload a sample image to Cloudinary  -> get { url, public_id }
 *   2. Confirm the asset exists via the Admin API (appears in dashboard)
 *   3. Read one product from MongoDB and show its stored images
 *   4. Clean up the sample asset (so it doesn't linger)
 *
 *   node --env-file=.env scripts/verify-cloudinary.mjs
 *   node --env-file=.env scripts/verify-cloudinary.mjs --keep   # keep sample asset
 */
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs';
import path from 'node:path';

const KEEP = process.argv.includes('--keep');
const { MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true,
});

async function main() {
  // Pick any real machine image as the sample.
  const dir = path.join(process.cwd(), 'public', 'machines');
  const sample = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => /\.(jpe?g|png|webp)$/i.test(f)) : null;
  if (!sample) { console.error('No sample image found in public/machines'); process.exit(1); }

  console.log('1) Uploading sample:', sample);
  const up = await cloudinary.uploader.upload(path.join(dir, sample), {
    folder: (process.env.CLOUDINARY_UPLOAD_FOLDER || 'ajmera/machines') + '/_verify',
    resource_type: 'image',
  });
  console.log('   -> url      :', up.secure_url);
  console.log('   -> public_id:', up.public_id);

  console.log('2) Confirming asset exists in Cloudinary...');
  const info = await cloudinary.api.resource(up.public_id);
  console.log('   -> found:', info.public_id, `${info.width}x${info.height}`, info.format);

  if (MONGODB_URI) {
    console.log('3) Sample product document from MongoDB:');
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 12000 });
    await client.connect();
    const p = await client.db().collection('products').findOne({}, { sort: { id: -1 } });
    if (p) {
      console.log('   product id:', p.id, '| stockNo:', p.stockNo);
      console.log('   images:', JSON.stringify((p.images || []).slice(0, 3), null, 2));
      const structured = (p.images || []).every((im) => im && typeof im === 'object' && 'url' in im && 'public_id' in im);
      console.log('   -> stored as structured { url, public_id }?', structured ? 'YES ✅' : 'NO (legacy — run the migration)');
    } else {
      console.log('   (no products found)');
    }
    await client.close();
  } else {
    console.log('3) Skipped DB check (MONGODB_URI not set)');
  }

  if (KEEP) {
    console.log('4) Keeping sample asset (--keep). Open the url above / your dashboard to view.');
  } else {
    await cloudinary.uploader.destroy(up.public_id, { resource_type: 'image' });
    console.log('4) Cleaned up sample asset.');
  }
  console.log('\n✅ Pipeline OK.');
}
main().catch((e) => { console.error('VERIFY ERROR:', e); process.exit(1); });
