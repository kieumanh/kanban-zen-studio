// v1.68.0: link chia sẻ công khai cho báo cáo thu chi tuần (dùng lại bảng report_shares, không đổi lược đồ).
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { api } from '../server/api.mjs';
import { financeReport } from '../server/finance-report.mjs';
import { reportDate } from '../server/reports.mjs';

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
const env = {
  DB: {
    prepare: (t) => new S(t),
    async batch(list) {
      const out = [];
      for (const s of list) out.push(await s.run());
      return out;
    },
  },
};
const sessions = { u1: 'a'.repeat(64), u2: 'b'.repeat(64), u3: 'c'.repeat(64) };
for (const [id, token] of Object.entries(sessions)) {
  sql.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id, id + '@example.test', 'test', 1, 0, 0);
  sql.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'), id, Date.now() + 600000);
}
const cookieOf = (id) => 'zen_session=' + sessions[id];
const today = reportDate();
const entry = (id, type, amount, category, note = '') => ({ id, type, amount, category, note, date: today });
const project = (id, name, ledger, extra = {}) => ({ id, name, description: '', icon: '🌿', color: '#628b61', columns: ['Idea', 'Doing', 'Done'], tasks: [{ id: 't' + id, title: 'Việc riêng tư của ' + id, description: '', tag: '', due: '', col: 'Doing', checks: [] }], ledger, ...extra });
const save = (id, projects) => sql.prepare('INSERT OR REPLACE INTO workspaces VALUES(?,?,0)').run(id, JSON.stringify({ schema: 1, projects, notes: [{ title: 'Ghi chú riêng tư' }] }));
save('u1', [
  project('p1', 'Farm <script>alert(1)</script>', [entry('a1', 'out', 5000000, 'Thiết bị'), entry('a2', 'in', 4000000, 'Doanh thu', 'Ghi chú thu <b>x</b>')]),
  project('p2', 'Khóa tu', [entry('b1', 'out', 2000000, 'Dịch vụ')]),
  project('p3', 'Dự án đã lưu trữ', [entry('c1', 'out', 999000000, 'Ẩn')], { archived: true }),
]);
save('u2', [project('q1', 'Chưa có thu chi', [])]);

async function req(path, method = 'GET', data, who = 'u1', ip = '192.0.2.1', origin = 'https://kanban.huongthiennature.com') {
  return api(
    new Request('https://kanban.huongthiennature.com/api/' + path, {
      method,
      headers: { ...(who ? { Cookie: cookieOf(who) } : {}), ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), 'CF-Connecting-IP': ip },
      body: data ? JSON.stringify(data) : undefined,
    }),
    env,
  );
}
const count = () => sql.prepare('SELECT COUNT(*) AS n FROM report_shares').get().n;

// 1. Phải đăng nhập; loại báo cáo lạ bị từ chối; chưa có thu chi thì không tạo link.
assert.equal((await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 'finance' }, null)).status, 401);
assert.equal((await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 'hack' })).status, 400);
assert.equal((await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 7 })).status, 400);
assert.equal(count(), 0, 'yêu cầu sai không tạo link');
const empty = await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 'finance' }, 'u2');
assert.equal(empty.status, 400);
assert.match((await empty.json()).error, /Chưa có khoản thu chi/);
assert.equal((await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 'finance' }, 'u3')).status, 400, 'người chưa có dữ liệu cũng không tạo được link rỗng');
assert.equal(count(), 0, 'không tạo link rỗng');
// Kiểm tra thời hạn / chế độ / mật khẩu vẫn như báo cáo task.
assert.equal((await req('report-shares', 'POST', { mode: 'public', days: 2, kind: 'finance' })).status, 400);
assert.equal((await req('report-shares', 'POST', { mode: 'password', days: 7, password: 'short', kind: 'finance' })).status, 400);

// 2. Link công khai: token ngẫu nhiên đã băm, chỉ có số liệu thu chi, không lộ việc / ghi chú / dự án lưu trữ, nội dung độc hại được thoát.
const created = await (await req('report-shares', 'POST', { mode: 'public', days: 7, kind: 'finance' })).json();
const token = created.url.split('#')[1];
assert.match(token, /^[a-f0-9]{64}$/);
assert.equal(created.expires - created.created, 7 * 86400000);
const row = sql.prepare('SELECT * FROM report_shares WHERE id=?').get(created.id);
assert.notEqual(row.token_hash, token, 'chỉ lưu bản băm của token');
assert.match(row.title, /Thu chi dự án/);
const open = await (await req('report-share/' + token, 'GET', null, null, '192.0.2.50')).json();
assert.equal(open.locked, false);
for (const needle of ['data-report-kind="finance"', 'Bức tranh thu chi', 'Khóa tu', '7.000.000 ₫', '4.000.000 ₫', 'Farm &lt;script&gt;']) assert.ok(open.html.includes(needle), 'thiếu: ' + needle);
for (const banned of ['<script>', 'Việc riêng tư', 'Ghi chú riêng tư', 'Ghi chú thu', 'Dự án đã lưu trữ', '999.000.000', 'Cài đặt → Báo cáo thu chi tuần']) assert.ok(!open.html.includes(banned), 'không được lộ: ' + banned);
assert.match(open.html, /chỉ xem, được chia sẻ từ Kanban Zen Studio/);
// Dùng đúng nội dung với hàm tạo báo cáo ở chế độ chia sẻ (cùng số liệu với bản xem trước).
const expected = financeReport(JSON.parse(sql.prepare('SELECT data FROM workspaces WHERE user_id=?').get('u1').data), today, { shared: true });
assert.equal(open.html, expected.html);
// Bản email không đổi: vẫn có chân thư hướng dẫn tắt email, và không khác bản chia sẻ ở số liệu.
const email = financeReport(JSON.parse(sql.prepare('SELECT data FROM workspaces WHERE user_id=?').get('u1').data), today);
assert.ok(email.html.includes('Cài đặt → Báo cáo thu chi tuần') && !email.html.includes('chỉ xem, được chia sẻ'));
assert.equal(email.html.replace(/<p style="margin-top:28px[^>]*>.*?<\/p><\/main>/, ''), expected.html.replace(/<p style="margin-top:28px[^>]*>.*?<\/p><\/main>/, ''), 'chỉ chân thư khác nhau');

// 3. Bản chụp cố định: sửa dữ liệu sau khi chia sẻ không đổi link.
save('u1', [project('p1', 'Tên mới sau khi chia sẻ', [entry('a1', 'out', 1, 'Khác')])]);
const frozen = await (await req('report-share/' + token, 'GET', null, null, '192.0.2.51')).json();
assert.ok(frozen.html.includes('Khóa tu') && !frozen.html.includes('Tên mới sau khi chia sẻ'));

// 4. Có mật khẩu: chưa mở khóa thì không lộ tiêu đề / nội dung; sai mật khẩu bị chặn và giới hạn lần thử.
const locked = await (await req('report-shares', 'POST', { mode: 'password', days: 3, password: 'Thu-chi-2026!', kind: 'finance' })).json();
const lockedToken = locked.url.split('#')[1];
assert.ok(!sql.prepare('SELECT password_hash FROM report_shares WHERE id=?').get(locked.id).password_hash.includes('Thu-chi'));
const gate = await (await req('report-share/' + lockedToken, 'GET', null, null, '192.0.2.60')).json();
assert.deepEqual([gate.locked, gate.html, gate.title], [true, undefined, undefined]);
assert.equal((await req('report-share/' + lockedToken, 'POST', { password: 'sai-mat-khau' }, null, '192.0.2.61')).status, 401);
assert.equal((await req('report-share/' + lockedToken, 'POST', { password: 'Thu-chi-2026!' }, null, '192.0.2.62', 'https://evil.example')).status, 403, 'chặn gửi từ nguồn lạ');
const unlocked = await req('report-share/' + lockedToken, 'POST', { password: 'Thu-chi-2026!' }, null, '192.0.2.62');
assert.equal(unlocked.status, 200);
assert.match((await unlocked.json()).html, /data-report-kind="finance"/);
for (let i = 0; i < 8; i++) assert.equal((await req('report-share/' + lockedToken, 'POST', { password: 'bad' + i }, null, '192.0.2.99')).status, 401);
assert.equal((await req('report-share/' + lockedToken, 'POST', { password: 'bad' }, null, '192.0.2.99')).status, 429);

// 5. Chủ sở hữu: danh sách / xem / thu hồi chỉ của mình; người khác không xem hay xóa được; danh sách không lộ nội dung.
const mine = await (await req('report-shares')).json();
assert.ok(mine.shares.some((s) => s.id === created.id) && mine.shares.every((s) => !('html' in s) && !('token_hash' in s) && !('password_hash' in s)));
assert.equal((await (await req('report-shares', 'GET', null, 'u2')).json()).shares.length, 0);
assert.equal((await req('report-shares?id=' + created.id, 'GET', null, 'u2')).status, 404);
assert.equal((await req('report-shares?id=' + created.id)).status, 200);
assert.equal((await req('report-shares', 'DELETE', { id: created.id }, 'u2')).status, 404);
assert.equal((await req('report-shares', 'DELETE', { id: created.id })).status, 200);
assert.equal((await req('report-share/' + token, 'GET', null, null, '192.0.2.52')).status, 404, 'thu hồi xong link không còn mở được');

// 6. Hết hạn thì 410; link báo cáo task (không kind) vẫn là báo cáo task, chung giới hạn 30 link.
sql.prepare('UPDATE report_shares SET expires=? WHERE id=?').run(Date.now() - 1, locked.id);
assert.equal((await req('report-share/' + lockedToken, 'GET', null, null, '192.0.2.53')).status, 410);
save('u1', [project('p1', 'Farm', [entry('a1', 'out', 5000000, 'Thiết bị')])]);
const task = await (await req('report-shares', 'POST', { mode: 'public', days: 1 })).json();
const taskView = await (await req('report-share/' + task.url.split('#')[1], 'GET', null, null, '192.0.2.54')).json();
assert.ok(!taskView.html.includes('data-report-kind="finance"'), 'không kind → vẫn là báo cáo task');
const explicit = await (await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 'tasks' })).json();
assert.ok(!(await (await req('report-share/' + explicit.url.split('#')[1], 'GET', null, null, '192.0.2.55')).json()).html.includes('data-report-kind="finance"'));
sql.prepare('DELETE FROM report_shares').run();
const now = Date.now();
for (let i = 0; i < 30; i++) sql.prepare('INSERT INTO report_shares VALUES(?,?,?,?,?,?,?,?)').run(crypto.randomUUID(), createHash('sha256').update('x' + i).digest('hex'), 'u1', 'x', 'x', '', now, now + 86400000);
const full = await req('report-shares', 'POST', { mode: 'public', days: 1, kind: 'finance' });
assert.equal(full.status, 400);
assert.match((await full.json()).error, /Tối đa 30 link/);

// 7. Không đổi lược đồ và không ghi vào bảng ảnh chụp báo cáo task.
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM report_snapshots').get().n, 0);
assert.ok(!/finance/i.test(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8')));
console.log('PASS: chia sẻ báo cáo thu chi — link ngẫu nhiên đã băm, mật khẩu + giới hạn thử, bản chụp cố định, không lộ việc / ghi chú / dự án lưu trữ, thoát ký tự, chỉ chủ thu hồi, hết hạn, giới hạn 30 link, báo cáo task không đổi.');
