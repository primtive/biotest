import { requireUser } from '@/lib/server/access';
import prisma from '@/data/prisma';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { uniqueTestAnswers, formatMoscowDate, formatDuration } from '@/data/statistics-utils';
import { Card } from '@/components/ui/card';
export const metadata = { title: 'История тестов' };
export default async function MyHistory({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser(); const params = await searchParams; const page = Number(params.page || 1);
  if (!Number.isSafeInteger(page) || page < 1) notFound();
  const count = await prisma.test.count({ where: { userId: user.id } }); const pages = Math.max(1, Math.ceil(count / 30));
  if (page > pages) redirect(`?page=${pages}`);
  const tests = await prisma.test.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 30, take: 30, select: { id: true, createdAt: true, completedAt: true, isComplete: true, tasksIds: true, answers: true } });
  return <Card><h1>История тестов</h1><table className="w-full"><thead><tr><th>Начало</th><th>Результат</th><th>Время</th><th>Просмотр</th></tr></thead><tbody>{tests.map(test => { const answers = uniqueTestAnswers(test); return <tr key={test.id}><td>{formatMoscowDate(test.createdAt)}</td><td>{answers.filter(a => a.correct).length}/{test.tasksIds.length}</td><td>{formatDuration(test.createdAt, test.isComplete ? test.completedAt : null)}</td><td><Link href={`/t/${test.id}${test.isComplete ? '/review' : ''}`}>{test.isComplete ? 'Результат' : 'Продолжить'}</Link></td></tr>; })}</tbody></table>{!tests.length && <p>Тестов пока нет</p>}<div className="flex gap-3 mt-4">{page > 1 && <Link href={`?page=${page - 1}`}>Назад</Link>}<span>{page} из {pages}</span>{page < pages && <Link href={`?page=${page + 1}`}>Далее</Link>}</div></Card>;
}
