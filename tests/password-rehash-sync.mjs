// v1.27.0: mật khẩu cũ (100.000 vòng, không có tiền tố) vẫn đăng nhập đúng; đăng nhập đúng sẽ nâng hash lên số vòng mới;
// mật khẩu sai không đổi hash; mật khẩu mới dùng số vòng mới. Không đổi dữ liệu người dùng khác.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash, passwordMatches, passwordIterations, PASSWORD_ITERATIONS } from '../server/api.mjs';

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

const password = 'Mật khẩu thử 12345';
// Hash kiểu cũ: đúng định dạng v1.26.0 và trước đó (salt:hex, 100.000 vòng).
const legacyHash = await passwordHash(password, '00112233445566778899aabbccddeeff', 100000);
assert.equal(legacyHash.includes('$'), false, 'hash cũ không có tiền tố số vòng');
assert.equal(passwordIterations(legacyHash), 100000, 'hash cũ được hiểu là 100.000 vòng');
assert.equal(await passwordMatches(password, legacyHash), true, 'hash cũ vẫn kiểm tra đúng');
assert.equal(await passwordMatches('sai', legacyHash), false, 'hash cũ từ chối mật khẩu sai');

const fresh = await passwordHash(password);
assert.equal(passwordIterations(fresh), PASSWORD_ITERATIONS, 'mật khẩu mới dùng số vòng mới');
assert.equal(await passwordMatches(password, fresh), true, 'mật khẩu mới kiểm tra đúng');

sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('legacy', 'legacy@example.test', legacyHash);
sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('other', 'other@example.test', legacyHash);
async function req(path, method = 'GET', data, cookie = '') {
  const headers = { 'CF-Connecting-IP': '192.0.2.11', Cookie: cookie };
  if (method !== 'GET') { headers.Origin = 'https://kanban.huongthiennature.com'; headers['Content-Type'] = 'application/json'; }
  return api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
}
const stored = (id) => sql.prepare('SELECT password_hash FROM users WHERE id=?').get(id).password_hash;

// Sai mật khẩu: không đổi hash.
assert.equal((await req('login', 'POST', { email: 'legacy@example.test', password: 'sai' })).status, 401);
assert.equal(stored('legacy'), legacyHash, 'đăng nhập sai không đổi hash');

// Đăng nhập đúng: hash được nâng lên số vòng mới, và vẫn đăng nhập được.
const ok = await req('login', 'POST', { email: 'legacy@example.test', password, rememberDevice: true });
assert.equal(ok.status, 200, 'đăng nhập đúng với hash cũ');
assert.equal(passwordIterations(stored('legacy')), PASSWORD_ITERATIONS, 'hash được nâng lên số vòng mới sau đăng nhập đúng');
assert.equal(await passwordMatches(password, stored('legacy')), true, 'hash mới kiểm tra đúng mật khẩu');
const again = await req('login', 'POST', { email: 'legacy@example.test', password });
assert.equal(again.status, 200, 'đăng nhập lần hai với hash mới');

// Tài khoản khác không bị đụng tới.
assert.equal(stored('other'), legacyHash, 'tài khoản khác giữ nguyên hash cũ');
console.log('PASS: mật khẩu cũ vẫn đúng, đăng nhập đúng nâng hash lên số vòng mới, tài khoản khác không đổi');
