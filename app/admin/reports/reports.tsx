'use client';
import { PaginationControls, type PaginationProps } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dateInMoscow } from '@/data/statistics-utils';
import { requestJson } from '@/lib/client-request';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import ReportTable, { type UserReport } from './report-table';
type ReportData = PaginationProps & { data: UserReport[]; from: string; to: string };
export default function Reports() {
  const params = useSearchParams(), router = useRouter();
  const today = dateInMoscow(), weekAgo = dateInMoscow(new Date(Date.now() - 6 * 86400000));
  const [range, setRange] = useState({ from: weekAgo, to: today, topicGroup: 'all', completedOnly: true });
  const [filter, setFilter] = useState(range);
  const [testGoal, setTestGoal] = useLocalStorage('testGoal', 0, { initializeWithValue: false }), [scoreGoal, setScoreGoal] = useLocalStorage('scoreGoal', 0, { initializeWithValue: false });
  const page = params.get('page') || '1', pageSize = params.get('pageSize') || '20';
  const sort = params.get('sort') || 'testCount', direction = params.get('direction') || 'desc';
  const { data, isFetching, error } = useQuery({ queryKey: ['reports', filter, page, pageSize, sort, direction], queryFn: ({ signal }) => requestJson<ReportData>(`/api/reports?${new URLSearchParams({ ...filter, completedOnly: String(filter.completedOnly), page, pageSize, sort, direction })}`, { signal }), placeholderData: keepPreviousData });
  return <Card className="min-w-0 space-y-4"><h1 className="text-xl font-semibold">Отчёты</h1>
    <form onSubmit={e => { e.preventDefault(); setFilter(range); const query = new URLSearchParams(params.toString()); query.set('page', '1'); router.replace(`?${query}`, { scroll: false }); }} className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/40 p-3">
      <label className="space-y-1 text-sm">С<Input type="date" required value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></label>
      <label className="space-y-1 text-sm">По<Input type="date" required min={range.from} value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></label>
      <label className="space-y-1 text-sm">Группа<select className="block h-9 rounded-md border bg-background px-3" value={range.topicGroup} onChange={e => setRange({ ...range, topicGroup: e.target.value })}><option value="all">ОГЭ / ЕГЭ</option><option value="oge">ОГЭ</option><option value="ege">ЕГЭ</option></select></label>
      <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={range.completedOnly} onChange={e => setRange({ ...range, completedOnly: e.target.checked })} />Только завершённые</label>
      <Button type="submit" variant="secondary" disabled={isFetching}>Показать</Button>
    </form>
    <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">Норма тестов<Input className="w-20" type="number" min={0} value={testGoal} onChange={e => setTestGoal(Number(e.target.value))} /></label><label className="flex items-center gap-2 text-sm">Норма очков<Input className="w-20" type="number" min={0} value={scoreGoal} onChange={e => setScoreGoal(Number(e.target.value))} /></label>{isFetching && <span className="text-sm text-muted-foreground">Загрузка…</span>}</div>
    {error && <p role="alert">{error.message}</p>}
    {data && <><ReportTable data={data.data} scoreGoal={scoreGoal} testGoal={testGoal} /><PaginationControls {...data} loading={isFetching} /></>}
  </Card>;
}
