// v2.63.0 (Liên Hoàn Lệnh): chuỗi việc ưu tiên xuyên dự án (workspace.worklist) đi qua máy chủ thật.
// A. validWorklist / validWorkspace: bản cũ không có khóa vẫn hợp lệ; hình dạng đúng được nhận; sai kiểu, khóa lạ, ngày sai, id sai, quá giới hạn bị từ chối.
// B. Kho máy chủ: ghi chuỗi, tải lại đúng thứ tự (đường mới và đường cũ), đổi thứ tự / gỡ chỉ đổi bản ghi gốc, dữ liệu sai bị từ chối (400), việc và dự án không đổi.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { api, passwordHash, validWorkspace } from '../server/api.mjs';
import { validWorklist, WORKLIST_MAX } from '../server/worklist.mjs';
import { changesBetween } from '../dist/modules/delta.mjs';

// A. Luật kiểm
const ok = {
  v: 1,
  items: [
    { t: 'p1t0', a: '2026-11-10' },
    { t: 'p2t3', a: '2026-11-11', x: '2026-11-12' },
  ],
};
assert.equal(
  validWorklist(undefined),
  true,
  'không có khóa là hợp lệ (dữ liệu cũ)',
);
assert.equal(validWorklist({ v: 1, items: [] }), true, 'chuỗi trống hợp lệ');
assert.equal(validWorklist(ok), true, 'hình dạng đúng được nhận');
for (const [label, bad] of [
  ['null', null],
  ['mảng', []],
  ['chuỗi', 'x'],
  ['thiếu v', { items: [] }],
  ['v sai', { v: 2, items: [] }],
  ['thiếu items', { v: 1 }],
  ['items không phải mảng', { v: 1, items: {} }],
  ['khóa lạ', { v: 1, items: [], extra: 1 }],
  ['dòng không phải đối tượng', { v: 1, items: ['p1t0'] }],
  ['dòng null', { v: 1, items: [null] }],
  ['dòng là mảng', { v: 1, items: [['p1t0', '2026-11-10']] }],
  ['thiếu id', { v: 1, items: [{ a: '2026-11-10' }] }],
  ['id rỗng', { v: 1, items: [{ t: '', a: '2026-11-10' }] }],
  ['id có ký tự lạ', { v: 1, items: [{ t: 'a b', a: '2026-11-10' }] }],
  ['id dài quá 99', { v: 1, items: [{ t: 'x'.repeat(100), a: '2026-11-10' }] }],
  ['id không phải chuỗi', { v: 1, items: [{ t: 5, a: '2026-11-10' }] }],
  ['thiếu ngày ghi', { v: 1, items: [{ t: 'p1t0' }] }],
  ['ngày ghi sai định dạng', { v: 1, items: [{ t: 'p1t0', a: '10/11/2026' }] }],
  ['ngày ghi không có thật', { v: 1, items: [{ t: 'p1t0', a: '2026-02-30' }] }],
  [
    'ngày gỡ sai',
    { v: 1, items: [{ t: 'p1t0', a: '2026-11-10', x: 'hôm qua' }] },
  ],
  ['ngày gỡ rỗng', { v: 1, items: [{ t: 'p1t0', a: '2026-11-10', x: '' }] }],
  [
    'dòng có khóa lạ',
    { v: 1, items: [{ t: 'p1t0', a: '2026-11-10', note: 'x' }] },
  ],
])
  assert.equal(validWorklist(bad), false, 'phải từ chối: ' + label);
const many = (n) => ({
  v: 1,
  items: Array.from({ length: n }, (_, i) => ({ t: 't' + i, a: '2026-11-10' })),
});
assert.equal(validWorklist(many(WORKLIST_MAX)), true, 'đúng giới hạn thì nhận');
assert.equal(
  validWorklist(many(WORKLIST_MAX + 1)),
  false,
  'quá giới hạn thì từ chối',
);
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
assert.equal(
  validWorkspace(base()),
  true,
  'bản cũ không có worklist vẫn hợp lệ',
);
assert.equal(
  validWorkspace({ ...base(), worklist: ok }),
  true,
  'bản có worklist hợp lệ',
);
assert.equal(
  validWorkspace({
    ...base(),
    worklist: { v: 1, items: [{ t: 'khong-co-viec-nay', a: '2026-11-10' }] },
  }),
  true,
  'id việc đã xóa không làm cả bộ dữ liệu bị từ chối',
);
assert.equal(
  validWorkspace({
    ...base(),
    worklist: {
      v: 1,
      items: [
        { t: 'p1t0', a: '2026-11-10' },
        { t: 'p1t0', a: '2026-11-11' },
      ],
    },
  }),
  true,
  'hai thiết bị cùng ghi một việc vẫn lưu được',
);
assert.equal(
  validWorkspace({ ...base(), worklist: { v: 3, items: [] } }),
  false,
  'worklist sai bị từ chối ở validWorkspace',
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
const items = [
  { t: 'p2t0', a: '2026-11-10' },
  { t: 'p1t1', a: '2026-11-10' },
  { t: 'p1t0', a: '2026-11-11' },
];
next = structuredClone(before);
next.worklist = { v: 1, items };
let changes = await push(next, 'ghi ba việc vào chuỗi');
assert.deepEqual(
  changes.map((c) => c.key),
  ['root:root'],
  'chuỗi nằm trong bản ghi gốc: không đụng bản ghi việc hay dự án nào',
);
for (const path of ['workspace-v2', 'workspace'])
  assert.deepEqual(
    (await reload(path)).worklist,
    { v: 1, items },
    'tải lại (' + path + ') đúng thứ tự đã xếp',
  );

next = structuredClone(before);
next.worklist.items = [items[2], items[0], items[1]];
changes = await push(next, 'đổi thứ tự');
assert.deepEqual(
  changes.map((c) => c.key),
  ['root:root'],
  'đổi thứ tự chỉ đổi bản ghi gốc',
);
assert.deepEqual(
  (await reload()).worklist.items.map((e) => e.t),
  ['p1t0', 'p2t0', 'p1t1'],
  'thứ tự mới được lưu',
);

next = structuredClone(before);
next.worklist.items[1].x = '2026-11-12';
await push(next, 'gỡ một việc khỏi chuỗi');
const gone = (await reload()).worklist.items.find((e) => e.t === 'p2t0');
assert.deepEqual(
  gone,
  { t: 'p2t0', a: '2026-11-10', x: '2026-11-12' },
  'việc bị gỡ giữ dòng, thêm ngày gỡ',
);
const kept = await reload();
assert.deepEqual(
  kept.projects.map((p) => p.tasks.map((t) => t.id)),
  [['p1t0', 'p1t1'], ['p2t0']],
  'việc và dự án vẫn nguyên',
);

for (const bad of [
  { v: 2, items: [] },
  { v: 1, items: [{ t: 'p1t0', a: 'hôm nay' }] },
  { v: 1, items: [{ t: 'p1t0', a: '2026-11-10', extra: 1 }] },
  { v: 1, items: 'x' },
]) {
  const b = structuredClone(before);
  b.worklist = bad;
  const r = await req(
    'workspace-v2',
    'POST',
    { revision, changes: changesBetween(before, b) },
    cookie,
  );
  assert.ok(
    r.status >= 400,
    'dữ liệu sai phải bị từ chối: ' +
      JSON.stringify(bad).slice(0, 50) +
      ' → ' +
      r.status,
  );
}
assert.deepEqual(
  (await reload()).worklist.items.length,
  3,
  'sau các lần từ chối, chuỗi vẫn như cũ',
);

next = structuredClone(before);
delete next.worklist;
await push(next, 'bỏ hẳn khóa worklist');
assert.equal(
  (await reload()).worklist,
  undefined,
  'bỏ khóa thì tải lại không còn',
);
console.log(
  'PASS: Liên hoàn lệnh (worklist) hợp lệ và đồng bộ qua kho máy chủ',
);
