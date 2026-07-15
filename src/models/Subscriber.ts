import { Schema, model, models } from 'mongoose';

export interface ISubscriber {
  _id?: string;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribedAt?: Date;
  updatedAt?: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
  },
  // `subscribedAt` is the creation timestamp.
  { timestamps: { createdAt: 'subscribedAt', updatedAt: 'updatedAt' } }
);

// Index for the default admin sort (newest subscriber first). `email` is
// already indexed via the unique constraint above.
SubscriberSchema.index({ subscribedAt: -1 });

// Fallback to avoid model overwrite errors on Next.js hot-reload.
export default models.Subscriber || model<ISubscriber>('Subscriber', SubscriberSchema);
