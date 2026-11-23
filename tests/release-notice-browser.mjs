// v2.82.1 (Thông Báo Gọn): thông báo phiên bản trong hộp Truyền thư / Thông báo là một thẻ ba phần (nhãn · nội dung · nút), một cột.
// Lỗi cũ: vùng lưới tên "tag" không có trong khuôn → trình duyệt sinh thêm cột ẩn, nội dung bị ép vào cột rộng 0 và chữ xếp dọc từng ký tự.
// Kiểm ở 390 / 820 / 1440 px × Thiền / Giang hồ × sáng / tối: nội dung rộng gần bằng thẻ (không xếp dọc), ba phần xếp chồng không đè nhau,
// nội dung không bị cắt ngang thẻ, thẻ không tràn ngang trang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const cfg = (style, theme) => ({ context }) =>
  context.addInitScript(
    ([s, t]) => {
      localStorage.setItem('zen-style', s);
      localStorage.setItem('zen-theme', t);
    },
    [style, theme],
  );

const h = await startHarness();
try {
  for (const w of [390, 820, 1440]) {
    for (const [style, theme] of [
      ['zen', 'light'],
      ['giangho', 'light'],
      ['giangho', 'dark'],
      ['zen', 'dark'],
    ]) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { touch: w < 1000, setup: cfg(style, theme) });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.waitForFunction(() => document.getElementById('notifications-button'));
      await page.waitForTimeout(800);
      await page.evaluate(() => document.getElementById('notifications-button').click());
      await page.waitForSelector('.release-notice', { state: 'attached' });
      const m = await page.evaluate(() => {
        const a = document.querySelector('.release-notice'),
          ar = a.getBoundingClientRect(),
          cs = getComputedStyle(a);
        const parts = ['.notice-tag', '.notice-title', '.release-actions'].map((s) => {
          const e = a.querySelector(s);
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width };
        });
        const title = a.querySelector('.notice-title');
        const lineH = parseFloat(getComputedStyle(title).lineHeight) || 20;
        return {
          cols: cs.gridTemplateColumns.split(' ').length,
          aw: ar.width,
          parts,
          lines: Math.round(title.getBoundingClientRect().height / lineH),
          chars: title.textContent.length,
          right: ar.right,
          vw: innerWidth,
        };
      });
      assert.equal(m.cols, 1, 'thẻ phiên bản một cột lưới, không sinh cột ẩn: ' + JSON.stringify(m) + at);
      const [tag, title, actions] = m.parts;
      assert.ok(tag && title && actions, 'đủ ba phần nhãn · nội dung · nút' + at);
      assert.ok(title.width >= m.aw * 0.7, `nội dung rộng gần bằng thẻ (${Math.round(title.width)}/${Math.round(m.aw)})` + at);
      assert.ok(m.lines <= Math.ceil(m.chars / 12), `nội dung không xếp dọc từng ký tự (${m.lines} dòng cho ${m.chars} ký tự)` + at);
      assert.ok(tag.bottom <= title.top + 1 && title.bottom <= actions.top + 1, 'nhãn, nội dung, nút xếp chồng không đè nhau' + at);
      assert.ok(title.right <= m.right + 1 && actions.right <= m.right + 1, 'nội dung và nút không vượt khỏi thẻ' + at);
      assert.ok(m.right <= m.vw, 'thẻ không vượt khỏi màn hình' + at);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('PASS: thông báo phiên bản một cột, nội dung không xếp dọc, không đè, không tràn (390/820/1440px, Thiền/Giang hồ, sáng/tối).');
} finally {
  await h.close();
}
