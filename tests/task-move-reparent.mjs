// v1.71.0: việc chuyển sang dự án khác thì tệp đính kèm và tệp trong kho phải đi theo; kiểm cả khi workspace lớn.
// Trước v1.71.0 việc tìm "dự án cũ" của từng việc quét lồng nhau (O(N²)); bài này khóa hành vi để bản chỉ mục (Map) đúng như bản cũ.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash, validWorkspace } from '../server/api.mjs';
import { changesBetween } from '../dist/modules/delta.mjs';

const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
class Statement {
  constructor(text) { this.text = text; }
  bind(...values) { this.values = values; return this; }
  async first() { return sql.prepare(this.text).get(...this.values) || null; }
  async run() { return { meta: sql.prepare(this.text).run(...this.values) }; }
  async all() { return { results: sql.prepare(this.text).all(...this.values) }; }
}
const DB = {
  prepare: (text) => new Statement(text),
  async batch(statements) {
    sql.exec('BEGIN');
    try {
      const out = [];
      for (const s of statements) out.push(/\bRETURNING\b/i.test(s.text) ? await s.all() : await s.run());
      sql.exec('COMMIT');
      return out;
    } catch (e) { sql.exec('ROLLBACK'); throw e; }
  },
};
const env = { DB, FILES: { async put() {}, async get() { return null; } } };
const password = 'Test passphrase for task moves';
sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('owner', 'owner@example.test', await passwordHash(password));
async function req(path, method = 'GET', data, cookie = '') {
  const headers = { 'CF-Connecting-IP': '192.0.2.9', Cookie: cookie };
  if (method !== 'GET') { headers.Origin = 'https://kanban.huongthiennature.com'; headers['Content-Type'] = 'application/json'; }
  return api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
}
const login = await req('login', 'POST', { email: 'owner@example.test', password, rememberDevice: true });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];

const COLS = ['Idea', 'List', 'Doing', 'Done'];
const project = (id, tasks) => ({
  id, name: 'Dự án ' + id, description: '', color: '#7950c8', icon: '✺', columns: COLS,
  columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' },
  tasks: tasks.map((tid, i) => ({ id: tid, title: 'Việc ' + tid, col: COLS[i % 3], description: '', due: '2026-11-05', tag: 'a', priority: 'q2', checks: [] })),
});
const ids = (p, n) => Array.from({ length: n }, (_, i) => p + 't' + i);

// Dữ liệu lớn: 10 dự án x 200 việc = 2.000 việc (đủ để bản O(N²) cũ chậm rõ nhưng test vẫn nhanh).
let base = { schema: 1, notes: [], projects: Array.from({ length: 10 }, (_, i) => project('p' + i, ids('p' + i, 200))) };
assert.ok(validWorkspace(base), 'dữ liệu mẫu phải hợp lệ');
const first = await req('workspace-v2', 'GET', null, cookie);
assert.equal(first.status, 200);
let revision = (await first.json()).revision ?? 0;
const initial = changesBetween({ schema: 1, notes: [], projects: [] }, base);
const seeded = await req('workspace-v2', 'POST', { revision, changes: initial }, cookie);
assert.equal(seeded.status, 200, 'gửi dữ liệu lớn lần đầu');
revision = (await seeded.json()).revision;

// Tệp của việc p0t5 (đang ở p0) và việc p3t7 (đứng yên).
const att = sql.prepare('INSERT INTO attachments(id,user_id,project_id,task_id,name,content,size,created) VALUES(?,?,?,?,?,?,?,?)');
att.run('a-move', 'owner', 'p0', 'p0t5', 'a.txt', 'x', 1, 1);
att.run('a-stay', 'owner', 'p3', 'p3t7', 'b.txt', 'x', 1, 1);
const obj = sql.prepare('INSERT INTO object_files(id,user_id,object_key,upload_id,name,mime,size,scope,state,created) VALUES(?,?,?,?,?,?,?,?,?,?)');
obj.run('o-move', 'owner', 'k1', 'u1', 'a.bin', 'application/octet-stream', 1, 'project:p0:task:p0t5', 'ready', 1);
obj.run('o-stay', 'owner', 'k2', 'u2', 'b.bin', 'application/octet-stream', 1, 'project:p3:task:p3t7', 'ready', 1);

// Chuyển p0t5 từ p0 sang p9.
const moved = structuredClone(base);
const [task] = moved.projects[0].tasks.splice(5, 1);
moved.projects[9].tasks.push(task);
const res = await req('workspace-v2', 'POST', { revision, changes: changesBetween(base, moved) }, cookie);
assert.equal(res.status, 200, 'chuyển việc sang dự án khác');
revision = (await res.json()).revision;

assert.equal(sql.prepare("SELECT project_id FROM attachments WHERE id='a-move'").get().project_id, 'p9', 'tệp đính kèm của việc chuyển đi phải đổi dự án');
assert.equal(sql.prepare("SELECT scope FROM object_files WHERE id='o-move'").get().scope, 'project:p9:task:p0t5', 'tệp trong kho của việc chuyển đi phải đổi phạm vi');
assert.equal(sql.prepare("SELECT project_id FROM attachments WHERE id='a-stay'").get().project_id, 'p3', 'việc đứng yên không bị đổi');
assert.equal(sql.prepare("SELECT scope FROM object_files WHERE id='o-stay'").get().scope, 'project:p3:task:p3t7', 'tệp của việc đứng yên không bị đổi');

// Sửa tiêu đề một việc (không chuyển) thì không đụng tới tệp nào.
const edited = structuredClone(moved);
edited.projects[2].tasks[0].title = 'Đổi tên';
const res2 = await req('workspace-v2', 'POST', { revision, changes: changesBetween(moved, edited) }, cookie);
assert.equal(res2.status, 200);
assert.equal(sql.prepare("SELECT project_id FROM attachments WHERE id='a-move'").get().project_id, 'p9');
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM attachments WHERE project_id='p0'").get().n, 0);
console.log('PASS: chuyển việc giữ đúng tệp đính kèm trên workspace 2.000 việc');
