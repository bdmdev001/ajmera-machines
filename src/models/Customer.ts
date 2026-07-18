import { Schema, model, models } from 'mongoose';

export interface ICustomer {
  _id?: string;
  // Company details
  companyName: string;
  gstNumber?: string;
  panNumber?: string;
  companyAddress?: string;
  // Contact person
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    companyName: { type: String, required: true, trim: true },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    companyAddress: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
  },
  { timestamps: true }
);

// Fallback avoids the "OverwriteModelError" on Next.js hot-reload.
export default models.Customer || model<ICustomer>('Customer', CustomerSchema);
