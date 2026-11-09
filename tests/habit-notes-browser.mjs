// v1.38.0: ghi chú cảm nhận theo ngày. Giữ ô 0,5 giây mở ghi chú (không tích); chuột phải và Shift+Enter cũng mở được;
// ghi chú được lưu, hiện chấm trên ô và trong lịch sử; để trống rồi lưu thì xóa. Kiểm tra ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seed = () => ({
  schema: 1,
  projects: [],
  notes: [],
  dailyHabits: [{ id: 'a', name: 'Đi bộ', icon: '🌿', color: '#2e7d5b', createdAt: '2026-10-20', goal: 7, done: [] }],
});
const cellSel = '[data-hb-row="a"] [data-hb-toggle][data-hb-date="' + todayStr + '"]';
const noteOf = (page, day) => page.evaluate((d) => window.zenHabits.list().find((x) => x.id === 'a').notes?.[d], day);
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForSelector(cellSel);
    await page.waitForTimeout(300);

    // Giữ ô 0,7 giây: mở ghi chú và không tích việc.
    await page.locator(cellSel).scrollIntoViewIfNeeded();
    const box = await page.locator(cellSel).boundingBox();
    const cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    await page.waitForSelector('#editor[open] textarea[name=note]');
    await page.waitForTimeout(300);
    assert.equal(await page.getAttribute(cellSel, 'aria-checked'), 'false', 'giữ ô không được tích việc' + at);
    assert.equal(await page.isVisible('.hb-note-tip'), true, 'có gợi ý giữ ô' + at);

    await page.fill('#editor-body textarea[name=note]', '  Đi bộ 20 phút, thấy nhẹ đầu  ');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await page.waitForSelector(cellSel + ' .hb-note-dot');
    assert.equal(await noteOf(page, todayStr), 'Đi bộ 20 phút, thấy nhẹ đầu', 'ghi chú được lưu đã cắt khoảng trắng' + at);
    assert.match(await page.getAttribute(cellSel, 'aria-label'), /có ghi chú/, 'nhãn ô nêu có ghi chú' + at);

    // Chạm thường vẫn tích việc sau khi đã có ghi chú.
    await page.click(cellSel);
    await page.waitForFunction(
      (s) => document.querySelector(s)?.getAttribute('aria-checked') === 'true',
      cellSel,
    );

    // Vùng chạm và tràn ngang không thay đổi.
    await page.waitForTimeout(700); // chờ hiệu ứng khi tích (co ô tạm thời) xong rồi mới đo.
    const layout = await page.evaluate((sel) => {
      const b = document.querySelector(sel).getBoundingClientRect();
      return { w: b.width, h: b.height, overflow: document.documentElement.scrollWidth > innerWidth };
    }, cellSel);
    assert.ok(layout.w >= 44 && layout.h >= 44, 'ô ngày đủ vùng chạm 44px' + at + ' ' + JSON.stringify(layout));
    assert.equal(layout.overflow, false, 'không tràn ngang' + at);

    // Lịch sử của việc hiện ghi chú.
    await page.click('[data-hb-history="a"]');
    await page.waitForSelector('#editor[open] .hb-hist-notes');
    assert.match(await page.textContent('#editor-body .hb-hist-notes'), /Đi bộ 20 phút, thấy nhẹ đầu/, 'lịch sử hiện ghi chú' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);

    // Giữ lần nữa, để trống rồi lưu thì xóa ghi chú.
    await page.locator(cellSel).scrollIntoViewIfNeeded();
    const box2 = await page.locator(cellSel).boundingBox();
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    await page.waitForSelector('#editor[open] textarea[name=note]');
    await page.fill('#editor-body textarea[name=note]', '   ');
    await page.click('#editor-form [type=submit]');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await page.waitForFunction(
      (s) => !document.querySelector(s + ' .hb-note-dot'),
      cellSel,
    );
    assert.equal(await noteOf(page, todayStr), undefined, 'để trống rồi lưu thì xóa ghi chú' + at);

    if (width === 1440) {
      // Máy tính: chuột phải và Shift+Enter cũng mở ghi chú.
      await page.click(cellSel, { button: 'right' });
      await page.waitForSelector('#editor[open] textarea[name=note]');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#editor').open);
      assert.equal(await page.getAttribute(cellSel, 'aria-checked'), 'true', 'chuột phải không tích việc' + at);

      await page.focus(cellSel);
      await page.keyboard.press('Shift+Enter');
      await page.waitForSelector('#editor[open] textarea[name=note]');
      await page.fill('#editor-body textarea[name=note]', 'Bàn phím: ghi chú nhanh');
      await page.click('#editor-form [type=submit]');
      await page.waitForFunction(() => !document.querySelector('#editor').open);
      assert.equal(await noteOf(page, todayStr), 'Bàn phím: ghi chú nhanh', 'Shift+Enter mở ghi chú' + at);
      assert.equal(await page.getAttribute(cellSel, 'aria-checked'), 'true', 'Shift+Enter không tích việc' + at);
    }
    await page.context().close();
  }
  console.log('PASS ghi chú cảm nhận theo ngày (giữ ô, chuột phải, Shift+Enter; 390 chạm, 820, 1440px)');
} finally {
  await h.close();
}
