// v2.3.0 (Chiến Báo): thân chiến báo tuần giọng giang hồ khi tài khoản chọn Giang hồ (data.style = 'giangho').
//  1. Văn bản và HTML: chữ khung đổi giọng, cấu trúc HTML (lớp từng loại dòng) giống giọng thường, tên việc / dự án giữ nguyên.
//  2. Dòng ngày dưới tiêu đề không lặp lại chữ "CHIẾN BÁO ĐẠI SỰ" (lỗi nhỏ của v2.0.0).
//  3. API: bản xem trước trong ứng dụng theo giọng tài khoản; link chia sẻ công khai luôn giọng thường (người ngoài xem).
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { api } from '../server/api.mjs';
import { weeklyReport, reportDate } from '../server/reports.mjs';
import { makeProject } from './lib/browser-harness.mjs';

const day = '2026-10-25';
const workspace = (style) => {
  const p = makeProject('p1', 'Alpha <x>', '#7950c8', 12);
  p.tasks.forEach((t, i) => {
    t.col = ['Idea', 'List', 'Doing', 'Done'][i % 4];
    t.due = ['2026-10-20', '2026-10-25', '2026-10-27', '2026-11-02'][i % 4];
  });
  const done = makeProject('p2', 'Xong hết', '#2e7d5b', 2);
  done.tasks.forEach((t) => (t.col = 'Done'));
  return { schema: 1, notes: [], projects: [p, makeProject('p3', 'Trống', '#2e7d5b', 0), done], ...(style ? { style } : {}) };
};
const classes = (html) => [...html.matchAll(/class="(report-[a-z-]+)"/g)].map((m) => m[1]).join(',');
const prev = weeklyReport(workspace(), '2026-10-18').snapshot;

// 1. Giọng giang hồ.
for (const previous of [null, prev]) {
  const z = weeklyReport(workspace(), day, previous),
    g = weeklyReport(workspace('giangho'), day, previous);
  assert.equal(classes(g.html), classes(z.html), 'cấu trúc HTML như giọng thường' + (previous ? ' (có bản trước)' : ''));
  assert.equal(g.text.split('\n').length, z.text.split('\n').length, 'cùng số dòng');
  const frame = g.text.replace(/Việc số \d+|Bước (một|hai)|Alpha <x>|Xong hết|Trống/g, '');
  assert.doesNotMatch(frame, /công việc|dự án|Quá hạn|quá hạn|Hoàn thành|hoàn thành|Ưu tiên|checklist|Đề xuất|Gợi ý|NHỊP LÀM VIỆC|\bbạn\b|tiến độ/, 'văn bản không còn chữ khung giọng thường');
  for (const s of ['3 đại sự đang vận hành · 14 nhiệm vụ', 'Công thành: 5 · Đang hành sự: 3 · Chưa xuất chiêu: 3 · Lỡ hẹn: 3', '3/12 nhiệm vụ công thành · 3 lỡ hẹn · 6 tới kỳ trong 7 ngày tới.', 'Tiên quyết: truy nguyên nhân lỡ hẹn', 'Kế sách tuần tới:', '• Việc số 1 · kỳ hạn 2026-10-20', 'Chiêu kế tiếp: Bước hai', 'Kế sách: khởi một nhiệm vụ nhỏ', 'Kế sách: soát lại thành quả', 'NHỊP HÀNH SỰ TUẦN TỚI · 2026-10-26 → 2026-11-01', 'Kế sách được bày theo trạng thái, kỳ hạn và mức cấp bách các hạ đã ghi.'])
    assert.ok(g.text.includes(s), 'văn bản có: ' + s);
  if (previous) assert.ok(g.text.includes('So với chiến báo trước: thêm 0 nhiệm vụ công thành; tiến cảnh +0 điểm phần trăm.'));
  for (const s of ['Tiến cảnh tổng thể', '3 đại sự<br>14 nhiệm vụ', 'Phân bố nhiệm vụ', '<strong>Công thành</strong>', '<strong>Lỡ hẹn</strong>', 'Tiến cảnh đại sự', 'Alpha &lt;x&gt;', 'Cơ quan → Chiến báo tuần', 'aria-label="Phân bố 14 nhiệm vụ"'])
    assert.ok(g.html.includes(s), 'HTML có: ' + s);
  assert.ok(!/Tiến độ tổng thể|Phân bố công việc|Settings → Tổng kết tuần|<strong>Quá hạn<\/strong>/.test(g.html), 'HTML không còn nhãn giọng thường');
  // 2. Dòng ngày.
  assert.ok(g.html.includes('margin:0 0 24px">2026-10-19 → 2026-10-25</p>'), 'dòng ngày dưới tiêu đề');
  assert.ok(z.html.includes('margin:0 0 24px">2026-10-19 → 2026-10-25</p>'), 'dòng ngày giọng thường như cũ');
}
// Giang hồ nhẹ và Thiền: giọng thường.
for (const style of ['zen', 'giangho-nhe']) assert.equal(weeklyReport(workspace(style), day).html, weeklyReport(workspace(), day).html, 'giọng thường cho ' + style);

// 3. API.
const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
class S {
  constructor(text) {
    this.text = text;
    this.values = [];
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
const env = { DB: { prepare: (t) => new S(t), async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; } } };
const token = 'a'.repeat(64);
sql.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run('u1', 'u1@example.test', 'test', 1, 0, 0);
sql.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'), 'u1', Date.now() + 600000);
sql.prepare('INSERT OR REPLACE INTO workspaces VALUES(?,?,0)').run('u1', JSON.stringify(workspace('giangho')));
const req = (path, method = 'GET', data) =>
  api(new Request('https://kanban.huongthiennature.com/api/' + path, { method, headers: { Cookie: 'zen_session=' + token, ...(method !== 'GET' ? { Origin: 'https://kanban.huongthiennature.com', 'Content-Type': 'application/json' } : {}), 'CF-Connecting-IP': '192.0.2.1' }, body: data ? JSON.stringify(data) : undefined }), env);
const preview = await (await req('weekly-report')).json();
assert.ok(preview.subject.startsWith('Chiến báo tuần · ') && preview.text.includes('Kế sách tuần tới:'), 'bản xem trước theo giọng tài khoản');
const share = await req('report-shares', 'POST', { mode: 'public', days: 1 });
assert.equal(share.status, 200);
const html = sql.prepare('SELECT * FROM report_shares').get();
const stored = Object.values(html).find((v) => typeof v === 'string' && v.includes('<html'));
assert.ok(stored.includes('Bức tranh công việc') && stored.includes('Đề xuất tuần tới:') && !stored.includes('Kế sách tuần tới:'), 'link chia sẻ công khai giữ giọng thường');
assert.equal(reportDate().length, 10);
console.log('PASS: chiến báo tuần giọng giang hồ (văn bản, HTML cùng cấu trúc), dòng ngày, xem trước theo giọng, chia sẻ công khai giọng thường.');
