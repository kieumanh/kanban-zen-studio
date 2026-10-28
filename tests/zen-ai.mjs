import assert from 'node:assert/strict';
import {zenAiRules,zenAiClock} from '../server/zen-ai.mjs';
const now=new Date('2026-10-29T01:00:00Z'); // 08:00 Vietnam
assert.deepEqual(zenAiClock(now),{hour:8,minute:0});
assert.deepEqual(zenAiClock(new Date('2026-10-29T13:00:00Z')),{hour:20,minute:0});
const project={id:'p',name:'Hương Thiền',archived:false,tasks:[
 {id:'done',title:'Đã xong',col:'Done',checks:[],due:'2026-10-27'},
 {id:'late',title:'Ưu tiên nhất',col:'Doing',checks:[{done:false}],due:'2026-10-27'},
 {id:'today',title:'Đến hạn',col:'List',checks:[],due:'2026-10-29'},
 {id:'soon',title:'Sắp tới',col:'Idea',checks:[{done:true},{done:false}],due:'2026-11-01'},
 {id:'slow',title:'Đang tiến triển',col:'Doing',checks:[{done:false}],due:''}
]};
const r=zenAiRules({projects:[project]},now);
assert.equal(r.statistics.projects,1);
assert.equal(r.statistics.active,4);
assert.equal(r.statistics.done,1);
assert.deepEqual(r.proposals.map(p=>p.id),['late','today','soon','slow']);
assert.equal(r.proposals[0].rank,1);
assert.match(r.proposals[0].detail,/Quá hạn 2 ngày/);
assert.equal(r.mode,'rules');
assert.equal(zenAiRules({projects:[]},now).proposals.length,0);
assert.equal(zenAiRules({projects:[{...project,archived:true}]},now).statistics.active,0);
console.log('PASS: Zen AI 08:00/20:00 Vietnam, deadlines, progress, archiving, rule fallback.');
