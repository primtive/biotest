import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls, type PaginationProps } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { formatMoscowDate, formatDuration } from '@/data/statistics-utils';
import type { HistoryRow, HistoryQuery } from '@/lib/history';
export function HistoryTable({ items, pagination, query, admin = false }: { items: HistoryRow[]; pagination: PaginationProps; query: HistoryQuery; admin?: boolean }) {
  return <Card className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">История тестов</h1>
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/40 p-2"><input type="hidden" name="pageSize" value={pagination.pageSize} />{query.period && <input type="hidden" name="period" value={query.period} />}
      <label className="space-y-1 text-xs text-muted-foreground">С<input aria-label="Начало периода" type="date" name="from" defaultValue={query.from} className="block h-9 rounded-md border bg-background px-2 text-sm text-foreground" /></label>
      <label className="space-y-1 text-xs text-muted-foreground">По<input aria-label="Конец периода" type="date" name="to" defaultValue={query.to} className="block h-9 rounded-md border bg-background px-2 text-sm text-foreground" /></label>
      <Button size="sm" type="submit" variant="secondary" className="h-9">Показать</Button>
    </form></div>
    <Table><TableHeader><TableRow>{admin && <TableHead>Пользователь</TableHead>}<TableHead className="whitespace-nowrap">Начало</TableHead>{admin && <TableHead>Группа</TableHead>}<TableHead>Результат</TableHead><TableHead>Время</TableHead><TableHead className="text-right">Тест</TableHead></TableRow></TableHeader>
    <TableBody>{items.map(test => <TableRow key={test.id}>
      {admin && <TableCell className="max-w-60"><Link className="font-medium hover:underline" href={`/admin/users/${encodeURIComponent(test.user?.username || '')}`} prefetch={false}>{test.user?.name || 'Пользователь удалён'}</Link></TableCell>}
      <TableCell className="whitespace-nowrap">{formatMoscowDate(test.createdAt)}</TableCell>{admin && <TableCell>{test.topicGroup}</TableCell>}
      <TableCell><span className="inline-flex whitespace-nowrap rounded-md bg-muted px-2 py-1 font-medium tabular-nums">{test.correctCount} / {test.taskCount}</span></TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{formatDuration(test.createdAt, test.isComplete ? test.completedAt : null)}</TableCell>
      <TableCell className="text-right"><Link className="inline-flex rounded-md border px-3 py-1.5 text-sm hover:bg-muted" href={`/t/${test.id}${test.isComplete || admin ? '/review' : ''}`} prefetch={false}>{test.isComplete || admin ? 'Результат' : 'Продолжить'}</Link></TableCell>
    </TableRow>)}{!items.length && <TableRow><TableCell colSpan={admin ? 6 : 4} className="h-24 text-center text-muted-foreground">Тестов за этот период нет</TableCell></TableRow>}</TableBody></Table>
    <PaginationControls {...pagination} />
  </Card>;
}
