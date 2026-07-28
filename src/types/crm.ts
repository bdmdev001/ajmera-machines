/* ============================================================================
   Client-safe CRM types (no server/mongoose imports) shared by the admin UI.
   These mirror the JSON shapes returned by lib/lead.ts serializers and the
   CRM lists API, so components never import server-only modules.
   ========================================================================= */

export type RecordType = 'Lead' | 'Customer';

/* ============================================================================
   Record lifecycle (Enquiry → Lead → Customer) with controlled reverse moves.
   The Lead document is the single master record; `stage` is the authoritative
   lifecycle position. `recordType` stays synced (Customer stage ⇒ Customer,
   otherwise Lead) so existing filters/exports keep working.
   ========================================================================= */

export type LifecycleStage = 'Enquiry' | 'Lead' | 'Customer';

export const STAGE_ORDER: LifecycleStage[] = ['Enquiry', 'Lead', 'Customer'];

export interface TransitionDef {
  to: LifecycleStage;
  label: string;
  direction: 'forward' | 'back';
  /** Reason options for the confirmation dialog ("Other" always requires text). */
  reasons: string[];
}

/** Allowed transitions from each stage (only adjacent forward/back moves). */
export const TRANSITIONS: Record<LifecycleStage, TransitionDef[]> = {
  Enquiry: [
    { to: 'Lead', label: 'Convert to Lead', direction: 'forward', reasons: ['Genuine opportunity', 'Qualified', 'Requested more information', 'Other'] },
  ],
  Lead: [
    { to: 'Customer', label: 'Convert to Customer', direction: 'forward', reasons: ['Deal won', 'Order confirmed', 'Quotation accepted', 'Other'] },
    { to: 'Enquiry', label: 'Move back to Enquiry', direction: 'back', reasons: ['Not yet qualified', 'Wrongly converted', 'Requested product unavailable', 'Requirement postponed', 'Needs further qualification', 'Other'] },
  ],
  Customer: [
    { to: 'Lead', label: 'Move back to Lead', direction: 'back', reasons: ['Deal cancelled', 'Customer inactive', 'Future follow-up required', 'Negotiation restarted', 'Order cancelled', 'Repeat quotation required', 'Wrong conversion', 'Duplicate record', 'Other'] },
  ],
};

export interface ConversionLogEntry {
  _id: string;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  reason: string;
  comments: string;
  admin: string;
  createdAt: string | null;
}

/** Derive the lifecycle stage of a record (fallback for legacy rows). */
export function stageOf(r: { stage?: LifecycleStage; recordType: RecordType }): LifecycleStage {
  if (r.stage) return r.stage;
  return r.recordType === 'Customer' ? 'Customer' : 'Lead';
}

export interface CustomField {
  label: string;
  value: string;
}

export interface Purchase {
  product: string;
  value: string;
  date: string | null;
  notes: string;
}

export interface LeadRecord {
  _id?: string;
  recordType: RecordType;
  stage: LifecycleStage;

  firstName: string;
  lastName: string;
  designation: string;
  organisation: string;
  email: string;
  mobile: string;
  whatsapp: string;
  website: string;
  telephoneDirect: string;
  telephoneOffice: string;
  notes: string;
  listName: string;

  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zip: string;

  gstNumber: string;
  panNumber: string;

  productGroups: string[];
  customerGroup: string;
  dealSize: string; // expected deal value
  leadPotential: string;
  leadStage: string;
  tags: string[];
  customFields: CustomField[];

  interestedProducts: string[];
  requirementDetails: string;
  assignedTo: string;

  purchases: Purchase[];

  nextFollowUpAt: string | null;
  nextFollowUpNote: string;

  convertedAt?: string | null;
  sourceEnquiryId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type ActivityType =
  | 'note' | 'call' | 'email' | 'whatsapp' | 'meeting'
  | 'follow-up' | 'stage-change' | 'created' | 'converted';

export interface ActivityRecord {
  _id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  body: string;
  dueAt: string | null;
  done: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type CrmListKind = 'productGroup' | 'customerGroup' | 'leadStage' | 'leadPotential' | 'tag' | 'salesperson';

export interface CrmListItem {
  _id: string;
  kind: CrmListKind;
  name: string;
  order: number;
  color: string;
  archived: boolean;
}

export type CrmLists = Record<CrmListKind, CrmListItem[]>;

/** An empty CRM lists map — safe default before the API responds. */
export const EMPTY_LISTS: CrmLists = {
  productGroup: [], customerGroup: [], leadStage: [], leadPotential: [], tag: [], salesperson: [],
};

/** A blank lead record for the "add" form. */
export function emptyLead(recordType: RecordType = 'Lead'): LeadRecord {
  return {
    recordType,
    stage: recordType === 'Customer' ? 'Customer' : 'Lead',
    firstName: '', lastName: '', designation: '', organisation: '',
    email: '', mobile: '', whatsapp: '', website: '',
    telephoneDirect: '', telephoneOffice: '', notes: '', listName: '',
    addressLine1: '', addressLine2: '', city: '', state: '', country: '', zip: '',
    gstNumber: '', panNumber: '',
    productGroups: [], customerGroup: '', dealSize: '', leadPotential: '',
    leadStage: '', tags: [], customFields: [],
    interestedProducts: [], requirementDetails: '', assignedTo: '',
    purchases: [],
    nextFollowUpAt: null, nextFollowUpNote: '',
  };
}

/** Find a stage/potential badge colour from the loaded lists (fallback grey). */
export function colorFor(items: CrmListItem[], name: string): string {
  const hit = items.find((i) => i.name === name);
  return hit?.color || '#94a3b8';
}
