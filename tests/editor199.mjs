import {changesBetween} from '../dist/modules/delta.mjs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('dist/editor199.js');
const ctx=vm.createContext({structuredClone,noteForm(){},document:{},contentReadOnly:false});
vm.runInContext(source,ctx);
const expr=code=>vm.runInContext(code,ctx);
function txt(value){return {nodeType:3,nodeValue:value};}
function element(tag,...children){return {nodeType:1,tagName:tag.toUpperCase(),childNodes:children,getAttribute(){return '';}};}
function serialize(...nodes){ctx.testRoot=element('div',...nodes);return expr('zenRichMarkdown(testRoot)');}
assert.equal(serialize(element('p',txt('Trực tiếp'))),'Trực tiếp');
assert.equal(serialize(element('h1',txt('Tiêu đề lớn'))),'# Tiêu đề lớn');
assert.equal(serialize(element('h2',txt('Tiêu đề vừa'))),'## Tiêu đề vừa');
assert.equal(serialize(element('p',txt('Văn bản '),element('strong',txt('đậm')),txt(' và '),element('em',txt('nghiêng')))), 'Văn bản **đậm** và *nghiêng*');
assert.equal(serialize(element('p',element('u',txt('Gạch dưới')),txt(' '),element('s',txt('Gạch ngang')))), '__Gạch dưới__ ~~Gạch ngang~~');
assert.equal(serialize(element('p',txt('dòng 1')),element('p',txt('dòng 2'))),'dòng 1\ndòng 2');
assert.ok(source.includes("document.execCommand('insertText'"),'safe paste inserts only plaintext');
assert.ok(source.includes("source.classList.add('zen-source-textarea')"),'preserves named textarea as FormData source');
assert.ok(source.includes("setTimeout(commit,900)"),'debounced save');
assert.ok(source.includes("editor.noteCommit?.()===true"),'uses existing validated workspace save');
const css=read('dist/style.css'),html=read('dist/index.html');
assert.ok(css.includes('#editor.keep-editor .zen-wysiwyg')&&css.includes('.zen-search-popover'));
assert.ok(html.includes('src="/editor199.js"'));
const search=read('dist/notes196.js');
assert.ok(search.includes('document.body.append(panel)')&&search.includes('rect.right-width'),'search is attached to input, not top-actions');
assert.ok(search.includes("requestAPI('resources?"),'server-side filename index still queried');
const sync=read('dist/account.js');
const start=sync.indexOf('let syncAgain=false'),end=sync.indexOf('async function pollCloud()',start);
assert.ok(start>0&&end>start,'new sync implementation found');
async function runSync(testcase){
 const status=[],calls=[];
 const context=vm.createContext({structuredClone,localGeneration:0,pendingLocalSave:Promise.resolve(),deltaReady:Promise.resolve({changesBetween}),
  TextEncoder,
  currentUser:{id:'user-1'},dirty:true,syncing:false,syncConflict:false,cloudRevision:4,
  data:{schema:1,projects:[],notes:[]},syncTimer:0,save:null,KEY:'test',
  navigator:{onLine:true},syncStatus:s=>status.push(s),notify:()=>{},
  cacheCloud:()=>{},valid:()=>testcase!=='invalid',
  setTimeout:(fn,ms)=>{calls.push(ms);return 5;},clearTimeout:()=>{},
  requestAPI:async(path,method,body)=>{
   assert.equal(path,'workspace-v2');assert.equal(method,'POST');
   if(testcase==='pending'){context.data.notes.push({id:'other-change'});context.localGeneration++;await context.flushCloud();}
   if(testcase==='conflict')throw {status:409};
   return {revision:5};
  }
 });
 vm.runInContext(sync.slice(start,end),context);
 if(testcase==='offline')context.navigator.onLine=false;
 await context.flushCloud();
 return {ctx:context,status,calls};
}
let x=await runSync('success');assert.equal(x.ctx.dirty,false);assert.equal(x.ctx.cloudRevision,5);assert.match(x.status.at(-1),/Đã đồng bộ/);
x=await runSync('pending');assert.equal(x.ctx.dirty,true);assert.ok(x.calls.includes(800));
x=await runSync('conflict');assert.equal(x.ctx.syncConflict,true);assert.equal(x.ctx.cloudRevision,4);assert.ok(!x.calls.length);
x=await runSync('invalid');assert.equal(x.ctx.dirty,true);assert.match(x.status.at(-1),/không hợp lệ/);assert.equal(x.calls.length,0);
x=await runSync('offline');assert.equal(x.ctx.dirty,true);assert.match(x.status.at(-1),/Chờ kết nối/);assert.equal(x.calls.length,0);
console.log('PASS: WYSIWYG formatting serializer, safe paste, live editor integration, compact search, sync success/pending/offline/invalid/conflict.');
