// v1.39.0: đổi thứ tự việc hằng ngày bằng tay cầm: kéo (chuột hoặc cảm ứng) hoặc phím mũi tên lên/xuống.
// Thứ tự được giữ trong dữ liệu (cùng thứ tự với bảng), tay cầm đạt vùng chạm 44px. Kiểm tra ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [],
  notes: [],
  dailyHabits: [
    { id: 'a', name: 'Đi bộ', icon: '🌿', color: '#2e7d5b', createdAt: '2026-10-20', goal: 7, done: [] },
    { id: 'b', name: 'Đọc sách', icon: '📖', color: '#3a6fb0', createdAt: '2026-10-20', goal: 5, done: [] },
    { id: 'c', name: 'Uống nước', icon: '💧', color: '#b5552a', createdAt: '2026-10-20', goal: 7, done: [] },
  ],
});
const order = (page) => page.evaluate(() => window.zenHabits.list().map((x) => x.id).join(','));
const domOrder = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.hb-row')).map((r) => r.dataset.hbRow).join(','));
const grip = (id) => '[data-hb-grip="' + id + '"]';
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
    await page.waitForSelector(grip('c'));
    await page.waitForTimeout(300);

    const size = await page.evaluate(() => {
      const r = document.querySelector('[data-hb-grip]').getBoundingClientRect();
      return { w: r.width, h: r.height, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(size.w >= 36 && size.h >= 44, 'tay cầm đủ vùng chạm 44px cao' + at + ' ' + JSON.stringify(size));
    assert.equal(size.overflow, false, 'không tràn ngang' + at);

    // Bàn phím: chọn tay cầm "Uống nước" rồi nhấn lên hai lần, tiêu điểm vẫn ở tay cầm đó.
    await page.focus(grip('c'));
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction((s) => document.activeElement?.matches(s), grip('c'));
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => window.zenHabits.list()[0].id === 'c');
    assert.equal(await order(page), 'c,a,b', 'mũi tên lên đưa việc lên đầu' + at);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.hbGrip), 'c', 'giữ tiêu điểm sau khi đổi' + at);
    await page.keyboard.press('ArrowUp');
    assert.equal(await order(page), 'c,a,b', 'đã ở đầu thì mũi tên lên không đổi gì' + at);

    // Kéo: đưa "Uống nước" xuống sau "Đọc sách".
    const from = await page.locator(grip('c')).boundingBox();
    const target = await page.locator('[data-hb-row="b"]').boundingBox();
    await page.locator(grip('c')).scrollIntoViewIfNeeded();
    const sx = from.x + from.width / 2,
      sy = from.y + from.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx, sy + 20, { steps: 4 });
    await page.mouse.move(sx, target.y + target.height + 8, { steps: 14 });
    await page.mouse.up();
    await page.waitForFunction(() => window.zenHabits.list().map((x) => x.id).join(',') === 'a,b,c');
    assert.equal(await domOrder(page), 'a,b,c', 'bảng hiển thị đúng thứ tự sau khi kéo' + at);

    // Chạm tay cầm mà không kéo thì không đổi thứ tự.
    await page.click(grip('a'));
    assert.equal(await order(page), 'a,b,c', 'chạm tay cầm không đổi thứ tự' + at);
    await page.context().close();
  }
  console.log('PASS đổi thứ tự việc bằng tay cầm: kéo và phím mũi tên (390 chạm, 820, 1440px)');
} finally {
  await h.close();
}
