// Hồi quy v1.42.0: thanh kéo % của checklist được thay bằng ô số nhỏ gọn đặt cuối dòng, cùng hàng với nội dung.
// Dòng gồm: ô đánh dấu, nội dung, số % in đậm, nút × (thứ tự Tab khớp thứ tự đọc). Không còn thanh kéo trong hộp chi tiết
// và Chế độ tập trung. Gõ số trực tiếp được lưu; tick = 100%. Kiểm ở 390 (cảm ứng), 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Liên hệ địa điểm', done: true },
    { id: 'c2', text: 'Soạn chương trình', done: false, pct: 40 },
    { id: 'c3', text: 'In tài liệu', done: false, pct: 0 },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const at = ` (${width}px)`;
    const { context, page } = await h.open(width, { touch: width < 700 });
    await h.show(page, 'board');
    await page.evaluate(() => taskDetail(project('p1'), project('p1').tasks[0]));
    await page.waitForSelector('#editor-body .compact-check input[name="check-pct-2"]', { state: 'attached' });

    // A. Không còn thanh kéo; mỗi dòng có ô số % cùng hàng với nội dung, nằm trước nút ×.
    const layout = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#editor-body .wf-check-sort-list .compact-check')];
      return rows.map((row) => {
        const ta = row.querySelector('textarea').getBoundingClientRect();
        const num = row.querySelector('input[type="number"].zen-ck-num').getBoundingClientRect();
        const rm = row.querySelector('.compact-check-remove').getBoundingClientRect();
        const unit = row.querySelector('.zen-ck-pct-unit');
        return {
          ranges: row.querySelectorAll('input[type="range"]').length,
          sameRow: num.top < ta.bottom && num.bottom > ta.top,
          afterText: num.left >= ta.right - 1,
          beforeRemove: num.right <= rm.left + 1,
          hasUnit: !!unit && unit.textContent === '%',
          numFont: parseFloat(getComputedStyle(row.querySelector('.zen-ck-num')).fontSize),
          numWeight: Number(getComputedStyle(row.querySelector('.zen-ck-num')).fontWeight),
          numH: num.height,
        };
      });
    });
    assert.equal(layout.length, 3, 'có 3 dòng checklist' + at);
    layout.forEach((l, i) => {
      assert.equal(l.ranges, 0, `dòng ${i + 1}: không còn thanh kéo` + at);
      assert.ok(l.sameRow, `dòng ${i + 1}: ô % phải cùng hàng với nội dung` + at);
      assert.ok(l.afterText, `dòng ${i + 1}: ô % phải nằm sau nội dung` + at);
      assert.ok(l.beforeRemove, `dòng ${i + 1}: ô % phải nằm trước nút ×` + at);
      assert.ok(l.hasUnit, `dòng ${i + 1}: thiếu ký hiệu %` + at);
      assert.ok(l.numFont >= 12, `dòng ${i + 1}: chữ số quá nhỏ` + at);
      assert.ok(l.numWeight >= 600, `dòng ${i + 1}: số % phải in đậm` + at);
      assert.ok(l.numH >= (width < 700 ? 44 : 32) - 0.5, `dòng ${i + 1}: ô % quá thấp để chạm` + at);
    });

    // B. Gõ số trực tiếp: 65 được lưu; 150 bị kẹp về 100; tick đưa về 100; bỏ tick về 0.
    const num2 = page.locator('#editor-body input[name="check-pct-1"]');
    await num2.fill('65');
    await num2.dispatchEvent('input');
    await num2.dispatchEvent('change');
    assert.equal(await num2.inputValue(), '65', 'gõ 65 được giữ' + at);
    await num2.fill('150');
    await num2.dispatchEvent('input');
    await num2.dispatchEvent('change');
    await page.waitForFunction(
      () => document.querySelector('#editor-body input[name="check-pct-1"]').value === '100',
      null,
      { timeout: 3000 },
    ).catch(() => {});
    assert.equal(await num2.inputValue(), '100', 'số lớn hơn 100 bị kẹp về 100' + at);
    const box3 = page.locator('#editor-body .compact-check').nth(2).locator('input[name^="check-done-"]');
    await box3.check();
    assert.equal(await page.locator('#editor-body input[name="check-pct-2"]').inputValue(), '100', 'tick làm % về 100' + at);
    await box3.uncheck();
    assert.equal(await page.locator('#editor-body input[name="check-pct-2"]').inputValue(), '0', 'bỏ tick đưa % về 0' + at);

    // C. Lưu: số đã gõ được ghi vào dữ liệu.
    await num2.fill('30');
    await num2.dispatchEvent('input');
    await num2.dispatchEvent('change');
    await page.locator('#editor-form button[type=submit]').click();
    await page.waitForFunction(() => project('p1').tasks[0].checks[1].pct === 30, null, { timeout: 5000 });

    // D. Chế độ tập trung: cũng dùng ô số, không có thanh kéo.
    await page.evaluate(() => {
      _WF.focus = { p: 'p1', t: 'p1t0' };
      go('focus');
    });
    await page.locator('[data-fe-edit]').click();
    await page.waitForSelector('.zen-fe-form');
    const fe = await page.evaluate(() => ({
      ranges: document.querySelectorAll('.zen-fe-form input[type="range"]').length,
      nums: document.querySelectorAll('.zen-fe-form input[type="number"][data-fe-pct]').length,
    }));
    assert.equal(fe.ranges, 0, 'Chế độ tập trung: không còn thanh kéo' + at);
    assert.equal(fe.nums, 3, 'Chế độ tập trung: mỗi mục có ô %' + at);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'không tràn ngang' + at,
    );
    await context.close();
  }
  console.log('PASS: checklist dùng ô % nhỏ cuối dòng, cùng hàng với nội dung; gõ số được kẹp 0–100 và lưu; tick = 100%; Chế độ tập trung cũng vậy (390/820/1440px).');
} finally {
  await h.close();
}
