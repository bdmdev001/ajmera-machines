/**
 * One-time migration: remap legacy enquiry statuses onto the new CRM pipeline
 * (Enquiry → Lead → Customer).
 *   Pending  → New
 *   Reviewed → Contacted
 *   Resolved → Closed/Lost
 *
 * Idempotent: rows already using the new statuses are untouched. Safe to re-run.
 *
 *   node --env-file=.env scripts/migrate-enquiry-statuses.mjs            # dry-run
 *   node --env-file=.env scripts/migrate-enquiry-statuses.mjs --apply    # perform it
 */
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }

const MAP = { Pending: 'New', Reviewed: 'Contacted', Resolved: 'Closed/Lost' };

async function main() {
  console.log(`\n=== Enquiry status migration ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===`);
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const enquiries = client.db().collection('enquiries');

  let total = 0;
  for (const [from, to] of Object.entries(MAP)) {
    const count = await enquiries.countDocuments({ status: from });
    if (count > 0 && APPLY) await enquiries.updateMany({ status: from }, { $set: { status: to } });
    if (count > 0) console.log(`  ${from} → ${to}: ${count}`);
    total += count;
  }

  console.log('\n--- summary ---');
  console.log(`enquiries ${APPLY ? 'remapped' : 'to remap'} : ${total}`);
  if (!APPLY) console.log('\nDRY-RUN complete. Re-run with --apply to write.');

  await client.close();
}
main().catch((e) => { console.error('MIGRATION ERROR:', e); process.exit(1); });
