import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import { isAdminAuthenticated } from '@/lib/auth';
import { normalizeImages } from '@/lib/images';
import { resolveCategory } from '@/lib/categories';
import { isValidYear, isValidUrl } from '@/lib/validation';
import { readLatestArrivalInput } from '@/lib/latestArrivals';
import { productVideoUrl } from '@/lib/youtube';

/* ---------------------------------------------------------------------------
   ID / Stock-No sequence.

   Both fields are STRINGS, so an indexed `sort({ stockNo: -1 })` orders them
   lexicographically, not numerically — and the collection holds legacy values
   of mixed width ("STK000971" alongside "STK0002010"). Lexicographically
   "STK000971" is the largest, which made the generator restart at 972 and
   collide with an existing row (E11000 on stockNo_1). The maximum is therefore
   computed from the parsed NUMBER in every document; the product collection is
   small (hundreds), and only two tiny fields are read.
   -------------------------------------------------------------------------*/
const STOCK_PAD = 7;
const SEQ_START = 2011; // first number above the scraped data set

const stockNoFor = (n: number) => `STK${String(n).padStart(STOCK_PAD, '0')}`;

/** Highest numeric value across the existing `id` / `stockNo` values, +1 each. */
async function nextSequence(): Promise<{ nextId: number; nextStock: number }> {
  const rows = await Product.find({}, { id: 1, stockNo: 1, _id: 0 }).lean();
  let maxId = SEQ_START - 1;
  let maxStock = SEQ_START - 1;
  for (const r of rows) {
    const idNum = parseInt(String(r.id ?? ''), 10);
    if (!Number.isNaN(idNum) && idNum > maxId) maxId = idNum;
    const stockNum = parseInt(String(r.stockNo ?? '').match(/\d+/)?.[0] ?? '', 10);
    if (!Number.isNaN(stockNum) && stockNum > maxStock) maxStock = stockNum;
  }
  return { nextId: maxId + 1, nextStock: maxStock + 1 };
}

const isDuplicateKey = (e: unknown) => (e as { code?: number })?.code === 11000;

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const {
      title, make, model, categoryId, category, country, myear,
      technicalSpecifications, description, videoUrl, images, isFeatured, stockStatus, badges,
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

    const arrival = readLatestArrivalInput(body);
    if (!arrival.data) {
      return NextResponse.json({ error: arrival.error }, { status: 400 });
    }

    // Resolve the category NAME from the selected id so name + id stay linked.
    const cat = await resolveCategory(categoryId, category);

    // Only structured { url, public_id } entries are persisted (never raw paths).
    const cleanImages = normalizeImages(images);

    const fields = {
      title,
      make: make || 'N/A',
      model: model || 'N/A',
      category: cat.name,
      categoryId: cat.id,
      country: country || 'N/A',
      myear: myear || '',
      technicalSpecifications: technicalSpecifications || '',
      description: typeof description === 'string' ? description.trim() : '',
      // The default channel link is never a product video — see lib/youtube.
      videoUrl: productVideoUrl(videoUrl),
      images: cleanImages,
      isFeatured: Boolean(isFeatured),
      stockStatus: stockStatus === 'Out of Stock' ? 'Out of Stock' : 'In Stock',
      badges: Array.isArray(badges) ? badges.map((b: unknown) => String(b).trim()).filter(Boolean) : [],
      ...arrival.data,
    };

    // Take the next free number, then save. stockNo is unique-indexed, so two
    // admins saving at the same moment can still pick the same one — step to
    // the following number and retry rather than failing the request.
    const { nextId, nextStock } = await nextSequence();
    let newProduct = null;
    let saveError: unknown = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = new Product({ id: String(nextId + attempt), stockNo: stockNoFor(nextStock + attempt), ...fields });
      try {
        await candidate.save();
        newProduct = candidate;
        break;
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
        saveError = err;
      }
    }
    if (!newProduct) {
      console.error('Create Product API Error: stock number collision', saveError);
      return NextResponse.json({ error: 'Could not allocate a stock number — please try again.' }, { status: 409 });
    }

    // The homepage (Featured + Latest Arrivals) and the product list are cached
    // (revalidate = 3600). Invalidate them so a newly-added / featured product
    // surfaces on the next visit instead of waiting out the cache window.
    revalidatePath('/');
    revalidatePath('/pre-owned-machines');

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    console.error('Create Product API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
