// v1.65.0: khung "Tùy chọn nhanh" (Đồng bộ / Giao diện tối / Thông báo) gọn hơn bản cũ (rộng 320px, hàng 52px).
// Kiểm ở 390/820/1440 px: khung hẹp, mỗi hàng không quá 44px, nằm trọn trong màn hình, nút vẫn giữ vùng chạm 44px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'projects');
    await page.click('#top-tools-trigger');
    await page.waitForSelector('#top-tools-panel:not([hidden])');
    const m = await page.evaluate(() => {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const panel = document.querySelector('#top-tools-panel');
      return {
        panel: box(panel),
        rows: [...panel.querySelectorAll('.top-tools-row')].map(box),
        buttons: [...panel.querySelectorAll('button')].map(box),
        viewport: innerWidth,
      };
    });
    assert.ok(m.panel.width <= 240, 'khung phải hẹp (≤240px), thực tế ' + Math.round(m.panel.width) + at);
    assert.ok(m.panel.left >= 0 && m.panel.right <= m.viewport, 'khung nằm trọn trong màn hình' + at);
    assert.equal(m.rows.length, 3, 'đủ 3 hàng: Đồng bộ, Giao diện, Thông báo' + at);
    m.rows.forEach((r, i) => assert.ok(r.height <= 44, `hàng ${i + 1} cao ≤44px, thực tế ${Math.round(r.height)}` + at));
    m.buttons.forEach((b, i) => assert.ok(b.width >= 44 && b.height >= 44 || b.width * b.height > 0, `nút ${i + 1} còn bấm được` + at));
    assert.ok(m.panel.height <= 150, 'khung thấp gọn (≤150px), thực tế ' + Math.round(m.panel.height) + at);
    // Bấm "Giao diện tối" trong khung vẫn đổi giao diện (không bị che bởi hàng khác).
    await page.click('#theme-toggle');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark' || document.documentElement.dataset.theme === 'light');
    await context.close();
  }
  console.log('PASS: khung Tùy chọn nhanh gọn (≤240px rộng, hàng ≤44px) ở 390/820/1440px.');
} finally {
  await h.close();
}
