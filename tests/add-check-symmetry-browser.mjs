// Hồi quy v1.19.11: ô "Thêm mục mới" của checklist cân đối. Trước đây nút "+ Thêm" bị đẩy xuống bởi lề trên 12px !important
// (workflow111.css) và ô nhập bị lệch 6px (lề trên của .field textarea), nên khoảng trống trên và dưới viên bo không bằng nhau
// (ở 390px: nút cách mép trên 26px, cách mép dưới 14px). Kiểm ở 390 / 820 (cảm ứng) và 1440 (chuột): tâm của nút và
// tâm của ô nhập trùng tâm viên bo (sai số ≤1px), và cả hai nằm gọn trong viên bo.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = 'Xây dựng trang Công việc cụ thể của farm';
  p.tasks[0].col = 'Doing';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Phác thảo ý tưởng', done: false, pct: 0 },
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
    await page.evaluate(() =>
      taskDetail(project('p1'), project('p1').tasks[0]),
    );
    await page.waitForSelector('#editor-body .zen-check-add', {
      state: 'attached',
    });
    await page.locator('#editor-body .zen-check-add').scrollIntoViewIfNeeded();

    const m = await page.evaluate(() => {
      const wrap = document.querySelector('#editor-body .zen-check-add');
      const ta = wrap.querySelector('textarea');
      const btn = wrap.querySelector('button');
      const box = (el) => el.getBoundingClientRect();
      const w = box(wrap),
        t = box(ta),
        b = box(btn);
      const mid = (r) => (r.top + r.bottom) / 2;
      return {
        wrapMid: mid(w),
        taMid: mid(t),
        btnMid: mid(b),
        taTop: t.top - w.top,
        taBottom: w.bottom - t.bottom,
        btnTop: b.top - w.top,
        btnBottom: w.bottom - b.bottom,
        btnInside:
          b.left >= w.left &&
          b.right <= w.right &&
          b.top >= w.top &&
          b.bottom <= w.bottom,
        taInside:
          t.left >= w.left &&
          t.right <= w.right &&
          t.top >= w.top &&
          t.bottom <= w.bottom,
        btnText: btn.textContent.trim(),
      };
    });
    assert.equal(m.btnText, '+ Thêm', 'nút phải là "+ Thêm"' + at);
    assert.ok(
      m.btnInside && m.taInside,
      'nút hoặc ô nhập tràn ra ngoài viên bo' + at,
    );
    assert.ok(
      Math.abs(m.btnMid - m.wrapMid) <= 1,
      `nút "+ Thêm" lệch tâm: cách trên ${m.btnTop.toFixed(1)}px, cách dưới ${m.btnBottom.toFixed(1)}px` +
        at,
    );
    assert.ok(
      Math.abs(m.taMid - m.wrapMid) <= 1,
      `ô nhập lệch tâm: cách trên ${m.taTop.toFixed(1)}px, cách dưới ${m.taBottom.toFixed(1)}px` +
        at,
    );
    await context.close();
  }
  console.log(
    'PASS: ô "Thêm mục mới" cân đối: nút "+ Thêm" và ô nhập đều căn giữa trong viên bo (390/820/1440px).',
  );
} finally {
  await h.close();
}
