// v2.66.0 (Gieo Nhân): trường tùy chọn `axis` trên việc (phương tu luyện mà việc mang sẵn) đi qua bộ kiểm dữ liệu của máy chủ.
//  - Không có axis là hợp lệ (dữ liệu cũ nguyên vẹn); đủ tám mã phương hợp lệ; mã lạ, sai kiểu, rỗng thì bị từ chối.
//  - Mã trong server/growth.mjs khớp đúng AXES (thứ tự và mã) trong dist/growth.js: hai nơi không được lệch nhau.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validWorkspace } from '../server/api.mjs';
import { GROWTH_AXIS_IDS } from '../server/growth.mjs';

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
const project = (tasks) => ({
  id: 'p1',
  name: 'Dự án',
  description: '',
  color: '#7950c8',
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  tasks,
});
const ws = (t) => ({ schema: 1, projects: [project([t])], notes: [] });

assert.equal(validWorkspace(ws(task('a'))), true, 'việc không có axis hợp lệ (dữ liệu cũ)');
assert.deepEqual(GROWTH_AXIS_IDS.length, 8, 'tám phương');
for (const id of GROWTH_AXIS_IDS)
  assert.equal(validWorkspace(ws(task('a', { axis: id }))), true, 'axis ' + id + ' hợp lệ');
for (const [label, bad] of [
  ['mã lạ', 'xyz'],
  ['rỗng', ''],
  ['viết hoa', 'TAI'],
  ['số', 3],
  ['null', null],
  ['mảng', ['tai']],
  ['đối tượng', { id: 'tai' }],
  ['tên hiển thị thay mã', 'Tài lộc'],
])
  assert.equal(validWorkspace(ws(task('a', { axis: bad }))), false, 'axis sai bị từ chối: ' + label);
assert.equal(
  validWorkspace(ws(task('a', { axis: 'gia', col: 'Done', doneAt: '2026-11-10' }))),
  true,
  'việc đã xong vẫn giữ axis',
);

// Mã ở máy chủ khớp AXES của giao diện.
const src = readFileSync(new URL('../dist/growth.js', import.meta.url), 'utf8');
const ui = [...src.slice(src.indexOf('const AXES = ['), src.indexOf('// Nghiệp quả: nguyên lý bao trùm')).matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
assert.deepEqual(ui, GROWTH_AXIS_IDS, 'mã và thứ tự phương ở máy chủ khớp dist/growth.js (ô p[i] trong sổ cái theo đúng thứ tự này)');
console.log('PASS: trường axis của việc (Gieo Nhân) được kiểm đúng, khớp tám phương của giao diện');
