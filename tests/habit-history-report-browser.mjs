// v1.40.0: nút "Xem lịch sử" bằng chữ ở từng việc mở báo cáo riêng: 28 hoặc 90 ngày, tỷ lệ (không tính ngày nghỉ),
// chuỗi dài nhất. Kiểm tra ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const addD = (n) =>
  new Date(Date.parse(todayStr + 'T12:00:00Z') + n * 864e5)
    .toISOString()
    .slice(0, 10);
const seed = () => ({
  schema: 1,
  projects: [],
  notes: [],
  dailyHabits: [
    {
      id: 'a',
      name: 'Đi bộ',
      icon: '🌿',
      color: '#2e7d5b',
      createdAt: addD(-40),
      goal: 7,
      // 5 ngày liên tiếp kết thúc hôm nay; một ngày nghỉ 6 ngày trước (không làm đứt chuỗi, không tính vào tỷ lệ).
      done: [addD(-4), addD(-3), addD(-2), addD(-1), todayStr],
      rest: [addD(-6)],
    },
  ],
});
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
    await page.waitForSelector('[data-hb-row="a"] .hb-hist-btn');
    await page.waitForTimeout(300);

    // Nút chữ "Xem lịch sử" thay cho biểu tượng cũ; không còn nút biểu tượng ở cột thao tác.
    const btn = await page.evaluate(() => {
      const b = document.querySelector('[data-hb-row="a"] .hb-hist-btn');
      const r = b.getBoundingClientRect();
      return { text: b.textContent.trim(), h: r.height, iconsLeft: document.querySelectorAll('[data-hb-row="a"] .hb-act[data-hb-history]').length };
    });
    assert.equal(btn.text, 'Xem lịch sử', 'nút có nhãn chữ' + at);
    assert.ok(btn.h >= 44, 'nút Xem lịch sử đủ vùng chạm' + at + ' ' + btn.h);
    assert.equal(btn.iconsLeft, 0, 'không còn nút biểu tượng lịch sử ở cột thao tác' + at);

    await page.click('[data-hb-row="a"] .hb-hist-btn');
    await page.waitForSelector('#editor[open] .hb-hist-grid');
    const r28 = await page.evaluate(() => ({
      cells: document.querySelectorAll('.hb-hist-cell').length,
      rate: document.querySelector('.hb-hist-rate')?.textContent.replace(/\s+/g, ' ').trim(),
      sum: document.querySelector('.hb-hist-sum').textContent.replace(/\s+/g, ' ').trim(),
      on: document.querySelector('.hb-hist-days.is-on')?.textContent.trim(),
      overflow: document.documentElement.scrollWidth > innerWidth,
      sizes: Array.from(document.querySelectorAll('.hb-hist-days')).map((b) => b.getBoundingClientRect().height),
    }));
    assert.equal(r28.cells, 28, '28 ô mặc định' + at);
    assert.equal(r28.on, '28 ngày', 'đang chọn 28 ngày' + at);
    assert.match(r28.sum, /đã làm 5\/28 ngày/, 'số ngày đã làm đúng' + at);
    assert.match(r28.rate, /Tỷ lệ 19% \(không tính ngày nghỉ\) · chuỗi dài nhất 5 ngày/, 'tỷ lệ và chuỗi dài nhất đúng (28 ngày)' + at + ' ' + r28.rate);
    assert.equal(r28.overflow, false, 'báo cáo không tràn ngang' + at);
    assert.ok(r28.sizes.every((x) => x >= 44), 'nút chọn khoảng thời gian đủ vùng chạm' + at);

    await page.click('[data-hb-hist-days="90"]');
    await page.waitForFunction(() => document.querySelectorAll('.hb-hist-cell').length === 90);
    const r90 = await page.evaluate(() => ({
      on: document.querySelector('.hb-hist-days.is-on')?.textContent.trim(),
      rate: document.querySelector('.hb-hist-rate')?.textContent.replace(/\s+/g, ' ').trim(),
      sum: document.querySelector('.hb-hist-sum').textContent.replace(/\s+/g, ' ').trim(),
    }));
    assert.equal(r90.on, '90 ngày', 'chuyển sang 90 ngày' + at);
    assert.match(r90.rate, /Tỷ lệ 6% \(không tính ngày nghỉ\) · chuỗi dài nhất 5 ngày/, 'tỷ lệ 90 ngày đúng' + at + ' ' + r90.rate);
    assert.match(r90.sum, /đã làm 5\/90 ngày/, 'tóm tắt 90 ngày đúng' + at);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await page.context().close();
  }
  console.log('PASS báo cáo riêng của việc: nút Xem lịch sử, 28/90 ngày, tỷ lệ và chuỗi dài nhất (390 chạm, 820, 1440px)');
} finally {
  await h.close();
}
