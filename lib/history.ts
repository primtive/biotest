import { ObjectId, type Db, type Document } from 'mongodb';
import { parsePagination, pageInfo, type PageQuery } from './pagination';
import { uniqueAnswersExpression } from '../data/statistics-utils';
export type HistoryQuery = PageQuery;
export type HistoryRow = { id: string; createdAt: Date; completedAt: Date | null; isComplete: boolean; taskCount: number; correctCount: number; user?: { name: string; username: string }; topicGroup?: string };
export async function readHistory(db: Db, query: HistoryQuery, userId?: string) {
  const parsed = parsePagination(query);
  const where: Document = userId ? { userId: new ObjectId(userId) } : {};
  if (!userId) {
    const archived = await db.collection('User').find({ isArchive: true }, { projection: { _id: 1 } }).toArray();
    if (archived.length) where.userId = { $nin: archived.map(u => u._id) };
  }
  const total = await db.collection('Test').countDocuments(where);
  const pagination = pageInfo(total, parsed.page, parsed.pageSize);
  const rows = await db.collection('Test').aggregate([
    { $match: where }, { $sort: { createdAt: -1, _id: -1 } },
    { $skip: (pagination.page - 1) * pagination.pageSize }, { $limit: pagination.pageSize },
    { $project: { createdAt: 1, completedAt: 1, isComplete: 1, userId: 1, topicGroupId: 1,
      taskCount: { $ifNull: ['$taskCount', { $size: { $ifNull: ['$tasksIds', []] } }] },
      correctCount: { $ifNull: ['$correctCount', { $size: { $filter: { input: uniqueAnswersExpression, as: 'a', cond: { $eq: ['$$a.correct', true] } } } }] },
    } },
  ]).toArray();
  const [users, groups] = userId ? [[], []] : await Promise.all([
    db.collection('User').find({ _id: { $in: rows.map(t => t.userId) } }, { projection: { name: 1, username: 1 } }).toArray(),
    db.collection('TopicGroup').find({ _id: { $in: rows.map(t => t.topicGroupId) } }, { projection: { name: 1 } }).toArray(),
  ]);
  const items: HistoryRow[] = rows.map(t => ({ id: String(t._id), createdAt: t.createdAt, completedAt: t.completedAt || null, isComplete: !!t.isComplete, taskCount: t.taskCount, correctCount: t.correctCount,
    ...(!userId ? { user: users.find(u => String(u._id) === String(t.userId)) as HistoryRow['user'], topicGroup: groups.find(g => String(g._id) === String(t.topicGroupId))?.name || '—' } : {}),
  }));
  // Never serialize MongoDB IDs or answer/snapshot arrays into the page payload.
  for (const row of items) if (row.user) row.user = { name: row.user.name, username: row.user.username };
  return { items, pagination };
}
