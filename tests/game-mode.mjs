import assert from 'node:assert/strict';
import * as C from '../dist/game/core.mjs';
import {CHAPTERS} from '../dist/game/story.mjs';
import {validGameWorkspace} from '../server/game-validation.mjs';
const work=()=>({schema:1,projects:[{id:'p',name:'Vườn',tasks:[{id:'a',title:'Task A',col:'List',checks:[{id:'c',done:false}]},{id:'b',title:'Task B',col:'List',checks:[]}]}]});
let w=work(),g=C.create(w,1);const action=(type,payload={},time=100)=>g=C.apply(g,{id:'id-'+Math.random(),type,payload},w,time);
assert.equal(C.progress(g).level,1);assert.equal(C.accounting(g).total,0n);
for(let l=1;l<100;l++)assert.equal(C.threshold(l+1)-C.threshold(l),C.cost(l));
assert.equal(C.threshold(100),63382530011411470074835160268700n);
assert.equal(C.units('3.50'),350n);assert.equal(C.display(350n),'3,5');assert.throws(()=>C.units('-1'));assert.throws(()=>C.units('1.001'));
action('meta',{taskId:'a',primary:4,secondary:1,minutes:60});
w.projects[0].tasks[0].col='Done';w.projects[0].tasks[0].checks[0].done=true;g=C.observe(g,w,2);
assert.equal(C.accounting(g).total,3000n);assert.equal(C.accounting(g).earned[4],2100n);assert.equal(C.accounting(g).earned[1],900n);
assert.equal(C.accounting(C.observe(g,w,3)).total,3000n);
w.projects[0].tasks[0].checks[0].done=false;w.projects[0].tasks[0].col='Doing';g=C.observe(g,w,4);assert.equal(C.accounting(g).total,0n);
w.projects[0].tasks[0].checks[0].done=true;w.projects[0].tasks[0].col='Done';g=C.observe(g,w,5);assert.equal(C.accounting(g).total,3000n);
action('spend',{axis:4,amount:'10',kind:'book',name:'Sách do người dùng đặt',quantity:1,note:'Học tập',skill:'Công dụng do người dùng ghi'});
assert.equal(C.accounting(g).balance[4],1100n);assert.equal(C.accounting(g).total,3000n);assert.equal(g.assets.length,1);
assert.throws(()=>action('spend',{axis:4,amount:'12',kind:'other',note:'Thiếu điểm'}));
let before=structuredClone(g);const spend=g.transactions[0];g=C.apply(g,{id:spend.id,type:'spend',payload:{}},w,200);assert.deepEqual(g,before);
action('asset',{assetId:g.assets[0].id});assert.equal(g.assets[0].status,'learned');assert.throws(()=>action('refund',{transactionId:spend.id}));
action('equip',{assetId:g.assets[0].id});assert.equal(g.assets[0].equipped,true);
action('spend',{axis:4,amount:'11',kind:'other',note:'Dùng hết'});assert.equal(C.accounting(g).balance[4],0n);
action('refund',{transactionId:g.transactions[1].id});assert.equal(C.accounting(g).balance[4],1100n);
assert.equal(C.validGame(g),true);assert.equal(validGameWorkspace(g),true);assert.equal(validGameWorkspace({...g,transactions:[{amount:'-3'}]}),false);
// Completed data on first activation/import never gives retroactive points.
let old=work();old.projects[0].tasks[0].col='Done';old.projects[0].tasks[0].checks[0].done=true;assert.equal(C.accounting(C.observe(C.create(old),old)).total,0n);
// Project deletion must not create a project reward.
let x=work(),gg=C.create(x);x.projects[0].tasks[0].col='Done';x.projects[0].tasks[0].checks[0].done=true;gg=C.observe(gg,x);x.projects[0].tasks.pop();gg=C.observe(gg,x);assert.equal(gg.rewards['p:p'],undefined);
// Enough earned points reach the gate but never bypass it.
w=work();g=C.create(w);for(let i=0;i<42;i++)g.rewards['seed'+i]={amount:'2500',active:true,primary:4,secondary:null};assert.equal(C.progress(g).level,10);assert.equal(C.progress(g).ready,true);
action('meta',{taskId:'a',primary:4,secondary:null,minutes:60});action('meta',{taskId:'b',primary:4,secondary:null,minutes:30});
const draft=C.draw(g,w,{count:2,baselineWork:60,baselineTime:60},()=>.1);assert.equal(new Set(draft.tasks.map(t=>t.id)).size,2);assert.equal(draft.minutes,75);
assert.throws(()=>action('challenge',{draft,minutes:100}));action('challenge',{draft,minutes:75},1000);assert.equal(g.challenge.status,'active');
w.projects[0].tasks.forEach(t=>{t.col='Done';t.checks.forEach(c=>c.done=true);});g=C.observe(g,w,2000);assert.equal(g.challenge.status,'won');assert.ok(g.cleared.includes(1));assert.ok(C.progress(g).level>=11);
const cleared=g.cleared.length;g=C.observe(g,w,3000);assert.equal(g.cleared.length,cleared);
// Expiration and deadline adjustments, preserving earned work.
w=work();g=C.create(w);for(let i=0;i<42;i++)g.rewards['seed'+i]={amount:'2500',active:true,primary:4,secondary:null};action('meta',{taskId:'a',minutes:60,primary:4});const d=C.draw(g,w,{count:1},()=>.99);action('challenge',{draft:d,minutes:d.minutes},1000);action('deadline',{minutes:100},2000);assert.equal(g.challenge.practice,true);g=C.observe(g,w,10000000);assert.equal(g.challenge.status,'expired');assert.equal(g.cleared.length,0);
// Ascension consumes only local threshold; next mountain doubles requirements.
g.cleared=Array.from({length:10},(_,i)=>i+1);g.rewards={huge:{amount:C.threshold(100).toString(),active:true,primary:4,secondary:null}};assert.equal(C.progress(g).mountain,2);assert.equal(C.cost(1,2),200n);
assert.equal(CHAPTERS.length,10);assert.ok(CHAPTERS.every(c=>c.godTitle));
console.log('PASS Game Mode: doubling, nine-axis conservation, rewards/undo, spending/refunds, inventory, task contests, deadline, gate locks and divine ascension.');
