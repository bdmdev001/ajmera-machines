import { redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import Category from '@/models/Category';
import AdminInventoryManager, { type CategoryOption } from '@/components/AdminInventoryManager';
import { isAdminAuthenticated } from '@/lib/auth';
import { normalizeImages } from '@/lib/images';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  // Session check
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }

  await dbConnect();

  // Query all products for managing
  let products: any[] = [];
  let categories: CategoryOption[] = [];
  try {
    products = await Product.find({}).sort({ createdAt: -1 }).lean();
    const cats = await Category.find({}).sort({ name: 1 }).select('name').lean();
    categories = cats.map((c) => ({ _id: String(c._id), name: c.name }));
  } catch (error) {
    console.error("Failed to query inventory:", error);
  }

  // Serialize Mongoose docs for client component
  const serializedProducts = products.map((p) => {
    return {
      id: p.id,
      stockNo: p.stockNo,
      title: p.title,
      make: p.make,
      model: p.model,
      category: p.category,
      country: p.country,
      myear: p.myear || '',
      videoUrl: p.videoUrl || '',
      technicalSpecifications: p.technicalSpecifications || '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      images: normalizeImages(p.images),
      isFeatured: Boolean(p.isFeatured),
      stockStatus: (p.stockStatus === 'Out of Stock' ? 'Out of Stock' : 'In Stock') as 'In Stock' | 'Out of Stock',
      badges: Array.isArray(p.badges) ? p.badges.filter((b: unknown) => typeof b === 'string' && b.trim()) : [],
    };
  });

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="container">
        <div style={{ marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 4 }}>Inventory</h1>
          <p style={{ fontSize: 14 }}>{serializedProducts.length} machine{serializedProducts.length === 1 ? '' : 's'} in your catalogue — add, edit or remove listings.</p>
        </div>

        <AdminInventoryManager initialProducts={serializedProducts} categories={categories} />
      </div>
    </div>
  );
}
