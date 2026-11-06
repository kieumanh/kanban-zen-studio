// v1.31.0: nhật ký phiên bản — mỗi phiên bản một khung riêng, có từ khóa hạng mục và danh sách nội dung.
// Kiểm tra ở 390 (chạm), 820, 1440px: có khung, có từ khóa, không tràn ngang, không còn thẻ tóm tắt cứng trên Tổng quan.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Farm', '#7950c8', 2)], notes: [], dailyHabits: [] });
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'versions');
    await page.waitForSelector('.release-log .release-card');

    const s = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.release-log > .release-card')];
      const first = cards[0];
      const withTags = cards.filter((c) => c.querySelectorAll('.release-tag').length > 0).length;
      const bullets = cards.map((c) => c.querySelectorAll('li').length);
      const ver = cards.map((c) => c.querySelector('.release-ver')?.textContent.trim());
      const tagLabels = [...new Set(cards.flatMap((c) => [...c.querySelectorAll('.release-tag')].map((t) => t.textContent.trim())))];
      const fonts = [...document.querySelectorAll('.release-tag, .release-ver, .release-card ul')].map((el) => parseFloat(getComputedStyle(el).fontSize));
      return {
        count: cards.length,
        withTags,
        bulletsOk: bullets.every((n) => n >= 1),
        versionsOk: ver.every((v) => /^v\d+\.\d+\.\d+/.test(v)),
        firstVersion: ver[0],
        firstTags: [...first.querySelectorAll('.release-tag')].map((t) => t.textContent.trim()),
        tagLabels,
        minFont: Math.min(...fonts),
        overflow: document.documentElement.scrollWidth > innerWidth,
        radius: parseFloat(getComputedStyle(first).borderTopLeftRadius),
      };
    });
    assert.ok(s.count >= 100, 'có đủ các khung phiên bản' + at);
    assert.equal(s.withTags, s.count, 'mỗi phiên bản có ít nhất một từ khóa' + at);
    assert.ok(s.bulletsOk, 'mỗi phiên bản có danh sách nội dung' + at);
    assert.ok(s.versionsOk, 'mỗi khung có số phiên bản' + at);
    assert.ok(s.firstTags.length >= 1, 'khung đầu có từ khóa' + at);
    assert.ok(s.minFont >= 12, 'cỡ chữ tối thiểu 12px' + at);
    assert.ok(s.radius >= 12, 'khung bo tròn' + at);
    assert.equal(s.overflow, false, 'không tràn ngang' + at);

    // Tổng quan không còn thẻ tóm tắt cứng của bản cũ.
    await h.show(page, 'dashboard');
    assert.equal(await page.locator('.dashboard-release-note').count(), 0, 'không còn thẻ tóm tắt cứng' + at);
    await page.context().close();
  }
  console.log('PASS nhật ký phiên bản: mỗi phiên bản một khung có từ khóa, ở 390/820/1440px, không tràn ngang');
} finally {
  await h.close();
}
