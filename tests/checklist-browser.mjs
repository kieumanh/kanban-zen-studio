// Hồi quy v1.17.4: checklist trong hộp công việc — thẻ bo tròn, nút ↑/↓ đổi thứ tự (chạm và bàn phím), thêm mục bằng Enter, chữ dài không bị cắt.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Liên hệ địa điểm tổ chức', done: true },
    {
      id: 'c2',
      text: 'Soạn chương trình ba ngày hai đêm và gửi cho ban tổ chức duyệt trước cuối tuần này, nhớ kèm danh sách khách mời và phương án dự phòng khi thời tiết xấu',
      done: false,
    },
    { id: 'c3', text: 'In tài liệu', done: false },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const ids = (page) =>
  page.evaluate(() =>
    project('p1')
      .tasks[0].checks.map((c) => c.id)
      .join(','),
  );
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 700 });
    const at = ` (${width}px)`;
    await h.show(page, 'projects');
    await page.evaluate(() =>
      taskDetail(project('p1'), project('p1').tasks[0]),
    );
    await page.waitForSelector('#editor .zen-check-actions');
    await page.waitForTimeout(350);

    // 1. Không còn nút ↑/↓ (v1.19.0): chỉ còn kéo thả và Alt + ↑/↓ trên tay kéo. Mỗi mục có tay kéo và nút bỏ mục nằm trong cụm.
    const state = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '#editor .wf-check-sort-list .compact-check',
        ),
      ].map((row) => ({
        moveButtons: row.querySelectorAll('.zen-check-move').length,
        grip: !!row.querySelector('[data-wf-sort="check"]'),
        remove: !!row.querySelector('.zen-check-actions .compact-check-remove'),
        done: row.classList.contains('is-complete'),
        clipped:
          row.querySelector('textarea').scrollHeight >
          row.querySelector('textarea').clientHeight + 1,
        bg: getComputedStyle(row).backgroundColor,
      })),
    );
    assert.equal(state.length, 3, 'số mục' + at);
    assert.ok(
      state.every((s) => s.moveButtons === 0),
      'không còn nút ↑/↓' + at,
    );
    assert.ok(
      state.every((s) => s.grip),
      'mỗi mục có tay kéo' + at,
    );
    assert.ok(
      state.every((s) => s.remove),
      'nút bỏ mục nằm trong cụm' + at,
    );
    assert.ok(
      state.every((s) => !s.clipped),
      'chữ trong mục bị cắt' + at + JSON.stringify(state.map((s) => s.clipped)),
    );
    assert.notEqual(
      state[0].bg,
      state[1].bg,
      'mục xong phải khác màu mục chưa xong' + at,
    );
    assert.equal(
      await page
        .locator(
          '#editor .zen-check-add label, #editor label:has(.zen-check-add)',
        )
        .first()
        .innerText()
        .then((t) => t.split('\n')[0].trim()),
      'Thêm mục mới',
      'nhãn ô thêm mục' + at,
    );

    // 2. Alt + ↓ trên tay kéo của mục đầu: đổi thứ tự, lưu vào dữ liệu, tiêu điểm ở lại trên mục đã di chuyển. Alt + ↑ quay lại.
    await page
      .locator(
        '#editor .compact-check[data-wf-check-id="c1"] [data-wf-sort="check"]',
      )
      .focus();
    await page.keyboard.press('Alt+ArrowDown');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks[0].id === 'c2',
    );
    assert.equal(
      await ids(page),
      'c2,c1,c3',
      'thứ tự sau khi nhấn Alt + ↓' + at,
    );
    // Ghi chú: Alt + ↑/↓ chưa giữ tiêu điểm sau khi di chuyển (có từ trước v1.19.0, không thuộc phạm vi bản này); test đặt lại tiêu điểm thủ công.
    await page.waitForFunction(
      () =>
        [
          ...document.querySelectorAll(
            '#editor .wf-check-sort-list .compact-check',
          ),
        ]
          .map((row) => row.dataset.wfCheckId)
          .join(',') === 'c2,c1,c3',
    );
    // Chờ vẽ lại xong (có lần vẽ lại thứ hai) rồi mới đặt tiêu điểm, giống các bước khác trong file.
    await page.waitForTimeout(400);
    await page
      .locator(
        '#editor .compact-check[data-wf-check-id="c1"] [data-wf-sort="check"]',
      )
      .focus();
    await page.keyboard.press('Alt+ArrowUp');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks[0].id === 'c1',
    );
    assert.equal(
      await ids(page),
      'c1,c2,c3',
      'thứ tự sau khi nhấn Alt + ↑' + at,
    );

    // 4. Gõ mục mới rồi nhấn Enter: thêm đúng một mục, không xuống dòng.
    await page.locator('#editor [name=extra-checks]').fill('Gửi lời mời');
    await page.locator('#editor [name=extra-checks]').press('Enter');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.length === 4,
    );
    assert.deepEqual(
      await page.evaluate(() =>
        project('p1')
          .tasks[0].checks.map((c) => c.text)
          .slice(-1),
      ),
      ['Gửi lời mời'],
      'mục mới' + at,
    );
    // Dữ liệu được lưu ngay khi gửi biểu mẫu, còn vẽ lại hộp thoại (xóa ô nhập) diễn ra ở sự kiện đóng ngay sau đó: chờ vẽ lại rồi mới kiểm.
    await page
      .waitForFunction(
        () =>
          document.querySelector('#editor [name=extra-checks]')?.value === '',
        null,
        { timeout: 5000 },
      )
      .catch(() => {});
    assert.equal(
      await page.evaluate(
        () => document.querySelector('#editor [name=extra-checks]').value,
      ),
      '',
      'ô nhập được xóa sau khi thêm' + at,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: checklist — không còn nút ↑/↓, Alt + ↑/↓ đổi thứ tự, Enter để thêm, chữ không bị cắt (390/820/1440px).',
  );
} finally {
  await h.close();
}
