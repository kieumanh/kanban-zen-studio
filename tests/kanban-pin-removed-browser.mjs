// Hồi quy v1.18.4: thẻ công việc ở bảng Kanban không còn nút ghim (390/820/1440px); việc đã ghim trước đó không mất — vẫn hiện ở mục Pin thanh bên và bấm × vẫn bỏ ghim.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 4);
  p.tasks[0].pinned = true;
  p.tasks[0].title = 'Việc đã ghim trước đó';
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 700 });
    const at = ` (${width}px)`;
    await h.show(page, 'projects');
    await page.waitForSelector('#main .task-card');
    assert.equal(
      await page.locator('#main .zen-task-pin').count(),
      0,
      'không còn nút ghim trên thẻ' + at,
    );
    assert.equal(
      await page
        .locator(
          '#main [aria-label="Ghim công việc"], #main [aria-label="Bỏ ghim công việc"]',
        )
        .count(),
      0,
      'không còn nút ghim/bỏ ghim trên thẻ' + at,
    );
    assert.equal(
      await page.locator('#main .wf-card-head-pinned').count(),
      0,
      'đầu thẻ không còn kiểu ghim' + at,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang' + at,
    );
    // Việc đã ghim trước đó vẫn được giữ: hiện ở mục Pin và bỏ được bằng ×.
    const pinned = page.locator('#side-pinned-tasks [data-zen-task-unpin]');
    if (width < 1000)
      await page.evaluate(() =>
        document.querySelector('.sidebar')?.classList.add('open'),
      );
    await pinned.first().waitFor({ state: 'attached' });
    assert.equal(
      await pinned.count(),
      1,
      'việc đã ghim vẫn hiện ở mục Pin' + at,
    );
    await pinned.first().click();
    await page.waitForFunction(() => project('p1').tasks[0].pinned === false);
    assert.equal(
      await page.evaluate(() => project('p1').tasks[0].title),
      'Việc đã ghim trước đó',
      'tên việc không đổi sau khi bỏ ghim' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: thẻ công việc không còn nút ghim; việc đã ghim vẫn hiện ở mục Pin và bỏ ghim được (390/820/1440px).',
  );
} finally {
  await h.close();
}
