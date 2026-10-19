// Disposable local fixtures for manual CUA browser checks. Never touches dump users.
require('@next/env').loadEnvConfig(process.cwd(), true);
const fs = require('node:fs');
const crypto = require('node:crypto');
const { MongoClient, ObjectId } = require('mongodb');

const stateFile = '.local/ui-fixtures.json';
const uri = process.env.DATABASE_URL;
if (!uri || !['localhost', '127.0.0.1'].includes(new URL(uri).hostname)) throw Error('UI tests require localhost');
(async () => {
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    const command = process.argv[2];
    if (command === 'setup') {
      if (fs.existsSync(stateFile)) throw Error('Clean up previous UI fixtures first');
      const prefix = 'rt-reg-ui-' + crypto.randomUUID().slice(0, 8);
      const group = await db.collection('TopicGroup').findOne({});
      if (!group) throw Error('Restore database first');
      const topicId = new ObjectId();
      const state = { prefix, groupId: String(group._id), topicId: String(topicId) };
      fs.mkdirSync('.local', { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
      await db.collection('Topic').insertOne({ _id: topicId, name: prefix + ' тема', section: prefix, active: true, topicGroupId: group._id });
      for (const admin of [false, true]) {
        const username = prefix + (admin ? '-admin' : '-student');
        await db.collection('User').insertOne({ _id: new ObjectId(), username, name: username, admin, group: prefix, topicGroupId: group._id, isArchive: false, createdAt: new Date(), lastAccess: new Date(), scores: [], score: 0, testsCount: 0, percent: 0 });
      }
      await db.collection('Task').insertMany(['A', 'B'].map(label => ({ _id: new ObjectId(), topicId, html: `<p>${prefix} question ${label}: enter 123</p>`, answer: '123', explanation: '<p>UI regression explanation</p>', line: '1', source: prefix, active: true, isReported: false, disordered: false, testIDs: [] })));
      console.log('Disposable UI fixtures ready; credentials in ignored .local/ui-fixtures.json');
    } else {
      if (!fs.existsSync(stateFile)) throw Error('No UI fixture state');
      const state = JSON.parse(fs.readFileSync(stateFile));
      const users = await db.collection('User').find({ group: state.prefix }, { projection: { _id: 1, username: 1, score: 1, testsCount: 1, percent: 1 } }).toArray();
      const ids = users.map(u => u._id);
      if (command === 'snapshot') {
        const tests = await db.collection('Test').find({ userId: { $in: ids } }, { projection: { _id: 1, isComplete: 1, tasksIds: 1, answers: 1 } }).toArray();
        console.log(JSON.stringify({ users, tests }, null, 2));
      } else if (command === 'cleanup') {
        await db.collection('Test').deleteMany({ userId: { $in: ids } });
        await db.collection('UserTopicProgress').deleteMany({ userId: { $in: ids } });
        await db.collection('ScoreAdjustment').deleteMany({ userId: { $in: ids } });
        await db.collection('UsernameReservation').deleteMany({ ownerId: { $in: ids } });
        await db.collection('Task').deleteMany({ source: state.prefix });
        await db.collection('Topic').deleteMany({ _id: new ObjectId(state.topicId) });
        await db.collection('User').deleteMany({ _id: { $in: ids } });
        fs.unlinkSync(stateFile);
        console.log('Disposable UI fixtures removed');
      } else throw Error('Use setup, snapshot or cleanup');
    }
  } finally { await client.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
