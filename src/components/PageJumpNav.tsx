'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PageJump from '@/components/PageJump';

/* ============================================================================
   URL-driven "Go to page" — the counterpart to <PageJump/> for the paginated
   pages whose state lives in the query string (the public /products listing and
   /search) rather than in React state.

   Validation, markup and styling all come from <PageJump/>; this only turns the
   chosen page into a navigation. The current query string is read live and
   copied wholesale, so every active parameter — keyword, category, make,
   country, year, size, capacity, spec, sort — survives the jump without this
   component needing to know any of them. `page=1` is dropped so the first page
   keeps its clean canonical URL, matching the existing pagination links.
   ========================================================================= */

export default function PageJumpNav({ totalPages }: { totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const go = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    const qs = next.toString();
    startTransition(() => router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: true }));
  };

  return <PageJump totalPages={totalPages} onGo={go} disabled={pending} />;
}
