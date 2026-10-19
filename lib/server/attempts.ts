import 'server-only';
import { ObjectId, type ClientSession, type Db, type Document } from 'mongodb';
import type { SafeUser } from '@/auth';
import { getMongoDb, getMongoClient } from '@/data/mongo';
import { HttpError } from './access';
import { sanitizeContent } from './html';
import { checkAnswer, uniqueAnswers } from '@/lib/grading';
import { invalidateStatistics } from '@/data/statistics';

export async function attemptSnapshots(test: Document, db: Db, session?: ClientSession) {
  const snapshots = Array.isArray(test.snapshots) ? test.snapshots : [];
  const missing = test.tasksIds.filter((id: ObjectId) => !snapshots.some((s: Document) => String(s.taskId) === String(id)));
  const tasks = missing.length ? await db.collection('Task').find({ _id: { $in: missing } }, { session }).toArray() : [];
  const topicIds = tasks.map(t => t.topicId);
  const topics = topicIds.length ? await db.collection('Topic').find({ _id: { $in: topicIds } }, { session, projection: { name: 1 } }).toArray() : [];
  return test.tasksIds.map((id: ObjectId) => {
    const saved = snapshots.find((s: Document) => String(s.taskId) === String(id));
    if (saved) return saved;
    const task = tasks.find(t => String(t._id) === String(id));
    if (!task) return { taskId: id, topicId: new ObjectId('000000000000000000000000'), topicName: 'История', html: '<p>Это задание удалено из старой базы.</p>', answer: '', explanation: '', line: '', source: '', disordered: false, missing: true };
    return { taskId: id, topicId: task.topicId, topicName: topics.find(t => String(t._id) === String(task.topicId))?.name || 'Тема', html: task.html, answer: task.answer, explanation: task.explanation || '', line: task.line || '', source: task.source || '', disordered: !!task.disordered };
  });
}
export async function createAttempt(user: SafeUser, topicIds?: string[]) {
  const db = await getMongoDb(); const groupId = new ObjectId(user.topicGroupId);
  const topics = await db.collection('Topic').find({ topicGroupId: groupId, active: true, ...(topicIds ? { _id: { $in: topicIds.map(id => new ObjectId(id)) } } : {}) }, { projection: { name: 1 } }).toArray();
  if (topicIds && topics.length !== new Set(topicIds).size) throw new HttpError(400, 'Выбрана недоступная тема');
  const eligible = { active: true, isReported: false, topicId: { $in: topics.map(t => t._id) } };
  const progress = await db.collection('UserTopicProgress').find({ userId: new ObjectId(user.id), topicId: { $in: topics.map(t => t._id) } }).toArray();
  const mastered = progress.flatMap(p => p.correctTaskIds || []);
  let tasks = await db.collection('Task').aggregate([{ $match: { ...eligible, ...(topicIds ? { _id: { $nin: mastered } } : {}) } }, { $sample: { size: 10 } }]).toArray();
  if (!tasks.length && mastered.length) tasks = await db.collection('Task').aggregate([{ $match: eligible }, { $sample: { size: 10 } }]).toArray();
  if (!tasks.length) throw new HttpError(422, 'В выбранных темах пока нет доступных заданий');
  const snapshots = tasks.map(t => ({ taskId: t._id, topicId: t.topicId, topicName: topics.find(topic => String(topic._id) === String(t.topicId))!.name,
    html: sanitizeContent(t.html), answer: t.answer, explanation: sanitizeContent(t.explanation || ''), line: t.line || '', source: t.source || '', disordered: !!t.disordered }));
  const id = new ObjectId();
  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection('Test').insertOne({ _id: id, userId: new ObjectId(user.id), topicGroupId: groupId, createdAt: new Date(), completedAt: null, isComplete: false, tasksIds: tasks.map(t => t._id), answers: [], taskCount: tasks.length, answeredCount: 0, correctCount: 0, snapshots, snapshotSource: 'recorded' }, { session });
      await db.collection('Task').updateMany({ _id: { $in: tasks.map(t => t._id) } }, { $addToSet: { testIDs: id } } as Document, { session });
    });
  } finally { await session.endSession(); }
  await invalidateStatistics(user.id);
  return String(id);
}

// Old attempts have no snapshots until the explicit data repair is applied.
// Freeze the previous revision in the same transaction as an administrative edit.
export async function editTask(id: string, data: Document) {
  const db = await getMongoDb(); const qid = new ObjectId(id);
  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      const task = await db.collection('Task').findOne({ _id: qid }, { session });
      if (!task) throw new HttpError(404, 'Задание не найдено');
      const topic = await db.collection('Topic').findOne({ _id: task.topicId }, { session, projection: { name: 1 } });
      const snapshot = { taskId: qid, topicId: task.topicId, topicName: topic?.name || 'Тема', html: sanitizeContent(task.html), answer: task.answer, explanation: sanitizeContent(task.explanation || ''), line: task.line || '', source: task.source || '', disordered: !!task.disordered };
      await db.collection('Test').updateMany({ tasksIds: qid, 'snapshots.taskId': { $ne: qid } }, { $push: { snapshots: snapshot }, $set: { snapshotSource: 'legacy-import' } } as Document, { session });
      if (String(task.topicId) !== String(data.topicId)) {
        await db.collection('UserTopicProgress').updateMany({ topicId: { $in: [task.topicId, new ObjectId(data.topicId)] } }, { $unset: { version: '' } }, { session });
      }
      await db.collection('Task').updateOne({ _id: qid }, { $set: { ...data, topicId: new ObjectId(data.topicId) } }, { session });
    });
  } finally { await session.endSession(); }
  return { id };
}

export async function editTopic(id: string, data: Document) {
  const db = await getMongoDb(); const topicId = new ObjectId(id);
  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      const topic = await db.collection('Topic').findOne({ _id: topicId }, { session });
      if (!topic) throw new HttpError(404, 'Тема не найдена');
      if (data.name !== topic.name) {
        const tasks = await db.collection('Task').find({ topicId }, { session }).toArray();
        if (tasks.length) await db.collection('Test').bulkWrite(tasks.map(task => ({ updateMany: {
          filter: { tasksIds: task._id, 'snapshots.taskId': { $ne: task._id } },
          update: { $push: { snapshots: { taskId: task._id, topicId, topicName: topic.name, html: sanitizeContent(task.html), answer: task.answer, explanation: sanitizeContent(task.explanation || ''), line: task.line || '', source: task.source || '', disordered: !!task.disordered } }, $set: { snapshotSource: 'legacy-import' } } as Document,
        } })), { session });
      }
      await db.collection('Topic').updateOne({ _id: topicId }, { $set: { ...data, topicGroupId: new ObjectId(data.topicGroupId) } }, { session });
    });
  } finally { await session.endSession(); }
  return { id };
}
export async function submitAnswer(user: SafeUser, testId: string, taskId: string, answer: string) {
  const db = await getMongoDb(); const tid = new ObjectId(testId); const qid = new ObjectId(taskId);
  const session = (await getMongoClient()).startSession();
  let correct = false;
  try {
    await session.withTransaction(async () => {
      const test = await db.collection('Test').findOne({ _id: tid, userId: new ObjectId(user.id) }, { session });
      if (!test) throw new HttpError(404, 'Тест не найден');
      if (test.isComplete) throw new HttpError(409, 'Тест уже завершён');
      if (!test.tasksIds.some((id: ObjectId) => id.equals(qid))) throw new HttpError(400, 'Задание не принадлежит тесту');
      const snapshot = (await attemptSnapshots(test, db, session)).find((t: Document) => String(t.taskId) === taskId);
      if (!snapshot || snapshot.missing) throw new HttpError(409, 'Задание недоступно');
      correct = checkAnswer(snapshot.answer, answer, snapshot.disordered);
      const updated = await db.collection('Test').updateOne({ _id: tid, userId: new ObjectId(user.id), isComplete: false, tasksIds: qid, answers: { $not: { $elemMatch: { taskId: qid } } } }, { $push: { answers: { taskId: qid, answer, correct } }, $set: { taskCount: test.tasksIds.length, answeredCount: uniqueAnswers(test.tasksIds, test.answers || []).length + 1, correctCount: uniqueAnswers(test.tasksIds, test.answers || []).filter(a => a.correct).length + (correct ? 1 : 0) } } as Document, { session });
      if (!updated.modifiedCount) throw new HttpError(409, 'Ответ уже принят или тест завершён');
    });
    return correct;
  } finally { await session.endSession(); }
}
async function updateProgress(db: Db, session: ClientSession, userId: ObjectId, topicIds: ObjectId[], answers: Array<{ taskId: unknown; correct: boolean }>) {
  const topics = await db.collection('Topic').find({ _id: { $in: topicIds } }, { session }).toArray();
  const tasks = await db.collection('Task').find({ topicId: { $in: topicIds } }, { session, projection: { topicId: 1, active: 1, isReported: 1 } }).toArray();
  const records = await db.collection('UserTopicProgress').find({ userId, topicId: { $in: topicIds } }, { session }).toArray();
  const needsBackfill = topicIds.filter(id => records.find(p => String(p.topicId) === String(id))?.version !== 2);
  const backfillTasks = tasks.filter(t => needsBackfill.some(id => id.equals(t.topicId))).map(t => t._id);
  // Old progress is rebuilt once. Validated progress only merges this attempt.
  const history = backfillTasks.length ? await db.collection('Test').find({ userId, isComplete: true, tasksIds: { $in: backfillTasks } }, { session, projection: { tasksIds: 1, answers: 1 } }).toArray() : [];
  const historical = new Set(history.flatMap(t => uniqueAnswers(t.tasksIds || [], t.answers || []).filter(a => a.correct).map(a => String(a.taskId))));
  const submitted = answers.filter(a => a.correct).map(a => String(a.taskId));
  for (const topicId of topicIds) {
    const record = records.find(p => String(p.topicId) === String(topicId));
    const correct = record?.version === 2 ? new Set([...(record.correctTaskIds || []).map(String), ...submitted]) : historical;
    const all = tasks.filter(t => String(t.topicId) === String(topicId));
    const eligible = all.filter(t => t.active && !t.isReported && topics.find(topic => topic._id.equals(topicId))?.active);
    const correctTaskIds = all.filter(t => correct.has(String(t._id))).map(t => t._id);
    const solved = eligible.filter(t => correct.has(String(t._id))).length;
    await db.collection('UserTopicProgress').updateOne({ userId, topicId }, { $set: { version: 2, percent: eligible.length ? Math.round(solved / eligible.length * 100) : 0, correctTaskIds, updatedAt: new Date() }, $setOnInsert: { _id: new ObjectId() } }, { upsert: true, session });
  }
}
export async function completeAttempt(user: SafeUser, testId: string) {
  const db = await getMongoDb(); const client = await getMongoClient(); const uid = new ObjectId(user.id); const tid = new ObjectId(testId);
  for (let attempt = 0; attempt < 4; attempt++) {
    const session = client.startSession();
    try {
      session.startTransaction();
      const test = await db.collection('Test').findOne({ _id: tid, userId: uid }, { session });
      if (!test) throw new HttpError(404, 'Тест не найден');
      if (test.isComplete) { await session.abortTransaction(); return { alreadyComplete: true }; }
      const answers = uniqueAnswers(test.tasksIds || [], test.answers || []);
      if (!test.tasksIds?.length || answers.length !== test.tasksIds.length) throw new HttpError(422, 'Ответьте на все задания перед завершением');
      const now = new Date(); const score = answers.filter(a => a.correct).length;
      await db.collection('Test').updateOne({ _id: tid, isComplete: false }, { $set: { isComplete: true, completedAt: now, answers, taskCount: test.tasksIds.length, answeredCount: answers.length, correctCount: score } }, { session });
      const recent = await db.collection('Test').find({ userId: uid, isComplete: true }, { session, projection: { tasksIds: 1, answers: 1 } }).sort({ completedAt: -1, _id: -1 }).limit(10).toArray();
      const lastAnswers = recent.flatMap(t => uniqueAnswers(t.tasksIds || [], t.answers || []));
      const percent = lastAnswers.length ? Math.round(lastAnswers.filter(a => a.correct).length / lastAnswers.length * 100) : 0;
      const accounted = await db.collection('User').updateOne({ _id: uid, isArchive: false }, { $inc: { score, testsCount: 1 }, $set: { percent }, $push: { scores: { score, createdAt: now, testId } } } as Document, { session });
      if (!accounted.matchedCount) throw new HttpError(401, 'Аккаунт недоступен');
      const snapshots = await attemptSnapshots(test, db, session);
      const topicIds = [...new Map(snapshots.filter((s: Document) => !s.missing).map((s: Document) => [String(s.topicId), s.topicId as ObjectId])).values()] as ObjectId[];
      await updateProgress(db, session, uid, topicIds, answers);
      await session.commitTransaction(); await invalidateStatistics(user.id); return { alreadyComplete: false, score };
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      if (error && typeof error === 'object' && 'hasErrorLabel' in error && typeof error.hasErrorLabel === 'function' && error.hasErrorLabel('TransientTransactionError') && attempt < 3) continue;
      throw error;
    } finally { await session.endSession(); }
  }
  throw new HttpError(409, 'Повторите завершение теста');
}
