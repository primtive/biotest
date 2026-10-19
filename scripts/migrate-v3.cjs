require('tsx/cjs');
require('@next/env').loadEnvConfig(process.cwd(), true);
const { MongoClient } = require('mongodb');
const { uniqueAnswers } = require('../lib/grading.ts');
const { statisticsPeriods, readStatistics, bumpStatisticsRevision } = require('../lib/statistics-cache.ts');
async function migrate(db, { warm = true } = {}) {
  const users = await db.collection('User').updateMany({}, { $unset: { password: '', authVersion: '' } });
  if ((await db.listCollections({ name: 'LoginThrottle' }).toArray()).length) await db.collection('LoginThrottle').drop();
  let batch = [], tests = 0;
  for await (const test of db.collection('Test').find({}, { projection: { tasksIds: 1, answers: 1 } })) {
    const answers = uniqueAnswers(test.tasksIds || [], test.answers || []);
    batch.push({ updateOne: { filter: { _id: test._id }, update: { $set: { taskCount: (test.tasksIds || []).length, answeredCount: answers.length, correctCount: answers.filter(a => a.correct).length } } } });
    if (batch.length >= 500) { await db.collection('Test').bulkWrite(batch); tests += batch.length; batch = []; }
  }
  if (batch.length) { await db.collection('Test').bulkWrite(batch); tests += batch.length; }
  for (const [collection, key] of [
    ['Test', { createdAt: -1, _id: -1 }], ['Test', { userId: 1, createdAt: -1, _id: -1 }],
    ['Test', { isComplete: 1, completedAt: 1 }], ['Test', { userId: 1, isComplete: 1, completedAt: -1, _id: -1 }],
    ['User', { isArchive: 1, admin: -1, _id: 1 }], ['Topic', { name: 1, _id: 1 }],
    ['Task', { isReported: -1, _id: 1 }], ['StatisticsCache', { updatedAt: 1 }],
  ]) await db.collection(collection).createIndex(key);
  await bumpStatisticsRevision(db);
  let cached = 0;
  if (warm) {
    const { years } = await statisticsPeriods(db);
    const groups = await db.collection('TopicGroup').find({}, { projection: { _id: 1 } }).toArray();
    const users = await db.collection('User').find({ isArchive: false }, { projection: { _id: 1 } }).toArray();
    for (const period of ['all', ...years]) {
      for (const group of [undefined, ...groups.map(g => String(g._id))]) { await readStatistics(db, period, undefined, group); cached++; }
      for (const user of users) { await readStatistics(db, period, String(user._id)); cached++; }
    }
  }
  return { migrationVersion: 3, passwordsRemoved: users.modifiedCount, testsWithSummary: tests, cachedStatistics: cached };
}
module.exports = { migrate };
if (require.main === module) (async () => {
  if (!process.argv.includes('--apply')) throw Error('Explicit --apply is required; first make a database backup');
  const uri = process.env.DATABASE_URL;
  if (!uri) throw Error('DATABASE_URL is required');
  if (!['127.0.0.1', 'localhost'].includes(new URL(uri).hostname) && !process.argv.includes('--allow-remote')) throw Error('Remote migration requires --allow-remote');
  const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
  fs.mkdirSync('.local', { recursive: true, mode: 0o700 });
  const backup = path.resolve('.local', 'before-v3-' + Date.now() + '.archive');
  const config = backup + '.yml';
  fs.writeFileSync(config, 'uri: ' + JSON.stringify(uri) + '\n', { mode: 0o600, flag: 'wx' });
  const fd = fs.openSync(backup, 'wx', 0o600); let saved;
  try { saved = spawnSync('mongodump', ['--config', config, '--archive'], { stdio: ['ignore', fd, 'pipe'] }); }
  finally { fs.closeSync(fd); fs.unlinkSync(config); }
  if (saved.status !== 0 || saved.error) { fs.unlinkSync(backup); throw Error('Backup failed; no data changed'); }
  console.log('Backup saved: ' + backup);
  const c = await MongoClient.connect(uri);
  try { console.log(JSON.stringify(await migrate(c.db(), { warm: !process.argv.includes('--no-warm') }), null, 2)); }
  finally { await c.close(); }
})().catch(e => { console.error(e.name, e.code || e.message); process.exitCode = 1; });
