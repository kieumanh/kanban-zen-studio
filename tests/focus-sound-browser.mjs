// v2.2.0 (Thanh Âm): âm thanh đồng hồ tập trung (dist/focus-sound.js), mặc định tắt, cả hai phong cách.
//  1. Mặc định "Tắt": đồng hồ chạy không có chuông, không tiếng suối.
//  2. Chọn "Chuông đồng và tiếng suối": nghe thử một tiếng chuông; đang đếm thì có tiếng suối; tạm dừng thì suối dừng; bắt đầu lại
//     thì một tiếng chuông và suối chạy lại; hết giờ thì ba tiếng chuông. Lưu trên thiết bị, tải lại vẫn giữ.
//  3. "Chuông đồng": không có tiếng suối. Chọn lại "Tắt" thì dừng mọi âm thanh.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; Thiền và Giang hồ; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const seed = () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 4)] });
const state = (page) => page.evaluate(() => window.zenFocusSound.state());
const step = async (page) => {
  await page.clock.runFor(2100);
  await page.clock.runFor(2100);
};
const open = async (page) => {
  await page.locator('#main [data-wf-focus]').first().click();
  await page.waitForSelector('.studio-pomodoro');
  await page.evaluate(() => (document.querySelector('.studio-pomodoro').open = true));
  await page.clock.runFor(1100);
  await page.waitForSelector('.studio-pomodoro .zen-focus-sound select');
};
const timer = (page) => page.locator('.studio-pomodoro [data-studio=timer]').click();

const h = await startHarness({ seed });
try {
  for (const [width, touch, style] of [
    [390, true, 'zen'],
    [820, true, 'giangho'],
    [1440, false, 'zen'],
    [1440, false, 'giangho'],
  ]) {
    const at = ' (' + width + 'px, ' + style + ')';
    const { context, page } = await h.open(width, { touch, now: NOW, setup: ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style) });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'focus');
    await open(page);
    // 1. Mặc định tắt.
    const field = await page.evaluate(() => {
      const f = document.querySelector('.zen-focus-sound'), s = f.querySelector('select');
      return { label: f.querySelector('span').textContent, value: s.value, options: [...s.options].map((o) => o.textContent), h: s.getBoundingClientRect().height };
    });
    assert.deepEqual([field.label, field.value, field.options], ['Âm thanh', '', ['Tắt', 'Chuông đồng', 'Chuông đồng và tiếng suối']], 'ô âm thanh mặc định tắt' + at);
    assert.ok(field.h >= 44, 'ô chọn đủ cao để chạm' + at);
    await timer(page);
    await step(page);
    let s = await state(page);
    assert.deepEqual([s.running, s.bells, s.stream], [true, 0, false], 'mặc định không có âm thanh' + at);
    // 2. Chuông và suối khi đang đếm.
    await page.locator('.zen-focus-sound select').selectOption('stream');
    await page.clock.runFor(1100);
    s = await state(page);
    assert.deepEqual([s.mode, s.bells, s.stream], ['stream', 1, true], 'nghe thử chuông, đang đếm thì có suối' + at);
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-focus-sound')), 'stream', 'lưu trên thiết bị' + at);
    await timer(page); // tạm dừng
    await step(page);
    s = await state(page);
    assert.deepEqual([s.running, s.stream], [false, false], 'tạm dừng thì suối dừng' + at);
    await timer(page); // đếm tiếp
    await step(page);
    s = await state(page);
    assert.deepEqual([s.running, s.bells, s.stream], [true, 2, true], 'bắt đầu lại: một tiếng chuông, suối chạy' + at);
    // Hết giờ: ba tiếng chuông (đọc từ đồng hồ, giả lập hai giây cuối khi đang đếm).
    await page.evaluate(() => {
      const out = document.querySelector('.studio-pomodoro output');
      out.textContent = '00:01';
      window.zenFocusSound.tick();
      out.textContent = '00:00';
      window.zenFocusSound.tick();
    });
    assert.equal((await state(page)).bells, 5, 'hết giờ: ba tiếng chuông' + at);
    await timer(page); // tạm dừng
    // 3. Chỉ chuông; rồi tắt.
    await page.locator('.studio-pomodoro [data-studio=reset]').click();
    await page.clock.runFor(1100);
    await page.locator('.zen-focus-sound select').selectOption('bell');
    await timer(page);
    await step(page);
    s = await state(page);
    assert.deepEqual([s.mode, s.stream], ['bell', false], 'chỉ chuông thì không có suối' + at);
    await page.locator('.zen-focus-sound select').selectOption('');
    await page.clock.runFor(1100);
    s = await state(page);
    assert.deepEqual([s.mode, s.stream], ['', false], 'tắt thì dừng mọi âm thanh' + at);
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-focus-sound')), null, 'tắt thì xóa lựa chọn' + at);
    // Tải lại vẫn giữ lựa chọn.
    await page.locator('.zen-focus-sound select').selectOption('bell');
    await page.reload();
    await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
    await h.show(page, 'focus');
    await open(page);
    assert.equal(await page.locator('.zen-focus-sound select').inputValue(), 'bell', 'tải lại vẫn giữ lựa chọn' + at);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('focus-sound-browser ok');
} finally {
  await h.close();
}
