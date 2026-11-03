// Hồi quy v1.18.3: "Giao diện" và "Dung lượng dữ liệu" trong Cài đặt đóng sẵn như các nhóm khác; bấm tiêu đề mới thấy nội dung và đổi giao diện vẫn hoạt động; không tràn ngang ở 390/820/1440px.
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
    await h.show(page, 'board');
    await page.evaluate(() => {
      accountPanel();
    });
    await page.waitForSelector('#editor-body #storage-capacity', {
      state: 'attached',
    });
    const groups = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '#editor-body details.zen-settings-collapse',
        ),
      ].map((d) => ({
        title: d.querySelector('summary').textContent,
        open: d.open,
      })),
    );
    assert.deepEqual(
      groups,
      [
        { title: 'Giao diện', open: false },
        { title: 'Dung lượng dữ liệu', open: false },
      ],
      'hai nhóm đóng sẵn' + at,
    );
    assert.equal(
      await page
        .locator('#editor-body .settings-theme .zen-theme-choice')
        .first()
        .isVisible(),
      false,
      'nội dung Giao diện ẩn khi chưa bấm' + at,
    );
    const meterHiddenBefore = await page
      .locator('#editor-body #storage-capacity meter')
      .first()
      .isVisible()
      .catch(() => false);
    assert.equal(
      meterHiddenBefore,
      false,
      'số liệu dung lượng ẩn khi chưa bấm' + at,
    );

    await page
      .locator('#editor-body details.zen-settings-collapse', {
        hasText: 'Giao diện',
      })
      .locator('summary')
      .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('#editor-body .settings-theme')
          .closest('details').open,
    );
    await page
      .locator('#editor-body .settings-theme .zen-theme-choice', {
        hasText: 'Tối',
      })
      .click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('zen-theme')),
      'dark',
      'chọn Tối vẫn lưu giao diện' + at,
    );
    await page
      .locator('#editor-body details.zen-settings-collapse', {
        hasText: 'Dung lượng dữ liệu',
      })
      .locator('summary')
      .click();
    await page.waitForSelector('#editor-body #storage-capacity meter', {
      state: 'attached',
    });
    assert.equal(
      await page
        .locator('#editor-body #storage-capacity meter')
        .first()
        .isVisible(),
      true,
      'mở ra thì thấy dung lượng' + at,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang không tràn ngang' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: Giao diện và Dung lượng dữ liệu trong Cài đặt đóng sẵn, bấm tiêu đề mới mở; chọn giao diện vẫn lưu (390/820/1440px).',
  );
} finally {
  await h.close();
}
