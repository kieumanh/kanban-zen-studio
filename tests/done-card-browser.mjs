// Hồi quy v1.15.52: thẻ việc đã hoàn thành "chìm" xuống (rút màu, nền xám, bỏ bóng, tiêu đề gạch ngang, nhãn xám)
// mà không dùng opacity cho chữ và vẫn đạt độ tương phản 4,5:1; thẻ chưa xong giữ nguyên; hover/focus làm thẻ hiện lại.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 8)], notes: [] });
const h = await startHarness({ seed });

const measure = (page) =>
  page.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => {
      const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const chroma = (c) => {
      const [r, g, b] = parse(c);
      return Math.max(r, g, b) - Math.min(r, g, b);
    };
    const info = (card) => {
      const cs = getComputedStyle(card);
      const h3 = card.querySelector('h3');
      const tag = card.querySelector('.tag');
      const deadline = card.querySelector('.task-card-deadline');
      const bg = cs.backgroundColor;
      const opacities = [card, ...card.querySelectorAll('*')].map((e) => Number(getComputedStyle(e).opacity)).filter((o) => o < 1);
      return {
        filter: cs.filter,
        shadow: cs.boxShadow,
        bg,
        strike: getComputedStyle(h3).textDecorationLine,
        h3Contrast: contrast(getComputedStyle(h3).color, bg),
        deadlineContrast: deadline ? contrast(getComputedStyle(deadline).color, bg) : null,
        tagContrast: contrast(getComputedStyle(tag).color, getComputedStyle(tag).backgroundColor),
        tagChroma: chroma(getComputedStyle(tag).backgroundColor),
        opacities,
      };
    };
    return {
      done: info(document.querySelector('.column[data-column="Done"] .task-card')),
      open: info(document.querySelector('.column[data-column="List"] .task-card')),
    };
  });

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const label = width + 'px' + (touch ? ' cảm ứng' : '');
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'projects');
    await page.waitForSelector('.column[data-column="Done"] .task-card');
    let m = await measure(page);

    assert.match(m.done.strike, /line-through/, `${label}: tiêu đề việc đã xong phải gạch ngang`);
    assert.doesNotMatch(m.open.strike, /line-through/, `${label}: việc chưa xong không gạch ngang`);
    assert.match(m.done.filter, /grayscale/, `${label}: thẻ đã xong phải rút màu (nhận được ${m.done.filter})`);
    assert.equal(m.open.filter, 'none', `${label}: thẻ chưa xong giữ nguyên màu`);
    assert.equal(m.done.shadow, 'none', `${label}: thẻ đã xong không đổ bóng`);
    assert.ok(m.done.tagChroma <= 8 && m.done.tagChroma < m.open.tagChroma, `${label}: nhãn của việc đã xong phải xám hơn (${m.done.tagChroma} so với ${m.open.tagChroma})`);
    assert.deepEqual(m.done.opacities, [], `${label}: không được dùng opacity làm mờ chữ (${m.done.opacities})`);
    assert.ok(m.done.h3Contrast >= 4.5, `${label}: tiêu đề việc đã xong cần tương phản >= 4,5 (nhận được ${m.done.h3Contrast.toFixed(2)})`);
    assert.ok(m.done.tagContrast >= 4.5, `${label}: nhãn cần tương phản >= 4,5 (nhận được ${m.done.tagContrast.toFixed(2)})`);
    if (m.done.deadlineContrast !== null) assert.ok(m.done.deadlineContrast >= 4.5, `${label}: hạn cần tương phản >= 4,5 (nhận được ${m.done.deadlineContrast.toFixed(2)})`);

    // Chạm/đưa tới thì hiện lại đầy đủ.
    const card = page.locator('.column[data-column="Done"] .task-card').first();
    if (touch) await card.focus();
    else await card.hover();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.column[data-column="Done"] .task-card')).filter === 'none');
    m = await measure(page);
    assert.doesNotMatch(m.done.strike, /line-through/, `${label}: thẻ đang chú ý phải hiện lại đầy đủ (bỏ gạch ngang)`);

    await context.close();
    console.log(`  đạt ${label}`);
  }
  console.log('PASS: thẻ việc đã hoàn thành chìm xuống bằng rút màu, nền xám, gạch ngang; không dùng opacity; đạt tương phản; hiện lại khi chú ý.');
} finally {
  await h.close();
}
