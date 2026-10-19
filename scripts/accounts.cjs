require('@next/env').loadEnvConfig(process.cwd(), true);
const fs = require('node:fs');
const { MongoClient, ObjectId } = require('mongodb');
(async () => {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw Error('DATABASE_URL required');
  const local = process.argv.includes('--local');
  if (local && !['localhost', '127.0.0.1'].includes(new URL(uri).hostname)) throw Error('--local requires localhost');
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db(), group = await db.collection('TopicGroup').findOne({});
    if (!group) throw Error('Restore the database first');
    const inputs = local ? [{ username: 'local-admin', admin: true }, { username: 'local-student', admin: false }] : [JSON.parse(fs.readFileSync(0, 'utf8'))];
    for (const input of inputs) {
      const username = input.username?.trim();
      if (!username || username.length > 128) throw Error('Invalid username');
      if (await db.collection('User').findOne({ username })) continue;
      await db.collection('User').insertOne({ _id: new ObjectId(), username, name: input.name || username, admin: !!input.admin, topicGroupId: group._id, createdAt: new Date(), lastAccess: new Date(), group: local ? 'local' : '', score: 0, scores: [], testsCount: 0, percent: 0, isArchive: false });
    }
    await db.collection('StatisticsRevision').updateOne({ _id: 'global' }, { $inc: { revision: 1 }, $set: { updatedAt: new Date() } }, { upsert: true });
    console.log('Accounts ready; sign in using the username');
  } finally { await client.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
