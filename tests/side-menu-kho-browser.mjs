// v2.40.0 (Menu Gọn): menu bên còn 8 mục chính; Tài nguyên, Lưu trữ, Thùng rác, Phiên bản gom vào nhóm thu gọn "Kho".
// Kiểm tra ở 390 (ngăn kéo, chạm), 820 và 1440 px, cả giao diện Giang hồ (Hậu viện).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Farm', '#7950c8', 3)], notes: [], dailyHabits: [] });
const IN_KHO = ['resources', 'archive', 'trash', 'versions'];
const NAME = { resources: 'Tài nguyên', archive: 'Lưu trữ', trash: 'Thùng rác', versions: 'Phiên bản' };
const GH_NAME = { resources: 'Bảo khố', archive: 'Phong ấn', trash: 'Phế tích', versions: 'Biên niên' };
const h = await startHarness({ seed });

const inspect = (page) =>
  page.evaluate(() => {
    const nav = document.querySelector('.sidebar nav');
    const kho = nav.querySelector(':scope>details.nav-more');
    // Mục chính = con trực tiếp của nav là nút, nhóm chế độ xem (Bảng/Lịch/Gantt tính một) hoặc nhóm Kho.
    const main = [...nav.children].filter((c) => c.matches('button.nav, .view-group, details.nav-more')).map((c) => c.dataset.view || (c.matches('.view-group') ? 'view-group' : 'kho'));
    return {
      main,
      khoOpen: !!kho?.open,
      summary: kho?.querySelector('summary')?.textContent.trim(),
      summaryH: kho?.querySelector('summary')?.getBoundingClientRect().height,
      items: [...(kho?.querySelectorAll(':scope>[data-view]') || [])].map((b) => ({ view: b.dataset.view, text: b.textContent.trim() })),
      versionsInBottom: !!document.querySelector('.sidebar .side-bottom [data-view=versions]'),
      overflow: document.documentElement.scrollWidth > innerWidth,
      active: document.querySelector('.sidebar [data-view].active')?.dataset.view || '',
    };
  });

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    for (const style of ['thien', 'giangho']) {
      const at = ' (' + width + 'px' + (style === 'giangho' ? ', Giang hồ' : '') + ')';
      const { context, page } = await h.open(width, { touch, workspace: seed(), setup: async ({ context }) => { if (style === 'giangho') await context.addInitScript(() => localStorage.setItem('zen-style', 'giangho')); } });
      try {
        await h.show(page, 'habits');
        if (touch) await page.click('#menu');
        await page.waitForSelector('.sidebar nav .nav-more-summary', { state: 'attached' });
        const names = style === 'giangho' ? GH_NAME : NAME;
        let s = await inspect(page);
        assert.equal(s.main.length, 8, 'menu chính có 8 mục' + at + ': ' + s.main.join(','));
        assert.deepEqual(s.main, ['dashboard', 'view-group', 'growth', 'budget', 'habits', 'focus', 'notes', 'kho'], 'thứ tự mục chính' + at);
        assert.equal(s.khoOpen, false, 'Kho mặc định thu gọn' + at);
        assert.equal(s.summary, style === 'giangho' ? 'Hậu viện' : 'Kho', 'tên nhóm' + at);
        assert.ok(s.summaryH >= 44, 'tiêu đề nhóm chạm được ≥44px' + at + ': ' + s.summaryH);
        assert.deepEqual(s.items.map((i) => i.view), IN_KHO, 'Kho chứa đúng bốn mục theo thứ tự' + at);
        for (const i of s.items) assert.equal(i.text.replace(/\s+/g, ' ').includes(names[i.view]), true, 'tên mục ' + i.view + ' là “' + names[i.view] + '”' + at + ': ' + i.text);
        assert.equal(s.versionsInBottom, false, 'Phiên bản không còn nằm cuối menu' + at);
        assert.equal(s.overflow, false, 'không tràn ngang' + at);

        // Mở Kho bằng bàn phím rồi đi tới từng trang: nhóm tự mở, mục đang xem sáng lên và nằm trong Kho.
        await page.focus('.nav-more-summary');
        await page.keyboard.press('Enter');
        assert.equal((await inspect(page)).khoOpen, true, 'Enter mở Kho' + at);
        await page.keyboard.press('Enter');
        assert.equal((await inspect(page)).khoOpen, false, 'Enter lần nữa thu gọn Kho' + at);
        for (const v of IN_KHO) {
          await page.evaluate((v) => go(v), v);
          await page.waitForFunction((v) => view === v && document.querySelector('#main h1'), v);
          if (touch) await page.evaluate(() => document.querySelector('.sidebar').classList.add('open'));
          s = await inspect(page);
          assert.equal(s.khoOpen, true, 'đang ở ' + v + ' thì Kho tự mở' + at);
          assert.equal(s.active, v, 'mục ' + v + ' sáng lên' + at);
          const click = await page.evaluate((v) => { const b = document.querySelector('.nav-more [data-view=' + v + ']'); const r = b.getBoundingClientRect(); return { w: r.width, h: r.height }; }, v);
          assert.ok(click.h >= 36 && click.w > 100, 'mục ' + v + ' đủ lớn' + at + ': ' + click.w + '×' + click.h);
        }
        // Bấm thật vào một mục trong Kho (không gọi go) để chắc nó hoạt động như nút menu.
        await page.evaluate(() => go('dashboard'));
        await page.waitForFunction(() => view === 'dashboard');
        if (touch) await page.click('#menu');
        await page.evaluate(() => { document.querySelector('.nav-more').open = false; });
        await page.click('.nav-more-summary');
        assert.equal((await inspect(page)).khoOpen, true, 'bấm tiêu đề thì Kho mở' + at);
        await page.click('.nav-more [data-view=trash]');
        await page.waitForFunction(() => view === 'trash');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'không tràn ngang sau khi bấm' + at);
      } finally {
        await context.close();
      }
    }
  }
  console.log('PASS menu bên: 8 mục chính, nhóm Kho (Tài nguyên, Lưu trữ, Thùng rác, Phiên bản) thu gọn, tự mở khi ở trong nhóm; 390/820/1440px, cả Giang hồ');
} finally {
  await h.close();
}
