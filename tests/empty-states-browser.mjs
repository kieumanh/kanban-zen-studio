// v2.44.0 (Trang Trống Có Hồn): trang trống có hình nhỏ và đúng một nút hành động chính; câu chữ gốc giữ nguyên.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px, cả Thiền lẫn Giang hồ:
//  1. Tổng quan không dự án, Ghi chú không ghi chú, Lưu trữ không dự án lưu trữ, Tài nguyên không tệp, Thùng rác trống: mỗi trang có đúng một khối .zen-empty.
//  2. Mỗi khối: một hình SVG ẩn với trình đọc (72 px), câu chữ gốc còn nguyên, đúng một nút chính (Thùng rác không có nút), nút cao ≥ 44 px, không tràn ngang.
//  3. Nút làm đúng việc: Tạo dự án mở biểu mẫu; Ghi chú mới mở trình soạn; Xem dự án sang trang Dự án; Tải tệp lên mở hộp tải tệp (khi đã có nơi cất tệp), nếu chưa thì nút là Tạo dự án.
//  4. Giang hồ: nhãn nút đổi giọng (Khởi đại sự, Chép quyển mới, Xem đại sự, Cất vào bảo khố), không còn chữ giọng Thiền trong khối.
//  5. Có dữ liệu thì không có khối trống; kết quả lọc (có ghi chú nhưng không khớp) không bị gắn nút “Ghi chú mới”.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const empty = () => ({ schema: 1, projects: [], notes: [] });
const full = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 3)],
  notes: [{ id: 'n1', title: 'Ý đầu tiên', text: 'Nội dung', group: '', keywords: [], createdAt: '2026-11-10T00:00:00.000Z', updatedAt: '2026-11-10T00:00:00.000Z' }],
});
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const CASES = [
  { view: 'dashboard', kind: 'project', label: ['Tạo dự án', 'Khởi đại sự'], attr: '[data-action="new-project"]' },
  { view: 'notes', kind: 'note', label: ['Ghi chú mới', 'Chép quyển mới'], attr: '[data-note-new]' },
  { view: 'archive', kind: 'archive', label: ['Xem dự án', 'Xem đại sự'], attr: '[data-view="projects"]' },
  // Chưa có dự án hay ghi chú thì chưa có nơi cất tệp: việc chính là tạo dự án trước (khi đã có nơi cất, nút là Tải tệp lên — kiểm ở cuối bài).
  { view: 'resources', kind: 'files', label: ['Tạo dự án', 'Khởi đại sự'], attr: '[data-action="new-project"]' },
  { view: 'trash', kind: 'trash', label: null, attr: null },
];

const h = await startHarness({ seed: empty });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const gh of [false, true]) {
      const at = ' (' + width + 'px' + (gh ? ', Giang hồ' : '') + ')';
      const { context, page } = await h.open(width, { touch, workspace: empty(), setup: gh ? GH : null });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      for (const c of CASES) {
        await h.show(page, c.view);
        await page.waitForSelector('#main .zen-empty[data-zen-empty="' + c.kind + '"]');
        const blocks = page.locator('#main .zen-empty');
        assert.equal(await blocks.count(), 1, c.view + ': đúng một khối trống' + at);
        const info = await blocks.first().evaluate((el) => {
          const art = el.querySelector('.zen-empty-art');
          const svg = art?.querySelector('svg');
          return {
            art: Boolean(art) && art.getAttribute('aria-hidden') === 'true' && Boolean(svg) && svg.getBoundingClientRect().width === 72,
            text: el.innerText,
            buttons: [...el.querySelectorAll('button')].map((b) => ({ text: b.textContent.trim(), h: b.getBoundingClientRect().height, primary: b.classList.contains('primary') })),
            inView: el.getBoundingClientRect().width > 0,
          };
        });
        assert.ok(info.art, c.view + ': hình nhỏ ẩn với trình đọc, rộng 72 px' + at);
        assert.ok(info.inView, c.view + ': khối hiện ra' + at);
        assert.ok(info.text.trim().length > 12, c.view + ': câu chữ gốc còn nguyên: ' + info.text + at);
        if (!c.label) assert.equal(info.buttons.length, 0, c.view + ': không có nút (không có việc để làm)' + at);
        else {
          assert.equal(info.buttons.length, 1, c.view + ': đúng một nút' + at);
          assert.ok(info.buttons[0].primary, c.view + ': nút chính' + at);
          assert.ok(info.buttons[0].h >= 44, c.view + ': nút cao ≥ 44 px: ' + info.buttons[0].h + at);
          assert.ok(info.buttons[0].text.endsWith(c.label[gh ? 1 : 0]), c.view + ': nhãn nút “' + info.buttons[0].text + '”' + at);
          assert.equal(await blocks.first().locator(c.attr).count(), 1, c.view + ': nút đúng hành động' + at);
        }
        if (gh) {
          assert.ok(!/Tạo dự án|Ghi chú mới|Xem dự án|Tải tệp lên|dự án lưu trữ|Chưa có ghi chú|Không có dữ liệu/.test(info.text), c.view + ': không còn chữ giọng Thiền trong khối: ' + info.text + at);
        }
        assert.equal(await noOverflow(page), true, c.view + ': không tràn ngang' + at);
      }

      // Nút làm đúng việc.
      await h.show(page, 'dashboard');
      await page.locator('#main .zen-empty [data-action="new-project"]').click();
      await page.waitForSelector('dialog[open] #editor-form, #editor-form');
      assert.ok(await page.locator('#editor-form').count(), 'Tạo dự án mở biểu mẫu' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await h.show(page, 'notes');
      await page.locator('#main .zen-empty [data-note-new]').click();
      await page.waitForSelector('dialog[open]');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await h.show(page, 'archive');
      await page.locator('#main .zen-empty [data-view="projects"]').click();
      await page.waitForFunction(() => view === 'projects');
      await h.show(page, 'resources');
      await page.locator('#main .zen-empty [data-action="new-project"]').click();
      await page.waitForSelector('#editor-form');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: trang trống có hình nhỏ và đúng một nút chính, nút làm đúng việc (390, 820, 1440px; Thiền và Giang hồ)');

  // Có dữ liệu: không có khối trống; lọc ra rỗng không gắn nút “Ghi chú mới”.
  const { context, page } = await h.open(390, { touch: true, workspace: full() });
  for (const v of ['dashboard', 'notes']) {
    await h.show(page, v);
    assert.equal(await page.locator('#main .zen-empty').count(), 0, v + ': có dữ liệu thì không có khối trống');
  }
  await h.show(page, 'resources');
  await page.waitForSelector('#main .zen-empty[data-zen-empty="files"]');
  assert.equal(await page.locator('#main .zen-empty button').count(), 1, 'Tài nguyên chưa có tệp: đúng một nút');
  await page.locator('#main .zen-empty [data-resource-upload]').click();
  await page.waitForSelector('#resource-upload-progress', { state: 'attached' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await h.show(page, 'notes');
  await page.evaluate(() => {
    query = 'không-có-ghi-chú-nào-như-vậy';
    render();
  });
  await page.waitForSelector('#main .empty');
  assert.equal(await page.locator('#main .zen-empty [data-note-new]').count(), 0, 'kết quả lọc rỗng không gắn nút Ghi chú mới');
  await context.close();
  console.log('PASS: có dữ liệu không hiện khối trống; Tài nguyên có nơi cất thì nút là Tải tệp lên; kết quả lọc rỗng không gắn nút');
} finally {
  await h.close();
}
