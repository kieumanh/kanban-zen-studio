// v2.53.0 (Nhắc Việc Chờ): thư nhắc hằng ngày và thông báo đẩy cũng nhắc việc đang chờ người khác khi đã tới ngày hẹn hỏi lại.
//  1. waitingTasks: chỉ việc chưa xong, có tên người, có ngày hẹn hợp lệ đã tới hoặc qua; bỏ việc xong, việc lưu trữ, dự án lưu trữ, tên trống, ngày hẹn tương lai hoặc không có; xếp theo ngày hẹn.
//  2. Không có việc chờ tới hẹn: thư (văn bản, HTML, tiêu đề) và thông báo đẩy GIỐNG HỆT bản trước (kể cả giọng Giang hồ).
//  3. Chỉ có việc chờ tới hẹn: vẫn có thư và thông báo đẩy (trước đây là null), đúng giọng Thiền / Giang hồ, một việc / hai việc / nhiều việc.
//  4. Vừa có việc quá hạn vừa có việc chờ: thông báo đẩy giữ phần cũ và thêm “· N việc cần hỏi lại”; thư có thêm khối “Đến lúc hỏi lại”.
//  5. Chữ lạ (HTML) trong tên người, tên việc, tên dự án được thoát ký tự trong thư; tên người dài được rút gọn trong thông báo đẩy; tối đa 40 việc chờ trong thư.
import assert from 'node:assert/strict';
import { reminderPush, reminderReport, waitingTasks, shiftDay } from '../server/reports.mjs';

const day = '2026-11-18';
const task = (id, title, col, extra = {}) => ({ id, title, col, due: '', tag: '', checks: [], ...extra });
const ws = (tasks, style, projectExtra = {}, more = []) => ({
  schema: 1,
  notes: [],
  ...(style ? { style } : {}),
  projects: [{ id: 'p1', name: 'Dự án <A>', columns: ['Idea', 'List', 'Doing', 'Done'], tasks, ...projectExtra }, ...more],
});

// 1. waitingTasks.
const mixed = ws([
  task('a', 'Quá hẹn lâu', 'Doing', { waitFor: 'anh Sơn', waitUntil: shiftDay(day, -5) }),
  task('b', 'Đúng hẹn hôm nay', 'List', { waitFor: 'chị Lan', waitUntil: day }),
  task('c', 'Hẹn ngày mai', 'List', { waitFor: 'bên nhà in', waitUntil: shiftDay(day, 1) }),
  task('d', 'Không hẹn ngày', 'List', { waitFor: 'ai đó' }),
  task('e', 'Đã xong', 'Done', { waitFor: 'ai đó', waitUntil: shiftDay(day, -1) }),
  task('f', 'Tên trống', 'List', { waitFor: '   ', waitUntil: shiftDay(day, -1) }),
  task('g', 'Ngày sai', 'List', { waitFor: 'x', waitUntil: 'mai' }),
  task('h', 'Việc lưu trữ', 'List', { waitFor: 'x', waitUntil: shiftDay(day, -1), archived: true }),
  task('i', 'Quá hẹn nhẹ', 'List', { waitFor: 'anh Tú', waitUntil: shiftDay(day, -1) }),
  task('j', 'Không chờ ai', 'List', { waitUntil: shiftDay(day, -3) }),
]);
assert.deepEqual(waitingTasks(mixed, day).map((t) => t.id), ['a', 'i', 'b'], 'đúng việc, xếp theo ngày hẹn');
const archivedProject = ws([task('z', 'Trong dự án lưu trữ', 'List', { waitFor: 'x', waitUntil: shiftDay(day, -1) })], null, { archived: true });
assert.deepEqual(waitingTasks(archivedProject, day), [], 'dự án lưu trữ không nhắc');
assert.deepEqual(waitingTasks({ schema: 1, notes: [], projects: [] }, day), []);

// 2. Không có việc chờ tới hẹn: giống hệt bản trước.
const plain = (style) =>
  ws(
    [
      task('t1', 'Gọi anh Sơn', 'Doing', { due: '2026-11-16' }),
      task('t2', 'Giao đơn hàng', 'List', { due: day }),
      task('t3', 'Chuẩn bị hợp đồng', 'Idea', { due: '2026-11-20' }),
      task('t4', 'Việc xong', 'Done', { due: '2026-11-10' }),
      // Việc chờ nhưng chưa tới hẹn hoặc không có hẹn: không đổi gì.
      task('t5', 'Chờ báo giá', 'List', { waitFor: 'nhà cung cấp', waitUntil: shiftDay(day, 4) }),
      task('t6', 'Chờ hồi âm', 'List', { waitFor: 'chị Hoa' }),
    ],
    style,
  );
const OLD_TEXT = 'Bạn có 1 việc quá hạn và 2 việc đến hạn hôm nay hoặc trong 3 ngày tới.\n\n• QUÁ HẠN · Gọi anh Sơn\n  Dự án <A> · Hạn 2026-11-16\n• HÔM NAY · Giao đơn hàng\n  Dự án <A> · Hạn 2026-11-18\n• SẮP HẠN · Chuẩn bị hợp đồng\n  Dự án <A> · Hạn 2026-11-20';
const zenReport = reminderReport(plain(), day);
assert.equal(zenReport.text, OLD_TEXT, 'văn bản thư không đổi khi không có việc chờ tới hẹn');
assert.equal(zenReport.subject, 'Nhắc hạn công việc · 2026-11-18');
assert.ok(!zenReport.html.includes('Đến lúc hỏi lại'), 'HTML không có khối mới');
assert.ok(zenReport.html.includes('Bạn có <strong>1 việc quá hạn</strong> và <strong>2 việc đến hạn hôm nay hoặc trong 3 ngày tới</strong>.'));
assert.equal(reminderPush(plain(), day).body, '“Gọi anh Sơn” và “Giao đơn hàng” cùng 1 việc khác. 1 quá hạn · 1 hôm nay · 1 sắp hạn', 'thông báo đẩy không đổi');
assert.equal(reminderPush(plain('giangho'), day).title, 'Truyền thư · 3 nhiệm vụ cần chú ý');
assert.ok(!reminderReport(plain('giangho'), day).text.includes('hồi âm'));
assert.equal(reminderPush(ws([task('x', 'Chờ', 'List', { waitFor: 'ai', waitUntil: shiftDay(day, 2) })]), day), null, 'chỉ có việc chờ chưa tới hẹn → vẫn null');
assert.equal(reminderReport(ws([task('x', 'Chờ', 'List', { waitFor: 'ai' })]), day), null);

// 3. Chỉ có việc chờ tới hẹn.
const one = ws([task('a', 'Nhận báo giá', 'List', { waitFor: 'anh Sơn', waitUntil: shiftDay(day, -2) })]);
const p1 = reminderPush(one, day);
assert.deepEqual(p1, { count: 1, title: 'Đến lúc hỏi lại · 1 việc', body: '“Nhận báo giá” đang chờ anh Sơn, đã đến lúc hỏi lại.' });
const g1 = reminderPush({ ...one, style: 'giangho' }, day);
assert.deepEqual(g1, { count: 1, title: 'Truyền thư · 1 nhiệm vụ đến lúc hỏi hồi âm', body: '“Nhận báo giá” đang đợi anh Sơn, đã đến lúc hỏi hồi âm.' });
assert.deepEqual(reminderPush({ ...one, style: 'giangho-nhe' }, day), p1, 'Giang hồ nhẹ giữ giọng thường');
const two = ws([task('a', 'Một', 'List', { waitFor: 'A', waitUntil: day }), task('b', 'Hai', 'List', { waitFor: 'B', waitUntil: day })]);
assert.equal(reminderPush(two, day).body, '“Hai” và “Một”. 2 việc đang chờ người khác, đã đến lúc hỏi lại.', 'cùng ngày hẹn thì xếp theo tên việc');
const many = ws(Array.from({ length: 5 }, (_, i) => task('w' + i, 'Việc ' + i, 'List', { waitFor: 'N' + i, waitUntil: shiftDay(day, -i) })));
const pm = reminderPush(many, day);
assert.equal(pm.count, 5);
assert.equal(pm.body, '“Việc 4” và “Việc 3” cùng 3 việc khác. 5 việc đang chờ người khác, đã đến lúc hỏi lại.', 'xếp theo ngày hẹn cũ nhất trước');
const onlyReport = reminderReport(one, day);
assert.ok(onlyReport, 'có thư dù không có việc quá hạn');
assert.equal(onlyReport.text, 'Bạn có 1 việc đang chờ người khác đã đến ngày hẹn hỏi lại.\n\n• HỎI LẠI · Nhận báo giá\n  Dự án <A> · Chờ anh Sơn · Hẹn hỏi lại 2026-11-16');
assert.ok(onlyReport.html.includes('Đến lúc hỏi lại · 1'), 'HTML có khối hỏi lại');
assert.ok(onlyReport.html.includes('Bạn có <strong>1 việc đang chờ người khác</strong>'), 'câu mở đầu nói về việc chờ, không phải “0 việc quá hạn”');
assert.ok(!onlyReport.html.includes('0 việc quá hạn'));
assert.equal(onlyReport.subject, 'Nhắc hạn công việc · 2026-11-18');
const ghReport = reminderReport({ ...one, style: 'giangho' }, day);
assert.equal(ghReport.text, 'Các hạ có 1 nhiệm vụ đang đợi hồi âm đã tới ngày hẹn hỏi lại.\n\n• HỎI HỒI ÂM · Nhận báo giá\n  Dự án <A> · Đợi anh Sơn · Hẹn hỏi lại 2026-11-16');
assert.ok(ghReport.html.includes('Đến lúc hỏi hồi âm · 1'));

// 4. Vừa quá hạn vừa chờ.
const both = ws([
  task('t1', 'Gọi anh Sơn', 'Doing', { due: shiftDay(day, -1) }),
  task('w1', 'Nhận báo giá', 'List', { waitFor: 'chị Lan', waitUntil: day }),
  task('w2', 'Nhận hợp đồng', 'List', { waitFor: 'bên A', waitUntil: shiftDay(day, -1) }),
]);
const pb = reminderPush(both, day);
assert.equal(pb.count, 1, 'số việc nhắc hạn giữ nguyên nghĩa (không gộp việc chờ)');
assert.equal(pb.title, 'Nhắc việc · 1 việc cần chú ý');
assert.equal(pb.body, '“Gọi anh Sơn” đã quá hạn. · 2 việc cần hỏi lại');
const gb = reminderPush({ ...both, style: 'giangho' }, day);
assert.equal(gb.body, '“Gọi anh Sơn” đã lỡ hẹn. · 2 nhiệm vụ cần hỏi hồi âm');
const rb = reminderReport(both, day);
assert.ok(rb.text.startsWith('Bạn có 1 việc quá hạn và 0 việc đến hạn hôm nay hoặc trong 3 ngày tới.'), 'phần nhắc hạn giữ nguyên');
assert.ok(rb.text.includes('\n\nBạn có 2 việc đang chờ người khác đã đến ngày hẹn hỏi lại.\n\n• HỎI LẠI · Nhận hợp đồng\n  Dự án <A> · Chờ bên A · Hẹn hỏi lại 2026-11-17\n• HỎI LẠI · Nhận báo giá'), 'khối hỏi lại nối sau, hẹn cũ trước');
assert.ok(rb.html.includes('Quá hạn · 1') && rb.html.includes('Đến lúc hỏi lại · 2'), 'HTML có cả hai khối');

// 5. Chữ lạ, tên dài, giới hạn.
const evil = ws([task('a', '<img src=x onerror=alert(1)>', 'List', { waitFor: '<b>anh</b> & "Sơn"', waitUntil: day })], null, { name: '<script>x</script>' });
const re = reminderReport(evil, day);
assert.ok(!re.html.includes('<img') && !re.html.includes('<script>') && !re.html.includes('<b>anh'), 'HTML thư không chứa thẻ lạ');
assert.ok(re.html.includes('&lt;b&gt;anh&lt;/b&gt;') || re.html.includes('&lt;b&gt;'), 'đã thoát ký tự tên người');
const longWho = reminderPush(ws([task('a', 'Việc', 'List', { waitFor: 'Nguyễn Văn ' + 'A'.repeat(100), waitUntil: day })]), day);
assert.ok(longWho.body.includes('…,') && longWho.body.length < 120, 'tên người dài được rút gọn: ' + longWho.body);
const lines = ws(Array.from({ length: 50 }, (_, i) => task('w' + i, 'Chờ ' + i, 'List', { waitFor: 'N', waitUntil: shiftDay(day, -(i % 5)) })));
const rl = reminderReport(lines, day);
assert.equal((rl.text.match(/• HỎI LẠI/g) || []).length, 40, 'thư liệt kê tối đa 40 việc chờ');
assert.ok(rl.text.includes('Còn 10 việc khác trong ứng dụng.'));
assert.equal(reminderPush(lines, day).count, 50);
console.log('PASS: nhắc việc chờ người khác trong thư và thông báo đẩy (không đổi khi không có việc chờ tới hẹn, đúng giọng, thoát ký tự, giới hạn)');
