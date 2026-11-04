// Hồi quy v1.19.9: khi thoát hộp công việc có thay đổi chưa lưu, bảng "Bạn có thay đổi chưa lưu" phải hiện ngay tại khung nhìn đang đọc
// (đã cuộn xuống checklist vẫn thấy), có nút Lưu; Lưu thì lưu và đóng, Tiếp tục chỉnh sửa thì giữ nguyên, Bỏ thay đổi thì đóng và không lưu.
// 390 / 820 / 1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = Array.from({ length: 6 }, (_, i) => ({
    id: 'c' + i,
    text: 'Mục checklist số ' + (i + 1),
    done: false,
    pct: 0,
  }));
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });

// Cuộn hộp về cuối nội dung rồi sửa tên: đây là lúc người dùng bấm thoát.
const setupDirty = async (page) => {
  await h.show(page, 'board');
  await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
  await page.waitForSelector('#editor-form [name=title]', {
    state: 'attached',
  });
  await page.evaluate(() => {
    const d = document.querySelector('#editor');
    d.scrollTop = d.scrollHeight;
  });
  await page.locator('#editor-form [name=title]').fill('Tên mới chưa lưu');
  await page.waitForTimeout(100);
};
const promptVisible = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('#editor');
    const p = document.querySelector('#editor .task-unsaved-confirm');
    if (!p) return { exists: false };
    const dr = d.getBoundingClientRect();
    const head = document
      .querySelector('#editor .modal-head')
      ?.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const top = head ? head.bottom : dr.top;
    return {
      exists: true,
      inView: pr.top >= top - 1 && pr.bottom <= dr.bottom + 1,
      top: Math.round(pr.top),
      dialogTop: Math.round(top),
      dialogBottom: Math.round(dr.bottom),
      save: p.querySelector('[data-task-save]')?.textContent.trim(),
      buttons: [...p.querySelectorAll('button')].map((b) =>
        b.textContent.trim(),
      ),
      overflow: d.scrollWidth - d.clientWidth,
    };
  });

try {
  for (const width of [390, 820, 1440]) {
    const at = ` (${width}px)`;
    // 1. Bấm X khi đã cuộn xuống: bảng hiện trong khung nhìn, có nút Lưu và hai nút cũ.
    {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await setupDirty(page);
      await page.locator('[data-action="close-modal"]').first().click();
      await page.waitForSelector('#editor .task-unsaved-confirm', {
        timeout: 3000,
      });
      const v = await promptVisible(page);
      assert.equal(v.save, 'Lưu', 'thiếu nút Lưu trong bảng thoát' + at);
      assert.deepEqual(
        v.buttons,
        ['Lưu', 'Tiếp tục chỉnh sửa', 'Bỏ thay đổi'],
        'thứ tự nút' + at,
      );
      assert.ok(
        v.inView,
        'bảng thông báo không hiện trong khung nhìn đang đọc: ' +
          JSON.stringify(v) +
          at,
      );
      assert.equal(v.overflow <= 0, true, 'tràn ngang trong hộp' + at);

      // 2. Tiếp tục chỉnh sửa: bảng đóng, hộp vẫn mở, tên mới còn nguyên.
      await page.locator('[data-task-keep-editing]').click();
      await page.waitForSelector('#editor .task-unsaved-confirm', {
        state: 'detached',
      });
      assert.equal(
        await page.evaluate(() => document.querySelector('#editor').open),
        true,
        'Tiếp tục chỉnh sửa phải giữ hộp mở' + at,
      );
      assert.equal(
        await page.locator('#editor-form [name=title]').inputValue(),
        'Tên mới chưa lưu',
        at,
      );
      await context.close();
    }
    // 3. Lưu từ bảng thoát: lưu đúng tên mới và đóng hộp.
    {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await setupDirty(page);
      await page.locator('[data-action="close-modal"]').first().click();
      await page.waitForSelector('#editor .task-unsaved-confirm', {
        timeout: 3000,
      });
      await page.locator('[data-task-save]').click();
      await page.waitForFunction(
        () => project('p1').tasks[0].title === 'Tên mới chưa lưu',
        null,
        { timeout: 5000 },
      );
      await page.waitForFunction(
        () => !document.querySelector('#editor').open,
        null,
        { timeout: 5000 },
      );
      assert.equal(
        await page.evaluate(() =>
          document.querySelector('#editor .task-unsaved-confirm'),
        ),
        null,
        'bảng còn sót sau khi Lưu' + at,
      );
      await context.close();
    }
    // 4. Bỏ thay đổi: đóng hộp, không lưu.
    {
      const { context, page } = await h.open(width, { touch: width < 700 });
      await setupDirty(page);
      await page.locator('[data-action="close-modal"]').first().click();
      await page.waitForSelector('#editor .task-unsaved-confirm', {
        timeout: 3000,
      });
      await page.locator('[data-task-discard]').click();
      await page.waitForFunction(
        () => !document.querySelector('#editor').open,
        null,
        { timeout: 5000 },
      );
      assert.equal(
        await page.evaluate(() => project('p1').tasks[0].title),
        'Chuẩn bị khóa tu',
        'Bỏ thay đổi mà vẫn lưu' + at,
      );
      await context.close();
    }
  }
  console.log(
    'PASS: bảng thoát hiện trong khung nhìn đang đọc, có nút Lưu; Lưu / Tiếp tục / Bỏ thay đổi đều đúng (390/820/1440px).',
  );
} finally {
  await h.close();
}
