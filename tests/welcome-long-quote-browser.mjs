// v1.19.2: kho câu mở rộng có nhiều câu dài hơn trước (Gita, Kabir, Upanishad). Hộp thoại chào mừng phải hiện trọn câu dài nhất
// ở 390 / 820 / 1440 px: không tràn ngang, nằm gọn trong màn hình, nút đóng thấy được, kéo xuống được tới cuối.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startHarness } from './lib/browser-harness.mjs';

const wisdom = JSON.parse(readFileSync(new URL('../dist/wisdom.json', import.meta.url), 'utf8'));
const longest = wisdom
  .filter((q) => q.kind !== 'reflection')
  .sort((a, b) => b.vi.length - a.vi.length)
  .slice(0, 1)
  .map((q) => ({ ...q }));
assert.ok(longest[0].vi.length >= 450, 'Kho câu phải có câu dài để kiểm tra bố cục: ' + longest[0].vi.length);

const h = await startHarness();
try {
  for (const [width, height, touch] of [
    [390, 844, true],
    [820, 1180, true],
    [1440, 900, false],
  ]) {
    const { context, page } = await h.open(width, {
      height,
      touch,
      welcome: true,
      now: '2026-11-03T02:10:00Z', // 09:10 giờ Việt Nam
      setup: async ({ context }) => {
        // Trình phục vụ nền (PWA) xử lý mọi yêu cầu nên page.route không chặn được; thay fetch của trang để trả đúng một câu dài nhất.
        await context.addInitScript((items) => {
          const original = window.fetch.bind(window);
          window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : input.url;
            if (/\/wisdom\.json(\?|$)/.test(url)) {
              return Promise.resolve(new Response(JSON.stringify(items), { headers: { 'content-type': 'application/json' } }));
            }
            return original(input, init);
          };
        }, longest);
      },
    });
    await page.waitForSelector('.welcome-dialog[open]', { timeout: 8000 });
    const m = await page.evaluate(() => {
      const d = document.querySelector('.welcome-dialog');
      const r = d.getBoundingClientRect();
      const close = d.querySelector('.welcome-close').getBoundingClientRect();
      const quote = d.querySelector('blockquote').textContent.replace(/\s+/g, ' ').trim();
      const scrolls = d.scrollHeight > d.clientHeight + 1;
      d.scrollTop = d.scrollHeight;
      const last = [...d.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().height > 0).pop().getBoundingClientRect();
      const reachable = last.bottom <= d.getBoundingClientRect().bottom + 1;
      d.scrollTop = 0;
      return {
        quote,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        vw: innerWidth,
        vh: innerHeight,
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        dialogOverflow: d.scrollWidth - d.clientWidth,
        overflowY: getComputedStyle(d).overflowY,
        scrolls,
        reachable,
        closeTop: close.top,
        closeRight: close.right,
        closeVisible: close.width > 0 && close.top >= r.top - 1 && close.right <= innerWidth,
      };
    });
    const at = width + 'px';
    assert.equal(m.quote, longest[0].vi.replace(/\s+/g, ' ').trim(), at + ': câu dài nhất không hiện trọn vẹn');
    assert.ok(m.left >= 0 && m.right <= m.vw + 1 && m.top >= 0 && m.bottom <= m.vh + 1, at + ': hộp thoại ra ngoài màn hình ' + JSON.stringify(m));
    assert.ok(m.pageOverflow <= 0, at + ': trang bị kéo ngang ' + m.pageOverflow);
    assert.ok(m.dialogOverflow <= 1, at + ': hộp thoại tràn ngang ' + m.dialogOverflow);
    assert.ok(m.closeVisible, at + ': nút đóng không thấy được');
    assert.ok(!m.scrolls || ['auto', 'scroll'].includes(m.overflowY), at + ': nội dung dài mà hộp thoại không cuộn được');
    assert.ok(m.reachable, at + ': không kéo tới cuối hộp thoại được');
    await context.close();
  }
  console.log('PASS: câu dài nhất trong kho hiện trọn, gọn trong màn hình và kéo được ở 390/820/1440px.');
} finally {
  await h.close();
}
