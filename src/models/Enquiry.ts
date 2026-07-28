import { Schema, model, models } from 'mongoose';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '@/types/enquiry';

/* ============================================================================
   Website / WhatsApp / contact-form ENQUIRY — the first stage of the CRM
   pipeline (Enquiry → Lead → Customer). An enquiry holds the original incoming
   requirement. Admins qualify it and, once it is a genuine opportunity, convert
   it into a Lead (never automatically). The enquiry is preserved after
   conversion (linked via `leadId`) so the full customer journey stays traceable.
   ========================================================================= */

// Re-exported so existing server imports (`from '@/models/Enquiry'`) keep working.
export { ENQUIRY_STATUSES, normalizeEnquiryStatus } from '@/types/enquiry';
export type { EnquiryStatus } from '@/types/enquiry';

export interface IEnquiry {
  _id?: string;
  productId?: string; // Can refer to Product
  productTitle?: string;
  stockNo?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  companyAddress?: string;
  gstNumber?: string;
  panNumber?: string;
  message: string;
  status: EnquiryStatus;
  /** Admin notes added while qualifying the enquiry. */
  notes?: string;
  /** Optional follow-up reminder for the enquiry stage. */
  nextFollowUpAt?: Date | null;
  followUpNote?: string;
  /** Set when this enquiry has been converted into a Lead (pipeline stage 2). */
  leadId?: string;
  /** Legacy link retained for older records converted straight to a customer. */
  customerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const EnquirySchema = new Schema<IEnquiry>(
  {
    productId: { type: String },
    productTitle: { type: String },
    stockNo: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String },
    companyAddress: { type: String },
    gstNumber: { type: String },
    panNumber: { type: String },
    message: { type: String, required: true },
    notes: { type: String, default: '' },
    nextFollowUpAt: { type: Date, default: null },
    followUpNote: { type: String, default: '' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    status: {
      // `Pending/Reviewed/Resolved` retained in the enum so legacy documents
      // still validate on save; the UI and API normalize them to the new set.
      type: String,
      enum: [...ENQUIRY_STATUSES, 'Pending', 'Reviewed', 'Resolved'],
      default: 'New',
      required: true,
    },
  },
  { timestamps: true }
);

export default models.Enquiry || model<IEnquiry>('Enquiry', EnquirySchema);
