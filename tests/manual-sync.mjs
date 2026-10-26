import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('dist/account.js'),start=source.indexOf('function manualSyncSummary('),end=source.indexOf('function accountPanel()',start);
assert.ok(start>0&&end>start,'manual-sync report function available');
assert.match(source,/id="sync-now" aria-controls="sync-report"/);
assert.match(source,/\$\{svgIcon\('sync'\)\}/);
assert.ok(source.includes("$('#sync-now').onclick=runManualSyncReport;"));
const component=source.slice(start,end);
const css=read('dist/style.css');
assert.match(css,/\.sync-report\[hidden\]\{display:none!important\}/);
assert.match(css,/sync-now-working .sync-now-icon/);
function node(){
 return {
  dataset:{},children:[],hidden:true,disabled:false,isConnected:true,classList:{add(){},remove(){}},
  textContent:'',setAttribute(){},removeAttribute(){},
  append(...items){this.children.push(...items);},replaceChildren(...items){this.children=[...items];}
 };
}
async function caseRun(name,opts={}){
 const button=node(),panel=node(),events=[],requests=[];
 let mockData={schema:1,projects:[{id:'p1',tasks:[{id:'t1'}]}],notes:[{id:'n1',text:'a'}]};
 const context=vm.createContext({structuredClone,
  currentUser:{id:'user1'},
  dirty:!!opts.dirty, syncConflict:!!opts.conflict, syncBlocked:!!opts.blocked,
  syncing:false, cloudRevision:7,
  data:mockData,navigator:{onLine:opts.online!==false},
  document:{querySelector:k=>k==='#sync-now'?button:k==='#sync-report'?panel:null,createElement:node},
  requestAPI:async(path)=>{
   requests.push(path);
   if(opts.reject!==undefined)throw {status:opts.reject};
   return opts.remote||{unchanged:true,revision:context.cloudRevision};
  },
  flushCloud:async()=>{events.push('upload');if(opts.upload==='success'){context.dirty=false;context.cloudRevision=8;}else if(opts.upload==='invalid'){context.syncBlocked=true;}},
  cacheCloud:()=>events.push('cache'),
  render:()=>events.push('render'),
  valid:()=>true,syncStatus:(...args)=>events.push(['status',...args]),
  setTimeout,clearTimeout,
  Intl,Date,JSON
 });
 vm.runInContext(component,context);
 await context.runManualSyncReport();
 const result={name,state:panel.dataset.result,text:panel.children.map(c=>c.textContent||'').join(' '),events,requests,context,button,panel};
 assert.equal(button.disabled,false,name+' re-enables sync button');
 return result;
}
let r=await caseRun('no changes');
assert.equal(r.state,'synced');assert.deepEqual(r.requests,['workspace?revision=7']);
assert.ok(r.text.includes('phiên bản')||r.text.includes('thành công'));
r=await caseRun('upload',{dirty:true,upload:'success'});
assert.equal(r.state,'synced');assert.deepEqual(r.requests,['workspace?revision=8']);
assert.equal(r.context.cloudRevision,8);
r=await caseRun('download',{remote:{revision:9,data:{schema:1,projects:[],notes:[]}}});
assert.equal(r.state,'synced');assert.equal(r.context.cloudRevision,9);
assert.deepEqual(r.events.filter(x=>typeof x==='string'),['cache','render']);
r=await caseRun('offline',{online:false});
assert.equal(r.state,'offline');assert.equal(r.requests.length,0);
r=await caseRun('conflict',{conflict:true});
assert.equal(r.state,'conflict');assert.equal(r.requests.length,0);
r=await caseRun('invalid',{dirty:true,upload:'invalid'});
assert.equal(r.state,'invalid');assert.equal(r.requests.length,0);
r=await caseRun('still pending',{dirty:true,upload:'pending'});
assert.equal(r.state,'pending');assert.equal(r.requests.length,0);
r=await caseRun('server down',{reject:503});
assert.equal(r.state,'error');
r=await caseRun('connection timed out',{reject:0});
assert.equal(r.state,'offline');
assert.ok(read('dist/index.html').includes('v1.9.11')||read('dist/index.html').includes('v1.10.3'),'valid release');
console.log('PASS: sync button icon + manual verified report across success/upload/download/offline/conflict/invalid/pending/error.');
