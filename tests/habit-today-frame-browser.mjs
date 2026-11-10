// Hồi quy v1.50.1: khung đánh dấu ô "hôm nay" của việc hằng ngày chỉ cao thêm, không tràn ngang sang hai bên.
// Trước đây khung tràn 4px mỗi bên nên đè lên vòng tròn của ngày kế bên (các vòng 44px cách nhau khoảng 1.4px).
// Kiểm ở 390 (chạm), 820, 1440 px: khung đúng bề rộng cột, không chồng vòng của ngày khác, bao trọn vòng và nhãn ngày.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Farm', '#7950c8', 2)],
  notes: [],
  dailyHabits: [{ id: 'a', name: 'Giặt đồ', icon: '💧', color: '#3a6fb0', createdAt: '2026-01-01', goal: 7, done: [] }],
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
    await page.waitForSelector('[data-hb-row="a"] .hb-cell.is-today');

    const m = await page.evaluate(() => {
      const row = document.querySelector('[data-hb-row="a"]');
      const cells = [...row.querySelectorAll('.hb-cell')];
      const todayIdx = cells.findIndex((c) => c.classList.contains('is-today'));
      const cell = cells[todayIdx];
      const cs = getComputedStyle(cell, '::before');
      const cellBox = cell.getBoundingClientRect();
      const frameL = cellBox.left + parseFloat(cs.left);
      const frameR = cellBox.right - parseFloat(cs.right);
      const frameT = cellBox.top + parseFloat(cs.top);
      const frameB = cellBox.bottom - parseFloat(cs.bottom);
      const check = (c) => c.querySelector('.hb-check').getBoundingClientRect();
      const label = cell.querySelector('.hb-dayname').getBoundingClientRect();
      const neighbours = [cells[todayIdx - 1], cells[todayIdx + 1]].filter(Boolean).map((c) => check(c));
      return {
        frameL,
        frameR,
        frameT,
        frameB,
        todayCheck: check(cell),
        label: { top: label.top, bottom: label.bottom },
        neighbours: neighbours.map((b) => ({ left: b.left, right: b.right })),
        leftNeighbour: todayIdx > 0 ? check(cells[todayIdx - 1]).right : null,
      };
    });

    // 1. Khung không tràn sang cột bên cạnh: khớp bề rộng cột (cạnh trái/phải trùng biên ô).
    const cellBoxWidth = m.frameR - m.frameL;
    assert.ok(cellBoxWidth > 0, 'khung có bề rộng' + at);
    // 2. Không chồng lên vòng tròn của ngày kế bên.
    m.neighbours.forEach((n, i) => {
      const overlaps = m.frameL < n.right - 0.5 && m.frameR > n.left + 0.5;
      assert.equal(overlaps, false, `khung đè lên vòng tròn ngày kế bên (${i === 0 ? 'trái' : 'phải'})` + at);
    });
    // 3. Khung bao trọn vòng tròn của hôm nay và nhãn ngày theo chiều cao.
    assert.ok(m.todayCheck.left >= m.frameL - 0.5 && m.todayCheck.right <= m.frameR + 0.5, 'vòng tròn hôm nay nằm ngoài khung' + at);
    // Nhãn ngày (T2, 10…) chỉ hiện trên điện thoại/máy tính bảng; ở màn rộng nhãn ẩn nên chỉ kiểm vòng tròn.
    if (m.label.bottom > m.label.top) {
      assert.ok(m.frameT <= m.label.top && m.frameB >= m.todayCheck.bottom, 'khung không bao trọn nhãn và vòng tròn hôm nay' + at);
    } else {
      assert.ok(m.frameT <= m.todayCheck.top && m.frameB >= m.todayCheck.bottom, 'khung không bao trọn vòng tròn hôm nay' + at);
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'không tràn ngang' + at,
    );
    await context.close();
  }
  console.log('PASS: khung ô hôm nay đúng bề rộng cột, không đè vòng tròn ngày kế bên, bao trọn nhãn và vòng tròn (390/820/1440px).');
} finally {
  await h.close();
}
