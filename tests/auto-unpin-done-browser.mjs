// Hồi quy v1.46.0: việc đã hoàn thành (cột Xong) được tự gỡ ghim khỏi khu "Ghim công việc" ở thanh bên.
// Việc đang mở vẫn giữ ghim; ghim việc đang mở vẫn hoạt động. Kiểm ở 390 (chạm), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Việc đang mở';
  p.tasks[0].col = 'Doing';
  p.tasks[0].pinned = true;
  p.tasks[1].title = 'Sắp hoàn thành';
  p.tasks[1].col = 'Doing';
  p.tasks[1].pinned = true;
  p.tasks[2].title = 'Đã xong từ trước';
  p.tasks[2].col = 'Done';
  p.tasks[2].pinned = true;
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
const pinnedTitles = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#side-pinned-tasks .zen-pin-task-title')].map((el) => el.textContent.trim()),
  );
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    await h.show(page, 'board');

    // Lưu lần đầu: việc Xong còn ghim (từ trước) được gỡ; việc đang mở vẫn ghim.
    await page.evaluate(() => save());
    assert.deepEqual(
      await page.evaluate(() => project('p1').tasks.map((t) => !!t.pinned)),
      [true, true, false],
      'việc Xong từ trước được gỡ ghim khi lưu; việc đang mở giữ ghim' + at,
    );
    await page.evaluate(() => render());
    assert.deepEqual(await pinnedTitles(page), ['Việc đang mở', 'Sắp hoàn thành'], 'thanh bên chỉ còn việc đang mở' + at);

    // Hoàn thành một việc đang ghim: việc đó tự rời khỏi khu ghim.
    await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[1], 'Done'));
    await page.waitForFunction(() => project('p1').tasks[1].pinned === false);
    assert.deepEqual(await pinnedTitles(page), ['Việc đang mở'], 'việc vừa xong rời khỏi thanh bên' + at);
    assert.equal(
      await page.evaluate(() => project('p1').tasks[0].pinned),
      true,
      'việc đang mở khác vẫn ghim' + at,
    );

    // Ghim một việc đang mở vẫn hoạt động bình thường.
    await page.evaluate(() => {
      const t = project('p1').tasks[1];
      t.col = 'Doing';
      t.pinned = true;
      save();
      render();
    });
    assert.deepEqual(await pinnedTitles(page), ['Việc đang mở', 'Sắp hoàn thành'], 'ghim lại việc đang mở vẫn hiện' + at);

    // Bỏ ghim thủ công vẫn được.
    await page.evaluate(() => {
      project('p1').tasks[0].pinned = false;
      save();
      render();
    });
    assert.deepEqual(await pinnedTitles(page), ['Sắp hoàn thành'], 'bỏ ghim thủ công vẫn hoạt động' + at);

    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'không tràn ngang' + at,
    );
    await context.close();
  }
  console.log('PASS: việc đã Xong tự gỡ ghim khỏi thanh bên khi lưu; việc đang mở giữ ghim; ghim và bỏ ghim thủ công vẫn đúng (390 chạm, 820, 1440px).');
} finally {
  await h.close();
}
