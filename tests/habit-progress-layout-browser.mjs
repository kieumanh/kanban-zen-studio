// v1.37.0: tích việc trên trang Việc hằng ngày không làm tràn ngang ở 820 px (trước đây phần trăm tiến độ bị đẩy ra
// ngoài màn hình khi đổi từ 0% sang số có thêm ký tự). Kiểm tra ở 390 (chạm), 820, 1440 px, trước và sau khi tích.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seed = () => ({
  schema: 1,
  projects: [],
  notes: [],
  dailyHabits: [
    { id: 'a', name: 'Đi bộ', icon: '🌿', color: '#2e7d5b', createdAt: '2026-10-20', goal: 7, done: [] },
    { id: 'b', name: 'Đọc sách', icon: '📖', color: '#3a6fb0', createdAt: '2026-10-20', goal: 5, done: [] },
  ],
});
const cell = (id) => '[data-hb-row="' + id + '"] [data-hb-toggle][data-hb-date="' + todayStr + '"]';
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForSelector(cell('a'));
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'trước khi tích không tràn ngang' + at);

    for (const id of ['a', 'b']) {
      await page.locator(cell(id)).scrollIntoViewIfNeeded();
      await page.click(cell(id));
      await page.waitForFunction((s) => document.querySelector(s)?.getAttribute('aria-checked') === 'true', cell(id));
    }
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => {
      const pct = document.querySelector('#hb-progress-pct');
      return {
        sw: document.documentElement.scrollWidth,
        iw: innerWidth,
        pctRight: Math.round(pct.getBoundingClientRect().right),
        text: pct.textContent,
      };
    });
    assert.ok(after.sw <= after.iw, 'tích việc không làm tràn ngang' + at + ' ' + JSON.stringify(after));
    assert.ok(after.pctRight <= after.iw, 'phần trăm tiến độ nằm trong màn hình' + at + ' ' + JSON.stringify(after));
    await page.context().close();
  }
  console.log('PASS tích việc không tràn ngang trên Việc hằng ngày (390 chạm, 820, 1440px)');
} finally {
  await h.close();
}
