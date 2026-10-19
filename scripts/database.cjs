require('tsx/cjs');
require('@next/env').loadEnvConfig(process.cwd(), true);
const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const {MongoClient,ObjectId}=require('mongodb');
const {sanitizeContent}=require('../lib/html.ts');
const {uniqueAnswers}=require('../lib/grading.ts');
(async()=>{
 const uri=process.env.DATABASE_URL;if(!uri)throw Error('DATABASE_URL is required');
 const apply=process.argv.includes('--apply');const host=new URL(uri).hostname;
 if(apply&&!['127.0.0.1','localhost','mongo'].includes(host)&&!process.argv.includes('--allow-remote'))throw Error('Remote writes require --allow-remote');
 const client=await MongoClient.connect(uri);try{
 const db=client.db();const users=await db.collection('User').find({}).sort({_id:1}).toArray();const tests=await db.collection('Test').find({}).toArray();const tasks=await db.collection('Task').find({}).toArray();const topics=await db.collection('Topic').find({}).toArray();
 const aliases=[];const names=new Set();for(const user of users){if(names.has(user.username)){let alias=String(user.username).slice(0,115)+'-'+String(user._id).slice(-8);while(names.has(alias))alias+='x';aliases.push({id:user._id,username:alias});names.add(alias);}else names.add(user.username);}
 const normalized=new Map(tests.map(t=>[String(t._id),uniqueAnswers(t.tasksIds||[],t.answers||[])]));
 const summary={apply,users:users.length,tests:tests.length,tasks:tasks.length,duplicateUsernames:aliases.length,duplicateAnswerEntries:tests.reduce((n,t)=>n+(t.answers||[]).length-normalized.get(String(t._id)).length,0),legacySnapshots:tests.filter(t=>(t.tasksIds||[]).some(id=>!(t.snapshots||[]).some(s=>String(s.taskId)===String(id)))).length};
 if(!apply){console.log(JSON.stringify(summary,null,2));return;}
 fs.mkdirSync('.local',{recursive:true});const backup=path.resolve('.local','before-repair-'+Date.now()+'.archive');
 const backupFd=fs.openSync(backup,'wx',0o600);let dumped;try{dumped=spawnSync('mongodump',['--uri',uri,'--archive'],{stdio:['ignore',backupFd,'pipe']});}finally{fs.closeSync(backupFd);}if(dumped.status!==0){fs.unlinkSync(backup);throw Error('Backup failed; no data changed');}
 const taskById=new Map(tasks.map(t=>[String(t._id),t]));const topicById=new Map(topics.map(t=>[String(t._id),t]));const reverse=new Map();
 for(const alias of aliases)await db.collection('User').updateOne({_id:alias.id},{$set:{username:alias.username}});
 for(const t of tests){const snapshots=(t.tasksIds||[]).map(id=>{const task=taskById.get(String(id));if(!reverse.has(String(id)))reverse.set(String(id),[]);reverse.get(String(id)).push(t._id);return {taskId:id,topicId:task?.topicId||new ObjectId('000000000000000000000000'),topicName:topicById.get(String(task?.topicId))?.name||'История',html:sanitizeContent(task?.html||'<p>Это задание отсутствует в старой базе.</p>'),answer:task?.answer||'',explanation:sanitizeContent(task?.explanation||''),line:task?.line||'',source:task?.source||'',disordered:!!task?.disordered,missing:!task};});await db.collection('Test').updateOne({_id:t._id},{$set:{answers:normalized.get(String(t._id)),...((t.tasksIds||[]).some(id=>!(t.snapshots||[]).some(s=>String(s.taskId)===String(id)))?{snapshots:snapshots.map(s=>(t.snapshots||[]).find(old=>String(old.taskId)===String(s.taskId))||s),snapshotSource:'legacy-import'}:{})}});}
 if(tasks.length)await db.collection('Task').bulkWrite(tasks.map(t=>({updateOne:{filter:{_id:t._id},update:{$set:{testIDs:reverse.get(String(t._id))||[],line:t.line||'',source:t.source||'',explanation:t.explanation||'',disordered:!!t.disordered}}}})));
 for(const user of users){const completed=tests.filter(t=>String(t.userId)===String(user._id)&&t.isComplete);const previous=user.scores||[];const ledger=previous.filter(s=>!s.testId);for(const t of completed){const old=previous.find(s=>s.testId===String(t._id));ledger.push({testId:String(t._id),score:normalized.get(String(t._id)).filter(a=>a.correct).length,createdAt:old?.createdAt||t.completedAt||t.createdAt});}ledger.sort((a,b)=>a.createdAt-b.createdAt);
 const recent=completed.sort((a,b)=>new Date(b.completedAt||b.createdAt)-new Date(a.completedAt||a.createdAt)).slice(0,10).flatMap(t=>normalized.get(String(t._id)));const percent=recent.length?Math.round(recent.filter(a=>a.correct).length/recent.length*100):0;
 await db.collection('User').updateOne({_id:user._id},{$set:{scores:ledger,testsCount:completed.length,percent,group:user.group||''}});await db.collection('User').updateOne({_id:user._id},[{$set:{score:{$sum:{$map:{input:'$scores',as:'s',in:'$$s.score'}}}}}]);
 const correct=new Set(completed.flatMap(t=>normalized.get(String(t._id)).filter(a=>a.correct).map(a=>String(a.taskId))));
 const progress=[];for(const topic of topics){const all=tasks.filter(t=>String(t.topicId)===String(topic._id));const correctTaskIds=all.filter(t=>correct.has(String(t._id))).map(t=>t._id);if(!correctTaskIds.length)continue;const eligible=all.filter(t=>t.active&&!t.isReported&&topic.active);progress.push({updateOne:{filter:{userId:user._id,topicId:topic._id},update:{$set:{version:2,correctTaskIds,percent:eligible.length?Math.round(eligible.filter(t=>correct.has(String(t._id))).length/eligible.length*100):0,updatedAt:new Date()},$setOnInsert:{_id:new ObjectId()}},upsert:true}});}await db.collection('UserTopicProgress').deleteMany({userId:user._id});if(progress.length)await db.collection('UserTopicProgress').bulkWrite(progress);
 }
 await db.collection('Topic').updateMany({section:{$exists:false}},{$set:{section:''}});
 for(const index of await db.collection('User').indexes())if(index.unique&&Object.keys(index.key).length===1&&index.key.name)await db.collection('User').dropIndex(index.name);
 for(const [collection,key,options]of [['User',{username:1},{unique:true}],['User',{topicGroupId:1,admin:1,isArchive:1,score:-1,_id:1},{}],['Test',{userId:1,createdAt:-1},{}],['Test',{userId:1,isComplete:1,completedAt:-1},{}],['Test',{topicGroupId:1,completedAt:1},{}],['Test',{tasksIds:1},{}],['Task',{topicId:1,active:1,isReported:1},{}],['Topic',{topicGroupId:1,active:1},{}],['UserTopicProgress',{userId:1,topicId:1},{unique:true}]])await db.collection(collection).createIndex(key,options);
 const v3=await require('./migrate-v3.cjs').migrate(db);
 console.log(JSON.stringify({...summary,backup,manualAdjustmentsPreserved:true,historicalCorrectnessRegraded:false,v3},null,2));
 }finally{await client.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
