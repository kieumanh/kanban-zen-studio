// v1.24.0: "Đăng xuất mọi thiết bị" đóng mọi phiên của đúng tài khoản đó, không đụng tài khoản khác và không xóa dữ liệu.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash } from '../server/api.mjs';

const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
class Statement {
  constructor(text) { this.text = text; }
  bind(...values) { this.values = values; return this; }
  async first() { return sql.prepare(this.text).get(...this.values) || null; }
  async run() { return { meta: sql.prepare(this.text).run(...this.values) }; }
  async all() { return { results: sql.prepare(this.text).all(...this.values) }; }
}
const DB = { prepare: (text) => new Statement(text), async batch(statements) { const out = []; for (const s of statements) out.push(/\bRETURNING\b/i.test(s.text) ? await s.all() : await s.run()); return out; } };
const env = { DB, FILES: { async put() {}, async get() { return null; } } };
const password = 'Test passphrase for remembered devices';
const insert = 'INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)';
sql.prepare(insert).run('owner', 'owner@example.test', await passwordHash(password));
sql.prepare(insert).run('other', 'other@example.test', await passwordHash(password));

async function req(path, method = 'GET', data, cookie = '') {
  const headers = { 'CF-Connecting-IP': '192.0.2.9', Cookie: cookie };
  if (method !== 'GET') { headers.Origin = 'https://kanban.huongthiennature.com'; headers['Content-Type'] = 'application/json'; }
  return api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
}
const login = async (email) => {
  const r = await req('login', 'POST', { email, password, rememberDevice: true });
  assert.equal(r.status, 200, 'đăng nhập ' + email);
  return r.headers.get('set-cookie').split(';')[0];
};

const phoneA = await login('owner@example.test');
const laptopB = await login('owner@example.test');
const otherC = await login('other@example.test');
assert.equal((await req('workspace-v2', 'GET', null, laptopB)).status, 200, 'thiết bị B hoạt động trước khi đăng xuất mọi thiết bị');

// Đăng xuất mọi thiết bị từ máy A: cần đăng nhập và phải gửi kèm Origin + JSON như mọi yêu cầu ghi.
const anonymous = await req('logout-all', 'POST', {});
assert.equal(anonymous.status, 401, 'chưa đăng nhập thì không được đăng xuất mọi thiết bị');
const out = await req('logout-all', 'POST', {}, phoneA);
assert.equal(out.status, 200, 'đăng xuất mọi thiết bị phải thành công');
assert.match(out.headers.get('set-cookie'), /zen_session=;.*Max-Age=0/, 'phải xóa cookie trên máy đang dùng');

assert.equal((await req('workspace-v2', 'GET', null, phoneA)).status, 401, 'máy A bị đăng xuất');
assert.equal((await req('workspace-v2', 'GET', null, laptopB)).status, 401, 'máy B cũng bị đăng xuất');
assert.equal((await req('workspace-v2', 'GET', null, otherC)).status, 200, 'tài khoản khác không bị ảnh hưởng');

// Dữ liệu vẫn còn: đăng nhập lại được và không mất gì.
const again = await login('owner@example.test');
assert.equal((await req('workspace-v2', 'GET', null, again)).status, 200, 'đăng nhập lại sau khi đăng xuất mọi thiết bị');
console.log('PASS: đăng xuất mọi thiết bị đóng đúng phiên của tài khoản, giữ nguyên tài khoản khác');
