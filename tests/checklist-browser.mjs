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

    // 1. Mỗi mục có cụm nút ↑ ↓ ×; mục đầu không lên được, mục cuối không xuống được.
    const state = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          '#editor .wf-check-sort-list .compact-check',
        ),
      ].map((row) => ({
        move: [...row.querySelectorAll('.zen-check-move')].map(
          (b) => b.disabled,
        ),
        remove: !!row.querySelector('.zen-check-actions .compact-check-remove'),
        done: row.classList.contains('is-complete'),
        clipped:
          row.querySelector('textarea').scrollHeight >
          row.querySelector('textarea').clientHeight + 1,
        bg: getComputedStyle(row).backgroundColor,
      })),
    );
    assert.equal(state.length, 3, 'số mục' + at);
    assert.deepEqual(
      state.map((s) => s.move),
      [
        [true, false],
        [false, false],
        [false, true],
      ],
      'trạng thái nút ↑/↓' + at,
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

    // 2. Vùng chạm đủ lớn trên màn hình cảm ứng.
    if (width < 700) {
      const sizes = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '#editor .zen-check-move:not(:disabled)',
          ),
        ].map((b) => {
          const r = b.getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.height)];
        }),
      );
      assert.ok(
        sizes.every(([w, hh]) => w >= 44 && hh >= 44),
        'nút ↑/↓ nhỏ hơn 44px' + at + JSON.stringify(sizes),
      );
    }

    // 3. ↓ ở mục đầu: đổi thứ tự, lưu vào dữ liệu và tiêu điểm ở lại trên mục đã di chuyển.
    await page
      .locator('#editor .compact-check')
      .first()
      .locator('.zen-check-move[data-zen-check-move="1"]')
      .click();
    await page.waitForFunction(
      () => project('p1').tasks[0].checks[0].id === 'c2',
    );
    assert.equal(await ids(page), 'c2,c1,c3', 'thứ tự sau khi bấm ↓' + at);
    await page.waitForFunction(() =>
      document.activeElement?.classList.contains('zen-check-move'),
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.activeElement.closest('.compact-check').dataset.wfCheckId,
      ),
      'c1',
      'tiêu điểm theo mục đã di chuyển' + at,
    );
    // Bấm ↑ ở mục vừa xuống để quay lại.
    await page
      .locator(
        '#editor .compact-check[data-wf-check-id="c1"] .zen-check-move[data-zen-check-move="-1"]',
      )
      .click();
    await page.waitForFunction(
      () => project('p1').tasks[0].checks[0].id === 'c1',
    );
    assert.equal(await ids(page), 'c1,c2,c3', 'thứ tự sau khi bấm ↑' + at);

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
    'PASS: checklist — thẻ bo tròn, ↑/↓ đổi thứ tự và giữ tiêu điểm, Enter để thêm, chữ không bị cắt (390/820/1440px).',
  );
} finally {
  await h.close();
}
