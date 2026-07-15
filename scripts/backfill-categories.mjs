/**
 * One-time backfill: derive Category documents from the distinct category names
 * already stored on products, then link each product to its Category via
 * `categoryId` (so renames stay in sync going forward).
 *
 * Idempotent: existing categories are reused; products already linked are skipped.
 *
 *   node --env-file=.env scripts/backfill-categories.mjs            # dry-run
 *   node --env-file=.env scripts/backfill-categories.mjs --apply    # perform it
 */
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  console.log(`\n=== Category backfill ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===`);
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db();
  const products = db.collection('products');
  const categoriesCol = db.collection('categories');

  // Distinct, meaningful category names currently on products.
  const names = (await products.distinct('category'))
    .filter((n) => n && n !== 'N/A' && String(n).trim());
  console.log(`Distinct product categories: ${names.length}`);

  let createdCats = 0, linkedProducts = 0;
  const now = new Date();

  for (const name of names) {
    const slug = slugify(name);
    let cat = await categoriesCol.findOne({ $or: [{ name }, { slug }] });

    if (!cat) {
      if (APPLY) {
        const res = await categoriesCol.insertOne({ name, slug, description: '', image: '', createdAt: now, updatedAt: now });
        cat = { _id: res.insertedId, name, slug };
      } else {
        cat = { _id: `(new:${slug})`, name, slug };
      }
      createdCats++;
    }

    // Link products of this category name that don't yet have a categoryId.
    const filter = { category: name, categoryId: { $in: [null, undefined] } };
    const count = await products.countDocuments(filter);
    if (count > 0) {
      if (APPLY && cat._id && typeof cat._id !== 'string') {
        await products.updateMany(filter, { $set: { categoryId: cat._id } });
      }
      linkedProducts += count;
    }
    console.log(`  ${name}  ->  ${slug}  (${count} product${count === 1 ? '' : 's'} to link)`);
  }

  console.log('\n--- summary ---');
  console.log(`categories ${APPLY ? 'created' : 'to create'} : ${createdCats}`);
  console.log(`products ${APPLY ? 'linked' : 'to link'}    : ${linkedProducts}`);
  if (!APPLY) console.log('\nDRY-RUN complete. Re-run with --apply to write.');

  await client.close();
}
main().catch((e) => { console.error('BACKFILL ERROR:', e); process.exit(1); });
