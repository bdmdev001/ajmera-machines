import { redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Category from '@/models/Category';
import Product from '@/models/Product';
import AdminNav from '@/components/AdminNav';
import AdminCategoryManager, { type CategoryRow } from '@/components/AdminCategoryManager';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');

  await dbConnect();

  let rows: CategoryRow[] = [];
  try {
    const [cats, counts] = await Promise.all([
      Category.find({}).sort({ name: 1 }).lean(),
      Product.aggregate<{ _id: unknown; count: number }>([
        { $match: { categoryId: { $ne: null } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
    ]);
    const countBy: Record<string, number> = {};
    for (const c of counts) if (c._id != null) countBy[String(c._id)] = c.count;
    rows = cats.map((c) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      productCount: countBy[String(c._id)] || 0,
    }));
  } catch (error) {
    console.error('Failed to query categories:', error);
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <AdminNav />
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Categories</h1>
          <p style={{ fontSize: 14 }}>{rows.length} categor{rows.length === 1 ? 'y' : 'ies'} — add, rename or remove. These populate the category dropdown when adding a machine.</p>
        </div>
        <AdminCategoryManager initialCategories={rows} />
      </div>
    </div>
  );
}
