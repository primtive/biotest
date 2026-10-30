import { ObjectId, type Db, type Document } from 'mongodb';
import { academicYear, academicRange, parseAcademicPeriod } from './academic-period';
import { STATISTICS_TIMEZONE, dateInMoscow, uniqueAnswersExpression, weekKeys } from '../data/statistics-utils';
import { createHash } from 'node:crypto';
import { studentMatch } from './permissions';
export type WeekStatistics = { weekDate: string; count: number; countCompleted: number; score: number };
export type CachedStatistics = { weeks: WeekStatistics[]; startedCount: number; completedCount: number; answeredCount: number; correctCount: number; activeUsers: number; accuracy: number; userCount: number; taskCount: number };
const inflight = new Map<string, Promise<CachedStatistics>>();
const weekExpression = (field: string) => ({ $dateToString: { format: '%Y-%m-%d', date: { $subtract: [field, { $multiply: [{ $subtract: [{ $isoDayOfWeek: { date: field, timezone: STATISTICS_TIMEZONE } }, 1] }, 86400000] }] }, timezone: STATISTICS_TIMEZONE } });
export async function statisticsPeriods(db: Db, userIds?: string[]) {
  const first = await db.collection('Test').findOne(userIds === undefined ? {} : { userId: { $in: userIds.map(id => new ObjectId(id)) } }, { sort: { createdAt: 1, _id: 1 }, projection: { createdAt: 1 } });
  const earliest = first?.createdAt instanceof Date ? first.createdAt : new Date();
  const current = academicYear(), firstYear = Math.min(current, academicYear(earliest));
  return { earliest, years: Array.from({ length: current - firstYear + 1 }, (_, i) => String(current - i)) };
}
export async function bumpStatisticsRevision(db: Db) {
  await db.collection<Document & { _id: string }>('StatisticsRevision').updateOne({ _id: 'global' }, { $inc: { revision: 1 }, $set: { updatedAt: new Date() } }, { upsert: true });
}
export async function readStatistics(db: Db, periodValue?: string, userId?: string, topicGroupId?: string, groups?: string[]): Promise<CachedStatistics> {
  const period = parseAcademicPeriod(periodValue);
  const scope = groups === undefined ? 'admin' : `teacher:${createHash('sha256').update(JSON.stringify([...new Set(groups)].sort())).digest('hex')}`;
  const key = `v2:${userId || scope}:${topicGroupId || 'all'}:${period}`;
  const revision = Number((await db.collection<Document & { _id: string }>('StatisticsRevision').findOne({ _id: 'global' }))?.revision || 0);
  const cached = await db.collection<Document & { _id: string }>('StatisticsCache').findOne({ _id: key, revision, cacheDay: dateInMoscow() });
  if (cached) return cached.data as CachedStatistics;
  const flightKey = `${db.databaseName}:${key}:${revision}`;
  if (inflight.has(flightKey)) return inflight.get(flightKey)!;
  const compute = (async () => {
    const students = groups === undefined ? undefined : await db.collection('User').find(studentMatch(groups), { projection: { _id: 1, topicGroupId: 1 } }).toArray();
    const { earliest } = await statisticsPeriods(db, students?.map(student => String(student._id)) ?? (userId ? [userId] : undefined));
    const range = academicRange(period, earliest);
    const group = topicGroupId ? { topicGroupId: new ObjectId(topicGroupId) } : {};
    const match = { ...group, ...(students ? { userId: { $in: students.filter(student => !userId || String(student._id) === userId).map(student => student._id) } } : userId ? { userId: new ObjectId(userId) } : {}) };
    const between = { $gte: range.start, $lt: range.end };
    const raw = (await db.collection('Test').aggregate([
      { $match: { ...match, $or: [{ createdAt: between }, { completedAt: between, isComplete: true }] } },
      { $project: { createdAt: 1, completedAt: 1, isComplete: 1, userId: 1, tasksIds: 1, answers: 1, correctCount: 1, answeredCount: 1 } },
      { $set: { accepted: { $cond: [{ $and: [{ $isNumber: '$correctCount' }, { $isNumber: '$answeredCount' }] }, [], uniqueAnswersExpression] } } },
      { $set: { correct: { $ifNull: ['$correctCount', { $size: { $filter: { input: '$accepted', as: 'a', cond: { $eq: ['$$a.correct', true] } } } }] }, answered: { $ifNull: ['$answeredCount', { $size: '$accepted' }] } } },
      { $facet: {
        started: [{ $match: { createdAt: between } }, { $group: { _id: weekExpression('$createdAt'), count: { $sum: 1 } } }],
        completed: [{ $match: { completedAt: between, isComplete: true } }, { $group: { _id: weekExpression('$completedAt'), count: { $sum: 1 }, score: { $sum: '$correct' } } }],
        totals: [{ $match: { completedAt: between, isComplete: true } }, { $group: { _id: null, completedCount: { $sum: 1 }, answeredCount: { $sum: '$answered' }, correctCount: { $sum: '$correct' }, users: { $addToSet: '$userId' } } }],
      } },
    ]).toArray())[0] || { started: [], completed: [] };
    const completion = { weeks: raw.completed || [], totals: raw.totals || [] }, totals = completion.totals[0];
    const [userCount, taskCount] = userId ? [0, 0] : await Promise.all([
      db.collection('User').countDocuments({ ...group, admin: false, teacher: { $ne: true }, isArchive: false, ...(students ? { _id: { $in: students.map(student => student._id) } } : {}) }),
      (async () => { const topics = await db.collection('Topic').find({ ...(students ? { topicGroupId: { $in: students.filter(student => !topicGroupId || String(student.topicGroupId) === topicGroupId).map(student => student.topicGroupId) } } : group), active: true }, { projection: { _id: 1 } }).toArray(); return db.collection('Task').countDocuments({ topicId: { $in: topics.map(t => t._id) }, active: true, isReported: false }); })(),
    ]);
    const weeks = weekKeys(range).map(key => { const done = completion.weeks.find((w: Document) => w._id === key); return { weekDate: key.split('-').reverse().join('.'), count: raw.started.find((w: Document) => w._id === key)?.count || 0, countCompleted: done?.count || 0, score: done ? Math.round(done.score / done.count * 100) / 100 : 0 }; });
    const data: CachedStatistics = { weeks, userCount, taskCount, startedCount: raw.started.reduce((sum: number, row: Document) => sum + row.count, 0), completedCount: totals?.completedCount || 0, answeredCount: totals?.answeredCount || 0, correctCount: totals?.correctCount || 0, activeUsers: totals?.users?.length || 0, accuracy: totals?.answeredCount ? Math.round(totals.correctCount / totals.answeredCount * 100) : 0 };
    await db.collection<Document & { _id: string }>('StatisticsCache').updateOne({ _id: key }, { $set: { revision, cacheDay: dateInMoscow(), period, userId: userId || null, topicGroupId: topicGroupId || null, updatedAt: new Date(), data } }, { upsert: true });
    return data;
  })();
  inflight.set(flightKey, compute);
  try { return await compute; } finally { inflight.delete(flightKey); }
}
