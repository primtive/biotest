import 'server-only';
import prisma from '@/data/prisma';
import { getMongoDb } from '@/data/mongo';
import { ObjectId } from 'mongodb';
import { requireAdmin, requireUser, HttpError, secretUserIds } from '@/lib/server/access';
import { uniqueAnswers } from '@/lib/grading';
import type { Prisma } from '@prisma/client';

export async function getUserLastTest(userId: string) {
  const user = await requireUser(); if (user.id !== userId && !user.admin) throw new HttpError(403, 'Недостаточно прав');
  return prisma.test.findFirst({ where: { userId }, select: { id: true, isComplete: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
}
export async function getRecentUserScores(userId: string): Promise<Array<{ score: number; createdAt: Date; testId: string }>> {
  await requireAdmin();
  const user = await (await getMongoDb()).collection('User').findOne({ _id: new ObjectId(userId) }, { projection: { scores: { $slice: -30 } } });
  return (user?.scores || []).map((entry: any) => ({ score: Number(entry.score), createdAt: new Date(entry.createdAt), testId: String(entry.testId || '') }));
}
export async function getLeaderboard(topicGroupId: string, currentUserId?: string, full = false): Promise<any[]> {
  if (full) { const user = await requireUser(); if (!user.admin && !secretUserIds.includes(user.id)) throw new HttpError(403, 'Недостаточно прав'); }
  const db = await getMongoDb();
  const match = { admin: false, isArchive: false, topicGroupId: new ObjectId(topicGroupId) };
  const project = { _id: 1, name: 1, score: 1 };
  const top = await db.collection('User').find({ ...match, ...(full ? {} : { score: { $ne: 0 } }) }, { projection: project }).sort({ score: -1, _id: 1 }).limit(full ? 1000 : 10).toArray();
  const rows: any[] = top.map((u, i) => ({ _id: { $oid: String(u._id) }, name: u.name, score: Number(u.score), index: i + 1 }));
  if (currentUserId && !top.some(u => String(u._id) === currentUserId)) {
    const own = await db.collection('User').findOne({ ...match, _id: new ObjectId(currentUserId) }, { projection: project });
    if (own) { const above = await db.collection('User').countDocuments({ ...match, $or: [{ score: { $gt: own.score } }, { score: own.score, _id: { $lt: own._id } }] }); rows.push({ _id: { $oid: currentUserId }, name: own.name, score: Number(own.score), index: above + 1 }); }
  }
  return rows;
}
export async function updateAllTopicProgress(userId: string, client: Prisma.TransactionClient = prisma) {
  const [tasks, history, topics] = await Promise.all([
    client.task.findMany({ select: { id: true, topicId: true, active: true, isReported: true } }),
    client.test.findMany({ where: { userId, isComplete: true }, select: { tasksIds: true, answers: true } }),
    client.topic.findMany({ select: { id: true, active: true } }),
  ]);
  const correct = new Set(history.flatMap(t => uniqueAnswers(t.tasksIds, t.answers).filter(a => a.correct).map(a => a.taskId)));
  for (const topic of topics) {
    const all = tasks.filter(t => t.topicId === topic.id); const available = all.filter(t => t.active && !t.isReported && topic.active);
    const correctTaskIds = all.filter(t => correct.has(t.id)).map(t => t.id);
    if (!correctTaskIds.length && !await client.userTopicProgress.findUnique({ where: { userId_topicId: { userId, topicId: topic.id } }, select: { id: true } })) continue;
    const percent = available.length ? Math.round(available.filter(t => correct.has(t.id)).length / available.length * 100) : 0;
    await client.userTopicProgress.upsert({ where: { userId_topicId: { userId, topicId: topic.id } }, update: { correctTaskIds, percent, version: 2 }, create: { userId, topicId: topic.id, correctTaskIds, percent, version: 2 } });
  }
}
export async function updateTopicProgress(userId: string, _topicId: string, client: Prisma.TransactionClient = prisma) { return updateAllTopicProgress(userId, client); }
export async function getUserTopicPercentages(userId: string) {
  const user = await requireUser(); if (user.id !== userId && !user.admin) throw new HttpError(403, 'Недостаточно прав');
  const [records, tasks] = await Promise.all([
    prisma.userTopicProgress.findMany({ where: { userId }, select: { topicId: true, correctTaskIds: true } }),
    prisma.task.findMany({ where: { active: true, isReported: false, topic: { active: true, topicGroupId: user.topicGroupId } }, select: { id: true, topicId: true } }),
  ]);
  const result: Record<string, number> = {};
  for (const record of records) { const eligible = tasks.filter(t => t.topicId === record.topicId); const correct = new Set(record.correctTaskIds); result[record.topicId] = eligible.length ? Math.round(eligible.filter(t => correct.has(t.id)).length / eligible.length * 100) : 0; }
  return result;
}
