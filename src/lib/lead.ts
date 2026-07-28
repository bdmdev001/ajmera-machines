/* ============================================================================
   Shared Lead/Customer helpers used by every CRM API route (create, update,
   convert, enquiry-convert) so validation and JSON serialization stay in one
   place. Server-only usage, but dependency-free (safe to import anywhere).
   ========================================================================= */

import { isValidEmail, isValidPhone, isValidGST, isValidPAN, isValidUrl } from '@/lib/validation';
import type { ILead, ICustomField, IPurchase } from '@/models/Lead';

export type LeadInput = Omit<ILead, '_id' | 'createdAt' | 'updatedAt'>;

function str(v: unknown): string {
  return String(v ?? '').trim();
}

/** Coerce an incoming string[] (or single value) into a clean, deduped array. */
function strArray(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : v == null ? [] : [v];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    const s = str(item);
    if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
  }
  return out;
}

function customFields(v: unknown): ICustomField[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => ({ label: str((c as ICustomField)?.label), value: str((c as ICustomField)?.value) }))
    .filter((c) => c.label || c.value);
}

function purchases(v: unknown): IPurchase[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((p) => {
      const row = p as { product?: unknown; value?: unknown; date?: unknown; notes?: unknown };
      return { product: str(row.product), value: str(row.value), date: parseDate(row.date), notes: str(row.notes) };
    })
    .filter((p) => p.product || p.value || p.notes);
}

function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Validate + normalize a create/update body. Returns `{ data }` (ready for
 * Mongoose) or `{ error }`. Required: firstName, email, mobile. Optional fields
 * validate their FORMAT only when present, mirroring the shared client rules.
 */
export function validateLead(body: unknown): { data?: Partial<LeadInput>; error?: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const firstName = str(b.firstName);
  const email = str(b.email).toLowerCase();
  const mobile = str(b.mobile);

  if (!firstName) return { error: 'First name is required.' };
  if (!email) return { error: 'Email is required.' };
  if (!isValidEmail(email)) return { error: 'Please provide a valid email address.' };
  if (!mobile) return { error: 'Mobile number is required.' };
  if (!isValidPhone(mobile)) return { error: 'Please provide a valid mobile number.' };

  const whatsapp = str(b.whatsapp);
  if (whatsapp && !isValidPhone(whatsapp)) return { error: 'Please provide a valid WhatsApp number.' };
  const website = str(b.website);
  if (website && !isValidUrl(website)) return { error: 'Website must start with http:// or https://.' };
  const gstNumber = str(b.gstNumber);
  if (gstNumber && !isValidGST(gstNumber)) return { error: 'Please provide a valid 15-character GST number.' };
  const panNumber = str(b.panNumber);
  if (panNumber && !isValidPAN(panNumber)) return { error: 'Please provide a valid 10-character PAN.' };

  const recordType = b.recordType === 'Customer' ? 'Customer' : 'Lead';
  // Lifecycle stage is preserved from the record; a form edit never changes it
  // (transitions do). Falls back to a stage consistent with recordType.
  const stage = (['Enquiry', 'Lead', 'Customer'] as const).includes(b.stage as never)
    ? (b.stage as 'Enquiry' | 'Lead' | 'Customer')
    : (recordType === 'Customer' ? 'Customer' : 'Lead');

  const data: Partial<LeadInput> = {
    recordType,
    stage,
    firstName,
    lastName: str(b.lastName),
    designation: str(b.designation),
    organisation: str(b.organisation),
    email,
    mobile,
    whatsapp,
    website,
    telephoneDirect: str(b.telephoneDirect),
    telephoneOffice: str(b.telephoneOffice),
    notes: str(b.notes),
    listName: str(b.listName),

    addressLine1: str(b.addressLine1),
    addressLine2: str(b.addressLine2),
    city: str(b.city),
    state: str(b.state),
    country: str(b.country),
    zip: str(b.zip),

    gstNumber: gstNumber.toUpperCase(),
    panNumber: panNumber.toUpperCase(),

    productGroups: strArray(b.productGroups),
    customerGroup: str(b.customerGroup),
    dealSize: str(b.dealSize),
    leadPotential: str(b.leadPotential),
    leadStage: str(b.leadStage),
    tags: strArray(b.tags),
    customFields: customFields(b.customFields),

    interestedProducts: strArray(b.interestedProducts),
    requirementDetails: str(b.requirementDetails),
    assignedTo: str(b.assignedTo),

    purchases: purchases(b.purchases),

    nextFollowUpAt: parseDate(b.nextFollowUpAt),
    nextFollowUpNote: str(b.nextFollowUpNote),
  };

  return { data };
}

/** Map a lean Lead document to a plain, JSON-safe object for the client. */
export function serializeLead(d: Record<string, unknown>) {
  const asIso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  const recordType = (d.recordType as string) || 'Lead';
  return {
    _id: String(d._id),
    recordType,
    stage: (d.stage as string) || (recordType === 'Customer' ? 'Customer' : 'Lead'),
    firstName: (d.firstName as string) || '',
    lastName: (d.lastName as string) || '',
    designation: (d.designation as string) || '',
    organisation: (d.organisation as string) || '',
    email: (d.email as string) || '',
    mobile: (d.mobile as string) || '',
    whatsapp: (d.whatsapp as string) || '',
    website: (d.website as string) || '',
    telephoneDirect: (d.telephoneDirect as string) || '',
    telephoneOffice: (d.telephoneOffice as string) || '',
    notes: (d.notes as string) || '',
    listName: (d.listName as string) || '',
    addressLine1: (d.addressLine1 as string) || '',
    addressLine2: (d.addressLine2 as string) || '',
    city: (d.city as string) || '',
    state: (d.state as string) || '',
    country: (d.country as string) || '',
    zip: (d.zip as string) || '',
    gstNumber: (d.gstNumber as string) || '',
    panNumber: (d.panNumber as string) || '',
    productGroups: Array.isArray(d.productGroups) ? (d.productGroups as string[]) : [],
    customerGroup: (d.customerGroup as string) || '',
    dealSize: (d.dealSize as string) || '',
    leadPotential: (d.leadPotential as string) || '',
    leadStage: (d.leadStage as string) || '',
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    customFields: Array.isArray(d.customFields) ? (d.customFields as ICustomField[]) : [],
    interestedProducts: Array.isArray(d.interestedProducts) ? (d.interestedProducts as string[]) : [],
    requirementDetails: (d.requirementDetails as string) || '',
    assignedTo: (d.assignedTo as string) || '',
    purchases: Array.isArray(d.purchases)
      ? (d.purchases as IPurchase[]).map((p) => ({ product: p.product || '', value: p.value || '', date: p.date ? new Date(p.date as Date).toISOString() : null, notes: p.notes || '' }))
      : [],
    nextFollowUpAt: asIso(d.nextFollowUpAt),
    nextFollowUpNote: (d.nextFollowUpNote as string) || '',
    convertedAt: asIso(d.convertedAt),
    sourceEnquiryId: d.sourceEnquiryId ? String(d.sourceEnquiryId) : '',
    createdAt: asIso(d.createdAt),
    updatedAt: asIso(d.updatedAt),
  };
}

export type SerializedLead = ReturnType<typeof serializeLead>;

/** Map a lean Activity document to a plain, JSON-safe object for the timeline. */
export function serializeActivity(d: Record<string, unknown>) {
  const asIso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  return {
    _id: String(d._id),
    leadId: String(d.leadId),
    type: (d.type as string) || 'note',
    title: (d.title as string) || '',
    body: (d.body as string) || '',
    dueAt: asIso(d.dueAt),
    done: Boolean(d.done),
    createdAt: asIso(d.createdAt),
    updatedAt: asIso(d.updatedAt),
  };
}

export type SerializedActivity = ReturnType<typeof serializeActivity>;

/** Map a lean ConversionLog document to a plain, JSON-safe audit entry. */
export function serializeConversionLog(d: Record<string, unknown>) {
  return {
    _id: String(d._id),
    fromStage: (d.fromStage as string) || '',
    toStage: (d.toStage as string) || '',
    reason: (d.reason as string) || '',
    comments: (d.comments as string) || '',
    admin: (d.admin as string) || 'Admin',
    createdAt: d.createdAt ? new Date(d.createdAt as string).toISOString() : null,
  };
}
