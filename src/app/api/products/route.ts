import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';
import { normalizeImages } from '@/lib/images';
import { resolveCategory } from '@/lib/categories';
import { isValidYear, isValidUrl } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const {
      title, make, model, categoryId, category, country, myear,
      technicalSpecifications, videoUrl, images, isFeatured, stockStatus, badges,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }
    if (myear && !isValidYear(String(myear))) {
      return NextResponse.json({ error: 'Manufacturing year must be a valid 4-digit year.' }, { status: 400 });
    }
    if (videoUrl && !isValidUrl(String(videoUrl))) {
      return NextResponse.json({ error: 'YouTube video link must be a valid URL.' }, { status: 400 });
    }

    // Resolve the category NAME from the selected id so name + id stay linked.
    const cat = await resolveCategory(categoryId, category);

    // Only structured { url, public_id } entries are persisted (never raw paths).
    const cleanImages = normalizeImages(images);

    // Auto-generate ID and Stock No
    // 1. Get max id
    const highestIdProduct = await Product.findOne({}).sort({ id: -1 }).select('id').lean();
    let nextIdInt = 2011; // default starting above scraped max
    if (highestIdProduct && highestIdProduct.id) {
      const parsed = parseInt(highestIdProduct.id, 10);
      if (!isNaN(parsed)) {
        nextIdInt = parsed + 1;
      }
    }
    const nextId = nextIdInt.toString();

    // 2. Get max stock number (e.g., STK0002010)
    const highestStockProduct = await Product.findOne({ stockNo: /^STK/ }).sort({ stockNo: -1 }).select('stockNo').lean();
    let nextStockInt = 2011;
    if (highestStockProduct && highestStockProduct.stockNo) {
      const match = highestStockProduct.stockNo.match(/\d+/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        if (!isNaN(parsed)) {
          nextStockInt = parsed + 1;
        }
      }
    }
    const nextStockNo = `STK${String(nextStockInt).padStart(7, '0')}`;

    const newProduct = new Product({
      id: nextId,
      stockNo: nextStockNo,
      title,
      make: make || 'N/A',
      model: model || 'N/A',
      category: cat.name,
      categoryId: cat.id,
      country: country || 'N/A',
      myear: myear || '',
      technicalSpecifications: technicalSpecifications || '',
      videoUrl: videoUrl || '',
      images: cleanImages,
      isFeatured: Boolean(isFeatured),
      stockStatus: stockStatus === 'Out of Stock' ? 'Out of Stock' : 'In Stock',
      badges: Array.isArray(badges) ? badges.map((b: unknown) => String(b).trim()).filter(Boolean) : [],
    });

    await newProduct.save();

    // The homepage (Featured + Latest Arrivals) and the product list are cached
    // (revalidate = 3600). Invalidate them so a newly-added / featured product
    // surfaces on the next visit instead of waiting out the cache window.
    revalidatePath('/');
    revalidatePath('/products');

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    console.error('Create Product API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
