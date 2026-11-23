// Hồi quy v1.17.5: nút vào Chế độ tập trung trong hộp công việc có chữ rõ ràng ("Chế độ tập trung"), không bị cắt, thẳng hàng với tiêu đề và bấm vào mở đúng việc.
// v2.77.0 (Khung Gọn): từ ≤600px cả ba nút của hàng tiêu đề (Ghim, Liên hoàn lệnh, Chế độ tập trung) chỉ còn icon, vì ở 390px ba nút có nhãn
// ép chữ tiêu đề còn ~75px và bị nút đè. Nên ở ≤600px nút này vẫn có tên đọc (aria-label) nhưng không còn chữ; từ 601px vẫn có chữ như cũ.
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
    const compact = width <= 600;
    assert.equal(
      (await button.innerText()).trim(),
      compact ? '' : 'Chế độ tập trung',
      (compact ? 'điện thoại: nút chỉ còn icon' : 'chữ trên nút') + at,
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
      (compact ? m.w >= 40 && m.w <= 48 : m.w > 100) && m.h >= 40,
      (compact
        ? 'nút icon vuông 40–48px'
        : 'nút phải là nút có chữ, cao ≥40px') +
        at +
        JSON.stringify(m),
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
    'PASS: nút Chế độ tập trung (chữ từ 601px, icon ≤600px), không bị cắt, thẳng hàng với tiêu đề và mở đúng việc (390/820/1440px).',
  );
} finally {
  await h.close();
}
