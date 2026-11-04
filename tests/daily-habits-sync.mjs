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
// v1.20.1: máy chủ phải nhận bản ghi "habit:<id>" của Việc hằng ngày (v1.20.0 bị từ chối nên báo "Chưa đồng bộ được").
const login=await req('login','POST',{email:'owner@example.test',password,rememberDevice:true});assert.equal(login.status,200);
const cookie=login.headers.get('set-cookie').split(';')[0];
const first=(await(await req('workspace-v2','GET',null,cookie)).json());let before=first.data,revision=first.revision||0;
async function push(next,what){const changes=changesBetween(before,next);const r=await req('workspace-v2','POST',{revision,changes},cookie);assert.equal(r.status,200,what+': '+await r.clone().text());revision=(await r.json()).revision;before=next;return changes;}
const habit={id:'h-1',name:'Thiền 10 phút',icon:'🧘',color:'#7950c8',createdAt:'2026-11-05',done:[]};
let next=structuredClone(before);next.dailyHabits=[habit];
let changes=await push(next,'thêm việc hằng ngày');
assert.ok(changes.some(c=>c.key==='habit:h-1'),'phải có bản ghi riêng habit:h-1');
let loaded=(await(await req('workspace-v2','GET',null,cookie)).json()).data;
assert.deepEqual(loaded.dailyHabits,[habit],'tải lại phải còn đúng việc hằng ngày');
next=structuredClone(before);next.dailyHabits[0].done=['2026-11-05'];
changes=await push(next,'tích một ngày');
assert.deepEqual(changes.map(c=>c.key),['habit:h-1'],'tích một ngày chỉ đổi đúng một bản ghi');
loaded=(await(await req('workspace','GET',null,cookie)).json()).data;
assert.deepEqual(loaded.dailyHabits[0].done,['2026-11-05'],'đường đọc cũ cũng thấy dấu tích');
next=structuredClone(before);next.dailyHabits.push({...habit,id:'h-2',name:'Đi bộ'});
await push(next,'thêm việc thứ hai');
next=structuredClone(before);next.dailyHabits=next.dailyHabits.filter(h=>h.id!=='h-1');
await push(next,'xóa một việc (không cần xác nhận mật khẩu như dự án/ghi chú)');
loaded=(await(await req('workspace-v2','GET',null,cookie)).json()).data;
assert.deepEqual(loaded.dailyHabits.map(h=>h.id),['h-2'],'sau khi xóa chỉ còn việc còn lại');
const bad=structuredClone(before);bad.dailyHabits[0].color='đỏ';
const rejected=await req('workspace-v2','POST',{revision,changes:changesBetween(before,bad)},cookie);
assert.ok(rejected.status>=400,'máy chủ phải từ chối màu sai, nhận '+rejected.status);
console.log('PASS: Việc hằng ngày đồng bộ qua kho máy chủ (thêm, tích, xóa, tải lại, từ chối dữ liệu sai)');
