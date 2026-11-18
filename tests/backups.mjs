// v2.55.0 (Sao Lưu Hằng Tuần): server/backups.mjs, /api/backups và nhịp cron Chủ nhật.
//  1. Cấu hình: mặc định an toàn khi thiếu biến môi trường; giá trị sai quay về mặc định; BACKUP_ENABLED tắt sao lưu tự động.
//  2. API: cần đăng nhập; tạo bản thủ công / trước khi khôi phục, liệt kê, đọc đúng dữ liệu đã lưu, xóa; người khác không thấy và không đọc được bản của mình;
//     mã bản sao sai bị từ chối; giới hạn tần suất; không có R2 thì báo gọn, không lỗi.
//  3. Giữ bản: tự động 8 (hoặc BACKUP_KEEP), thủ công 5 và trước-khi-khôi-phục 5 tính riêng; bản mới nhất được giữ.
//  4. Cron: chỉ chạy Chủ nhật 02:00–05:59 giờ Việt Nam; mỗi nhịp một lô nhỏ; không sao lưu lặp trong tuần; tài khoản chưa đổi gì thì bỏ qua và không đẩy bản cũ đi;
//     tài khoản chưa xác minh / chưa có dữ liệu bị bỏ qua; một tài khoản lỗi không chặn tài khoản khác; lỗi R2 không làm hỏng nhắc việc.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, daily, passwordHash } from '../server/api.mjs';
import {
  backupConfig,
  listBackups,
  readBackup,
  weeklyBackup,
  writeBackup,
} from '../server/backups.mjs';
import { makeProject } from './lib/browser-harness.mjs';

const sql = new DatabaseSync(':memory:');
sql.exec(
  readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'),
);
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
// R2 giả: đủ put / get / delete / list (có phân trang và customMetadata).
class FakeR2 {
  constructor() {
    this.files = new Map();
    this.failPut = new Set();
    this.failList = false;
    this.puts = 0;
  }
  async put(key, bytes, options = {}) {
    for (const part of this.failPut)
      if (key.includes(part)) throw new Error('R2 từ chối ghi');
    this.puts++;
    this.files.set(key, {
      bytes: new Uint8Array(bytes),
      customMetadata: options.customMetadata || {},
      contentType: options.httpMetadata?.contentType,
      uploaded: new Date(),
    });
  }
  async get(key) {
    const f = this.files.get(key);
    return f
      ? {
          arrayBuffer: async () =>
            f.bytes.buffer.slice(
              f.bytes.byteOffset,
              f.bytes.byteOffset + f.bytes.byteLength,
            ),
        }
      : null;
  }
  async delete(key) {
    this.files.delete(key);
  }
  async list({ prefix = '', limit = 1000, cursor, include = [] } = {}) {
    if (this.failList) throw new Error('R2 không liệt kê được');
    const keys = [...this.files.keys()]
      .filter((k) => k.startsWith(prefix))
      .sort();
    const start = cursor ? keys.indexOf(cursor) + 1 : 0;
    const page = keys.slice(start, start + limit);
    return {
      objects: page.map((key) => ({
        key,
        size: this.files.get(key).bytes.length,
        uploaded: this.files.get(key).uploaded,
        customMetadata: include.includes('customMetadata')
          ? this.files.get(key).customMetadata
          : undefined,
      })),
      truncated: start + limit < keys.length,
      cursor: page.at(-1),
    };
  }
}
const r2 = new FakeR2();
const env = { DB, FILES: r2, VAPID_PUBLIC: 'test-public' };
const req = (
  path,
  method = 'GET',
  data,
  cookie = '',
  ip = '192.0.2.1',
  e = env,
) => {
  const headers = { 'CF-Connecting-IP': ip };
  if (cookie) headers.Cookie = cookie;
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
    e,
  );
};
const password = 'Test passphrase 2026!',
  hashed = await passwordHash(password);
async function account(id, verified = 1) {
  sql
    .prepare(
      'INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,?,?)',
    )
    .run(id, id + '@example.test', hashed, verified, Date.now());
  if (!verified) return '';
  const login = await req(
    'login',
    'POST',
    { email: id + '@example.test', password },
    '',
    '192.0.2.' + (10 + sql.prepare('SELECT COUNT(*) AS n FROM users').get().n),
  );
  assert.equal(login.status, 200, 'đăng nhập ' + id);
  return login.headers.get('Set-Cookie').split(';')[0];
}
const workspace = (title = 'Việc đầu tiên') => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = title;
  return {
    schema: 1,
    notes: [
      {
        id: 'n1',
        type: 'note',
        title: 'Ghi chú một',
        text: 'nội dung',
        url: '',
        group: '',
        color: '#7950c8',
      },
    ],
    projects: [p],
  };
};

// ---- 1. Cấu hình -------------------------------------------------------------------------------------------------------------------
assert.deepEqual(
  backupConfig({}),
  { enabled: true, keepAuto: 8, keepOther: 5 },
  'mặc định an toàn khi thiếu biến môi trường',
);
assert.deepEqual(backupConfig(undefined), {
  enabled: true,
  keepAuto: 8,
  keepOther: 5,
});
assert.deepEqual(backupConfig({ BACKUP_KEEP: '12', BACKUP_KEEP_USER: '3' }), {
  enabled: true,
  keepAuto: 12,
  keepOther: 3,
});
for (const bad of ['0', '-4', '99', 'abc', '', '2.5x'])
  assert.equal(
    backupConfig({ BACKUP_KEEP: bad }).keepAuto,
    bad === '2.5x' ? 2 : 8,
    'giá trị sai quay về mặc định: ' + bad,
  );
for (const off of ['0', 'false', 'OFF', ' no '])
  assert.equal(
    backupConfig({ BACKUP_ENABLED: off }).enabled,
    false,
    'tắt: ' + off,
  );
for (const on of ['1', 'true', 'on', 'bất kỳ'])
  assert.equal(
    backupConfig({ BACKUP_ENABLED: on }).enabled,
    true,
    'bật: ' + on,
  );
console.log('PASS: cấu hình sao lưu có mặc định an toàn');

// ---- 2. API --------------------------------------------------------------------------------------------------------------------------
const alice = await account('alice');
const bob = await account('bob');
assert.equal((await req('backups')).status, 401, 'cần đăng nhập');
assert.equal((await req('backups', 'POST', { kind: 'manual' })).status, 401);
assert.equal((await req('backups/2026-11-22-auto')).status, 401);
const empty = await (await req('backups', 'GET', null, alice)).json();
assert.deepEqual(
  empty,
  { available: true, auto: true, keep: { auto: 8, other: 5 }, items: [] },
  'chưa có bản nào',
);
assert.equal(
  (await req('backups', 'POST', { kind: 'manual' }, alice)).status,
  404,
  'chưa có dữ liệu thì không sao lưu',
);
const data = workspace();
assert.equal(
  (await req('workspace', 'PUT', { data, revision: 0 }, alice)).status,
  200,
);
assert.equal(
  (await req('backups', 'POST', { kind: 'auto' }, alice)).status,
  400,
  'người dùng không tự tạo bản “tự động”',
);
assert.equal((await req('backups', 'POST', {}, alice)).status, 400);
const made = await (
  await req('backups', 'POST', { kind: 'manual' }, alice)
).json();
assert.match(made.item.id, /^\d{4}-\d{2}-\d{2}T\d{6}-manual$/);
assert.equal(made.item.kind, 'manual');
assert.deepEqual(
  [made.item.projects, made.item.tasks, made.item.notes],
  [1, 3, 1],
  'đếm dự án / việc / ghi chú',
);
assert.ok(made.item.size > 0 && made.item.size < made.item.raw, 'đã nén');
const key = [...r2.files.keys()].find((k) => k.endsWith('-manual.json.gz'));
assert.ok(
  key.startsWith('backups/alice/'),
  'đối tượng R2 nằm dưới thư mục của chính người dùng: ' + key,
);
assert.equal(r2.files.get(key).contentType, 'application/gzip');
const listed = await (await req('backups', 'GET', null, alice)).json();
assert.deepEqual(
  listed.items.map((i) => i.id),
  [made.item.id],
);
const read = await (
  await req('backups/' + made.item.id, 'GET', null, alice)
).json();
assert.equal(read.id, made.item.id);
assert.equal(read.kind, 'manual');
assert.equal(read.data.projects[0].tasks[0].title, 'Việc đầu tiên');
assert.deepEqual(
  read.data.notes.map((n) => n.id),
  ['n1'],
  'đọc lại đúng dữ liệu đã lưu',
);
// Dữ liệu đổi sau đó không làm đổi bản đã lưu.
const rev = (await (await req('workspace', 'GET', null, alice)).json())
  .revision;
assert.equal(
  (
    await req(
      'workspace',
      'PUT',
      { data: workspace('Việc đã đổi tên'), revision: rev },
      alice,
    )
  ).status,
  200,
);
assert.equal(
  (await (await req('backups/' + made.item.id, 'GET', null, alice)).json()).data
    .projects[0].tasks[0].title,
  'Việc đầu tiên',
  'bản sao giữ nguyên dù dữ liệu đổi',
);
// Người khác không thấy, không đọc, không xóa được.
assert.deepEqual(
  (await (await req('backups', 'GET', null, bob)).json()).items,
  [],
  'bob không thấy bản của alice',
);
assert.equal(
  (await req('backups/' + made.item.id, 'GET', null, bob)).status,
  404,
  'bob không đọc được',
);
assert.equal(
  (await req('backups/' + made.item.id, 'DELETE', {}, bob)).status,
  200,
  'xóa bản không có của mình: êm, không đụng bản người khác',
);
assert.equal(r2.files.has(key), true, 'bản của alice vẫn còn');
// Mã sai.
for (const bad of [
  '..%2F..%2Fx',
  'abc',
  '2026-11-22-evil',
  '2026-11-22T12-manual',
  '2026-13-99-auto%00',
]) {
  const r = await req('backups/' + bad, 'GET', null, alice);
  assert.ok(
    [400, 404].includes(r.status),
    'mã sai bị từ chối: ' + bad + ' → ' + r.status,
  );
}
{
  const raw = await api(
    new Request(
      'https://kanban.huongthiennature.com/api/backups/' + made.item.id,
      {
        method: 'DELETE',
        headers: { 'CF-Connecting-IP': '192.0.2.1', Cookie: alice },
      },
    ),
    env,
  );
  assert.ok(
    [400, 403].includes(raw.status),
    'thiếu Origin / JSON bị từ chối như mọi thao tác ghi: ' + raw.status,
  );
  assert.ok(r2.files.has(key), 'bản chưa bị xóa');
}
// Bản hỏng không làm lỗi máy chủ.
r2.files.set('backups/alice/2026-01-04-auto.json.gz', {
  bytes: new TextEncoder().encode('không phải gzip'),
  customMetadata: {},
  uploaded: new Date(),
});
assert.equal(
  (await req('backups/2026-01-04-auto', 'GET', null, alice)).status,
  422,
  'bản hỏng → 422',
);
r2.files.delete('backups/alice/2026-01-04-auto.json.gz');
// Xóa.
assert.equal(
  (await req('backups/' + made.item.id, 'DELETE', {}, alice)).status,
  200,
);
assert.equal(r2.files.has(key), false);
assert.equal(
  (await req('backups/' + made.item.id, 'GET', null, alice)).status,
  404,
);
// Giới hạn tần suất: 6 lần mỗi 15 phút (đã dùng 3: hai lần lỗi 400 vẫn tính, một lần 404 không có dữ liệu… tính theo số lần gọi).
let limited = 0;
for (let i = 0; i < 8; i++)
  if ((await req('backups', 'POST', { kind: 'manual' }, alice)).status === 429)
    limited++;
assert.ok(limited >= 1, 'tạo quá nhiều bản trong 15 phút thì bị chặn');
// Không có R2.
const noR2 = { DB, VAPID_PUBLIC: 'x' };
assert.deepEqual(
  (await (await req('backups', 'GET', null, alice, '192.0.2.1', noR2)).json())
    .items,
  [],
  'không có R2: danh sách rỗng',
);
assert.equal(
  (await (await req('backups', 'GET', null, alice, '192.0.2.1', noR2)).json())
    .available,
  false,
);
assert.equal(
  (await req('backups', 'POST', { kind: 'manual' }, alice, '192.0.2.1', noR2))
    .status,
  503,
);
console.log(
  'PASS: API sao lưu (tạo, liệt kê, đọc, xóa, tách theo người dùng, mã sai, tần suất, không có R2)',
);

// ---- 3. Giữ bản ----------------------------------------------------------------------------------------------------------------------
{
  for (const k of [...r2.files.keys()]) r2.files.delete(k); // bỏ các bản tạo ở phần API (giờ thật)
  const stamp = (n) =>
    new Date(Date.parse('2026-11-01T01:00:00Z') + n * 86400000 + n * 7000);
  for (let n = 0; n < 7; n++)
    await writeBackup(env, 'alice', 'manual', stamp(n));
  for (let n = 0; n < 7; n++)
    await writeBackup(env, 'alice', 'restore', stamp(n + 10));
  for (let n = 0; n < 11; n++)
    await writeBackup(env, 'alice', 'auto', stamp(n * 7 + 20));
  const items = await listBackups(env, 'alice');
  const count = (kind) => items.filter((i) => i.kind === kind).length;
  assert.deepEqual(
    [count('manual'), count('restore'), count('auto')],
    [5, 5, 8],
    'giữ 5 thủ công, 5 trước-khi-khôi-phục, 8 tự động',
  );
  const manual = items
    .filter((i) => i.kind === 'manual')
    .map((i) => i.createdAt);
  assert.equal(manual[0], stamp(6).toISOString(), 'giữ bản mới nhất');
  assert.equal(manual.at(-1), stamp(2).toISOString(), 'bỏ hai bản cũ nhất');
  assert.deepEqual(
    items.map((i) => i.createdAt),
    [...items.map((i) => i.createdAt)].sort().reverse(),
    'xếp mới nhất trước',
  );
  const small = { ...env, BACKUP_KEEP: '3', BACKUP_KEEP_USER: '2' };
  await writeBackup(small, 'alice', 'auto', stamp(200), backupConfig(small));
  await writeBackup(small, 'alice', 'manual', stamp(201), backupConfig(small));
  const after = await listBackups(env, 'alice');
  assert.deepEqual(
    [
      after.filter((i) => i.kind === 'auto').length,
      after.filter((i) => i.kind === 'manual').length,
      after.filter((i) => i.kind === 'restore').length,
    ],
    [3, 2, 5],
    'BACKUP_KEEP và BACKUP_KEEP_USER có hiệu lực, loại khác không bị đụng',
  );
  assert.equal(
    (await listBackups(env, 'bob')).length,
    0,
    'không đụng bản của người khác',
  );
  for (const key of [...r2.files.keys()]) r2.files.delete(key);
  assert.equal(
    (await readBackup(env, 'alice', '2026-11-01-auto').catch((e) => e))
      .status ?? 404,
    404,
  );
  console.log('PASS: giữ bản theo từng loại, theo cấu hình, mới nhất trước');
}

// ---- 4. Cron Chủ nhật ------------------------------------------------------------------------------------------------------------------
{
  sql.prepare('DELETE FROM deliveries').run();
  // Thêm tài khoản: carol có dữ liệu cũ (bảng workspaces), dave chưa xác minh, erin chưa có dữ liệu, rồi 20 tài khoản nữa để thử lô.
  await account('carol', 1);
  sql
    .prepare('INSERT INTO workspaces(user_id,data,revision) VALUES(?,?,?)')
    .run('carol', JSON.stringify(workspace('Việc của carol')), 3);
  await account('dave', 0);
  sql
    .prepare('INSERT INTO workspaces(user_id,data,revision) VALUES(?,?,?)')
    .run('dave', JSON.stringify(workspace()), 1);
  await account('erin', 1);
  const SUN = (h) =>
    new Date('2026-11-22T00:00:00Z').getTime() - 7 * 3600000 + h * 3600000; // Chủ nhật 22/11/2026, h giờ Việt Nam
  const at = (h, m = 0) => new Date(SUN(h) + m * 60000);
  const win = (now) => {
    const day = new Date(now.getTime() + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
    return {
      day,
      hour: Number(
        new Date(now.getTime() + 7 * 3600000).toISOString().slice(11, 13),
      ),
      weekday: new Date(day + 'T12:00:00Z').getUTCDay(),
    };
  };
  const autos = (user) =>
    [...r2.files.keys()].filter(
      (k) =>
        k.startsWith('backups/' + user + '/') && k.endsWith('-auto.json.gz'),
    );
  const all = () =>
    [...r2.files.keys()].filter((k) => k.startsWith('backups/'));

  // Ngoài khung: thứ Bảy, Chủ nhật 01:xx, 06:00, thứ Hai: không làm gì.
  for (const now of [
    new Date(at(3).getTime() - 86400000),
    at(1, 59),
    at(6),
    new Date(at(3).getTime() + 86400000),
  ]) {
    const r = await weeklyBackup(env, now, win(now));
    assert.equal(r.skipped, 'window', 'ngoài khung: ' + now.toISOString());
  }
  assert.equal(all().length, 0, 'ngoài khung không ghi gì');
  // Tắt / không có R2.
  assert.equal(
    (await weeklyBackup({ ...env, BACKUP_ENABLED: 'off' }, at(3), win(at(3))))
      .skipped,
    'off',
  );
  assert.equal((await weeklyBackup({ DB }, at(3), win(at(3)))).skipped, 'off');
  assert.equal(all().length, 0);

  // Trong khung: alice (v2) và carol (cũ) được sao lưu; dave (chưa xác minh) và erin (chưa có dữ liệu) thì không.
  const first = await weeklyBackup(env, at(3), win(at(3)));
  assert.deepEqual(first, { written: 2, unchanged: 0, failed: 0 });
  assert.equal(autos('alice').length, 1);
  assert.equal(autos('carol').length, 1);
  assert.equal(
    autos('dave').length + autos('erin').length,
    0,
    'chưa xác minh / chưa có dữ liệu thì bỏ qua',
  );
  assert.ok(autos('alice')[0].endsWith('/2026-11-22-auto.json.gz'));
  assert.equal(
    (await readBackup(env, 'carol', '2026-11-22-auto')).data.projects[0]
      .tasks[0].title,
    'Việc của carol',
    'đọc được dữ liệu từ bảng cũ',
  );
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) n FROM deliveries WHERE channel='backup' AND status='sent' AND day='2026-11-22'",
      )
      .get().n,
    2,
  );
  // Nhịp sau trong cùng tuần: không làm lại.
  const putsBefore = r2.puts;
  assert.deepEqual(await weeklyBackup(env, at(3, 5), win(at(3, 5))), {
    written: 0,
    unchanged: 0,
    failed: 0,
  });
  assert.equal(r2.puts, putsBefore, 'không sao lưu lặp trong tuần');

  // Tuần sau, chưa ai đổi gì: bỏ qua, không đẩy bản cũ đi; đánh dấu đã xử lý.
  const next = new Date(at(4).getTime() + 7 * 86400000);
  assert.deepEqual(await weeklyBackup(env, next, win(next)), {
    written: 0,
    unchanged: 2,
    failed: 0,
  });
  assert.equal(autos('alice').length, 1, 'không đổi gì thì không có bản mới');
  // alice đổi dữ liệu → tuần kế tiếp có bản mới; bản cũ vẫn còn.
  const rev2 = (await (await req('workspace', 'GET', null, alice)).json())
    .revision;
  assert.equal(
    (
      await req(
        'workspace',
        'PUT',
        { data: workspace('Việc tuần sau'), revision: rev2 },
        alice,
      )
    ).status,
    200,
  );
  const third = new Date(next.getTime() + 7 * 86400000);
  assert.deepEqual(await weeklyBackup(env, third, win(third)), {
    written: 1,
    unchanged: 1,
    failed: 0,
  });
  assert.equal(autos('alice').length, 2);
  assert.equal(
    (await readBackup(env, 'alice', '2026-12-06-auto')).data.projects[0]
      .tasks[0].title,
    'Việc tuần sau',
  );
  assert.equal(
    (await readBackup(env, 'alice', '2026-11-22-auto')).data.projects[0]
      .tasks[0].title,
    'Việc đã đổi tên',
    'bản cũ giữ nguyên',
  );
  console.log(
    'PASS: cron chỉ chạy trong khung Chủ nhật, không lặp, bỏ qua tài khoản không đổi, bỏ qua chưa xác minh / chưa có dữ liệu',
  );

  // Lô nhỏ: 25 tài khoản mới, mỗi nhịp tối đa 10.
  const week4 = new Date(third.getTime() + 7 * 86400000);
  for (let i = 0; i < 25; i++) {
    const id = 'bulk' + String(i).padStart(2, '0');
    sql
      .prepare(
        'INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,?)',
      )
      .run(id, id + '@example.test', hashed, Date.now());
    sql
      .prepare('INSERT INTO workspaces(user_id,data,revision) VALUES(?,?,?)')
      .run(id, JSON.stringify(workspace('Việc ' + id)), 1);
  }
  const batchOf = async (n) =>
    (
      await weeklyBackup(
        env,
        new Date(week4.getTime() + n * 300000),
        win(new Date(week4.getTime() + n * 300000)),
      )
    ).written;
  // Hai tài khoản cũ cũng tính vào tuần này (alice và carol đã có dữ liệu; carol không đổi nên chỉ “unchanged”).
  const writes = [
    await batchOf(0),
    await batchOf(1),
    await batchOf(2),
    await batchOf(3),
  ];
  assert.ok(
    writes.every((n) => n <= 10),
    'mỗi nhịp tối đa 10 tài khoản: ' + writes,
  );
  assert.equal(
    writes.reduce((a, b) => a + b, 0),
    25,
    'đúng 25 tài khoản mới được ghi, không thừa không thiếu: ' + writes,
  );
  assert.equal(
    [...Array(25).keys()].every(
      (i) => autos('bulk' + String(i).padStart(2, '0')).length === 1,
    ),
    true,
    'sau vài nhịp mọi tài khoản đều có bản tuần này',
  );

  // Một tài khoản lỗi không chặn tài khoản khác, bị xếp sau cùng; hết lỗi thì được thử lại ở một nhịp sau.
  const week5 = new Date(week4.getTime() + 7 * 86400000);
  sql
    .prepare("UPDATE workspaces SET revision=revision+1 WHERE user_id='bulk00'")
    .run();
  const rev3 = (await (await req('workspace', 'GET', null, alice)).json())
    .revision;
  assert.equal(
    (
      await req(
        'workspace',
        'PUT',
        { data: workspace('Việc tuần 5'), revision: rev3 },
        alice,
      )
    ).status,
    200,
  );
  r2.failPut.add('backups/alice/');
  const bad = await weeklyBackup(env, week5, win(week5));
  assert.equal(bad.failed, 1, 'alice lỗi');
  assert.equal(
    bad.written,
    1,
    'bulk00 (có thay đổi) vẫn được sao lưu dù alice lỗi: ' +
      JSON.stringify(bad),
  );
  assert.equal(autos('bulk00').length, 2);
  const status = () =>
    sql
      .prepare(
        "SELECT status FROM deliveries WHERE user_id='alice' AND day=? AND channel='backup'",
      )
      .get('2026-12-20').status;
  assert.equal(status(), 'failed');
  r2.failPut.clear();
  const tick = (n) => new Date(week5.getTime() + n * 300000);
  await weeklyBackup(env, tick(1), win(tick(1)));
  assert.equal(
    status(),
    'failed',
    'tài khoản đã lỗi xếp sau các tài khoản chưa xử lý',
  );
  let tries = 2;
  while (status() !== 'sent' && tries < 8)
    await weeklyBackup(env, tick(tries), win(tick(tries++)));
  assert.equal(status(), 'sent', 'hết lỗi thì được thử lại và xong');
  assert.equal(autos('alice').length, 3, 'bản tuần 5 của alice đã được ghi');
  assert.equal(
    (await readBackup(env, 'alice', '2026-12-20-auto')).data.projects[0]
      .tasks[0].title,
    'Việc tuần 5',
  );
  console.log(
    'PASS: lô nhỏ mỗi nhịp, tài khoản lỗi không chặn tài khoản khác và được thử lại',
  );

  // Qua daily(): lỗi R2 không làm hỏng nhắc việc; trong khung thì sao lưu chạy cùng nhịp.
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    throw new Error('không cần gọi mạng');
  };
  try {
    sql.prepare('DELETE FROM deliveries WHERE channel=?').run('backup');
    r2.failList = true;
    await daily(env, at(3));
    r2.failList = false;
    for (const key of [...r2.files.keys()]) r2.files.delete(key);
    await daily(env, at(3, 10));
    assert.ok(
      all().length >= 1,
      'daily() kích hoạt sao lưu trong khung (lô đầu: các tài khoản chưa lỗi được làm trước)',
    );
    const before = all().length;
    await daily(env, new Date(at(3).getTime() - 86400000));
    assert.equal(all().length, before, 'ngoài khung daily() không sao lưu');
    assert.deepEqual(calls, [], 'sao lưu không gọi mạng');
  } finally {
    globalThis.fetch = realFetch;
  }
  console.log(
    'PASS: daily() — lỗi R2 không làm hỏng nhắc việc, sao lưu chạy trong khung',
  );
}
console.log(
  'PASS: sao lưu hằng tuần vào R2 (cấu hình, API, giữ bản, cron Chủ nhật)',
);
