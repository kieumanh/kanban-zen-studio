// v1.95.0 (Bổ Khuyết): test canh gác độ phủ chữ Giang hồ. Bật phong cách Giang hồ, mở lần lượt các màn hình và hộp thoại chính,
// thu mọi chữ hiển thị và nhãn đọc (aria-label, title, placeholder) — trừ nội dung người dùng (vùng SKIP của bộ chuyển ngữ), dòng nghĩa
// thường ở thanh bên, nhật ký phiên bản và lời phát hành — rồi báo lỗi nếu còn từ của giọng Thiền (việc, dự án, ghi chú, checklist,
// thông báo, quá hạn, hoàn thành, tiến độ, báo cáo, lưu trữ, thùng rác, cài đặt, đăng nhập, mật khẩu, tài khoản, bạn…).
// Màn hình mới mà quên thêm chữ vào dist/giangho-lex.js sẽ làm test này báo đỏ. Chữ được giữ có chủ đích nằm trong ALLOW, kèm lý do.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px. Dữ liệu mẫu dùng tên trung tính để mọi từ bị bắt đều là chữ giao diện.
// v2.56.0 (Hán Việt Đủ Bộ): thêm các màn của v2.51–v2.55 (Đang đợi hồi âm, hộp Ôn tuần / Kiểm điểm tuần, hộp cất nội dung được chia sẻ,
// khối Sao lục ở Cài đặt, thông báo của chúng) và thêm bảy từ Thiền vào danh sách bắt (phản hồi, đang chờ, ôn tuần, sao lưu, khôi phục, chia sẻ, đến lúc).
// v2.63.1 (Liên Hoàn Lệnh): thêm trang Liên hoàn lệnh (khung ghi thêm, tìm không thấy, chuỗi trống, thông báo khi ghi vào / gỡ khỏi chuỗi) vào bài canh gác.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const src = readFileSync(new URL('../dist/giangho-lex.js', import.meta.url), 'utf8');
const at0 = src.indexOf('const SKIP = [');
const SKIP = new Function('return ' + src.slice(at0 + 'const SKIP = '.length, src.indexOf("].join(', ');", at0) + 1))().join(', ');
const KW = ['công việc', 'việc', 'dự án', 'ghi chú', 'checklist', 'thông báo', 'quá hạn', 'đến hạn', 'hoàn thành', 'tiến độ', 'báo cáo', 'lưu trữ', 'thùng rác', 'cài đặt', 'đăng nhập', 'đăng xuất', 'mật khẩu', 'tài khoản', 'bạn', 'tập trung', 'tài nguyên', 'phản hồi', 'đang chờ', 'ôn tuần', 'sao lưu', 'khôi phục', 'chia sẻ', 'đến lúc'];
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
  // v2.56.0: “khôi phục” ở Phế tích. Từ này đã là Hán Việt, bài giangho-settings-browser (v1.91.0) kỳ vọng đúng chữ “Khôi phục” ở trang Phế tích; mỗi nơi một từ theo nghĩa:
  // Phong ấn → “Giải ấn”, Sao lục → “Hoàn nguyên”, Phế tích → “Khôi phục”.
  /^Khôi phục$/, // nút khôi phục từng mục trong Phế tích
  /Phế tích.*khôi phục/, // ba câu giải thích của Phế tích (xóa một mục, xóa đại sự, trang Phế tích)
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
// v2.56.0: ba việc đang chờ người khác (hai đã đến hẹn), hai việc có ngày hoàn thành, một ghi chú việc trọng tâm của tuần 09–15/11.
const withNewFeatures = (p1) => {
  Object.assign(p1.tasks[0], { waitFor: 'Người A', waitUntil: '2026-11-10' });
  Object.assign(p1.tasks[1], { waitFor: 'Người B', waitUntil: '2026-11-20' });
  Object.assign(p1.tasks[2], { waitFor: 'Người C', waitUntil: '2026-11-10' }); // còn đến hẹn sau khi bấm “Đã có hồi âm” ở việc đầu: Truyền thư có dòng “Tới lúc hỏi lại”
  for (const t of p1.tasks) if (t.col === 'Done') t.doneAt = '2026-11-11';
  return p1;
};
const seed = () => ({
  schema: 1,
  projects: [
    withNewFeatures(neutral(makeProject('p1', 'Alpha', '#7950c8', 10, { ledger: [{ id: 'e1', type: 'out', amount: 5000000, category: 'Thiết bị', note: '', date: vn(20) }, { id: 'e2', type: 'in', amount: 2000000, category: 'Doanh thu', note: '', date: vn(3) }] }))),
    neutral(makeProject('p2', 'Beta', '#2e7d5b', 4)),
    { ...neutral(makeProject('p3', 'Gamma', '#e78c56', 2)), archived: true },
  ],
  notes: [{ id: 'n1', type: 'note', title: 'Sổ tay', text: 'Nội dung A', url: '', group: 'Nhóm A', color: '#7950c8' }, { id: 'wk-2026-11-09', type: 'todo', title: 'Tuần A', text: '', url: '', group: '', color: '#7950c8', items: [{ text: 'Mục A', done: false }], weekPicks: [{ p: 'p1', t: 'p1t0' }], weekOf: '2026-11-09' }],
  dailyHabits: [{ id: 'h1', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: '2026-10-01', goal: 7, done: [vn(1), vn(2), vn(3)] }],
  worklist: { v: 1, items: [{ t: 'p1t1', a: '2026-11-10' }, { t: 'p2t0', a: '2026-11-11' }, { t: 'p1t4', a: '2026-11-11' }, { t: 'p1t5', a: '2026-11-03', x: '2026-11-08' }] },
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
    // v2.56.0: /api/backups giả để khối Sao lục ở Cài đặt có đủ dòng mà kiểm.
    const BACKUPS = { available: true, auto: true, keep: { auto: 8, other: 5 }, items: [
      { id: '2026-11-08-auto', kind: 'auto', createdAt: '2026-11-07T20:00:00.000Z', revision: 3, size: 4096, projects: 2, tasks: 8, notes: 1 },
      { id: '2026-11-10T101500-manual', kind: 'manual', createdAt: '2026-11-10T03:15:00.000Z', revision: 4, size: 2048, projects: 2, tasks: 9, notes: 1 },
      { id: '2026-11-11T083000-restore', kind: 'restore', createdAt: '2026-11-11T01:30:00.000Z', revision: 5, size: 3072, projects: 3, tasks: 10, notes: 1 },
    ] };
    const setup = async (ctx) => {
      await GH(ctx);
      await ctx.page.route('**/api/backups**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BACKUPS) }));
    };
    const { context, page } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const v of ['dashboard', 'projects', 'calendar', 'gantt', 'growth', 'budget', 'habits', 'focus', 'worklist', 'notes', 'resources', 'archive', 'trash']) {
      await h.show(page, v, 'p1');
      await check('màn ' + v, v === 'dashboard' ? 'body' : '#main');
    }
    // v2.63.1: Liên hoàn lệnh — khung ghi thêm, thông báo khi gỡ / ghi vào, tìm không thấy, chuỗi trống.
    await h.show(page, 'worklist');
    await page.waitForSelector('#main .wl-chain');
    await page.evaluate(() => document.querySelectorAll('#main details').forEach((d) => (d.open = true)));
    await check('Liên hoàn lệnh (khung ghi thêm)', '#main');
    await page.locator('#main [data-wl-drop]').first().click();
    await page.waitForFunction(() => document.querySelector('#toast')?.classList.contains('show'));
    await check('truyền thư khi gỡ khỏi chuỗi', '#toast');
    await h.show(page, 'worklist');
    await page.evaluate(() => (document.querySelector('.wl-picker').open = true));
    await page.locator('#main [data-wl-add]').first().click();
    await page.waitForFunction(() => document.querySelector('#toast')?.classList.contains('show'));
    await check('truyền thư khi ghi vào chuỗi', '#toast');
    await page.locator('#main [data-wl-search]').fill('zzzz-khong-co-viec-nay');
    await check('Liên hoàn lệnh (tìm không thấy)', '#main');
    await page.evaluate(() => {
      data.worklist = { v: 1, items: [] };
      render();
    });
    await page.waitForSelector('#main .wl-empty');
    await check('Liên hoàn lệnh (chuỗi trống)', '#main');
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
    // v2.56.0: các màn mới của v2.51–v2.55 (Đang đợi hồi âm, Kiểm điểm tuần, cất nội dung được truyền tới, Sao lục).
    await h.show(page, 'dashboard');
    await page.waitForSelector('#main .wf-wait-panel');
    await check('Đang đợi hồi âm (Tổng đàn)', '#main');
    await page.locator('#main .wf-wait-panel [data-wait-got]').first().click();
    await page.waitForFunction(() => document.querySelector('#toast')?.classList.contains('show'));
    await check('truyền thư sau khi ghi hồi âm', '#toast');
    await h.show(page, 'projects', 'p1');
    await page.waitForSelector('.task-card .wait-label');
    await check('thẻ nhiệm vụ đang đợi hồi âm', '#main');
    await page.evaluate(() => window.zenWeeklyReview.open());
    await page.waitForSelector('dialog.zen-review[open]');
    await check('Kiểm điểm tuần', 'dialog[open]');
    await close(page);
    await page.evaluate(() => window.zenShareTarget.open({ title: 'Tiêu đề A', text: 'Nội dung A', url: '' }));
    await page.waitForSelector('dialog.zen-share[open]');
    await check('cất nội dung được truyền tới', 'dialog[open]');
    await close(page);
    await page.evaluate(() => accountPanel());
    await page.waitForFunction(() => document.querySelector('dialog[open] #editor-body.wf-settings'));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
    await page.waitForSelector('#zen-backups .zen-backup-row');
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
      if (mode === 'forgot') assert.equal((await auth.page.locator('#auth-form button[type=submit]').innerText()).trim(), 'Gửi thư lấy lại ám hiệu', 'nút quên ám hiệu' + at);
    }
    assert.deepEqual(authFound, {}, 'màn hình Nhập môn còn chữ giọng Thiền' + at);
    await auth.context.close();
  }
  console.log('giangho-coverage-browser ok');
} finally {
  await h.close();
}
