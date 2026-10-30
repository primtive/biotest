const assert = require('node:assert/strict');
const { MongoClient } = require('mongodb');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const checks = [], timings = [];
const site = process.env.NEXTAUTH_URL;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const reports = `/api/reports?from=${today.slice(0, 8)}01&to=${today}&topicGroup=all&completedOnly=true&pageSize=10`;
async function request(path, jar = new Map(), options = {}) {
  const start = performance.now();
  const response = await fetch('http://127.0.0.1:3000' + path, {
    ...options, redirect: 'manual', signal: AbortSignal.timeout(45000),
    headers: { ...options.headers, Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; ') },
  });
  for (const raw of response.headers.getSetCookie()) { const p = raw.split(';')[0], i = p.indexOf('='); jar.set(p.slice(0,i), p.slice(i+1)); }
  const text = await response.text(); let json; try { json = JSON.parse(text); } catch {}
  timings.push({ path: path.replace(/\/t\/[a-f\d]{24}\//i, '/t/[id]/'), status: response.status, ms: Math.round(performance.now() - start) });
  return { status: response.status, json, text, location: response.headers.get('location') };
}
function check(name, fn) { fn(); checks.push(name); }
function validPage(response) {
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /PrismaClientKnownRequestError|PrismaClientValidationError|PrismaClientUnknownRequestError/);
  let flight = '';
  for (const match of response.text.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/g)) { const chunk = JSON.parse(match[1]); if (chunk[0] === 1) flight += chunk[1]; }
  assert.doesNotMatch(flight, /:E\{"digest"/);
}
async function login(user) {
  const jar = new Map(); const csrf = (await request('/api/auth/csrf', jar)).json.csrfToken;
  const response = await request('/api/auth/callback/credentials', jar, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded',Origin:site}, body:new URLSearchParams({username:user.username,csrfToken:csrf,json:'true',callbackUrl:site}) });
  assert.equal(response.status, 200);
  const session = (await request('/api/auth/session', jar)).json;
  assert.equal(session.user.id, user.id);
  assert.notEqual(session.user.teacher, true);
  assert.ok(Array.isArray(session.user.teacherGroups));
  assert.equal('scores' in session.user, false); assert.equal('password' in session.user, false);
  return jar;
}
(async()=>{const client=await MongoClient.connect(process.env.DATABASE_URL);try{
  const db=client.db();
  const select={id:true,username:true,admin:true,teacher:true,teacherGroups:true,topicGroupId:true};
  const admin=await prisma.user.findFirst({where:{admin:true,isArchive:false},select});
  const student=await prisma.user.findFirst({where:{admin:false,isArchive:false,OR:[{teacher:false},{teacher:null},{teacher:{isSet:false}}]},select});
  assert.ok(admin && student);
  const adminJar=await login(admin), studentJar=await login(student);
  check('existing admin and student sessions support missing teacher fields',()=>{});
  for(const path of ['/','/history','/stats']) { const response=await request(path,studentJar);check('student page '+path,()=>validPage(response)); }
  for(const path of ['/admin/users','/admin/history','/admin/stats?period=all','/admin/reports','/admin/topics','/admin/tasks']) { const response=await request(path,adminJar);check('admin page '+path,()=>validPage(response)); }
  let response=await request(reports,adminJar);
  check('admin reports remain bounded',()=>{assert.equal(response.status,200);assert.ok(response.json.data.length<=10);});
  response=await request(reports,studentJar); check('students cannot read staff reports',()=>assert.equal(response.status,403));
  response=await request('/api/tasks',studentJar); check('students cannot read the task bank',()=>assert.equal(response.status,403));
  response=await request('/admin/users',studentJar); check('students cannot enter staff pages',()=>assert.equal(response.location,'/'));
  response=await request('/admin/users'); check('anonymous staff page contains no account data',()=>assert.ok(response.status===307 || response.text.includes('NEXT_REDIRECT')));
  const test=await db.collection('Test').findOne({userId:new (require('mongodb').ObjectId)(student.id),isComplete:true},{projection:{_id:1}});
  if(test){response=await request(`/t/${test._id}/review`,studentJar);check('existing completed test review',()=>validPage(response));}
  console.log(JSON.stringify({ok:true,database:db.databaseName,checksPassed:checks.length,checks,timings,counts:{User:await db.collection('User').countDocuments(),Test:await db.collection('Test').countDocuments(),Task:await db.collection('Task').countDocuments()},teacherAccounts:await db.collection('User').countDocuments({teacher:true})},null,2));
}finally{await client.close();await prisma.$disconnect();}})().catch(error=>{console.error(JSON.stringify({ok:false,error:error.name,message:error.message}));process.exitCode=1;});
