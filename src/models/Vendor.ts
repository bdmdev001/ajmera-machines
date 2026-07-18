import { Schema, model, models } from 'mongoose';

/* Unified Vendor / Supplier entity. The business had no prior vendor concept, so
   a single model (rather than two near-identical ones) covers both roles and
   avoids duplicated data. */

export interface IVendor {
  _id?: string;
  companyName: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    companyName: { type: String, required: true, trim: true },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
  },
  { timestamps: true }
);

export default models.Vendor || model<IVendor>('Vendor', VendorSchema);
