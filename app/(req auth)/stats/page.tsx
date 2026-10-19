import { requireUser } from '@/lib/server/access';
import prisma from '@/data/prisma';
import { getWeeklyStatistics, getStatisticsPeriods } from '@/data/statistics';
import { parseAcademicPeriod } from '@/lib/academic-period';
import { StatisticsFilter } from '@/components/statistics-filter';
import { WeekChart } from '@/components/week-chart';
import { ScoreChart } from '@/components/score-chart';
import { UserCard } from '@/components/user-card';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'Моя статистика' };
export default async function MyStats({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const identity = await requireUser(), filter = await searchParams;
  let period: string; try { period = parseAcademicPeriod(filter.period); } catch (error) { return <p role="alert">{(error as Error).message}</p>; }
  const [weeks, user, periods] = await Promise.all([getWeeklyStatistics(identity.id, { period }), prisma.user.findUniqueOrThrow({ where: { id: identity.id }, select: { id: true, name: true, username: true, createdAt: true, topicGroup: true, score: true, testsCount: true, percent: true } }), getStatisticsPeriods()]);
  return <><UserCard user={user} /><Card className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Моя статистика</h1><StatisticsFilter period={period} years={periods.years} /></div><h2>Тесты по неделям</h2><WeekChart data={weeks} /><h2>Правильных ответов в среднем за завершённый тест</h2><ScoreChart data={weeks} /></Card></>;
}
