import { requireAdmin } from '@/lib/server/access';
import { getAdminStatistics, selectedTopicGroup, getStatisticsPeriods } from '@/data/statistics';
import { parseAcademicPeriod } from '@/lib/academic-period';
import { StatisticsFilter } from '@/components/statistics-filter';
import { WeekChart } from '@/components/week-chart';
import { ScoreChart } from '@/components/score-chart';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'Статистика' };
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ period?: string; topicGroup?: string }> }) {
  await requireAdmin(); const filter = await searchParams;
  let period: string; try { period = parseAcademicPeriod(filter.period); selectedTopicGroup(filter.topicGroup); } catch (error) { return <p role="alert">{(error as Error).message}</p>; }
  const [stats, periods] = await Promise.all([getAdminStatistics({ ...filter, period }), getStatisticsPeriods()]);
  const values = { 'Неархивные ученики': stats.userCount, 'Доступные задания': stats.taskCount, 'Начато тестов': stats.startedCount, 'Завершено тестов': stats.completedCount, 'Активные ученики': stats.activeUsers, 'Принято ответов': stats.answeredCount, 'Правильные ответы': stats.correctCount, 'Точность, %': stats.accuracy };
  return <Card className="min-w-0 space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Статистика</h1><StatisticsFilter period={period} years={periods.years} admin topicGroup={filter.topicGroup} /></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Object.entries(values).map(([label, value]) => <div className="rounded-lg border p-3" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>)}</div><div><h2>Начало и завершение тестов по неделям</h2><WeekChart data={stats.weeks} /></div><div><h2>Правильных ответов в среднем за завершённый тест</h2><ScoreChart data={stats.weeks} /></div></Card>;
}
