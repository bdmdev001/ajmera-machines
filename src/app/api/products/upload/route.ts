import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { uploadImageBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';

/* Uploads a single image to Cloudinary and returns ONLY what we persist:
   the secure_url and the public_id. Nothing is written to local disk. */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { error: 'Image hosting is not configured. Set CLOUDINARY_* variables in .env.' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image exceeds the 10 MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await uploadImageBuffer(buffer);

    // Return the exact { url, public_id } object that gets stored on the product.
    return NextResponse.json({ success: true, image });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'File upload failed';
    console.error('Cloudinary upload error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
