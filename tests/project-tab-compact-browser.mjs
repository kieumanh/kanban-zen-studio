// v1.77.0: thanh tab dự án gọn (390/360/820/1440px). Giữ đủ chữ (không cắt, không dấu …) nhưng tên dài không còn xuống 5–6 dòng:
// phần trăm nằm dòng riêng dưới tên, tab rộng hơn một chút, dải tab thấp hơn.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const LONG = 'Chương trình thiền định và chữa lành cho người bận rộn mùa thu 2026';
const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', LONG, '#7950c8', 3),
    makeProject('p2', 'Zen Flow Inventory', '#3a6fb0', 10),
    makeProject('p3', 'Hương Thiền Nature — Website', '#c86f50', 0),
  ],
  notes: [],
});
const h = await startHarness({ seed });

const measure = (page) =>
  page.evaluate((LONG) => {
    const strip = document.getElementById('tabs').getBoundingClientRect();
    const tab = [...document.querySelectorAll('#tabs .tab[data-project]:not(.pinned)')].find(
      (t) => t.getAttribute('aria-label') === LONG,
    );
    const node = [...tab.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    const lines = new Set(rects.map((x) => Math.round(x.top))).size;
    const nameBottom = Math.max(...rects.map((x) => x.bottom));
    const pct = tab.querySelector(':scope > span').getBoundingClientRect();
    const dot = tab.querySelector('.dot');
    return {
      stripH: strip.height,
      tabW: tab.getBoundingClientRect().width,
      lines,
      pctBelow: pct.top >= nameBottom - 1,
      dotShown: !!dot && getComputedStyle(dot).display !== 'none',
      clipped: tab.scrollHeight > tab.clientHeight + 1 || tab.scrollWidth > tab.clientWidth + 1,
      ellipsis: getComputedStyle(tab).textOverflow === 'ellipsis',
    };
  }, LONG);

try {
  for (const [width, touch] of [
    [390, true],
    [360, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'board');
    const m = await measure(page);
    assert.equal(m.clipped, false, 'không cắt chữ' + at);
    assert.equal(m.ellipsis, false, 'không dùng dấu …' + at);
    assert.ok(m.lines <= 3, 'tên dài tối đa 3 dòng' + at + ': ' + m.lines);
    assert.ok(m.stripH <= 120, 'dải tab thấp hơn 120px' + at + ': ' + m.stripH);
    assert.equal(m.pctBelow, true, 'phần trăm nằm dưới tên' + at);
    assert.equal(m.dotShown, false, 'chấm màu ẩn, viền trên mang màu dự án' + at);
    console.log('PASS đo tab dự án' + at + ': dải ' + Math.round(m.stripH) + 'px, ' + m.lines + ' dòng');
  }
  console.log('PASS tab dự án gọn trên điện thoại, giữ đủ chữ, mọi độ rộng');
} finally {
  await h.close?.();
}
process.exit(0);
