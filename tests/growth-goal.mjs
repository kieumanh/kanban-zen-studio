// v2.69.0 (Tâm Nguyện): trường tùy chọn `goal` của Điểm tích lũy (mức chú trọng 1–5 của tám phương) đi qua bộ kiểm dữ liệu.
//  - Vắng mặt hợp lệ (dữ liệu cũ nguyên vẹn); mảng đúng 8 số nguyên 1–5 hợp lệ; sai độ dài, ngoài 1–5, số lẻ, sai kiểu thì bị từ chối.
//  - Bộ kiểm phía trình duyệt (dist/lazy.js) phải nhận cùng quy tắc, nếu không việc lưu tâm nguyện sẽ bị chặn.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validGrowth } from '../server/growth.mjs';

const g = (extra = {}) => ({ v: 1, hero: 'nam', since: '2026-11-01', log: [], ...extra });
assert.equal(validGrowth(g()), true, 'không có goal hợp lệ (dữ liệu cũ)');
assert.equal(validGrowth(g({ goal: [3, 3, 3, 3, 3, 3, 3, 3] })), true, 'cân bằng hợp lệ');
assert.equal(validGrowth(g({ goal: [1, 2, 3, 4, 5, 1, 2, 3] })), true, 'đủ các mức hợp lệ');
for (const [label, bad] of [
  ['bảy phần tử', [3, 3, 3, 3, 3, 3, 3]],
  ['chín phần tử', [3, 3, 3, 3, 3, 3, 3, 3, 3]],
  ['mảng rỗng', []],
  ['có số 0', [0, 3, 3, 3, 3, 3, 3, 3]],
  ['có số 6', [6, 3, 3, 3, 3, 3, 3, 3]],
  ['số âm', [-1, 3, 3, 3, 3, 3, 3, 3]],
  ['số lẻ', [2.5, 3, 3, 3, 3, 3, 3, 3]],
  ['chuỗi', ['3', 3, 3, 3, 3, 3, 3, 3]],
  ['null trong mảng', [null, 3, 3, 3, 3, 3, 3, 3]],
  ['đối tượng', { 0: 3 }],
  ['chuỗi thường', '33333333'],
  ['null', null],
  ['số', 3],
])
  assert.equal(validGrowth(g({ goal: bad })), false, 'goal sai bị từ chối: ' + label);

const lazy = readFileSync(new URL('../dist/lazy.js', import.meta.url), 'utf8');
const keys = (lazy.match(/\['v', 'hero', 'name', 'since', 'log'[^\]]*\]/) || [''])[0];
assert.ok(keys.includes("'goal'"), 'dist/lazy.js nhận khóa goal');
assert.match(lazy, /g\.goal !== undefined && !\(Array\.isArray\(g\.goal\) && g\.goal\.length === 8 && g\.goal\.every\(\(x\) => Number\.isInteger\(x\) && x >= 1 && x <= 5\)\)/, 'dist/lazy.js kiểm goal cùng quy tắc với máy chủ');
console.log('PASS: goal (Tâm nguyện) của Điểm tích lũy được kiểm đúng ở máy chủ và ở trình duyệt');
