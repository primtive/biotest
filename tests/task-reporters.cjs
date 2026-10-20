require('@next/env').loadEnvConfig(process.cwd(), true);
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { MongoClient, ObjectId } = require('mongodb');
const { migrateTaskReporters } = require('../scripts/migrate-task-reporters.cjs');
const uri = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(uri.hostname)) throw Error('Tests require localhost');
uri.pathname = '/biotest_reporters_test_' + crypto.randomBytes(8).toString('hex');
(async () => {
  const client = await MongoClient.connect(uri.toString()), db = client.db();
  try {
    const admin = new ObjectId(), sender = new ObjectId();
    const tasks = [
      { _id: new ObjectId(), isReported: true },
      { _id: new ObjectId(), isReported: true, reportedByIds: [] },
      { _id: new ObjectId(), isReported: true, reportedByIds: null },
      { _id: new ObjectId(), isReported: true, reportedByIds: [sender] },
      { _id: new ObjectId(), isReported: false },
      { _id: new ObjectId(), isReported: false, reportedByIds: [sender] },
    ];
    await db.collection('Task').insertMany(tasks);
    await assert.rejects(migrateTaskReporters(db), /Exactly one primitive_admin/);
    assert.deepEqual(await db.collection('Task').find({}).toArray(), tasks);
    await db.collection('User').insertOne({ _id: admin, username: 'primitive_admin' });
    assert.equal((await migrateTaskReporters(db)).attributedTasks, 3);
    const migrated = await db.collection('Task').find({}).toArray();
    for (const task of migrated.slice(0, 3)) assert.deepEqual(task.reportedByIds, [admin]);
    assert.deepEqual(migrated.slice(3), tasks.slice(3));
    assert.equal((await migrateTaskReporters(db)).attributedTasks, 0);
    console.log('PASS legacy attribution, missing-owner failure without writes, known reporter preservation and repeatable migration');
  } finally { await db.dropDatabase(); await client.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
