const fs = require('node:fs');
const path = require('node:path');
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://127.0.0.1:27018/biotest?replicaSet=rs0&directConnection=true';
const stateFile = path.join(__dirname, 'ui-fixtures.json');
const prefix = 'rt-ui-';

async function main() {
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db();
    const command = process.argv[2];
    if (command === 'setup') {
      if (await db.collection('User').countDocuments({ username: /^rt-ui-/ })) {
        throw new Error('UI fixtures already exist; inspect or clean up before setup');
      }
      const groupId = new ObjectId('67962ae5e4f21c30e05aef91');
      if (!await db.collection('TopicGroup').findOne({ _id: groupId })) throw new Error('Original OGE topic group missing');
      const topicId = new ObjectId();
      const emptyTopicId = new ObjectId();
      await db.collection('Topic').insertMany([
        { _id: topicId, name: 'RT UI тема', section: 'Runtime review', active: true, topicGroupId: groupId },
        { _id: emptyTopicId, name: 'RT UI пустая тема', section: 'Runtime review', active: true, topicGroupId: groupId },
      ]);
      const users = ['student', 'admin', 'edit-a', 'edit-b'].map((role) => ({
        _id: new ObjectId(), username: prefix + role, name: prefix + role,
        admin: role === 'admin', createdAt: new Date(), lastAccess: new Date(),
        group: 'rt-ui', scores: [], score: 0, testsCount: 0, percent: 0,
        isArchive: false, topicGroupId: groupId,
      }));
      await db.collection('User').insertMany(users);
      const tasks = [
        { _id: new ObjectId(), html: '<p>RT UI question A: enter 123</p>', answer: '123' },
        { _id: new ObjectId(), html: '<p>RT UI question B: enter ABC</p>', answer: 'ABC' },
      ].map((task) => ({ ...task, topicId, line: 'rt-ui', source: 'rt-ui',
        explanation: '<p>RT UI explanation</p>', active: true, isReported: false,
        disordered: false, testIDs: [] }));
      await db.collection('Task').insertMany(tasks);
      const state = { topicId: String(topicId), emptyTopicId: String(emptyTopicId),
        users: Object.fromEntries(users.map((u) => [u.username, String(u._id)])),
        tasks: tasks.map((t) => String(t._id)) };
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
      console.log(JSON.stringify({ setup: 'ok', ...state }));
    } else if (command === 'snapshot') {
      const users = await db.collection('User').find({ username: /^rt-ui-/ }, {
        projection: { username: 1, name: 1, score: 1, testsCount: 1, percent: 1, scores: 1 },
      }).toArray();
      const ids = users.map((u) => u._id);
      const tests = await db.collection('Test').find({ userId: { $in: ids } }).toArray();
      console.log(JSON.stringify({ users, tests }, null, 2));
    } else if (command === 'cleanup') {
      const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : {};
      const trackedUserIds = Object.values(state.users || {}).map((id) => new ObjectId(id));
      const users = await db.collection('User').find({ $or: [
        { username: /^rt-ui-/ }, { _id: { $in: trackedUserIds } },
      ] }, { projection: { _id: 1 } }).toArray();
      const userIds = [...new Map([...trackedUserIds, ...users.map((u) => u._id)].map((id) => [String(id), id])).values()];
      const topicIds = [state.topicId, state.emptyTopicId].filter(Boolean).map((id) => new ObjectId(id));
      const deleted = {};
      for (const [name, filter] of [
        ['Test', { userId: { $in: userIds } }],
        ['UserTopicProgress', { $or: [{ userId: { $in: userIds } }, { topicId: { $in: topicIds } }] }],
        ['Task', { topicId: { $in: topicIds } }],
        ['Topic', { _id: { $in: topicIds } }],
        ['User', { _id: { $in: userIds } }],
      ]) deleted[name] = (await db.collection(name).deleteMany(filter)).deletedCount;
      console.log(JSON.stringify({ cleanup: deleted }));
    } else throw new Error('Use setup, snapshot or cleanup');
  } finally { await client.close(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
