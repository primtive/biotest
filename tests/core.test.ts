import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAnswer,uniqueAnswers} from '../lib/grading';
import {sanitizeContent} from '../lib/html';
import {statisticsRange,weekKeys,formatDuration} from '../data/statistics-utils';
test('unordered answers preserve multiplicity and support alternatives',()=>{
 assert.equal(checkAnswer('112','12',true),false);assert.equal(checkAnswer('112','211',true),true);assert.equal(checkAnswer('123','321',false),false);assert.equal(checkAnswer('abc, абв',' АБВ ',false),true);assert.equal(checkAnswer('','',false),false);
});
test('historical answers count only the first assigned answer',()=>{
 assert.deepEqual(uniqueAnswers(['a','b'],[{taskId:'a',correct:false},{taskId:'a',correct:true},{taskId:'c',correct:true},{taskId:'b',correct:true}]),[{taskId:'a',correct:false},{taskId:'b',correct:true}]);
});
test('HTML rejects scriptable tags, handlers and encoded URL schemes',()=>{
 const dirty='<svg onload="alert(1)"></svg><img src="javascript:alert(1)" onerror="alert(2)"><a href="jav&#x61;script:alert(1)">link</a><script>alert(1)</script><iframe srcdoc="<script>alert(1)</script>"></iframe><p><sup>2</sup> safe</p>';
 const safe=sanitizeContent(dirty);assert.doesNotMatch(safe,/onerror|onload|javascript:|<script|<svg|<iframe/);assert.match(safe,/<sup>2<\/sup>/);assert.match(sanitizeContent('<img src="https://example.com/a.png" alt="task">'),/src="https:\/\/example.com\/a.png"/);
});
test('Moscow inclusive dates become half-open UTC bounds',()=>{
 const r=statisticsRange('2026-05-20','2026-05-20');assert.equal(r.start.toISOString(),'2026-05-19T21:00:00.000Z');assert.equal(r.end.toISOString(),'2026-05-20T21:00:00.000Z');assert.deepEqual(weekKeys(r),['2026-05-18']);assert.throws(()=>statisticsRange('2026-02-30','2026-03-01'));assert.throws(()=>statisticsRange('2026-05-21','2026-05-20'));
});
test('duration preserves elapsed hours',()=>{assert.equal(formatDuration(new Date(0),new Date(3661000)),'1:01:01');});
