import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const asset=readFileSync(new URL('../dist/note-enhancements.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/api.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
const context=vm.createContext({
 noteContent:n=>'<p>'+n.title+'</p>',
 noteExtraValues:()=>({type:'todo',items:[]}),
 noteForm:()=>{},
 render:()=>{},
 document:{querySelectorAll:()=>[]},
 data:{notes:[]},view:'notes',notify:()=>{}
});
vm.runInContext(asset,context,{filename:'note-enhancements.js'});
const read=expression=>vm.runInContext(expression,context);
assert.equal(read("Object.keys(NOTE_MOTIFS).length"),9);
assert.equal(read("noteMotif({motif:'lotus'})"),'lotus');
assert.equal(read("noteMotif({motif:'../../oops'})"),'none');
assert.equal(read("noteMotif({})"),'none');
assert.equal(read("noteChecklistStats({items:[]}).pct"),0);
assert.equal(read("noteChecklistStats({items:[{text:'A',done:true},{text:'B',done:false},{text:'C',done:true}]}).pct"),67);
assert.equal(read("noteChecklistStats({items:[{text:'A',done:true},{text:'B',done:true}]}).pct"),100);
assert.match(read("noteContent({type:'todo',title:'Checklist',items:[{text:'A',done:true},{text:'B',done:false}]})"),/aria-valuenow="50"/);
assert.match(read("noteContent({type:'todo',title:'Checklist',items:[{text:'A',done:true},{text:'B',done:false}]})"),/1\/2 mục hoàn thành/);
assert.doesNotMatch(read("noteContent({type:'note',title:'Văn bản',items:[]})"),/note-progress/);
assert.equal(read("noteExtraValues({querySelector:()=>({value:'forest'})},{}).motif"),'forest');
assert.equal(read("noteExtraValues({querySelector:()=>null},{motif:'meditation'}).motif"),'meditation');
assert.equal(read("noteExtraValues({querySelector:()=>({value:'bad'})},{} )"),false);
assert.ok(asset.includes("editor.noteCommit()===true"),'uses existing validated save');
assert.ok(asset.includes('data-note-add-item'),'visible add button');
assert.ok(asset.includes("queueMicrotask"),'deletion commits after existing handler');
assert.ok(app.includes("n.motif!==undefined"),'client validation');
assert.ok(server.includes("n.motif!==undefined"),'server validation');
assert.ok(html.includes('src="/note-enhancements.js"'),'bundled enhancement loaded');
assert.ok(css.includes('.note-motif-picker')&&css.includes('.note-progress-track'),'visual elements styled');
console.log('PASS: motif allowlist, checklist progress, validated autosave hooks, script inclusion and client/server validation.');
