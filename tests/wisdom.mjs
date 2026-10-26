import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const quotes=JSON.parse(read('dist/wisdom.json')),teachers=JSON.parse(read('dist/teachers.json')),
  status=JSON.parse(read('dist/wisdom-status.json')),source=read('dist/welcome.js');
const active=quotes.filter(q=>q.kind!=='reflection');
assert.equal(new Set(quotes.map(q=>q.id)).size,quotes.length,'stable IDs must be unique');
assert.equal(new Set(active.map(q=>q.vi.normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim())).size,active.length,'Vietnamese duplicates');
assert.equal(status.sourcedExcerpts,active.length);
assert.equal(status.editorialReflections,quotes.length-active.length);
assert.equal(status.remaining,Math.max(0,status.target-active.length));
assert.equal(status.target,3333);
assert.equal(status.complete,active.length===status.target);
for(const q of quotes){
  assert.ok(q.vi.trim()&&q.text.trim()&&q.author.trim()&&q.source.trim());
  assert.ok(['https:','http:'].includes(new URL(q.url).protocol));
  if(q.batch)assert.equal(q.sourceChecked,true);
  if(q.kind==='reflection')assert.match(q.attribution,/Zen Studio/);
  if(q.sourceFile){
    const normalized=s=>q.language==='zh'?s.replace(/\s+/g,''):s.replace(/\s+/g,' ').trim();
    assert.ok(normalized(read(q.sourceFile)).includes(normalized(q.text)),q.id+' source alignment');
  }
}
assert.ok(active.some(q=>q.author==='Mạnh Tử'&&q.text.includes('養心莫善於寡欲')));
assert.ok(active.some(q=>q.author==='Tuân Tử'&&q.text.includes('學不可以已')));
assert.ok(active.filter(q=>q.sourceFile==='sources/zhuangzi-giles.txt').every(q=>q.attribution.includes('Nam Hoa Kinh')&&q.source.includes('nhân vật')));
for(const name of ['Trang Tử','Tuân Tử']){
  const profile=teachers.profiles.find(p=>p.name===name);
  assert.ok(profile.image.startsWith('data:image/jpeg;base64,'));
  assert.ok(profile.imageSource.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.ok(profile.imageKind.includes('Tranh'));
}
const ctx=vm.createContext({wisdomCache:quotes,teacherCache:teachers});
const slot=source.slice(source.indexOf('function welcomeSlot('),source.indexOf('// Pure selection functions'));
vm.runInContext(slot+read('scripts/wisdom-selection.js'),ctx);
const evaluate=s=>vm.runInContext(s,ctx);
const epoch=Math.floor(Date.parse('2026-10-24T00:00:00Z')/86400000)*4;
const deck=evaluate('welcomeDeck(wisdomCache,teacherCache.profiles)');
assert.equal(deck.length,quotes.length,'every excerpt must be reachable');
assert.equal(new Set(deck.map(x=>x.quote.id)).size,quotes.length);
assert.ok(deck.some(x=>x.quote.author==='Marcus Aurelius'&&x.profile?.name==='Marcus Aurelius'));
assert.equal(evaluate('welcomeDeck([{author:"Unknown teacher",vi:"A genuine excerpt"}],[]).length'),1);
const cycle=Array.from({length:quotes.length},(_,i)=>evaluate('welcomeSelection({serial:'+ (epoch+i) +'}).quote.id'));
assert.equal(new Set(cycle).size,quotes.length,'no repeat within full cycle');
assert.equal(evaluate('welcomeSelection({serial:'+ (epoch+quotes.length) +'}).quote.id'),cycle[0]);
for(const [iso,day,slotIndex] of [
  ['2026-10-24T21:59:00Z','2026-10-24',3],
  ['2026-10-24T22:00:00Z','2026-10-25',0],
  ['2026-10-25T04:00:00Z','2026-10-25',1],
  ['2026-10-25T07:00:00Z','2026-10-25',2],
  ['2026-10-25T11:00:00Z','2026-10-25',3],
  ['2026-10-25T17:00:00Z','2026-10-25',3]
]){
  const result=evaluate('welcomeSlot(new Date('+JSON.stringify(iso)+'))');
  assert.equal(result.day,day);assert.equal(result.slot,slotIndex);
}
const before=read('dist/wisdom.json');
const {execFileSync}=await import('node:child_process');
execFileSync('python3',['scripts/expand-wisdom.py'],{cwd:new URL('../',import.meta.url)});
assert.equal(read('dist/wisdom.json'),before,'reimport must be idempotent');
assert.ok(source.includes('q.attribution||q.author'));
const worker=read('worker.mjs');
assert.ok(worker.includes('"/teachers.json"'));
assert.ok(worker.includes('"/wisdom-status.json"'));
assert.ok(worker.includes("version:'1.9.10'"));
console.log('Wisdom: '+active.length+' sourced excerpts; full-cycle, timezone, deduplication and idempotency checks passed.');
