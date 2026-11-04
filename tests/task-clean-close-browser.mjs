// Hồi quy v1.19.14: bấm × trên một việc CHƯA đổi gì (kể cả việc có checklist) thì hộp đóng ngay, không hiện bảng
// "Bạn có thay đổi chưa lưu" sai. Ngược lại, sửa thật (tên việc hoặc chữ trong checklist) vẫn phải hiện bảng,
// và Bỏ thay đổi vẫn đóng hộp. Ghim việc (v1.19.12) không được làm việc đó thành "đã sửa".
// Trước đây: mọi việc có checklist đều bị coi là đã sửa, vì các trường checklist được thêm vào form sau khi chốt mốc ban đầu.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = 'Xây dựng trang Công việc cụ thể của farm';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Phác thảo ý tưởng', done: false, pct: 0 },
    { id: 'c2', text: 'Thêm ảnh minh họa', done: true, pct: 100 },
  ];
  return { schema: 1, projects: [p], notes: [] };
};

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ` (${width}px${touch ? ' cảm ứng' : ''})`;
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'board');

    const open = async () => {
      await page.evaluate(() =>
        taskDetail(project('p1'), project('p1').tasks[0]),
      );
      await page.waitForSelector('#editor-body .compact-check', {
        state: 'attached',
      });
      await page.waitForTimeout(300);
    };
    const pressX = async () => {
      await page.locator('#editor .modal-close-pin').first().click();
      await page.waitForTimeout(400);
    };
    const isOpen = () =>
      page.evaluate(() => document.querySelector('#editor').open);
    const promptShown = () =>
      page
        .locator('.task-unsaved-confirm')
        .isVisible()
        .catch(() => false);

    // 1. Chưa đổi gì: × đóng ngay, không có bảng.
    await open();
    await pressX();
    assert.equal(
      await promptShown(),
      false,
      'việc chưa đổi gì mà vẫn hiện bảng "chưa lưu"' + at,
    );
    assert.equal(
      await isOpen(),
      false,
      'việc chưa đổi gì mà × không đóng hộp' + at,
    );

    // 2. Sửa tên việc: × phải hiện bảng; Bỏ thay đổi thì đóng.
    await open();
    await page.fill('#editor-form [name=title]', 'Tên đã sửa');
    await pressX();
    assert.equal(
      await promptShown(),
      true,
      'sửa tên việc mà không hiện bảng "chưa lưu"' + at,
    );
    await page.locator('[data-task-discard]:visible').first().click();
    await page.waitForTimeout(400);
    assert.equal(await isOpen(), false, 'Bỏ thay đổi mà hộp không đóng' + at);

    // 3. Sửa chữ trong checklist: × phải hiện bảng.
    await open();
    await page.fill('#editor-body [name=check-text-0]', 'Chữ checklist đã sửa');
    await pressX();
    assert.equal(
      await promptShown(),
      true,
      'sửa chữ checklist mà không hiện bảng "chưa lưu"' + at,
    );
    await page.locator('[data-task-discard]:visible').first().click();
    await page.waitForTimeout(400);
    assert.equal(
      await isOpen(),
      false,
      'Bỏ thay đổi (checklist) mà hộp không đóng' + at,
    );

    // 4. Ghim rồi thoát: ghim không phải là sửa form, × vẫn đóng ngay.
    await open();
    await page.click('#editor-body .task-pin-shortcut');
    await page.waitForTimeout(200);
    await pressX();
    assert.equal(
      await promptShown(),
      false,
      'ghim việc làm × báo "chưa lưu" sai' + at,
    );
    assert.equal(await isOpen(), false, 'ghim xong × không đóng hộp' + at);
    await context.close();
  }
  console.log(
    'PASS: × đóng ngay việc chưa đổi (có checklist); sửa tên/checklist vẫn hiện bảng; Bỏ thay đổi đóng hộp; ghim không làm sai (390/820/1440px).',
  );
} finally {
  await h.close();
}
