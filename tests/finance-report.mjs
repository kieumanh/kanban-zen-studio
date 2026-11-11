// v1.67.0: báo cáo thu chi tài chính hằng tuần theo dự án — nội dung, kiểm tra cài đặt, lên lịch theo ngày giờ, tắt giữa chừng, xem trước.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { daily, api, validWorkspace } from '../server/api.mjs';
import {
  financeReport,
  validFinanceSettings,
  financeMoney,
  financeStatus,
  financeTotals,
} from '../server/finance-report.mjs';
import { flatten } from '../dist/modules/delta.mjs';

const day = '2026-10-25'; // Chủ nhật
const entry = (id, type, amount, category, date, note = '') => ({ id, type, amount, category, note, date });
const project = (id, name, color, ledger, extra = {}) => ({
  id,
  name,
  description: '',
  color,
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  tasks: [],
  ...(ledger ? { ledger } : {}),
  ...extra,
});
const ledgerWorkspace = (settings) => ({
  schema: 1,
  notes: [],
  ...(settings ? { financeReport: settings } : {}),
  projects: [
    project('p1', 'Farm Lê Lam Sơn', '#2e7d5b', [
      entry('a1', 'out', 5000000, 'Thiết bị', '2026-10-01'),
      entry('a2', 'out', 3000000, 'Nhân sự', '2026-10-20', 'Tuần này'), // trong tuần (19→25)
      entry('a3', 'out', 2000000, 'Quảng cáo', '2026-10-18'), // tuần trước (12→18): ngày cuối của tuần trước
      entry('a4', 'in', 4000000, 'Doanh thu', '2026-10-19'), // trong tuần: ngày đầu của tuần này
    ]),
    project('p2', 'Khóa tu mùa thu', '#7950c8', [entry('b1', 'out', 2000000, 'Dịch vụ', '2026-10-10'), entry('b2', 'in', 5000000, 'Doanh thu', '2026-10-24')]),
    project('p3', 'Dự án trống', '#d65380'),
    project('p4', 'Đã cất', '#44aa88', [entry('c1', 'out', 999000000, 'Khác', '2026-10-22')], { archived: true }),
  ],
});

// 1. Tiền và trạng thái.
assert.equal(financeMoney(12000000), '12.000.000 ₫');
assert.equal(financeMoney(-3000000), '−3.000.000 ₫');
assert.equal(financeMoney(0), '0 ₫');
assert.equal(financeMoney(999), '999 ₫');
assert.equal(financeStatus(financeTotals([])).label, 'Chưa có số liệu');
assert.equal(financeStatus(financeTotals([entry('x', 'out', 5, 'a', day)])).label, 'Chưa thu hồi');
assert.equal(financeStatus(financeTotals([entry('x', 'out', 5, 'a', day), entry('y', 'in', 5, 'a', day)])).label, 'Hòa vốn');

// 2. Nội dung báo cáo: tổng, cửa sổ tuần, loại dự án lưu trữ, thứ tự lỗ nhiều nhất trước.
const report = financeReport(ledgerWorkspace(), day);
assert.equal(report.hasData, true);
assert.equal(report.subject, 'Tổng kết tuần · Thu chi dự án · ' + day);
assert.equal(report.summary.total.out, 12000000, 'chi 5+3+2+2 triệu; dự án lưu trữ không tính');
assert.equal(report.summary.total.inc, 9000000);
assert.equal(report.summary.total.net, -3000000);
assert.deepEqual([report.summary.week.out, report.summary.week.inc], [3000000, 9000000], 'tuần này: chi 3 triệu (20/10), thu 4 triệu (19/10) + 5 triệu (24/10)');
assert.deepEqual([report.summary.prevWeek.out, report.summary.prevWeek.inc], [2000000, 0], 'tuần trước: chi 2 triệu (18/10)');
assert.deepEqual(report.summary.projects.map((p) => p.name), ['Farm Lê Lam Sơn', 'Khóa tu mùa thu'], 'lỗ nhiều nhất trước; dự án trống không có mặt trong danh sách số liệu');
assert.deepEqual(report.summary.empty, ['Dự án trống']);
for (const needle of ['BỨC TRANH THU CHI · 2026-10-19 → 2026-10-25', 'Đã chi: 12.000.000 ₫', 'Đã thu hồi: 9.000.000 ₫', 'Lãi/Lỗ: −3.000.000 ₫', 'Thu hồi: 75%', '◆ Farm Lê Lam Sơn · Đang lỗ', '◆ Khóa tu mùa thu · Đang lãi', 'Hạng mục chi lớn nhất: Thiết bị 50% · Nhân sự 30% · Quảng cáo 20%', 'Chưa có số liệu: Dự án trống'])
  assert.ok(report.text.includes(needle), 'thiếu trong bản văn bản: ' + needle);
assert.ok(!report.text.includes('Đã cất') && !report.text.includes('999.000.000'), 'dự án lưu trữ không xuất hiện');
assert.ok(report.text.includes('việc tiếp tục hay tạm dừng dự án vẫn do bạn quyết định'), 'không khuyên thay người dùng');
for (const needle of ['Bức tranh thu chi', 'report-donut', 'stroke-dasharray', 'report-status-main', 'report-project-title', '@media print', 'Nunito', 'Chi theo dự án', 'Cài đặt → Báo cáo thu chi tuần', '−3.000.000 ₫', 'Đang lỗ'])
  assert.ok(report.html.includes(needle), 'thiếu trong HTML: ' + needle);

// 3. Không có số liệu: bản xem trước có lời nhắn, email không gửi (hasData=false).
const none = financeReport({ projects: [project('p', 'A', '#7950c8')] }, day);
assert.equal(none.hasData, false);
assert.ok(none.html.includes('Chưa có khoản thu chi nào'));
assert.equal(financeReport({ projects: [] }, day).hasData, false);

// 4. Nội dung do người dùng nhập luôn được thoát ký tự.
const hostile = ledgerWorkspace();
hostile.projects[0].name = '<img src=x onerror=alert(1)>';
hostile.projects[0].ledger[0].category = '<script>alert(1)</script>';
hostile.projects[0].color = 'red;background:url(x)';
const safe = financeReport(hostile, day);
assert.ok(safe.html.includes('&lt;img') && !safe.html.includes('<img src=x') && !safe.html.includes('<script>alert'));
assert.ok(!safe.html.includes('red;background'), 'màu sai được thay bằng màu mặc định');
// Sổ chứa khoản hỏng (dữ liệu cũ hoặc lỗi) không làm báo cáo hỏng.
const broken = ledgerWorkspace();
broken.projects[0].ledger.push({ id: 'z', type: 'xx', amount: 'abc', date: 5 }, null);
assert.equal(financeReport(broken, day).summary.total.out, 12000000);

// 5. Kiểm tra cài đặt (cả máy chủ khi lưu dữ liệu).
for (const ok of [undefined, { enabled: true, day: 0, hour: 9 }, { enabled: false, day: 6, hour: 23 }]) assert.equal(validFinanceSettings(ok), true, JSON.stringify(ok));
for (const bad of [null, 5, [], 'x', {}, { enabled: 1, day: 0, hour: 9 }, { enabled: true, day: 7, hour: 9 }, { enabled: true, day: -1, hour: 9 }, { enabled: true, day: 0, hour: 24 }, { enabled: true, day: 0.5, hour: 9 }, { enabled: true, day: 0, hour: 9, extra: 1 }, { enabled: true, day: 0 }])
  assert.equal(validFinanceSettings(bad), false, JSON.stringify(bad));
assert.equal(validWorkspace(ledgerWorkspace({ enabled: true, day: 0, hour: 9 })), true);
assert.equal(validWorkspace(ledgerWorkspace({ enabled: true, day: 9, hour: 9 })), false, 'máy chủ từ chối cài đặt sai');
assert.equal(validWorkspace(ledgerWorkspace()), true, 'dữ liệu cũ chưa có cài đặt vẫn hợp lệ (mặc định tắt)');

// 6. Lên lịch thật: cơ sở dữ liệu bộ nhớ dùng đúng lược đồ production, không thêm bảng hay cột.
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
class Statement {
  constructor(sql) {
    this.sql = sql;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    return db.prepare(this.sql).get(...this.values) || null;
  }
  async run() {
    return { meta: db.prepare(this.sql).run(...this.values) };
  }
  async all() {
    return { results: db.prepare(this.sql).all(...this.values) };
  }
}
const DB = {
  prepare: (sql) => new Statement(sql),
  async batch(statements) {
    db.exec('BEGIN');
    try {
      const out = [];
      for (const s of statements) out.push(await s.run());
      db.exec('COMMIT');
      return out;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
};
const addUser = (id, workspace, verified = 1) => {
  db.prepare('INSERT INTO users(id,email,password_hash,verified,email_reminders,created) VALUES(?,?,?,?,0,0)').run(id, id + '@example.test', 'none', verified);
  db.prepare('INSERT INTO workspace_state(user_id,revision,nonce,total_bytes) VALUES(?,1,?,0)').run(id, 'n-' + id);
  for (const [key, value] of Object.entries(flatten(workspace))) db.prepare('INSERT INTO workspace_entities(user_id,entity_key,data) VALUES(?,?,?)').run(id, key, JSON.stringify(value));
};
const setting = (id, enabled) => db.prepare("UPDATE workspace_entities SET data=json_set(data,'$.financeReport.enabled',json(?)) WHERE user_id=? AND entity_key='root:root'").run(enabled ? 'true' : 'false', id);
addUser('on', ledgerWorkspace({ enabled: true, day: 0, hour: 9 }));
addUser('later', ledgerWorkspace({ enabled: true, day: 0, hour: 10 }));
addUser('monday', ledgerWorkspace({ enabled: true, day: 1, hour: 9 }));
addUser('off', ledgerWorkspace({ enabled: false, day: 0, hour: 9 }));
addUser('unset', ledgerWorkspace());
addUser('empty', { schema: 1, notes: [], financeReport: { enabled: true, day: 0, hour: 9 }, projects: [project('e', 'Rỗng', '#7950c8')] });
addUser('unverified', ledgerWorkspace({ enabled: true, day: 0, hour: 9 }), 0);
addUser('retry', ledgerWorkspace({ enabled: true, day: 0, hour: 9 }));

const mails = [];
let failNext = 0;
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  const mail = { key: options.headers['Idempotency-Key'], ...JSON.parse(options.body) };
  if (mail.to[0] === 'retry@example.test' && failNext > 0) {
    failNext--;
    return new Response('retry', { status: 503 });
  }
  mails.push(mail);
  return Response.json({ id: 'fake' });
};
const env = { DB, FILES: { delete: async () => {} }, RESEND_API_KEY: 'test' };
const finance = () => mails.filter((m) => m.subject.startsWith('Tổng kết tuần · Thu chi'));
const to = () => finance().map((m) => m.to[0]).sort();

failNext = 99; // 'retry' luôn lỗi 503 để việc gửi chờ thử lại, rồi tắt giữa chừng
await daily(env, new Date(day + 'T02:15:00Z')); // 09:15 giờ Việt Nam, Chủ nhật
assert.deepEqual(to(), ['on@example.test'], 'chỉ người bật, đúng ngày giờ, đã xác minh và có số liệu mới nhận');
const first = finance()[0];
assert.ok(first.html.includes('Bức tranh thu chi') && first.text.includes('Đã chi: 12.000.000 ₫'));
assert.ok(first.text.includes('Tắt hoặc đổi ngày giờ gửi trong Cài đặt → Báo cáo thu chi tuần.'));
assert.equal(first.from, 'Kanban Zen Studio <no-reply@huongthiennature.com>');
assert.equal(db.prepare("SELECT COUNT(*) n FROM notification_jobs WHERE channel='finance' AND user_id='empty'").get().n, 0, 'chưa có khoản nào thì không gửi');
assert.equal(db.prepare("SELECT COUNT(*) n FROM notification_jobs WHERE channel='finance' AND user_id='unverified'").get().n, 0);
await daily(env, new Date(day + 'T02:30:00Z'));
assert.equal(finance().filter((m) => m.to[0] === 'on@example.test').length, 1, 'không gửi trùng trong cùng ngày');

// Tắt giữa lúc việc gửi đang chờ thử lại: không gửi nữa.
const pending = db.prepare("SELECT status FROM notification_jobs WHERE user_id='retry' AND channel='finance'").get();
assert.equal(pending.status, 'pending', 'lần gửi lỗi vẫn chờ thử lại');
setting('retry', false);
db.prepare("UPDATE notification_jobs SET lease_until=0 WHERE user_id='retry'").run();
await daily(env, new Date(day + 'T02:45:00Z'));
assert.equal(finance().filter((m) => m.to[0] === 'retry@example.test').length, 0, 'đã tắt thì việc đang chờ không được gửi');

// Giờ khác trong cùng ngày: người đặt 10:00 nhận lúc 10:15, người khác không nhận lại.
await daily(env, new Date(day + 'T03:15:00Z'));
assert.deepEqual(to(), ['later@example.test', 'on@example.test']);
// Thứ hai: người đặt Thứ hai (day=1) nhận, 'on' không nhận thêm.
await daily(env, new Date('2026-10-26T02:15:00Z'));
assert.deepEqual(to(), ['later@example.test', 'monday@example.test', 'on@example.test']);
assert.equal(db.prepare("SELECT COUNT(*) n FROM notification_jobs WHERE channel='finance' AND day='2026-10-26'").get().n, 1);
assert.equal(db.prepare("SELECT COUNT(*) n FROM report_snapshots").get().n, 0, 'không ghi vào bản chụp của báo cáo công việc');

// 7. API xem trước: cần đăng nhập, chỉ đọc dữ liệu của chính mình.
const raw = 'b'.repeat(64);
db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(createHash('sha256').update(raw).digest('hex'), 'on', Date.now() + 600000);
const get = (cookie) => api(new Request('https://kanban.huongthiennature.com/api/finance-report', { headers: cookie ? { Cookie: 'zen_session=' + cookie } : {} }), env);
assert.equal((await get()).status, 401);
const preview = await get(raw);
assert.equal(preview.status, 200);
const body = await preview.json();
assert.equal(body.hasData, true);
assert.ok(body.html.includes('Bức tranh thu chi') && body.text.includes('Farm Lê Lam Sơn'));
assert.equal(body.summary.total.out > 0, true);

// 8. Không thay đổi lược đồ: không có tên bảng hay cột báo cáo thu chi trong lược đồ.
const schema = readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8');
assert.ok(!/finance/i.test(schema), 'báo cáo thu chi không thêm bảng hay cột vào cơ sở dữ liệu');
console.log('PASS: báo cáo thu chi tuần — tổng, cửa sổ tuần, thoát ký tự, kiểm tra cài đặt, lên lịch đúng ngày giờ, không gửi trùng, tắt giữa chừng, xem trước, không đổi lược đồ.');
