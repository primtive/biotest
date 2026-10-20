import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls, type PaginationProps } from '@/components/pagination-controls';
import { Undo2 } from 'lucide-react';
import { ReviewTest } from '@/components/review-test';
import { UserBadge } from '@/components/user-badge';
import { formatMoscowDate, formatDuration } from '@/data/statistics-utils';
import type { HistoryRow } from '@/lib/history';
export function HistoryTable({ items, pagination, admin = false }: { items: HistoryRow[]; pagination: PaginationProps; admin?: boolean }) {
  return <Card className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">История тестов</h1>
</div>
    <Table><TableHeader><TableRow>{admin && <TableHead>Пользователь</TableHead>}<TableHead className="whitespace-nowrap">Начало</TableHead>{admin && <TableHead>Группа</TableHead>}<TableHead>Результат</TableHead><TableHead>Время</TableHead><TableHead className="text-right">Тест</TableHead></TableRow></TableHeader>
    <TableBody>{items.map(test => <TableRow key={test.id}>
      {admin && <TableCell className="max-w-60">{test.user ? <UserBadge username={test.user.username} name={test.user.name} /> : 'Пользователь удалён'}</TableCell>}
      <TableCell className="whitespace-nowrap">{formatMoscowDate(test.createdAt)}</TableCell>{admin && <TableCell>{test.topicGroup}</TableCell>}
      <TableCell><span className="inline-flex whitespace-nowrap rounded-md bg-muted px-2 py-1 font-medium tabular-nums">{test.correctCount} / {test.taskCount}</span></TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{formatDuration(test.createdAt, test.isComplete ? test.completedAt : null)}</TableCell>
      <TableCell className="text-right">{test.isComplete || admin ? <ReviewTest testId={test.id} /> : <Link href={`/t/${test.id}`} prefetch={false} aria-label="Продолжить тест" title="Продолжить тест" className="inline-flex"><Undo2 className="w-5 h-5" /></Link>}</TableCell>
    </TableRow>)}{!items.length && <TableRow><TableCell colSpan={admin ? 6 : 4} className="h-24 text-center text-muted-foreground">Тестов пока нет</TableCell></TableRow>}</TableBody></Table>
    <PaginationControls {...pagination} />
  </Card>;
}
