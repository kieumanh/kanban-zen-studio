// Hồi quy v1.16.6: chế độ xem "Dòng thời gian" đã được gỡ hoàn toàn khỏi giao diện (menu, thanh chế độ xem điện thoại, hướng dẫn),
// còn Bảng Kanban / Lịch / Gantt vẫn dùng được; dữ liệu ngày bắt đầu / kết thúc của việc không đổi.
import assert from 'node:assert/strict';
import { startHarness, defaultSeed } from './lib/browser-harness.mjs';

const seed = () => {
  const w = defaultSeed();
  const t = w.projects[0].tasks[0];
  t.start = '2026-11-01T09:00';
  t.end = '2026-11-03T17:00';
  return w;
};
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 700 });
    const at = ` (${width}px)`;
    await h.show(page, 'projects');

    // 1. Menu bên trái và thanh chế độ xem điện thoại chỉ còn 3 chế độ, đủ chữ, một hàng, không bị cắt.
    const names = await page.evaluate(() => ({
      sidebar: [
        ...document.querySelectorAll('.sidebar .view-options .view-mode'),
      ].map((b) => b.dataset.view),
      phone: [...document.querySelectorAll('.mobile-viewbar .view-mode')].map(
        (b) => b.dataset.view,
      ),
    }));
    assert.deepEqual(
      names.sidebar,
      ['projects', 'calendar', 'gantt'],
      'menu bên trái' + at + JSON.stringify(names.sidebar),
    );
    assert.deepEqual(
      names.phone,
      ['projects', 'calendar', 'gantt'],
      'thanh điện thoại' + at + JSON.stringify(names.phone),
    );
    const visible = await page.evaluate(() => {
      const bar = [
        ...document.querySelectorAll('.mobile-viewbar, .sidebar .view-options'),
      ].find((el) => el.getBoundingClientRect().width > 0);
      const buttons = [...bar.querySelectorAll('.view-mode')].map((b) => {
        const r = b.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          top: Math.round(r.top),
          clipped: b.scrollWidth > b.clientWidth + 1,
        };
      });
      return {
        buttons,
        vw: innerWidth,
        right: Math.max(
          ...[...bar.querySelectorAll('.view-mode')].map(
            (b) => b.getBoundingClientRect().right,
          ),
        ),
      };
    });
    assert.equal(visible.buttons.length, 3, 'số nút chế độ xem' + at);
    assert.ok(
      visible.buttons.every((b) => b.w >= 44 && !b.clipped),
      'nút bị hẹp hoặc bị cắt' + at + JSON.stringify(visible.buttons),
    );
    assert.ok(visible.right <= visible.vw, 'thanh chế độ xem tràn ngang' + at);
    if (width < 700)
      assert.equal(
        new Set(visible.buttons.map((b) => b.top)).size,
        1,
        'ba nút phải nằm một hàng' + at,
      );

    // 2. Không còn hàm, nội dung hay chữ nào nhắc tới Dòng thời gian trên các màn hình còn lại và trong hướng dẫn.
    assert.equal(
      await page.evaluate(() => typeof workTimeline),
      'undefined',
      'workTimeline còn tồn tại' + at,
    );
    for (const v of ['dashboard', 'projects', 'budget', 'calendar', 'gantt']) {
      await h.show(page, v);
      const text = await page.evaluate(
        () =>
          document.body.innerText +
          ' ' +
          document.querySelector('#crumb').textContent,
      );
      assert.ok(
        !/Dòng thời gian/i.test(text),
        'còn chữ "Dòng thời gian" ở màn ' + v + at,
      );
    }
    await page.evaluate(() => help());
    assert.ok(
      !/Dòng thời gian/i.test(await page.locator('dialog[open]').innerText()),
      'hướng dẫn còn nhắc Dòng thời gian' + at,
    );
    await page.keyboard.press('Escape');

    // 3. Đường dẫn cũ go('timeline') (nếu còn nơi nào gọi) rơi về Bảng Kanban thay vì màn trống.
    await page.evaluate(() => go('timeline', 'p1'));
    assert.equal(
      await page.evaluate(() => view),
      'projects',
      'go(timeline) phải về Bảng Kanban' + at,
    );
    assert.ok(
      await page.locator('#main h1').count(),
      'màn Bảng Kanban không vẽ ra' + at,
    );

    // 4. Lịch và Gantt còn dùng được và dữ liệu ngày của việc không đổi.
    await h.show(page, 'calendar');
    assert.ok(
      await page.locator('#main h1', { hasText: 'Lịch' }).count(),
      'Lịch' + at,
    );
    assert.ok(
      (await page.locator('.zen-unscheduled').count()) === 1,
      'Chưa lên lịch trong Lịch' + at,
    );
    await h.show(page, 'gantt');
    assert.ok((await page.locator('.gantt-svg').count()) >= 1, 'Gantt' + at);
    assert.deepEqual(
      await page.evaluate(() => [
        project('p1').tasks[0].start,
        project('p1').tasks[0].end,
      ]),
      ['2026-11-01T09:00', '2026-11-03T17:00'],
      'dữ liệu ngày bị đổi' + at,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: Dòng thời gian đã gỡ; Kanban / Lịch / Gantt còn nguyên; dữ liệu ngày không đổi (390/820/1440px).',
  );
} finally {
  await h.close();
}
