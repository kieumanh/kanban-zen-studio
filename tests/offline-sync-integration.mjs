import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {mergeThreeWay} from '../dist/modules/merge.mjs';
const offline=readFileSync(new URL('../dist/offline.js',import.meta.url),'utf8');
const code=offline.slice(offline.indexOf('rebaseWorkspace=async function'),offline.indexOf('function reviewSyncConflict'));
const base={schema:1,projects:[],notes:[{id:'n',title:'Original',text:'Original'}]};
for(const scenario of ['independent','competing','edit-during-request','switch-account']){
 let saves=0;
 const local=structuredClone(base);local.notes[0].title='Local';
 const remote=structuredClone(base);remote.notes[0][scenario==='competing'?'title':'text']='Remote';
 const ctx=vm.createContext({structuredClone,rebaseWorkspace:null,conflictReview:null,localGeneration:2,currentUser:{id:'owner'},cloudBase:structuredClone(base),data:local,cloudRevision:3,dirty:true,syncConflict:true,offlineMergeReady:Promise.resolve({mergeThreeWay}),valid:()=>true,cacheCloud:async()=>{saves++;},requestAPI:async()=>{if(scenario==='edit-during-request')ctx.localGeneration++;if(scenario==='switch-account')ctx.currentUser={id:'other'};return {data:remote,revision:4};}});
 vm.runInContext(code,ctx);
 const merged=await ctx.rebaseWorkspace('owner');
 if(scenario==='independent'){assert.equal(merged,true);assert.equal(ctx.data.notes[0].title,'Local');assert.equal(ctx.data.notes[0].text,'Remote');assert.equal(ctx.cloudRevision,4);assert.equal(saves,1);}
 else{assert.equal(merged,false);assert.equal(ctx.data.notes[0].title,'Local');assert.equal(ctx.data.notes[0].text,'Original');assert.equal(ctx.cloudRevision,3);assert.equal(saves,0);if(scenario==='competing')assert.equal(ctx.conflictReview.conflicts.length,1);}
}
const source=readFileSync(new URL('../dist/account.js',import.meta.url),'utf8');
const saveCode=source.slice(source.indexOf('save=function(){'),source.indexOf('async function pollCloud()'));
let resolveSave;const durable=new Promise(resolve=>resolveSave=resolve),statuses=[];
const ctx=vm.createContext({save:null,currentUser:{id:'owner'},dirty:false,localGeneration:0,cacheCloud:()=>durable,invalidSyncNotified:false,syncConflict:false,syncBlocked:false,navigator:{onLine:false},syncStatus:(text)=>statuses.push(text),clearTimeout(){},setTimeout(){return 1;},syncTimer:0,flushCloud(){},notify(){}});
vm.runInContext(saveCode,ctx);assert.equal(ctx.save(),true);assert.match(statuses.at(-1),/Đang lưu/);assert.ok(!statuses.some(x=>/Đã lưu/.test(x)));
resolveSave();await durable;await Promise.resolve();assert.match(statuses.at(-1),/Đã lưu trên máy/);
console.log('PASS: real rebase integration preserves in-flight edits and account switches; competing fields require review; save confirmation waits for durable transaction.');
