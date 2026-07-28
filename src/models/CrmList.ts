import { Schema, model, models, type Model } from 'mongoose';

/* ============================================================================
   Admin-configurable CRM option lists.

   Powers every qualifier dropdown/multi-select in the Leads & Customers module
   (Product Groups, Customer Groups, Lead Stages, Lead Potentials, Tags). The
   client manages these values themselves via the "Manage lists" modal, so the
   pipeline is not hardcoded. Sensible defaults are seeded lazily on first read.
   ========================================================================= */

export const CRM_LIST_KINDS = [
  'productGroup', 'customerGroup', 'leadStage', 'leadPotential', 'tag', 'salesperson',
] as const;

export type CrmListKind = (typeof CRM_LIST_KINDS)[number];

export interface ICrmList {
  _id?: string;
  kind: CrmListKind;
  name: string;
  /** Sort order within a kind (lower first). */
  order: number;
  /** Optional badge colour (hex) for stage / potential chips. */
  color?: string;
  archived?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CrmListSchema = new Schema<ICrmList>(
  {
    kind: { type: String, enum: CRM_LIST_KINDS, required: true, index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    color: { type: String, trim: true, default: '' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One value per name within a kind (case-insensitive-ish via trimmed strings).
CrmListSchema.index({ kind: 1, name: 1 }, { unique: true });

const CrmList = (models.CrmList as Model<ICrmList>) || model<ICrmList>('CrmList', CrmListSchema);

/** Starter values seeded the first time the lists are read (per kind). */
export const DEFAULT_LISTS: Record<CrmListKind, { name: string; color?: string }[]> = {
  leadStage: [
    { name: 'New', color: '#3b82f6' },
    { name: 'Contacted', color: '#8b5cf6' },
    { name: 'Qualified', color: '#0ea5e9' },
    { name: 'Proposal/Quotation', color: '#f59e0b' },
    { name: 'Negotiation', color: '#f97316' },
    { name: 'Won', color: '#1faf52' },
    { name: 'Lost', color: '#ef4444' },
  ],
  leadPotential: [
    { name: 'Hot', color: '#ef4444' },
    { name: 'Warm', color: '#f59e0b' },
    { name: 'Cold', color: '#3b82f6' },
  ],
  customerGroup: [
    { name: 'Manufacturer' },
    { name: 'Dealer / Trader' },
    { name: 'End User' },
    { name: 'Exporter' },
  ],
  // Product Groups are sourced from Product Categories — never seeded/managed here.
  productGroup: [],
  tag: [
    { name: 'High Value' },
    { name: 'Repeat Buyer' },
    { name: 'Follow-up' },
    { name: 'Referral' },
  ],
  // Seeded empty — the client adds their own sales team via "Manage lists".
  salesperson: [],
};

/**
 * Ensure each kind has at least its default values. Idempotent: inserts only
 * the defaults that are missing, so a client who removed a default value never
 * has it silently reappear beyond the first seed of an empty kind.
 */
export async function seedDefaultsIfEmpty(): Promise<void> {
  for (const kind of CRM_LIST_KINDS) {
    const count = await CrmList.countDocuments({ kind });
    if (count > 0) continue;
    const defaults = DEFAULT_LISTS[kind];
    if (!defaults.length) continue; // e.g. salesperson — nothing to seed
    await CrmList.insertMany(
      defaults.map((d, i) => ({ kind, name: d.name, color: d.color || '', order: i })),
      { ordered: false },
    ).catch(() => { /* ignore duplicate races */ });
  }
}

export default CrmList;
