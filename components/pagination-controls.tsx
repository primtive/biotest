'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_SIZES } from '@/lib/pagination';
export type PaginationProps = { page: number; pageSize: number; total: number; totalPages: number; loading?: boolean };
export function PaginationControls({ page, pageSize, total, totalPages, loading = false }: PaginationProps) {
  const router = useRouter(), params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [destination, setDestination] = useState<string | null>(null);
  const busy = loading || pending;
  function navigate(next: number, size = pageSize) {
    const target = Math.max(1, Math.min(totalPages, next));
    setDestination(null);
    if (target === page && size === pageSize) return;
    const query = new URLSearchParams(params.toString());
    query.set('page', String(target)); query.set('pageSize', String(size));
    startTransition(() => router.push(`?${query}`, { scroll: false }));
  }
  function commit() {
    const next = Number(destination || page);
    if (Number.isInteger(next)) navigate(next); else setDestination(null);
  }
  const first = total ? (page - 1) * pageSize + 1 : 0;
  return <nav aria-label="Выбор страницы" aria-busy={busy} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
    <span className="text-muted-foreground tabular-nums">{first}–{Math.min(page * pageSize, total)} / {total}</span>
    <div className="flex items-center gap-1.5">
      <select aria-label="Записей на странице" title="Записей на странице" className="h-8 rounded-md border bg-background px-2 text-xs" value={pageSize} disabled={busy} onChange={e => navigate(1, Number(e.target.value))}>{PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}</select>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Предыдущая страница" disabled={busy || page <= 1} onClick={() => navigate(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      <input aria-label="Номер страницы" title="Номер страницы" type="number" min={1} max={totalPages} value={destination ?? String(page)} onChange={e => setDestination(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} disabled={busy} className="h-8 w-12 rounded-md border bg-background px-1 text-center tabular-nums" />
      <span className="text-muted-foreground tabular-nums">/ {totalPages}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Следующая страница" disabled={busy || page >= totalPages} onClick={() => navigate(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  </nav>;
}
