import { requireUser } from '@/lib/server/access';
import prisma from '@/data/prisma';
import { getWeeklyStatistics } from '@/data/statistics';
import { statisticsRange } from '@/data/statistics-utils';
import { StatisticsFilter } from '@/components/statistics-filter';
import { WeekChart } from '@/components/week-chart';
import { ScoreChart } from '@/components/score-chart';
import { UserCard } from '@/components/user-card';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'Моя статистика' };
export default async function MyStats({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const identity = await requireUser(); const filter = await searchParams;
  let range; try { range = statisticsRange(filter.from, filter.to); } catch (error) { return <p role="alert">{(error as Error).message} <a href="/stats">Сбросить период</a></p>; }
  const [weeks, user] = await Promise.all([getWeeklyStatistics(identity.id, filter), prisma.user.findUniqueOrThrow({ where: { id: identity.id }, select: { id: true, name: true, username: true, createdAt: true, topicGroup: true, score: true, testsCount: true, percent: true } })]);
  return <><UserCard user={user} /><StatisticsFilter range={range} /><Card><h1 className="text-xl mb-3">Тесты по неделям</h1><WeekChart data={weeks} /><h2>Правильных ответов в среднем за завершённый тест</h2><ScoreChart data={weeks} /></Card></>;
}
