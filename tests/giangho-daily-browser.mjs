// v1.89.0 (Nhật Khóa): chữ giang hồ ở Hoàng lịch, Bế quan và Nhật khóa (phong cách Giang hồ).
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px:
//  1. Hoàng lịch (lưới tháng và liệt kê), Bế quan (danh sách gợi ý và phiên bế quan với nén hương), Nhật khóa (trang chính, biểu mẫu,
//     chiến báo) đổi chữ đúng bảng thuật ngữ.
//  2. Nội dung người dùng giữ nguyên dù trùng chữ giao diện: việc tên "Hạn", việc hằng ngày tên "Nghỉ hôm nay", dự án "Chưa lên lịch".
//  3. Ứng dụng vẫn chạy đúng: nén hương bắt đầu / tạm nghỉ; thêm việc hằng ngày tên "Tên việc" lưu đúng tên; tích hôm nay lưu đúng ngày.
//  4. Không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p1 = makeProject('p1', 'Chưa lên lịch', '#7950c8', 6);
  p1.tasks[0].title = 'Hạn';
  return {
    schema: 1,
    projects: [p1],
    notes: [],
    dailyHabits: [
      { id: 'h1', name: 'Nghỉ hôm nay', icon: '🧘', color: '#7950c8', createdAt: '2026-10-01', goal: 7, done: ['2026-11-11', '2026-11-10', '2026-11-09'] },
      { id: 'h2', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: '2026-10-20', goal: 5, done: [] },
    ],
  };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const has = (txt, list, where) => list.forEach((t) => assert.ok(txt.includes(t), where + ' có “' + t + '”'));
const hasNot = (txt, list, where) => list.forEach((t) => assert.ok(!txt.includes(t), where + ' không còn “' + t + '”'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page, server } = await h.open(width, { touch, now: '2026-11-12T09:00:00+07:00', setup: GH });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Hoàng lịch.
    await h.show(page, 'calendar');
    let main = await page.locator('#main').innerText();
    has(main, ['Hoàng lịch', 'Phạm vi đại sự', 'Chưa định ngày', 'Tiến cảnh đại sự'], 'Hoàng lịch' + at);
    const kinds = await page.evaluate(() => [...new Set([...document.querySelectorAll('.zen-event-kind')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()))]);
    assert.ok(!kinds.includes('Hạn'), 'nhãn loại sự kiện đổi "Hạn" → "Kỳ hạn": ' + kinds + at);
    hasNot(main, ['Chạm vào công việc', 'Mọi công việc đã có lịch'], 'Hoàng lịch' + at);
    // Lưới tháng (chữ nằm trực tiếp trong nút) hoặc liệt kê (thẻ strong), tùy kiểu xem mặc định của thiết bị.
    const events = await page.evaluate(() => [...[...document.querySelectorAll('.month-event')].map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join('')), ...[...document.querySelectorAll('.zen-ma-body strong')].map((e) => e.textContent.trim())]);
    assert.ok(events.includes('Hạn'), 'việc tên "Hạn" giữ nguyên trên lịch: ' + events + at);
    assert.equal(await page.locator('#main .page-heading .subtext').first().innerText(), 'Chưa lên lịch', 'tên dự án "Chưa lên lịch" giữ nguyên' + at);
    assert.equal(await noOverflow(page), true, 'lịch không tràn ngang' + at);
    if (await page.locator('.zen-cal-mode').count()) {
      // Máy tính bảng, máy tính: có nút đổi kiểu xem.
      await page.locator('.zen-cal-mode button', { hasText: 'Liệt kê' }).click();
      await page.waitForSelector('.zen-month-agenda');
      assert.match(await page.locator('.zen-month-agenda').first().getAttribute('aria-label'), /^Hoàng lịch tháng \d+\/\d+ dạng danh sách$/, 'lịch dạng liệt kê' + at);
    } else {
      // Điện thoại: chạm vào ngày để xem sự vụ trong ngày.
      await page.click('[data-zen-select-day="2026-11-01"]');
      await page.waitForSelector('.zen-day-agenda');
      const agenda = await page.locator('.zen-day-agenda').innerText();
      assert.match(agenda, /^Sự vụ trong ngày /, 'tiêu đề sự vụ trong ngày' + at);
      assert.match(agenda, /công thành · Đổi ngày trong chi tiết/, 'dòng tiến cảnh trong ngày' + at);
      assert.ok(agenda.includes('Hạn'), 'tên việc "Hạn" giữ nguyên trong ngày' + at);
    }
    // Bế quan.
    await h.show(page, 'focus');
    main = await page.locator('#main').innerText();
    has(main, ['Chọn nhiệm vụ để bế quan', '3 nhiệm vụ trọng yếu', 'Lỡ hẹn', 'Bế quan →', 'công thành'], 'Bế quan' + at);
    await page.locator('#main [data-wf-focus]').first().click();
    await page.waitForSelector('.studio-pomodoro');
    await page.evaluate(() => (document.querySelector('.studio-pomodoro').open = true));
    main = await page.locator('#main').innerText();
    has(main, ['Xuất quan', 'Nén hương bế quan · tùy chọn', 'ĐANG BẾ QUAN', 'Chỉnh sửa nhiệm vụ', 'Tàng thư liên quan'], 'phiên bế quan' + at);
    const timer = page.locator('.studio-pomodoro [data-studio=timer]');
    assert.equal(await timer.textContent(), 'Nhập định', 'nút nén hương' + at);
    await timer.click();
    await page.waitForFunction(() => document.querySelector('.studio-pomodoro [data-studio=timer]').textContent === 'Tạm nghỉ');
    await page.clock.runFor(2000);
    assert.equal(await timer.textContent(), 'Tạm nghỉ', 'đồng hồ chạy, chữ giữ giang hồ khi ứng dụng cập nhật mỗi giây' + at);
    assert.notEqual(await page.locator('.studio-pomodoro output').textContent(), '25:00', 'đồng hồ đếm lùi' + at);
    await timer.click();
    await page.waitForFunction(() => document.querySelector('.studio-pomodoro [data-studio=timer]').textContent === 'Nhập định');
    await page.locator('.wf-focus-exit').click();
    await page.waitForSelector('.zen-focus-exit-dialog[open]');
    const exitText = await page.locator('.zen-focus-exit-dialog').innerText();
    has(exitText, ['Xuất quan?', 'Ở lại bế quan', 'ở lại bế quan hoặc xuất quan'], 'hỏi xuất quan' + at);
    await page.locator('[data-zen-focus-leave]').click();
    await page.waitForFunction(() => !document.querySelector('.zen-focus-exit-dialog[open]'));
    // Nhật khóa.
    await h.show(page, 'habits');
    main = await page.locator('#main').innerText();
    has(main, ['Nhật khóa', 'Thêm nhật khóa', 'Chiến báo', 'Tiến cảnh tuần này', 'Khổ luyện liền 3 ngày', 'Chưa gắn đại sự', 'Hưu tức hôm nay', 'Xem công phu'], 'Nhật khóa' + at);
    const names = await page.evaluate(() => [...document.querySelectorAll('.hb-name')].map((e) => e.textContent.trim()));
    assert.ok(names.includes('Nghỉ hôm nay'), 'tên việc hằng ngày trùng chữ nút vẫn giữ nguyên: ' + names + at);
    assert.equal(await noOverflow(page), true, 'nhật khóa không tràn ngang' + at);
    // Biểu mẫu: thêm môn tên "Tên việc".
    await page.locator('[data-hb-add]').first().click();
    await page.waitForSelector('dialog[open] .hb-form');
    const form = await page.locator('dialog[open]').innerText();
    has(form, ['NHẬT KHÓA', 'Thêm nhật khóa', 'Tên môn', 'Số buổi luyện mỗi tuần', 'Mỗi ngày (7 buổi)', 'Đại sự liên quan'], 'biểu mẫu nhật khóa' + at);
    await page.fill('dialog[open] .hb-form input[name=name]', 'Tên việc');
    await page.locator('dialog[open] .modal-foot .btn.primary').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open] .hb-form'));
    const added = await page.evaluate(() => data.dailyHabits.map((x) => x.name));
    assert.ok(added.includes('Tên việc'), 'tên việc hằng ngày lưu đúng: ' + added + at);
    // Chiến báo nhật khóa.
    await page.locator('.hb-report-btn').click();
    await page.waitForSelector('.hb-report');
    main = await page.locator('#main').innerText();
    has(main, ['Chiến báo nhật khóa', 'Tỷ lệ công thành', 'Lượt đã luyện', 'Chuỗi khổ luyện hiện tại', 'Bí kíp cải thiện', 'Theo từng môn'], 'chiến báo nhật khóa' + at);
    assert.match(main, /Trong \d+ ngày qua các hạ công thành \d+%/, 'câu luận tự động' + at);
    assert.equal(await noOverflow(page), true, 'chiến báo không tràn ngang' + at);
    // Dữ liệu không chứa chữ giang hồ lạ.
    const json = JSON.stringify(server.workspace);
    assert.doesNotMatch(json, /nhật khóa|Hưu tức|Khổ luyện|đại sự/, 'dữ liệu lưu không bị đổi chữ' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('giangho-daily-browser ok');
} finally {
  await h.close();
}
