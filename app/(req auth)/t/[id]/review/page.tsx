import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { requireUser } from '@/lib/server/access';
import { getMongoDb } from '@/data/mongo';
import { attemptSnapshots } from '@/lib/server/attempts';
import { sanitizeContent } from '@/lib/server/html';
import { Card } from '@/components/ui/card';
import TaskCard from '../task-card';
export const metadata = { title: 'Просмотр теста' };
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const db = await getMongoDb(); const test = await db.collection('Test').findOne({ _id: new ObjectId(id), ...(user.admin ? {} : { userId: new ObjectId(user.id) }) });
  if (!test) notFound(); if (!test.isComplete && !user.admin) redirect(`/t/${id}`);
  const tasks = await attemptSnapshots(test, db);
  return <><p>Задания:</p>{test.snapshotSource === 'legacy-import' && <p className="text-sm text-muted-foreground">Для старого теста сохранена версия задания на дату переноса. Оценка оставлена исторической.</p>}{tasks.map((task: any) => {
    const id = String(task.taskId); const answer = (test.answers || []).find((a: any) => String(a.taskId) === id);
    return <Card key={id}><TaskCard task={{ id, html: sanitizeContent(task.html), topic: task.topicName, line: task.line, source: task.source }} /><div className="mt-3 space-y-2"><p><b>Ответ:</b> {task.answer || 'Задание недоступно'}</p><p><b>Ваш ответ:</b> {answer?.answer || 'Нет ответа'} {answer ? (answer.correct ? '✓' : '✗') : ''}</p>{task.explanation && <div dangerouslySetInnerHTML={{ __html: sanitizeContent(task.explanation) }} />}</div></Card>;
  })}<Link href="/">На главную</Link></>;
}
