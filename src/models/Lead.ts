import { Schema, model, models } from 'mongoose';

/* ============================================================================
   Unified Leads & Customers record.

   A single collection holds both prospects (`recordType: 'Lead'`) and won
   customers (`recordType: 'Customer'`). Conversion simply flips `recordType`,
   so no data is copied or lost. This supersedes the old `Customer` model in the
   admin UI; existing customers are migrated in via
   scripts/migrate-customers-to-leads.mjs (mapped: companyName→organisation,
   fullName→firstName/lastName, companyAddress→addressLine1, phone→mobile).

   India-specific fields (gstNumber, panNumber, whatsapp) are preserved so the
   previous Customers capability is retained in full.
   ========================================================================= */

/** A user-defined extra attribute ("Region": "West"). */
export interface ICustomField {
  label: string;
  value: string;
}

/** A single line in a customer's purchase history. */
export interface IPurchase {
  product: string;
  value?: string;
  date?: Date | null;
  notes?: string;
}

export interface ILead {
  _id?: string;
  recordType: 'Lead' | 'Customer';
  /** Authoritative lifecycle position (Enquiry → Lead → Customer). */
  stage?: 'Enquiry' | 'Lead' | 'Customer';

  // Profile
  firstName: string;
  lastName?: string;
  designation?: string;
  organisation?: string;
  email: string;
  mobile: string; // E.164, e.g. +919876543210
  whatsapp?: string;
  website?: string;
  telephoneDirect?: string;
  telephoneOffice?: string;
  notes?: string;
  listName?: string;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;

  // India tax identifiers (preserved from the legacy Customer model)
  gstNumber?: string;
  panNumber?: string;

  // Qualifiers
  productGroups?: string[];
  customerGroup?: string;
  dealSize?: string; // expected deal value
  leadPotential?: string;
  leadStage?: string;
  tags?: string[];
  customFields?: ICustomField[];

  // Sales process (stage 2 — Lead)
  interestedProducts?: string[];
  requirementDetails?: string;
  assignedTo?: string; // salesperson

  // Customer stage (stage 3) — purchased products & purchase history
  purchases?: IPurchase[];

  // Follow-up (full history lives in the Activity collection)
  nextFollowUpAt?: Date | null;
  nextFollowUpNote?: string;

  // Conversion provenance
  convertedAt?: Date | null;
  sourceEnquiryId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const CustomFieldSchema = new Schema<ICustomField>(
  {
    label: { type: String, trim: true, default: '' },
    value: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    product: { type: String, trim: true, default: '' },
    value: { type: String, trim: true, default: '' },
    date: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const LeadSchema = new Schema<ILead>(
  {
    recordType: { type: String, enum: ['Lead', 'Customer'], default: 'Lead', required: true, index: true },
    stage: { type: String, enum: ['Enquiry', 'Lead', 'Customer'], default: 'Lead', index: true },

    // Profile
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    organisation: { type: String, trim: true, default: '' },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    mobile: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    telephoneDirect: { type: String, trim: true, default: '' },
    telephoneOffice: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    listName: { type: String, trim: true, default: '' },

    // Address
    addressLine1: { type: String, trim: true, default: '' },
    addressLine2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    zip: { type: String, trim: true, default: '' },

    // India tax identifiers
    gstNumber: { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, default: '' },

    // Qualifiers
    productGroups: { type: [String], default: [] },
    customerGroup: { type: String, trim: true, default: '' },
    dealSize: { type: String, trim: true, default: '' },
    leadPotential: { type: String, trim: true, default: '' },
    leadStage: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    customFields: { type: [CustomFieldSchema], default: [] },

    // Sales process
    interestedProducts: { type: [String], default: [] },
    requirementDetails: { type: String, trim: true, default: '' },
    assignedTo: { type: String, trim: true, default: '' },

    // Purchase history (customer stage)
    purchases: { type: [PurchaseSchema], default: [] },

    // Follow-up
    nextFollowUpAt: { type: Date, default: null },
    nextFollowUpNote: { type: String, trim: true, default: '' },

    // Conversion
    convertedAt: { type: Date, default: null },
    sourceEnquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
  },
  { timestamps: true },
);

LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ leadStage: 1 });

// Fallback avoids the "OverwriteModelError" on Next.js hot-reload.
export default models.Lead || model<ILead>('Lead', LeadSchema);
