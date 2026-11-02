import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {api,passwordHash} from '../server/api.mjs';
import {changesBetween} from '../dist/modules/delta.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
class Statement{constructor(text){this.text=text;}bind(...values){this.values=values;return this;}async first(){return sql.prepare(this.text).get(...this.values)||null;}async run(){return {meta:sql.prepare(this.text).run(...this.values)};}async all(){return {results:sql.prepare(this.text).all(...this.values)};}}
const DB={prepare:text=>new Statement(text),async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(/\bRETURNING\b/i.test(s.text)?await s.all():await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const objects=new Map(),env={DB,FILES:{async put(key,bytes){objects.set(key,bytes);},async get(key){const bytes=objects.get(key);return bytes?{body:bytes,size:bytes.length}:null;}}};
const password='Test passphrase for remembered devices';sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('owner','owner@example.test',await passwordHash(password));
async function req(path,method='GET',data,cookie=''){const headers={'CF-Connecting-IP':'192.0.2.5',Cookie:cookie};if(method!=='GET'){headers.Origin='https://kanban.huongthiennature.com';headers['Content-Type']='application/json';}return api(new Request('https://kanban.huongthiennature.com/api/'+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);}
// Hồi quy v1.16.4: phiên "ghi nhớ thiết bị" không còn bị đòi nhập lại mật khẩu khi xóa vĩnh viễn trong Thùng rác (lưu thay đổi và xóa tệp đính kèm).
// Chia sẻ vẫn đòi mật khẩu; dữ liệu đang dùng biến mất mà không vào Thùng rác vẫn bị chặn.
const login=await req('login','POST',{email:'owner@example.test',password,rememberDevice:true});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
let base=(await(await req('workspace-v2','GET',null,cookie)).json()).data,revision=0;
const withTrash=structuredClone(base);withTrash.projects.push({id:'p1',name:'Dự án',description:'',color:'#7950c8',icon:'✺',columns:['Idea','List','Doing','Done'],tasks:[{id:'t0',title:'Việc còn lại',col:'List',description:'',due:'',tag:'Công việc',priority:'q2',checks:[]}]});
withTrash.trash=[{id:'tr1',at:Date.now(),kind:'task',name:'Việc đã xóa',payload:JSON.stringify({id:'t1',title:'Việc đã xóa',col:'List'}),parent:''},{id:'tr2',at:Date.now(),kind:'project',name:'Dự án đã xóa',payload:JSON.stringify({id:'p2',name:'Dự án đã xóa',columns:['Idea','List','Doing','Done'],tasks:[]}),parent:''}];
let r=await req('workspace-v2','POST',{revision,changes:changesBetween(base,withTrash)},cookie);assert.equal(r.status,200,await r.clone().text());revision=(await r.json()).revision;
sql.prepare('UPDATE sessions SET reauth_at=0').run();
// 1. Dọn sạch Thùng rác (xóa vĩnh viễn hai mục) khi phiên đã quá 10 phút kể từ lần nhập mật khẩu: phải được lưu, không đòi mật khẩu.
const emptied=structuredClone(withTrash);emptied.trash=[];
r=await req('workspace-v2','POST',{revision,changes:changesBetween(withTrash,emptied)},cookie);assert.equal(r.status,200,'Dọn Thùng rác không được đòi mật khẩu: '+await r.clone().text());revision=(await r.json()).revision;
assert.equal((await(await req('workspace','GET',null,cookie)).json()).data.trash.length,0);
// 2. Xóa tệp đính kèm trong Thùng rác (assets/purge) không đòi mật khẩu.
r=await req('assets/purge','POST',{items:[]},cookie);assert.notEqual(r.status,403,'assets/purge không được đòi mật khẩu: '+await r.clone().text());
// 3. Chia sẻ vẫn đòi mật khẩu.
r=await req('board-share','POST',{},cookie);assert.equal(r.status,403);assert.equal((await r.json()).code,'REAUTH_REQUIRED');
// 4. Dữ liệu đang dùng biến mất mà không vào Thùng rác vẫn bị chặn.
const vanished=structuredClone(emptied);vanished.projects[0].tasks=[];
r=await req('workspace-v2','POST',{revision,changes:changesBetween(emptied,vanished)},cookie);assert.equal(r.status,403);assert.equal((await r.json()).code,'REAUTH_REQUIRED');
console.log('PASS: dọn Thùng rác và xóa tệp đính kèm không cần mật khẩu; chia sẻ và mất dữ liệu ngoài Thùng rác vẫn cần mật khẩu.');
