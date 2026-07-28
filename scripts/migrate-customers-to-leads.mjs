/**
 * One-time migration: copy every legacy `customers` document into the new
 * unified `leads` collection as a Customer record (recordType: 'Customer'), so
 * the redesigned Leads & Customers CRM shows all existing customers with no data
 * loss. Field mapping:
 *   companyName    -> organisation
 *   fullName       -> firstName (+ lastName, split on the first space)
 *   companyAddress -> addressLine1
 *   phone          -> mobile
 *   email / whatsapp / gstNumber / panNumber -> kept as-is
 *
 * Idempotent: a customer whose email already exists as a Customer record in
 * `leads` is skipped, so it is safe to re-run. A 'created' activity is logged
 * for each migrated record.
 *
 *   node --env-file=.env scripts/migrate-customers-to-leads.mjs            # dry-run
 *   node --env-file=.env scripts/migrate-customers-to-leads.mjs --apply    # perform it
 */
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI missing (run with --env-file=.env)'); process.exit(1); }

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || String(full || '').trim() || 'Customer';
  return { firstName, lastName: parts.join(' ') };
}

async function main() {
  console.log(`\n=== Customers → Leads migration ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===`);
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db();
  const customers = db.collection('customers');
  const leads = db.collection('leads');
  const activities = db.collection('activities');

  const all = await customers.find({}).toArray();
  console.log(`Legacy customers found: ${all.length}`);

  let migrated = 0, skipped = 0;
  const now = new Date();

  for (const c of all) {
    const email = String(c.email || '').trim().toLowerCase();
    if (!email) { skipped++; console.log(`  skip (no email): ${c.fullName || c._id}`); continue; }

    const clash = await leads.findOne({ email, recordType: 'Customer' });
    if (clash) { skipped++; console.log(`  skip (exists): ${email}`); continue; }

    const { firstName, lastName } = splitName(c.fullName);
    const doc = {
      recordType: 'Customer',
      firstName,
      lastName,
      designation: '',
      organisation: String(c.companyName || '').trim(),
      email,
      mobile: String(c.phone || '').trim(),
      whatsapp: String(c.whatsapp || '').trim(),
      website: '', telephoneDirect: '', telephoneOffice: '',
      notes: '', listName: '',
      addressLine1: String(c.companyAddress || '').trim(),
      addressLine2: '', city: '', state: '', country: '', zip: '',
      gstNumber: String(c.gstNumber || '').trim(),
      panNumber: String(c.panNumber || '').trim(),
      productGroups: [], customerGroup: '', dealSize: '',
      leadPotential: '', leadStage: 'Won', tags: [], customFields: [],
      nextFollowUpAt: null, nextFollowUpNote: '',
      convertedAt: c.createdAt || now,
      createdAt: c.createdAt || now,
      updatedAt: now,
    };

    if (APPLY) {
      const res = await leads.insertOne(doc);
      await activities.insertOne({
        leadId: res.insertedId,
        type: 'created',
        title: 'Migrated from Customers',
        body: '',
        done: false,
        dueAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    migrated++;
    console.log(`  migrate: ${firstName}${lastName ? ' ' + lastName : ''}  <${email}>  @ ${doc.organisation || '—'}`);
  }

  console.log('\n--- summary ---');
  console.log(`records ${APPLY ? 'migrated' : 'to migrate'} : ${migrated}`);
  console.log(`skipped (no email / already present) : ${skipped}`);
  if (!APPLY) console.log('\nDRY-RUN complete. Re-run with --apply to write.');

  await client.close();
}
main().catch((e) => { console.error('MIGRATION ERROR:', e); process.exit(1); });
