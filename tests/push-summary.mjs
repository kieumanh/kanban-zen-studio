// v2.49.0 (Thông Báo Có Tên): thông báo đẩy nêu tên 1–2 việc gấp nhất kèm số lượng.
//  1. reminderPush: nội dung theo giọng Thiền / Giang hồ; một việc, hai việc, nhiều việc; tên dài được rút gọn; không có việc → null; việc xong, lưu trữ, hạn xa không tính.
//  2. /api/push-summary: cần đăng nhập (401), chỉ trả dữ liệu của chính người đang đăng nhập, không lộ email hay mã, đúng giọng theo phong cách tài khoản.
//  3. service worker: hiện tên việc khi API trả về; quay về câu chung khi lỗi mạng, hết phiên, không có việc, trả về hỏng, hoặc thiết bị tắt tên việc; vẫn LUÔN hiện thông báo (bắt buộc với Web Push).
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { api, passwordHash } from '../server/api.mjs';
import { reminderPush, reportDate, shiftDay } from '../server/reports.mjs';
import { makeProject } from './lib/browser-harness.mjs';

const day = reportDate();
const workspace = (style, titles) => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 8);
  const rows = titles || [
    ['Việc đã xong', 'Done', shiftDay(day, -1)],
    ['Gọi anh Sơn', 'Doing', shiftDay(day, -2)],
    ['Giao đơn hàng', 'List', day],
    ['Chuẩn bị hợp đồng', 'Idea', shiftDay(day, 2)],
    ['Việc hạn xa', 'Idea', shiftDay(day, 30)],
    ['Việc không hạn', 'Idea', ''],
  ];
  p.tasks.length = rows.length;
  rows.forEach(([title, col, due], i) => Object.assign(p.tasks[i], { title, col, due, start: '', end: undefined }));
  return { schema: 1, notes: [], projects: [p], ...(style ? { style } : {}) };
};

// 1. reminderPush.
const zen = reminderPush(workspace(), day);
assert.equal(zen.count, 3);
assert.equal(zen.title, 'Nhắc việc · 3 việc cần chú ý');
assert.equal(zen.body, '“Gọi anh Sơn” và “Giao đơn hàng” cùng 1 việc khác. 1 quá hạn · 1 hôm nay · 1 sắp hạn');
const gh = reminderPush(workspace('giangho'), day);
assert.equal(gh.title, 'Truyền thư · 3 nhiệm vụ cần chú ý');
assert.equal(gh.body, '“Gọi anh Sơn” và “Giao đơn hàng” cùng 1 nhiệm vụ khác. 1 lỡ hẹn · 1 hôm nay · 1 sắp tới kỳ');
assert.deepEqual(reminderPush(workspace('giangho-nhe'), day), zen, 'Giang hồ nhẹ giữ giọng thường');
assert.equal(reminderPush(workspace(null, [['Việc xong', 'Done', day], ['Hạn xa', 'Idea', shiftDay(day, 9)], ['Không hạn', 'Idea', '']]), day), null, 'không có việc cần nhắc → null');
assert.equal(reminderPush({ schema: 1, notes: [], projects: [] }, day), null);
const one = reminderPush(workspace(null, [['Nộp báo cáo', 'Doing', shiftDay(day, -1)]]), day);
assert.equal(one.body, '“Nộp báo cáo” đã quá hạn.');
assert.equal(reminderPush(workspace(null, [['Nộp báo cáo', 'Doing', day]]), day).body, '“Nộp báo cáo” đến hạn hôm nay.');
assert.equal(reminderPush(workspace('giangho', [['Nộp báo cáo', 'Doing', shiftDay(day, 3)]]), day).body, '“Nộp báo cáo” sắp tới kỳ.');
const two = reminderPush(workspace(null, [['Một', 'Doing', day], ['Hai', 'Doing', day]]), day);
assert.equal(two.body, '“Một” và “Hai”. 2 hôm nay', 'đúng hai việc: không có “cùng … việc khác”');
const long = reminderPush(workspace(null, [['Việc có tên rất dài ' + 'x'.repeat(80), 'Doing', day]]), day);
assert.ok(long.body.startsWith('“Việc có tên rất dài ') && long.body.includes('…”') && long.body.length < 80, 'tên dài được rút gọn: ' + long.body);
const multi = reminderPush(workspace(null, [['A\nxuống dòng', 'Doing', day]]), day);
assert.ok(!/\n/.test(multi.body), 'tên việc một dòng');
const many = reminderPush(workspace(null, Array.from({ length: 7 }, (_, i) => ['Việc ' + i, 'Doing', shiftDay(day, i - 3)])), day);
assert.equal(many.count, 7);
assert.ok(many.body.startsWith('“Việc 0” và “Việc 1” cùng 5 việc khác.'), many.body);
console.log('PASS: reminderPush nêu tên 1–2 việc gấp nhất kèm số lượng, đúng giọng Thiền / Giang hồ, rút gọn tên dài, bỏ qua việc xong / hạn xa / không hạn');

// 2. /api/push-summary.
const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
class Statement {
  constructor(text) {
    this.text = text;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    return sql.prepare(this.text).get(...this.values) || null;
  }
  async run() {
    return { meta: sql.prepare(this.text).run(...this.values) };
  }
  async all() {
    return { results: sql.prepare(this.text).all(...this.values) };
  }
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
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  },
};
const env = { DB, VAPID_PUBLIC: 'test-public' };
const req = (path, method = 'GET', data, cookie = '', ip = '192.0.2.1') => {
  const headers = { 'CF-Connecting-IP': ip };
  if (cookie) headers.Cookie = cookie;
  if (method !== 'GET') {
    headers.Origin = 'https://kanban.huongthiennature.com';
    headers['Content-Type'] = 'application/json';
  }
  return api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
};
const password = 'Test passphrase 2026!',
  hashed = await passwordHash(password);
async function account(id) {
  sql.prepare('INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,?)').run(id, id + '@example.test', hashed, Date.now());
  const login = await req('login', 'POST', { email: id + '@example.test', password }, '', '192.0.2.' + (10 + sql.prepare('SELECT COUNT(*) AS n FROM users').get().n));
  assert.equal(login.status, 200);
  return login.headers.get('Set-Cookie').split(';')[0];
}
const alice = await account('alice'),
  bob = await account('bob');
assert.equal((await req('push-summary')).status, 401, 'cần đăng nhập');
assert.deepEqual(await (await req('push-summary', 'GET', null, alice)).json(), { count: 0 }, 'chưa có dữ liệu → count 0');
assert.equal((await req('workspace', 'PUT', { data: workspace(), revision: 0 }, alice)).status, 200);
const mine = await (await req('push-summary', 'GET', null, alice)).json();
assert.deepEqual(mine, zen, 'API trả đúng nội dung thông báo đẩy');
assert.ok(!JSON.stringify(mine).includes('@example.test') && !/token|session|id/.test(Object.keys(mine).join()), 'không lộ email hay mã');
assert.deepEqual(await (await req('push-summary', 'GET', null, bob)).json(), { count: 0 }, 'tài khoản khác không thấy việc của người khác');
const own = workspace('giangho', [['Việc của Bob', 'Doing', day]]);
assert.equal((await req('workspace', 'PUT', { data: own, revision: 0 }, bob)).status, 200);
assert.deepEqual(await (await req('push-summary', 'GET', null, bob)).json(), { count: 1, title: 'Truyền thư · 1 nhiệm vụ cần chú ý', body: '“Việc của Bob” tới kỳ hôm nay.' }, 'giọng theo phong cách của tài khoản');
assert.ok(!JSON.stringify(await (await req('push-summary', 'GET', null, alice)).json()).includes('Bob'), 'không lẫn dữ liệu giữa hai tài khoản');
assert.equal((await req('push-summary', 'POST', {}, alice)).status === 200, false, 'chỉ nhận GET');
// Giới hạn tần suất: 30 lần mỗi 15 phút cho mỗi tài khoản.
let limited = 0;
for (let i = 0; i < 35; i++) if ((await req('push-summary', 'GET', null, alice)).status === 429) limited++;
assert.ok(limited > 0, 'bị giới hạn khi gọi dồn dập');
console.log('PASS: /api/push-summary cần đăng nhập, chỉ trả dữ liệu của chính người đó, đúng giọng theo tài khoản, không lộ email hay mã, có giới hạn tần suất');

// 3. Service worker.
const source = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8').replace('__SHELL_VERSION__', 'test').replace('__SHELL_ASSETS__', '[]').replace('__LAZY_ASSETS__', '{}');
async function push({ style, names, fetchImpl }) {
  const handlers = {},
    shown = [],
    store = new Map();
  if (style) store.set('/__zen-style', style);
  if (names) store.set('/__zen-push-names', names);
  const cache = { match: async (key) => (store.has(key) ? new Response(store.get(key)) : undefined) };
  const self = { addEventListener: (type, fn) => (handlers[type] = fn), registration: { showNotification: async (title, options) => shown.push({ title, options }) }, location: new URL('https://kanban.huongthiennature.com/sw.js'), clients: {} };
  const calls = [];
  vm.runInNewContext(source, { self, caches: { open: async () => cache, keys: async () => [] }, fetch: async (...args) => (calls.push(args), fetchImpl(...args)), Request, Response, URL, AbortSignal, console });
  let pending;
  handlers.push({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.equal(shown.length, 1, 'luôn hiện đúng một thông báo');
  return { ...shown[0], calls };
}
const GENERIC_ZEN = ['Zen Studio · Nhắc việc hôm nay', 'Bạn có công việc đến hạn trong 3 ngày, đến hạn hôm nay hoặc đã quá hạn. Mở Lịch để xem.'];
const GENERIC_GH = ['Zen Studio · Truyền thư hôm nay', 'Các hạ có nhiệm vụ tới kỳ trong 3 ngày, tới kỳ hôm nay hoặc đã lỡ hẹn. Mở Hoàng lịch để xem.'];
const ok = (body) => async () => Response.json(body);
let r = await push({ fetchImpl: ok(zen) });
assert.deepEqual([r.title, r.options.body], [zen.title, zen.body], 'hiện tên việc từ API');
assert.equal(r.calls[0][0], '/api/push-summary');
assert.equal(r.calls[0][1].credentials, 'same-origin', 'gửi kèm cookie phiên');
assert.equal(r.calls[0][1].cache, 'no-store');
assert.equal(r.options.tag, 'zen-daily');
r = await push({ names: 'off', fetchImpl: ok(zen) });
assert.deepEqual([r.title, r.options.body], GENERIC_ZEN, 'thiết bị tắt tên việc → câu chung');
assert.equal(r.calls.length, 0, 'tắt tên việc thì không gọi API');
r = await push({ names: 'on', fetchImpl: ok(zen) });
assert.equal(r.title, zen.title, 'bật tường minh vẫn hiện tên việc');
for (const [label, fetchImpl] of [
  ['lỗi mạng', async () => { throw new TypeError('Failed to fetch'); }],
  ['hết phiên (401)', async () => Response.json({ error: 'x' }, { status: 401 })],
  ['không có việc', ok({ count: 0 })],
  ['trả về hỏng', async () => new Response('<html>', { status: 200 })],
  ['thiếu trường', ok({ count: 2 })],
]) {
  r = await push({ fetchImpl });
  assert.deepEqual([r.title, r.options.body], GENERIC_ZEN, label + ' → câu chung');
}
r = await push({ style: 'giangho', fetchImpl: async () => { throw new Error('offline'); } });
assert.deepEqual([r.title, r.options.body], GENERIC_GH, 'lỗi mạng ở thiết bị Giang hồ → câu chung giọng Giang hồ');
r = await push({ fetchImpl: ok({ count: 3, title: 'T'.repeat(300), body: 'B'.repeat(900) }) });
assert.ok(r.title.length <= 80 && r.options.body.length <= 240, 'cắt độ dài nếu máy chủ trả quá dài');
console.log('PASS: service worker hiện tên việc từ API; quay về câu chung (đúng giọng thiết bị) khi lỗi, hết phiên, không có việc, dữ liệu hỏng hoặc thiết bị tắt tên việc; luôn hiện đúng một thông báo');
