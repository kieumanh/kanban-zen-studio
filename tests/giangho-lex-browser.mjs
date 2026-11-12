// v1.87.0 (Nhập Môn): bộ chuyển ngữ Giang hồ (dist/giangho-lex.js) cho khung điều hướng.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px:
//  1. Phong cách Thiền: không đổi chữ nào.
//  2. Giang hồ: tên mục thanh bên hai dòng (tên giang hồ + nghĩa thường), nhóm thanh bên, đường dẫn trên cùng, ô tìm, tiêu đề từng màn hình,
//     lời chào theo giờ, tiêu đề Biên niên có tên phiên bản, bảng lệnh.
//  3. Nội dung người dùng giữ nguyên dù trùng chữ giao diện: dự án tên "Ghi chú", việc tên "Lịch", ghi chú tên "Tổng quan", cột tên "Tài nguyên".
//  4. Về Thiền: mọi chữ và thuộc tính trở lại đúng như cũ, không tải lại trang.
//  5. Không tràn ngang, không lỗi trang; vùng chạm của mục thanh bên vẫn đủ lớn.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p1 = makeProject('p1', 'Ghi chú', '#7950c8', 4);
  p1.tasks[0].title = 'Lịch';
  p1.columnNames = { ...p1.columnNames, Idea: 'Tài nguyên' };
  return {
    schema: 1,
    projects: [p1, makeProject('p2', 'Khóa tu', '#c764a2', 2)],
    notes: [{ id: 'n1', type: 'note', title: 'Tổng quan', text: 'Thông báo', url: '', group: 'Nhóm', color: '#7950c8' }],
    dailyHabits: [{ id: 'h1', name: 'Phiên bản', icon: '🧘', color: '#7950c8', createdAt: '2026-10-01', goal: 7, done: [] }],
  };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const SIDEBAR = {
  'Tổng quan': ['Tổng đàn', 'Tổng quan'],
  'Điểm tích lũy': ['Tu vi', 'Điểm tích lũy'],
  'Phân bổ tài nguyên': ['Ngân khố', 'Phân bổ tài nguyên'],
  'Việc hằng ngày': ['Nhật khóa', 'Việc hằng ngày'],
  'Chế độ tập trung': ['Bế quan', 'Tập trung'],
  'Ghi chú': ['Tàng thư', 'Ghi chú'],
  'Tài nguyên': ['Bảo khố', 'Tài nguyên'],
  'Lưu trữ': ['Phong ấn', 'Lưu trữ'],
  'Thùng rác': ['Phế tích', 'Thùng rác'],
  'Phiên bản': ['Biên niên', 'Phiên bản'],
  'Cài đặt': ['Cơ quan', 'Cài đặt'],
};
const HEADINGS = {
  dashboard: ['MỖI NGÀY, MỘT TẦNG CÔNG LỰC', 'Bình minh đã lên, hôm nay các hạ hành hiệp nơi đâu?'],
  calendar: ['HOÀNG LỊCH NHIỆM VỤ', 'Hoàng lịch'],
  gantt: ['TRẬN ĐỒ ĐẠI SỰ', 'Trận đồ'],
  focus: ['NHẤT TÂM BẤT LOẠN', 'Chọn nhiệm vụ để bế quan'],
  habits: [null, 'Nhật khóa'],
  notes: ['TÀNG THƯ CÁC', 'Tàng thư'],
  budget: ['NGÂN KHỐ', 'Ngân lượng theo đại sự'],
  resources: ['BẢO KHỐ', 'Bảo khố'],
  archive: ['PHONG ẤN', 'Đại sự tạm phong ấn'],
  trash: ['NHẶT LẠI HOẶC DỌN SẠCH', 'Phế tích'],
};
const CRUMB = { dashboard: 'Tổng đàn', calendar: 'Hoàng lịch · Ghi chú', gantt: 'Trận đồ · Ghi chú', focus: 'Bế quan', habits: 'Nhật khóa', notes: 'Tàng thư', budget: 'Ngân khố', resources: 'Bảo khố', archive: 'Phong ấn', trash: 'Phế tích', versions: 'Biên niên', growth: 'Tu vi' };
const navInfo = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.sidebar .nav')].filter((b) => b.querySelector('.gh-nav') || b.offsetParent !== null).map((b) => {
      const box = b.querySelector('.gh-nav');
      return box ? [box.querySelector('.gh-nav-name').textContent, box.querySelector('.gh-nav-plain').textContent, b.getBoundingClientRect().height] : [b.textContent.trim(), null, b.getBoundingClientRect().height];
    }),
  );
const snapshot = (page) =>
  page.evaluate(() => ({
    sidebar: document.querySelector('.sidebar').innerHTML.replace(/ class="[^"]*"/g, ''),
    topbar: document.querySelector('.topbar').innerHTML.replace(/ class="[^"]*"/g, ''),
    heading: document.querySelector('#main .page-heading')?.innerText,
  }));
const userContent = (page) =>
  page.evaluate(() => ({
    side: [...document.querySelectorAll('#side-projects .side-project')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
    tab: [...document.querySelectorAll('.tabs .tab')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()).join(' | '),
  }));

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. Thiền: không đổi chữ.
    {
      const { context, page } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00' });
      await h.show(page, 'dashboard');
      assert.equal(await page.locator('.gh-nav').count(), 0, 'Thiền: không có nhãn hai dòng' + at);
      assert.equal(await page.locator('#crumb').textContent(), 'Tổng quan', 'Thiền: đường dẫn giữ nguyên' + at);
      assert.match(await page.locator('#main h1').innerText(), /Chào một ngày đầy cảm hứng/, 'Thiền: lời chào giữ nguyên' + at);
      assert.equal(await page.evaluate(() => window.zenGiangHo.active()), false);
      await context.close();
    }
    // 2–5. Giang hồ.
    {
      const { context, page } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: GH });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      await page.evaluate(() => document.querySelectorAll('.sidebar details').forEach((d) => (d.open = true)));
      const nav = await navInfo(page);
      for (const [plain, [name, small]] of Object.entries(SIDEBAR)) {
        const row = nav.find((r) => r[0] === name);
        assert.ok(row, 'thanh bên có mục ' + name + at);
        assert.equal(row[1], small, 'dòng nghĩa thường của ' + name + at);
        if (row[2]) assert.ok(row[2] >= 38, 'mục ' + name + ' đủ cao để chạm: ' + row[2] + at);
      }
      const side = await page.evaluate(() => ({
        groups: [...document.querySelectorAll('.sidebar .nav-group-label')].map((e) => e.textContent),
        view: document.querySelector('.sidebar .view-group-label').firstChild.nodeValue.trim(),
        modes: [...document.querySelectorAll('.view-mode .gh-nav')].map((b) => b.textContent),
        projects: document.querySelector('.side-projects .navlabel').firstChild.nodeValue.trim(),
        search: [document.querySelector('#search').placeholder, document.querySelector('#search').getAttribute('aria-label')],
      }));
      assert.deepEqual(side.groups, ['Hành sự', 'Kho tàng'], 'nhóm thanh bên' + at);
      assert.equal(side.view, 'Thế trận', 'nhóm chế độ xem' + at);
      assert.deepEqual(side.modes.slice(0, 3), ['Bảng cáo thịBảng Kanban', 'Hoàng lịchLịch', 'Trận đồGantt'], 'nút chế độ xem hai dòng' + at);
      assert.equal(side.projects, 'ĐẠI SỰ', 'nhãn danh sách dự án' + at);
      assert.deepEqual(side.search, ['Truy tìm nhiệm vụ…', 'Truy tìm đại sự, nhiệm vụ, tàng thư, chiêu thức và tên tệp'], 'ô tìm' + at);
      // Tiêu đề từng màn hình và đường dẫn trên cùng.
      for (const [v, [eyebrow, title]] of Object.entries(HEADINGS)) {
        await h.show(page, v);
        const head = await page.evaluate(() => ({ eyebrow: document.querySelector('#main .page-heading .eyebrow')?.textContent, h1: document.querySelector('#main h1').firstChild.nodeValue.trim(), crumb: document.querySelector('#crumb').textContent }));
        if (eyebrow) assert.equal(head.eyebrow, eyebrow, 'dòng nhỏ trên tiêu đề ' + v + at);
        assert.equal(head.h1, title, 'tiêu đề ' + v + at);
        assert.equal(head.crumb, CRUMB[v], 'đường dẫn ' + v + at);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'không tràn ngang ' + v + at);
      }
      await h.show(page, 'versions');
      assert.match(await page.locator('#main h1').innerText(), /^Biên niên v\d+\.\d+\.\d+ · \S/, 'Biên niên kèm tên phiên bản' + at);
      // 3. Nội dung người dùng giữ nguyên.
      await h.show(page, 'projects');
      const board = await page.evaluate(() => ({
        h1: document.querySelector('#main h1')?.innerText,
        crumb: document.querySelector('#crumb').textContent,
        columns: [...document.querySelectorAll('#main .column')].map((c) => c.querySelector('.wf-column-name, .column-title span, h3, h2')?.textContent.trim()),
        cards: [...document.querySelectorAll('#main .task-card h3, #main .task-card .task-name')].map((e) => e.textContent.trim()),
      }));
      assert.match(board.h1, /Ghi chú/, 'tên dự án "Ghi chú" giữ nguyên ở tiêu đề' + at);
      assert.equal(board.crumb, 'Ghi chú', 'tên dự án giữ nguyên ở đường dẫn' + at);
      assert.ok(board.columns.includes('Tài nguyên'), 'tên cột của người dùng giữ nguyên: ' + board.columns + at);
      assert.ok(board.cards.includes('Lịch'), 'tên việc "Lịch" giữ nguyên: ' + board.cards + at);
      const mine = await userContent(page);
      assert.ok(mine.side.some((s) => s.startsWith('Ghi chú')), 'dự án trên thanh bên giữ nguyên: ' + mine.side + at);
      await h.show(page, 'notes');
      assert.equal(await page.locator('#main', { hasText: 'Tổng quan' }).count(), 1, 'ghi chú tên "Tổng quan" giữ nguyên' + at);
      await h.show(page, 'habits');
      assert.ok((await page.locator('#main').innerText()).includes('Phiên bản'), 'việc hằng ngày tên "Phiên bản" giữ nguyên' + at);
      // Bảng lệnh.
      await page.keyboard.press('Control+k');
      await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
      assert.equal(await page.locator('#studio-command-title').textContent(), 'Các hạ muốn thi triển chiêu gì?', 'tiêu đề bảng lệnh' + at);
      assert.equal(await page.locator('.studio-palette input').getAttribute('placeholder'), 'Truy tìm khẩu quyết, đại sự, nhiệm vụ…', 'gợi ý ô bảng lệnh' + at);
      await page.keyboard.press('Escape');
      // 4. Về Thiền: trả lại đúng như cũ, không tải lại.
      await h.show(page, 'dashboard');
      await page.evaluate(() => window.zenTheme.setStyle('zen'));
      await page.waitForFunction(() => !document.querySelector('.gh-nav'));
      const back = await snapshot(page);
      assert.match(back.heading, /Chào một ngày đầy cảm hứng/, 'lời chào trở lại' + at);
      assert.equal(await page.locator('#crumb').textContent(), 'Tổng quan', 'đường dẫn trở lại' + at);
      assert.equal(await page.locator('#search').getAttribute('placeholder'), 'Tìm công việc…', 'ô tìm trở lại' + at);
      assert.doesNotMatch(back.sidebar + back.topbar, /Tổng đàn|Tàng thư|Hành sự|Truy tìm|Truyền thư|Cơ quan/, 'không còn chữ giang hồ ở khung' + at);
      // So với một lần mở mới ở phong cách Thiền: khung thanh bên và thanh trên giống hệt.
      const fresh = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00' });
      await h.show(fresh.page, 'dashboard');
      await fresh.page.evaluate(() => document.querySelectorAll('.sidebar details').forEach((d) => (d.open = true)));
      const want = await snapshot(fresh.page);
      const strip = (s) => s.replace(/Đã đồng bộ lúc \d+:\d+|lúc \d+:\d+/g, '').replace(/ open=""/g, '');
      assert.equal(strip(back.sidebar), strip(want.sidebar), 'thanh bên trở lại y như cũ' + at);
      await fresh.context.close();
      // Bật lại Giang hồ ngay trên trang.
      await page.evaluate(() => window.zenTheme.setStyle('giangho'));
      await page.waitForFunction(() => !!document.querySelector('.gh-nav'));
      assert.equal(await page.locator('#crumb').textContent(), 'Tổng đàn', 'bật lại thì đổi ngay' + at);
      // Lời chào theo giờ: buổi tối.
      await page.clock.setSystemTime(new Date('2026-11-12T20:30:00+07:00'));
      await h.show(page, 'notes');
      await h.show(page, 'dashboard');
      assert.match(await page.locator('#main h1').innerText(), /^Trăng đã lên, các hạ nghỉ ngơi dưỡng sức\./, 'lời chào buổi tối' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('giangho-lex-browser ok');
} finally {
  await h.close();
}
