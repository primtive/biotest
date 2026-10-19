import { requireAdmin } from '@/lib/server/access';
import prisma from '@/data/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getWeeklyStatistics } from '@/data/statistics';
import { statisticsRange, uniqueTestAnswers, formatMoscowDate, formatDuration } from '@/data/statistics-utils';
import { UserCard } from '@/components/user-card';
import { StatisticsFilter } from '@/components/statistics-filter';
import { WeekChart } from '@/components/week-chart';
import { ScoreChart } from '@/components/score-chart';
import { Card } from '@/components/ui/card';
import { ScoreEditor } from './score-editor';
import { getRecentUserScores } from '@/data/users';
export const metadata = { title: 'Статистика по пользователю' };
export default async function UserStats({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ from?: string; to?: string; page?: string }> }) {
  await requireAdmin(); const { username } = await params; if (!username || username.length > 128) notFound();
  const userData = await prisma.user.findFirst({ where: { username }, select: { id: true, username: true, name: true, createdAt: true, topicGroup: true, score: true, testsCount: true, percent: true } });
  const user = userData ? { ...userData, scores: await getRecentUserScores(userData.id) } : null;
  if (!user) notFound();
  const filter = await searchParams; let range; try { range = statisticsRange(filter.from, filter.to); } catch (error) { return <p role="alert">{(error as Error).message}</p>; }
  const page = Number(filter.page || 1); if (!Number.isSafeInteger(page) || page < 1) notFound();
  const count = await prisma.test.count({ where: { userId: user.id } }); const pages = Math.max(1, Math.ceil(count / 30)); if (page > pages) redirect(`?page=${pages}`);
  const [weeks, tests] = await Promise.all([getWeeklyStatistics(user.id, filter), prisma.test.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 30, take: 30, select: { id: true, createdAt: true, completedAt: true, isComplete: true, tasksIds: true, answers: true } })]);
  const link = (p: number) => `?${new URLSearchParams({ page: String(p), from: range.from, to: range.to })}`;
  return <><UserCard user={user} /><StatisticsFilter range={range} /><Card><WeekChart data={weeks} /><ScoreChart data={weeks} /></Card><Card><h2>История тестов</h2><table className="w-full"><tbody>{tests.map(test => { const answers = uniqueTestAnswers(test); return <tr key={test.id}><td>{formatMoscowDate(test.createdAt)}</td><td>{answers.filter(a => a.correct).length}/{test.tasksIds.length}</td><td>{formatDuration(test.createdAt, test.isComplete ? test.completedAt : null)}</td><td><Link href={`/t/${test.id}/review`}>Просмотр</Link></td></tr>; })}</tbody></table><div className="flex gap-3 mt-4">{page > 1 && <Link href={link(page - 1)}>Назад</Link>}<span>{page} из {pages}</span>{page < pages && <Link href={link(page + 1)}>Далее</Link>}</div></Card><Card><h2>Последние 30 начислений</h2><ScoreEditor userId={user.id} /><table className="w-full"><tbody>{user.scores.slice(-30).reverse().map((score, index) => <tr key={`${score.testId}-${index}`}><td>{formatMoscowDate(score.createdAt)}</td><td>{score.score}</td><td>{score.testId ? <Link href={`/t/${score.testId}/review`}>Тест</Link> : 'Вручную'}</td></tr>)}</tbody></table></Card></>;
}
