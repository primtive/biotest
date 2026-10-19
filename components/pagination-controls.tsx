'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAGE_SIZES } from '@/lib/pagination';
export type PaginationProps = { page: number; pageSize: number; total: number; totalPages: number; loading?: boolean };
export function PaginationControls({ page, pageSize, total, totalPages, loading = false }: PaginationProps) {
  const router = useRouter(), params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [destination, setDestination] = useState<string | null>(null);
  const busy = loading || pending;
  function navigate(next: number, size = pageSize) {
    const query = new URLSearchParams(params.toString());
    query.set('page', String(Math.max(1, Math.min(totalPages, next)))); query.set('pageSize', String(size));
    startTransition(() => router.push(`?${query}`, { scroll: false }));
    setDestination(null);
  }
  const first = total ? (page - 1) * pageSize + 1 : 0;
  return <nav aria-label="Выбор страницы" aria-busy={busy} className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
    <span className="text-sm text-muted-foreground">{first}–{Math.min(page * pageSize, total)} из {total}</span>
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm">По <select aria-label="Записей на странице" className="h-9 rounded-md border bg-background px-2" value={pageSize} disabled={busy} onChange={e => navigate(1, Number(e.target.value))}>{PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <Button variant="outline" size="icon" aria-label="Первая страница" disabled={busy || page <= 1} onClick={() => navigate(1)}><ChevronsLeft className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" aria-label="Предыдущая страница" disabled={busy || page <= 1} onClick={() => navigate(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); const next = Number(destination || page); if (Number.isInteger(next)) navigate(next); }}>
        <input aria-label="Номер страницы" type="number" min={1} max={totalPages} value={destination ?? String(page)} onChange={e => setDestination(e.target.value)} disabled={busy} className="h-9 w-16 rounded-md border bg-background px-2 text-center" />
        <span className="whitespace-nowrap text-sm">из {totalPages}</span><Button variant="outline" size="sm" disabled={busy} type="submit">Перейти</Button>
      </form>
      <Button variant="outline" size="icon" aria-label="Следующая страница" disabled={busy || page >= totalPages} onClick={() => navigate(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" aria-label="Последняя страница" disabled={busy || page >= totalPages} onClick={() => navigate(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
    </div>
  </nav>;
}
