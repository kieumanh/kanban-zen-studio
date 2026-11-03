// Hồi quy v1.19.8: trình sửa checklist trong Chế độ tập trung không được giật con trỏ khỏi ô người dùng đã chuyển tới.
// Sau Xóa/Hoàn tác, vẽ lại checklist hẹn một khung hình (requestAnimationFrame) để đưa con trỏ về ô mong muốn. Khi khung hình đến trễ (CI chậm),
// nó từng giật con trỏ khỏi ô "Thêm mục mới" ngay lúc gõ Enter nên mục không được thêm (lỗi chập chờn ở focus-edit-browser.mjs:221 trên CI).
// Ở đây làm trễ requestAnimationFrame 250ms để tái hiện ổn định. Hành vi bình thường (khi không ai chuyển ô) vẫn phải đưa con trỏ về đúng chỗ.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Liên hệ địa điểm', done: false },
    { id: 'c2', text: 'Soạn chương trình', done: false },
    { id: 'c3', text: 'In tài liệu', done: false },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
const active = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return a
      ? a.matches('[data-fe-new]')
        ? 'add'
        : a.closest('.zen-fe-row')
          ? 'row:' + a.closest('.zen-fe-row').dataset.feId
          : a.tagName.toLowerCase()
      : 'none';
  });

try {
  for (const width of [390, 820, 1440]) {
    const at = ` (${width}px)`;

    // A. Khung hình trễ: người dùng chuyển sang ô Thêm mục mới thì con trỏ ở yên đó và Enter thêm được mục.
    {
      const { context, page } = await h.open(width, {
        touch: width < 700,
        setup: async ({ context }) => {
          await context.addInitScript(() => {
            const raf = window.requestAnimationFrame.bind(window);
            window.requestAnimationFrame = (cb) =>
              setTimeout(() => raf(cb), 250);
          });
        },
      });
      await h.show(page, 'projects');
      await page.evaluate(() => {
        _WF.focus = { p: 'p1', t: 'p1t0' };
        go('focus');
      });
      await page.locator('[data-fe-edit]').click();
      await page.waitForSelector('.zen-fe-form');
      await page.waitForTimeout(500);

      await page
        .locator('.zen-fe-row[data-fe-id="c1"] [data-fe-remove]')
        .click();
      await page.waitForFunction(
        () => project('p1').tasks[0].checks.length === 2,
      );
      await page.locator('[data-fe-undo]').click();
      await page.waitForFunction(
        () => project('p1').tasks[0].checks.length === 3,
      );
      const add = page.locator('.zen-fe-form [data-fe-new]');
      await add.fill('Gửi lời mời'); // ngay sau Hoàn tác, khi khung hình hẹn trước vẫn chưa chạy
      await page.waitForTimeout(600); // để khung hình trễ chạy
      assert.equal(
        await active(page),
        'add',
        'khung hình trễ giật con trỏ khỏi ô Thêm mục mới' + at,
      );
      assert.equal(
        await add.inputValue(),
        'Gửi lời mời',
        'chữ đang gõ bị mất' + at,
      );
      await add.press('Enter');
      await page.waitForFunction(
        () => project('p1').tasks[0].checks.length === 4,
        null,
        { timeout: 5000 },
      );
      assert.equal(
        await page.evaluate(() => project('p1').tasks[0].checks.at(-1).text),
        'Gửi lời mời',
        at,
      );
      await context.close();
    }

    // B. Bình thường (không ai chuyển ô): Xóa đưa con trỏ về ô Thêm mục mới; Hoàn tác đưa về đúng mục vừa khôi phục.
    {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await h.show(page, 'projects');
      await page.evaluate(() => {
        _WF.focus = { p: 'p1', t: 'p1t0' };
        go('focus');
      });
      await page.locator('[data-fe-edit]').click();
      await page.waitForSelector('.zen-fe-form');
      await page.waitForTimeout(300);
      await page
        .locator('.zen-fe-row[data-fe-id="c1"] [data-fe-remove]')
        .click();
      await page.waitForFunction(
        () => document.activeElement?.matches('[data-fe-new]'),
        null,
        { timeout: 5000 },
      );
      await page.locator('[data-fe-undo]').click();
      await page.waitForFunction(
        () =>
          document.activeElement?.closest('.zen-fe-row')?.dataset.feId === 'c1',
        null,
        { timeout: 5000 },
      );
      assert.equal(
        await active(page),
        'row:c1',
        'Hoàn tác phải đưa con trỏ về mục vừa khôi phục' + at,
      );
      await context.close();
    }
  }
  console.log(
    'PASS: khung hình trễ không giật con trỏ khỏi ô Thêm mục mới; Xóa/Hoàn tác vẫn đưa con trỏ về đúng chỗ (390/820/1440px).',
  );
} finally {
  await h.close();
}
