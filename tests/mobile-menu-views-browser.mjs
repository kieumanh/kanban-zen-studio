// Hồi quy v1.19.15: menu điện thoại (390/820px cảm ứng) bỏ mục "Dự án" và hiện khung 3 chế độ xem (Bảng Kanban / Lịch / Gantt)
// trước đây bị ẩn; bấm một chế độ thì chuyển view và đóng menu. Máy tính (1440px) giữ nguyên (không có "Dự án", có khung chế độ xem).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({
  schema: 1,
  projects: [
    makeProject('p1', 'Farm', '#7950c8', 3),
    makeProject('p2', 'Hai', '#c85079', 1),
  ],
  notes: [],
});
const h = await startHarness({ seed });
try {
  for (const width of [390, 600]) {
    const at = ` (${width}px cảm ứng)`;
    const { context, page } = await h.open(width, { touch: true });
    await h.show(page, 'board');
    await page.click('#menu');
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const vis = (el) =>
        !!el &&
        getComputedStyle(el).display !== 'none' &&
        el.getBoundingClientRect().height > 0;
      const side = document.querySelector('.sidebar').getBoundingClientRect();
      const modes = [
        ...document.querySelectorAll('.sidebar .view-options .view-mode'),
      ].map((b) => {
        const r = b.getBoundingClientRect();
        return {
          view: b.dataset.view,
          ok: vis(b) && r.left >= side.left && r.right <= side.right + 1,
          h: r.height,
          w: r.width,
        };
      });
      return {
        projects: vis(document.querySelector('.sidebar .side-projects')),
        group: vis(document.querySelector('.sidebar #view-group')),
        modes,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert.equal(m.projects, false, 'mục "Dự án" còn hiện trong menu' + at);
    assert.equal(m.group, true, 'khung chế độ xem chưa hiện' + at);
    assert.deepEqual(
      m.modes.map((x) => x.view),
      ['projects', 'calendar', 'gantt'],
      at,
    );
    for (const x of m.modes) {
      assert.ok(x.ok, `nút ${x.view} không hiện gọn trong menu` + at);
      assert.ok(x.h >= 44, `nút ${x.view} thấp ${x.h}px` + at);
    }
    assert.ok(!m.overflow, 'tràn ngang' + at);
    await page.click('.sidebar .view-options [data-view=calendar]');
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      view,
      open: document.querySelector('.sidebar').classList.contains('open'),
    }));
    assert.equal(
      after.view,
      'calendar',
      'bấm Lịch không chuyển chế độ xem' + at,
    );
    assert.equal(
      after.open,
      false,
      'menu không đóng sau khi chọn chế độ xem' + at,
    );
    await context.close();
  }
  const { context, page } = await h.open(1440, { touch: false });
  await h.show(page, 'board');
  const desktop = await page.evaluate(() => {
    const shown = (s) => {
      const e = document.querySelector(s);
      return !!e && getComputedStyle(e).display !== 'none';
    };
    return {
      projects: shown('.sidebar .side-projects'),
      group: shown('.sidebar #view-group'),
    };
  });
  assert.deepEqual(
    desktop,
    { projects: false, group: true },
    'giao diện máy tính bị thay đổi',
  );
  await context.close();
  console.log(
    'PASS: menu điện thoại bỏ "Dự án", hiện 3 chế độ xem và chuyển được; máy tính giữ nguyên (390/600/1440px).',
  );
} finally {
  await h.close();
}
