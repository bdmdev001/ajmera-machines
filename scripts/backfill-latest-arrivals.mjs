/**
 * One-time backfill for admin-managed Latest Arrivals.
 *
 * The homepage section used to be derived automatically from `createdAt` (the
 * newest 8 machines). It is now curated: a product shows only when an admin has
 * switched `isLatestArrival` on. Without this backfill the section would simply
 * disappear on deploy, because no existing product carries the flag.
 *
 * This marks the N most recently created machines so the homepage keeps showing
 * what it shows today, giving the admin a populated starting point to curate.
 * Priority is left at 0 for every product, so they order by newest-updated
 * exactly as before until someone sets an explicit priority.
 *
 * Idempotent: products already flagged are left untouched, and re-running never
 * marks more than the requested count.
 *
 *   node --env-file=.env scripts/backfill-latest-arrivals.mjs             # dry-run
 *   node --env-file=.env scripts/backfill-latest-arrivals.mjs --apply     # perform it
 *   node --env-file=.env scripts/backfill-latest-arrivals.mjs --apply --count=12
 */
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const countArg = process.argv.find((a) => a.startsWith('--count='));
const COUNT = Math.max(1, parseInt(countArg?.split('=')[1] ?? '8', 10) || 8);

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI missing (run with --env-file=.env)');
  process.exit(1);
}

async function main() {
  console.log(`\n=== Latest Arrivals backfill ${APPLY ? '(APPLY)' : '(DRY-RUN)'} — target ${COUNT} machines ===`);
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const products = client.db().collection('products');

  const total = await products.countDocuments({});
  const already = await products.countDocuments({ isLatestArrival: true });
  console.log(`Catalogue: ${total} machines · already marked: ${already}`);

  if (already >= COUNT) {
    console.log(`Nothing to do — ${already} machine(s) are already marked as Latest Arrivals.`);
    await client.close();
    return;
  }

  // Top up to COUNT using the newest unmarked machines — the same set the old
  // automatic section would have rendered.
  const need = COUNT - already;
  const candidates = await products
    .find({ isLatestArrival: { $ne: true } }, { projection: { id: 1, title: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(need)
    .toArray();

  if (candidates.length === 0) {
    console.log('No unmarked machines available to backfill.');
    await client.close();
    return;
  }

  console.log(`\nWill mark ${candidates.length} machine(s):`);
  for (const c of candidates) {
    console.log(`  · [${c.id}] ${String(c.title ?? '').slice(0, 70)}`);
  }

  if (APPLY) {
    const res = await products.updateMany(
      { _id: { $in: candidates.map((c) => c._id) } },
      {
        $set: {
          isLatestArrival: true,
          latestArrivalPriority: 0,
          latestArrivalFrom: null,
          latestArrivalUntil: null,
        },
      },
    );
    console.log(`\n✅ Marked ${res.modifiedCount} machine(s) as Latest Arrivals.`);
  } else {
    console.log('\n(dry-run — re-run with --apply to write these changes)');
  }

  await client.close();
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
