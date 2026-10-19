// Exercise the repair CLI against a disposable synthetic database, never the dump.
require('@next/env').loadEnvConfig(process.cwd(), true);
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { MongoClient, ObjectId, Long } = require('mongodb');
const source = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(source.hostname)) throw Error('Migration tests require localhost');
const name = 'biotest_repair_test_' + crypto.randomUUID().replaceAll('-', '');
source.pathname = '/' + name;
const uri = source.toString();
const backups = [];
function run(apply = false) {
  const output = execFileSync(process.execPath, ['scripts/database.cjs', ...(apply ? ['--apply'] : [])], { env: { ...process.env, DATABASE_URL: uri }, encoding: 'utf8' });
  const result = JSON.parse(output);
  if (result.backup) backups.push(result.backup);
  return result;
}
(async () => {
  const client = await MongoClient.connect(uri);
  const db = client.db();
  try {
    assert.equal(db.databaseName, name);
    const userId = new ObjectId(), otherId = new ObjectId(), groupId = new ObjectId(), topicId = new ObjectId();
    const taskA = new ObjectId(), taskB = new ObjectId(), missingTask = new ObjectId();
    const testA = new ObjectId(), testB = new ObjectId();
    const now = new Date();
    await db.collection('TopicGroup').insertOne({ _id: groupId, name: 'Synthetic' });
    await db.collection('Topic').insertOne({ _id: topicId, name: 'Synthetic topic', active: true, topicGroupId: groupId });
    const baseUser = { username: 'duplicate', admin: false, isArchive: false, topicGroupId: groupId, createdAt: now, lastAccess: now, group: '', scores: [], score: 0, testsCount: 0, percent: 0 };
    await db.collection('User').insertMany([
      { ...baseUser, _id: userId, name: 'A', score: 123, testsCount: 99, scores: [{ score: Long.fromString('5000000000'), createdAt: now, testId: '' }, { score: 7, createdAt: now, testId: String(testA) }, { score: 7, createdAt: now, testId: String(testA) }] },
      { ...baseUser, _id: otherId, name: 'B' },
    ]);
    await db.collection('User').createIndex({ name: 1 }, { unique: true });
    await db.collection('Task').insertMany([taskA, taskB].map((_id, i) => ({ _id, topicId, html: '<p>Current</p>', answer: 'current', active: true, isReported: !!i, testIDs: [] })));
    const baseTest = { userId, topicGroupId: groupId, createdAt: now, completedAt: now, isComplete: true };
    await db.collection('Test').insertMany([
      { ...baseTest, _id: testA, tasksIds: [taskA], answers: [{ taskId: taskA, answer: 'wrong', correct: false }, { taskId: taskA, answer: 'current', correct: true }, { taskId: taskB, answer: 'foreign', correct: true }] },
      { ...baseTest, _id: testB, tasksIds: [taskA, taskB], answers: [taskA, taskB].map(taskId => ({ taskId, answer: 'old', correct: true })), snapshots: [{ taskId: taskA, topicId, topicName: 'Original topic', html: '<p>Original snapshot</p>', answer: 'old', explanation: '', line: '', source: '', disordered: false }] },
      { ...baseTest, _id: new ObjectId(), isComplete: false, completedAt: null, tasksIds: [], answers: [] },
      { ...baseTest, _id: new ObjectId(), isComplete: false, completedAt: null, tasksIds: [missingTask], answers: [] },
    ]);
    await db.collection('UserTopicProgress').insertMany([0, 1].map(() => ({ _id: new ObjectId(), userId, topicId, correctTaskIds: [], percent: 0, updatedAt: now })));
    const dry = run();
    assert.equal(dry.users, 2); assert.equal(dry.tests, 4); assert.equal(dry.duplicateUsernames, 1); assert.equal(dry.duplicateAnswerEntries, 2);
    for (let iteration = 0; iteration < 2; iteration++) {
      const result = run(true);
      assert.ok(fs.statSync(result.backup).size > 0); assert.equal(fs.statSync(result.backup).mode & 0o777, 0o600);
      execFileSync('mongorestore', ['--uri', uri, '--archive=' + result.backup, '--dryRun'], { stdio: 'ignore' });
      const user = await db.collection('User').findOne({ _id: userId });
      assert.equal(Number(user.score), 5000000002); assert.equal(user.testsCount, 2); assert.equal(user.percent, 67); assert.equal(user.scores.length, 3);
      assert.equal(Number(user.scores.find(s => !s.testId).score), 5000000000);
      const a = await db.collection('Test').findOne({ _id: testA });
      assert.equal(a.answers.length, 1); assert.equal(a.answers[0].correct, false);
      const b = await db.collection('Test').findOne({ _id: testB });
      assert.equal(b.snapshots.length, 2); assert.equal(b.snapshots[0].answer, 'old'); assert.equal(b.snapshots[0].html, '<p>Original snapshot</p>');
      const missing = await db.collection('Test').findOne({ tasksIds: missingTask }); assert.equal(missing.snapshots[0].missing, true);
      const progress = await db.collection('UserTopicProgress').find({ userId, topicId }).toArray();
      assert.equal(progress.length, 1); assert.equal(progress[0].percent, 100); assert.equal(progress[0].version, 2);
      assert.equal(new Set((await db.collection('User').find({}).toArray()).map(u => u.username)).size, 2);
      assert.equal((await db.collection('Task').findOne({ _id: taskA })).testIDs.length, 2);
      const indexes = await db.collection('Test').indexes(); assert.ok(indexes.some(i => i.key.tasksIds));
      console.log(`PASS isolated repair iteration ${iteration + 1}: backup, idempotency, large manual score, duplicate answers, partial snapshots, progress, indexes`);
    }
  } finally {
    assert.equal(db.databaseName, name);
    await db.dropDatabase();
    await client.close();
    for (const backup of backups) fs.unlinkSync(backup);
    console.log('Disposable synthetic database and its backups removed');
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
