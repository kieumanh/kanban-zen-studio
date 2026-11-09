// Hồi quy v1.47.0: tab dự án trên dải tab giữ nguyên khung (cùng chiều rộng, viền, bo góc); tên dài xuống dòng,
// canh giữa trong khung và không bị cắt ở trên hoặc dưới. Phần trăm luôn nằm một dòng.
// Kiểm ở 390 (chạm), 820, 1440 px, cả khi tab dài là tab đang mở.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const LONG = 'Chương trình thiền định và chữa lành cho người bận rộn mùa thu 2026';
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', LONG, '#7950c8', 3),
    makeProject('p2', 'Zen Flow Inventory', '#3a6fb0', 10),
    makeProject('p3', 'Portfolio Kiều Mạnh', '#c86f50', 0),
  ],
  notes: [],
});
const h = await startHarness({ seed });

// Đo từng tab dự án: số dòng của tên, kích thước khung, có bị cắt theo chiều ngang/dọc không.
const measure = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#tabs .tab[data-project]:not(.pinned)')].map((t) => {
      const r = t.getBoundingClientRect();
      const nameNode =
        t.querySelector('.zen-active-tab-name') ||
        [...t.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      let lines = 0;
      if (nameNode) {
        const range = document.createRange();
        range.selectNodeContents(nameNode);
        lines = new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size;
      }
      const pct = t.querySelector(':scope > span');
      const cs = getComputedStyle(t);
      const cap = parseFloat(cs.maxWidth);
      return {
        name: t.getAttribute('aria-label'),
        w: r.width,
        ow: t.offsetWidth,
        cap: Number.isFinite(cap) ? cap : Infinity,
        h: r.height,
        clippedX: t.scrollWidth > t.clientWidth + 1,
        clippedY: t.scrollHeight > t.clientHeight + 1,
        lines,
        align: getComputedStyle(t).textAlign,
        pctOneLine: !pct || pct.getClientRects().length === 1,
      };
    }),
  );

try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'board');

    // sameState: tab dài và tab ngắn cùng trạng thái (không tab nào đang mở), nên khung phải bằng nhau.
    const check = async (label, sameState) => {
      const tabs = await measure(page);
      const long = tabs.find((t) => t.name === LONG);
      const short = tabs.find((t) => t.name === 'Zen Flow Inventory');
      assert.ok(long && short, 'có tab dài và tab ngắn' + label + at);
      assert.ok(long.lines >= 2, 'tên dài xuống dòng' + label + at + ': ' + long.lines);
      for (const t of tabs) {
        assert.equal(t.clippedX, false, 'không cắt ngang: ' + t.name + label + at);
        assert.equal(t.clippedY, false, 'không cắt dọc: ' + t.name + label + at);
        assert.equal(t.align, 'center', 'canh giữa: ' + t.name + label + at);
        assert.equal(t.pctOneLine, true, 'phần trăm nằm một dòng: ' + t.name + label + at);
        assert.ok(
          t.ow <= t.cap + 1,
          'khung không rộng hơn giới hạn của nó: ' + t.name + label + at + ': ' + t.ow + ' > ' + t.cap,
        );
      }
      if (sameState)
        assert.ok(
          Math.abs(long.ow - short.ow) < 1,
          'khung giữ nguyên chiều rộng' + label + at + ': ' + long.ow + ' so với ' + short.ow,
        );
    };

    await check('', true);

    // Tab dài đang mở: vẫn xuống dòng, không bị cắt.
    await page.locator(`#tabs .tab[data-project="p1"]`).click();
    await page.waitForFunction(() => document.querySelector('#tabs .tab.active[data-project="p1"]'));
    await check(' (đang mở)', false);

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'không tràn ngang' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: tab dự án dài xuống dòng, canh giữa trong khung giữ nguyên chiều rộng; không cắt chữ; phần trăm một dòng (390 chạm, 820, 1440px; cả khi đang mở).',
  );
} finally {
  await h.close();
}
