import { notFound, redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { requireUser } from '@/lib/server/access';
import { getMongoDb } from '@/data/mongo';
import { attemptSnapshots } from '@/lib/server/attempts';
import { sanitizeContent } from '@/lib/server/html';
import { uniqueAnswers } from '@/lib/grading';
import { Test } from './test';
export const metadata = { title: 'Тест' };
export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  if (!ObjectId.isValid(id) || !/^[a-f\d]{24}$/i.test(id)) notFound();
  const db = await getMongoDb(); const test = await db.collection('Test').findOne({ _id: new ObjectId(id), userId: new ObjectId(user.id) });
  if (!test) notFound(); if (test.isComplete) redirect(`/t/${id}/review`);
  const snapshots = await attemptSnapshots(test, db);
  const tasks = snapshots.map((t: any) => ({ id: String(t.taskId), html: sanitizeContent(t.html), topic: t.topicName, line: t.line, source: t.source }));
  if (!tasks.length) return <p role="alert">В этом старом тесте нет заданий. Создайте новый тест на главной странице.</p>;
  const answers = uniqueAnswers(test.tasksIds, test.answers || []).map((a: any) => ({ ...a, taskId: String(a.taskId) }));
  return <Test tasks={tasks} initTaskAnswers={answers} id={id} />;
}
