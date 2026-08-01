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
  /* ---- Latest Arrivals (admin-curated, never derived from createdAt) ------ */
  /** Master switch: the product is a candidate for the homepage section. */
  isLatestArrival?: boolean;
  /** Manual sort order within the section, ascending (ties break on updatedAt). */
  latestArrivalPriority?: number;
  /** Optional schedule. Empty `from` ⇒ visible immediately; empty `until` ⇒
   *  visible indefinitely. Passing `until` drops it from the section without
   *  touching the listing itself. */
  latestArrivalFrom?: Date | null;
  latestArrivalUntil?: Date | null;
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
    isLatestArrival: { type: Boolean, default: false, index: true },
    latestArrivalPriority: { type: Number, default: 0 },
    latestArrivalFrom: { type: Date, default: null },
    latestArrivalUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

/* Serves the homepage query end-to-end: match on the flag, then walk the index
   in the exact display order (priority ascending, newest-updated first). */
ProductSchema.index({ isLatestArrival: 1, latestArrivalPriority: 1, updatedAt: -1 });

// Fallback to avoid error on Next.js hot-reload compile
export default models.Product || model<IProduct>('Product', ProductSchema);
