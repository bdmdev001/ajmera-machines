import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';
import { deleteImages } from '@/lib/cloudinary';
import { normalizeImages, type ImageRef } from '@/lib/images';
import { resolveCategory } from '@/lib/categories';
import { isValidYear, isValidUrl } from '@/lib/validation';

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
      technicalSpecifications, description, videoUrl, images, isFeatured, stockStatus, badges,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (myear && !isValidYear(String(myear))) {
      return NextResponse.json({ error: 'Manufacturing year must be a valid 4-digit year.' }, { status: 400 });
    }
    if (videoUrl && !isValidUrl(String(videoUrl))) {
      return NextResponse.json({ error: 'YouTube video link must be a valid URL.' }, { status: 400 });
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
        isFeatured: Boolean(isFeatured),
        stockStatus: stockStatus === 'Out of Stock' ? 'Out of Stock' : 'In Stock',
        badges: Array.isArray(badges) ? badges.map((b: unknown) => String(b).trim()).filter(Boolean) : [],
        // Only touch the description when the edit actually sends one, so it is
        // preserved intact when other fields are updated by any partial caller.
        ...(typeof description === 'string' ? { description: description.trim() } : {}),
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

    // Cached homepage (Featured + Latest Arrivals) + product list must reflect
    // this edit — e.g. toggling isFeatured — on the next visit, not an hour later.
    revalidatePath('/');
    revalidatePath('/products');

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

    // Drop the deleted machine from the cached homepage + product list.
    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json({ success: true, message: 'Machine deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete machine';
    console.error('Delete Product API Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
