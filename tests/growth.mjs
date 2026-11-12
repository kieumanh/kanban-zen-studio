// v1.78.0: "Điểm tích lũy" — máy chủ kiểm tra chặt sổ điểm (data.growth), không làm đổi dữ liệu cũ,
// lưu được qua gói thay đổi (delta) và hai thiết bị cùng cộng điểm thì gộp theo id, không mất lần cộng nào.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { validWorkspace } from '../server/api.mjs';
import { validGrowth, GROWTH_AXIS_COUNT, GROWTH_LOG_MAX } from '../server/growth.mjs';
import { flatten, inflate, changesBetween } from '../dist/modules/delta.mjs';

assert.equal(GROWTH_AXIS_COUNT, 8, 'đúng 8 chỉ số');

const entry = (over = {}) => ({ id: 'g1', d: '2026-11-12', s: 'task', k: 'task:t1', n: 'Gửi báo cáo', p: [1, 0, 0, 0, 0, 0, 1, 0], ...over });
const growth = (over = {}) => ({ v: 1, hero: 'nam', since: '2026-11-12', log: [entry()], ...over });
const workspace = (g) => ({
  schema: 1,
  notes: [],
  projects: [{ id: 'p1', name: 'Farm', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], tasks: [] }],
  ...(g === undefined ? {} : { growth: g }),
});

// 1. Dữ liệu cũ không có growth vẫn hợp lệ; sổ rỗng và nhân vật nữ hợp lệ; tên và cờ thông báo tùy chọn.
assert.equal(validGrowth(undefined), true);
assert.equal(validWorkspace(workspace()), true, 'không có growth → không đổi dữ liệu cũ');
assert.equal(validWorkspace(workspace(growth({ log: [] }))), true, 'sổ rỗng hợp lệ');
assert.equal(validWorkspace(workspace(growth({ hero: 'nu', name: 'Tiểu Liên', notify: true }))), true);
assert.equal(validWorkspace(workspace(growth({ log: [entry(), entry({ id: 'g2', s: 'habit', k: 'habit:2026-11-09', n: undefined, p: [0, 0, 6, 0, 0, 0, 0, 0] }), entry({ id: 'a1', s: 'archive', k: undefined })] }))), true, 'ba nguồn điểm hợp lệ');

// 2. Từ chối dữ liệu sai — mỗi trường hợp phải bị chặn.
const bad = {
  'không phải đối tượng': [],
  'null': null,
  'chuỗi': 'x',
  'thiếu phiên bản': (({ v, ...rest }) => rest)(growth()),
  'phiên bản lạ': growth({ v: 2 }),
  'nhân vật lạ': growth({ hero: 'khac' }),
  'thiếu nhân vật': (({ hero, ...rest }) => rest)(growth()),
  'ngày bắt đầu không có thật': growth({ since: '2026-02-30' }),
  'tên quá dài': growth({ name: 'x'.repeat(31) }),
  'tên không phải chuỗi': growth({ name: 7 }),
  'cờ thông báo không phải boolean': growth({ notify: 'có' }),
  'trường lạ': growth({ gold: 999 }),
  'sổ không phải mảng': growth({ log: {} }),
  'sổ quá dài': growth({ log: Array.from({ length: GROWTH_LOG_MAX + 1 }, (_, i) => entry({ id: 'x' + i })) }),
  'dòng không phải đối tượng': growth({ log: ['x'] }),
  'dòng có trường lạ': growth({ log: [entry({ bonus: 5 })] }),
  'id trùng': growth({ log: [entry(), entry()] }),
  'id sai ký tự': growth({ log: [entry({ id: 'a b' })] }),
  'id quá dài': growth({ log: [entry({ id: 'a'.repeat(100) })] }),
  'ngày không có thật': growth({ log: [entry({ d: '2026-13-01' })] }),
  'nguồn lạ': growth({ log: [entry({ s: 'cheat' })] }),
  'khóa quá dài': growth({ log: [entry({ k: 'k'.repeat(121) })] }),
  'tên việc quá dài': growth({ log: [entry({ n: 'n'.repeat(121) })] }),
  'thiếu mảng điểm': growth({ log: [(({ p, ...rest }) => rest)(entry())] }),
  'mảng điểm thiếu chỉ số': growth({ log: [entry({ p: [1, 0, 0, 0, 0, 0, 0] })] }),
  'mảng điểm thừa chỉ số': growth({ log: [entry({ p: [1, 0, 0, 0, 0, 0, 0, 0, 0] })] }),
  'điểm âm': growth({ log: [entry({ p: [-1, 0, 0, 0, 0, 0, 0, 1] })] }),
  'điểm lẻ': growth({ log: [entry({ p: [0.5, 0, 0, 0, 0, 0, 0, 0] })] }),
  'điểm là chuỗi': growth({ log: [entry({ p: ['1', 0, 0, 0, 0, 0, 0, 0] })] }),
  'điểm quá lớn': growth({ log: [entry({ p: [1000001, 0, 0, 0, 0, 0, 0, 0] })] }),
  'dòng toàn số 0': growth({ log: [entry({ p: [0, 0, 0, 0, 0, 0, 0, 0] })] }),
  'điểm không phải số hữu hạn': growth({ log: [entry({ p: [Infinity, 0, 0, 0, 0, 0, 0, 0] })] }),
};
for (const [name, g] of Object.entries(bad)) {
  assert.equal(validGrowth(g), false, 'validGrowth phải từ chối: ' + name);
  assert.equal(validWorkspace(workspace(g)), false, 'validWorkspace phải từ chối: ' + name);
}
assert.equal(validGrowth(growth({ log: Array.from({ length: GROWTH_LOG_MAX }, (_, i) => entry({ id: 'x' + i })) })), true, 'đúng giới hạn sổ vẫn hợp lệ');

// 3. Lưu qua gói thay đổi: growth nằm trong mục gốc, không cần bảng mới; đọc ra giống hệt.
const full = workspace(growth({ name: 'Tiểu Liên', hero: 'nu', log: [entry(), entry({ id: 'g2', p: [0, 0, 0, 0, 0, 1, 1, 0] })] }));
const entries = flatten(full);
assert.deepEqual(
  Object.keys(entries).filter((k) => !k.startsWith('project:') && !k.startsWith('note:')),
  ['root:root'],
  'growth đi cùng mục gốc, không sinh loại mục mới',
);
assert.deepEqual(inflate(entries).growth, full.growth, 'đọc lại đúng từng dòng của sổ');
const noGrowth = workspace();
assert.ok(!('growth' in inflate(flatten(noGrowth))), 'dữ liệu cũ không tự sinh growth');
const change = changesBetween(noGrowth, full);
assert.equal(change.length, 1, 'chọn nhân vật chỉ thay đổi một mục gốc');
assert.equal(change[0].key, 'root:root');

// 4. Hai thiết bị cùng cộng điểm: ghép ba bên theo id, giữ đủ cả hai lần cộng; trùng id thì không nhân đôi.
const source = readFileSync(new URL('../dist/release200.js', import.meta.url), 'utf8');
const ctx = vm.createContext({ structuredClone });
vm.runInContext(source.slice(0, source.indexOf('async function rebaseWorkspace')), ctx);
const merge = (b, l, r) => JSON.parse(JSON.stringify(ctx.mergeWorkspaceValue(b, l, r)));
const base = workspace(growth({ log: [entry()] }));
const a = structuredClone(base);
a.growth.log.push(entry({ id: 'from-a', k: 'task:ta', p: [0, 1, 0, 0, 0, 0, 0, 1] }));
const b = structuredClone(base);
b.growth.log.push(entry({ id: 'from-b', k: 'task:tb', p: [0, 0, 1, 1, 0, 0, 0, 0] }));
const merged = merge(base, a, b);
assert.deepEqual(merged.growth.log.map((e) => e.id).sort(), ['from-a', 'from-b', 'g1'], 'cả hai lần cộng đều còn');
assert.equal(validWorkspace(merged), true, 'bản gộp vẫn hợp lệ');
const sum = merged.growth.log.reduce((t, e) => t + e.p.reduce((x, y) => x + y, 0), 0);
assert.equal(sum, 2 + 2 + 2, 'tổng nửa điểm = 2 + 2 + 2, không mất không nhân đôi');
assert.deepEqual(merge(base, a, structuredClone(a)).growth.log, a.growth.log, 'cùng một lần cộng ở hai nơi chỉ giữ một dòng');

console.log('growth ok');
