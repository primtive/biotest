// Export a migrated, verified copy. Existing application databases and dumps are never overwritten.
require('tsx/cjs');
require('@next/env').loadEnvConfig(process.cwd(), true);
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');
const { migrate } = require('./migrate-v3.cjs');
const { readHistory } = require('../lib/history.ts');
const { PrismaClient } = require('@prisma/client');
const sourceUri = process.env.DATABASE_URL;
if (!sourceUri || !['127.0.0.1', 'localhost'].includes(new URL(sourceUri).hostname)) throw Error('Export requires localhost');
const name = new URL(sourceUri).pathname.slice(1);
if (!/^biotest_new2_work(?:_[a-z0-9]+)?$/.test(name)) throw Error('Use an isolated biotest_new2_work database');
const destination = process.env.NEW2_OUTPUT || path.join(os.homedir(), 'other/dumps/biotest-dump-30.05.26-new2');
const stage = path.join(path.dirname(destination), '.' + path.basename(destination) + '-' + crypto.randomBytes(6).toString('hex'));
const verifyName = 'biotest_new2_verify_' + crypto.randomBytes(6).toString('hex');
const connection = new URL(sourceUri); connection.pathname = '/';
const log = path.resolve('.local/new2-export.log');
process.umask(0o077);
function run(command, args) { const r = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); fs.appendFileSync(log, `\n${command} exit=${r.status}\n${r.stdout || ''}${r.stderr || ''}`); if (r.status !== 0 || r.error) throw Error(command + ' failed; see ' + log); return r.stdout; }
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const encode = v => JSON.stringify(canonical(EJSON.serialize(v, { relaxed: false })));
async function fingerprint(db, originalOnly = false) {
  const result = {};
  for (const { name } of (await db.listCollections({}, { nameOnly: true }).toArray()).sort((a,b) => a.name.localeCompare(b.name))) {
    if (originalOnly && ['LoginThrottle', 'StatisticsCache', 'StatisticsRevision'].includes(name)) continue;
    const hash = crypto.createHash('sha256'); let count = 0;
    for await (const doc of db.collection(name).find({}).sort({ _id: 1 })) {
      if (originalOnly && name === 'User') { delete doc.password; delete doc.authVersion; }
      if (originalOnly && name === 'Test') { delete doc.taskCount; delete doc.answeredCount; delete doc.correctCount; }
      hash.update(encode(doc)); hash.update('\n'); count++;
    }
    result[name] = { count, sha256: hash.digest('hex') };
    if (!originalOnly) result[name].indexes = (await db.collection(name).indexes()).map(i => ({ key: i.key, name: i.name, unique: !!i.unique, expireAfterSeconds: i.expireAfterSeconds ?? null })).sort((a,b) => a.name.localeCompare(b.name));
  }
  return result;
}
(async () => {
  assert.ok(!fs.existsSync(destination), 'Output already exists; refusing to overwrite');
  fs.mkdirSync(stage, { recursive: false, mode: 0o700 });
  const client = await MongoClient.connect(sourceUri), db = client.db(), verify = client.db(verifyName);
  try {
    const baselineFile = path.resolve('.local/new2-source-baseline.json');
    const original = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : await fingerprint(db, true);
    if (!fs.existsSync(baselineFile)) fs.writeFileSync(baselineFile, JSON.stringify(original, null, 2));
    console.log('Original document fingerprints recorded; migrating isolated copy');
    const changes = await migrate(db);
    console.log(JSON.stringify(changes));
    assert.deepEqual(await fingerprint(db, true), original, 'Original records must be unchanged except password removal and added summaries');
    assert.equal(await db.collection('User').countDocuments({ password: { $exists: true } }), 0);
    assert.equal(await db.collection('Test').countDocuments({ $or: [{ taskCount: { $exists: false } }, { answeredCount: { $exists: false } }, { correctCount: { $exists: false } }] }), 0);
    const collections = await fingerprint(db);
    console.log('Document preservation, password removal and summary coverage verified');
    const start = performance.now(); const history = await readHistory(db, { page: '1', pageSize: '20' });
    const historyMs = Math.round((performance.now() - start) * 100) / 100;
    assert.ok(history.items.length <= 20); assert.ok(Buffer.byteLength(JSON.stringify(history)) < 20000);
    const prisma = new PrismaClient({ datasources: { db: { url: sourceUri } } });
    try { await prisma.$transaction(async tx => { assert.equal(await tx.test.count(), original.Test.count); await tx.statisticsCache.findFirst(); await tx.user.findFirst({ select: { username: true } }); }); } finally { await prisma.$disconnect(); }
    run('mongodump', ['--uri', sourceUri, '--out', stage]);
    fs.renameSync(path.join(stage, name), path.join(stage, 'biotest'));
    run('mongorestore', ['--uri', connection.toString(), '--dir', stage, '--nsInclude=biotest.*', '--nsFrom=biotest.*', '--nsTo=' + verifyName + '.*', '--stopOnError']);
    assert.deepEqual(await fingerprint(verify), collections);
    const hashes = {};
    for (const file of fs.readdirSync(path.join(stage, 'biotest'))) { const p = path.join(stage, 'biotest', file); fs.chmodSync(p, 0o600); hashes['biotest/' + file] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
    const summary = { applicationCommit: run('git', ['rev-parse', 'HEAD']).trim(), workingTreeDirty: Boolean(run('git', ['status', '--porcelain']).trim()), createdAt: new Date().toISOString(), source: 'fresh production biotest_v2 copy, 2026-10-20', migrationVersion: 3, changes, originalDataPreserved: true, passwordsRemoved: true, restoredExportMatches: true, prismaTransactionPassed: true, historyFirstPageMs: historyMs, historyResponseBytes: Buffer.byteLength(JSON.stringify(history)), collections, filesSha256: hashes };
    fs.writeFileSync(path.join(stage, 'migration-summary.json'), JSON.stringify(summary, null, 2) + '\n');
    fs.writeFileSync(path.join(stage, 'README.md'), '# BioTest new2\n\nСвежая копия production с миграцией версии 3. Production не изменялся.\n\nПользовательских паролей нет: вход только по логину. Роли, аккаунты, тесты, снимки, баллы, прогресс и остальные исходные данные сохранены. Добавлены счётчики тестов для быстрой истории, индексы и коллекции StatisticsCache/StatisticsRevision. Кэш статистики прогрет для всей истории и учебных лет с 1 августа по Москве. Изменение данных инвалидирует кэш через revision; граница дня обновляет всю историю.\n\nВосстанавливать сначала в новую базу, не поверх существующей. Например, SERVER_URI должен указывать на сервер без имени базы в пути и содержать действующие параметры авторизации и replica set:\n\n```sh\nmongorestore --uri "$SERVER_URI" --dir "/path/to/biotest-dump-30.05.26-new2" --nsInclude="biotest.*" --nsFrom="biotest.*" --nsTo="biotest_v3.*" --stopOnError\n```\n\nЗатем указать biotest_v3 в DATABASE_URL новой версии приложения. Индексы входят в дамп. Определения Prisma сами по себе миграцию MongoDB не выполняют. Не запускать repair из старой версии приложения: актуальный repair уже включает v3. Для отдельного повторного применения использовать scripts/migrate-v3.cjs.\n\nФайл migration-summary.json содержит проверки сохранения данных, контрольные суммы всех файлов, сверку полного повторного восстановления, счётчики коллекций и замер истории. Секреты MongoDB и NextAuth в дамп приложения не включены.\n');
    fs.chmodSync(path.join(stage, 'biotest'), 0o700);
    fs.renameSync(stage, destination);
    console.log('Export ready: ' + destination); console.log('History first page: ' + historyMs + 'ms, ' + summary.historyResponseBytes + ' bytes');
  } finally { await verify.dropDatabase(); await client.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
