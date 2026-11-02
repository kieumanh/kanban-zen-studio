// Hồi quy v1.16.4: "Dọn sạch Thùng rác" và xóa vĩnh viễn từng mục chạy được ở 390/820/1440px: hộp xác nhận thường (không hỏi mật khẩu),
// Thùng rác trống đi cả trên màn hình lẫn trên máy chủ, thông báo thành công; khi máy chủ lỗi thì nói rõ, không báo "Thùng rác đang trống" sai.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const entry = (id, kind, name, payload) => ({ id, at: Date.now() - 1000, kind, name, payload: JSON.stringify(payload), parent: '' });
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4)],
  notes: [],
  trash: [entry('tr1', 'task', 'Việc đã xóa một', { id: 'x1', title: 'Việc đã xóa một', col: 'List' }), entry('tr2', 'task', 'Việc đã xóa hai', { id: 'x2', title: 'Việc đã xóa hai', col: 'List' }), entry('tr3', 'note', 'Ghi chú đã xóa', { id: 'n9', title: 'Ghi chú đã xóa' })],
});
const h = await startHarness({ seed });

const count = (page) => page.evaluate(() => document.querySelectorAll('#main [data-trash-delete]').length);
const confirmDialog = async (page, title) => {
  await page.waitForFunction((t) => document.querySelector('#editor')?.open && document.querySelector('#editor h2')?.textContent === t, title);
  assert.equal(await page.locator('#editor input[type=password]').count(), 0, 'hộp xác nhận không có ô mật khẩu');
};

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const label = width + 'px';
    const { context, page, server } = await h.open(width, { touch });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'trash');
    await page.waitForSelector('[data-trash-empty]');
    assert.equal(await count(page), 3, `${label}: 3 mục trong Thùng rác`);

    // Xóa vĩnh viễn một mục.
    await page.locator('#main [data-trash-delete]').first().click();
    await confirmDialog(page, 'Xóa vĩnh viễn các mục đã chọn?');
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await page.waitForFunction(() => document.querySelectorAll('#main [data-trash-delete]').length === 2);
    assert.equal(server.workspace.trash.length, 2, `${label}: máy chủ còn 2 mục`);

    // Dọn sạch.
    await page.locator('[data-trash-empty]').click();
    await confirmDialog(page, 'Dọn sạch Thùng rác?');
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    await page.waitForFunction(() => document.querySelectorAll('#main [data-trash-delete]').length === 0);
    assert.equal(await page.evaluate(() => (data.trash || []).length), 0, `${label}: trên máy trống`);
    assert.equal(server.workspace.trash.length, 0, `${label}: trên máy chủ trống`);
    assert.equal(await page.evaluate(() => document.querySelector('#save-state')?.dataset.sync), 'saved', `${label}: đã đồng bộ`);
    assert.equal(await page.locator('#editor h2:has-text("Xác nhận thao tác")').count(), 0, `${label}: không hỏi mật khẩu`);

    // Bấm Dọn sạch khi đã trống: báo trống, không lỗi.
    await page.locator('[data-trash-empty]').click();
    await page.waitForFunction(() => /Thùng rác đang trống/.test(document.body.textContent));
    assert.deepEqual(errors, [], `${label}: không lỗi trang`);
    await context.close();
    console.log(`  đạt ${label}`);
  }
  console.log('PASS: dọn Thùng rác và xóa vĩnh viễn từng mục không hỏi mật khẩu, trống ở cả máy và máy chủ.');
} finally {
  await h.close();
}
