// Hồi quy v1.18.0: sửa công việc trực tiếp trong Chế độ tập trung — tên, mô tả, checklist (tích, sửa chữ, thêm, xóa + hoàn tác, đổi thứ tự); tự lưu và đồng bộ lên máy chủ.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Dự án A', '#7950c8', 3);
  p.tasks[0].title = 'Chuẩn bị khóa tu';
  p.tasks[0].description = 'Soạn nội dung.';
  p.tasks[0].checks = [
    { id: 'c1', text: 'Liên hệ địa điểm', done: true },
    { id: 'c2', text: 'Soạn chương trình', done: false },
    { id: 'c3', text: 'In tài liệu', done: false },
  ];
  return { schema: 1, projects: [p], notes: [] };
};
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const { context, page, server } = await h.open(width, {
      touch: width < 700,
    });
    const at = ` (${width}px)`;
    const task = () => page.evaluate(() => project('p1').tasks[0]);
    const ids = () =>
      page.evaluate(() =>
        project('p1')
          .tasks[0].checks.map((c) => c.id)
          .join(','),
      );
    await h.show(page, 'projects');
    await page.evaluate(() => {
      _WF.focus = { p: 'p1', t: 'p1t0' };
      go('focus');
    });
    await page.locator('[data-fe-edit]').click();
    await page.waitForSelector('.zen-fe-form');
    await page.waitForTimeout(300);

    // 1. Vào chế độ sửa: khối đọc ẩn, form hiện, có nút Xong.
    assert.equal(
      await page
        .locator('.zen-focus-editing > .wf-focus-task-heading > h1')
        .isVisible(),
      false,
      'tiêu đề đọc phải ẩn' + at,
    );
    assert.equal(await page.locator('.zen-fe-row').count(), 3, 'số mục' + at);
    assert.ok(
      await page.locator('[data-fe-done]').isVisible(),
      'nút Xong' + at,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      'trang tràn ngang' + at,
    );

    // 2. Tên: sửa rồi rời ô thì lưu; để trống thì khôi phục tên cũ.
    await page.locator('.zen-fe-form [name=title]').fill('Khóa tu mùa thu');
    await page.locator('.zen-fe-form [name=title]').press('Enter');
    await page.waitForFunction(
      () => project('p1').tasks[0].title === 'Khóa tu mùa thu',
    );
    await page.locator('.zen-fe-form [name=title]').fill('   ');
    await page
      .locator('.zen-fe-form [name=title]')
      .evaluate((el) =>
        el.dispatchEvent(new Event('change', { bubbles: true })),
      );
    assert.equal(
      (await task()).title,
      'Khóa tu mùa thu',
      'tên trống không được lưu' + at,
    );
    assert.equal(
      await page.locator('.zen-fe-form [name=title]').inputValue(),
      'Khóa tu mùa thu',
      'ô tên được khôi phục' + at,
    );

    // 3. Mô tả có định dạng: gõ vào ô soạn thảo, tự lưu sau khi ngừng gõ.
    await page.locator('.zen-fe-form [contenteditable]').click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Thêm địa điểm.');
    await page.waitForFunction(
      () => project('p1').tasks[0].description.includes('Thêm địa điểm.'),
      null,
      { timeout: 5000 },
    );

    // 4. Tích một mục: lưu, đổi tiến độ, không cần vẽ lại.
    await page.locator('.zen-fe-row[data-fe-id="c2"] [data-fe-toggle]').check();
    await page.waitForFunction(
      () =>
        project('p1').tasks[0].checks.find((c) => c.id === 'c2').done === true,
    );
    assert.match(
      await page.locator('.wf-focus-progress-meta').innerText(),
      /2\/3/,
      'tiến độ sau khi tích' + at,
    );
    assert.equal(
      await page
        .locator('.zen-fe-row[data-fe-id="c2"]')
        .evaluate((el) => el.classList.contains('is-complete')),
      true,
      'hàng đã xong' + at,
    );

    // 5. Sửa chữ của mục.
    await page
      .locator('.zen-fe-row[data-fe-id="c3"] textarea')
      .fill('In tài liệu 50 bản');
    await page.locator('.zen-fe-row[data-fe-id="c3"] textarea').press('Enter');
    await page.waitForFunction(
      () =>
        project('p1').tasks[0].checks.find((c) => c.id === 'c3').text ===
        'In tài liệu 50 bản',
    );
    await page.locator('.zen-fe-row[data-fe-id="c3"] textarea').fill('');
    await page
      .locator('.zen-fe-row[data-fe-id="c3"] textarea')
      .evaluate((el) =>
        el.dispatchEvent(new Event('change', { bubbles: true })),
      );
    assert.equal(
      await page.locator('.zen-fe-row[data-fe-id="c3"] textarea').inputValue(),
      'In tài liệu 50 bản',
      'mục trống được khôi phục' + at,
    );

    // 6. Đổi thứ tự (v1.19.0): không còn nút ↑/↓; tay kéo ⠿ đổi thứ tự bằng kéo thả hoặc Alt + ↑/↓, giữ tiêu điểm theo mục.
    assert.equal(await page.locator('.zen-fe-row [data-fe-move]').count(), 0, 'không còn nút ↑/↓' + at);
    assert.equal(await page.locator('.zen-fe-row [data-fe-grip]').count(), 3, 'mỗi mục có tay kéo' + at);
    if (width < 700) {
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll('.zen-fe-row [data-fe-grip]')].map((b) => {
          const r = b.getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.height)];
        }),
      );
      assert.ok(
        sizes.every(([w, hh]) => w >= 44 && hh >= 44),
        'tay kéo nhỏ hơn 44px' + at + JSON.stringify(sizes),
      );
    }
    // Alt + ↑ trên tay kéo mục 3: lên trước mục 2, lưu, tiêu điểm vẫn ở tay kéo mục 3.
    await page.locator('.zen-fe-row[data-fe-id="c3"] [data-fe-grip]').focus();
    await page.keyboard.press('Alt+ArrowUp');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.map((c) => c.id).join(',') === 'c1,c3,c2',
    );
    await page.waitForFunction(() =>
      document.activeElement?.matches('[data-fe-grip]') &&
      document.activeElement.dataset.feId === 'c3',
    );
    assert.equal(await ids(page), 'c1,c3,c2', 'Alt + ↑ đổi thứ tự và lưu' + at);
    // Kéo thả: mục 2 vào nửa trên của mục 3 (trước mục 3), rồi vào nửa dưới của mục 3 (sau mục 3).
    const row = (id) => page.locator('.zen-fe-row[data-fe-id="' + id + '"]');
    const dragOnto = async (fromId, toId, side) => {
      const box = await row(toId).boundingBox();
      const y = side === 'before' ? 4 : box.height - 4;
      await row(fromId).locator('[data-fe-grip]').dragTo(row(toId), { targetPosition: { x: 40, y } });
    };
    await dragOnto('c2', 'c3', 'before');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.map((c) => c.id).join(',') === 'c1,c2,c3',
    );
    assert.equal(await ids(page), 'c1,c2,c3', 'kéo thả: đặt mục 2 trước mục 3' + at);
    await dragOnto('c2', 'c3', 'after');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.map((c) => c.id).join(',') === 'c1,c3,c2',
    );
    assert.equal(await ids(page), 'c1,c3,c2', 'kéo thả: đặt mục 2 sau mục 3' + at);
    // Cảm ứng (390px): kéo tay ⠿ bằng sự kiện chạm thật (CDP): mục 2 lên trước mục 3, rồi trả về sau mục 3.
    if (width < 700) {
      const cdp = await context.newCDPSession(page);
      const touchDragOnto = async (fromId, toId, side) => {
        // Cuộn hai dòng vào khung nhìn trước: sự kiện chạm qua CDP không tự cuộn như chuột.
        await row(fromId).scrollIntoViewIfNeeded();
        await row(toId).scrollIntoViewIfNeeded();
        const from = await row(fromId).locator('[data-fe-grip]').boundingBox();
        const to = await row(toId).boundingBox();
        const x0 = from.x + from.width / 2, y0 = from.y + from.height / 2;
        const x1 = to.x + 40, y1 = side === 'before' ? to.y + 4 : to.y + to.height - 4;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
        for (let k = 1; k <= 10; k++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * k) / 10, y: y0 + ((y1 - y0) * k) / 10 }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
      await touchDragOnto('c2', 'c3', 'before');
      await page.waitForFunction(
        () => project('p1').tasks[0].checks.map((c) => c.id).join(',') === 'c1,c2,c3',
      );
      await touchDragOnto('c2', 'c3', 'after');
      await page.waitForFunction(
        () => project('p1').tasks[0].checks.map((c) => c.id).join(',') === 'c1,c3,c2',
      );
      assert.equal(await ids(page), 'c1,c3,c2', 'cảm ứng: kéo tay ⠿ đổi thứ tự' + at);
    }

    // 7. Xóa rồi hoàn tác: về đúng vị trí.
    await page.locator('.zen-fe-row[data-fe-id="c1"] [data-fe-remove]').click();
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.length === 2,
    );
    assert.ok(
      await page.locator('[data-fe-undo]').isVisible(),
      'có nút Hoàn tác' + at,
    );
    await page.locator('[data-fe-undo]').click();
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.length === 3,
    );
    assert.equal(await ids(), 'c1,c3,c2', 'hoàn tác về đúng vị trí' + at);

    // 8. Thêm mục: Enter thêm một, Shift+Enter thêm nhiều dòng.
    const add = page.locator('.zen-fe-form [data-fe-new]');
    await add.fill('Gửi lời mời');
    await add.press('Enter');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.length === 4,
    );
    await add.fill('Đặt phòng');
    await add.press('Shift+Enter');
    await page.keyboard.type('Mua trái cây');
    await add.press('Enter');
    await page.waitForFunction(
      () => project('p1').tasks[0].checks.length === 6,
    );
    assert.deepEqual(
      await page.evaluate(() =>
        project('p1')
          .tasks[0].checks.map((c) => c.text)
          .slice(-3),
      ),
      ['Gửi lời mời', 'Đặt phòng', 'Mua trái cây'],
      'các mục mới' + at,
    );

    // 9. Xong: thoát chế độ sửa, khối đọc hiện lại đúng dữ liệu mới; máy chủ nhận đủ thay đổi.
    await page.locator('[data-fe-done]').click();
    await page.waitForSelector('.zen-fe-form', { state: 'detached' });
    assert.equal(
      await page.locator('.wf-focus-task-heading h1').innerText(),
      'Khóa tu mùa thu',
      'tiêu đề sau khi Xong' + at,
    );
    assert.equal(
      await page.locator('.zen-focus-editing').count(),
      0,
      'đã thoát chế độ sửa' + at,
    );
    assert.equal(
      await page.locator('.wf-focus-workspace .check-row').count(),
      6,
      'số mục ở khối đọc' + at,
    );
    const saved = await page.evaluate(() =>
      structuredClone(project('p1').tasks[0]),
    );
    // Đợi máy chủ giả nhận bản mới nhất.
    for (
      let i = 0;
      i < 40 &&
      JSON.stringify(server.workspace.projects[0].tasks[0].checks) !==
        JSON.stringify(saved.checks);
      i++
    )
      await page.waitForTimeout(250);
    assert.equal(
      server.workspace.projects[0].tasks[0].title,
      'Khóa tu mùa thu',
      'máy chủ nhận tên mới' + at,
    );
    assert.equal(
      JSON.stringify(server.workspace.projects[0].tasks[0].checks),
      JSON.stringify(saved.checks),
      'máy chủ nhận checklist mới' + at,
    );
    assert.match(
      server.workspace.projects[0].tasks[0].description,
      /Thêm địa điểm\./,
      'máy chủ nhận mô tả mới' + at,
    );
    // Các việc khác không bị đụng tới.
    assert.equal(
      await page.evaluate(() => project('p1').tasks.length),
      3,
      'số việc không đổi' + at,
    );
    await context.close();
  }
  console.log(
    'PASS: sửa trực tiếp trong Chế độ tập trung — tên, mô tả, tích, sửa chữ, thêm, xóa + hoàn tác, đổi thứ tự; tự lưu và lên máy chủ (390/820/1440px).',
  );
} finally {
  await h.close();
}
