// Hồi quy v1.19.12: hàng "Chi tiết công việc" của hộp công việc có nút Ghim cạnh nút Chế độ tập trung (trước đây là chỗ trống).
// Kiểm ở 390 / 820 (cảm ứng) và 1440 (chuột): hai nút nằm cùng nhóm, cùng chiều cao, cùng tâm dọc, nằm gọn trong hàng;
// bấm Ghim thì việc được ghim (menu bên trái cập nhật, nút đổi trạng thái), bấm lại thì bỏ ghim, và chữ đang gõ trong hộp không mất.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const TITLE = 'Xây dựng trang Công việc cụ thể của farm';
const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = TITLE;
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
    const hasPin = await page
      .waitForSelector('#editor-body .task-pin-shortcut', {
        state: 'attached',
        timeout: 5000,
      })
      .then(
        () => true,
        () => false,
      );
    assert.ok(hasPin, 'hàng "Chi tiết công việc" chưa có nút Ghim' + at);

    const geo = await page.evaluate(() => {
      const row = document.querySelector('#editor-body .wf-task-heading-row');
      const pin = row.querySelector('.task-pin-shortcut');
      const focus = row.querySelector('.task-focus-shortcut');
      const rb = row.getBoundingClientRect(),
        pb = pin.getBoundingClientRect(),
        fb = focus.getBoundingClientRect();
      return {
        sameGroup:
          pin.parentElement === focus.parentElement &&
          pin.parentElement.classList.contains('wf-task-heading-actions'),
        pinLeftOfFocus: pb.right <= fb.left + 1,
        pinH: pb.height,
        focusH: fb.height,
        midDiff: Math.abs((pb.top + pb.bottom) / 2 - (fb.top + fb.bottom) / 2),
        inRow:
          pb.left >= rb.left &&
          pb.right <= rb.right &&
          pb.top >= rb.top &&
          pb.bottom <= rb.bottom,
        pressed: pin.getAttribute('aria-pressed'),
        text: pin.textContent.trim(),
      };
    });
    assert.ok(
      geo.sameGroup,
      'nút Ghim và nút Chế độ tập trung phải nằm chung một nhóm' + at,
    );
    assert.ok(
      geo.pinLeftOfFocus,
      'nút Ghim phải nằm bên trái nút Chế độ tập trung' + at,
    );
    assert.ok(
      Math.abs(geo.pinH - geo.focusH) <= 1,
      `chiều cao hai nút khác nhau: ${geo.pinH} / ${geo.focusH}` + at,
    );
    assert.ok(
      geo.midDiff <= 1,
      `hai nút lệch tâm dọc ${geo.midDiff.toFixed(1)}px` + at,
    );
    assert.ok(geo.inRow, 'nút Ghim tràn ra ngoài hàng tiêu đề' + at);
    assert.equal(geo.pressed, 'false', at);
    assert.equal(geo.text, 'Ghim', at);

    // Gõ dở tên việc, rồi ghim: chữ đang gõ không được mất và hộp vẫn mở.
    await page.fill('#editor-form [name=title]', 'Tên đang sửa dở');
    await page.click('#editor-body .task-pin-shortcut');
    const afterPin = await page.evaluate(
      (title) => ({
        pinned: !!project('p1').tasks[0].pinned,
        pressed: document
          .querySelector('#editor-body .task-pin-shortcut')
          .getAttribute('aria-pressed'),
        text: document
          .querySelector('#editor-body .task-pin-shortcut')
          .textContent.trim(),
        sidebar:
          document.querySelector('#side-pinned-tasks')?.textContent || '',
        editorOpen: document.querySelector('#editor').open,
        draft: document.querySelector('#editor-form [name=title]').value,
        title,
      }),
      TITLE,
    );
    assert.equal(afterPin.pinned, true, 'việc chưa được ghim' + at);
    assert.equal(afterPin.pressed, 'true', at);
    assert.equal(afterPin.text, 'Đã ghim', at);
    assert.ok(
      afterPin.sidebar.includes(TITLE),
      'menu bên trái chưa hiện việc đã ghim' + at,
    );
    assert.ok(afterPin.editorOpen, 'hộp công việc bị đóng khi ghim' + at);
    assert.equal(
      afterPin.draft,
      'Tên đang sửa dở',
      'chữ đang gõ bị mất khi ghim' + at,
    );

    await page.click('#editor-body .task-pin-shortcut');
    const afterUnpin = await page.evaluate(() => ({
      pinned: !!project('p1').tasks[0].pinned,
      pressed: document
        .querySelector('#editor-body .task-pin-shortcut')
        .getAttribute('aria-pressed'),
      text: document
        .querySelector('#editor-body .task-pin-shortcut')
        .textContent.trim(),
    }));
    assert.equal(afterUnpin.pinned, false, 'bỏ ghim chưa có tác dụng' + at);
    assert.equal(afterUnpin.pressed, 'false', at);
    assert.equal(afterUnpin.text, 'Ghim', at);
    await context.close();
  }
  console.log(
    'PASS: nút Ghim cạnh Chế độ tập trung (390/820/1440px): cùng nhóm, cùng chiều cao, bấm ghim/bỏ ghim cập nhật menu bên trái, không mất chữ đang gõ.',
  );
} finally {
  await h.close();
}
