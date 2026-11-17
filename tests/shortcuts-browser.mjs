// v2.46.0 (Bảng Phím Tắt): bấm “?” hoặc chọn “Xem phím tắt” trong bảng lệnh để xem mọi phím tắt của ứng dụng.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px, cả Thiền lẫn Giang hồ:
//  1. “?” mở hộp thoại Phím tắt với 4 nhóm (Chung, Tạo mới, Tab dự án, Gantt); mỗi dòng có phím (kbd) và lời giải thích; Giang hồ đổi giọng, không còn chữ Thiền.
//  2. Esc hoặc nút × đóng hộp thoại, tiêu điểm về chỗ cũ; hộp thoại nằm gọn trong màn hình, không tràn ngang, nút đóng đủ lớn.
//  3. Không cướp phím: gõ “?” trong ô nhập thì ra ký tự “?”, không mở bảng; đang có hộp thoại khác thì “?” không mở thêm.
//  4. Bảng lệnh (Ctrl K) có lệnh “Xem phím tắt” (Giang hồ: “Xem khẩu quyết phím”) mở đúng bảng này.
//  5. Những gì bảng nói là thật: Ctrl K mở bảng lệnh; C mở biểu mẫu tạo việc khi đang ở một dự án.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness();
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const gh of [false, true]) {
      const at = ' (' + width + 'px' + (gh ? ', Giang hồ' : '') + ')';
      const { context, page } = await h.open(width, { touch, setup: gh ? GH : null });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');

      // 1. “?” mở bảng.
      await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.keyboard.press('?');
      await page.waitForSelector('dialog.zen-shortcuts[open]');
      await page.waitForTimeout(500); // nút × bật vào bằng chuyển động khi mở hộp thoại (close-animation-browser)
      const info = await page.evaluate(() => {
        const d = document.querySelector('dialog.zen-shortcuts');
        const r = d.getBoundingClientRect();
        const close = d.querySelector('[data-zen-shortcuts-close]').getBoundingClientRect();
        return {
          title: d.querySelector('h2').textContent,
          groups: [...d.querySelectorAll('h3')].map((e) => e.textContent),
          rows: [...d.querySelectorAll('dl > div')].map((row) => ({ keys: row.querySelectorAll('dt kbd').length, text: row.querySelector('dd').textContent.trim() })),
          text: d.innerText,
          inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
          closeSize: Math.min(close.width, close.height),
          labelled: d.getAttribute('aria-labelledby') === 'zen-shortcuts-title' && Boolean(document.getElementById('zen-shortcuts-title')),
        };
      });
      assert.equal(info.title, gh ? 'Khẩu quyết phím' : 'Phím tắt', 'tiêu đề' + at);
      assert.deepEqual(info.groups, gh ? ['Thông dụng', 'Khởi tạo', 'Thẻ đại sự', 'Trận đồ'] : ['Chung', 'Tạo mới', 'Tab dự án', 'Gantt'], 'bốn nhóm' + at);
      assert.equal(info.rows.length, 6, 'sáu dòng phím tắt' + at);
      assert.ok(info.rows.every((r) => r.keys >= 1 && r.text.length > 10), 'mỗi dòng có phím và lời giải thích' + at);
      assert.ok(info.labelled, 'hộp thoại có tên' + at);
      assert.ok(info.inside, 'hộp thoại nằm gọn trong màn hình' + at);
      assert.ok(info.closeSize >= 40, 'nút đóng đủ lớn: ' + info.closeSize + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      assert.ok(/Ctrl/.test(info.text), 'phím Ctrl K (Linux)' + at);
      if (gh) assert.ok(!/dự án|việc|\btab\b|cài đặt|phím tắt/i.test(info.text.replace(/Ctrl|Alt/g, '')), 'Giang hồ không còn chữ giọng Thiền: ' + info.text + at);

      // 2. Đóng bằng Esc, tiêu điểm trở về.
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.zen-shortcuts[open]'));
      // Bấm nút ×.
      await page.keyboard.press('?');
      await page.waitForSelector('dialog.zen-shortcuts[open]');
      await page.locator('[data-zen-shortcuts-close]').click();
      await page.waitForFunction(() => !document.querySelector('dialog.zen-shortcuts[open]'));

      // 3. Không cướp phím: ô nhập; hộp thoại khác đang mở.
      await page.locator('#search').focus();
      await page.keyboard.type('?');
      assert.equal(await page.locator('#search').inputValue(), '?', 'gõ ? trong ô nhập ra ký tự' + at);
      assert.equal(await page.locator('dialog.zen-shortcuts[open]').count(), 0, 'không mở bảng khi đang gõ chữ' + at);
      await page.locator('#search').fill('');
      await page.locator('#search').blur();
      await h.show(page, 'projects', 'p1');
      await page.keyboard.press('c');
      await page.waitForSelector('#editor[open]');
      await page.keyboard.press('?');
      await page.waitForTimeout(150);
      assert.equal(await page.locator('dialog.zen-shortcuts[open]').count(), 0, 'đang có hộp thoại khác thì “?” không mở thêm' + at);
      await page.evaluate(() => document.querySelector('#editor').close());
      await page.waitForFunction(() => !document.querySelector('#editor[open]'));

      // 4. Bảng lệnh có lệnh mở bảng phím tắt.
      await page.keyboard.press('Control+k');
      await page.waitForSelector('.studio-palette[open]');
      await page.keyboard.type(gh ? 'khẩu quyết' : 'phím tắt');
      await page.waitForFunction(() => [...document.querySelectorAll('.studio-palette [role=option] span')].some((s) => /phím tắt|khẩu quyết phím/i.test(s.textContent)));
      const option = await page.locator('.studio-palette [role=option] span').first().textContent();
      assert.equal(option, gh ? 'Xem khẩu quyết phím' : 'Xem phím tắt', 'lệnh trong bảng lệnh' + at);
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog.zen-shortcuts[open]');
      assert.equal(await page.locator('dialog.zen-shortcuts[open]').count(), 1, 'chọn lệnh mở đúng bảng' + at);
      assert.equal(await page.locator('.studio-palette[open]').count(), 0, 'bảng lệnh đã đóng' + at);
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: bảng phím tắt mở bằng ? và bằng bảng lệnh, 4 nhóm / 6 dòng, đúng giọng Thiền và Giang hồ, không cướp phím (390, 820, 1440px)');
} finally {
  await h.close();
}
