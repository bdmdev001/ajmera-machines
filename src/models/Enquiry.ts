import mongoose, { Schema, model, models } from 'mongoose';

export interface IEnquiry {
  _id?: string;
  productId?: string; // Can refer to Product
  productTitle?: string;
  stockNo?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
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
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Resolved'],
      default: 'Pending',
      required: true,
    },
  },
  { timestamps: true }
);

export default models.Enquiry || model<IEnquiry>('Enquiry', EnquirySchema);
