require('tsx/cjs');
require('@next/env').loadEnvConfig(process.cwd(), true);
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { MongoClient, ObjectId } = require('mongodb');
const { migrate } = require('../scripts/migrate-v3.cjs');
const { readStatistics, bumpStatisticsRevision } = require('../lib/statistics-cache.ts');
const { readHistory } = require('../lib/history.ts');
const url = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw Error('V3 tests require localhost');
url.pathname = '/biotest_v3_test_' + crypto.randomBytes(8).toString('hex');
(async () => {
  let testAggregations = 0;
  const c = await MongoClient.connect(url.toString(), { monitorCommands: true });
  c.on('commandStarted', e => { if (e.commandName === 'aggregate' && e.command.aggregate === 'Test') testAggregations++; });
  const db = c.db();
  try {
    const user = new ObjectId(), archived = new ObjectId(), group = new ObjectId(), topic = new ObjectId(), task = new ObjectId();
    await db.collection('User').insertMany([{ _id: user, name: 'Student', username: 'student', admin: false, isArchive: false, topicGroupId: group, password: 'old-hash' }, { _id: archived, name: 'Archive', username: 'archive', admin: false, isArchive: true, topicGroupId: group, password: 'old-hash' }]);
    await db.collection('TopicGroup').insertOne({ _id: group, name: 'ЕГЭ' });
    await db.collection('Topic').insertOne({ _id: topic, active: true, topicGroupId: group });
    await db.collection('Task').insertOne({ _id: task, topicId: topic, active: true, isReported: false });
    const base = { userId: user, topicGroupId: group, tasksIds: [task], answers: [{ taskId: task, correct: true, answer: '1' }], isComplete: true, snapshots: [{ taskId: task, html: '<p>Immutable</p>' }] };
    const records = [
      { ...base, _id: new ObjectId(), createdAt: new Date('2026-07-31T20:50:00Z'), completedAt: new Date('2026-07-31T20:59:00Z') },
      { ...base, _id: new ObjectId(), createdAt: new Date('2026-07-31T20:59:00Z'), completedAt: new Date('2026-07-31T21:01:00Z') },
      { ...base, _id: new ObjectId(), createdAt: new Date('2026-07-31T21:00:00Z'), completedAt: new Date('2026-07-31T21:02:00Z') },
      { ...base, _id: new ObjectId(), createdAt: new Date('2026-08-02T21:00:00Z'), completedAt: null, isComplete: false, answers: [] },
    ];
    await db.collection('Test').insertMany(records);
    const migrated = await migrate(db);
    assert.equal(migrated.passwordsRemoved, 2); assert.equal(await db.collection('User').countDocuments({ password: { $exists: true } }), 0);
    const before = await readStatistics(db, '2025', String(user));
    const after = await readStatistics(db, '2026', String(user));
    assert.equal(before.startedCount, 2); assert.equal(before.completedCount, 1);
    assert.equal(after.startedCount, 2); assert.equal(after.completedCount, 2); assert.equal(after.correctCount, 2);
    const all = await readStatistics(db, 'all', String(user)); assert.equal(all.completedCount, 3);
    const admin = await readStatistics(db, '2026'); assert.equal(admin.userCount, 1); assert.equal(admin.taskCount, 1);
    const aggregates = testAggregations;
    await readStatistics(db, '2026', String(user)); assert.equal(testAggregations, aggregates, 'Warm read must not aggregate Test');
    await bumpStatisticsRevision(db); await readStatistics(db, '2026', String(user)); assert.ok(testAggregations > aggregates);
    console.log('PASS academic boundaries, cross-year completions, all history, persistent cache and revision invalidation');
    const again = await migrate(db, { warm: false }); assert.equal(again.passwordsRemoved, 0);
    for (const original of records) { const stored = await db.collection('Test').findOne({ _id: original._id }); assert.deepEqual(stored.snapshots, original.snapshots); assert.deepEqual(stored.answers, original.answers); assert.equal(stored.taskCount, 1); }
    console.log('PASS repeatable migration preserves answers/snapshots and removes all user password fields');
    const extra = Array.from({ length: 25 }, (_, i) => ({ ...base, _id: new ObjectId(), userId: i < 5 ? archived : user, createdAt: new Date('2025-01-01T00:00:00Z'), completedAt: new Date('2025-01-01T00:01:00Z') }));
    await db.collection('Test').insertMany(extra);
    const first = await readHistory(db, { page: '1', pageSize: '10' });
    const second = await readHistory(db, { page: '2', pageSize: '10' });
    assert.equal(first.pagination.total, 24); assert.equal(first.items.length, 10); assert.equal(second.items.length, 10);
    assert.equal(first.items.some(a => second.items.some(b => a.id === b.id)), false);
    const filtered = await readHistory(db, { from: '2026-08-01', to: '2026-08-01' }, String(user)); assert.equal(filtered.pagination.total, 24, 'Legacy date parameters must not hide history');
    assert.ok(first.items.every(row => !('answers' in row) && !('snapshots' in row)));
    assert.ok(Buffer.byteLength(JSON.stringify(first)) < 10000);
    await assert.rejects(() => readHistory(db, { pageSize: '10000' }));
    console.log('PASS bounded history pages, no overlapping rows, archived-user exclusion, unfiltered history and compact payload');
  } finally { await db.dropDatabase(); await c.close(); console.log('Disposable V3 fixture database removed'); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
