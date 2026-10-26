import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {api,daily} from '../server/api.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('dist/release200.js');
const mergeCode=source.slice(0,source.indexOf('async function rebaseWorkspace'));
const c=vm.createContext({structuredClone});vm.runInContext(mergeCode,c);
const merge=(b,l,r)=>JSON.parse(JSON.stringify(c.mergeWorkspaceValue(b,l,r)));
const base={notes:[{id:'a',title:'old',text:'old'}],projects:[]};
let local=structuredClone(base),remote=structuredClone(base);
local.notes[0].title='local';remote.notes[0].text='remote';
assert.deepEqual(merge(base,local,remote).notes,[{id:'a',title:'local',text:'remote'}]);
remote.notes[0].title='competing';assert.throws(()=>merge(base,local,remote));
local=structuredClone(base);remote=structuredClone(base);local.notes=[];
assert.deepEqual(merge(base,local,remote).notes,[]);
remote.notes[0].text='changed';assert.throws(()=>merge(base,local,remote));
local=structuredClone(base);remote=structuredClone(base);
local.notes.push({id:'b',title:'local'});remote.notes.push({id:'c',title:'remote'});
assert.deepEqual(merge(base,local,remote).notes.map(n=>n.id),['a','b','c']);
// An actual SQLite transaction verifies history and workspace CAS together.
const db=new DatabaseSync(':memory:');db.exec(read('server/schema.sql'));
class Statement{
 constructor(text){this.text=text;this.values=[];}
 bind(...v){this.values=v;return this;}
 async first(){return db.prepare(this.text).get(...this.values)||null;}
 async all(){return {results:db.prepare(this.text).all(...this.values)};}
 async run(){return {meta:db.prepare(this.text).run(...this.values)};}
}
const env={DB:{prepare:s=>new Statement(s),async batch(ss){db.exec('BEGIN');try{const out=[];for(const s of ss)out.push(/RETURNING/i.test(s.text)?await s.all():await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}}};
const token='a'.repeat(64),otherToken='b'.repeat(64);
for(const [id,t] of [['owner',token],['other',otherToken]]){
 db.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,?)').run(id,id+'@example.test','none',Date.now());
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(t).digest('hex'),id,Date.now()+600000);
}
async function req(path,method='GET',body,t=token){return api(new Request('https://kanban.huongthiennature.com/api/'+path,{method,headers:{Cookie:'zen_session='+t,Origin:'https://kanban.huongthiennature.com','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env);}
const note={id:'n',type:'note',title:'One',text:'First',group:'',url:'',color:'#7950c8'};
let workspace={schema:1,projects:[],notes:[note]};
assert.equal((await req('workspace','PUT',{data:workspace,revision:0})).status,200);
workspace=structuredClone(workspace);workspace.notes[0].text='Second';
assert.equal((await req('workspace','PUT',{data:workspace,revision:1})).status,200);
let versions=(await(await req('note-history?id=n')).json()).versions;
assert.equal(versions.length,1);assert.equal(versions[0].data.text,'First');
assert.equal((await req('workspace','PUT',{data:workspace,revision:1})).status,409);
assert.equal(db.prepare('SELECT count(*) AS n FROM note_versions').get().n,1,'rejected saves create no phantom history');
assert.equal((await(await req('note-history?id=n','GET',undefined,otherToken)).json()).versions.length,0,'history is account-private');
assert.equal((await req('note-history?id=bad%22')).status,400);
workspace.notes[0]=versions[0].data;
assert.equal((await req('workspace','PUT',{data:workspace,revision:2})).status,200);
versions=(await(await req('note-history?id=n')).json()).versions;
assert.equal(versions[0].data.text,'Second','restore retains the replaced current version');
db.prepare('UPDATE note_versions SET saved=? WHERE revision=1').run(Date.now()-8*86400000);
assert.equal((await(await req('note-history?id=n')).json()).versions.length,1,'7-day retention');
db.prepare('UPDATE note_versions SET saved=?').run(Date.now()-8*86400000);
await daily(env);assert.equal(db.prepare('SELECT count(*) AS n FROM note_versions').get().n,0,'scheduled cleanup covers inactive accounts');
console.log('PASS: three-way merge, competing edits/deletions, account-private 7-day history, stale CAS rejection, restore and scheduled expiry.');
