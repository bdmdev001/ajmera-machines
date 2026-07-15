import { Schema, model, models } from 'mongoose';

export interface ICategory {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Turn a category name into a URL-safe slug ("Grinder Surface" -> "grinder-surface"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

// Fallback to avoid model overwrite errors on Next.js hot-reload.
export default models.Category || model<ICategory>('Category', CategorySchema);
