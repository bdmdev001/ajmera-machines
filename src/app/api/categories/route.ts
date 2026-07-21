import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category, { slugify } from '@/models/Category';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';
import { isValidUrl } from '@/lib/validation';

/** GET — list all categories (with the number of machines assigned to each). */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const [cats, counts] = await Promise.all([
      Category.find({}).sort({ name: 1 }).lean(),
      Product.aggregate<{ _id: unknown; count: number }>([
        { $match: { categoryId: { $ne: null } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
    ]);

    const countBy: Record<string, number> = {};
    for (const c of counts) if (c._id != null) countBy[String(c._id)] = c.count;

    const list = cats.map((c) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      image: c.image || '',
      productCount: countBy[String(c._id)] || 0,
    }));

    return NextResponse.json({ categories: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load categories';
    console.error('Categories GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function countByJoin(acc: Record<string, number>, c: { _id: unknown; count: number }) {
  if (c._id != null) acc[String(c._id)] = c.count;
}

/** POST — create a new category. */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });

    const slug = slugify(name);
    if (!slug) return NextResponse.json({ error: 'Category name must contain letters or numbers' }, { status: 400 });

    const image = String(body.image || '').trim();
    if (image && !isValidUrl(image)) {
      return NextResponse.json({ error: 'Image URL must be a valid URL' }, { status: 400 });
    }

    const exists = await Category.findOne({ $or: [{ name }, { slug }] }).lean();
    if (exists) return NextResponse.json({ error: `A category named “${name}” already exists` }, { status: 409 });

    const category = await Category.create({
      name,
      slug,
      description: String(body.description || '').trim(),
      image,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    console.error('Categories POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
