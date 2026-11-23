// v2.75.0 (Theo Chân): tùy chọn theo tài khoản (workspace.prefs = { tab?, usage? }) đi qua máy chủ thật.
// A. validPrefs / validWorkspace: bản cũ không có khóa vẫn hợp lệ; hình dạng đúng được nhận; khóa lạ, tab lạ, usage sai kiểu bị từ chối.
// B. Kho máy chủ: ghi tab và công tắc, tải lại đúng (đường mới và đường cũ), chỉ đổi bản ghi gốc, dữ liệu sai bị từ chối, bỏ khóa thì tải lại không còn.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash, validWorkspace } from '../server/api.mjs';
import { validPrefs, PREF_TABS } from '../server/prefs.mjs';
import { changesBetween } from '../dist/modules/delta.mjs';

// A. Luật kiểm
assert.equal(
  validPrefs(undefined),
  true,
  'không có khóa là hợp lệ (dữ liệu cũ)',
);
assert.equal(validPrefs({}), true, 'tùy chọn trống hợp lệ');
assert.deepEqual(
  PREF_TABS,
  ['today', 'octa', 'story', 'gods', 'store', 'all'],
  'đúng sáu tab của trang Tu vi',
);
for (const tab of PREF_TABS)
  assert.equal(validPrefs({ tab }), true, 'nhận tab ' + tab);
assert.equal(validPrefs({ usage: true }), true, 'usage true hợp lệ');
assert.equal(validPrefs({ usage: false }), true, 'usage false hợp lệ');
assert.equal(validPrefs({ tab: 'octa', usage: false }), true, 'cả hai cùng có');
for (const [label, bad] of [
  ['null', null],
  ['mảng', []],
  ['chuỗi', 'x'],
  ['số', 5],
  ['khóa lạ', { tab: 'all', extra: 1 }],
  ['tab lạ', { tab: 'khong-co' }],
  ['tab rỗng', { tab: '' }],
  ['tab không phải chuỗi', { tab: 3 }],
  ['tab viết hoa', { tab: 'Today' }],
  ['usage là chuỗi', { usage: 'false' }],
  ['usage là số', { usage: 0 }],
  ['usage là null', { usage: null }],
  ['tab là null', { tab: null }],
])
  assert.equal(validPrefs(bad), false, 'phải từ chối: ' + label);
const task = (id, extra = {}) => ({
  id,
  title: 'Việc ' + id,
  col: 'List',
  description: '',
  due: '',
  tag: 'Công việc',
  priority: 'q2',
  checks: [],
  ...extra,
});
const project = (id, tasks) => ({
  id,
  name: 'Dự án ' + id,
  description: '',
  color: '#7950c8',
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  tasks,
});
const base = () => ({
  schema: 1,
  projects: [
    project('p1', [task('p1t0'), task('p1t1')]),
    project('p2', [task('p2t0')]),
  ],
  notes: [],
});
assert.equal(validWorkspace(base()), true, 'bản cũ không có prefs vẫn hợp lệ');
assert.equal(
  validWorkspace({ ...base(), prefs: { tab: 'store', usage: false } }),
  true,
  'bản có prefs hợp lệ',
);
assert.equal(
  validWorkspace({ ...base(), prefs: { tab: 'x' } }),
  false,
  'prefs sai bị từ chối ở validWorkspace',
);
assert.equal(
  validWorkspace({
    ...base(),
    prefs: { tab: 'all' },
    worklist: { v: 1, items: [] },
  }),
  true,
  'prefs không cản worklist',
);

// B. Kho máy chủ
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
sql
  .prepare(
    'INSERT INTO users(id,email,password_hash,verified,created) VALUES(?,?,?,1,0)',
  )
  .run('owner', 'owner@example.test', await passwordHash(password));
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
const login = await req('login', 'POST', {
  email: 'owner@example.test',
  password,
  rememberDevice: true,
});
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
const first = await (await req('workspace-v2', 'GET', null, cookie)).json();
let before = first.data,
  revision = first.revision || 0;
async function push(next, what) {
  const changes = changesBetween(before, next);
  const r = await req('workspace-v2', 'POST', { revision, changes }, cookie);
  assert.equal(r.status, 200, what + ': ' + (await r.clone().text()));
  revision = (await r.json()).revision;
  before = next;
  return changes;
}
const reload = async (path = 'workspace-v2') =>
  (await (await req(path, 'GET', null, cookie)).json()).data;

let next = structuredClone(before);
next.projects = base().projects;
await push(next, 'tạo hai dự án');
next = structuredClone(before);
next.prefs = { tab: 'octa' };
let changes = await push(next, 'ghi tab');
assert.deepEqual(
  changes.map((c) => c.key),
  ['root:root'],
  'tùy chọn nằm trong bản ghi gốc: không đụng bản ghi việc hay dự án nào',
);
for (const path of ['workspace-v2', 'workspace'])
  assert.deepEqual(
    (await reload(path)).prefs,
    { tab: 'octa' },
    'tải lại (' + path + ') đúng tab đã chọn',
  );

next = structuredClone(before);
next.prefs = { tab: 'store', usage: false };
changes = await push(next, 'ghi thêm công tắc chỉ số ẩn danh');
assert.deepEqual(
  changes.map((c) => c.key),
  ['root:root'],
  'đổi tùy chọn chỉ đổi bản ghi gốc',
);
assert.deepEqual(
  (await reload()).prefs,
  { tab: 'store', usage: false },
  'tab và công tắc cùng được lưu',
);
assert.deepEqual(
  (await reload()).projects.map((p) => p.tasks.map((t) => t.id)),
  [['p1t0', 'p1t1'], ['p2t0']],
  'việc và dự án vẫn nguyên',
);

next = structuredClone(before);
next.prefs.usage = true;
await push(next, 'bật lại công tắc');
assert.equal((await reload()).prefs.usage, true, 'bật lại được lưu');

for (const bad of [
  { tab: 'khong-co' },
  { usage: 'có' },
  { tab: 'all', extra: 1 },
  'x',
]) {
  const b = structuredClone(before);
  b.prefs = bad;
  const r = await req(
    'workspace-v2',
    'POST',
    { revision, changes: changesBetween(before, b) },
    cookie,
  );
  assert.ok(
    r.status >= 400,
    'dữ liệu sai phải bị từ chối: ' + JSON.stringify(bad) + ' → ' + r.status,
  );
}
assert.deepEqual(
  (await reload()).prefs,
  { tab: 'store', usage: true },
  'sau các lần từ chối, tùy chọn vẫn như cũ',
);

next = structuredClone(before);
delete next.prefs;
await push(next, 'bỏ hẳn khóa prefs');
assert.equal(
  (await reload()).prefs,
  undefined,
  'bỏ khóa thì tải lại không còn',
);
console.log(
  'PASS: tùy chọn theo tài khoản (prefs) hợp lệ và đồng bộ qua kho máy chủ',
);
