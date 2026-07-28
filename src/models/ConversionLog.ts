import { Schema, model, models, type Types } from 'mongoose';

/* ============================================================================
   Immutable lifecycle audit trail.

   One document per stage transition of a CRM master record (Lead document).
   These are WRITE-ONCE: there is deliberately no update or delete API, so the
   conversion history / audit trail can never be edited or removed. Every
   forward and backward move (Enquiry↔Lead↔Customer) is recorded here with the
   reason, optional comments, and the acting admin.
   ========================================================================= */

export const LIFECYCLE_STAGES = ['Enquiry', 'Lead', 'Customer'] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export interface IConversionLog {
  _id?: string;
  leadId: Types.ObjectId | string;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  reason: string;
  comments?: string;
  /** Acting administrator (single-admin panel ⇒ 'Admin'). */
  admin: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ConversionLogSchema = new Schema<IConversionLog>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    fromStage: { type: String, enum: LIFECYCLE_STAGES, required: true },
    toStage: { type: String, enum: LIFECYCLE_STAGES, required: true },
    reason: { type: String, required: true, trim: true },
    comments: { type: String, trim: true, default: '' },
    admin: { type: String, trim: true, default: 'Admin' },
  },
  { timestamps: true },
);

ConversionLogSchema.index({ leadId: 1, createdAt: 1 });

export default models.ConversionLog || model<IConversionLog>('ConversionLog', ConversionLogSchema);
