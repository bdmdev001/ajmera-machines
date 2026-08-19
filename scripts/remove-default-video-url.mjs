/**
 * One-off cleanup: clear the default YouTube CHANNEL link from products.
 *
 * The scraped catalogue put the company's channel URL into every product's
 * video_url as if it were that machine's video. It isn't — it is the same link
 * for all of them — so it is blanked here. Genuine per-product links
 * (youtu.be/…, /shorts/…, /watch?v=…) are left completely untouched, and the
 * Footer's social link to the channel is unrelated and unaffected.
 *
 * Matching is on the channel ID, so /videos, a trailing slash, http vs https
 * and a missing "www" are all caught.
 *
 *   node --env-file=.env scripts/remove-default-video-url.mjs          # dry run
 *   node --env-file=.env scripts/remove-default-video-url.mjs --commit # apply
 */
import { MongoClient } from 'mongodb';

const CHANNEL_ID = 'UC5T7NF6DRqDvlj224nO_fbg';
const commit = process.argv.includes('--commit');

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }

const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
await client.connect();
const products = client.db().collection('products');

const filter = { videoUrl: { $regex: CHANNEL_ID, $options: 'i' } };
const affected = await products.find(filter, { projection: { id: 1, stockNo: 1, title: 1, videoUrl: 1, _id: 0 } }).toArray();

console.log(`products with the default channel link: ${affected.length}`);
for (const p of affected.slice(0, 5)) console.log(`   ${p.stockNo}  ${String(p.title).slice(0, 48)}`);
if (affected.length > 5) console.log(`   … and ${affected.length - 5} more`);

// Sanity: genuine links that must survive.
const kept = await products.countDocuments({
  videoUrl: { $nin: ['', null], $not: { $regex: CHANNEL_ID, $options: 'i' } },
});
console.log(`product-specific links left untouched: ${kept}`);

if (!commit) {
  console.log('\ndry run — re-run with --commit to apply');
} else {
  const res = await products.updateMany(filter, { $set: { videoUrl: '' } });
  console.log(`\n✅ cleared ${res.modifiedCount} product video links`);
  const left = await products.countDocuments(filter);
  console.log(`remaining with the channel link: ${left}`);
}

await client.close();
