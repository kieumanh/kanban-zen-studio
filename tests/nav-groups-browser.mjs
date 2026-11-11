// v1.25.0: menu bên trái chia nhóm (Làm việc / Ý tưởng) và mục "Thêm" thu gọn chứa Lưu trữ và Thùng rác.
// Mọi mục vẫn bấm được, thứ tự cũ không đổi, không tràn ngang; kiểm tra ở 390 (ngăn kéo), 820, 1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Farm', '#7950c8', 2)], notes: [], dailyHabits: [] });
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    if (touch) await page.click('#menu');
    await page.waitForSelector('.sidebar nav .nav-more-summary', { state: 'attached' });

    const s = await page.evaluate(() => {
      const nav = document.querySelector('.sidebar nav');
      const order = [...nav.querySelectorAll('[data-view]')].map((b) => b.dataset.view);
      return {
        labels: [...nav.querySelectorAll(':scope>[data-nav-label]')].map((l) => l.textContent.trim()),
        moreOpen: document.querySelector('.nav-more').open,
        moreItems: [...document.querySelectorAll('.nav-more [data-view]')].map((b) => b.dataset.view),
        afterNotes: document.querySelector('[data-view=notes]').nextElementSibling.dataset.view,
        habitsAfterTasks: order[order.indexOf('budget') + 1],
        all: order.sort(),
        summaryH: document.querySelector('.nav-more-summary').getBoundingClientRect().height,
        versions: !!document.querySelector('.sidebar .side-bottom [data-view=versions]'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.deepEqual(s.labels, ['Làm việc', 'Ý tưởng'], 'hai nhãn nhóm' + at);
    assert.equal(s.moreOpen, false, '"Thêm" mặc định thu gọn' + at);
    assert.deepEqual(s.moreItems, ['archive', 'trash'], 'Lưu trữ và Thùng rác nằm trong "Thêm"' + at);
    assert.equal(s.afterNotes, 'resources', 'Tài nguyên nằm cùng nhóm Ý tưởng' + at);
    assert.equal(s.habitsAfterTasks, 'habits', 'thứ tự: Việc hằng ngày ngay dưới Phân bổ tài nguyên' + at);
    assert.ok(s.all.includes('archive') && s.all.includes('trash') && s.all.includes('focus') && s.versions, 'không mất mục nào' + at);
    assert.ok(s.summaryH >= 44, '"Thêm" chạm được ≥44px' + at + ': ' + s.summaryH);
    assert.equal(s.overflow, false, 'không tràn ngang' + at);

    // Mở "Thêm" rồi mở Thùng rác.
    await page.click('.nav-more-summary');
    assert.equal(await page.evaluate(() => document.querySelector('.nav-more').open), true, 'bấm "Thêm" thì mở ra' + at);
    await page.click('.nav-more [data-view=trash]');
    await page.waitForFunction(() => view === 'trash');
    assert.equal(await page.evaluate(() => document.querySelector('.nav-more').open), true, 'đang ở mục trong "Thêm" thì vẫn mở' + at);
    await page.context().close();
  }
  console.log('PASS sidebar groups: nhóm, mục Thêm thu gọn, không mất mục');
} finally {
  await h.close();
}
