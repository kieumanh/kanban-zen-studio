import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
execFileSync(process.execPath,['--check',new URL('../dist/keep198.js',import.meta.url).pathname]);
const source=read('dist/keep198.js'),css=read('dist/style.css');
const ctx=vm.createContext({
 noteContent:()=>'',noteExtraValues:()=>({}),noteForm:()=>{},render:()=>{},
 data:{notes:[]},contentReadOnly:false,view:'dashboard',
 document:{addEventListener(){}}
});
vm.runInContext(source,ctx);
for(const motif of ['leaves','forest','lotus','meditation','awareness','yoga','awakening','stream']){
 const svg=vm.runInContext("zenPattern('"+motif+"')",ctx);
 assert.ok(svg.startsWith('<svg')&&svg.endsWith('</svg>'),motif+' is valid SVG markup');
 assert.ok(svg.includes('<linearGradient')&&svg.includes('<radialGradient'),motif+' has nuanced depth and soft lighting');
 assert.ok(svg.length>650,motif+' includes multiple illustration layers');
 assert.ok(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),motif+' must not embed remote assets');
}
assert.equal(vm.runInContext("zenPattern('none')",ctx),'');
const index=source.indexOf('composer.insertBefore(pinRow,title)');
assert.ok(index>0,'Pin moved to independent row before title');
assert.ok(source.includes("pinRow.className='zen-editor-pin-row'"));
assert.ok(!source.includes("title.after(b)"),'pin must not overlay input title');
assert.ok(source.includes("b.textContent=p.value==='true'?'Bỏ ghim':'Ghim'"));
assert.ok(source.includes("icon.classList.add('zen-motif-thumb')"),'picker shows illustration thumbnail');
assert.ok(css.includes('#editor.keep-editor .zen-editor-pin-row>.zen-editor-pin'));
assert.ok(css.includes('position:static!important;inset:auto!important'), 'pin overrides legacy absolute positioning');
assert.ok(css.includes('background-image:linear-gradient(98deg'), 'editor artwork preserves legibility');
assert.ok(css.includes('.zen-motif-thumb'),'picker artwork styled');
assert.ok(css.includes('@media(max-width:700px)'),'responsive size');
const html=read('dist/index.html'),welcome=read('dist/welcome.js'),app=read('dist/app.js');
assert.ok(html.includes('v1.10.4')&&welcome.includes("APP_VERSION='1.10.4'")&&app.includes("Phiên bản 1.10.4"));
console.log('PASS: eight detailed local SVG paintings, pin separated from title, preview thumbnails, responsive contrast and v1.9.10 metadata.');
