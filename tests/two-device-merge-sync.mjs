// v1.29.0: hai thiết bị cùng tài khoản. Thiết bị B gửi thay đổi bằng mốc cũ sau khi thiết bị A đã lưu.
// Kiểm tra: (1) thay đổi khác mục gộp được mà không mất dữ liệu của A; (2) gửi mốc cũ bị 409 và không ghi đè;
// (3) cùng một trường bị sửa ở hai thiết bị thì máy chủ giữ bản của A, bản của B không được ghi âm thầm.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash } from '../server/api.mjs';
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
const DB = { prepare: (text) => new Statement(text), async batch(statements) { sql.exec('BEGIN'); try { const out = []; for (const s of statements) out.push(/\bRETURNING\b/i.test(s.text) ? await s.all() : await s.run()); sql.exec('COMMIT'); return out; } catch (e) { sql.exec('ROLLBACK'); throw e; } } };
const env = { DB, FILES: { async put() {}, async get() { return null; } } };
const password = 'Test passphrase for two device sync';
sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('owner', 'owner@example.test', await passwordHash(password));
async function req(path, method = 'GET', data, cookie = '') {
  const headers = { 'CF-Connecting-IP': '192.0.2.13', Cookie: cookie };
  if (method !== 'GET') { headers.Origin = 'https://kanban.huongthiennature.com'; headers['Content-Type'] = 'application/json'; }
  return api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
}
const login = await req('login', 'POST', { email: 'owner@example.test', password, rememberDevice: true });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];

// Mỗi thiết bị giữ mốc (revision) và bản đã đồng bộ (base) của riêng mình, như account.js làm.
async function fetchState() {
  const r = await (await req('workspace-v2', 'GET', null, cookie)).json();
  return { revision: r.revision || 0, data: structuredClone(r.data) };
}
async function push(device, next) {
  const changes = changesBetween(device.base, next);
  const r = await req('workspace-v2', 'POST', { revision: device.revision, changes }, cookie);
  if (r.status === 200) {
    device.revision = (await r.json()).revision;
    device.base = structuredClone(next);
  }
  return r;
}
const note = (id, title, text) => ({ id, type: 'note', title, text, url: '', x: 10, y: 10, w: 200, h: 120, createdAt: '2026-11-05', group: '', color: '#7950c8', keywords: [], boardId: '' });

// Hai thiết bị cùng bắt đầu từ một trạng thái có hai ghi chú.
const seedState = await fetchState();
const seed = structuredClone(seedState.data);
seed.notes = [note('n1', 'Tiêu đề gốc', 'Nội dung 1'), note('n2', 'Ghi chú hai', 'Nội dung 2')];
const a = { ...seedState, base: structuredClone(seedState.data) };
assert.equal((await push(a, seed)).status, 200, 'tạo dữ liệu ban đầu');
const b = { revision: a.revision, base: structuredClone(a.base) };

// (1) A sửa n1; B sửa n2 bằng mốc cũ. B bị 409, rồi B tải lại và gộp thay đổi của mình lên.
const aNext = structuredClone(a.base);
aNext.notes[0].title = 'Tiêu đề từ A';
assert.equal((await push(a, aNext)).status, 200, 'A lưu thay đổi tiêu đề n1');

const bNext = structuredClone(b.base);
bNext.notes[1].text = 'Nội dung từ B';
const stale = await push(b, bNext);
assert.equal(stale.status, 409, 'B gửi bằng mốc cũ phải bị 409');

// Gộp thủ công giống rebaseWorkspace: lấy bản mới của máy chủ, áp thay đổi khác mục của B lên trên.
const remote = await fetchState();
assert.equal(remote.data.notes[0].title, 'Tiêu đề từ A', 'bản máy chủ giữ thay đổi của A sau khi B bị 409');
const merged = structuredClone(remote.data);
merged.notes[1].text = 'Nội dung từ B';
const bRebased = { revision: remote.revision, base: structuredClone(remote.data) };
assert.equal((await push(bRebased, merged)).status, 200, 'B gộp rồi gửi lại thành công');
const finalState = await fetchState();
assert.equal(finalState.data.notes.find((n) => n.id === 'n1').title, 'Tiêu đề từ A', 'thay đổi của A còn nguyên');
assert.equal(finalState.data.notes.find((n) => n.id === 'n2').text, 'Nội dung từ B', 'thay đổi của B đã vào');

// (2) Cùng một trường bị sửa ở hai thiết bị: máy chủ không ghi đè khi B dùng mốc cũ.
const aSecond = structuredClone(finalState.data);
aSecond.notes[0].title = 'A sửa lần hai';
const a2 = { revision: finalState.revision, base: structuredClone(finalState.data) };
assert.equal((await push(a2, aSecond)).status, 200, 'A lưu lần hai');
const bConflict = structuredClone(finalState.data);
bConflict.notes[0].title = 'B sửa cùng trường';
const b2 = { revision: finalState.revision, base: structuredClone(finalState.data) };
assert.equal((await push(b2, bConflict)).status, 409, 'B sửa cùng trường bằng mốc cũ phải bị 409');
const afterConflict = await fetchState();
assert.equal(afterConflict.data.notes[0].title, 'A sửa lần hai', 'máy chủ không ghi đè bản của A khi có xung đột');

console.log('PASS: hai thiết bị — thay đổi khác mục gộp được; mốc cũ bị 409 không ghi đè; cùng trường không bị ghi âm thầm');
