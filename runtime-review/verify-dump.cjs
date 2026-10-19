const fs = require('node:fs');
const { MongoClient } = require('mongodb');
const { deserialize, EJSON } = require('bson');

const dump = '/Users/alexey/other/dumps/biotest-dump-30.05.26/biotest';
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
const encode = (doc) => JSON.stringify(canonical(EJSON.serialize(doc, { relaxed: false })));

(async () => {
  const client = await MongoClient.connect('mongodb://127.0.0.1:27018/biotest?replicaSet=rs0&directConnection=true');
  try {
    const report = {};
    for (const name of ['User', 'Test', 'Task', 'Topic', 'TopicGroup', 'UserTopicProgress']) {
      const buffer = fs.readFileSync(`${dump}/${name}.bson`);
      const original = new Map();
      for (let pos = 0; pos < buffer.length;) {
        const size = buffer.readInt32LE(pos);
        const doc = deserialize(buffer.subarray(pos, pos + size));
        original.set(String(doc._id), encode(doc)); pos += size;
      }
      let matched = 0, changed = 0, extra = 0;
      for await (const doc of client.db().collection(name).find({})) {
        if (!original.has(String(doc._id))) { extra++; continue; }
        if (original.get(String(doc._id)) === encode(doc)) matched++; else changed++;
      }
      report[name] = { original: original.size, unchanged: matched, changed, missing: original.size - matched - changed, extra };
    }
    console.log(JSON.stringify(report, null, 2));
    fs.writeFileSync(`${__dirname}/dump-integrity.json`, JSON.stringify(report, null, 2) + '\n');
    if (Object.values(report).some((v) => v.changed || v.missing || v.extra)) process.exitCode = 1;
  } finally { await client.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
