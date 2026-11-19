// v2.67.0 (Tích Công): hai trường tùy chọn mới đi qua bộ kiểm dữ liệu của máy chủ.
//  - Trên việc: `xpWait` (việc đã xong đang chờ chia công lực): chỉ nhận đúng `true`; vắng mặt là hợp lệ (dữ liệu cũ nguyên vẹn).
//  - Trên data.growth: `batch` (gộp cuối ngày): chỉ nhận boolean; vắng mặt = hỏi mỗi lần như cũ.
import assert from 'node:assert/strict';
import { validWorkspace } from '../server/api.mjs';
import { validGrowth } from '../server/growth.mjs';

const task = (id, extra = {}) => ({
  id,
  title: 'Việc ' + id,
  col: 'Done',
  description: '',
  due: '',
  tag: 'Công việc',
  priority: 'q2',
  checks: [],
  ...extra,
});
const ws = (t) => ({
  schema: 1,
  projects: [
    {
      id: 'p1',
      name: 'Dự án',
      description: '',
      color: '#7950c8',
      icon: '✺',
      columns: ['Idea', 'List', 'Doing', 'Done'],
      tasks: [t],
    },
  ],
  notes: [],
});

assert.equal(
  validWorkspace(ws(task('a'))),
  true,
  'việc không có xpWait hợp lệ (dữ liệu cũ)',
);
assert.equal(
  validWorkspace(ws(task('a', { xpWait: true }))),
  true,
  'xpWait true hợp lệ',
);
assert.equal(
  validWorkspace(ws(task('a', { xpWait: true, axis: 'gia' }))),
  true,
  'xpWait đi cùng axis',
);
for (const [label, bad] of [
  ['false', false],
  ['chuỗi', 'true'],
  ['số 1', 1],
  ['null', null],
  ['mảng', [true]],
  ['đối tượng', {}],
])
  assert.equal(
    validWorkspace(ws(task('a', { xpWait: bad }))),
    false,
    'xpWait sai bị từ chối: ' + label,
  );

const g = (extra = {}) => ({
  v: 1,
  hero: 'nam',
  since: '2026-11-01',
  log: [],
  ...extra,
});
assert.equal(validGrowth(g()), true, 'không có batch hợp lệ');
assert.equal(validGrowth(g({ batch: true })), true, 'batch true hợp lệ');
assert.equal(validGrowth(g({ batch: false })), true, 'batch false hợp lệ');
for (const [label, bad] of [
  ['chuỗi', 'true'],
  ['số', 1],
  ['null', null],
  ['mảng', []],
])
  assert.equal(
    validGrowth(g({ batch: bad })),
    false,
    'batch sai bị từ chối: ' + label,
  );
assert.equal(
  validGrowth(g({ lạ: true })),
  false,
  'khóa lạ vẫn bị từ chối (danh sách khóa chỉ thêm batch)',
);
// Bộ kiểm dữ liệu phía trình duyệt (dist/lazy.js) cũng có danh sách khóa riêng: phải nhận cùng các khóa với máy chủ, nếu không lưu cờ sẽ bị chặn.
import { readFileSync } from 'node:fs';
const lazy = readFileSync(new URL('../dist/lazy.js', import.meta.url), 'utf8');
const keys = (lazy.match(/\['v', 'hero', 'name', 'since', 'log'[^\]]*\]/) || [
  '',
])[0];
assert.ok(
  keys.includes("'batch'"),
  'dist/lazy.js nhận khóa batch của data.growth',
);
assert.match(
  lazy,
  /g\.batch !== undefined && typeof g\.batch !== 'boolean'/,
  'dist/lazy.js kiểm batch là boolean',
);
console.log(
  'PASS: xpWait trên việc và batch của Điểm tích lũy (Tích Công) được kiểm đúng',
);
