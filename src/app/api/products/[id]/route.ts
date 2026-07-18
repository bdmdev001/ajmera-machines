import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';
import { deleteImages } from '@/lib/cloudinary';
import { normalizeImages, type ImageRef } from '@/lib/images';
import { resolveCategory } from '@/lib/categories';

/** Read a product's stored images WITHOUT hydration (legacy docs may still hold
 *  bare strings, which would CastError against the structured subdoc schema). */
async function readExistingImages(id: string): Promise<ImageRef[]> {
  const doc = (await Product.findOne({ id }).select('images').lean()) as { images?: ImageRef[] } | null;
  return Array.isArray(doc?.images) ? doc!.images : [];
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const {
      title, make, model, categoryId, category, country, myear,
      technicalSpecifications, videoUrl, images, isLatestArrival,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const cat = await resolveCategory(categoryId, category);
    const nextImages = normalizeImages(images);
    const nextPublicIds = new Set(nextImages.map((im) => im.public_id).filter(Boolean));

    // Snapshot the old public_ids so we can delete the ones dropped in this edit.
    const oldImages = normalizeImages(await readExistingImages(id));

    const updatedProduct = await Product.findOneAndUpdate(
      { id },
      {
        title,
        make: make || 'N/A',
        model: model || 'N/A',
        category: cat.name,
        categoryId: cat.id,
        country: country || 'N/A',
        myear: myear || '',
        technicalSpecifications: technicalSpecifications || '',
        videoUrl: videoUrl || '',
        images: nextImages,
        isLatestArrival: Boolean(isLatestArrival),
      },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Remove Cloudinary assets that are no longer referenced (never blocks the save).
    const removed = oldImages
      .map((im) => im.public_id)
      .filter((pid) => pid && !nextPublicIds.has(pid));
    await deleteImages(removed);

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update machine';
    console.error('Update Product API Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    // Read images (lean) BEFORE deleting so we can clean up Cloudinary.
    const oldImages = normalizeImages(await readExistingImages(id));
    const deleted = await Product.deleteOne({ id });

    if (deleted.deletedCount === 0) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    await deleteImages(oldImages.map((im) => im.public_id));

    return NextResponse.json({ success: true, message: 'Machine deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete machine';
    console.error('Delete Product API Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
