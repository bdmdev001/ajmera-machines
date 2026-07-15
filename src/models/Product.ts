import { Schema, model, models, Types } from 'mongoose';
import type { ProductImage } from '@/lib/images';

export interface IProduct {
  _id?: string;
  id: string; // Original ID from scraping
  stockNo: string;
  title: string;
  make: string;
  model: string;
  /** Denormalized category name — kept in sync when the category is renamed.
   *  Retained so all existing name-based filters/display/search keep working. */
  category: string;
  /** Stable reference to the Category document (survives category renames). */
  categoryId?: Types.ObjectId | string;
  country: string;
  myear: string;
  videoUrl?: string;
  technicalSpecifications?: string;
  /** Structured Cloudinary references: { url: secure_url, public_id }. */
  images: ProductImage[];
  createdAt?: Date;
  updatedAt?: Date;
}

/* Each image is a structured object so the public_id always travels with its
   url — no parallel arrays to fall out of sync, and public_id is available for
   deletion/replacement. _id:false keeps subdocs lean. */
const ProductImageSchema = new Schema<ProductImage>(
  {
    url: { type: String, required: true },
    public_id: { type: String, default: '' },
  },
  { _id: false },
);

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true },
    stockNo: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    make: { type: String, default: 'N/A' },
    model: { type: String, default: 'N/A' },
    category: { type: String, default: 'N/A', index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    country: { type: String, default: 'N/A' },
    myear: { type: String },
    videoUrl: { type: String },
    technicalSpecifications: { type: String },
    images: { type: [ProductImageSchema], default: [] },
  },
  { timestamps: true }
);

// Fallback to avoid error on Next.js hot-reload compile
export default models.Product || model<IProduct>('Product', ProductSchema);
