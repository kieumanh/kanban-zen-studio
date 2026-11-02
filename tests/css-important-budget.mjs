// Ngân sách nợ `!important` (từ v1.15.54): số khai báo `!important` trong dist/*.css (không tính chú thích) không được vượt ngân sách.
// Ngân sách chỉ được GIẢM theo từng đợt trả nợ; muốn thêm `!important` phải có lý do ghi trong ghi chú phát hành và nâng ngân sách có chủ đích.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BUDGET = 845;
const dist = path.join(import.meta.dirname, '..', 'dist');
let total = 0;
const perFile = {};
// dark.css và contrast.css do scripts/generate-themes.mjs sinh ra và sao chép `!important` của nguồn (để thắng đúng như bản sáng), nên không tính vào nợ.
const GENERATED = new Set(['dark.css', 'contrast.css']);
for (const file of fs.readdirSync(dist).filter((f) => f.endsWith('.css') && !GENERATED.has(f))) {
  const css = fs.readFileSync(path.join(dist, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const n = (css.match(/!important/g) || []).length;
  perFile[file] = n;
  total += n;
}
assert.ok(total <= BUDGET, `Số khai báo !important là ${total}, vượt ngân sách ${BUDGET}. Chi tiết: ${JSON.stringify(perFile)}`);
console.log(`PASS: ${total} khai báo !important (ngân sách ${BUDGET}).`);
