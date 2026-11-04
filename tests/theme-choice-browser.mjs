// v1.21.1: phần Giao diện trong Cài đặt là danh sách có icon, mô tả ngắn và dấu tích ở ô đang chọn (mẫu "Appearance").
// Kiểm tra ở 390/820/1440px: mỗi lựa chọn cao ≥44px, có icon và dấu tích, ô đang chọn được tô nổi và có dấu tích,
// bấm cả dòng để chọn, bàn phím (Tab + Space) vẫn chọn được, không tràn ngang, và lựa chọn vẫn lưu/đọc lại đúng.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
const openGroup = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('#editor .settings-theme', { state: 'attached' });
  const group = page.locator('#editor details.zen-settings-collapse').filter({ has: page.locator('.settings-theme') });
  if (!(await group.evaluate((d) => d.open))) await group.locator('summary').first().click();
  await page.waitForSelector('#editor .settings-theme', { state: 'visible' });
};
try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const at = ` (${width}px)`;
    const { page, context } = await h.open(width, { touch });
    await openGroup(page);
    await page.waitForTimeout(600); // đợi hiệu ứng mở hộp thoại và chuyển màu kết thúc trước khi đo
    const s = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#editor .settings-theme .zen-theme-choice')];
      const grp = (n) => [...document.querySelectorAll(`#editor .settings-theme input[name=${n}]`)].map((i) => i.closest('.zen-theme-choice'));
      const info = (el) => ({
        h: el.getBoundingClientRect().height,
        icon: !!el.querySelector('.zen-theme-icon svg path, .zen-theme-icon svg circle, .zen-theme-icon svg rect'),
        tick: !!el.querySelector('.zen-theme-check svg path'),
        checked: el.querySelector('input').checked,
        tickColor: getComputedStyle(el.querySelector('.zen-theme-check')).color,
        bg: getComputedStyle(el).backgroundColor,
        sub: !!el.querySelector('.zen-theme-text small'),
      });
      const sideBySide = grp('zen-theme').concat(grp('zen-contrast')).map(info);
      const panel = document.querySelector('#editor .settings-theme').getBoundingClientRect();
      const outside = [...document.querySelectorAll('#editor .settings-theme .zen-theme-choice, #editor .settings-theme .zen-theme-list')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > panel.right + 0.5 || r.left < panel.left - 0.5;
      }).length;
      return { count: rows.length, items: sideBySide, outside, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(s.count, 6, 'sáu lựa chọn (3 màu + 3 tương phản)' + at);
    for (const it of s.items) {
      assert.ok(it.h >= 44, `ô chọn cao ${it.h}px` + at);
      assert.ok(it.icon, 'thiếu icon' + at);
      assert.ok(it.tick, 'thiếu dấu tích' + at);
      assert.ok(it.sub, 'thiếu mô tả ngắn' + at);
    }
    const checked = s.items.filter((i) => i.checked);
    assert.equal(checked.length, 2, 'mỗi nhóm đúng một lựa chọn đang chọn' + at);
    for (const c of checked) {
      assert.notEqual(c.tickColor, 'rgba(0, 0, 0, 0)', 'dấu tích của ô đang chọn phải hiện' + at);
      assert.notEqual(c.bg, 'rgba(0, 0, 0, 0)', 'ô đang chọn phải được tô nổi' + at);
    }
    const uncheckedTick = s.items.filter((i) => !i.checked).map((i) => i.tickColor);
    assert.ok(uncheckedTick.every((c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent'), 'ô không chọn không có dấu tích' + at);
    assert.equal(s.outside, 0, 'có phần tử tràn khỏi khung' + at);
    assert.ok(!s.overflow, 'tràn ngang' + at);

    // Bấm cả dòng (không chỉ ô tròn) để chọn Tối.
    await page.locator('#editor .settings-theme .zen-theme-choice', { hasText: 'Tối' }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-theme')), 'dark', 'bấm dòng Tối phải lưu Tối' + at);
    assert.equal(await page.locator('#editor .settings-theme input[name=zen-theme]:checked').inputValue(), 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');

    // Bàn phím: focus vào lựa chọn "Sáng" rồi Space.
    await page.locator('#editor .settings-theme input[name=zen-theme][value=light]').focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-theme')), 'light', 'Space trên bàn phím phải chọn Sáng' + at);

    // Đổi tương phản rồi trả lại mặc định, dữ liệu làm việc không đổi.
    await page.locator('#editor .settings-theme input[name=zen-contrast][value=high]').locator('xpath=..').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-contrast')), 'high');
    await page.locator('#editor .settings-theme input[name=zen-contrast][value=system]').locator('xpath=..').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-contrast')), null, 'Theo hệ thống xóa lựa chọn đã lưu');
    await page.locator('#editor .settings-theme input[name=zen-theme][value=system]').locator('xpath=..').click();
    await page.evaluate(() => document.querySelector('#editor').close());
    await context.close();
  }
  console.log('PASS theme choice list');
} finally {
  await h.close();
}
