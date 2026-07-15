import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category, { slugify } from '@/models/Category';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';

/** PATCH — update a category. Renaming cascades the new name onto every product
 *  linked by categoryId, so the denormalized `category` string stays in sync. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const name = body.name !== undefined ? String(body.name).trim() : category.name;
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    const slug = slugify(name);
    if (!slug) return NextResponse.json({ error: 'Category name must contain letters or numbers' }, { status: 400 });

    // Uniqueness check excluding this document.
    const clash = await Category.findOne({ _id: { $ne: id }, $or: [{ name }, { slug }] }).lean();
    if (clash) return NextResponse.json({ error: `A category named “${name}” already exists` }, { status: 409 });

    const nameChanged = name !== category.name;
    category.name = name;
    category.slug = slug;
    if (body.description !== undefined) category.description = String(body.description).trim();
    if (body.image !== undefined) category.image = String(body.image).trim();
    await category.save();

    // Keep the denormalized product.category name in sync on rename.
    if (nameChanged) {
      await Product.updateMany({ categoryId: category._id }, { $set: { category: name } });
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    console.error('Category PATCH error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — blocked while any machine is still assigned to the category. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const { id } = await params;

    const inUse = await Product.countDocuments({ categoryId: id });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${inUse} machine${inUse === 1 ? ' is' : 's are'} still assigned to this category. Reassign them first.` },
        { status: 409 },
      );
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    console.error('Category DELETE error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
