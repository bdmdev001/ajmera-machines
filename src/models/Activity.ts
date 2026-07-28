import { Schema, model, models, type Types } from 'mongoose';

/* ============================================================================
   Lead/Customer activity + follow-up log.

   One document per interaction (note, call, email, follow-up, stage change,
   conversion…), rendered as the chronological timeline on a record's detail
   page. Scheduled follow-ups carry a `dueAt` and can be marked `done`.
   ========================================================================= */

export const ACTIVITY_TYPES = [
  'note', 'call', 'email', 'whatsapp', 'meeting',
  'follow-up', 'stage-change', 'created', 'converted',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface IActivity {
  _id?: string;
  leadId: Types.ObjectId | string;
  type: ActivityType;
  title?: string;
  body?: string;
  /** For scheduled follow-ups: when it is due. */
  dueAt?: Date | null;
  /** For scheduled follow-ups: whether it has been completed. */
  done?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    type: { type: String, enum: ACTIVITY_TYPES, default: 'note', required: true },
    title: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },
    dueAt: { type: Date, default: null },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ActivitySchema.index({ leadId: 1, createdAt: -1 });

export default models.Activity || model<IActivity>('Activity', ActivitySchema);
