// v2.76.0 (Bảng Thám Báo): dấu dùng ẩn danh được cộng vào bộ đếm (bảng rate_limits sẵn có, không migration) và chỉ chủ triển khai xem được.
// A. recordUsage / usageSummary: cộng đúng theo ngày, tính năng, phiên bản; cửa sổ 7 / 30 ngày; khóa không chứa IP hay mã người dùng; lỗi không phải dấu dùng không được đếm.
// B. isUsageViewer: người dùng tạo sớm nhất; biến USAGE_VIEWER_EMAILS (không phân biệt hoa thường) thay thế; người lạ không xem được.
// C. Qua API thật: POST /api/client-event cộng bộ đếm; GET /api/usage-stats: chủ 200, người khác 404, chưa đăng nhập 401; ngày sai về 7.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash } from '../server/api.mjs';
import {
  recordUsage,
  usageSummary,
  isUsageViewer,
  USAGE_KEEP_DAYS,
} from '../server/usage-stats.mjs';

const sql = new DatabaseSync(':memory:');
sql.exec(
  readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'),
);
class Statement {
  constructor(text) {
    this.text = text;
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
      for (const s of statements)
        out.push(/\bRETURNING\b/i.test(s.text) ? await s.all() : await s.run());
      sql.exec('COMMIT');
      return out;
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  },
};
const objects = new Map();
const env = {
  DB,
  FILES: {
    async put(key, bytes) {
      objects.set(key, bytes);
    },
    async get(key) {
      const bytes = objects.get(key);
      return bytes ? { body: bytes, size: bytes.length } : null;
    },
  },
};
const password = 'Test passphrase for remembered devices';
const addUser = async (id, email, created) =>
  sql
    .prepare(
      'INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,?)',
    )
    .run(id, email, await passwordHash(password), created);
await addUser('owner', 'owner@example.test', 1);
await addUser('guest', 'guest@example.test', 2);
async function req(path, method = 'GET', data, cookie = '') {
  const headers = { 'CF-Connecting-IP': '192.0.2.5', Cookie: cookie };
  if (method !== 'GET') {
    headers.Origin = 'https://kanban.huongthiennature.com';
    headers['Content-Type'] = 'application/json';
  }
  return api(
    new Request('https://kanban.huongthiennature.com/api/' + path, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    }),
    env,
  );
}
const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 23, 5, 0, 0);
const iso = (offset) => new Date(NOW - offset * DAY).toISOString().slice(0, 10);
const rec = (feature, version = '2.76.0') => ({
  event: 'client_usage',
  feature,
  version,
});

// A. Ghi và tổng hợp
for (const bad of [
  null,
  {},
  { event: 'client_error', feature: 'x' },
  { event: 'client_usage' },
  { event: 'client_usage', feature: '' },
])
  assert.equal(
    await recordUsage(DB, bad, NOW),
    false,
    'không đếm: ' + JSON.stringify(bad),
  );
await recordUsage(DB, rec('growth-octa'), NOW);
await recordUsage(DB, rec('growth-octa'), NOW);
await recordUsage(DB, rec('growth-octa'), NOW);
await recordUsage(DB, rec('growth-octa', '2.75.0'), NOW);
await recordUsage(DB, rec('dashboard'), NOW);
await recordUsage(
  DB,
  { event: 'client_usage', feature: 'dashboard', version: '' },
  NOW,
);
// Các ngày trước: 3 ngày trước (trong 7), 10 ngày trước (ngoài 7, trong 30), 40 ngày trước (ngoài 30).
await recordUsage(DB, rec('dashboard'), NOW - 3 * DAY);
await recordUsage(DB, rec('budget'), NOW - 10 * DAY);
await recordUsage(DB, rec('budget'), NOW - 10 * DAY);
await recordUsage(DB, rec('cu'), NOW - 40 * DAY);
const row = sql
  .prepare('SELECT * FROM rate_limits WHERE key=?')
  .get('usage:' + iso(0) + ':growth-octa:2.76.0');
assert.equal(
  row.count,
  3,
  'ba dấu cùng ngày, tính năng, phiên bản cộng thành 3',
);
assert.equal(
  row.expires,
  NOW + USAGE_KEEP_DAYS * DAY,
  'hết hạn sau ' + USAGE_KEEP_DAYS + ' ngày để việc dọn hằng ngày xóa',
);
assert.ok(
  sql
    .prepare('SELECT 1 FROM rate_limits WHERE key=?')
    .get('usage:' + iso(0) + ':dashboard:x'),
  'phiên bản trống ghi là x',
);

let s = await usageSummary(DB, 7, NOW);
assert.equal(s.days, 7);
assert.equal(s.from, iso(6));
assert.equal(s.to, iso(0));
assert.equal(
  s.total,
  3 + 1 + 1 + 1 + 1,
  '7 ngày: 3+1 (Bát phương) + 1+1 (Tổng quan hôm nay) + 1 (Tổng quan 3 ngày trước)',
);
assert.deepEqual(s.features, [
  { feature: 'growth-octa', count: 4 },
  { feature: 'dashboard', count: 3 },
]);
assert.deepEqual(
  s.versions.map((v) => [v.version, v.count]),
  [
    ['2.76.0', 5],
    ['2.75.0', 1],
    ['x', 1],
  ].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);
assert.equal(s.daily.length, 7, 'đủ bảy ngày kể cả ngày không có số');
assert.deepEqual(
  s.daily.map((d) => d.day),
  [6, 5, 4, 3, 2, 1, 0].map(iso),
  'ngày cũ đến mới',
);
assert.equal(s.daily.find((d) => d.day === iso(3)).count, 1);
assert.equal(s.daily.find((d) => d.day === iso(1)).count, 0);
s = await usageSummary(DB, 30, NOW);
assert.equal(
  s.total,
  9,
  '30 ngày thêm hai dấu Thu chi; dấu 40 ngày trước không tính',
);
assert.ok(s.features.some((f) => f.feature === 'budget' && f.count === 2));
assert.ok(
  !s.features.some((f) => f.feature === 'cu'),
  'ngoài cửa sổ thì không tính',
);
assert.equal((await usageSummary(DB, 99, NOW)).days, 7, 'cửa sổ lạ về 7 ngày');
assert.equal((await usageSummary(DB, NaN, NOW)).days, 7);
// Khóa không chứa gì ngoài ngày, tính năng, phiên bản.
for (const k of sql
  .prepare("SELECT key FROM rate_limits WHERE key LIKE 'usage:%'")
  .all())
  assert.match(
    k.key,
    /^usage:\d{4}-\d{2}-\d{2}:[a-z0-9-]{1,30}:(\d{1,3}\.\d{1,3}\.\d{1,3}|x)$/,
    'khóa chỉ có ngày, tính năng, phiên bản: ' + k.key,
  );
// Khóa giới hạn tốc độ của nơi khác không lẫn vào số liệu.
sql
  .prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,?,?)')
  .run('cev:abc', 50, NOW);
sql
  .prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,?,?)')
  .run('login:abc', 5, NOW);
assert.equal(
  (await usageSummary(DB, 30, NOW)).total,
  9,
  'khóa giới hạn tốc độ không lẫn vào',
);

// B. Ai được xem
assert.equal(
  await isUsageViewer(DB, {}, { id: 'owner', email: 'owner@example.test' }),
  true,
  'người dùng tạo sớm nhất',
);
assert.equal(
  await isUsageViewer(DB, {}, { id: 'guest', email: 'guest@example.test' }),
  false,
  'người dùng khác không xem được',
);
assert.equal(await isUsageViewer(DB, {}, null), false);
assert.equal(await isUsageViewer(DB, {}, {}), false);
assert.equal(
  await isUsageViewer(
    DB,
    { USAGE_VIEWER_EMAILS: ' GUEST@example.test , other@x.y ' },
    { id: 'guest', email: 'guest@example.test' },
  ),
  true,
  'biến môi trường: không phân biệt hoa thường, bỏ khoảng trắng',
);
assert.equal(
  await isUsageViewer(
    DB,
    { USAGE_VIEWER_EMAILS: 'guest@example.test' },
    { id: 'owner', email: 'owner@example.test' },
  ),
  false,
  'đã đặt biến thì người tạo sớm nhất không còn mặc nhiên được xem',
);
assert.equal(
  await isUsageViewer(
    DB,
    { USAGE_VIEWER_EMAILS: ' , ' },
    { id: 'owner', email: 'x' },
  ),
  true,
  'biến rỗng thì như không đặt',
);

// C. Qua API
const cookieOf = async (email) => {
  const r = await req('login', 'POST', {
    email,
    password,
    rememberDevice: true,
  });
  assert.equal(r.status, 200, 'đăng nhập ' + email);
  return r.headers.get('set-cookie').split(';')[0];
};
const owner = await cookieOf('owner@example.test'),
  guest = await cookieOf('guest@example.test');
const before = sql
  .prepare('SELECT COALESCE(SUM(count),0) n FROM rate_limits WHERE key LIKE ?')
  .get('usage:' + new Date().toISOString().slice(0, 10) + ':%').n;
let r = await req('client-event', 'POST', {
  type: 'usage',
  feature: 'quickadd',
  version: '2.76.0',
});
assert.equal(r.status, 200);
r = await req('client-event', 'POST', {
  type: 'error',
  message: 'Boom',
  version: '2.76.0',
});
assert.equal(r.status, 200);
r = await req('client-event', 'POST', {
  type: 'usage',
  feature: 'Có Dấu Cách!',
});
assert.equal(r.status, 200);
const after = sql
  .prepare('SELECT COALESCE(SUM(count),0) n FROM rate_limits WHERE key LIKE ?')
  .get('usage:' + new Date().toISOString().slice(0, 10) + ':%').n;
assert.equal(
  after - before,
  1,
  'chỉ dấu dùng hợp lệ được cộng; lỗi script và dữ liệu sai thì không',
);
assert.ok(
  !sql
    .prepare("SELECT key FROM rate_limits WHERE key LIKE 'usage:%'")
    .all()
    .some((k) => /192\.0\.2|owner|guest/.test(k.key)),
  'khóa không chứa IP hay người dùng',
);

r = await req('usage-stats?days=7', 'GET', undefined, owner);
assert.equal(r.status, 200, 'chủ xem được');
let body = await r.json();
assert.equal(body.days, 7);
assert.ok(
  body.features.some((f) => f.feature === 'quickadd' && f.count === 1),
  'dấu vừa gửi có trong bảng',
);
assert.ok(Array.isArray(body.daily) && body.daily.length === 7);
assert.equal(
  (await (await req('usage-stats?days=30', 'GET', undefined, owner)).json())
    .days,
  30,
);
assert.equal(
  (await (await req('usage-stats?days=abc', 'GET', undefined, owner)).json())
    .days,
  7,
  'ngày sai về 7',
);
r = await req('usage-stats?days=7', 'GET', undefined, guest);
assert.equal(r.status, 404, 'người dùng khác nhận 404 như không có trang này');
assert.ok(!(await r.text()).includes('quickadd'), '404 không lộ số liệu');
r = await req('usage-stats?days=7');
assert.equal(r.status, 401, 'chưa đăng nhập');
console.log('PASS: bộ đếm dùng ẩn danh và bảng Thám Báo (usage-stats)');
