// v1.35.0: nút "Làm mới" ở Chế độ tập trung (kiểm tra dữ liệu mới từ máy chủ) có nhãn chữ, biểu tượng nằm trong nút,
// không tràn ngang, và bấm vào thì có thông báo kết quả. Kiểm tra ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 3)],
  notes: [],
  dailyHabits: [],
});
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'focus');
    await page.waitForSelector('.focus-check-updates');
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      const b = document.querySelector('.focus-check-updates');
      const svg = b.querySelector('svg');
      const bb = b.getBoundingClientRect();
      const sb = svg.getBoundingClientRect();
      return {
        width: bb.width,
        height: bb.height,
        iconInside: sb.left >= bb.left - 0.5 && sb.right <= bb.right + 0.5 && sb.top >= bb.top - 0.5 && sb.bottom <= bb.bottom + 0.5,
        label: getComputedStyle(b, '::after').content,
        textFits: b.scrollWidth <= b.clientWidth + 1,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.ok(info.width >= 100, 'nút đủ rộng để hiện nhãn "Làm mới"' + at + ' (' + info.width + 'px)');
    assert.ok(info.height >= 44, 'nút đủ cao để chạm' + at);
    assert.equal(info.iconInside, true, 'biểu tượng nằm trong nút, không lệch ra ngoài' + at);
    assert.match(info.label, /Làm mới/, 'nhãn "Làm mới" hiện đúng' + at);
    assert.equal(info.textFits, true, 'nhãn không bị cắt trong nút' + at);
    assert.equal(info.overflow, false, 'không tràn ngang' + at);

    // Bấm: nút tạm khóa rồi mở lại, và có thông báo kết quả.
    await page.click('.focus-check-updates');
    await page.waitForFunction(
      () => /Đã cập nhật dữ liệu mới nhất|Chưa làm mới/.test(document.querySelector('#toast')?.textContent || ''),
      null,
      { timeout: 15000 },
    );
    await page.waitForFunction(() => !document.querySelector('.focus-check-updates')?.disabled);
    await page.context().close();
  }
  console.log('PASS nút Làm mới ở Chế độ tập trung (390/820/1440px)');
} finally {
  await h.close();
}
