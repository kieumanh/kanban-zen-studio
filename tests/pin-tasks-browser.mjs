// Hồi quy v1.19.3: nút ghim trở lại trên thẻ công việc; mục "Ghim công việc" ở thanh bên nằm TRÊN "Ghi chú ghim nhanh",
// hiện tối đa 3 việc, có nút xem tất cả (mở rộng khi quá 3 việc; từ v1.66.0 không còn nút phụ khi có ≤ 3 việc vì đã gỡ trang Tất cả công việc), bỏ ghim được; không tràn ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#d65380', 8);
  for (let i = 0; i < 4; i++) p.tasks[i].pinned = true; // 4 việc đã ghim: quá 3 nên có "Xem tất cả (4)"
  p.tasks[3].col = 'Doing'; // v1.46.0: việc Xong không còn được ghim; việc mẫu thứ 4 đang mở để vẫn đủ 4 việc ghim
  p.tasks[0].title = 'Việc ghim có tên rất dài để thử cắt chữ ở thanh bên hẹp trên điện thoại';
  return {
    schema: 1,
    projects: [p],
    notes: [{ id: 'n1', type: 'note', title: 'Lịch thiền', text: 'Dòng đầu', url: '', group: '', color: '#3f9a72', quickPinned: true }],
  };
};
const h = await startHarness({ seed });
const rows = (page) => page.locator('#side-pinned-tasks .zen-pin-task-item').count();
const openSidebar = (page, width) =>
  width < 1000 ? page.evaluate(() => document.querySelector('.sidebar').classList.add('open')) : null;
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 1000 });
    const at = ` (${width}px)`;
    await h.show(page, 'projects');
    await page.waitForSelector('#main .task-card');

    // 1. Nút ghim có trên thẻ; thẻ đã ghim báo "Bỏ ghim", thẻ chưa ghim báo "Ghim"; bấm nút ghim thì việc được ghim.
    await page.waitForSelector('#main .zen-task-pin');
    const labels = await page.evaluate(() => {
      const byTask = (id) => document.querySelector(`#main .task-card[data-task="${id}"] .zen-task-pin`);
      return {
        pinned: byTask('p1t0')?.getAttribute('aria-label'),
        plain: byTask('p1t5')?.getAttribute('aria-label'),
        pressed: byTask('p1t0')?.getAttribute('aria-pressed'),
        size: (() => {
          const r = byTask('p1t5')?.getBoundingClientRect();
          return r ? [Math.round(r.width), Math.round(r.height)] : null;
        })(),
      };
    });
    assert.equal(labels.pinned, 'Bỏ ghim công việc', 'thẻ đã ghim phải báo "Bỏ ghim công việc"' + at);
    assert.equal(labels.plain, 'Ghim công việc', 'thẻ chưa ghim phải báo "Ghim công việc"' + at);
    assert.equal(labels.pressed, 'true', 'nút ghim phải có aria-pressed' + at);
    assert.ok(labels.size[0] >= 32 && labels.size[1] >= 32, 'nút ghim quá nhỏ ' + labels.size + at);
    await page.locator('#main .task-card[data-task="p1t5"] .zen-task-pin').click();
    await page.waitForFunction(() => project('p1').tasks[5].pinned === true);

    // 2. Thanh bên: "Ghim công việc" đứng trên "Ghi chú ghim nhanh", chỉ hiện 3 việc, tổng số hiện ở nhãn.
    await openSidebar(page, width);
    await page.waitForSelector('#side-pinned-tasks .zen-pin-task-item');
    const info = await page.evaluate(() => {
      const tasks = document.querySelector('#side-pinned-tasks'),
        notes = document.querySelector('#side-quick-notes'),
        side = document.querySelector('.sidebar').getBoundingClientRect(),
        tr = tasks.getBoundingClientRect(),
        nr = notes.getBoundingClientRect(),
        un = tasks.querySelector('[data-zen-task-unpin]').getBoundingClientRect();
      return {
        label: tasks.querySelector('.navlabel').textContent.replace(/\s+/g, ' ').trim(),
        order: Boolean(tasks.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING),
        above: tr.bottom <= nr.top + 1,
        inside: tr.left >= side.left - 1 && tr.right <= side.right + 1,
        unpin: [Math.round(un.width), Math.round(un.height)],
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        rowOverflow: [...tasks.querySelectorAll('.zen-pin-task-item')].some((r) => r.scrollWidth > r.clientWidth + 1),
        more: tasks.querySelector('.zen-pin-task-all')?.textContent.replace(/\s+/g, ' ').trim(),
        expanded: tasks.querySelector('.zen-pin-task-all')?.getAttribute('aria-expanded'),
      };
    });
    assert.match(info.label, /^Ghim công việc\s*5$/, 'nhãn phải là "Ghim công việc" kèm tổng số việc ghim: ' + info.label + at);
    assert.ok(info.order && info.above, '"Ghim công việc" phải nằm trên "Ghi chú ghim nhanh"' + at);
    assert.ok(info.inside, 'khung Ghim công việc ra ngoài thanh bên' + at);
    assert.ok(info.unpin[0] >= 34 && info.unpin[1] >= 44, 'nút bỏ ghim quá nhỏ ' + info.unpin + at);
    assert.ok(!info.pageOverflow && !info.rowOverflow, 'tràn ngang' + at);
    assert.equal(await rows(page), 3, 'chỉ hiện tối đa 3 việc ghim' + at);
    assert.equal(info.more, 'Xem tất cả (5) ↓', 'nút xem tất cả' + at);
    assert.equal(info.expanded, 'false');

    // 3. Xem tất cả mở rộng ngay tại chỗ; bấm lại thì thu gọn về 3 việc.
    await page.locator('#side-pinned-tasks .zen-pin-task-all').click();
    await page.waitForFunction(() => document.querySelectorAll('#side-pinned-tasks .zen-pin-task-item').length === 5);
    assert.equal(
      await page.locator('#side-pinned-tasks .zen-pin-task-all').getAttribute('aria-expanded'),
      'true',
      'sau khi mở rộng phải aria-expanded=true' + at,
    );
    assert.match(await page.locator('#side-pinned-tasks .zen-pin-task-all').textContent(), /^Thu gọn/, 'nút phải đổi thành Thu gọn' + at);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'tràn ngang khi mở rộng' + at);
    await page.locator('#side-pinned-tasks .zen-pin-task-all').click();
    await page.waitForFunction(() => document.querySelectorAll('#side-pinned-tasks .zen-pin-task-item').length === 3);

    // 4. Bỏ ghim bằng nút ×: việc không mất, chỉ bỏ cờ ghim; còn ≤ 3 việc thì không còn nút xem tất cả (và không còn nút sang "Tất cả công việc").
    await page.locator('#side-pinned-tasks .zen-pin-task-all').click(); // mở rộng để thấy cả 5 việc rồi bỏ ghim 2 việc cuối
    await page.waitForFunction(() => document.querySelectorAll('#side-pinned-tasks .zen-pin-task-item').length === 5);
    await page.locator('#side-pinned-tasks [data-zen-task-unpin="p1|p1t5"]').evaluate((b) => b.click());
    await page.waitForFunction(() => project('p1').tasks[5].pinned === false);
    await page.locator('#side-pinned-tasks [data-zen-task-unpin="p1|p1t3"]').evaluate((b) => b.click());
    await page.waitForFunction(() => project('p1').tasks.filter((t) => t.pinned).length === 3);
    assert.equal(await page.evaluate(() => project('p1').tasks.length), 8, 'bỏ ghim không được làm mất việc' + at);
    await page.waitForFunction(() => !document.querySelector('#side-pinned-tasks .zen-pin-task-all'));
    assert.equal(await rows(page), 3, 'còn 3 việc ghim' + at);
    assert.equal(await page.locator('#side-pinned-tasks').innerText().then((t) => t.includes('Tất cả công việc')), false, 'không còn nút Tất cả công việc' + at);

    // 5. Bấm tên việc mở đúng việc.
    await openSidebar(page, width);
    await page.locator('#side-pinned-tasks [data-zen-task-shortcut]').first().click();
    await page.waitForSelector('dialog[open]');
    await page.evaluate(() => document.querySelector('dialog[open] .modal-close, dialog[open] [aria-label="Đóng"]')?.click());
    await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));

    // 6. Bỏ ghim hết thì khung ẩn đi.
    await page.evaluate(() => {
      project('p1').tasks.forEach((t) => (t.pinned = false));
      render();
    });
    assert.equal(await page.locator('#side-pinned-tasks').isHidden(), true, 'hết việc ghim thì khung phải ẩn' + at);
    await context.close();
  }
  console.log('PASS: nút ghim trên thẻ, "Ghim công việc" trên "Ghi chú ghim nhanh", tối đa 3 việc, xem tất cả và bỏ ghim (390/820/1440px).');
} finally {
  await h.close();
}
