// v2.0.0 (Truyền Âm): phong cách theo tài khoản trong dữ liệu (data.style) và giọng email theo phong cách.
import assert from 'node:assert/strict';
import { validWorkspace } from '../server/api.mjs';
import { reminderReport, weeklyReport, voiceOf } from '../server/reports.mjs';
import { makeProject } from './lib/browser-harness.mjs';

const day = '2026-10-25';
const base = () => {
  const p = makeProject('p1', 'Dự án <A>', '#7950c8', 3);
  [['late', 'Doing', '2026-10-24'], ['today', 'List', day], ['soon', 'Idea', '2026-10-27']].forEach(([title, col, due], i) => Object.assign(p.tasks[i], { title, col, due, start: '', end: undefined }));
  return { schema: 1, notes: [], projects: [p] };
};

// 1. Kiểm giá trị: không có (người dùng chưa chọn) hoặc một trong ba giá trị.
for (const style of [undefined, 'zen', 'giangho', 'giangho-nhe']) assert.equal(validWorkspace({ ...base(), ...(style ? { style } : {}) }), true, 'nhận style ' + style);
for (const style of ['', 'Giangho', 'dark', 1, null, ['giangho']]) assert.equal(validWorkspace({ ...base(), style }), false, 'từ chối style ' + JSON.stringify(style));

// 2. Giọng email: chưa chọn / Thiền / Giang hồ nhẹ giữ nguyên giọng thường, từng ký tự.
const plain = reminderReport(base(), day);
for (const style of ['zen', 'giangho-nhe']) {
  const r = reminderReport({ ...base(), style }, day);
  assert.deepEqual([r.subject, r.text, r.html], [plain.subject, plain.text, plain.html], 'giọng thường cho ' + style);
}
assert.equal(plain.subject, 'Nhắc hạn công việc · ' + day);
assert.match(plain.text, /^Bạn có 1 việc quá hạn và 2 việc đến hạn/);
assert.equal(voiceOf(base()).brand, 'KANBAN ZEN STUDIO');

// 3. Giang hồ: chữ khung đổi, nội dung người dùng giữ nguyên và vẫn được thoát ký tự.
const gh = reminderReport({ ...base(), style: 'giangho' }, day);
assert.equal(gh.subject, 'Truyền thư kỳ hạn · ' + day);
assert.match(gh.text, /^Các hạ có 1 nhiệm vụ lỡ hẹn và 2 nhiệm vụ tới kỳ hôm nay hoặc trong 3 ngày tới\./);
assert.match(gh.text, /• LỠ HẸN · late\n  Dự án <A> · Kỳ hạn 2026-10-24/);
assert.match(gh.text, /• HÔM NAY · today/);
assert.match(gh.text, /• SẮP TỚI KỲ · soon/);
for (const s of ['<title>Truyền thư kỳ hạn</title>', 'KANBAN ZEN STUDIO · GIANG HỒ', 'Một nhịp soát lại nhiệm vụ', 'Các hạ có <strong>1 nhiệm vụ lỡ hẹn</strong>', 'Lỡ hẹn · 1', 'Sắp tới kỳ · 1', 'Kỳ hạn 24/10/2026', 'Cơ quan → Thông báo', 'Dự án &lt;A&gt;'])
  assert.ok(gh.html.includes(s), 'email giang hồ có: ' + s);
assert.ok(!/Bạn có|quá hạn|Cài đặt →/.test(gh.html), 'email giang hồ không còn giọng thường ở khung');

// 4. Chiến báo tuần: tiêu đề và dòng đầu theo giọng; phần còn lại như cũ.
const wz = weeklyReport(base(), day),
  wg = weeklyReport({ ...base(), style: 'giangho' }, day);
assert.equal(wz.subject, 'Tổng kết tuần · Bức tranh công việc · ' + day);
assert.equal(wg.subject, 'Chiến báo tuần · Bức tranh đại sự · ' + day);
assert.match(wg.text, /^CHIẾN BÁO ĐẠI SỰ · /);
assert.ok(wg.html.includes('ZEN STUDIO · CHIẾN BÁO MỖI TUẦN') && wg.html.includes('>Chiến báo đại sự</h1>'));
assert.ok(wz.html.includes('ZEN STUDIO · NHÌN LẠI MỖI TUẦN') && wz.html.includes('>Bức tranh công việc</h1>'));
assert.equal(weeklyReport({ ...base(), style: 'giangho-nhe' }, day).subject, wz.subject);
console.log('PASS: data.style hợp lệ / bị từ chối; email nhắc hạn và chiến báo tuần theo giọng, giọng thường giữ nguyên từng ký tự.');
