// v1.78.0: "Điểm tích lũy" — máy chủ kiểm tra chặt sổ điểm (data.growth), không làm đổi dữ liệu cũ,
// lưu được qua gói thay đổi (delta) và hai thiết bị cùng cộng điểm thì gộp theo id, không mất lần cộng nào.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { validWorkspace } from '../server/api.mjs';
import { validGrowth, GROWTH_AXIS_COUNT, GROWTH_LOG_MAX, GROWTH_SPEND_MAX } from '../server/growth.mjs';
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
assert.equal(validWorkspace(workspace(growth({ notify: false, tips: false }))), true, 'hai cờ thông báo (điểm nghiệp, gợi ý hằng tuần) hợp lệ');
assert.equal(validWorkspace(workspace(growth({ tips: true }))), true);
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
  'cờ gợi ý không phải boolean': growth({ tips: 1 }),
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


// 5. v1.81.0 — sổ quy đổi điểm (spend): dữ liệu cũ không có spend vẫn hợp lệ; máy chủ chặn dòng sai; lưu và gộp theo id.
const spend = (over = {}) => ({ id: 's1', d: '2026-11-12', n: 'Tai nghe mới', p: [0, 4, 0, 0, 0, 0, 0, 0], ...over });
assert.equal(GROWTH_SPEND_MAX, 500);
assert.equal(validWorkspace(workspace(growth({ spend: [] }))), true, 'sổ quy đổi rỗng hợp lệ');
assert.equal(validWorkspace(workspace(growth({ spend: [spend(), spend({ id: 's2', note: 'Mua ở cửa hàng gần nhà', p: [1, 0, 0, 0, 0, 0, 0, 3], x: true })] }))), true, 'có ghi chú và dòng đã hủy vẫn hợp lệ');
const badSpend = {
  'spend không phải mảng': growth({ spend: {} }),
  'spend là null': growth({ spend: null }),
  'quá nhiều lần quy đổi': growth({ spend: Array.from({ length: GROWTH_SPEND_MAX + 1 }, (_, i) => spend({ id: 'x' + i })) }),
  'dòng không phải đối tượng': growth({ spend: ['x'] }),
  'dòng có trường lạ': growth({ spend: [spend({ refund: 1 })] }),
  'id trùng': growth({ spend: [spend(), spend()] }),
  'id sai ký tự': growth({ spend: [spend({ id: 'a b' })] }),
  'id quá dài': growth({ spend: [spend({ id: 'a'.repeat(100) })] }),
  'ngày không có thật': growth({ spend: [spend({ d: '2026-02-30' })] }),
  'thiếu tên vật phẩm': growth({ spend: [(({ n, ...rest }) => rest)(spend())] }),
  'tên rỗng': growth({ spend: [spend({ n: '' })] }),
  'tên quá dài': growth({ spend: [spend({ n: 'n'.repeat(121) })] }),
  'tên không phải chuỗi': growth({ spend: [spend({ n: 5 })] }),
  'ghi chú quá dài': growth({ spend: [spend({ note: 'g'.repeat(301) })] }),
  'ghi chú không phải chuỗi': growth({ spend: [spend({ note: 1 })] }),
  'cờ hủy là false': growth({ spend: [spend({ x: false })] }),
  'cờ hủy là chuỗi': growth({ spend: [spend({ x: 'có' })] }),
  'thiếu mảng điểm': growth({ spend: [(({ p, ...rest }) => rest)(spend())] }),
  'mảng điểm thiếu chỉ số': growth({ spend: [spend({ p: [1, 0, 0] })] }),
  'điểm âm': growth({ spend: [spend({ p: [-1, 0, 0, 0, 0, 0, 0, 1] })] }),
  'điểm lẻ': growth({ spend: [spend({ p: [0.5, 0, 0, 0, 0, 0, 0, 0] })] }),
  'điểm quá lớn': growth({ spend: [spend({ p: [1000001, 0, 0, 0, 0, 0, 0, 0] })] }),
  'dòng toàn số 0': growth({ spend: [spend({ p: [0, 0, 0, 0, 0, 0, 0, 0] })] }),
};
for (const [name, g] of Object.entries(badSpend)) {
  assert.equal(validGrowth(g), false, 'validGrowth phải từ chối quy đổi: ' + name);
  assert.equal(validWorkspace(workspace(g)), false, 'validWorkspace phải từ chối quy đổi: ' + name);
}
assert.equal(validGrowth(growth({ spend: Array.from({ length: GROWTH_SPEND_MAX }, (_, i) => spend({ id: 'x' + i })) })), true, 'đúng giới hạn sổ quy đổi vẫn hợp lệ');
// Máy chủ không so số dư: hai thiết bị cùng quy đổi lúc chưa đồng bộ vẫn phải lưu được (giao diện chặn vượt số dư và hiển thị không âm).
assert.equal(validGrowth(growth({ log: [entry({ p: [0, 1, 0, 0, 0, 0, 0, 0] })], spend: [spend({ p: [0, 9, 0, 0, 0, 0, 0, 0] })] })), true, 'không so số dư ở máy chủ');

// Lưu qua gói thay đổi: spend nằm trong mục gốc cùng growth, đọc lại đúng từng dòng; thêm một lần quy đổi chỉ đổi một mục gốc.
const withSpend = workspace(growth({ spend: [spend(), spend({ id: 's2', n: 'Bữa tối', p: [0, 0, 2, 0, 0, 0, 0, 0], note: 'Thưởng tuần', x: true })] }));
assert.deepEqual(Object.keys(flatten(withSpend)).filter((k) => !k.startsWith('project:') && !k.startsWith('note:')), ['root:root'], 'spend đi cùng mục gốc, không sinh loại mục mới');
assert.deepEqual(inflate(flatten(withSpend)).growth, withSpend.growth, 'đọc lại đúng từng dòng quy đổi');
const spendChange = changesBetween(workspace(growth({ spend: [] })), withSpend);
assert.equal(spendChange.length, 1);
assert.equal(spendChange[0].key, 'root:root');

// Hai thiết bị: quy đổi khác nhau giữ đủ cả hai; một bên hủy, một bên sửa ghi chú cùng dòng thì gộp được; cùng sửa một trường khác nhau thì báo xung đột (không ghi đè lặng lẽ).
const baseS = workspace(growth({ spend: [spend()] }));
const devA = structuredClone(baseS);
devA.growth.spend.push(spend({ id: 'from-a', n: 'Sách', p: [0, 0, 0, 0, 0, 2, 0, 0] }));
const devB = structuredClone(baseS);
devB.growth.spend.push(spend({ id: 'from-b', n: 'Cà phê', p: [0, 0, 0, 0, 0, 0, 0, 1] }));
const mergedS = merge(baseS, devA, devB);
assert.deepEqual(mergedS.growth.spend.map((e) => e.id).sort(), ['from-a', 'from-b', 's1'], 'cả hai lần quy đổi đều còn');
assert.equal(validWorkspace(mergedS), true, 'bản gộp quy đổi vẫn hợp lệ');
const voidA = structuredClone(baseS);
voidA.growth.spend[0].x = true;
const noteB = structuredClone(baseS);
noteB.growth.spend[0].note = 'Đã sửa ghi chú';
const mergedV = merge(baseS, voidA, noteB).growth.spend[0];
assert.equal(mergedV.x, true, 'lần hủy được giữ');
assert.equal(mergedV.note, 'Đã sửa ghi chú', 'lần sửa ghi chú được giữ');
const renameA = structuredClone(baseS);
renameA.growth.spend[0].n = 'Tên A';
const renameB = structuredClone(baseS);
renameB.growth.spend[0].n = 'Tên B';
assert.throws(() => merge(baseS, renameA, renameB), /Chỉnh sửa cùng nội dung/, 'cùng sửa một trường khác nhau thì báo xung đột');
assert.deepEqual(merge(baseS, devA, structuredClone(devA)).growth.spend, devA.growth.spend, 'cùng một lần quy đổi ở hai nơi chỉ giữ một dòng');
// Đổi nhân vật/tên không làm mất sổ quy đổi: giao diện giữ nguyên spend khi lưu lại growth (kiểm ở tests/growth-spend-browser.mjs).

console.log('growth ok');
