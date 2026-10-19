import { requireAdmin } from '@/lib/server/access';
import { getAdminStatistics, selectedTopicGroup } from '@/data/statistics';
import { statisticsRange } from '@/data/statistics-utils';
import { StatisticsFilter } from '@/components/statistics-filter';
import { WeekChart } from '@/components/week-chart';
import { ScoreChart } from '@/components/score-chart';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'Статистика' };
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; topicGroup?: string }> }) {
  await requireAdmin(); const filter = await searchParams;
  let range; try { range = statisticsRange(filter.from, filter.to); selectedTopicGroup(filter.topicGroup); } catch (error) { return <p role="alert">{(error as Error).message} <a href="/admin/stats">Сбросить фильтры</a></p>; }
  const stats = await getAdminStatistics(filter);
  const values = { 'Неархивные ученики': stats.userCount, 'Доступные задания': stats.taskCount, 'Начато тестов': stats.startedCount, 'Завершено тестов': stats.completedCount, 'Активные ученики': stats.activeUsers, 'Принято ответов': stats.answeredCount, 'Правильные ответы': stats.correctCount, 'Точность, %': stats.accuracy };
  return <><h1 className="text-2xl">Статистика</h1><StatisticsFilter range={range} admin topicGroup={filter.topicGroup} /><div className="flex flex-wrap gap-3">{Object.entries(values).map(([label, value]) => <Card key={label}><p>{label}</p><p className="text-2xl">{value}</p></Card>)}</div><Card><h2>Начало и завершение тестов по неделям</h2><WeekChart data={stats.weeks} /></Card><Card><h2>Правильных ответов в среднем за завершённый тест</h2><ScoreChart data={stats.weeks} /></Card><p className="text-sm text-muted-foreground">Начатые тесты учитываются по дате начала, завершённые — по дате завершения. Повторные ответы в старых тестах не увеличивают результат.</p></>;
}
