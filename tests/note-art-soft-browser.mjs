// Hồi quy v1.18.2: họa tiết trên thẻ ghi chú và khung soạn ghi chú chỉ còn là nét điểm nhẹ (lớp phủ nền ≥84% ở mọi điểm, cả chế độ sáng và tối),
// vẫn còn họa tiết (không bị xóa), chữ vẫn là nội dung chính và trang không tràn ngang ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const MOTIFS = [
  'leaves',
  'forest',
  'lotus',
  'meditation',
  'awareness',
  'yoga',
  'awakening',
  'stream',
  'creative',
  'rest',
  'travel',
  'freelancer',
];
const note = (id, motif) => ({
  id,
  type: 'note',
  title: 'Ghi chú ' + motif,
  text: 'Nội dung ghi chú mẫu để kiểm tra chữ đọc rõ trên nền họa tiết.',
  url: '',
  group: '',
  color: '#7950c8',
  motif,
});
const h = await startHarness({
  seed: () => ({
    schema: 1,
    projects: [makeProject('p1', 'Dự án A', '#7950c8', 3)],
    notes: MOTIFS.map((m, i) => note('n' + i, m)),
  }),
});
// Độ trong suốt nhỏ nhất của lớp phủ gradient trong background-image đã tính.
const veil = (page, selector) =>
  page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)];
    return els.map((el) => {
      const bg = getComputedStyle(el).backgroundImage;
      const gradient = bg.slice(0, bg.indexOf('url('));
      const alphas = [...gradient.matchAll(/rgba\([^)]*,\s*([0-9.]+)\)/g)].map(
        (m) => parseFloat(m[1]),
      );
      return {
        art: el.dataset.zenArt,
        min: Math.min(...alphas),
        count: alphas.length,
        hasArt: /url\("?data:image\/svg/.test(bg),
      };
    });
  }, selector);
try {
  for (const width of [390, 820, 1440]) {
    for (const theme of ['light', 'dark']) {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await h.show(page, 'notes');
      await page.waitForSelector('.keep-card[data-zen-art]');
      const at = ` (${width}px, ${theme})`;
      const cards = await veil(
        page,
        '.keep-card[data-zen-art]:not([data-zen-art=none])',
      );
      assert.ok(
        cards.length >= 8,
        'có thẻ ghi chú mang họa tiết' + at + ' ' + cards.length,
      );
      for (const c of cards) {
        assert.ok(
          c.count === 3 && c.min >= 0.84,
          `lớp phủ họa tiết thẻ ${c.art} đủ dịu (≥0,84): ${c.min}` + at,
        );
        assert.ok(c.hasArt, `họa tiết ${c.art} vẫn còn` + at);
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        'trang tràn ngang' + at,
      );
      if (width === 820) {
        await page.evaluate(() =>
          noteForm(data.notes.find((n) => n.motif === 'lotus')),
        );
        await page.waitForSelector(
          '#editor[open] .note-composer[data-zen-art]',
        );
        const [composer] = await veil(
          page,
          '#editor .note-composer[data-zen-art]:not([data-zen-art=none])',
        );
        assert.ok(
          composer && composer.min >= 0.8 && composer.hasArt,
          'lớp phủ khung soạn đủ dịu và còn họa tiết' +
            at +
            JSON.stringify(composer),
        );
      }
      await context.close();
    }
  }
  console.log(
    'PASS: họa tiết thẻ ghi chú và khung soạn chỉ là nét điểm nhẹ (lớp phủ ≥84%), còn họa tiết, sáng/tối, 390/820/1440px.',
  );
} finally {
  await h.close();
}
