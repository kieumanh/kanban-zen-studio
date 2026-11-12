// v1.95.0 (Bổ Khuyết): test canh gác độ phủ chữ Giang hồ. Bật phong cách Giang hồ, mở lần lượt các màn hình và hộp thoại chính,
// thu mọi chữ hiển thị và nhãn đọc (aria-label, title, placeholder) — trừ nội dung người dùng (vùng SKIP của bộ chuyển ngữ), dòng nghĩa
// thường ở thanh bên, nhật ký phiên bản và lời phát hành — rồi báo lỗi nếu còn từ của giọng Thiền (việc, dự án, ghi chú, checklist,
// thông báo, quá hạn, hoàn thành, tiến độ, báo cáo, lưu trữ, thùng rác, cài đặt, đăng nhập, mật khẩu, tài khoản, bạn…).
// Màn hình mới mà quên thêm chữ vào dist/giangho-lex.js sẽ làm test này báo đỏ. Chữ được giữ có chủ đích nằm trong ALLOW, kèm lý do.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px. Dữ liệu mẫu dùng tên trung tính để mọi từ bị bắt đều là chữ giao diện.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const src = readFileSync(new URL('../dist/giangho-lex.js', import.meta.url), 'utf8');
const at0 = src.indexOf('const SKIP = [');
const SKIP = new Function('return ' + src.slice(at0 + 'const SKIP = '.length, src.indexOf("].join(', ');", at0) + 1))().join(', ');
const KW = ['công việc', 'việc', 'dự án', 'ghi chú', 'checklist', 'thông báo', 'quá hạn', 'đến hạn', 'hoàn thành', 'tiến độ', 'báo cáo', 'lưu trữ', 'thùng rác', 'cài đặt', 'đăng nhập', 'đăng xuất', 'mật khẩu', 'tài khoản', 'bạn', 'tập trung', 'tài nguyên'];
// Giữ có chủ đích (bảng thuật ngữ đã duyệt, mục "Giữ nguyên"):
const ALLOW = [
  /^@aria-label: Cơ quan · cài đặt tài khoản$/, // nút Cơ quan đọc cả hai nghĩa
  /đồng bộ/i, // "Đồng bộ ngay", "Dữ liệu & đồng bộ", trạng thái đồng bộ: giữ nguyên
  /^Cài đặt ứng dụng$/, /^Mở menu trình duyệt và chọn Cài đặt ứng dụng/, // chữ của trình duyệt khi cài ứng dụng
  /^Chỉ áp dụng trên thiết bị này\. "Theo hệ thống" làm theo cài đặt sáng\/tối/, // nhóm Giao diện giữ nguyên để luôn tìm được công tắc Phong cách
  /clipboard checklist/, // tên emoji (tiếng Anh) trong bảng biểu tượng
  /^Ghi chú$/, // ô "Ghi chú" của một khoản thu chi (lời ghi kèm), không phải một quyển Tàng thư
  /ám hiệu \(mật khẩu\)/i, // ô mật khẩu ghi "Ám hiệu (mật khẩu)" để giữ nghĩa cho mọi người (v1.91.0)
  /^@title: Nghĩa thường: /, // v1.96.0: title nghĩa thường cố ý ghi chữ cũ (rê chuột / trình đọc màn hình)
];
const vn = (back) => new Date(Date.parse('2026-11-12T09:00:00+07:00') - back * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
const neutral = (p) => {
  p.description = 'Mô tả A';
  p.columnNames = { Idea: 'Kho', List: 'Chờ', Doing: 'Làm', Done: 'Xong' };
  p.tasks.forEach((t, i) => {
    t.title = p.name + ' ' + (i + 1);
    t.tag = 'Nhãn A';
  });
  return p;
};
const seed = () => ({
  schema: 1,
  projects: [
    neutral(makeProject('p1', 'Alpha', '#7950c8', 10, { ledger: [{ id: 'e1', type: 'out', amount: 5000000, category: 'Thiết bị', note: '', date: vn(20) }, { id: 'e2', type: 'in', amount: 2000000, category: 'Doanh thu', note: '', date: vn(3) }] })),
    neutral(makeProject('p2', 'Beta', '#2e7d5b', 4)),
    { ...neutral(makeProject('p3', 'Gamma', '#e78c56', 2)), archived: true },
  ],
  notes: [{ id: 'n1', type: 'note', title: 'Sổ tay', text: 'Nội dung A', url: '', group: 'Nhóm A', color: '#7950c8' }],
  dailyHabits: [{ id: 'h1', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: '2026-10-01', goal: 7, done: [vn(1), vn(2), vn(3)] }],
  trash: [{ id: 'tr1', at: Date.now() - 1000, kind: 'note', name: 'Cũ A', payload: JSON.stringify({ id: 'n9', type: 'note', title: 'Cũ A', text: '', url: '', group: '', color: '#7950c8' }), parent: '' }],
});
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const leftovers = (page, root) =>
  page.waitForTimeout(350).then(() =>
    page.evaluate(
      ([root, SKIP, KW]) => {
        const re = new RegExp('(^|[^\\p{L}])(' + KW.join('|') + ')(?=$|[^\\p{L}])', 'iu');
        const out = new Set();
        const hidden = (el) => { const r = el.getBoundingClientRect(); return !(r.width || r.height) || getComputedStyle(el).visibility === 'hidden'; };
        const OFF = 'script,style,textarea,input,select,option,.gh-nav-plain,.release-notice,.zen-version,.version-card';
        for (const base of document.querySelectorAll(root)) {
          const w = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
          for (let t = w.nextNode(); t; t = w.nextNode()) {
            const el = t.parentElement, s = t.nodeValue.trim();
            if (!s || !el || el.closest(OFF) || el.closest(SKIP) || hidden(el)) continue;
            if (re.test(s)) out.add(s.slice(0, 200));
          }
          base.querySelectorAll('[aria-label],[title],[placeholder]').forEach((e) => {
            if (e.closest('.release-notice') || (e.closest(SKIP) && !e.matches('input,textarea'))) return;
            for (const a of ['aria-label', 'title', 'placeholder']) {
              const v = e.getAttribute(a);
              if (v && re.test(v)) out.add('@' + a + ': ' + v.slice(0, 200));
            }
          });
        }
        return [...out];
      },
      [root, SKIP, KW],
    ),
  );
// Đóng hộp thoại rồi chờ hiệu ứng đóng chạy xong (hộp thoại dùng chung #editor; mở ngay hộp khác có thể bị lệnh đóng trễ đóng mất).
const close = async (page) => {
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForTimeout(400);
};

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const found = {};
    const check = async (name, root) => {
      const list = (await leftovers(page, root)).filter((s) => !ALLOW.some((re) => re.test(s)));
      if (list.length) found[name] = list;
    };
    const { context, page } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const v of ['dashboard', 'projects', 'calendar', 'gantt', 'growth', 'budget', 'habits', 'focus', 'notes', 'resources', 'archive', 'trash']) {
      await h.show(page, v, 'p1');
      await check('màn ' + v, v === 'dashboard' ? 'body' : '#main');
    }
    await h.show(page, 'budget');
    await page.locator('.bg-project').first().click();
    await page.waitForSelector('.bg-actions');
    await check('Ngân khố từng đại sự', '#main');
    await page.locator('.bg-actions .btn.primary').click();
    await page.waitForSelector('dialog[open] .bg-form');
    await check('biểu mẫu khoản', 'dialog[open]');
    await close(page);
    await h.show(page, 'habits');
    await page.locator('.hb-report-btn').click();
    await page.waitForSelector('.hb-report');
    await check('chiến báo nhật khóa', '#main');
    await page.locator('[data-hb-add]').first().click();
    await page.waitForSelector('dialog[open]');
    await check('biểu mẫu nhật khóa', 'dialog[open]');
    await close(page);
    await h.show(page, 'projects', 'p1');
    await page.evaluate(() => document.querySelector('.task-card')?.click());
    await page.waitForSelector('dialog[open]');
    await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
    await check('chi tiết nhiệm vụ', 'dialog[open]');
    await close(page);
    await page.evaluate(() => document.querySelector('[data-action=new-task]')?.click());
    await page.waitForSelector('dialog[open]');
    await check('nhiệm vụ mới', 'dialog[open]');
    await close(page);
    await page.evaluate(() => document.querySelector('[data-action=edit-project]')?.click());
    await page.waitForSelector('dialog[open]');
    await check('biểu mẫu đại sự', 'dialog[open]');
    await close(page);
    await h.show(page, 'notes');
    await page.evaluate(() => document.querySelector('[data-note-new]').click());
    await page.waitForSelector('dialog[open]');
    await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
    await check('soạn quyển', 'dialog[open]');
    await close(page);
    await page.evaluate(() => accountPanel());
    await page.waitForFunction(() => document.querySelector('dialog[open] #editor-body.wf-settings'));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
    await check('Cơ quan', 'dialog[open]');
    await page.click('#sign-out');
    await page.waitForFunction(() => document.querySelector('dialog[open] [data-confirm=signout]'));
    await check('hỏi hạ sơn', 'dialog[open]');
    await close(page);
    await page.evaluate(() => help());
    await page.waitForSelector('dialog[open]');
    await check('Bí kíp nhập môn', 'dialog[open]');
    await close(page);
    await page.evaluate(() => document.querySelector('#notifications-button').click());
    await page.waitForSelector('dialog[open] .notice-list');
    await check('Truyền thư', 'dialog[open]');
    await close(page);
    await h.show(page, 'dashboard');
    await page.evaluate(() => openDueWork('late'));
    await page.waitForSelector('dialog[open] .due-work-tabs');
    await check('nhiệm vụ cần chú ý', 'dialog[open]');
    await close(page);
    await page.evaluate(() => openWeeklyReport());
    await page.waitForSelector('.report-dialog[open]');
    await check('xem trước chiến báo tuần', '.report-dialog-toolbar');
    await page.evaluate(() => document.querySelector('.report-dialog')?.close());
    assert.deepEqual(found, {}, 'còn chữ giọng Thiền khi bật Giang hồ' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();

    // Màn hình Nhập môn (chưa đăng nhập), cả ba chế độ.
    const auth = await h.open(width, { touch, setup: GH });
    await auth.page.route('**/api/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Chưa đăng nhập."}' }));
    await auth.page.goto(auth.page.url());
    await auth.page.waitForSelector('#auth-screen form#auth-form');
    const authFound = {};
    for (const mode of ['login', 'register', 'forgot']) {
      await auth.page.evaluate((m) => authScreen(m), mode);
      const list = (await leftovers(auth.page, '#auth-screen')).filter((s) => !ALLOW.some((re) => re.test(s)));
      if (list.length) authFound[mode] = list;
    }
    assert.deepEqual(authFound, {}, 'màn hình Nhập môn còn chữ giọng Thiền' + at);
    await auth.context.close();
  }
  console.log('giangho-coverage-browser ok');
} finally {
  await h.close();
}
