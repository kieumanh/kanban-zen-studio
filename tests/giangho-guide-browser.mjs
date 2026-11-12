// v1.96.0 (Chú Giải): giúp hiểu và chọn mức phong cách Giang hồ.
//  1. Lời mời một lần ở cuối Tổng quan (Thiền): "Ẩn" gửi biên nhận notice:gh-intro và không hiện lại; máy chủ đã có biên nhận thì không
//     hiện; "Bật thử" chuyển sang Giang hồ.
//  2. Nghĩa thường: chữ giang hồ trong tiêu đề / nút có title "Nghĩa thường: …" + data-gh-tip; không đè title sẵn có, không gắn cho nút
//     thanh bên; về Thiền thì gỡ sạch. Màn hình chạm: nhấn giữ hiện bong bóng, lần chạm đó không bấm nút.
//  3. Bảng chú giải (bảng lệnh và Cơ quan): đủ nhóm, tìm hai chiều kể cả gõ không dấu, bộ chuyển ngữ không đổi chữ bên trong; nút
//     "Về Cơ quan" mở lại Cài đặt.
//  4. Khẩu quyết hai chiều: lệnh mang tên giang hồ, gõ "cài đặt" hay "cơ quan" đều ra; tên việc của người dùng giữ nguyên.
//  5. Giang hồ nhẹ: tắt "Lời lẽ giang hồ" thì giữ họa tiết, chữ quen thuộc; lưu trên thiết bị, tải lại vẫn giữ; bật lại thì chữ về.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; không tràn ngang, không lỗi trang, dữ liệu làm việc không đổi.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => {
  const p = makeProject('p1', 'Alpha', '#7950c8', 4);
  p.tasks[0].title = 'Lịch'; // tên việc trùng tên mục: phải giữ nguyên trong bảng lệnh
  return { schema: 1, notes: [], projects: [p, makeProject('p2', 'Beta', '#2e7d5b', 2)] };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const close = async (page) => {
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.waitForTimeout(350);
};
// Cài đặt gom các nhóm vào khung thu gọn: mở hết để xem nhóm Giao diện.
const settings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('dialog[open] input[name=zen-style]', { state: 'attached' });
  await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
};
const palette = async (page, text) => {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Control+k');
  await page.waitForFunction(() => document.querySelector('.studio-palette')?.open === true);
  await page.locator('.studio-palette input').fill(text);
  await page.waitForTimeout(150);
  return page.evaluate(() => [...document.querySelectorAll('.studio-palette [role=option]')].map((o) => [o.querySelector('span').textContent, o.querySelector('small').textContent]));
};
const longPress = async (context, page, selector) => {
  const box = await page.locator(selector).first().boundingBox();
  const cdp = await context.newCDPSession(page);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await page.waitForTimeout(750);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
};

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. Lời mời ở Tổng quan (Thiền).
    {
      const { context, page, server } = await h.open(width, { touch });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      await page.waitForSelector('#main .gh-intro');
      const card = await page.evaluate(() => {
        const c = document.querySelector('#main .gh-intro');
        return { last: document.querySelector('#main').lastElementChild === c, text: c.textContent, buttons: [...c.querySelectorAll('button')].map((b) => [b.textContent, b.getBoundingClientRect().height]) };
      });
      assert.ok(card.last, 'lời mời nằm cuối Tổng quan' + at);
      assert.match(card.text, /Thử phong cách Giang hồ/, 'tiêu đề lời mời' + at);
      assert.deepEqual(card.buttons.map((b) => b[0]), ['Bật thử', 'Ẩn'], 'hai nút của lời mời' + at);
      assert.ok(card.buttons.every((b) => b[1] >= 40), 'nút đủ cao để chạm' + at);
      assert.ok(await noOverflow(page), 'Tổng quan không tràn ngang' + at);
      const before = await page.evaluate(() => JSON.stringify(data));
      await page.click('.gh-intro [data-gh-intro=hide]');
      await page.waitForFunction(() => !document.querySelector('.gh-intro'));
      await page.waitForTimeout(300);
      assert.ok(server.receipts.includes('notice:gh-intro'), 'Ẩn gửi biên nhận lên máy chủ' + at);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.style || ''), '', 'Ẩn không đổi phong cách' + at);
      await page.evaluate(() => render());
      await page.waitForTimeout(200);
      assert.equal(await page.locator('.gh-intro').count(), 0, 'đã ẩn thì không hiện lại' + at);
      assert.equal(await page.evaluate(() => JSON.stringify(data)), before, 'dữ liệu làm việc không đổi' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
      // Thiết bị khác: máy chủ đã có biên nhận thì không hiện.
      const other = await h.open(width, { touch, receiptsSeed: ['notice:gh-intro'] });
      await h.show(other.page, 'dashboard');
      await other.page.waitForTimeout(500);
      assert.equal(await other.page.locator('.gh-intro').count(), 0, 'thiết bị khác đã ẩn thì không hiện' + at);
      await other.context.close();
      // "Bật thử".
      const third = await h.open(width, { touch });
      await h.show(third.page, 'dashboard');
      await third.page.waitForSelector('#main .gh-intro');
      await third.page.click('.gh-intro [data-gh-intro=on]');
      await third.page.waitForFunction(() => document.documentElement.dataset.style === 'giangho' && document.querySelector('.gh-nav'));
      assert.equal(await third.page.locator('.gh-intro').count(), 0, 'bật thử thì lời mời biến mất' + at);
      assert.ok(third.server.receipts.includes('notice:gh-intro'), 'bật thử cũng ghi đã xem' + at);
      await third.context.close();
    }
    // 2–5. Giang hồ.
    {
      const { context, page } = await h.open(width, { touch, setup: GH });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'dashboard');
      assert.equal(await page.locator('.gh-intro').count(), 0, 'đang Giang hồ thì không mời' + at);
      // 2. Nghĩa thường.
      const tips = await page.evaluate(() => ({
        create: [document.querySelector('.page-heading .btn.primary').getAttribute('title'), document.querySelector('.page-heading .btn.primary').dataset.ghTip],
        nav: document.querySelectorAll('.sidebar .nav[data-gh-tip], .view-mode[data-gh-tip]').length,
        toggle: document.querySelector('#theme-toggle')?.getAttribute('title') || '',
      }));
      assert.deepEqual(tips.create, ['Nghĩa thường: Tạo dự án', 'Tạo dự án'], 'nút Khởi đại sự có nghĩa thường' + at);
      assert.equal(tips.nav, 0, 'nút thanh bên không gắn thêm (đã có dòng nghĩa thường)' + at);
      assert.doesNotMatch(tips.toggle, /^Nghĩa thường/, 'không đè title sẵn có' + at);
      await h.show(page, 'trash');
      assert.equal(await page.locator('#main h1').getAttribute('title'), 'Nghĩa thường: Thùng rác', 'tiêu đề Phế tích có nghĩa thường' + at);
      await h.show(page, 'dashboard');
      if (touch) {
        await longPress(context, page, '.page-heading .btn.primary');
        const bubble = await page.evaluate(() => document.querySelector('.gh-tip-bubble')?.textContent || '');
        assert.equal(bubble, 'Nghĩa thường: Tạo dự án', 'nhấn giữ hiện bong bóng nghĩa thường' + at);
        assert.equal(await page.evaluate(() => !!document.querySelector('dialog[open]')), false, 'nhấn giữ không bấm nút' + at);
        const r = await page.evaluate(() => {
          const b = document.querySelector('.gh-tip-bubble').getBoundingClientRect();
          return b.left >= 0 && b.right <= innerWidth && b.top >= 0;
        });
        assert.ok(r, 'bong bóng nằm trong màn hình' + at);
        await page.waitForFunction(() => !document.querySelector('.gh-tip-bubble'), null, { timeout: 4000 });
        await page.locator('.page-heading .btn.primary').tap();
        await page.waitForSelector('dialog[open]');
        await close(page);
      }
      // 4. Khẩu quyết hai chiều.
      for (const q of ['cài đặt', 'cơ quan']) {
        const list = await palette(page, q);
        assert.ok(list.some(([label, hint]) => label === 'Cơ quan' && hint.startsWith('Cài đặt')), 'gõ "' + q + '" ra Cơ quan: ' + JSON.stringify(list) + at);
        await page.keyboard.press('Escape');
      }
      const all = await palette(page, 'a');
      assert.ok(all.some(([label, hint]) => label === 'Đại sự · Alpha' && hint.startsWith('Dự án')), 'đại sự trong bảng lệnh' + at);
      await page.keyboard.press('Escape');
      const task = await palette(page, 'lịch');
      assert.ok(task.some(([label]) => label === 'Lịch'), 'tên việc "Lịch" giữ nguyên: ' + JSON.stringify(task) + at);
      assert.ok(task.some(([label, hint]) => label === 'Hoàng lịch' && hint.startsWith('Lịch')), 'lệnh mở Hoàng lịch' + at);
      await page.keyboard.press('Escape');
      // 3. Bảng chú giải từ bảng lệnh.
      await palette(page, 'chú giải');
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog[open] .gh-glossary');
      const g = await page.evaluate(() => {
        const box = document.querySelector('dialog[open] .gh-glossary');
        const rows = [...box.querySelectorAll('li')].map((li) => [li.querySelector('b').textContent, li.querySelector('span').firstChild.textContent]);
        return { groups: [...box.querySelectorAll('h3')].map((x) => x.textContent), rows, count: box.querySelector('#gh-glossary-count').textContent };
      });
      assert.deepEqual(g.groups, ['Điều hướng', 'Đại sự & nhiệm vụ', 'Tàng thư, Ngân khố, Tu vi', 'Danh tính & thông mạch'], 'các nhóm chú giải' + at);
      for (const pair of [['Phế tích', 'Thùng rác'], ['Cơ quan', 'Cài đặt'], ['Đại sự', 'Dự án'], ['Lỡ hẹn', 'Quá hạn'], ['Hạ sơn', 'Đăng xuất'], ['Khẩu quyết', 'Lệnh']])
        assert.ok(g.rows.some((r) => r[0] === pair[0] && r[1] === pair[1]), 'có dòng ' + pair.join(' = ') + at);
      assert.equal(g.count, g.rows.length + ' mục', 'đếm số mục' + at);
      const find = async (q) => {
        await page.locator('.gh-glossary input').fill(q);
        return page.evaluate(() => ({ rows: [...document.querySelectorAll('.gh-glossary li:not([hidden]) b')].map((b) => b.textContent), empty: !document.querySelector('.gh-glossary-empty').hidden, count: document.querySelector('#gh-glossary-count').textContent }));
      };
      assert.deepEqual((await find('thung rac')).rows, ['Phế tích'], 'tìm nghĩa thường không dấu' + at);
      assert.deepEqual((await find('Phế tích')).rows, ['Phế tích'], 'tìm tên giang hồ' + at);
      const none = await find('zzzz');
      assert.ok(none.empty && none.rows.length === 0 && none.count === '0 mục', 'không có kết quả thì báo' + at);
      assert.ok(await noOverflow(page), 'Bảng chú giải không tràn ngang' + at);
      await close(page);
      // 5. Cơ quan → Giao diện: lời lẽ giang hồ, Bảng chú giải.
      await settings(page);
      assert.equal(await page.locator('.gh-style-extra').isVisible(), true, 'Giang hồ có công tắc lời lẽ' + at);
      assert.equal(await page.locator('#gh-words').isChecked(), true, 'mặc định bật lời lẽ giang hồ' + at);
      await page.locator('.gh-glossary-open').click();
      await page.waitForSelector('dialog[open] .gh-glossary .gh-glossary-back');
      assert.equal(await page.locator('.gh-glossary-back').textContent(), '← Về Cơ quan', 'nút quay lại Cơ quan' + at);
      await page.mouse.move(2, 2);
      await page.locator('.gh-glossary-back').click();
      await page.waitForSelector('dialog[open] input[name=zen-style]', { state: 'attached' });
      await page.evaluate(() => document.querySelectorAll('dialog[open] details').forEach((d) => (d.open = true)));
      await page.mouse.move(2, 2);
      await page.locator('.gh-words-row').click();
      await page.waitForFunction(() => document.documentElement.dataset.ghWords === 'off' && !document.querySelector('.gh-nav'));
      const lite = await page.evaluate(() => ({ style: document.documentElement.dataset.style, stored: localStorage.getItem('zen-gh-words'), tips: document.querySelectorAll('[data-gh-tip]').length, title: [...document.querySelectorAll('[title]')].filter((e) => e.title.startsWith('Nghĩa thường')).length, heading: document.querySelector('#editor-body h2').textContent, font: getComputedStyle(document.querySelector('#editor-body h2')).fontFamily }));
      assert.equal(lite.style, 'giangho', 'Giang hồ nhẹ vẫn giữ họa tiết' + at);
      assert.equal(lite.stored, 'off', 'lưu lựa chọn trên thiết bị' + at);
      assert.equal(lite.tips + lite.title, 0, 'gỡ sạch nghĩa thường khi tắt lời lẽ' + at);
      assert.match(lite.heading, /^Cài đặt/, 'chữ trở lại quen thuộc' + at);
      assert.match(lite.font, /Noto Serif/, 'vẫn phông giang hồ' + at);
      await close(page);
      await page.reload();
      await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
      await h.show(page, 'dashboard');
      assert.deepEqual(await page.evaluate(() => [document.documentElement.dataset.style, document.documentElement.dataset.ghWords, document.querySelectorAll('.gh-nav').length]), ['giangho', 'off', 0], 'tải lại vẫn là Giang hồ nhẹ' + at);
      // Bảng lệnh: bật lại lời lẽ.
      const toggle = await palette(page, 'lời lẽ');
      assert.ok(toggle.some(([label]) => label === 'Bật / tắt lời lẽ giang hồ'), 'lệnh bật / tắt lời lẽ' + at);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !document.documentElement.dataset.ghWords && document.querySelector('.gh-nav'));
      assert.equal(await page.evaluate(() => localStorage.getItem('zen-gh-words')), null, 'bật lại thì xóa khóa' + at);
      // 2b. Về Thiền: gỡ sạch nghĩa thường, công tắc lời lẽ ẩn.
      await page.evaluate(() => window.zenTheme.setStyle('zen'));
      await page.waitForFunction(() => !document.querySelector('.gh-nav'));
      assert.equal(await page.evaluate(() => document.querySelectorAll('[data-gh-tip]').length + [...document.querySelectorAll('[title]')].filter((e) => e.title.startsWith('Nghĩa thường')).length), 0, 'về Thiền không còn nghĩa thường' + at);
      await settings(page);
      assert.equal(await page.locator('.gh-style-extra').isVisible(), false, 'Thiền ẩn công tắc lời lẽ' + at);
      await close(page);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('giangho-guide-browser ok');
} finally {
  await h.close();
}
