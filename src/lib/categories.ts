import Category from '@/models/Category';
import type { Types } from 'mongoose';

/**
 * Resolve a product's category from a selected categoryId.
 * Returns the canonical name (from the Category doc) + the id to store, so
 * `product.category` and `product.categoryId` always stay consistent.
 * Falls back to a provided free-text name (legacy) when no id is given.
 */
export async function resolveCategory(
  categoryId?: string | null,
  fallbackName?: string | null,
): Promise<{ name: string; id: Types.ObjectId | null }> {
  if (categoryId) {
    const cat = await Category.findById(categoryId).select('name').lean() as
      | { _id: Types.ObjectId; name: string } | null;
    if (cat) return { name: cat.name, id: cat._id };
  }
  const name = (fallbackName || '').trim();
  return { name: name || 'N/A', id: null };
}
