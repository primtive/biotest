const { MongoClient, ObjectId } = require('mongodb');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.RUNTIME_REVIEW_BASE || 'http://localhost:3001';
const databaseUrl = process.env.RUNTIME_REVIEW_DB || 'mongodb://127.0.0.1:27018/biotest?replicaSet=rs0&directConnection=true';
const prefix = 'rt-api-';
const run = `${prefix}${Date.now()}`;
const client = new MongoClient(databaseUrl);
const result = { run, base, startedAt: new Date().toISOString(), checks: [], cleanup: null };
let db;
const created = new Map();

function track(collection, id) {
  const objectId = id instanceof ObjectId ? id : new ObjectId(id);
  if (!created.has(collection)) created.set(collection, new Set());
  created.get(collection).add(objectId.toHexString());
  return objectId;
}

async function insert(collection, document) {
  const id = track(collection, document._id || new ObjectId());
  await db.collection(collection).insertOne({ ...document, _id: id });
  return id;
}

async function request(url, { method = 'GET', body, cookies } = {}) {
  const response = await fetch(base + url, {
    method,
    redirect: 'manual',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookies ? { Cookie: cookies } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch {}
  return { status: response.status, text, json };
}

async function login(username) {
  const jar = new Map();
  function update(response) {
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(';', 1)[0];
      const pos = pair.indexOf('=');
      jar.set(pair.slice(0, pos), pair.slice(pos + 1));
    }
  }
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const csrf = await fetch(base + '/api/auth/csrf', { redirect: 'manual' });
  update(csrf);
  const { csrfToken } = await csrf.json();
  const auth = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie() },
    body: new URLSearchParams({ csrfToken, username, callbackUrl: base, json: 'true' }),
  });
  update(auth);
  await auth.text();
  const session = await request('/api/auth/session', { cookies: cookie() });
  return { cookies: cookie(), csrfStatus: csrf.status, authStatus: auth.status, session };
}

function userDocument(name, groupId, extra = {}) {
  return { createdAt: new Date(), lastAccess: new Date(), username: name, name, admin: false, group: '', scores: [], score: 0, testsCount: 0, percent: 0, isArchive: false, topicGroupId: groupId, ...extra };
}

function taskDocument(topicId, extra = {}) {
  return { html: `<p>${run} fixture task</p>`, answer: '12', line: '', isReported: false, source: run, explanation: '', active: true, disordered: false, topicId, testIDs: [], ...extra };
}

function testDocument(userId, groupId, tasksIds, extra = {}) {
  return { createdAt: new Date(), answers: [], isComplete: false, tasksIds, userId, topicGroupId: groupId, ...extra };
}

async function snapshotUser(id) {
  const user = await db.collection('User').findOne({ _id: id });
  return { admin: user.admin, score: user.score, testsCount: user.testsCount, percent: user.percent, scoresCount: (user.scores || []).length };
}

function record(name, data) {
  result.checks.push({ name, ...data });
  console.log(JSON.stringify({ check: name, ...data }));
}

(async () => {
  try {
    await client.connect();
    db = client.db();
    const groupId = await insert('TopicGroup', { name: run });
    const otherGroupId = await insert('TopicGroup', { name: `${run}-other` });
    const topicId = await insert('Topic', { name: run, active: true, section: '', topicGroupId: groupId });
    const otherTopicId = await insert('Topic', { name: `${run}-inactive-cross-group`, active: false, section: '', topicGroupId: otherGroupId });
    const studentId = await insert('User', userDocument(`${run}-student`, groupId));
    const foreignOwnerId = await insert('User', userDocument(`${run}-other-owner`, groupId));
    const statsUserId = await insert('User', userDocument(`${run}-stats`, groupId));
    const emptyUserId = await insert('User', userDocument(`${run}-empty`, groupId));
    const fractionalUserId = await insert('User', userDocument(`${run}-fractional`, groupId));
    const adminCreate = await request('/api/users/new', { method: 'POST', body: { username: `${run}-created-admin`, name: `${run}-created-admin`, admin: true, topicGroupId: groupId.toHexString() } });
    let adminId;
    if (adminCreate.json?.id) adminId = track('User', adminCreate.json.id);
    record('unauthenticated_admin_creation', { status: adminCreate.status, created: !!adminId, admin: adminId ? (await snapshotUser(adminId)).admin : null });
    const promotion = await request(`/api/users/${studentId}`, { method: 'POST', body: { username: `${run}-student`, name: `${run}-student`, admin: true, topicGroupId: groupId.toHexString() } });
    record('unauthenticated_admin_promotion', { status: promotion.status, beforeAdmin: false, afterAdmin: (await snapshotUser(studentId)).admin });
    await db.collection('User').updateOne({ _id: studentId }, { $set: { admin: false } });

    const topicCreate = await request('/api/topics/new', { method: 'POST', body: { name: `${run}-created-topic`, active: true, topicGroupId: groupId.toHexString() } });
    if (topicCreate.json?.id) track('Topic', topicCreate.json.id);
    record('unauthenticated_topic_creation', { status: topicCreate.status, created: !!topicCreate.json?.id });
    const xssMarkup = `<svg data-rt-api-marker="${run}" onload="document.documentElement.setAttribute('data-rt-api-probe','executed')"></svg>`;
    const taskCreate = await request('/api/tasks/new', { method: 'POST', body: { html: xssMarkup, answer: 'rt-answer-visible-42', topicId: topicId.toHexString(), source: run, active: true } });
    const createdTask = await db.collection('Task').findOne({ source: run, html: xssMarkup });
    if (createdTask) track('Task', createdTask._id);
    record('unauthenticated_task_creation', { status: taskCreate.status, created: !!createdTask, unmodifiedEventHandlerStored: createdTask?.html === xssMarkup });
    const tasks = [];
    for (let index = 0; index < 12; index++) tasks.push(await insert('Task', taskDocument(topicId, { source: `${run}-${index}` })));
    const otherTaskId = await insert('Task', taskDocument(otherTopicId));
    const taskId = tasks[0];
    const unrelatedTaskId = tasks[1];

    const anonymousTasks = await request('/api/tasks');
    const anonymousReports = await request('/api/reports?from=2099-01-01&to=2099-01-01&topicGroup=all');
    record('existing_read_auth_controls', { tasksStatus: anonymousTasks.status, reportsStatus: anonymousReports.status });
    const studentLogin = await login(`${run}-student`);
    record('username_only_login', { csrfStatus: studentLogin.csrfStatus, authStatus: studentLogin.authStatus, sessionStatus: studentLogin.session.status, authenticatedAsFixture: studentLogin.session.json?.user?.id === studentId.toHexString(), submittedPassword: false });
    const adminLogin = await login(`${run}-created-admin`);
    record('username_only_admin_login', { authStatus: adminLogin.authStatus, authenticatedAsFixture: adminLogin.session.json?.user?.id === adminId?.toHexString(), sessionAdmin: adminLogin.session.json?.user?.admin });

    if (createdTask) {
      const reviewId = await insert('Test', testDocument(foreignOwnerId, groupId, [createdTask._id]));
      const review = await request(`/t/${reviewId}/review`);
      const markerPosition = review.text.indexOf('data-rt-api-marker');
      record('unauthenticated_unfinished_foreign_test_review', { status: review.status, testIsComplete: false, correctAnswerVisible: review.text.includes('rt-answer-visible-42'), rawEventHandlerInHtml: review.text.includes(xssMarkup), unescapedSvgInHtml: review.text.includes('<svg data-rt-api-marker='), markerContext: markerPosition < 0 ? null : review.text.slice(Math.max(0, markerPosition - 40), markerPosition + 200), javascriptExecutionTested: false });

    }

    const mismatchTestId = await insert('Test', testDocument(foreignOwnerId, groupId, [taskId], { isComplete: true, completedAt: new Date() }));
    const mismatchResponse = await request(`/api/tasks/${taskId}/complete`, { method: 'POST', body: { id: unrelatedTaskId.toHexString(), userAnswer: '12', testId: mismatchTestId.toHexString() } });
    const mismatchStored = await db.collection('Test').findOne({ _id: mismatchTestId });
    record('unauthenticated_mismatched_answer_to_completed_foreign_test', { status: mismatchResponse.status, responseCorrect: mismatchResponse.json?.correct, testStillComplete: mismatchStored.isComplete, answersCount: mismatchStored.answers.length, storedBodyTaskIdInsteadOfUrl: mismatchStored.answers[0]?.taskId?.equals(unrelatedTaskId), storedTaskNotAssigned: !mismatchStored.tasksIds.some(id => id.equals(unrelatedTaskId)) });
    const duplicateResponse = await request(`/api/tasks/${taskId}/complete`, { method: 'POST', body: { id: unrelatedTaskId.toHexString(), userAnswer: '12', testId: mismatchTestId.toHexString() } });
    record('duplicate_answer_submission', { status: duplicateResponse.status, answersBefore: mismatchStored.answers.length, answersAfter: (await db.collection('Test').findOne({ _id: mismatchTestId })).answers.length });

    const concurrentTestId = await insert('Test', testDocument(studentId, groupId, tasks));
    const concurrentResponses = await Promise.all(tasks.map(task => request(`/api/tasks/${task}/complete`, { method: 'POST', body: { id: task.toHexString(), userAnswer: '12', testId: concurrentTestId.toHexString() } })));
    const concurrentStored = await db.collection('Test').findOne({ _id: concurrentTestId });
    record('concurrent_distinct_answers', { submitted: tasks.length, statusCodes: concurrentResponses.map(response => response.status), correctResponses: concurrentResponses.filter(response => response.json?.correct).length, storedAnswers: concurrentStored.answers.length, lostAnswers: tasks.length - concurrentStored.answers.length });

    const disorderedTaskId = await insert('Task', taskDocument(topicId, { answer: '112', disordered: true }));
    const disorderedTestId = await insert('Test', testDocument(studentId, groupId, [disorderedTaskId]));
    const disorderedResponse = await request(`/api/tasks/${disorderedTaskId}/complete`, { method: 'POST', body: { id: disorderedTaskId.toHexString(), userAnswer: '12', testId: disorderedTestId.toHexString() } });
    record('unordered_answer_loses_symbol_multiplicity', { status: disorderedResponse.status, correctAnswer: '112', submittedAnswer: '12', accepted: disorderedResponse.json?.correct });

    const completeTestId = await insert('Test', testDocument(statsUserId, groupId, tasks.slice(0, 2), { answers: tasks.slice(0, 2).map(id => ({ taskId: id, answer: '12', correct: true })) }));
    const completionBefore = await snapshotUser(statsUserId);
    const completionOne = await request(`/api/complete/${completeTestId}`, { method: 'POST' });
    const completionAfterOne = await snapshotUser(statsUserId);
    const completionTwo = await request(`/api/complete/${completeTestId}`, { method: 'POST' });
    const completionAfterTwo = await snapshotUser(statsUserId);
    const completedUser = await db.collection('User').findOne({ _id: statsUserId });
    record('unauthenticated_repeat_completion', { statuses: [completionOne.status, completionTwo.status], before: completionBefore, afterFirst: completionAfterOne, afterSecond: completionAfterTwo, sameTestScoreEntries: completedUser.scores.filter(score => score.testId === completeTestId.toHexString()).length });

    const incompleteTestId = await insert('Test', testDocument(emptyUserId, groupId, tasks.slice(0, 2)));
    const incompleteResponse = await request(`/api/complete/${incompleteTestId}`, { method: 'POST' });
    const incompleteStored = await db.collection('Test').findOne({ _id: incompleteTestId });
    record('completion_with_no_answers_partial_commit', { status: incompleteResponse.status, expectedAnswers: incompleteStored.tasksIds.length, actualAnswers: incompleteStored.answers.length, isCompleteAfter: incompleteStored.isComplete, completedAtSet: incompleteStored.completedAt instanceof Date, userAfter: await snapshotUser(emptyUserId) });

    const fractionalAnswers = correct => tasks.slice(0, 10).map((id, index) => ({ taskId: id, answer: index < correct ? '12' : 'wrong', correct: index < correct }));
    const priorFractionalTests = [];
    for (let index = 0; index < 2; index++) priorFractionalTests.push(await insert('Test', testDocument(fractionalUserId, groupId, tasks.slice(0, 10), { createdAt: new Date(Date.now() - 10000 - index), answers: fractionalAnswers(6), isComplete: true, completedAt: new Date() })));
    await db.collection('User').updateOne({ _id: fractionalUserId }, { $set: { testsCount: 2, score: 12, scores: priorFractionalTests.map(id => ({ score: 6, createdAt: new Date(), testId: id.toHexString() })) } });
    const fractionalTestId = await insert('Test', testDocument(fractionalUserId, groupId, tasks.slice(0, 10), { answers: fractionalAnswers(5) }));
    const fractionalResponse = await request(`/api/complete/${fractionalTestId}`, { method: 'POST' });
    record('fractional_percent_handling', { status: fractionalResponse.status, correctAnswers: 17, allAnswers: 30, mathematicalPercent: 17 / 30 * 100, userAfter: await snapshotUser(fractionalUserId) });

    const manualBefore = await snapshotUser(studentId);
    const manualResponse = await request(`/api/scores/${studentId}`, { method: 'POST', body: { score: 543 } });
    record('unauthenticated_manual_score', { status: manualResponse.status, before: manualBefore, after: await snapshotUser(studentId) });

    const testCountBeforeGet = await db.collection('Test').countDocuments({ userId: studentId });
    const generation = await request('/api/test', { cookies: studentLogin.cookies });
    if (/^\/t\/([a-f\d]{24})$/.test(generation.text)) track('Test', generation.text.slice(3));
    record('get_creates_test', { status: generation.status, countBefore: testCountBeforeGet, countAfter: await db.collection('Test').countDocuments({ userId: studentId }) });
    const crossGeneration = await request(`/api/test?topics=${otherTopicId}`, { cookies: studentLogin.cookies });
    let crossTest;
    if (/^\/t\/([a-f\d]{24})$/.test(crossGeneration.text)) {
      const id = track('Test', crossGeneration.text.slice(3));
      crossTest = await db.collection('Test').findOne({ _id: id });
    }
    record('inactive_cross_group_topic_generation', { status: crossGeneration.status, testCreated: !!crossTest, testUsesStudentGroup: crossTest?.topicGroupId.equals(groupId), hasInactiveForeignGroupTask: crossTest?.tasksIds.some(id => id.equals(otherTaskId)) });

    const emptyTopicId = await insert('Topic', { name: `${run}-empty`, active: true, section: '', topicGroupId: groupId });
    const emptyGeneration = await request(`/api/test?topics=${emptyTopicId}`, { cookies: studentLogin.cookies });
    let emptyTest;
    if (/^\/t\/([a-f\d]{24})$/.test(emptyGeneration.text)) {
      const id = track('Test', emptyGeneration.text.slice(3));
      emptyTest = await db.collection('Test').findOne({ _id: id });
    }
    record('empty_test_generation', { status: emptyGeneration.status, testCreated: !!emptyTest, taskCount: emptyTest?.tasksIds.length });

    const knownGroup = await db.collection('TopicGroup').findOne({ _id: new ObjectId('67962ae5e4f21c30e05aef91') });
    if (knownGroup && adminLogin.session.json?.user?.admin) {
      const reportUserId = await insert('User', userDocument(`${run}-report`, knownGroup._id));
      await insert('Test', testDocument(reportUserId, knownGroup._id, [taskId], { createdAt: new Date('2099-01-01T12:00:00.000Z'), isComplete: true, completedAt: new Date('2099-01-01T12:01:00.000Z'), answers: [{ taskId, answer: '12', correct: true }] }));
      const reportSameDay = await request('/api/reports?from=2099-01-01&to=2099-01-01&topicGroup=all&completedOnly', { cookies: adminLogin.cookies });
      const reportNextDay = await request('/api/reports?from=2099-01-01&to=2099-01-02&topicGroup=all&completedOnly', { cookies: adminLogin.cookies });
      const ownRow = response => response.json?.data?.find(user => user._id?.$oid === reportUserId.toHexString());
      record('report_excludes_selected_end_day', { statuses: [reportSameDay.status, reportNextDay.status], fixtureTestCreatedAt: '2099-01-01T12:00:00.000Z', testCountWithToSameDay: ownRow(reportSameDay)?.testCount, testCountWithToNextDay: ownRow(reportNextDay)?.testCount });
    }

    if (createdTask) {
      const removeTask = await request(`/api/tasks/${createdTask._id}`, { method: 'DELETE' });
      record('unauthenticated_task_delete', { status: removeTask.status, deleted: !(await db.collection('Task').findOne({ _id: createdTask._id })) });
    }
  } catch (error) {
    result.error = { name: error.name, message: error.message };
    console.error(JSON.stringify({ runtimeError: result.error }));
    process.exitCode = 1;
  } finally {
    if (db) {
      const userIds = [...(created.get('User') || [])].map(id => new ObjectId(id));
      const topicIds = [...(created.get('Topic') || [])].map(id => new ObjectId(id));
      const filter = { $or: [{ userId: { $in: userIds } }, { topicId: { $in: topicIds } }] };
      const progressRemoved = await db.collection('UserTopicProgress').deleteMany(filter);
      for (const name of ['Test', 'Task', 'User', 'Topic', 'TopicGroup']) {
        const ids = [...(created.get(name) || [])].map(id => new ObjectId(id));
        await db.collection(name).deleteMany({ _id: { $in: ids } });
      }
      const remaining = {};
      for (const [name, ids] of created) remaining[name] = await db.collection(name).countDocuments({ _id: { $in: [...ids].map(id => new ObjectId(id)) } });
      remaining.UserTopicProgress = await db.collection('UserTopicProgress').countDocuments(filter);
      result.cleanup = { progressRemoved: progressRemoved.deletedCount, remainingTrackedFixtures: remaining, allTrackedFixturesRemoved: Object.values(remaining).every(count => count === 0), prefixResidue: {} };
      result.cleanup.prefixResidue.User = await db.collection('User').countDocuments({ username: { $regex: '^' + run } });
      result.cleanup.prefixResidue.Topic = await db.collection('Topic').countDocuments({ name: { $regex: '^' + run } });
      result.cleanup.prefixResidue.TopicGroup = await db.collection('TopicGroup').countDocuments({ name: { $regex: '^' + run } });
      result.cleanup.prefixResidue.Task = await db.collection('Task').countDocuments({ source: { $regex: '^' + run } });
      console.log(JSON.stringify({ cleanup: result.cleanup }));
    }
    await client.close();
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, 'api.http.results.json'), JSON.stringify(result, null, 2) + '\n');
  }
})();
