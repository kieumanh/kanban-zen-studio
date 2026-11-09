// v1.41.0: lời nhắc nhẹ khi hôm nay chưa tích việc nào. Hiện ở tuần hiện tại; đóng một lần thì ẩn đến hết ngày;
// tích một việc hôm nay thì ẩn ngay; không hiện khi mọi việc đều nghỉ hôm nay. Kiểm tra ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seed = (restToday = []) => ({
  schema: 1,
  projects: [],
  notes: [],
  dailyHabits: [
    { id: 'a', name: 'Đi bộ', icon: '🌿', color: '#2e7d5b', createdAt: '2026-10-20', goal: 7, done: [], rest: restToday },
    { id: 'b', name: 'Đọc sách', icon: '📖', color: '#3a6fb0', createdAt: '2026-10-20', goal: 5, done: [], rest: restToday },
  ],
});
const nudge = (page) => page.locator('.hb-nudge').count();
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';

    // 1. Mở trang: có lời nhắc, nút Đóng đủ vùng chạm, không tràn ngang.
    let { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    await page.waitForTimeout(300);
    assert.equal(await nudge(page), 1, 'hiện lời nhắc khi hôm nay chưa tích việc nào' + at);
    const info = await page.evaluate(() => ({
      text: document.querySelector('.hb-nudge').textContent.replace(/\s+/g, ' ').trim(),
      close: document.querySelector('[data-hb-nudge-close]').getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.match(info.text, /Hôm nay chưa có việc nào được tích\.\s*Bắt đầu bằng một việc nhỏ nhất\./, 'nội dung lời nhắc' + at);
    assert.ok(info.close >= 44, 'nút Đóng đủ vùng chạm' + at);
    assert.equal(info.overflow, false, 'không tràn ngang' + at);

    // 2. Đóng: ẩn ngay, và vẫn ẩn sau khi chuyển trang rồi quay lại trong cùng ngày.
    await page.click('[data-hb-nudge-close]');
    await page.waitForFunction(() => !document.querySelector('.hb-nudge'));
    await h.show(page, 'focus');
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    assert.equal(await nudge(page), 0, 'đã đóng thì không hiện lại trong ngày' + at);
    await page.context().close();

    // 3. Tích một việc hôm nay: lời nhắc ẩn ngay.
    ({ page } = await h.open(width, { touch, workspace: seed() }));
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    await page.waitForTimeout(300);
    assert.equal(await nudge(page), 1, 'lời nhắc hiện trước khi tích' + at);
    const cell = '[data-hb-row="a"] [data-hb-toggle][data-hb-date="' + todayStr + '"]';
    await page.locator(cell).scrollIntoViewIfNeeded();
    await page.click(cell);
    await page.waitForFunction(() => !document.querySelector('.hb-nudge'));
    assert.equal(await nudge(page), 0, 'tích một việc thì ẩn lời nhắc' + at);
    await page.context().close();

    // 4. Chuyển sang tuần khác: không hiện lời nhắc (chỉ nhắc cho tuần hiện tại).
    ({ page } = await h.open(width, { touch, workspace: seed() }));
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    await page.click('[data-hb-week="-1"]');
    await page.waitForSelector('[data-hb-row="a"]');
    await page.waitForTimeout(200);
    assert.equal(await nudge(page), 0, 'tuần khác không hiện lời nhắc' + at);
    await page.context().close();

    // 5. Mọi việc đều nghỉ hôm nay: không hiện lời nhắc; chỉ một việc nghỉ thì vẫn hiện.
    ({ page } = await h.open(width, { touch, workspace: seed([todayStr]) }));
    await h.show(page, 'habits');
    await page.waitForSelector('[data-hb-row="a"]');
    await page.waitForTimeout(200);
    assert.equal(await nudge(page), 0, 'mọi việc đều nghỉ thì không nhắc' + at);
    await page.context().close();
  }
  console.log('PASS lời nhắc nhẹ khi hôm nay chưa tích việc nào (390 chạm, 820, 1440px)');
} finally {
  await h.close();
}
