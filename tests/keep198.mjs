import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const p of ['dist/keep198.js','dist/notes196.js','dist/note-enhancements.js'])execFileSync(process.execPath,['--check',new URL('../'+p,import.meta.url).pathname]);
const source=read('dist/keep198.js');
const ctx=vm.createContext({
 URL,
 noteContent:()=>'<p>previous</p>',
 noteExtraValues:()=>({type:'note'}),
 noteForm:()=>{},render:()=>{},
 esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
 noteMotif:()=> 'none',data:{notes:[]},view:'dashboard',contentReadOnly:false,
 document:{addEventListener(){},querySelector(){return null;}}
});
vm.runInContext(source,ctx);
const evalJS=js=>vm.runInContext(js,ctx);
for(const motif of ['leaves','forest','lotus','meditation','awareness','yoga','awakening','stream']){
 assert.match(evalJS('zenPattern('+JSON.stringify(motif)+')'),/svg/);
 assert.ok(evalJS('zenPattern('+JSON.stringify(motif)+')').length>250);
}
assert.equal(evalJS("zenPattern('none')"),'');
assert.match(evalJS("zenFormattedHTML('# Thực hành')"),/<h1>Thực hành<\/h1>/);
assert.match(evalJS("zenFormattedHTML('## Tỉnh thức')"),/<h2>Tỉnh thức<\/h2>/);
assert.match(evalJS("zenFormattedHTML('**Đậm** *Nghiêng* __Gạch dưới__ ~~Gạch ngang~~')"),/<strong>Đậm<\/strong>/);
assert.match(evalJS("zenFormattedHTML('__Gạch dưới__')"),/<u>Gạch dưới<\/u>/);
assert.match(evalJS("zenFormattedHTML('~~Gạch ngang~~')"),/<s>Gạch ngang<\/s>/);
assert.ok(!evalJS("zenFormattedHTML('<script>')").includes('<script>'));
assert.equal(evalJS("zenURL('javascript:alert(1)')"),null);
assert.equal(evalJS("zenURL('https://test.com/').hostname"),'test.com');
assert.equal(evalJS("zenOldExtra({querySelector(){return null}},{}).type"),'note');
assert.equal(evalJS("noteExtraValues({querySelector(){return {value:'true'}}},{}).pinned"),true);
assert.equal(evalJS("noteExtraValues({querySelector(){return {value:'false'}}},{pinned:true}).pinned"),false);
assert.ok(read('dist/notes196.js').includes("requestAPI('resources?"),'searches real resource API');
assert.ok(read('dist/notes196.js').includes('n.items'),'searches checklist data');
assert.ok(read('dist/index.html').includes('src="/keep198.js"'));
assert.ok(JSON.parse(read('scripts/assets.json')).some(([route])=>route==='/keep198.js')); 
for(const path of ['dist/app.js','server/api.mjs'])assert.match(read(path),/typeof\s+n\.pinned\s*!==\s*'boolean'/,path+' pinned validator');
console.log('PASS: illustrated motifs, formatted safe markup, PIN state, global resources search and JS syntax.');

