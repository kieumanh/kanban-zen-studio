// Hồi quy v1.16.3: nút "Xóa dự án này" xóa đúng dự án đang nằm trong biểu mẫu, không phải dự án đang mở ở phía sau.
// Trước đây hộp xác nhận xóa `project()` (dự án đang mở); nếu biểu mẫu mở cho dự án khác (hoặc không có dự án nào đang mở)
// thì xóa nhầm dự án khác hoặc báo lỗi. Hai tình huống: (A) đang mở p1, sửa p2; (B) đang ở Tổng quan (không dự án nào mở), sửa p2.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6), makeProject('p2', 'Dự án phụ', '#c764a2', 2), makeProject('p3', 'Dự án thứ ba', '#e78c56', 3)], notes: [] });
const h = await startHarness({ seed });

const ids = (page) => page.evaluate(() => data.projects.map((p) => p.id));

async function deleteFromForm(page, id) {
  await page.evaluate((id) => projectForm(project(id)), id);
  await page.waitForSelector('#editor [data-action=delete-project]');
  assert.equal(await page.locator('#editor [data-action=delete-project]').getAttribute('data-project-id'), id, 'nút xóa mang mã dự án của biểu mẫu');
  await page.locator('#editor [data-action=delete-project]').click();
  await page.waitForFunction(() => /^Xóa/.test(document.querySelector('#editor h2')?.textContent || ''));
  await page.locator('#editor-form button[type=submit]').click();
  await page.waitForFunction(() => !document.querySelector('#editor').open);
}

try {
  for (const [width, touch] of [[390, true], [1440, false]]) {
    const label = width + 'px';
    const { context, page } = await h.open(width, { touch });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // A. Đang mở p1, sửa và xóa p2.
    await h.show(page, 'projects');
    await page.waitForFunction(() => project()?.id === 'p1');
    await deleteFromForm(page, 'p2');
    assert.deepEqual(await ids(page), ['p1', 'p3'], `${label} A: chỉ p2 bị xóa`);
    assert.equal(await page.evaluate(() => project()?.id), 'p1', `${label} A: dự án đang mở vẫn là p1`);

    // B. Ở Tổng quan (không dự án đang mở), sửa và xóa p3.
    await page.evaluate(() => {
      active = null;
      go('dashboard');
    });
    await page.waitForFunction(() => view === 'dashboard' && !project());
    await deleteFromForm(page, 'p3');
    assert.deepEqual(await ids(page), ['p1'], `${label} B: chỉ p3 bị xóa`);

    // C. Xóa chính dự án đang mở: vẫn đóng dự án đó như trước.
    await page.evaluate(() => go('projects', 'p1'));
    await page.waitForFunction(() => view === 'projects' && project()?.id === 'p1');
    await deleteFromForm(page, 'p1');
    assert.deepEqual(await ids(page), [], `${label} C: p1 bị xóa`);
    assert.equal(await page.evaluate(() => !project()), true, `${label} C: không còn dự án đang mở`);
    assert.deepEqual(errors, [], `${label}: không lỗi trang`);
    await context.close();
    console.log(`  đạt ${label}`);
  }
  console.log('PASS: nút Xóa dự án xóa đúng dự án của biểu mẫu (đang mở p1 sửa p2; ở Tổng quan; xóa dự án đang mở).');
} finally {
  await h.close();
}
