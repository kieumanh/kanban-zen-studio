// Hồi quy v1.17.3: "Tất cả công việc" có chip lọc nhanh theo thời hạn/trạng thái với số lượng, dùng chung bộ lọc "Thời hạn";
// bảng có chip trạng thái thẳng hàng, không tràn ngang ở 390/820/1440px (sáng và tối).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 12),
    makeProject('p2', 'Hương Thiền', '#d65380', 6),
  ],
  notes: [],
});
const h = await startHarness({ seed });
try {
  for (const [width, scheme] of [
    [390, 'light'],
    [820, 'light'],
    [1440, 'light'],
    [1440, 'dark'],
  ]) {
    const { context, page } = await h.open(width, {
      touch: width < 700,
      colorScheme: scheme,
    });
    const at = ` (${width}px ${scheme})`;
    // Dữ liệu xác định, không phụ thuộc ngày chạy: 4 quá hạn, 2 hôm nay, 3 trong 7 ngày tới, 2 đang làm không hạn, còn lại xa hoặc đã xong.
    await page.evaluate(() => {
      const shift = (n) =>
        new Date(Date.parse(today() + 'T00:00:00Z') + n * 86400000)
          .toISOString()
          .slice(0, 10);
      const all = data.projects.flatMap((p) => p.tasks);
      all.forEach((t, i) => {
        t.start = '';
        t.end = '';
        t.col = 'List';
        t.due =
          i < 4 ? shift(-2) : i < 6 ? shift(0) : i < 9 ? shift(3) : shift(40);
      });
      all[9].col = 'Doing';
      all[10].col = 'Doing';
      all[11].col = 'Done';
      render();
    });
    await h.show(page, 'tasks');
    await page.waitForSelector('.zen-task-chip');
    const expected = await page.evaluate(() => {
      const base = allTasks();
      return {
        all: base.length,
        today: base.filter((t) => dashboardDateMatches(t, 'today')).length,
        overdue: base.filter((t) => dashboardDateMatches(t, 'overdue')).length,
        upcoming: base.filter((t) => dashboardDateMatches(t, 'upcoming'))
          .length,
        doing: base.filter((t) => dashboardDateMatches(t, 'doing')).length,
      };
    });
    const chips = await page.evaluate(() =>
      [...document.querySelectorAll('.zen-task-chip')].map((c) => ({
        label: c.firstChild.textContent.trim(),
        count: Number(c.querySelector('b').textContent),
        pressed: c.getAttribute('aria-pressed'),
        h: Math.round(c.getBoundingClientRect().height),
      })),
    );
    assert.deepEqual(
      chips.map((c) => c.label),
      ['Tất cả', 'Hôm nay', 'Quá hạn', 'Sắp đến hạn', 'Đang thực hiện'],
      'nhãn chip' + at,
    );
    assert.deepEqual(
      chips.map((c) => c.count),
      [
        expected.all,
        expected.today,
        expected.overdue,
        expected.upcoming,
        expected.doing,
      ],
      'số lượng chip' + at + JSON.stringify(chips),
    );
    assert.ok(
      expected.overdue >= 4 && expected.upcoming >= 3 && expected.doing >= 2,
      'dữ liệu thử' + at,
    );
    assert.deepEqual(
      chips.map((c) => c.pressed),
      ['true', 'false', 'false', 'false', 'false'],
    );
    assert.ok(
      chips.every((c) => c.h >= 44),
      'chip thấp hơn 44px' + at,
    );

    // Bấm "Quá hạn": chỉ còn việc quá hạn; ô "Thời hạn" khớp; chip giữ tiêu điểm.
    await page.locator('[data-zen-chip="overdue"]').click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('.zen-task-chip[data-kind="overdue"]')
          ?.getAttribute('aria-pressed') === 'true',
    );
    const filtered = await page.evaluate(() => ({
      rows: document.querySelectorAll('#main .task-table tbody tr').length,
      allOverdue: [
        ...document.querySelectorAll('#main .task-table tbody tr'),
      ].every((r) => r.classList.contains('zen-row-overdue')),
      select: document.querySelector('#dashboard-due-filter')?.value,
      focus: document.activeElement?.dataset.zenChip,
      chips: document.querySelectorAll('.zen-task-chips').length,
    }));
    assert.equal(
      filtered.rows,
      expected.overdue,
      'số hàng sau khi lọc quá hạn' + at,
    );
    assert.ok(filtered.allOverdue, 'còn hàng không quá hạn' + at);
    assert.equal(filtered.select, 'overdue', 'ô Thời hạn không khớp chip' + at);
    assert.equal(filtered.focus, 'overdue', 'chip mất tiêu điểm' + at);
    assert.equal(filtered.chips, 1, 'hàng chip bị nhân đôi' + at);
    // Đang thực hiện, rồi về Tất cả.
    await page.locator('[data-zen-chip="doing"]').click();
    await page.waitForFunction(
      (n) =>
        document.querySelectorAll('#main .task-table tbody tr').length === n,
      expected.doing,
    );
    await page.locator('[data-zen-chip=""]').click();
    await page.waitForFunction(
      (n) =>
        document.querySelectorAll('#main .task-table tbody tr').length === n,
      expected.all,
    );
    assert.equal(
      await page.evaluate(
        () => document.querySelector('#dashboard-due-filter').value,
      ),
      '',
      'về Tất cả' + at,
    );

    // Bảng: chip trạng thái có chấm màu và thẳng hàng; không tràn ngang.
    const table = await page.evaluate(() => {
      const chips = [
        ...document.querySelectorAll(
          '#main .task-table td[data-label="Trạng thái"] .status',
        ),
      ];
      const lefts = new Set(
        chips.map((c) => Math.round(c.getBoundingClientRect().left)),
      );
      return {
        dot: getComputedStyle(chips[0], '::before').content,
        lefts: lefts.size,
        overflow: document.documentElement.scrollWidth > innerWidth,
        tableOverflow: (() => {
          const w = document.querySelector('#main .table-wrap');
          return w.scrollWidth > w.clientWidth + 1;
        })(),
      };
    });
    assert.equal(table.dot, '""', 'chấm trạng thái' + at);
    if (width >= 1181)
      assert.equal(table.lefts, 1, 'chip trạng thái không thẳng hàng' + at);
    assert.ok(!table.overflow && !table.tableOverflow, 'tràn ngang' + at);
    await context.close();
  }
  console.log(
    'PASS: chip lọc nhanh có số lượng, đồng bộ với ô Thời hạn; bảng thẳng hàng, không tràn (390/820/1440px, sáng/tối).',
  );
} finally {
  await h.close();
}
