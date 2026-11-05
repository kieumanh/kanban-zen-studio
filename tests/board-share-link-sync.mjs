// v1.28.0: máy chủ tạo liên kết chia sẻ bảng dạng /#boardshare=<token> (không có tham số truy vấn),
// và token đó mở được bản chỉ xem qua GET /api/shared/<token>.
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
const password = 'Test passphrase for board share links';
sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('owner', 'owner@example.test', await passwordHash(password));
async function req(path, method = 'GET', data, cookie = '') {
  const headers = { 'CF-Connecting-IP': '192.0.2.12', Cookie: cookie };
  if (method !== 'GET') { headers.Origin = 'https://kanban.huongthiennature.com'; headers['Content-Type'] = 'application/json'; }
  return api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
}
const login = await req('login', 'POST', { email: 'owner@example.test', password, rememberDevice: true });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
const first = await (await req('workspace-v2', 'GET', null, cookie)).json();
let before = first.data, revision = first.revision || 0;
async function push(next, what) {
  const changes = changesBetween(before, next);
  const r = await req('workspace-v2', 'POST', { revision, changes }, cookie);
  assert.equal(r.status, 200, what + ': ' + (await r.clone().text()));
  revision = (await r.json()).revision;
  before = next;
}
const next = structuredClone(before);
next.notes = [{ id: 'board1', type: 'board', title: 'Bảng thử', text: '', url: '', x: 0, y: 0, w: 320, h: 240, createdAt: '2026-11-05', group: '', color: '#7950c8', keywords: [], boardId: '' }, { id: 'n1', type: 'note', title: 'Ghi chú', text: 'nội dung', url: '', x: 10, y: 10, w: 200, h: 120, createdAt: '2026-11-05', group: '', color: '#7950c8', keywords: [], boardId: 'board1' }];
await push(next, 'tạo bảng và ghi chú');

const shared = await req('board-share', 'POST', { boardId: 'board1' }, cookie);
assert.equal(shared.status, 200, 'tạo liên kết chia sẻ: ' + (await shared.clone().text()));
const { url } = await shared.json();
const m = /^https:\/\/kanban\.huongthiennature\.com\/#boardshare=([a-f0-9]{64})$/.exec(url);
assert.ok(m, 'liên kết dạng /#boardshare=<token>, không có tham số truy vấn: ' + url);
const opened = await req('shared/' + m[1]);
assert.equal(opened.status, 200, 'token mở được bản chỉ xem');
const body = await opened.json();
assert.equal(body.data.notes.some((n) => n.id === 'n1'), true, 'bản chia sẻ có ghi chú của bảng');
assert.equal(body.data.notes.some((n) => n.id === 'board1'), false, 'bản chia sẻ không chứa chính bảng');
console.log('PASS: liên kết chia sẻ dùng phần neo; token mở được bản chỉ xem');
