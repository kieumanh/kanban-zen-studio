// Hồi quy v1.19.4: checklist gọn và bo tròn hơn — thanh % vẫn chạm được (44px), khung "Thêm mục mới" là một ô bo tròn
// chứa cả ô nhập lẫn nút Thêm, gợi ý nằm dưới khung; không tràn ngang ở 390/820/1440px.
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
    await page.waitForSelector('#editor-body .zen-check-add textarea', { state: 'attached' });

    const m = await page.evaluate(() => {
      const box = document.querySelector('#editor-body .zen-check-add');
      const ta = box.querySelector('textarea');
      const btn = box.querySelector('.wf-add-check');
      const hint = box.nextElementSibling;
      const r = box.getBoundingClientRect();
      const range = document.querySelector('#editor-body .compact-check input[name="check-pct-1"]');
      const rr = range.getBoundingClientRect();
      const row = range.closest('.compact-check').getBoundingClientRect();
      return {
        boxRadius: parseFloat(getComputedStyle(box).borderRadius),
        boxH: r.height,
        boxInside: btn.getBoundingClientRect().right <= r.right + 0.5 && ta.getBoundingClientRect().left >= r.left,
        taBorder: getComputedStyle(ta).borderTopWidth,
        btnRadius: parseFloat(getComputedStyle(btn).borderRadius),
        hintBelow: hint?.classList.contains('zen-check-hint') && hint.getBoundingClientRect().top >= r.bottom - 1,
        hintSize: parseFloat(getComputedStyle(hint).fontSize),
        rangeH: rr.height,
        rowH: row.height,
        rangeW: rr.width,
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        bodyOverflow: document.querySelector('#editor-body').scrollWidth - document.querySelector('#editor-body').clientWidth,
      };
    });
    assert.ok(m.rangeH >= 44 && m.rangeH <= 46, 'thanh % phải giữ vùng chạm 44px, được ' + m.rangeH + at);
    // Trần 100px theo số đo thật (390px: 97px; 820/1440px: 87px; v1.19.3 đo được 107px và 90px). Thanh % giữ vùng chạm 44px nên dòng không thể thấp hơn ~85px.
    assert.ok(m.rowH <= 100, 'một dòng checklist quá cao: ' + m.rowH + at);
    assert.ok(m.boxRadius >= 20, 'khung thêm mục phải bo tròn kiểu viên thuốc, được ' + m.boxRadius + at);
    assert.ok(m.boxInside, 'ô nhập hoặc nút Thêm nằm ngoài khung' + at);
    assert.equal(m.taBorder, '0px', 'ô nhập không được có viền riêng trong khung' + at);
    assert.ok(m.btnRadius >= 18, 'nút Thêm phải bo tròn, được ' + m.btnRadius + at);
    assert.ok(m.hintBelow, 'gợi ý phải nằm dưới khung thêm mục' + at);
    assert.ok(m.hintSize >= 12, 'gợi ý quá nhỏ: ' + m.hintSize + at);
    assert.ok(m.pageOverflow <= 0 && m.bodyOverflow <= 1, 'tràn ngang' + at + ' ' + JSON.stringify(m));
    await context.close();
  }
  console.log('PASS: checklist gọn và bo tròn; thanh % giữ vùng chạm 44px; khung thêm mục là viên thuốc có gợi ý bên dưới (390/820/1440px).');
} finally {
  await h.close();
}
