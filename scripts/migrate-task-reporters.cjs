const { MongoClient } = require('mongodb');

// Keep known reporters intact; only attribute legacy anonymous flags.
async function migrateTaskReporters(db) {
  const anonymous = { isReported: true, $or: [{ reportedByIds: null }, { reportedByIds: { $size: 0 } }] };
  const remaining = await db.collection('Task').countDocuments(anonymous);
  if (!remaining) return { attributedTasks: 0, username: 'primitive_admin' };
  const users = await db.collection('User').find({ username: 'primitive_admin' }, { projection: { _id: 1 } }).limit(2).toArray();
  if (users.length !== 1) throw Error('Exactly one primitive_admin must exist; no tasks were changed');
  const result = await db.collection('Task').updateMany(anonymous, { $set: { reportedByIds: [users[0]._id] } });
  return { attributedTasks: result.modifiedCount, username: 'primitive_admin', userId: String(users[0]._id) };
}
module.exports = { migrateTaskReporters };

if (require.main === module) (async () => {
  require('@next/env').loadEnvConfig(process.cwd(), true);
  const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
  const uri = process.env.DATABASE_URL;
  if (!uri || !['localhost', '127.0.0.1'].includes(new URL(uri).hostname)) throw Error('This migration requires an explicit localhost DATABASE_URL');
  if (!new URL(uri).pathname.slice(1)) throw Error('DATABASE_URL must name the local database');
  if (!process.argv.includes('--apply')) throw Error('Explicit --apply is required; a backup will be made first');
  fs.mkdirSync('.local', { recursive: true, mode: 0o700 });
  const backup = path.resolve('.local', 'before-task-reporters-' + Date.now() + '.archive');
  const config = backup + '.yml';
  fs.writeFileSync(config, 'uri: ' + JSON.stringify(uri) + '\n', { mode: 0o600, flag: 'wx' });
  const fd = fs.openSync(backup, 'wx', 0o600);
  let saved;
  try { saved = spawnSync('mongodump', ['--config', config, '--archive'], { stdio: ['ignore', fd, 'pipe'] }); }
  finally { fs.closeSync(fd); fs.unlinkSync(config); }
  if (saved.status !== 0 || saved.error) { fs.unlinkSync(backup); throw Error('Backup failed; no data changed'); }
  console.log('Local backup saved: ' + backup);
  const client = await MongoClient.connect(uri);
  try { console.log(JSON.stringify(await migrateTaskReporters(client.db()), null, 2)); }
  finally { await client.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
