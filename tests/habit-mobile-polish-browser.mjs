// v1.32.0: việc hằng ngày trên điện thoại — nút Lưu luôn nhìn thấy trong hộp thoại, tên việc tối đa 2 dòng,
// biểu tượng xếp 4 cột, ghi chú tiến độ gọn. Kiểm tra ở 390 (chạm), 820, 1440px; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Farm', '#7950c8', 2)], notes: [], dailyHabits: [
  { id: 'a', name: 'Thiền 10 phút buổi sáng và tối, ghi lại cảm nhận sau mỗi lần ngồi thiền', icon: '🧘', color: '#7950c8', createdAt: '2026-01-01', goal: 7, done: [] },
  { id: 'b', name: 'Uống đủ nước', icon: '💧', color: '#3a6fb0', createdAt: '2026-01-01', goal: 5, done: [] },
] });
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForSelector('.hb-row');

    const card = await page.evaluate(() => {
      const name = document.querySelector('[data-hb-row="a"] .hb-name');
      return {
        clamp: getComputedStyle(name).webkitLineClamp,
        note: document.querySelector('#hb-progress-note').textContent.trim(),
        overflow: document.documentElement.scrollWidth > innerWidth,
        eyebrowText: document.querySelector('.page-heading .eyebrow')?.textContent.trim() || '',
      };
    });
    assert.equal(card.clamp, '2', 'tên việc dài tối đa 2 dòng' + at);
    assert.match(card.note, /đã làm 0\/12/, 'ghi chú tiến độ dùng "đã làm"' + at);
    assert.equal(card.eyebrowText, '', 'bỏ dòng tiêu đề lặp' + at);
    assert.equal(card.overflow, false, 'không tràn ngang' + at);

    // Hộp thoại thêm việc: nút Lưu nằm trong khung nhìn (trên điện thoại cần cuộn vẫn thấy).
    await page.locator('#main button', { hasText: /Thêm/ }).first().click();
    await page.waitForSelector('#editor[open]');
    const save = await page.evaluate(() => {
      const r = document.querySelector('#editor-form [type=submit]').getBoundingClientRect();
      const cols = getComputedStyle(document.querySelector('.hb-icon-picks')).gridTemplateColumns.split(' ').length;
      return { visible: r.bottom <= innerHeight && r.top >= 0, cols };
    });
    assert.ok(save.visible, 'nút Lưu nằm trong khung nhìn' + at);
    if (width === 390) assert.equal(save.cols, 4, 'biểu tượng xếp 4 cột trên điện thoại' + at);
    await page.keyboard.press('Escape');
    await page.context().close();
  }
  console.log('PASS việc hằng ngày trên điện thoại: Lưu nhìn thấy, tên 2 dòng, biểu tượng 4 cột, ghi chú gọn (390/820/1440px)');
} finally {
  await h.close();
}
