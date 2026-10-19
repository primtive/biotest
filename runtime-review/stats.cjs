// Synthetic-only runtime audit. Cookies stay in memory; no response documents are saved.
// Run: node runtime-review/stats.cjs
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { MongoClient, ObjectId } = require('mongodb');

const PREFIX = 'rt-stats-';
const BASE = 'http://localhost:3001';
const URI = 'mongodb://127.0.0.1:27018/biotest?replicaSet=rs0&directConnection=true';
const client = new MongoClient(URI);
const results = { fixturePrefix: PREFIX, environment: 'local Next.js development server; restored dump', checks: {}, benchmarks: {}, explain: {} };
const groupId = new ObjectId('67962ae5e4f21c30e05aef91');
let db;

async function cleanup() {
  const users = await db.collection('User').find({ username: { $regex: '^' + PREFIX } }, { projection: { _id: 1 } }).toArray();
  const topics = await db.collection('Topic').find({ name: { $regex: '^' + PREFIX } }, { projection: { _id: 1 } }).toArray();
  const userIds = users.map(x => x._id), topicIds = topics.map(x => x._id);
  await db.collection('UserTopicProgress').deleteMany({ $or: [{ userId: { $in: userIds } }, { topicId: { $in: topicIds } }] });
  await db.collection('Test').deleteMany({ userId: { $in: userIds } });
  await db.collection('Task').deleteMany({ source: PREFIX + 'fixture' });
  await db.collection('Topic').deleteMany({ _id: { $in: topicIds } });
  await db.collection('User').deleteMany({ _id: { $in: userIds } });
}

function user(suffix, admin = false) {
  const now = new Date();
  return { _id: new ObjectId(), username: PREFIX + suffix, name: PREFIX + suffix, admin, createdAt: now, lastAccess: now, score: 0, testsCount: 0, percent: 0, isArchive: false, group: PREFIX, scores: [], topicGroupId: groupId };
}
async function topic(suffix, count, reportedLast = false) {
  const _id = new ObjectId();
  await db.collection('Topic').insertOne({ _id, name: PREFIX + suffix, active: true, section: PREFIX, topicGroupId: groupId });
  const tasks = Array.from({ length: count }, (_, i) => ({ _id: new ObjectId(), html: '<p>' + PREFIX + suffix + '-' + i + '</p>', answer: String(i + 1), topicId: _id, line: '', source: PREFIX + 'fixture', explanation: '', active: true, disordered: false, isReported: reportedLast && i === count - 1, testIDs: [] }));
  await db.collection('Task').insertMany(tasks);
  return { _id, tasks };
}
function test(u, tasks, correctCount, createdAt, complete = false) {
  return { _id: new ObjectId(), userId: u._id, topicGroupId: groupId, createdAt, ...(complete ? { completedAt: new Date(createdAt.getTime() + 60000) } : {}), isComplete: complete, tasksIds: tasks.map(t => t._id), answers: tasks.map((t, i) => ({ taskId: t._id, answer: i < correctCount ? t.answer : 'wrong', correct: i < correctCount })) };
}

function session() {
  const jar = new Map();
  return async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (jar.size) headers.set('cookie', [...jar].map(([k, v]) => k + '=' + v).join('; '));
    const response = await fetch(BASE + url, { ...options, headers, redirect: 'manual', signal: AbortSignal.timeout(120000) });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0], pos = pair.indexOf('=');
      jar.set(pair.slice(0, pos), pair.slice(pos + 1));
    }
    return response;
  };
}
async function login(username) {
  const request = session();
  const csrf = await (await request('/api/auth/csrf')).json();
  await request('/api/auth/callback/credentials', { method: 'POST', body: new URLSearchParams({ username, csrfToken: csrf.csrfToken, callbackUrl: BASE + '/stats', json: 'true' }) });
  const sessionResult = await (await request('/api/auth/session')).json();
  if (sessionResult?.user?.username !== username) throw new Error('synthetic-auth-failed');
  return request;
}
async function timed(request, url) {
  const start = performance.now();
  const response = await request(url);
  const body = await response.text();
  return { status: response.status, ms: Math.round((performance.now() - start) * 10) / 10, bytes: Buffer.byteLength(body), body };
}
async function benchmark(request, url) {
  const first = await timed(request, url);
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const { body, ...sample } = await timed(request, url);
    samples.push(sample);
  }
  const sorted = samples.map(x => x.ms).sort((a, b) => a - b);
  return { firstRequestMsMayIncludeCompile: first.ms, firstStatus: first.status, warmSamples: samples, warmMedianMs: sorted[2] };
}
function extractCharts(body) {
  return [...body.replace(/\\"/g, '"').matchAll(/"data":(\[\{"weekDate":[^\]]*\])/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
}
function summarizedExplain(explanation) {
  return { stages: (explanation.stages || []).map(stage => {
    if (stage.$cursor) {
      const q = stage.$cursor;
      return { kind: 'cursor', winningPlan: q.queryPlanner?.winningPlan?.stage, docsExamined: q.executionStats?.totalDocsExamined, keysExamined: q.executionStats?.totalKeysExamined, returned: q.executionStats?.nReturned, executionTimeMillis: q.executionStats?.executionTimeMillis };
    }
    const kind = Object.keys(stage).find(k => k.startsWith('$'));
    return { kind, docsExamined: stage.totalDocsExamined, keysExamined: stage.totalKeysExamined, collectionScans: stage.collectionScans, indexesUsed: stage.indexesUsed, returned: stage.nReturned, executionTimeMillisEstimate: stage.executionTimeMillisEstimate };
  }), ...(explanation.executionStats ? { executionStats: { docsExamined: explanation.executionStats.totalDocsExamined, keysExamined: explanation.executionStats.totalKeysExamined, returned: explanation.executionStats.nReturned, executionTimeMillis: explanation.executionStats.executionTimeMillis }, winningPlan: explanation.queryPlanner?.winningPlan?.stage } : {}) };
}

(async () => {
  await client.connect(); db = client.db();
  try {
    await cleanup();
    const beforeCounts = Object.fromEntries(await Promise.all(['User', 'Test', 'Task', 'Topic', 'UserTopicProgress'].map(async name => [name, await db.collection(name).countDocuments()])));
    results.baselineCountsAtStart = beforeCounts;
    const heavy = user('admin', true), completionUser = user('completion'), reportUser = user('reports'), zeroUser = user('empty');
    const heavyTopic = await topic('heavy', 10), fractionalTopic = await topic('fractional', 3), progressTopic = await topic('progress', 3, true), reportTopic = await topic('report', 4);
    await db.collection('User').insertMany([heavy, completionUser, reportUser, zeroUser]);
    const histories = Array.from({ length: 342 }, (_, i) => test(heavy, heavyTopic.tasks, 8, new Date(Date.UTC(2025, 0, 1 + i)), true));
    await db.collection('Test').insertMany(histories);
    await db.collection('User').updateOne({ _id: heavy._id }, { $set: { testsCount: 342, score: 342 * 8, percent: 80, scores: histories.map(t => ({ testId: t._id.toHexString(), score: 8, createdAt: t.completedAt })) } });
    results.fixtures = { heavyUserCompletedTests: 342, heavyUserAnswers: 3420, heavyUserScores: 342 };
    const adminRequest = await login(heavy.username), completionRequest = await login(completionUser.username), reportRequest = await login(reportUser.username);

    const fractional = test(completionUser, fractionalTopic.tasks, 1, new Date(), false);
    await db.collection('Test').insertOne(fractional);
    const fractionalResponse = await completionRequest('/api/complete/' + fractional._id, { method: 'POST' });
    await fractionalResponse.text();
    const fractionalUser = await db.collection('User').findOne({ _id: completionUser._id });
    results.checks.fractionalCompletion = { httpStatus: fractionalResponse.status, expectedRawPercent: 100 / 3, storedPercent: fractionalUser.percent, storedTestsCount: fractionalUser.testsCount, ledgerEntries: fractionalUser.scores.length, percentBsonType: (await db.collection('User').aggregate([{ $match: { _id: completionUser._id } }, { $project: { _id: 0, type: { $type: '$percent' } } }]).toArray())[0].type };

    const progressTest = test(completionUser, progressTopic.tasks.slice(0, 2), 2, new Date(), false);
    await db.collection('Test').insertOne(progressTest);
    const progressResponse = await completionRequest('/api/complete/' + progressTest._id, { method: 'POST' });
    await progressResponse.text();
    const progress = await db.collection('UserTopicProgress').findOne({ userId: completionUser._id, topicId: progressTopic._id });
    results.checks.progressDenominator = { httpStatus: progressResponse.status, activeTaskCount: 3, selectableTaskCount: 2, masteredSelectableCount: 2, storedPercent: progress?.percent, storedCorrectIdsCount: progress?.correctTaskIds?.length };

    const empty = { ...test(zeroUser, [], 0, new Date(), false), answers: [] };
    await db.collection('Test').insertOne(empty);
    const beforeEmpty = await db.collection('User').findOne({ _id: zeroUser._id });
    const emptyResponse = await completionRequest('/api/complete/' + empty._id, { method: 'POST' });
    await emptyResponse.text();
    const afterEmpty = await db.collection('User').findOne({ _id: zeroUser._id });
    const emptyAfter = await db.collection('Test').findOne({ _id: empty._id });
    results.checks.zeroAnswerCompletion = { httpStatus: emptyResponse.status, testMarkedComplete: emptyAfter.isComplete, completedAtWritten: !!emptyAfter.completedAt, counterBefore: beforeEmpty.testsCount, counterAfter: afterEmpty.testsCount, ledgerBefore: beforeEmpty.scores.length, ledgerAfter: afterEmpty.scores.length };

    const reportDates = ['2026-05-19T22:00:00.000Z', '2026-05-20T00:00:00.000Z', '2026-05-20T12:00:00.000Z', '2026-05-20T22:00:00.000Z'];
    const reportTests = reportDates.map((d, i) => test(reportUser, reportTopic.tasks.slice(0, i + 1), i + 1, new Date(d), true));
    const unfinished = test(reportUser, reportTopic.tasks, 0, new Date('2026-05-20T13:00:00.000Z'), false); unfinished.answers = [];
    await db.collection('Test').insertMany([...reportTests, unfinished]);
    for (const [key, to] of [['singleDay', '2026-05-20'], ['twoDays', '2026-05-21']]) {
      const response = await adminRequest('/api/reports?from=2026-05-20&to=' + to + '&topicGroup=all&completedOnly');
      const data = await response.json();
      const row = data.data?.find(x => x.username === reportUser.username);
      results.checks['report' + key] = { httpStatus: response.status, testCount: row?.testCount, score: row?.score, includedSyntheticCreatedAt: row?.filteredTests?.map(t => t.createdAt?.$date || t.createdAt), intendedMoscowMay20: { testCount: 3, score: 6 }, fullUtcMay20: { testCount: 3, score: 9 } };
    }
    const personalReport = await timed(reportRequest, '/stats');
    results.checks.personalChartUnfinished = { httpStatus: personalReport.status, completedCount: 4, incompleteCount: 1, completedCorrect: 10, expectedMeanPerCompletedTest: 2.5, extractedCharts: extractCharts(personalReport.body) };

    results.benchmarks.personalStats342Tests = await benchmark(adminRequest, '/stats');
    results.benchmarks.adminStats = await benchmark(adminRequest, '/admin/stats');
    results.benchmarks.report = await benchmark(adminRequest, '/api/reports?from=2025-01-01&to=2026-05-30&topicGroup=all&completedOnly');
    results.explain.personalTestHistory = summarizedExplain(await db.collection('Test').find({ userId: heavy._id }).sort({ createdAt: 1 }).explain('executionStats'));
    const pipeline = [
      { $match: { topicGroupId: { $in: [groupId, new ObjectId('67962669e4f21c30e05aef8b')] } } },
      { $lookup: { from: 'Test', let: { userId: '$_id' }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }, { $gte: ['$createdAt', { $dateFromString: { dateString: '2025-01-01' } }] }, { $lte: ['$createdAt', { $dateFromString: { dateString: '2026-05-30' } }] }, { $eq: ['$isComplete', true] }] } } },
        { $addFields: { correctAnswers: { $size: { $ifNull: [{ $filter: { input: '$answers', as: 'answer', cond: { $eq: ['$$answer.correct', true] } } }, []] } } } }
      ], as: 'filteredTests' } },
      { $project: { _id: 1, username: 1, name: 1, isArchive: 1, topicGroupId: 1, filteredTests: 1, testCount: { $size: { $ifNull: ['$filteredTests', []] } }, score: { $sum: '$filteredTests.correctAnswers' } } },
      { $match: { isArchive: false } }, { $sort: { testCount: -1 } }
    ];
    results.explain.reportSamePipeline = summarizedExplain(await db.collection('User').aggregate(pipeline).explain('executionStats'));
  } catch (error) {
    results.error = { name: error.name, code: error.code || null };
    process.exitCode = 1;
  } finally {
    if (db) {
      await cleanup();
      results.cleanup = { users: await db.collection('User').countDocuments({ username: { $regex: '^' + PREFIX } }), topics: await db.collection('Topic').countDocuments({ name: { $regex: '^' + PREFIX } }), tasks: await db.collection('Task').countDocuments({ source: PREFIX + 'fixture' }) };
    }
    await client.close();
    const output = path.join(__dirname, 'stats.results.json');
    fs.writeFileSync(output, JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  }
})().catch(error => { console.error(JSON.stringify({ fatal: error.name, code: error.code || null })); process.exitCode = 1; });
