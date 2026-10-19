// Read-only HTTP/runtime checks. JWT login is kept only in memory.
// No application/database state is changed. Output contains no user names,
// credentials, cookie values, response HTML, or test IDs.
import fs from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { deserialize } from 'bson';

const base = 'http://localhost:3001';
const client = new MongoClient('mongodb://127.0.0.1:27018/biotest?replicaSet=rs0&directConnection=true');
await client.connect();
const db = client.db('biotest');
const cookies = new Map();
const results = [];

function decodeFlight(html) {
  let stream = '';
  for (const match of html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/g)) {
    try { const item = JSON.parse(match[1]); if (item[0] === 1) stream += item[1]; } catch {}
  }
  return stream;
}

function inspectFlight(stream) {
  const errors = [];
  const users = [];
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (Array.isArray(value.users)) users.push(...value.users);
    Object.values(value).forEach(visit);
  };
  for (const line of stream.split('\n')) {
    const errorMatch = line.match(/^[0-9a-f]+:E(\{.*\})$/);
    const valueMatch = line.match(/^[0-9a-f]+:(\[.*\]|\{.*\})$/);
    if (errorMatch) {
      try {
        const error = JSON.parse(errorMatch[1]);
        errors.push({ name: error.name, indicators: ['NEXT_REDIRECT', 'NEXT_HTTP_ERROR_FALLBACK', 'skip', 'Invalid value', 'Malformed ObjectID', 'Inconsistent column data'].filter(x => error.message?.includes(x)) });
      } catch {}
    } else if (valueMatch) {
      try { visit(JSON.parse(valueMatch[1])); } catch {}
    }
  }
  return { errors, users };
}

async function request(path, authenticated = false, options = {}) {
  const started = performance.now();
  const headers = { ...(authenticated ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}), ...options.headers };
  const response = await fetch(base + path, { redirect: 'manual', ...options, headers });
  if (authenticated) for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(';')[0]; const i = pair.indexOf('='); cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const body = await response.text();
  const stream = response.headers.get('content-type')?.includes('text/x-component') ? body : decodeFlight(body);
  const inspected = inspectFlight(stream);
  const summary = { path, authenticated, rsc: headers.RSC === '1', status: response.status, location: response.headers.get('location'), contentType: response.headers.get('content-type'), ms: Math.round(performance.now() - started), bytes: Buffer.byteLength(body), errors: inspected.errors };
  return { body, stream, inspected, summary };
}

try {
  const first = await db.collection('User').findOne({});
  const firstTests = await db.collection('Test').find({ userId: first._id }).project({ _id: 1 }).toArray();
  const rawDump = await fs.readFile('/Users/alexey/other/dumps/biotest-dump-30.05.26/biotest/User.bson');
  const dumpIds = new Set();
  for (let offset = 0; offset < rawDump.length;) {
    const size = rawDump.readInt32LE(offset); dumpIds.add(deserialize(rawDump.subarray(offset, offset + size))._id.toString()); offset += size;
  }
  for (const headers of [{}, { RSC: '1' }]) {
    const value = await request('/admin/users', false, { headers });
    const records = value.inspected.users;
    results.push({ ...value.summary, cookiesSent: false, manualRedirect: true, serializedUserRecords: records.length, originalDumpRecordsExposed: records.filter(u => dumpIds.has(u.id)).length, exposedFieldNames: [...new Set(records.flatMap(u => Object.keys(u)))].sort(), serializedScoreEntries: records.reduce((sum, u) => sum + (u.scores?.length || 0), 0), nonemptyPasswords: records.filter(u => u.password).length });
  }
  for (const path of ['/stats', '/history']) {
    const value = await request(path);
    results.push({ ...value.summary, ...(path === '/stats' ? { firstUserNameExposed: !!first.name && value.body.includes(first.name), firstUserUsernameExposed: !!first.username && value.body.includes(first.username) } : { firstUserTestIdsExposed: firstTests.filter(t => value.body.includes(t._id.toString())).length }) });
  }
  const admin = await db.collection('User').findOne({ admin: true, username: { $type: 'string' } });
  const csrf = JSON.parse((await request('/api/auth/csrf', true)).body).csrfToken;
  const login = await request('/api/auth/callback/credentials', true, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: csrf, username: admin.username, callbackUrl: base + '/', json: 'true' }) });
  if (login.summary.status !== 200 || ![...cookies.keys()].some(k => k.includes('session-token'))) throw new Error('Administrative test login failed');
  const paths = ['/admin/users', '/admin/history', '/admin/topics', '/admin/reports', '/admin/history?page=-1', '/admin/history?page=0', '/admin/history?page=foo', '/admin/history?page=1000000', '/admin/users/__runtime_review_missing_user__', '/api/tasks?page=0', '/api/tasks?page=-1', '/api/tasks?page=foo', '/api/tasks?topics=invalid', '/api/reports', '/api/reports?from=invalid&to=invalid&topicGroup=all', '/api/reports?from=2026-05-24&to=2026-05-18&topicGroup=all', '/api/reports?from=2026-05-18&to=2026-05-24&topicGroup=unknown'];
  for (const path of paths) {
    const value = await request(path, true);
    if (path.startsWith('/api/')) {
      try { const parsed = JSON.parse(value.body); value.summary.message = parsed.message ?? null; if (Array.isArray(parsed.data)) value.summary.reportRows = parsed.data.length; } catch {}
    }
    results.push(value.summary);
  }
  for (const path of ['/t/invalid', '/t/invalid/review', '/t/000000000000000000000000/review']) results.push((await request(path)).summary);
  const report = { baseUrl: base, mode: 'Next.js development server; response bodies and RSC errors inspected', mutations: 'None; credentials login issues JWT only', results };
  await fs.writeFile(new URL('./read-only.results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { cookies.clear(); await client.close(); }
