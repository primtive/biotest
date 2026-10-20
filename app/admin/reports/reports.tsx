'use client';
import { PaginationControls, type PaginationProps } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dateInMoscow } from '@/data/statistics-utils';
import { requestJson } from '@/lib/client-request';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import ReportTable, { type UserReport } from './report-table';
type ReportData = PaginationProps & { data: UserReport[]; from: string; to: string };
type Filter = { from: string; to: string; topicGroup: string; completedOnly: boolean };
const displayDate = (date: string) => date.split('-').reverse().join('.');
export default function Reports() {
  const params = useSearchParams(), router = useRouter();
  const from = params.get('from') || dateInMoscow(new Date(Date.now() - 6 * 86400000));
  const to = params.get('to') || dateInMoscow();
  const topicGroup = params.get('topicGroup') || 'all';
  const completedOnly = params.get('completedOnly') !== 'false';
  const [draft, setDraft] = useState<Filter>({ from, to, topicGroup, completedOnly });
  useEffect(() => setDraft({ from, to, topicGroup, completedOnly }), [from, to, topicGroup, completedOnly]);
  const [testGoal, setTestGoal] = useLocalStorage('testGoal', 0, { initializeWithValue: false });
  const [scoreGoal, setScoreGoal] = useLocalStorage('scoreGoal', 0, { initializeWithValue: false });
  const page = params.get('page') || '1', pageSize = params.get('pageSize') || '20';
  const sort = params.get('sort') || 'testCount', direction = params.get('direction') || 'desc';
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['reports', from, to, topicGroup, completedOnly, page, pageSize, sort, direction],
    queryFn: ({ signal }) => requestJson<ReportData>(`/api/reports?${new URLSearchParams({ from, to, topicGroup, completedOnly: String(completedOnly), page, pageSize, sort, direction })}`, { signal }),
    placeholderData: keepPreviousData, staleTime: 30000, refetchOnWindowFocus: false, retry: false,
  });
  function apply(event: React.FormEvent) {
    event.preventDefault();
    const query = new URLSearchParams(params.toString());
    query.set('from', draft.from); query.set('to', draft.to); query.set('topicGroup', draft.topicGroup);
    query.set('completedOnly', String(draft.completedOnly)); query.set('page', '1');
    router.replace(`?${query}`, { scroll: false });
    if (draft.from === from && draft.to === to && draft.topicGroup === topicGroup && draft.completedOnly === completedOnly && page === '1') void refetch();
  }
  return <Card className="min-w-0 space-y-4"><h1 className="text-xl font-semibold">Отчёты</h1>
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/40 p-3">
      <label className="space-y-1 text-sm">С<Input type="date" required value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label className="space-y-1 text-sm">По<Input type="date" required min={draft.from} value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <label className="space-y-1 text-sm">Группа<select className="block h-9 rounded-md border bg-background px-3" value={draft.topicGroup} onChange={e => setDraft({ ...draft, topicGroup: e.target.value })}><option value="all">ОГЭ / ЕГЭ</option><option value="oge">ОГЭ</option><option value="ege">ЕГЭ</option></select></label>
      <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={draft.completedOnly} onChange={e => setDraft({ ...draft, completedOnly: e.target.checked })} />Только завершённые</label>
      <Button type="submit" variant="secondary" disabled={isFetching}>Показать</Button>
    </form>
    <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm">Норма тестов<Input className="w-20" type="number" min={0} value={testGoal} onChange={e => setTestGoal(Number(e.target.value))} /></label><label className="flex items-center gap-2 text-sm">Норма очков<Input className="w-20" type="number" min={0} value={scoreGoal} onChange={e => setScoreGoal(Number(e.target.value))} /></label>{isFetching && <span role="status" className="text-sm text-muted-foreground">Загрузка…</span>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
    {data && <div aria-busy={isFetching} className="space-y-3"><p className="text-sm text-muted-foreground">{displayDate(data.from)} — {displayDate(data.to)}</p><ReportTable data={data.data} scoreGoal={scoreGoal} testGoal={testGoal} /><PaginationControls {...data} loading={isFetching} /></div>}
  </Card>;
}
