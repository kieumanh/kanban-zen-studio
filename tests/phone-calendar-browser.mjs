// v2.42.0 (Lịch Điện Thoại): ≤700px, lưới tháng chỉ còn số ngày và tối đa 3 chấm màu (màu dự án); "Lịch ngày" nằm ngay dưới lưới và đọc được đủ tên việc.
// 820 / 1440 px giữ nguyên lưới có tên việc. Kiểm ở 390 và 360 (chạm), 820, 1440, cả Giang hồ.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-17T09:00:00+07:00';
const LONG = 'Chuẩn bị tài liệu hướng dẫn cho toàn bộ người tham dự khóa tu và gửi email xác nhận lịch trình chi tiết';
const mk = (id, title, due, extra = {}) => ({ id, title, col: 'List', description: '', due, tag: 'Công việc', priority: 'q2', checks: [], ...extra });
const seed = () => ({
  schema: 1,
  notes: [],
  projects: [
    { ...makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 0), tasks: [mk('a', 'Gọi anh Sơn', '2026-11-17'), mk('b', 'Chốt lịch khóa tu', '2026-11-17'), mk('c', 'Soạn bài giảng', '2026-11-19'), mk('d', 'In ấn tài liệu', '2026-11-20', { start: '2026-11-18', end: '2026-11-20' }), mk('e', 'Họp nhóm', '2026-11-25'), mk('l', LONG, '2026-11-23')] },
    { ...makeProject('p2', 'Website Hương Thiền', '#c764a2', 0), tasks: [mk('f', 'Thiết kế trang chủ', '2026-11-17'), mk('g', 'Viết nội dung', '2026-11-18'), mk('h', 'Kiểm thử', '2026-11-27'), ...[1, 2, 3, 4].map((n) => mk('m' + n, 'Nhiều việc ' + n, '2026-11-12'))] },
  ],
});
const h = await startHarness({ seed });

const grid = (page) =>
  page.evaluate(() => {
    const cell = (d) => [...document.querySelectorAll('.month-cell')].find((c) => c.querySelector('[data-zen-select-day]')?.dataset.zenSelectDay === d);
    const info = (d) => {
      const c = cell(d);
      const b = c.querySelector('.zen-calendar-date');
      const r = c.getBoundingClientRect(), br = b.getBoundingClientRect();
      return { text: b.textContent.trim(), label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), dots: [...c.querySelectorAll('.zen-cal-dots i')].map((i) => i.style.getPropertyValue('--dot')), plus: !!c.querySelector('.zen-cal-dots b'), hidden: c.querySelector('.zen-cal-dots')?.getAttribute('aria-hidden'), w: Math.round(br.width), h: Math.round(br.height), cellH: Math.round(r.height) };
    };
    const main = document.querySelector('#main');
    const kids = [...main.children].map((c) => ['month-scroll', 'zen-day-agenda', 'project-view-summary', 'help-copy', 'zen-unscheduled'].find((n) => c.classList.contains(n)) || '').filter(Boolean);
    return {
      d12: info('2026-11-12'), d17: info('2026-11-17'), d18: info('2026-11-18'), d19: info('2026-11-19'), d20: info('2026-11-20'), d21: info('2026-11-21'), d23: info('2026-11-23'),
      cells: [...document.querySelectorAll('.month-cell')].map((c) => Math.round(c.getBoundingClientRect().height)),
      labels: document.querySelectorAll('.month-cell .month-event, .month-cell .month-lanes').length,
      kids,
      agendaTitle: document.querySelector('.zen-day-agenda h2')?.textContent.replace(/\s+/g, ' ').trim(),
      rows: [...document.querySelectorAll('.zen-day-agenda .zen-agenda-task')].map((b) => ({ title: b.querySelector('strong').textContent, border: getComputedStyle(b).borderLeftWidth, color: b.style.getPropertyValue('--event-color') })),
      help: document.querySelector('.help-copy')?.textContent.trim(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      vh: innerHeight,
      agendaTop: Math.round(document.querySelector('.zen-day-agenda')?.getBoundingClientRect().top ?? -1),
    };
  });

try {
  // A. Điện thoại 390 và 360, Thiền và Giang hồ.
  for (const width of [390, 360]) {
    for (const gh of [false, true]) {
      const at = ' (' + width + 'px' + (gh ? ', Giang hồ' : '') + ')';
      const { context, page } = await h.open(width, { touch: true, now: NOW, workspace: seed(), setup: async ({ context }) => { if (gh) await context.addInitScript(() => localStorage.setItem('zen-style', 'giangho')); } });
      try {
        await h.show(page, 'calendar');
        await page.selectOption('#navigation-scope', '');
        await page.waitForFunction(() => document.querySelectorAll('.zen-cal-dots').length >= 8);
        let g = await grid(page);
        assert.equal(g.labels, 0, 'ô lịch không còn tên việc' + at);
        assert.ok(Math.max(...g.cells) <= (gh ? 70 : 60), 'mọi ô thấp, kể cả ngày có việc tên rất dài' + at + ': ' + Math.max(...g.cells));
        assert.deepEqual(g.d17.dots.slice().sort(), ['#7950c8', '#7950c8', '#c764a2'], '17/11 có 3 việc: hai chấm tím một chấm hồng' + at);
        assert.equal(g.d17.plus, false, 'ba việc không có dấu +' + at);
        assert.equal(g.d12.dots.length, 3, '12/11 có 4 việc: chỉ 3 chấm' + at);
        assert.equal(g.d12.plus, true, '12/11 có dấu + vì hơn 3 việc' + at);
        assert.deepEqual([g.d18.dots.length, g.d19.dots.length, g.d20.dots.length], [2, 2, 1], 'việc nhiều ngày (18–20/11) có chấm ở từng ngày nó phủ' + at);
        assert.equal(g.d21.dots.length, 0, 'ngày trống không có chấm' + at);
        assert.equal(g.d17.hidden, 'true', 'chấm màu ẩn với trình đọc màn hình' + at);
        assert.match(g.d17.label, gh ? /^2026-11-17, 3 nhiệm vụ$/ : /^2026-11-17, 3 công việc$/, 'nhãn nút ngày nói số việc' + at + ': ' + g.d17.label);
        assert.match(g.d17.text, /^17$/, 'ô ngày chỉ có số ngày' + at + ': ' + g.d17.text);
        assert.ok(g.d17.w >= 44 && g.d17.h >= 44, 'vùng chạm của ngày ≥44px' + at + ': ' + g.d17.w + '×' + g.d17.h);
        assert.equal(g.d17.pressed, 'true', 'hôm nay đang chọn' + at);
        assert.deepEqual(g.kids, ['month-scroll', 'zen-day-agenda', 'help-copy', 'zen-unscheduled'], 'thứ tự: lưới → Lịch ngày → ghi chú → Chưa lên lịch' + at + ': ' + g.kids.join(','));
        assert.match(g.agendaTitle, gh ? /^Sự vụ trong ngày 17-11/ : /^Lịch ngày 17-11 Hôm nay$/, 'tiêu đề Lịch ngày' + at + ': ' + g.agendaTitle);
        assert.equal(g.rows.length, 3, 'ba việc hôm nay' + at);
        assert.ok(g.rows.every((r) => r.border === '5px'), 'mỗi việc có vạch màu dự án bên trái' + at);
        assert.deepEqual([...new Set(g.rows.map((r) => r.color))].sort(), ['#7950c8', '#c764a2'], 'màu vạch theo dự án' + at);
        assert.ok(g.agendaTop < g.vh + 120, 'Lịch ngày nằm sát ngay dưới lưới, không bị đẩy xuống xa' + at + ': ' + g.agendaTop + '/' + g.vh);
        assert.equal(g.help, gh ? 'Chạm vào một ngày để xem nhiệm vụ của ngày đó. Nhiệm vụ chưa định ngày nằm ở mục Chưa định ngày bên dưới.' : 'Chạm vào một ngày để xem việc của ngày đó. Việc chưa đặt ngày nằm ở mục Chưa lên lịch bên dưới.', 'dòng hướng dẫn mới' + at);
        assert.ok(g.overflow <= 0, 'không tràn ngang' + at);
        if (gh) assert.ok((await page.locator('.month-cell .gh-lunar').count()) >= 28, 'ngày âm vẫn hiện' + at);

        // Chọn một dự án: thẻ tiến độ dự án nằm dưới Lịch ngày chứ không chen giữa tiêu đề và lưới.
        await page.selectOption('#navigation-scope', 'p1');
        await page.waitForFunction(() => document.querySelector('#main > .project-view-summary'));
        assert.deepEqual((await grid(page)).kids, ['month-scroll', 'zen-day-agenda', 'project-view-summary', 'help-copy', 'zen-unscheduled'], 'thẻ tiến độ dự án nằm dưới Lịch ngày' + at);
        await page.selectOption('#navigation-scope', '');
        await page.waitForFunction(() => !document.querySelector('#main > .project-view-summary'));

        // Chạm ngày 18: ngày được chọn đổi, Lịch ngày liệt kê đủ việc (kể cả việc nhiều ngày), dòng chọn cũ bỏ.
        await page.click('[data-zen-select-day="2026-11-18"]');
        await page.waitForFunction(() => document.querySelector('[data-zen-select-day="2026-11-18"]').getAttribute('aria-pressed') === 'true');
        g = await grid(page);
        assert.equal(g.d17.pressed, 'false', 'ngày 17 bỏ chọn' + at);
        assert.deepEqual(g.rows.map((r) => r.title).sort(), ['In ấn tài liệu', 'Viết nội dung'], 'Lịch ngày 18/11 có việc nhiều ngày và việc có hạn' + at);

        // Ngày có việc tên rất dài: đọc đủ tên ở Lịch ngày.
        await page.click('[data-zen-select-day="2026-11-23"]');
        await page.waitForFunction((t) => document.querySelector('.zen-day-agenda')?.textContent.includes(t), LONG);
        assert.equal((await grid(page)).rows[0].title, LONG, 'tên dài đọc đủ ở Lịch ngày' + at);

        // Chạm một việc trong Lịch ngày thì mở đúng việc.
        await page.click('.zen-day-agenda .zen-agenda-task');
        await page.waitForSelector('#editor[open]');
        assert.ok((await page.inputValue('#editor-form [name=title]')) === LONG, 'mở đúng việc' + at);
        await page.evaluate(() => document.querySelector('#editor').close());
        assert.equal((await grid(page)).overflow <= 0, true, 'không tràn ngang sau khi mở việc' + at);
        if (gh) {
          const text = await page.evaluate(() => document.querySelector('#main').innerText);
          for (const t of ['Lịch ngày', 'Chạm vào một ngày để xem việc', 'Chưa lên lịch']) assert.ok(!text.includes(t), 'Giang hồ không còn “' + t + '”' + at);
        }
      } finally {
        await context.close();
      }
    }
  }

  // B. Máy tính bảng và máy tính: giữ lưới có tên việc, không có chấm.
  for (const [width, touch] of [[820, true], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, now: NOW, workspace: seed() });
    try {
      await h.show(page, 'calendar');
      await page.selectOption('#navigation-scope', '');
      // Máy tính bảng (701–1023px) mặc định xem dạng danh sách; chuyển sang lưới tháng để kiểm ô lịch.
      if (width === 820) await page.click('[data-zen-cal-mode="grid"]');
      await page.waitForSelector('.month-cell');
      const r = await page.evaluate(() => ({ dots: document.querySelectorAll('.zen-cal-dots').length, events: document.querySelectorAll('.month-cell .month-event, .month-cell .month-lanes .month-bar').length, agenda: !!document.querySelector('.zen-day-agenda'), overflow: document.documentElement.scrollWidth - innerWidth }));
      assert.equal(r.dots, 0, 'không có chấm màu' + at);
      assert.ok(r.events >= 6, 'ô lịch vẫn có tên việc' + at + ': ' + r.events);
      assert.equal(r.agenda, false, 'không có Lịch ngày kiểu điện thoại' + at);
      assert.ok(r.overflow <= 0, 'không tràn ngang' + at);
    } finally {
      await context.close();
    }
  }
  console.log('PASS Lịch điện thoại: chấm màu, Lịch ngày ngay dưới lưới, đọc đủ tên, mở được việc; 390/360 (cả Giang hồ), 820/1440 giữ nguyên');
} finally {
  await h.close();
}
