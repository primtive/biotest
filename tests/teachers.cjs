// Full-stack checks run against their own disposable localhost database and server.
require('tsx/cjs');
require('@next/env').loadEnvConfig(process.cwd(), true);
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { MongoClient, ObjectId } = require('mongodb');
const { encode } = require('next-auth/jwt');
const { readStatistics } = require('../lib/statistics-cache.ts');
const { readHistory } = require('../lib/history.ts');

const uri = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(uri.hostname)) throw Error('Teacher tests require localhost MongoDB');
uri.pathname = '/biotest_teacher_test_' + crypto.randomBytes(8).toString('hex');
const port = 3002, base = `http://127.0.0.1:${port}`, secret = crypto.randomBytes(32).toString('hex');
let server, serverOutput = '', checks = 0;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(path, cookie, body, method = body === undefined ? 'GET' : 'POST', extraHeaders = {}) {
  const response = await fetch(base + path, {
    method, redirect: 'manual', signal: AbortSignal.timeout(60000),
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: response.status, text, json, location: response.headers.get('location') };
}
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
function containsOnly(response, allowed, denied) {
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /PrismaClient\w*Error/);
  for (const user of allowed) assert.ok(response.text.includes(user.username), `Missing ${user.username}`);
  for (const user of denied) assert.ok(!response.text.includes(user.username), `Leaked ${user.username}`);
}

(async () => {
  const client = await MongoClient.connect(uri.toString());
  const db = client.db();
  try {
    for (const name of ['UsernameReservation', 'UserTopicProgress', 'ScoreAdjustment']) await db.createCollection(name);
    await db.collection('UserTopicProgress').createIndex({ userId: 1, topicId: 1 }, { unique: true });
    const exam = ['67962669e4f21c30e05aef8b', '67962ae5e4f21c30e05aef91'].map(id => new ObjectId(id));
    await db.collection('TopicGroup').insertMany(exam.map((_id, i) => ({ _id, name: i ? 'ОГЭ' : 'ЕГЭ' })));
    const topic = new ObjectId(), task = new ObjectId();
    await db.collection('Topic').insertOne({ _id: topic, name: 'Teacher test topic', section: '', topicGroupId: exam[0], active: true });
    await db.collection('Task').insertOne({ _id: task, topicId: topic, active: true, isReported: false, html: '<p>Private test question</p>', answer: '123', explanation: '', line: '1', source: '', disordered: false, testIDs: [] });
    const docs = [
      ['admin', { admin: true }], ['a-legacy', {}], ['a-modern', { teacher: false, teacherGroups: [], topicGroupId: exam[1] }],
      ['b', { group: 'Class B' }], ['archive', { isArchive: true }],
      ['teacher-a', { teacher: true, teacherGroups: ['Class A'] }],
      ['teacher-b', { teacher: true, teacherGroups: ['Class B'] }],
      ['teacher-empty', { teacher: true, teacherGroups: [] }],
    ].map(([name, fields]) => ({ _id: new ObjectId(), username: 'teacher-check-' + name, name: 'Private student ' + name, admin: false, isArchive: false, group: 'Class A', topicGroupId: exam[0], createdAt: new Date(), lastAccess: new Date(), score: 0, testsCount: 0, percent: 0, scores: [], ...fields }));
    const [admin, a, modern, b, archived, teacherA, teacherB, empty] = docs;
    await db.collection('User').insertMany(docs);
    const attempts = [];
    for (const [user, count] of [[a, 2], [modern, 1], [b, 4], [archived, 8], [teacherA, 16], [admin, 32]]) {
      for (let i = 0; i < count; i++) attempts.push({ _id: new ObjectId(), userId: user._id, topicGroupId: user.topicGroupId,
        createdAt: new Date('2026-10-01T10:00:00Z'), completedAt: new Date('2026-10-01T10:01:00Z'), isComplete: true,
        tasksIds: [task], answers: [{ taskId: task, answer: '123', correct: true }], taskCount: 1, answeredCount: 1, correctCount: 1,
        snapshots: [{ taskId: task, topicId: topic, topicName: 'Teacher test topic', html: '<p>Private test question</p>', answer: '123', explanation: '', line: '1', source: '', disordered: false }], snapshotSource: 'recorded' });
    }
    const incomplete = { ...attempts[0], _id: new ObjectId(), isComplete: false, completedAt: null, answers: [], answeredCount: 0, correctCount: 0 };
    attempts.push(incomplete);
    await db.collection('Test').insertMany(attempts);

    const statsA = await readStatistics(db, 'all', undefined, undefined, ['Class A']);
    const statsB = await readStatistics(db, 'all', undefined, undefined, ['Class B']);
    const statsEmpty = await readStatistics(db, 'all', undefined, undefined, []);
    check('statistics include only assigned students and exclude staff/archive', () => {
      assert.equal(statsA.userCount, 2); assert.equal(statsA.startedCount, 4); assert.equal(statsA.completedCount, 3);
      assert.equal(statsB.userCount, 1); assert.equal(statsB.completedCount, 4);
      assert.equal(statsEmpty.userCount, 0); assert.equal(statsEmpty.completedCount, 0); assert.equal(statsEmpty.taskCount, 0);
    });
    check('teacher statistics caches are isolated from admin and other group scopes', () => assert.equal(statsB.correctCount, 4));
    assert.deepEqual(await readStatistics(db, 'all', undefined, undefined, ['Class A']), statsA);
    const scopedHistory = await readHistory(db, {}, undefined, [String(a._id), String(modern._id)]);
    const noHistory = await readHistory(db, {}, undefined, []);
    check('history filters before counting and pagination, including an empty scope', () => {
      assert.equal(scopedHistory.pagination.total, 4); assert.ok(scopedHistory.items.every(item => [a.username, modern.username].includes(item.user.username)));
      assert.equal(noHistory.pagination.total, 0);
    });

    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: uri.toString(), NEXTAUTH_URL: base, NEXTAUTH_SECRET: secret }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const output of [server.stdout, server.stderr]) output.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-24000); });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw Error('Test server stopped: ' + serverOutput);
      try { if ((await request('/login')).status === 200) { ready = true; break; } } catch {}
      await pause(200);
    }
    assert.ok(ready, 'Test server must become ready');
    const cookies = await Promise.all(docs.map(async user => `next-auth.session-token=${await encode({ secret, token: { sub: String(user._id), loginMode: 'username-v1' } })}`));
    const [adminCookie, studentCookie, , , , aCookie, bCookie, emptyCookie] = cookies;
    // Clear persistent Next.js report caches left by an earlier test database.
    const initial = await request(`/api/users/${teacherA._id}`, adminCookie, { name: teacherA.name, username: teacherA.username, topicGroupId: String(teacherA.topicGroupId), group: teacherA.group, isArchive: false, teacher: true, teacherGroups: teacherA.teacherGroups });
    assert.equal(initial.status, 200);
    let response = await request('/api/auth/session', aCookie);
    check('session loads teacher role and assigned groups from the database', () => { assert.equal(response.json.user.teacher, true); assert.deepEqual(response.json.user.teacherGroups, ['Class A']); });
    response = await request('/api/auth/session', studentCookie);
    check('legacy accounts without teacher fields keep working', () => assert.equal(response.json.user.id, String(a._id)));

    for (const headers of [{}, { RSC: '1' }]) {
      response = await request('/admin/users', aCookie, undefined, 'GET', headers);
      check('teacher user list and RSC exclude foreign groups, staff and archive ' + JSON.stringify(headers), () => containsOnly(response, [a, modern], [b, admin, archived, teacherB, empty]));
      assert.ok(!response.text.includes('Создать пользователя'));
      response = await request('/admin/users?group=Class%20B', aCookie, undefined, 'GET', headers);
      check('forged group filter cannot widen scope ' + JSON.stringify(headers), () => containsOnly(response, [], [a, modern, b, archived, admin]));
      response = await request('/admin/users', emptyCookie, undefined, 'GET', headers);
      check('teacher without groups sees an empty list ' + JSON.stringify(headers), () => containsOnly(response, [], [a, modern, b, archived, admin]));
    }
    response = await request(`/admin/users/${encodeURIComponent(a.username)}`, aCookie);
    check('teacher can read an assigned student profile without score controls', () => { containsOnly(response, [a], [b]); assert.ok(!response.text.includes('Скорректировать')); });
    for (const user of [b, archived, admin, teacherB]) {
      response = await request(`/admin/users/${encodeURIComponent(user.username)}`, aCookie);
      check('direct profile access is denied for ' + user.username, () => { assert.ok([200, 404].includes(response.status)); assert.ok(!response.text.includes(user.name), `Disclosed profile for ${user.username}`); });
    }
    response = await request('/admin/history', aCookie);
    check('teacher history serializes only assigned students', () => containsOnly(response, [a, modern], [b, archived, admin, teacherB]));
    const aTest = attempts.find(test => test.userId.equals(a._id));
    const bTest = attempts.find(test => test.userId.equals(b._id));
    for (const test of [aTest, incomplete]) {
      response = await request(`/t/${test._id}/review`, aCookie);
      check('teacher can review an assigned test read-only ' + test.isComplete, () => { assert.equal(response.status, 200); assert.ok(response.text.includes('Private test question')); assert.ok(!response.text.includes('Пожаловаться')); });
    }
    response = await request(`/t/${bTest._id}/review`, aCookie);
    check('foreign test IDs cannot disclose questions or answers', () => assert.ok(!response.text.includes('Private test question')));
    for (const [path, location] of [['/', '/admin/users'], ['/stats', '/admin/stats'], ['/history', '/admin/history'], ['/admin/tasks', '/'], ['/admin/topics', '/'], ['/admin/update_topics', '/']]) {
      response = await request(path, aCookie);
      check('teacher route boundary ' + path, () => assert.equal(response.location, location));
    }
    for (const path of ['/admin/stats', '/admin/reports']) {
      response = await request(path, aCookie);
      check('teacher page renders ' + path, () => { assert.equal(response.status, 200); assert.doesNotMatch(response.text, /PrismaClient\w*Error/); });
    }
    const reports = '/api/reports?from=2026-10-01&to=2026-10-01&topicGroup=all&completedOnly=true';
    response = await request(reports, adminCookie);
    check('admin report excludes teachers from student rows', () => { assert.equal(response.status, 200); assert.deepEqual(response.json.data.map(user => user.username).sort(), [a.username, modern.username, b.username].sort()); });
    for (const [cookie, expected, total] of [[aCookie, [a, modern], 3], [bCookie, [b], 4], [emptyCookie, [], 0], [aCookie, [a, modern], 3]]) {
      response = await request(reports, cookie);
      check('cached report uses the current teacher scope ' + expected.map(user => user.username).join(','), () => {
        assert.equal(response.status, 200); assert.deepEqual(response.json.data.map(user => user.username).sort(), expected.map(user => user.username).sort());
        assert.equal(response.json.data.reduce((sum, user) => sum + user.testCount, 0), total);
      });
    }
    response = await request(reports.replace('topicGroup=all', 'topicGroup=ege'), aCookie);
    check('exam-group filter narrows the assigned students', () => assert.deepEqual(response.json.data.map(user => user.username), [a.username]));
    for (const [path, method, body] of [
      ['/api/tasks', 'GET'], ['/api/topics/new', 'POST', {}], ['/api/tasks/new', 'POST', {}],
      [`/api/users/${a._id}`, 'POST', { teacher: true, teacherGroups: ['Class B'] }], [`/api/users/${a._id}`, 'DELETE'],
      [`/api/scores/${a._id}`, 'POST', { score: 100, requestId: crypto.randomUUID() }],
      ['/api/test', 'POST', {}], [`/api/tasks/${task}/complete`, 'POST', { testId: String(incomplete._id), userAnswer: '123' }],
      [`/api/complete/${incomplete._id}`, 'POST', {}], [`/api/tasks/${task}/report`, 'POST', {}],
    ]) {
      response = await request(path, aCookie, body, method);
      check('teacher denied mutation or task-bank access ' + method + ' ' + path, () => assert.equal(response.status, 403));
    }
    response = await request(reports, studentCookie);
    check('students still cannot read reports', () => assert.equal(response.status, 403));

    const userBody = user => ({ name: user.name, username: user.username, topicGroupId: String(user.topicGroupId), group: user.group, isArchive: false });
    const teacherBody = { ...userBody(teacherA), teacher: true, teacherGroups: ['Class B'] };
    response = await request(`/api/users/${teacherA._id}`, adminCookie, teacherBody);
    check('administrator can reassign teacher groups', () => assert.equal(response.status, 200));
    response = await request('/api/auth/session', aCookie);
    check('existing teacher session immediately picks up changed groups', () => assert.deepEqual(response.json.user.teacherGroups, ['Class B']));
    response = await request(reports, aCookie);
    check('reassigned teacher cannot reuse a previous report cache', () => assert.deepEqual(response.json.data.map(user => user.username), [b.username]));
    response = await request(`/t/${aTest._id}/review`, aCookie);
    check('reassignment revokes direct access to previous student tests', () => assert.ok(!response.text.includes('Private test question')));
    response = await request(`/api/users/${teacherA._id}`, adminCookie, { ...teacherBody, teacher: false, teacherGroups: [] });
    check('administrator can remove teacher access', () => assert.equal(response.status, 200));
    response = await request(reports, aCookie);
    check('role removal revokes report access in an existing session', () => assert.equal(response.status, 403));
    response = await request(`/api/users/${a._id}`, studentCookie, { ...userBody(a), teacher: true, teacherGroups: ['Class B'] });
    check('student cannot grant themselves the teacher role', () => assert.equal(response.status, 403));
    response = await request('/api/users/new', adminCookie, { ...userBody(a), username: 'teacher-check-new', teacher: true, teacherGroups: ['Class A', 'Class A'] });
    check('administrator can create a teacher and groups are deduplicated', () => assert.equal(response.status, 200));
    const created = await db.collection('User').findOne({ username: 'teacher-check-new' });
    assert.equal(created.teacher, true); assert.equal(created.admin, false); assert.deepEqual(created.teacherGroups, ['Class A']);
    response = await request(`/api/users/${admin._id}`, adminCookie, { ...userBody(admin), teacher: true });
    check('teacher editor cannot change an administrator role', () => assert.equal(response.status, 400));
    response = await request(`/api/users/${b._id}`, adminCookie, { ...userBody(b), teacherGroups: ['Class A'] });
    check('student accounts cannot carry teacher assignments', () => assert.equal(response.status, 400));

    response = await request(`/api/users/${a._id}`, adminCookie, { ...userBody(a), group: 'Class B' });
    assert.equal(response.status, 200);
    const moved = await readStatistics(db, 'all', undefined, undefined, ['Class A']);
    check('student membership changes invalidate scoped totals', () => { assert.equal(moved.userCount, 2); assert.equal(moved.completedCount, 16 + 1); });
    console.log(`ALL ${checks} TEACHER CHECKS PASSED`);
    if (process.argv.includes('--regression')) {
      await db.collection('User').insertMany(Array.from({ length: 25 }, (_, i) => ({ ...a, _id: new ObjectId(), username: `regression-extra-${i}`, name: `Regression extra ${i}`, group: 'Regression only' })));
      const regression = spawn(process.execPath, ['tests/integration.cjs'], { env: { ...process.env, DATABASE_URL: uri.toString(), TEST_BASE_URL: base, NEXTAUTH_SECRET: secret }, stdio: 'inherit' });
      const [code] = await once(regression, 'exit');
      assert.equal(code, 0, 'Existing student/admin integration checks must pass');
    }
  } catch (error) {
    console.error(serverOutput);
    throw error;
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const stopped = once(server, 'exit');
      const forceStop = setTimeout(() => server.kill('SIGKILL'), 5000);
      server.kill('SIGTERM');
      try { await stopped; } finally { clearTimeout(forceStop); }
    }
    await db.dropDatabase(); await client.close();
    console.log('Disposable teacher database and server removed');
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
