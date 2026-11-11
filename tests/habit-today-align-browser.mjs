// Hồi quy v1.65.0: ô "hôm nay" của Việc hằng ngày từng bị đẩy thấp hơn 9–14px so với các ngày khác trong tuần
// (chấm đánh dấu dưới nhãn ngày chỉ có ở ô hôm nay nên làm ô đó cao hơn). Nay vòng tròn của mọi ngày cùng một hàng phải thẳng hàng.
// Kiểm ở 390 (chạm), 820, 1440 px, cả khi ngày hôm nay đã tích và chưa tích, nhiều việc cùng lúc.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [
    { id: 'a', name: 'Giặt đồ', icon: '💧', color: '#3a6fb0', createdAt: '2026-01-01', goal: 7, done: [] },
    { id: 'b', name: 'Tưới cây', icon: '🌿', color: '#2f7d4f', createdAt: '2026-01-01', goal: 7, done: [] },
  ],
});
const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'habits');
    await page.waitForSelector('.hb-cell.is-today');
    for (const phase of ['chưa tích', 'đã tích hôm nay']) {
      if (phase === 'đã tích hôm nay') {
        await page.click('[data-hb-row="a"] .hb-cell.is-today .hb-check');
        await page.waitForSelector('[data-hb-row="a"] .hb-cell.is-today .hb-check.is-done');
        // Đợi hết hiệu ứng nảy của vòng tròn vừa tích (đang chạy thì kích thước đo được tạm thời lớn hơn).
        await page.waitForFunction(() => !document.querySelector('.hb-pop'));
        await page.waitForTimeout(400);
      }
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('.hb-row')].map((row) => ({
          id: row.dataset.hbRow,
          tops: [...row.querySelectorAll('.hb-cell .hb-check')].map((c) => Math.round(c.getBoundingClientRect().top * 10) / 10),
          sizes: [...row.querySelectorAll('.hb-cell .hb-check')].map((c) => Math.round(c.getBoundingClientRect().height)),
        })),
      );
      assert.equal(rows.length, 2, 'đủ 2 việc' + at);
      for (const r of rows) {
        assert.equal(r.tops.length, 7, 'đủ 7 ô ngày' + at);
        assert.ok(Math.max(...r.tops) - Math.min(...r.tops) <= 0.5, `vòng tròn việc ${r.id} lệch hàng (${phase}): ${r.tops.join(', ')}` + at);
        assert.ok(new Set(r.sizes).size === 1, `vòng tròn việc ${r.id} khác cỡ (${phase})` + at);
      }
    }
    await context.close();
  }
  console.log('PASS: vòng tròn ngày hôm nay thẳng hàng với các ngày khác ở 390/820/1440px.');
} finally {
  await h.close();
}
