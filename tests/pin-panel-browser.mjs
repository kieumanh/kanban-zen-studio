// Hồi quy v1.15.51: khu vực ghim ghi chú có biểu tượng minh họa, tiêu đề, mô tả, nút đủ lớn; trạng thái đang ghim nhìn thấy ngay;
// bố cục không tràn ngang ở 390/820/1440 px; ghim và bỏ ghim vẫn lưu đúng (ghim đầu danh sách, ghim nhanh).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const note = (id, title, extra = {}) => ({ id, type: 'note', title, text: 'Nội dung ' + title, url: '', group: '', color: '#7950c8', ...extra });
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4)],
  notes: [note('n1', 'Ghi chú chưa ghim'), note('n2', 'Ghi chú đã ghim', { pinned: true, quickPinned: true })],
});
const h = await startHarness({ seed });

const rowInfo = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('#editor .zen-note-pin-panel');
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), l: r.left, r: r.right };
    };
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panelRight: panel.getBoundingClientRect().right,
      editorRight: document.querySelector('#editor').getBoundingClientRect().right,
      rows: [...panel.querySelectorAll('.zen-editor-pin-row')].map((row) => {
        const icon = row.querySelector('.zen-pin-icon');
        const button = row.querySelector('.zen-editor-pin');
        const hint = row.querySelector('.zen-editor-pin-hint');
        return {
          title: row.querySelector('.zen-pin-title')?.textContent,
          hint: hint?.textContent,
          hintSize: parseFloat(getComputedStyle(hint).fontSize),
          iconSvg: !!icon?.querySelector('svg'),
          iconHidden: icon?.getAttribute('aria-hidden'),
          iconBg: icon && getComputedStyle(icon).backgroundImage + '|' + getComputedStyle(icon).backgroundColor,
          pressed: button.getAttribute('aria-pressed'),
          button: rect(button),
          buttonText: button.textContent,
          row: rect(row),
          inside: row.getBoundingClientRect().right <= panel.getBoundingClientRect().right + 0.5,
        };
      }),
    };
  });

const saved = (page, id) => page.evaluate((id) => ({ pinned: !!data.notes.find((n) => n.id === id).pinned, quick: !!data.notes.find((n) => n.id === id).quickPinned }), id);

try {
  for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
    const label = width + 'px' + (touch ? ' cảm ứng' : '');
    const { context, page } = await h.open(width, { touch });
    await h.show(page, 'notes');

    // Ghi chú chưa ghim.
    await page.evaluate(() => noteForm(data.notes.find((n) => n.id === 'n1')));
    await page.waitForSelector('#editor .zen-note-pin-panel .zen-pin-icon');
    let info = await rowInfo(page);
    assert.equal(info.rows.length, 2, `${label}: phải có hai thẻ ghim`);
    assert.deepEqual(info.rows.map((r) => r.title), ['Ghim lên đầu danh sách', 'Ghim nhanh ở menu'], `${label}: tiêu đề hai thẻ ghim`);
    for (const r of info.rows) {
      assert.ok(r.iconSvg, `${label}: mỗi thẻ ghim phải có biểu tượng minh họa (${r.title})`);
      assert.equal(r.iconHidden, 'true', `${label}: biểu tượng trang trí phải ẩn với trình đọc màn hình`);
      assert.ok(r.hint && r.hintSize >= 12, `${label}: mô tả phải có và cỡ chữ >= 12px (nhận được ${r.hintSize})`);
      assert.ok(r.button.h >= (touch ? 44 : 40), `${label}: nút ghim phải đủ cao (nhận được ${r.button.h}px)`);
      assert.ok(r.inside, `${label}: thẻ ghim không được tràn khỏi khung`);
      assert.equal(r.pressed, 'false', `${label}: ghi chú chưa ghim`);
    }
    assert.ok(info.overflow <= 0, `${label}: trang không được tràn ngang (${info.overflow}px)`);
    if (width <= 520) assert.ok(info.rows[1].row.l === info.rows[0].row.l, `${label}: điện thoại xếp thẻ ghim thành một cột`);
    else assert.ok(Math.abs(info.rows[0].row.h - info.rows[1].row.h) <= 2 && info.rows[1].row.l > info.rows[0].row.r, `${label}: màn hình rộng đặt hai thẻ ghim cạnh nhau`);
    const idleIcon = info.rows[0].iconBg;

    // Ghim đầu danh sách: lưu đúng, nút/mô tả/biểu tượng đổi trạng thái.
    await page.locator('#editor .zen-note-pin-panel .zen-editor-pin:not(.zen-editor-quick-pin)').click();
    await page.waitForFunction(() => document.querySelector('#editor .zen-editor-pin:not(.zen-editor-quick-pin)').getAttribute('aria-pressed') === 'true');
    info = await rowInfo(page);
    assert.deepEqual(await saved(page, 'n1'), { pinned: true, quick: false }, `${label}: ghim đầu danh sách phải lưu`);
    assert.equal(info.rows[0].buttonText, 'Bỏ ghim ghi chú', `${label}: nút đổi thành Bỏ ghim`);
    assert.notEqual(info.rows[0].iconBg, idleIcon, `${label}: biểu tượng phải đổi màu khi đang ghim`);
    assert.match(info.rows[0].iconBg, /gradient/, `${label}: biểu tượng đang ghim dùng nền chuyển màu`);

    // Ghim nhanh.
    await page.locator('#editor .zen-editor-quick-pin').click();
    await page.waitForFunction(() => document.querySelector('#editor .zen-editor-quick-pin').getAttribute('aria-pressed') === 'true');
    assert.deepEqual(await saved(page, 'n1'), { pinned: true, quick: true }, `${label}: ghim nhanh phải lưu`);
    info = await rowInfo(page);
    assert.equal(info.rows[1].buttonText, 'Bỏ ghim nhanh', `${label}: nút ghim nhanh đổi thành Bỏ ghim nhanh`);

    // Bỏ ghim cả hai: trả dữ liệu về như cũ.
    await page.locator('#editor .zen-note-pin-panel .zen-editor-pin:not(.zen-editor-quick-pin)').click();
    await page.locator('#editor .zen-editor-quick-pin').click();
    await page.waitForFunction(() => document.querySelector('#editor .zen-editor-quick-pin').getAttribute('aria-pressed') === 'false' && document.querySelector('#editor .zen-editor-pin:not(.zen-editor-quick-pin)').getAttribute('aria-pressed') === 'false');
    assert.deepEqual(await saved(page, 'n1'), { pinned: false, quick: false }, `${label}: bỏ ghim phải lưu`);
    await page.evaluate(() => document.querySelector('#editor').close());

    // Ghi chú đã ghim sẵn: mở ra thấy ngay trạng thái đang ghim.
    await page.evaluate(() => noteForm(data.notes.find((n) => n.id === 'n2')));
    await page.waitForSelector('#editor .zen-note-pin-panel .zen-pin-icon');
    info = await rowInfo(page);
    assert.deepEqual(info.rows.map((r) => r.pressed), ['true', 'true'], `${label}: ghi chú đã ghim hiện trạng thái đang ghim`);
    assert.ok(info.rows.every((r) => /gradient/.test(r.iconBg)), `${label}: biểu tượng của ghi chú đã ghim phải nổi bật`);
    assert.ok(info.overflow <= 0, `${label}: không tràn ngang (ghi chú đã ghim)`);

    await context.close();
    console.log(`  đạt ${label}`);
  }
  console.log('PASS: khu vực ghim ghi chú có biểu tượng, trạng thái đang ghim rõ, vừa khung ở 390/820/1440 px; ghim và bỏ ghim vẫn lưu đúng.');
} finally {
  await h.close();
}
