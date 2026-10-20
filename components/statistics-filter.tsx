import { Button } from '@/components/ui/button';
export function StatisticsFilter({ period, years, admin = false, topicGroup = 'all' }: { period: string; years: string[]; admin?: boolean; topicGroup?: string }) {
  return <form method="get" className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
    <label className="flex items-center gap-2 text-sm font-medium">Период<select className="h-10 rounded-md border bg-background px-3 font-normal" name="period" defaultValue={period}><option value="all">Вся история</option>{years.map(year => <option key={year} value={year}>{year}–{Number(year) + 1}</option>)}</select></label>
    {admin && <label className="flex items-center gap-2 text-sm font-medium">Группа<select className="h-10 rounded-md border bg-background px-3 font-normal" name="topicGroup" defaultValue={topicGroup}><option value="all">ОГЭ / ЕГЭ</option><option value="oge">ОГЭ</option><option value="ege">ЕГЭ</option></select></label>}
    <Button variant="secondary" type="submit">Показать</Button>
  </form>;
}
