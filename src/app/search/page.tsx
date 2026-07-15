import Link from 'next/link';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';


export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  await dbConnect();
  const params = await searchParams;
  const q = (params.q || '').trim();
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const limit = 12;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { make: { $regex: q, $options: 'i' } },
      { model: { $regex: q, $options: 'i' } },
      { stockNo: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ];
  }

  const productsPromise = Product.find(query)
    .sort({ stockNo: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const countPromise = Product.countDocuments(query);

  const [products, total] = await Promise.all([productsPromise, countPromise]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ padding: '60px 0', minHeight: '80vh' }}>
      <div className="container">
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
            Search
          </h1>
          <p style={{ fontSize: '15px' }}>
            Results for{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{q || '—'}</span>
          </p>
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Total results: {total}
          </div>
        </div>

        {!q ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Type at least 2 characters</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Use the search bar in the header to find machines and categories.</p>
            <Link href="/products" className="btn btn-secondary" style={{ marginTop: 18 }}>
              Browse Stocklist
            </Link>
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'rgba(251, 133, 0, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: 16,
                fontWeight: 900,
              }}
            >
              !
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No results found</h3>
            <p style={{ maxWidth: 520, fontSize: 14, marginBottom: 18, color: 'var(--text-secondary)' }}>
              Try a different keyword (e.g., a brand, category, or model).
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['lathe', 'grinder', 'cnc', 'okamoto'].map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  style={{
                    textDecoration: 'none',
                    color: 'var(--secondary)',
                    fontWeight: 900,
                    background: 'rgba(33,158,188,0.10)',
                    border: '1px solid rgba(33,158,188,0.18)',
                    padding: '8px 12px',
                    borderRadius: 999,
                  }}
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {products.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      padding: 18,
                      transition: 'transform 200ms ease, box-shadow 200ms ease',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {p.category}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 900, marginTop: 8, marginBottom: 6, lineHeight: 1.25 }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 900, color: 'var(--secondary)' }}>{p.make}</span>
                      {p.model ? ` · ${p.model}` : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map((p) => (
                <Link
                  key={p}
                  href={`/search?q=${encodeURIComponent(q)}&page=${p}`}
                  style={{
                    textDecoration: 'none',
                    fontWeight: 900,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border-light)',
                    color: p === page ? 'var(--accent)' : 'var(--text-secondary)',
                    background: p === page ? 'rgba(255,183,3,0.18)' : '#fff',
                  }}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

