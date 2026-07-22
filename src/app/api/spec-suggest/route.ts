import { NextResponse } from 'next/server';
import { getSpecSuggestions } from '@/lib/products';

/**
 * GET /api/spec-suggest?category=<name>&q=<typed text>
 * Specification-based autocomplete for the "Find your machine" finder. Returns
 * real { label, value, category, count } pairs mined from actual product specs.
 * Category is OPTIONAL — omit it to search across every category. An empty query
 * yields nothing.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || '').trim();
    const q = (searchParams.get('q') || '').trim();

    if (!q) return NextResponse.json({ suggestions: [] });

    const suggestions = await getSpecSuggestions(category, q, 8);
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load suggestions';
    console.error('spec-suggest GET error:', message);
    return NextResponse.json({ suggestions: [], error: message }, { status: 500 });
  }
}
