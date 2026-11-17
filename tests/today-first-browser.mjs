// v2.41.0 (Hôm Nay Làm Gì): trang Tổng quan đưa "Hôm nay làm gì" lên đầu. Thứ tự từ trên xuống: lời chào → Hôm nay làm gì → thanh nhắc
// "N việc quá hạn" → hai thẻ Quá hạn & sắp đến hạn / Đang thực hiện. Kiểm ở 390 (chạm), 820, 1440 px, cả giao diện Giang hồ.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-17T09:00:00+07:00';
const TODAY = '2026-11-17';
const task = (id, title, due, col = 'List') => ({ id, title, col, description: '', due, tag: 'Công việc', priority: 'q2', checks: [] });
const project = (id, name, tasks) => ({ ...makeProject(id, name, '#7950c8', 0), tasks });
// A: hôm nay có 2 việc, có việc quá hạn.  B: hôm nay có 7 việc.  C: hôm nay trống nhưng có việc quá hạn và đang làm.  D: không có gì.
const seeds = {
  A: () => ({ schema: 1, notes: [], projects: [project('p1', 'Khóa tu', [task('a1', 'Gọi anh Sơn', TODAY), task('a2', 'Chốt lịch khóa tu', TODAY, 'Doing'), task('o1', 'Việc trễ cũ nhất', '2026-11-01'), task('o2', 'Việc trễ hai', '2026-11-05')])] }),
  B: () => ({ schema: 1, notes: [], projects: [project('p1', 'Khóa tu', Array.from({ length: 7 }, (_, i) => task('t' + i, 'Việc hôm nay ' + (i + 1), TODAY)))] }),
  C: () => ({ schema: 1, notes: [], projects: [project('p1', 'Khóa tu', [task('o2', 'Việc trễ hai', '2026-11-05'), task('o1', 'Việc trễ cũ nhất', '2026-11-01'), task('o3', 'Việc trễ ba', '2026-11-09'), task('o4', 'Việc trễ bốn', '2026-11-12'), task('d1', 'Đang làm dở', '2026-11-30', 'Doing')])] }),
  D: () => ({ schema: 1, notes: [], projects: [project('p1', 'Khóa tu', [task('f1', 'Việc xa', '2026-12-30')])] }),
};

const h = await startHarness({ seed: seeds.A });
const layout = (page) =>
  page.evaluate(() => {
    const main = document.querySelector('#main');
    const top = (el) => (el ? Math.round(el.getBoundingClientRect().top) : null);
    const now = main.querySelector('.wf-today-now');
    return {
      order: [...main.children].map((c) => (c.matches('.page-heading') ? 'heading' : c.matches('.wf-today-now') ? 'now' : c.matches('#due-alert-strip') ? 'strip' : c.matches('.wf-today-plan') ? 'plan' : c.className.split(' ')[0])),
      nowTop: top(now),
      stripTop: top(main.querySelector('#due-alert-strip')),
      planTop: top(main.querySelector('.wf-today-plan')),
      title: now?.querySelector('h2')?.firstChild.textContent.trim(),
      count: now?.querySelector('h2 small')?.textContent,
      empty: now?.classList.contains('is-empty'),
      rows: [...(now?.querySelectorAll(':scope > .work-task-row strong') || [])].map((e) => e.textContent),
      nextRows: [...(now?.querySelectorAll('.dashboard-plan-part .work-task-row strong') || [])].map((e) => e.textContent),
      nextTitle: now?.querySelector('.dashboard-plan-part h3')?.firstChild.textContent.trim(),
      note: now?.querySelector(':scope > p.subtext')?.textContent || '',
      button: now?.querySelector(':scope > .text-btn')?.textContent.trim() || '',
      planCards: [...main.querySelectorAll('.wf-today-plan > article h2')].map((e) => e.firstChild.textContent.trim()),
      overflow: document.documentElement.scrollWidth - innerWidth,
      vh: innerHeight,
    };
  });

try {
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    for (const style of ['thien', 'giangho']) {
      const gh = style === 'giangho';
      const at = ' (' + width + 'px' + (gh ? ', Giang hồ' : '') + ')';
      const open = async (key) => {
        const o = await h.open(width, { touch, workspace: seeds[key](), now: NOW, setup: async ({ context }) => { if (gh) await context.addInitScript(() => localStorage.setItem('zen-style', 'giangho')); } });
        await h.show(o.page, 'dashboard');
        await o.page.waitForSelector('.wf-today-now');
        await o.page.waitForFunction(() => document.querySelector('#due-alert-strip') || document.querySelector('.wf-today-now.is-empty') || true);
        await o.page.waitForTimeout(250);
        return o;
      };

      // A: hôm nay có việc.
      {
        const { page, context } = await open('A');
        const r = await layout(page);
        assert.deepEqual(r.order.slice(0, 4), ['heading', 'now', 'strip', 'plan'], 'thứ tự: lời chào, Hôm nay làm gì, thanh nhắc, hai thẻ' + at + ': ' + r.order.join(','));
        assert.ok(r.nowTop < r.stripTop && r.stripTop < r.planTop, 'Hôm nay làm gì nằm trên thanh nhắc và hai thẻ' + at);
        assert.equal(r.title, gh ? 'Hôm nay hành sự gì' : 'Hôm nay làm gì', 'tiêu đề' + at);
        assert.equal(r.count, gh ? '2 nhiệm vụ' : '2 việc', 'số việc hôm nay' + at);
        assert.deepEqual(r.rows.sort(), ['Chốt lịch khóa tu', 'Gọi anh Sơn'], 'liệt kê đúng hai việc hạn hôm nay' + at);
        assert.equal(r.empty, false, 'không ở trạng thái trống' + at);
        assert.equal(r.button, gh ? 'Xem nhiệm vụ hôm nay →' : 'Xem việc hôm nay →', 'nút xem' + at);
        assert.equal(r.planCards.length, 2, 'hai thẻ còn lại' + at);
        assert.ok(r.planCards[0].startsWith(gh ? 'Lỡ hẹn' : 'Quá hạn') && r.planCards[1] === (gh ? 'Đang hành sự' : 'Đang thực hiện'), 'thẻ quá hạn rồi thẻ đang làm' + at + ': ' + r.planCards.join(' | '));
        assert.ok(r.overflow <= 0, 'không tràn ngang' + at);
        if (width === 390) assert.ok(r.nowTop + 120 < r.vh, 'Hôm nay làm gì hiện ngay trong màn hình đầu tiên' + at + ': ' + r.nowTop + '/' + r.vh);

        // Bấm một việc thì mở đúng việc; nút xem việc hôm nay sang danh sách đã lọc.
        await page.click('.wf-today-now .work-task-row');
        await page.waitForSelector('#editor[open]');
        await page.keyboard.press('Escape');
        await page.evaluate(() => { const e = document.querySelector('#editor'); if (e.open) e.close(); });
        await page.click('.wf-today-now [data-dashboard-filter="today"]');
        await page.waitForFunction(() => view === 'tasks');
        assert.equal(await page.evaluate(() => dashboardDueFilter), 'today', 'nút lọc việc hôm nay' + at);

        // Thanh nhắc ẩn 30 phút rồi hiện lại: vẫn nằm dưới khối Hôm nay làm gì, không nhảy lên đầu trang.
        await page.evaluate(() => go('dashboard'));
        await page.waitForSelector('.wf-today-now');
        await page.waitForSelector('#due-alert-strip');
        await page.click('[data-snooze-due]');
        assert.equal(await page.evaluate(() => !!document.querySelector('#due-alert-strip')), false, 'thanh nhắc ẩn' + at);
        await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('zen-alert-snooze:')) localStorage.removeItem(k); refreshDueAlerts(); });
        await page.waitForSelector('#due-alert-strip');
        await page.waitForTimeout(100);
        const again = await layout(page);
        assert.deepEqual(again.order.slice(0, 3), ['heading', 'now', 'strip'], 'thanh nhắc hiện lại vẫn nằm dưới Hôm nay làm gì' + at + ': ' + again.order.join(','));
        await context.close();
      }

      // B: hơn 5 việc hôm nay.
      {
        const { page, context } = await open('B');
        const r = await layout(page);
        assert.equal(r.count, gh ? '7 nhiệm vụ' : '7 việc', 'đếm đủ 7 việc' + at);
        assert.equal(r.rows.length, 5, 'chỉ liệt kê 5 việc đầu' + at);
        assert.equal(r.button, gh ? 'Xem mọi nhiệm vụ hôm nay →' : 'Xem tất cả việc hôm nay →', 'nút xem tất cả' + at);
        assert.ok(r.overflow <= 0, 'không tràn ngang' + at);
        await context.close();
      }

      // C: hôm nay trống, có việc quá hạn: gợi ý "Nên làm trước" (việc trễ cũ nhất trước, tối đa 3), đứng đầu chứ không xuống cuối.
      {
        const { page, context } = await open('C');
        const r = await layout(page);
        assert.deepEqual(r.order.slice(0, 2), ['heading', 'now'], 'khối hôm nay vẫn đứng đầu khi trống' + at + ': ' + r.order.join(','));
        assert.equal(r.empty, true, 'ở trạng thái trống' + at);
        assert.equal(r.count, gh ? '0 nhiệm vụ' : '0 việc', 'đếm 0' + at);
        assert.equal(r.note, gh ? 'Hôm nay chưa có nhiệm vụ nào tới kỳ.' : 'Hôm nay chưa có việc nào đến hạn.', 'dòng nói hôm nay trống' + at);
        assert.equal(r.nextTitle, gh ? 'Nên ra tay trước' : 'Nên làm trước', 'tiêu đề gợi ý' + at);
        assert.deepEqual(r.nextRows, ['Việc trễ cũ nhất', 'Việc trễ hai', 'Việc trễ ba'], 'ba việc trễ cũ nhất, cũ trước' + at);
        assert.ok(r.overflow <= 0, 'không tràn ngang' + at);
        await context.close();
      }

      // D: không có việc nào cần chú ý.
      {
        const { page, context } = await open('D');
        const r = await layout(page);
        assert.equal(r.empty, true, 'trống' + at);
        assert.deepEqual(r.nextRows, [], 'không có gợi ý' + at);
        assert.equal(r.nextTitle, undefined, 'không có tiêu đề gợi ý' + at);
        const text = await page.evaluate(() => document.querySelector('.wf-today-now').textContent);
        assert.ok(text.includes(gh ? 'Các hạ đang rảnh tay. Thêm một nhiệm vụ nhỏ cho hôm nay nhé.' : 'Bạn đang rảnh tay. Thêm một việc nhỏ cho hôm nay nhé.'), 'lời nhắn rảnh tay' + at + ': ' + text);
        await context.close();
      }

      if (gh) {
        const { page, context } = await open('A');
        const text = await page.evaluate(() => document.querySelector('#main').innerText);
        for (const t of ['Hôm nay làm gì', 'Nên làm trước', 'Xem việc hôm nay']) assert.ok(!text.includes(t), 'Giang hồ không còn “' + t + '”' + at);
        await context.close();
      }
    }
  }
  console.log('PASS Tổng quan: Hôm nay làm gì đứng đầu, thanh nhắc nằm dưới nó, gợi ý khi trống; 390/820/1440px, cả Giang hồ');
} finally {
  await h.close();
}
