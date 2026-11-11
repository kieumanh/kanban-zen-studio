// v1.65.0: hộp chi tiết công việc tinh gọn. Kiểm ở 390/820/1440 px:
// - hàng "Chi tiết công việc + Ghim + Chế độ tập trung" nằm một dòng, không còn khung riêng;
// - dòng trạng thái lưu là viên nhỏ (không chiếm cả hàng);
// - mức độ là lưới 2 cột (ma trận khẩn cấp/quan trọng), chọn vẫn hoạt động bằng chuột và bàn phím;
// - không còn câu hướng dẫn lặp ở phần lịch và dòng "Đặt tên rõ ràng…"; không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'projects');
    await page.evaluate(() => {
      const p = data.projects[0];
      taskDetail(p, p.tasks[4]);
    });
    await page.waitForSelector('#editor[open] .wf-task-heading-row');
    const m = await page.evaluate(() => {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const row = document.querySelector('#editor .wf-task-heading-row');
      const cs = getComputedStyle(row);
      const status = document.querySelector('#editor .zen-task-save-status');
      const choices = [...document.querySelectorAll('#editor .priority-choices .priority-choice')];
      const dialog = document.querySelector('#editor');
      const help = [...document.querySelectorAll('#editor .zen-task-section .help-copy')].map((e) => e.textContent.trim());
      const intro = document.querySelector('#editor .task-form-intro, #editor .form-intro');
      return {
        row: box(row),
        rowBorder: cs.borderTopWidth,
        rowBg: cs.backgroundColor,
        status: box(status),
        choiceTops: choices.map((c) => Math.round(c.getBoundingClientRect().top)),
        choiceLefts: choices.map((c) => Math.round(c.getBoundingClientRect().left)),
        choiceCount: choices.length,
        help,
        introVisible: !!intro && getComputedStyle(intro).display !== 'none',
        overflow: dialog.scrollWidth - dialog.clientWidth,
      };
    });
    assert.ok(m.row.height <= 48, `hàng tiêu đề một dòng (≤48px), thực tế ${Math.round(m.row.height)}` + at);
    assert.equal(m.rowBorder, '0px', 'hàng tiêu đề không còn khung viền' + at);
    assert.ok(m.status.height <= 32, `viên trạng thái lưu gọn (≤32px), thực tế ${Math.round(m.status.height)}` + at);
    assert.ok(m.status.width < m.row.width, 'viên trạng thái không chiếm cả hàng' + at);
    assert.equal(m.choiceCount, 5, '5 lựa chọn mức độ (4 góc ma trận + chưa phân loại)' + at);
    assert.equal(new Set(m.choiceLefts.slice(0, 4)).size, 2, 'bốn ô mức độ xếp 2 cột' + at);
    assert.equal(new Set(m.choiceTops.slice(0, 4)).size, 2, 'bốn ô mức độ xếp 2 hàng' + at);
    assert.equal(m.help.filter((t) => /Ngày kết thúc đồng thời là hạn hoàn thành/.test(t)).length, 1, 'chỉ một dòng giải thích hạn hoàn thành' + at);
    assert.equal(m.introVisible, false, 'không còn dòng "Đặt tên rõ ràng…"' + at);
    assert.ok(m.overflow <= 1, 'hộp thoại không tràn ngang' + at);

    // Chọn mức độ bằng chuột rồi bằng bàn phím vẫn đổi giá trị.
    await page.click('#editor .priority-choice.q3');
    assert.equal(await page.$eval('#editor [name=priority-choice]:checked', (e) => e.value), 'q3', 'chọn q3 bằng chuột' + at);
    await page.focus('#editor [name=priority-choice]:checked');
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await page.$eval('#editor [name=priority-choice]:checked', (e) => e.value), 'q3', 'phím mũi tên đổi lựa chọn' + at);
    await context.close();
  }
  console.log('PASS: hộp chi tiết công việc tinh gọn ở 390/820/1440px.');
} finally {
  await h.close();
}
