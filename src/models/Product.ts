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
  /** Professional, marketplace-ready description. When empty, the product page
   *  falls back to a live-generated one (same generator), so display stays
   *  consistent. Populated in bulk by scripts/update-products-from-csv.mjs. */
  description?: string;
  /** Structured Cloudinary references: { url: secure_url, public_id }. */
  images: ProductImage[];
  /** Admin-controlled flag: surfaces the product in the homepage "Featured" section. */
  isFeatured?: boolean;
  /** Admin-controlled stock availability, shown across cards & the detail page. */
  stockStatus?: 'In Stock' | 'Out of Stock';
  /** Admin-managed free-form badge labels (e.g. "Sold", "Rare Machine"). */
  badges?: string[];
  /** @deprecated Latest Arrivals is now derived automatically from `createdAt`
   *  (newest first). Retained only so historic documents don't error; nothing
   *  in the app reads it any more. */
  isLatestArrival?: boolean;
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
    description: { type: String },
    images: { type: [ProductImageSchema], default: [] },
    isFeatured: { type: Boolean, default: false, index: true },
    stockStatus: { type: String, enum: ['In Stock', 'Out of Stock'], default: 'In Stock', index: true },
    badges: { type: [String], default: [] },
    // Deprecated (kept for back-compat with existing docs; no longer read).
    isLatestArrival: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fallback to avoid error on Next.js hot-reload compile
export default models.Product || model<IProduct>('Product', ProductSchema);
