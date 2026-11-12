// v1.88.0 (Hành Sự): chữ giang hồ ở Tổng đàn, bảng Đại sự (Bảng cáo thị), Trận đồ, biểu mẫu nhiệm vụ và đại sự (phong cách Giang hồ).
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px:
//  1. Chữ giao diện đổi đúng bảng thuật ngữ (lỡ hẹn, kỳ hạn, nhiệm vụ, đại sự, chiêu thức, tiến cảnh, bốn mức cấp bách…).
//  2. Nội dung người dùng giữ nguyên dù trùng chữ giao diện: dự án "Đang thực hiện", việc "Checklist", cột "Quá hạn", nhãn, từ khóa.
//  3. Ứng dụng vẫn chạy đúng: tạo nhiệm vụ chọn mức "Trọng yếu, hỏa tốc" thì lưu mã q1; thêm chiêu (checklist) lưu đúng;
//     các khối trong chi tiết nhiệm vụ đứng đúng chỗ như phong cách Thiền.
//  4. Về Thiền: chữ trở lại. Không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p1 = makeProject('p1', 'Đang thực hiện', '#7950c8', 6);
  p1.tasks[0].title = 'Checklist';
  p1.tasks[1].title = 'Tên công việc';
  p1.columnNames = { ...p1.columnNames, Idea: 'Quá hạn' };
  return { schema: 1, projects: [p1, makeProject('p2', 'Khóa tu', '#c764a2', 3)], notes: [] };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const text = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), sel);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// Thứ tự các khối trong chi tiết nhiệm vụ (để so hai phong cách).
const layout = (page) =>
  page.evaluate(() => {
    const body = document.querySelector('#editor-body');
    return [...body.querySelectorAll(':scope > *, :scope > section > *')].map((e) => e.className.split(' ')[0] || e.tagName).filter(Boolean).join(' ');
  });

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // Bố cục chi tiết nhiệm vụ ở phong cách Thiền để so.
    let zenLayout;
    {
      const { context, page } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00' });
      await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[4]));
      await page.waitForSelector('#editor[open] .wf-task-heading');
      zenLayout = await layout(page);
      await context.close();
    }
    const { context, page, server } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // 1a. Tổng đàn.
    await h.show(page, 'dashboard');
    const main = await page.locator('#main').innerText();
    for (const t of ['nhiệm vụ lỡ hẹn', 'Lỡ hẹn & sắp tới kỳ', 'Nhiệm vụ hôm nay', 'Đại sự đang hành hoặc vừa mở', 'Mọi đại sự →', 'Tổng đại sự', 'Tiến cảnh tổng thể', 'Toàn cảnh giang hồ', 'Tiến cảnh từng đại sự', 'đơn vị công thành', 'Kỳ hạn'])
      assert.ok(main.includes(t), 'Tổng đàn có chữ “' + t + '”' + at);
    for (const t of ['việc quá hạn', 'Quá hạn & sắp đến hạn', 'Cần làm hôm nay', 'Tổng dự án', 'Tiến độ tổng thể', 'Bức tranh công việc']) assert.ok(!main.includes(t), 'Tổng đàn không còn “' + t + '”' + at);
    assert.ok((await text(page, '.project-card h3')).includes('Đang thực hiện'), 'tên dự án "Đang thực hiện" giữ nguyên' + at);
    // 1b. Bảng cáo thị.
    await h.show(page, 'projects');
    const board = await page.evaluate(() => ({
      tools: [...document.querySelectorAll('.board-tools > summary, .board-tools > details > summary, .board-tools > button')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
      summary: document.querySelector('.board-summary').innerText.replace(/\s+/g, ' '),
      columns: [...document.querySelectorAll('.wf-column-name')].map((e) => e.textContent.trim()),
      deadlines: [...document.querySelectorAll('.task-card-deadline')].map((e) => e.textContent.trim()),
      chips: [...new Set([...document.querySelectorAll('.matrix-chip')].map((e) => e.textContent.trim()))],
      titles: [...document.querySelectorAll('.task-card h3')].map((e) => e.textContent.trim()),
      tags: [...new Set([...document.querySelectorAll('.task-card .tag')].map((e) => e.textContent.trim()))],
      add: [...document.querySelectorAll('.add-task')].map((e) => e.textContent.trim())[0],
      plus: document.querySelector('.column-title .icon-btn')?.getAttribute('aria-label'),
    }));
    assert.ok(board.tools.some((t) => t.includes('Bố cục')) && board.tools.some((t) => t.includes('Thêm nhiệm vụ')), 'nút đầu bảng: ' + board.tools + at);
    assert.match(board.summary, /nhiệm vụ công thành.*tiến cảnh · trung bình các nhiệm vụ/, 'tóm tắt bảng' + at);
    assert.deepEqual(board.columns, ['Quá hạn', 'Việc cần làm', 'Đang thực hiện', 'Hoàn thành'], 'tên cột của người dùng giữ nguyên' + at);
    assert.ok(board.deadlines.every((d) => /^(Lỡ hẹn|Kỳ hạn) · \d\d-\d\d$/.test(d)), 'hạn trên thẻ: ' + board.deadlines + at);
    assert.deepEqual(board.chips, ['Trọng yếu, thong thả'], 'mức cấp bách' + at);
    assert.ok(board.titles.includes('Checklist') && board.titles.includes('Tên công việc'), 'tên việc giữ nguyên: ' + board.titles + at);
    assert.deepEqual(board.tags, ['Công việc'], 'nhãn của người dùng giữ nguyên' + at);
    assert.equal(board.add, '+ Thêm nhiệm vụ');
    assert.equal(board.plus, 'Thêm nhiệm vụ vào cột Quá hạn', 'nhãn nút + giữ tên cột' + at);
    assert.equal(await noOverflow(page), true, 'bảng không tràn ngang' + at);
    // 1c. Trận đồ.
    await h.show(page, 'gantt');
    const gantt = await page.locator('#main').innerText();
    for (const t of ['Phạm vi đại sự', 'Tầm nhìn', 'Chọn một ngày trống để tạo nhiệm vụ', 'NHIỆM VỤ CẦN ĐỊNH NGÀY'.toLowerCase()]) assert.ok(gantt.toLowerCase().includes(t.toLowerCase()), 'Trận đồ có “' + t + '”' + at);
    assert.match(gantt, /Nhiệm vụ · \d+/, 'nhãn cột trận đồ' + at);
    // 3a. Tạo nhiệm vụ: chữ giang hồ, mức cấp bách lưu đúng mã.
    await h.show(page, 'projects');
    await page.evaluate(() => taskForm(project('p1')));
    await page.waitForSelector('#editor[open]');
    const form = await page.locator('#editor').innerText();
    for (const t of ['Nhiệm vụ mới', 'Tên nhiệm vụ', 'Cấp bách', 'Trọng yếu, hỏa tốc', 'Chưa định cấp', 'Ngày giờ & kỳ hạn', 'Chiêu thức', 'Gán đại sự', 'Thôi']) assert.ok(form.includes(t), 'biểu mẫu có “' + t + '”' + at);
    await page.fill('#editor [name=title]', 'Luyện kiếm buổi sáng');
    await page.locator('.priority-choice', { hasText: 'Trọng yếu, hỏa tốc' }).click();
    await page.locator('#editor .modal-foot .btn.primary').click();
    await page.waitForFunction(() => !document.querySelector('#editor[open]'));
    const saved = await page.evaluate(() => project('p1').tasks.find((t) => t.title === 'Luyện kiếm buổi sáng'));
    assert.ok(saved, 'đã tạo nhiệm vụ' + at);
    assert.equal(saved.priority, 'q1', 'mức cấp bách lưu mã q1, không lưu chữ' + at);
    // 3b. Chi tiết nhiệm vụ: chữ giang hồ, bố cục như Thiền, thêm chiêu lưu đúng.
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[4]));
    await page.waitForSelector('#editor[open] .wf-task-heading');
    const detail = await page.locator('#editor').innerText();
    for (const t of ['Chi tiết nhiệm vụ', 'Chiêu thức', 'Thêm chiêu mới', 'Luận bàn', 'Phong ấn nhiệm vụ', 'Xóa nhiệm vụ']) assert.ok(detail.includes(t), 'chi tiết có “' + t + '”' + at);
    assert.equal(await layout(page), zenLayout, 'các khối trong chi tiết nhiệm vụ đứng đúng chỗ như Thiền' + at);
    const before = await page.evaluate(() => project('p1').tasks[4].checks.length);
    const add = page.locator('#editor .zen-check-add textarea');
    await add.fill('Xuất chiêu thứ ba');
    await add.press('Enter');
    await page.waitForFunction((n) => document.querySelectorAll('#editor .compact-check').length > n, before);
    await page.locator('#editor .modal-foot .btn.primary').click();
    await page.waitForFunction(() => !document.querySelector('#editor[open]'));
    const checks = await page.evaluate(() => project('p1').tasks[4].checks.map((c) => c.text));
    assert.ok(checks.includes('Xuất chiêu thứ ba'), 'chiêu mới được lưu: ' + checks + at);
    // 1d. Biểu mẫu đại sự.
    await page.evaluate(() => projectForm(project('p1')));
    await page.waitForSelector('#editor[open]');
    const pf = await page.locator('#editor').innerText();
    for (const t of ['Chỉnh sửa đại sự', 'Tên đại sự', 'Màu đại sự', 'Từ khóa đại sự', 'Xóa đại sự này']) assert.ok(pf.includes(t), 'biểu mẫu đại sự có “' + t + '”' + at);
    assert.equal(await page.inputValue('#editor [name=name]'), 'Đang thực hiện', 'tên dự án trong ô nhập giữ nguyên' + at);
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    // Dữ liệu trên máy chủ không có chữ giang hồ lạ.
    const json = JSON.stringify(server.workspace);
    assert.doesNotMatch(json, /nhiệm vụ|đại sự|Lỡ hẹn|Trọng yếu/, 'dữ liệu lưu không bị đổi chữ' + at);
    // 4. Về Thiền.
    await h.show(page, 'projects');
    await page.evaluate(() => window.zenTheme.setStyle('zen'));
    await page.waitForFunction(() => !document.querySelector('.gh-nav'));
    const zenBoard = await page.locator('#main').innerText();
    assert.ok(zenBoard.includes('Thêm việc') && zenBoard.includes('+ Thêm công việc') && !zenBoard.includes('nhiệm vụ'), 'bảng trở lại chữ Thiền' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('giangho-work-browser ok');
} finally {
  await h.close();
}
