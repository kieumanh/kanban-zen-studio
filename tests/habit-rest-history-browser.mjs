// v1.33.0: "Nghỉ hôm nay" (ngày nghỉ không làm đứt chuỗi, không tính là đã làm) và "Lịch sử" 28 ngày của một việc.
// Kiểm tra ở 390 (chạm), 820, 1440px; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

// Ngày "hôm nay" của ứng dụng là ngày theo giờ Việt Nam (today()), không phải UTC:
// từ 00:00 đến 07:00 giờ Việt Nam, ngày UTC vẫn là hôm qua nên việc "đã làm hôm nay" bị lệch.
const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const addD = (n) =>
  new Date(Date.parse(todayStr + 'T12:00:00Z') + n * 864e5)
    .toISOString()
    .slice(0, 10);
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [
    {
      id: 'a',
      name: 'Thiền 10 phút',
      icon: '🧘',
      color: '#7950c8',
      createdAt: addD(-20),
      goal: 7,
      done: [addD(-2), addD(-1)],
    },
    {
      id: 'b',
      name: 'Uống đủ nước',
      icon: '💧',
      color: '#3a6fb0',
      createdAt: addD(-20),
      goal: 5,
      done: [todayStr],
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
    await page.waitForSelector('[data-hb-row="a"]');

    // Việc đã làm hôm nay không có nút nghỉ.
    assert.equal(
      await page.locator('[data-hb-row="b"] [data-hb-rest]').count(),
      0,
      'việc đã làm hôm nay không hiện nút nghỉ' + at,
    );
    assert.equal(
      await page.locator('[data-hb-row="a"] [data-hb-rest]').count(),
      1,
      'việc chưa làm hôm nay có nút nghỉ' + at,
    );

    // Nghỉ hôm nay: chuỗi 2 ngày vẫn giữ nguyên, ô hôm nay là ngày nghỉ.
    await page.click('[data-hb-row="a"] [data-hb-rest]');
    await page.waitForSelector('[data-hb-row="a"] [data-hb-rest].is-on');
    const after = await page.evaluate(() => ({
      rest: window.zenHabits.list().find((x) => x.id === 'a').rest,
      streak: document
        .querySelector('[data-hb-row="a"] .hb-streak')
        .textContent.trim(),
      restCell: !!document.querySelector('[data-hb-row="a"] .hb-cell.is-rest'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.deepEqual(after.rest, [todayStr], 'ngày nghỉ được lưu' + at);
    assert.match(
      after.streak,
      /Chuỗi 2 ngày/,
      'ngày nghỉ không làm đứt chuỗi' + at,
    );
    assert.ok(after.restCell, 'ô hôm nay hiện là ngày nghỉ' + at);
    assert.equal(after.overflow, false, 'không tràn ngang' + at);

    // Bỏ nghỉ.
    await page.click('[data-hb-row="a"] [data-hb-rest]');
    await page.waitForSelector('[data-hb-row="a"] [data-hb-rest]:not(.is-on)');
    assert.deepEqual(
      await page.evaluate(
        () => window.zenHabits.list().find((x) => x.id === 'a').rest || [],
      ),
      [],
      'bỏ nghỉ xóa ngày nghỉ' + at,
    );

    // Lịch sử: mở hộp thoại có 28 ô và ghi nhận ngày đã làm.
    await page.click('[data-hb-row="a"] [data-hb-history]');
    await page.waitForSelector('#editor[open] .hb-hist-grid');
    const hist = await page.evaluate(() => ({
      cells: document.querySelectorAll('.hb-hist-cell').length,
      done: document.querySelectorAll('.hb-hist-cell.is-done').length,
      sum: document.querySelector('.hb-hist-sum').textContent.trim(),
    }));
    assert.equal(hist.cells, 28, 'lịch sử có 28 ô' + at);
    assert.equal(hist.done, 2, 'lịch sử đánh dấu 2 ngày đã làm' + at);
    assert.match(hist.sum, /đã làm 2\/28/, 'tóm tắt đúng' + at);
    await page.keyboard.press('Escape');
    await page.context().close();
  }
  console.log('PASS nghỉ hôm nay và lịch sử việc (390/820/1440px)');
} finally {
  await h.close();
}
