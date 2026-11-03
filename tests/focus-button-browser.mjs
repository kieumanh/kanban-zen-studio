// Hồi quy v1.17.5: nút vào Chế độ tập trung trong hộp công việc có chữ rõ ràng ("Chế độ tập trung"), không bị cắt, thẳng hàng với tiêu đề và bấm vào mở đúng việc.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const h = await startHarness({
  seed: () => ({
    schema: 1,
    projects: [makeProject('p1', 'Dự án A', '#7950c8', 3)],
    notes: [],
  }),
});
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 700 });
    const at = ` (${width}px)`;
    await h.show(page, 'projects');
    await page.evaluate(() =>
      taskDetail(project('p1'), project('p1').tasks[0]),
    );
    const button = page.locator('#editor .task-focus-shortcut');
    await button.waitFor();
    await page.evaluate(() =>
      Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      ),
    );
    assert.equal(
      (await button.innerText()).trim(),
      'Chế độ tập trung',
      'chữ trên nút' + at,
    );
    assert.equal(
      await button.getAttribute('aria-label'),
      'Mở chế độ tập trung',
      'nhãn đọc màn hình' + at,
    );
    const m = await page.evaluate(() => {
      const b = document.querySelector('#editor .task-focus-shortcut'),
        row = b.closest('.wf-task-heading-row'),
        label = row.getBoundingClientRect(),
        r = b.getBoundingClientRect(),
        text = b.querySelector('span');
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        clipped:
          b.scrollWidth > b.clientWidth + 1 ||
          text.scrollWidth > text.clientWidth + 1,
        inside:
          r.left >= label.left &&
          r.right <= label.right + 0.5 &&
          r.top >= label.top &&
          r.bottom <= label.bottom,
        center: Math.abs(r.top + r.height / 2 - (label.top + label.height / 2)),
        wrapped: text.getBoundingClientRect().height > 24,
        hasIcon: !!b.querySelector('svg'),
      };
    });
    assert.ok(m.hasIcon, 'biểu tượng vẫn còn' + at);
    assert.ok(
      m.w > 100 && m.h >= 40,
      'nút phải là nút có chữ, cao ≥40px' + at + JSON.stringify(m),
    );
    assert.ok(
      !m.clipped && !m.wrapped,
      'chữ trên nút bị cắt hoặc xuống dòng' + at + JSON.stringify(m),
    );
    assert.ok(
      m.inside,
      'nút nằm trong khu vực của nó' + at + JSON.stringify(m),
    );
    assert.ok(
      m.center < 2,
      'nút thẳng hàng với tiêu đề' + at + JSON.stringify(m),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang' + at,
    );
    await button.click();
    await page.waitForFunction(
      () => view === 'focus' && _WF.focus?.t === project('p1').tasks[0].id,
    );
    await context.close();
  }
  console.log(
    'PASS: nút Chế độ tập trung có chữ, không bị cắt, thẳng hàng với tiêu đề và mở đúng việc (390/820/1440px).',
  );
} finally {
  await h.close();
}
