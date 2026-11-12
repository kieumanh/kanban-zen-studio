// v1.75.0: giới hạn thử mật khẩu theo cặp (IP, email). Kẻ xấu không còn khóa được đăng nhập của người khác;
// vẫn chặn dò mật khẩu từ một IP, dò nhiều email từ một IP, và dò phân tán bằng trần theo email.
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
const DB = {
  prepare: (text) => new Statement(text),
  async batch(statements) {
    sql.exec('BEGIN');
    try { const out = []; for (const s of statements) out.push(/\bRETURNING\b/i.test(s.text) ? await s.all() : await s.run()); sql.exec('COMMIT'); return out; }
    catch (e) { sql.exec('ROLLBACK'); throw e; }
  },
};
const env = { DB, FILES: { async put() {}, async get() { return null; } } };
const ORIGIN = 'https://kanban.huongthiennature.com';
const good = 'Mật khẩu đúng của nạn nhân 123';
const hashed = await passwordHash(good);
for (const id of ['victim', 'dist', 'reset']) sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run(id, id + '@example.test', hashed);
const login = async (email, password, ip) => (await api(new Request(ORIGIN + '/api/login', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify({ email, password }) }), env)).status;

// 1. Kẻ xấu (IP A) gửi 10 mật khẩu sai: lần 11 bị chặn.
for (let i = 1; i <= 10; i++) assert.equal(await login('victim@example.test', 'sai' + i, '203.0.113.1'), 401, 'lần ' + i + ' sai mật khẩu');
assert.equal(await login('victim@example.test', 'sai11', '203.0.113.1'), 429, 'IP A bị chặn ở lần 11');
// 2. Chủ tài khoản từ IP khác (B) vẫn đăng nhập được (trước v1.75.0: 429 vì khóa theo email).
assert.equal(await login('victim@example.test', good, '203.0.113.2'), 200, 'chủ tài khoản ở IP khác không bị khóa');
// 3. Kẻ xấu vẫn bị chặn dù đoán đúng mật khẩu (cặp IP+email đã cạn).
assert.equal(await login('victim@example.test', good, '203.0.113.1'), 429, 'IP A vẫn bị chặn');
// 4. Đăng nhập đúng xóa bộ đếm của cặp: sai 9 lần rồi đúng, sau đó lại được sai tiếp mà không bị tính dồn.
for (let i = 0; i < 9; i++) assert.equal(await login('reset@example.test', 'sai', '203.0.113.3'), 401);
assert.equal(await login('reset@example.test', good, '203.0.113.3'), 200);
for (let i = 0; i < 9; i++) assert.equal(await login('reset@example.test', 'sai', '203.0.113.3'), 401, 'bộ đếm đã được xóa sau khi đăng nhập đúng (lần ' + (i + 1) + ')');
// 5. Dò nhiều email từ một IP vẫn bị chặn (trần theo IP 35 lần/15 phút cho mọi đường xác thực).
let byIp = 0;
for (let i = 1; i <= 40 && !byIp; i++) if ((await login('khong-co-' + i + '@example.test', 'x', '203.0.113.4')) === 429) byIp = i;
assert.equal(byIp, 36, 'một IP thử nhiều email bị chặn ở lần 36, thấy ' + byIp);
// 6. Dò phân tán (mỗi IP chỉ 1 lần): trần theo email 60 lần/15 phút.
let distributed = 0;
for (let i = 1; i <= 70 && !distributed; i++) if ((await login('dist@example.test', 'sai', '198.51.100.' + i)) === 429) distributed = i;
assert.equal(distributed, 61, 'dò phân tán bị chặn ở lần 61, thấy ' + distributed);
// 7. Khóa giới hạn là bản băm: không chứa IP hay email thô.
const keys = sql.prepare("SELECT key FROM rate_limits WHERE key LIKE 'login%'").all().map((k) => k.key);
assert.ok(keys.length > 0 && keys.every((k) => !k.includes('203.0.113') && !k.includes('example.test') && !k.includes('198.51.100')), 'khóa giới hạn không được chứa IP/email thô');
console.log('PASS: khóa đăng nhập theo (IP, email) — nạn nhân không bị khóa, đăng nhập đúng xóa bộ đếm, chặn dò từ một IP, dò nhiều email, dò phân tán');
