// v1.66.0: sổ thu chi của dự án (Phân bổ tài nguyên) — máy chủ kiểm tra chặt dữ liệu và đồng bộ theo bản ghi dự án không làm mất khoản nào.
import assert from 'node:assert/strict';
import { validWorkspace } from '../server/api.mjs';
import { flatten, inflate } from '../dist/modules/delta.mjs';

const entry = (over = {}) => ({ id: 'e1', type: 'out', amount: 1500000, category: 'Thiết bị', note: 'Máy ảnh', date: '2026-11-11', ...over });
const base = (ledger) => ({
  schema: 1,
  notes: [],
  projects: [{ id: 'p1', name: 'Farm', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], tasks: [], ...(ledger === undefined ? {} : { ledger }) }],
});

assert.equal(validWorkspace(base()), true, 'dự án chưa có sổ vẫn hợp lệ (không đổi dữ liệu cũ)');
assert.equal(validWorkspace(base([])), true, 'sổ rỗng hợp lệ');
assert.equal(validWorkspace(base([entry(), entry({ id: 'e2', type: 'in', amount: 400000, category: 'Doanh thu', note: '' })])), true, 'khoản chi và khoản thu hợp lệ');

const bad = {
  'số tiền âm': entry({ amount: -5 }),
  'số tiền 0': entry({ amount: 0 }),
  'số tiền lẻ': entry({ amount: 1.5 }),
  'số tiền quá lớn': entry({ amount: 1e12 + 1 }),
  'số tiền là chuỗi': entry({ amount: '100' }),
  'loại sai': entry({ type: 'refund' }),
  'ngày không có thật': entry({ date: '2026-02-30' }),
  'ngày rỗng': entry({ date: '' }),
  'hạng mục quá dài': entry({ category: 'x'.repeat(41) }),
  'ghi chú quá dài': entry({ note: 'x'.repeat(201) }),
  'id sai': entry({ id: 'a b' }),
  'thiếu hạng mục': (({ category, ...rest }) => rest)(entry()),
};
for (const [name, e] of Object.entries(bad)) assert.equal(validWorkspace(base([e])), false, 'phải từ chối: ' + name);
assert.equal(validWorkspace(base([entry(), entry()])), false, 'id khoản trùng bị từ chối');
assert.equal(validWorkspace(base('abc')), false, 'sổ không phải mảng bị từ chối');
assert.equal(validWorkspace(base(Array.from({ length: 5001 }, (_, i) => entry({ id: 'e' + i })))), false, 'quá 5000 khoản bị từ chối');
assert.equal(validWorkspace(base(Array.from({ length: 5000 }, (_, i) => entry({ id: 'e' + i })))), true, 'đúng 5000 khoản vẫn nhận');

// Đồng bộ theo bản ghi: sổ nằm trong bản ghi dự án, đi qua flatten/inflate nguyên vẹn (không rơi, không đổi thứ tự).
const w = base([entry(), entry({ id: 'e2', type: 'in', amount: 400000, category: 'Doanh thu', note: '' })]);
const back = inflate(flatten(w));
assert.deepEqual(back.projects[0].ledger, w.projects[0].ledger, 'flatten/inflate giữ nguyên sổ thu chi');
console.log('PASS: sổ thu chi dự án — kiểm tra phía máy chủ chặt (số tiền, loại, ngày, độ dài, id trùng, giới hạn) và đồng bộ nguyên vẹn.');
