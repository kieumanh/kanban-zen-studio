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
// v1.22.0: mục tiêu tuần (1–7) và liên kết dự án là tùy chọn; mục tiêu ngoài 1–7 bị từ chối.
const linked={id:'h-3',name:'Tưới cây',icon:'🌱',color:'#3a6fb0',createdAt:'2026-11-05',done:[],goal:3,projectId:'p-farm'};
next=structuredClone(before);next.dailyHabits.push(linked);
await push(next,'thêm việc có mục tiêu 3 lần/tuần và dự án');
loaded=(await(await req('workspace-v2','GET',null,cookie)).json()).data;
const savedLinked=loaded.dailyHabits.find(h=>h.id==='h-3');
assert.equal(savedLinked.goal,3,'mục tiêu tuần phải được lưu');
assert.equal(savedLinked.projectId,'p-farm','liên kết dự án phải được lưu');
const badGoal=structuredClone(before);badGoal.dailyHabits.push({...linked,id:'h-4',goal:9});
const rejectedGoal=await req('workspace-v2','POST',{revision,changes:changesBetween(before,badGoal)},cookie);
assert.ok(rejectedGoal.status>=400,'mục tiêu 9 lần/tuần phải bị từ chối, nhận '+rejectedGoal.status);
const bad=structuredClone(before);bad.dailyHabits[0].color='đỏ';
const rejected=await req('workspace-v2','POST',{revision,changes:changesBetween(before,bad)},cookie);
assert.ok(rejected.status>=400,'máy chủ phải từ chối màu sai, nhận '+rejected.status);
// v1.34.0: giờ nhắc riêng (HH:MM, 24 giờ) là tùy chọn; giờ sai định dạng hoặc ngoài khoảng bị từ chối.
const reminded={id:'h-5',name:'Uống đủ nước',icon:'💧',color:'#3a6fb0',createdAt:'2026-11-05',done:[],remindTime:'07:30'};
next=structuredClone(before);next.dailyHabits.push(reminded);
await push(next,'thêm việc có giờ nhắc 07:30');
loaded=(await(await req('workspace-v2','GET',null,cookie)).json()).data;
assert.equal(loaded.dailyHabits.find(h=>h.id==='h-5').remindTime,'07:30','giờ nhắc phải được lưu');
for(const badTime of ['7:30','25:00','07:60','0730']){const b=structuredClone(before);b.dailyHabits.push({...reminded,id:'h-6',remindTime:badTime});const r=await req('workspace-v2','POST',{revision,changes:changesBetween(before,b)},cookie);assert.ok(r.status>=400,'giờ nhắc '+badTime+' phải bị từ chối, nhận '+r.status);}
// v1.38.0: ghi chú theo ngày được lưu; ngày sai, ghi chú rỗng, quá 140 ký tự hoặc sai kiểu bị từ chối.
next=structuredClone(before);next.dailyHabits.push({id:'h-7',name:'Đi bộ',icon:'🌿',color:'#2e7d5b',createdAt:'2026-11-05',done:[],notes:{'2026-11-05':'Đi bộ 20 phút, thấy nhẹ đầu'}});
await push(next,'thêm ghi chú theo ngày');
loaded=(await(await req('workspace-v2','GET',null,cookie)).json()).data;
assert.equal(loaded.dailyHabits.find(h=>h.id==='h-7').notes['2026-11-05'],'Đi bộ 20 phút, thấy nhẹ đầu','ghi chú theo ngày phải được lưu');
for(const notes of [{'2026-13-01':'x'},{'':'x'},{'2026-11-05':''},{'2026-11-05':'   '},{'2026-11-05':'x'.repeat(141)},{'2026-11-05':5},['2026-11-05','x'],'chuỗi']){const b=structuredClone(before);b.dailyHabits.push({id:'h-8',name:'Đi bộ',icon:'🌿',color:'#2e7d5b',createdAt:'2026-11-05',done:[],notes});const r=await req('workspace-v2','POST',{revision,changes:changesBetween(before,b)},cookie);assert.ok(r.status>=400,'ghi chú sai '+JSON.stringify(notes).slice(0,40)+' phải bị từ chối, nhận '+r.status);}
// v1.39.0: thứ tự việc được lưu và đồng bộ: đảo thứ tự, tải lại vẫn đúng thứ tự.
const orderIds=before.dailyHabits.map(h=>h.id);
next=structuredClone(before);next.dailyHabits=[...next.dailyHabits].reverse();
await push(next,'đổi thứ tự việc');
loaded=(await(await req('workspace-v2','GET',null,cookie)).json()).data;
assert.deepEqual(loaded.dailyHabits.map(h=>h.id),[...orderIds].reverse(),'thứ tự việc phải được lưu và tải lại');
console.log('PASS: Việc hằng ngày đồng bộ qua kho máy chủ (thêm, tích, xóa, tải lại, giờ nhắc, từ chối dữ liệu sai)');
