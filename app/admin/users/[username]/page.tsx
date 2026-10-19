import { requireAdmin } from '@/lib/server/access';
import prisma from '@/data/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getWeeklyStatistics, getStatisticsPeriods } from '@/data/statistics';
import { formatMoscowDate } from '@/data/statistics-utils';
import { UserCard } from '@/components/user-card';
import { StatisticsFilter } from '@/components/statistics-filter';
import { WeekChart } from '@/components/week-chart';
import { ScoreChart } from '@/components/score-chart';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HistoryTable } from '@/components/history-table';
import { readHistory, type HistoryQuery } from '@/lib/history';
import { getMongoDb } from '@/data/mongo';
import { parseAcademicPeriod } from '@/lib/academic-period';
import { ScoreEditor } from './score-editor';
import { getRecentUserScores } from '@/data/users';
export const metadata = { title: 'Статистика по пользователю' };
export default async function UserStats({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<HistoryQuery & { period?: string }> }) {
  await requireAdmin(); const { username } = await params; if (!username || username.length > 128) notFound();
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true, username: true, name: true, createdAt: true, topicGroup: true, score: true, testsCount: true, percent: true } });
  if (!user) notFound();
  const filter = await searchParams;
  let period: string; try { period = parseAcademicPeriod(filter.period); } catch (error) { return <p role="alert">{(error as Error).message}</p>; }
  const [weeks, history, periods, scores] = await Promise.all([getWeeklyStatistics(user.id, { period }), readHistory(await getMongoDb(), filter, user.id), getStatisticsPeriods(), getRecentUserScores(user.id)]);
  return <><UserCard user={user} /><Card className="min-w-0 space-y-4"><StatisticsFilter period={period} years={periods.years} /><WeekChart data={weeks} /><ScoreChart data={weeks} /></Card><HistoryTable {...history} query={filter} /><Card className="space-y-4"><h2 className="text-xl font-semibold">Последние 30 начислений</h2><ScoreEditor userId={user.id} /><Table><TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Очки</TableHead><TableHead>Источник</TableHead></TableRow></TableHeader><TableBody>{scores.slice().reverse().map((score, index) => <TableRow key={`${score.testId}-${index}`}><TableCell>{formatMoscowDate(score.createdAt)}</TableCell><TableCell>{score.score}</TableCell><TableCell>{score.testId ? <Link href={`/t/${score.testId}/review`} prefetch={false}>Тест</Link> : 'Вручную'}</TableCell></TableRow>)}</TableBody></Table></Card></>;
}
