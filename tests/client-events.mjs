// v1.73.0: quan sát vận hành. (1) /api/client-event làm sạch rồi chỉ ghi nhật ký, không ghi D1, có giới hạn tốc độ;
// (2) /api/me báo email gửi lỗi gần đây cho chủ tài khoản (không kèm nội dung lỗi); (3) làm sạch chuỗi không để lọt email, mã dài, mã chia sẻ.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash } from '../server/api.mjs';
import { cleanClientEvent, scrubClientText } from '../server/client-events.mjs';

// ---- làm sạch chuỗi ----
const dirty = 'Lỗi tại https://kanban.huongthiennature.com/?boardshare=' + 'a'.repeat(64) + ' của mạnh@example.com mã ' + 'f'.repeat(40) + ' số 0912345678901\u0007\n';
const clean = scrubClientText(dirty, 300);
assert.ok(!/example\.com|boardshare|aaaa|ffff|0912345678901|[\u0000-\u001f]/.test(clean), 'chuỗi đã làm sạch còn lọt: ' + clean);
assert.ok(clean.includes('[email]') && clean.includes('[token]') && clean.includes('[số]'));
assert.equal(scrubClientText('x'.repeat(1000), 300).length, 300, 'cắt theo độ dài tối đa');
assert.equal(scrubClientText(null), '');

// ---- kiểm tra dữ liệu gửi lên ----
assert.equal(cleanClientEvent(null), null);
assert.equal(cleanClientEvent([]), null);
assert.equal(cleanClientEvent({ type: 'hack', message: 'x' }), null, 'loại lạ bị bỏ');
assert.equal(cleanClientEvent({ type: 'error', message: '' }), null, 'lỗi không có nội dung bị bỏ');
assert.equal(cleanClientEvent({ type: 'usage', feature: 'Có Dấu Cách!' }), null, 'tên tính năng phải là chữ thường/số/gạch ngang');
assert.deepEqual(cleanClientEvent({ type: 'usage', feature: 'dashboard', version: '1.73.0', userId: 'secret', email: 'a@b.c' }), { event: 'client_usage', feature: 'dashboard', version: '1.73.0' }, 'trường lạ (mã người dùng, email) không được đi tiếp');
const ev = cleanClientEvent({ type: 'error', message: 'Boom', source: '/app.js', line: 12.5, col: 7, stack: 'at x', view: 'dashboard', version: 'ver-1' });
assert.equal(ev.line, 0, 'số dòng không nguyên bị đưa về 0');
assert.equal(ev.version, '', 'phiên bản sai định dạng bị bỏ');
assert.equal(ev.view, 'dashboard');

// ---- API trên SQLite thật ----
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
async function req(path, method = 'GET', data, { cookie = '', ip = '192.0.2.10', origin = ORIGIN } = {}) {
  const headers = { 'CF-Connecting-IP': ip, Cookie: cookie };
  if (method !== 'GET') { if (origin) headers.Origin = origin; headers['Content-Type'] = 'application/json'; }
  return api(new Request(ORIGIN + '/api/' + path, { method, headers, body: data === undefined ? undefined : typeof data === 'string' ? data : JSON.stringify(data) }), env);
}
const logs = [];
const realLog = console.log;
console.log = (...a) => { const line = a.join(' '); try { logs.push(JSON.parse(line)); } catch { realLog(...a); } };
const countBefore = () => sql.prepare("SELECT (SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM workspace_entities)+(SELECT COUNT(*) FROM notification_jobs) AS n").get().n;

const rows = countBefore();
let r = await req('client-event', 'POST', { type: 'error', kind: 'x', message: 'TypeError: Cannot read x tại ' + ORIGIN + '/?boardshare=' + 'b'.repeat(64) + ' mạnh@example.com', source: '/app.js', line: 10, col: 3, stack: 'at f (' + ORIGIN + '/app.js:10:3)', view: 'dashboard', version: '1.73.0' });
assert.equal(r.status, 200);
assert.equal(logs.length, 1, 'một dòng nhật ký cho một lỗi');
assert.equal(logs[0].event, 'client_error');
assert.ok(!/example\.com|boardshare|bbbb/.test(JSON.stringify(logs[0])), 'nhật ký không được lọt email hay mã chia sẻ');
assert.ok(!('user' in logs[0]) && !('ip' in logs[0]) && !JSON.stringify(logs[0]).includes('192.0.2.10'), 'nhật ký không có mã người dùng hay IP');
r = await req('client-event', 'POST', { type: 'usage', feature: 'budget', version: '1.73.0' });
assert.equal(r.status, 200);
assert.deepEqual(logs[1], { event: 'client_usage', feature: 'budget', version: '1.73.0' });
// Dữ liệu sai: vẫn trả 200 (không để trình duyệt thử lại), không ghi gì.
for (const bad of [{ type: 'nope' }, '{không phải json', []]) {
  r = await req('client-event', 'POST', bad);
  assert.equal(r.status, 200);
}
assert.equal(logs.length, 2, 'dữ liệu sai không được ghi nhật ký');
assert.equal(countBefore(), rows, 'không ghi gì vào người dùng/workspace/job');
// Luật chung vẫn áp dụng: thiếu Origin thì bị từ chối.
r = await req('client-event', 'POST', { type: 'usage', feature: 'x' }, { origin: '' });
assert.equal(r.status, 403);
// Giới hạn tốc độ theo IP (60 lần / 15 phút); IP khác không bị ảnh hưởng.
let limitedAt = 0;
for (let i = 1; i <= 70 && !limitedAt; i++) {
  r = await req('client-event', 'POST', { type: 'usage', feature: 'spam' }, { ip: '198.51.100.7' });
  if (r.status === 429) limitedAt = i;
}
assert.equal(limitedAt, 61, 'lần thứ 61 phải bị giới hạn, thấy ' + limitedAt);
r = await req('client-event', 'POST', { type: 'usage', feature: 'ok' }, { ip: '198.51.100.8' });
assert.equal(r.status, 200, 'IP khác không bị giới hạn theo');
// Khóa giới hạn là bản băm, không chứa IP.
assert.ok(!sql.prepare("SELECT key FROM rate_limits WHERE key LIKE 'cev:%'").all().some((k) => k.key.includes('198.51.100')), 'khóa giới hạn không chứa IP gốc');

// ---- /api/me: email gửi lỗi ----
const password = 'Mật khẩu thử cho quan sát vận hành';
sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)').run('owner', 'owner@example.test', await passwordHash(password));
const login = await req('login', 'POST', { email: 'owner@example.test', password, rememberDevice: true });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
const me = async () => (await (await req('me', 'GET', undefined, { cookie })).json()).user;
assert.equal((await me()).mailIssue, undefined, 'chưa có lỗi gửi thì không có mailIssue');
const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const job = sql.prepare('INSERT OR REPLACE INTO notification_jobs(user_id,day,channel,subject,body,status,attempts,last_error) VALUES(?,?,?,?,?,?,?,?)');
job.run('owner', day(0), 'weekly', 's', 'b', 'pending', 2, 'Resend 422: địa chỉ riêng tư@example.com bị từ chối');
let u = await me();
assert.deepEqual(u.mailIssue, { channel: 'weekly', day: day(0), attempts: 2 }, 'phải báo email tuần gửi lỗi');
assert.ok(!JSON.stringify(u).includes('Resend') && !JSON.stringify(u).includes('example.com/'), 'không đưa nội dung lỗi của nhà cung cấp cho trình duyệt');
job.run('owner', day(0), 'weekly', 's', 'b', 'sent', 3, '');
assert.equal((await me()).mailIssue, undefined, 'gửi được rồi thì hết báo');
job.run('owner', day(5), 'finance', 's', 'b', 'pending', 4, 'lỗi cũ');
assert.equal((await me()).mailIssue, undefined, 'lỗi quá 3 ngày không còn báo');
job.run('owner', day(1), 'note:abc', 's', 'b', 'pending', 1, 'lỗi');
assert.equal((await me()).mailIssue, undefined, 'chỉ báo cho email nhắc việc / tuần / thu chi, không báo nhắc ghi chú');
job.run('owner', day(1), 'finance', 's', 'b', 'pending', 4, 'lỗi');
assert.deepEqual((await me()).mailIssue, { channel: 'finance', day: day(1), attempts: 4 });
console.log = realLog;
console.log('PASS: quan sát vận hành — sự kiện trình duyệt làm sạch và chỉ ghi nhật ký, giới hạn tốc độ, báo email lỗi cho chủ tài khoản');
