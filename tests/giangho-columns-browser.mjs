// v2.1.0 (Danh Trận): tên cột mặc định theo giang hồ khi hiển thị (tùy chọn, mặc định tắt).
//  1. Mặc định tắt: tên cột giữ nguyên như dữ liệu, kể cả ở Giang hồ.
//  2. Bật trong Cài đặt → Giao diện: cột còn tên mặc định hiện Kế sách · Chờ xuất chiêu · Đang hành sự · Công thành ở tiêu đề cột,
//     dải tab cột (điện thoại), nút và ô chọn trạng thái trong chi tiết nhiệm vụ, nhãn đọc "Thêm nhiệm vụ vào cột …" / "Chuyển sang …".
//     Cột người dùng đã đặt tên riêng giữ nguyên. Hộp đổi tên cột vẫn điền tên trong dữ liệu.
//  3. Tắt lại, Giang hồ nhẹ, Thiền: tên cột trở lại như cũ. Lưu trên thiết bị (zen-gh-columns). Dữ liệu không đổi, không lỗi trang.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Alpha', '#7950c8', 8);
  p.columnNames = { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Làm gấp', Done: 'Hoàn thành' }; // "Đang thực hiện" đã được đặt tên riêng
  p.tasks.forEach((t, i) => (t.col = ['Idea', 'List', 'Doing', 'Done'][i % 4]));
  return { schema: 1, notes: [], projects: [p] };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const view = (page) =>
  page.evaluate(() => ({
    heads: [...document.querySelectorAll('.board .wf-column-name')].filter((b) => b.getBoundingClientRect().width).map((b) => b.textContent.trim()),
    tabs: [...document.querySelectorAll('.studio-column-tabs button')].map((b) => b.textContent.trim().replace(/ · \d+$/, '')),
    add: [...document.querySelectorAll('.column-title .icon-btn')].filter((b) => b.getBoundingClientRect().width).map((b) => b.getAttribute('aria-label')),
    next: [...new Set([...document.querySelectorAll('.task-next')].map((b) => b.getAttribute('aria-label')))].sort(),
  }));
const detail = async (page) => {
  await page.evaluate(() => document.querySelector('.task-card')?.click());
  await page.waitForSelector('dialog[open] .wf-state-choices');
  const out = await page.evaluate(() => ({
    choices: [...document.querySelectorAll('dialog[open] .wf-state-choice')].map((b) => b.textContent.trim()),
    options: [...document.querySelectorAll('dialog[open] select[name=col] option')].map((o) => o.textContent.trim()),
  }));
  await page.evaluate(() => document.querySelector('dialog[open]').close());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForTimeout(350);
  return out;
};
const settings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('dialog[open] #gh-columns', { state: 'attached' });
  await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
  await page.mouse.move(2, 2);
};
const closeAll = async (page) => {
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await page.waitForTimeout(350);
};
const PLAIN = ['Ý tưởng', 'Việc cần làm', 'Làm gấp', 'Hoàn thành'];
const GHN = ['Kế sách', 'Chờ xuất chiêu', 'Làm gấp', 'Công thành'];

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const before = JSON.stringify(server.workspace.projects);
    await h.show(page, 'projects', 'p1');
    const phone = await page.evaluate(() => document.querySelectorAll('.studio-column-tabs button').length > 0);
    // 1. Mặc định tắt.
    let v = await view(page);
    if (phone) assert.deepEqual(v.tabs, PLAIN, 'mặc định: tab cột giữ nguyên' + at);
    else assert.deepEqual(v.heads, PLAIN, 'mặc định: tiêu đề cột giữ nguyên' + at);
    // 2. Bật.
    await settings(page);
    assert.equal(await page.locator('#gh-columns').isChecked(), false, 'mặc định tắt' + at);
    await page.locator('.gh-columns-row').click();
    await page.waitForFunction(() => document.documentElement.dataset.ghColumns === 'on');
    assert.equal(await page.evaluate(() => localStorage.getItem('zen-gh-columns')), 'on', 'lưu trên thiết bị' + at);
    await closeAll(page);
    v = await view(page);
    if (phone) assert.deepEqual(v.tabs, GHN, 'tab cột theo giang hồ' + at);
    else {
      assert.deepEqual(v.heads, GHN, 'tiêu đề cột theo giang hồ' + at);
      assert.deepEqual(v.add, GHN.map((n) => 'Thêm nhiệm vụ vào cột ' + n), 'nhãn đọc nút thêm' + at);
    }
    assert.ok(v.next.includes('Chuyển sang Chờ xuất chiêu') && v.next.includes('Chuyển sang Làm gấp') && v.next.includes('Chuyển sang Công thành'), 'nhãn đọc nút chuyển cột: ' + JSON.stringify(v.next) + at);
    const d = await detail(page);
    assert.deepEqual(d.choices, GHN, 'nút trạng thái trong chi tiết' + at);
    assert.deepEqual(d.options, GHN, 'ô chọn trạng thái' + at);
    // Hộp đổi tên cột điền tên trong dữ liệu.
    if (!phone) {
      await page.locator('.board .wf-column-name').first().click();
      await page.waitForSelector('dialog[open] input[name=name]');
      assert.equal(await page.locator('dialog[open] input[name=name]').inputValue(), 'Ý tưởng', 'đổi tên cột vẫn điền tên trong dữ liệu' + at);
      await closeAll(page);
    }
    // Đổi trạng thái bằng nút trong chi tiết: dữ liệu lưu mã cột, không lưu chữ giang hồ.
    await page.evaluate(() => document.querySelector('.task-card')?.click());
    await page.waitForSelector('dialog[open] .wf-state-choice');
    await page.locator('dialog[open] .wf-state-choice', { hasText: 'Chờ xuất chiêu' }).click();
    await page.waitForTimeout(500);
    await closeAll(page);
    assert.doesNotMatch(JSON.stringify(server.workspace), /Kế sách|Chờ xuất chiêu|Đang hành sự|Công thành/, 'không ghi tên giang hồ vào dữ liệu' + at);
    // 3. Giang hồ nhẹ: tên thường, công tắc bị khóa.
    await page.evaluate(() => window.zenTheme.setWords(false));
    await h.show(page, 'projects', 'p1');
    v = await view(page);
    assert.deepEqual(phone ? v.tabs : v.heads, PLAIN, 'Giang hồ nhẹ: tên cột thường' + at);
    await settings(page);
    assert.equal(await page.locator('#gh-columns').isDisabled(), true, 'Giang hồ nhẹ khóa công tắc tên cột' + at);
    await closeAll(page);
    await page.evaluate(() => window.zenTheme.setWords(true));
    await h.show(page, 'projects', 'p1');
    v = await view(page);
    assert.deepEqual(phone ? v.tabs : v.heads, GHN, 'bật lại lời lẽ thì tên cột giang hồ trở lại' + at);
    // Tắt bằng bảng lệnh.
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Control+k');
    await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
    await page.locator('.studio-palette input').fill('tên cột');
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.documentElement.dataset.ghColumns);
    v = await view(page);
    assert.deepEqual(phone ? v.tabs : v.heads, PLAIN, 'tắt thì tên cột trở lại' + at);
    // Thiền.
    await page.evaluate(() => window.zenTheme.setColumns(true));
    await page.evaluate(() => window.zenTheme.setStyle('zen'));
    await page.waitForFunction(() => !document.querySelector('.gh-nav'));
    v = await view(page);
    assert.deepEqual(phone ? v.tabs : v.heads, PLAIN, 'Thiền: tên cột thường' + at);
    const after = JSON.parse(JSON.stringify(server.workspace.projects));
    assert.deepEqual(after.map((p) => p.columnNames), JSON.parse(before).map((p) => p.columnNames), 'tên cột trong dữ liệu không đổi' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('giangho-columns-browser ok');
} finally {
  await h.close();
}
