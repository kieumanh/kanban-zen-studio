// v2.52.0 (Việc Chờ Người Khác): đánh dấu việc đang chờ ai (tên người + ngày nhắc hỏi lại), dist/waiting.js.
// A. Dữ liệu: máy chủ giả dùng đúng hàm kiểm của máy chủ thật (validWorkspace) và ứng dụng dùng valid(): chấp nhận waitFor (≤ 60 ký tự) / waitUntil (ngày hợp lệ hoặc trống),
//    từ chối tên quá dài, sai kiểu, ngày sai; bản cũ không có hai trường vẫn hợp lệ.
// B. Bộ giúp (zenWaiting): việc đã xong hoặc tên trống không tính là đang chờ; câu nói về ngày hẹn (quá hẹn N ngày / hôm nay / nhắc lại dd-mm).
// C. Giao diện ở 390 (chạm) / 820 (chạm) / 1440 px × Thiền, tối, Giang hồ:
//    1. trình sửa việc có khối “Đang chờ người khác” ngay dưới “Lịch & thời hạn”; nút chọn nhanh (Ngày mai / 3 ngày nữa / Tuần sau) điền đúng ngày; ô ≥ 44 px (chạm);
//    2. lưu: tên được gọn khoảng trắng, ngày hợp lệ lên máy chủ; mở lại rồi đóng không báo thay đổi chưa lưu; xóa tên thì xóa cả hai trường;
//    3. thẻ việc có dòng “Đang chờ …”; Tổng quan có khối “Đang chờ” (việc đến hẹn / quá hẹn xếp trước), nút “Đã có phản hồi” và “Nhắc lại sau 3 ngày” đổi dữ liệu đúng;
//    4. chuông thông báo: việc đến hẹn cộng vào số chưa xem, có mục “Đến lúc hỏi lại”, bấm mở việc và đánh dấu đã xem;
//    5. chữ đủ tương phản, không tràn ngang, Giang hồ không còn chữ Thiền trong các phần mới; việc đã xong không hiện; chữ lạ (HTML) chỉ là chữ thuần; bản chỉ xem không có nút sửa.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';
import { validWorkspace } from '../server/api.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}
const vn = (n) => new Date(Date.now() + 7 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6);
  // t0: đã đến hẹn (quá 2 ngày); t1: hẹn 5 ngày nữa; t2: chưa hẹn ngày; t3 (cột Xong): không tính; t4: bình thường; t5: tên chỉ có khoảng trắng.
  Object.assign(p1.tasks[0], { waitFor: 'anh Sơn', waitUntil: vn(-2) });
  Object.assign(p1.tasks[1], { waitFor: 'bên nhà in', waitUntil: vn(5) });
  Object.assign(p1.tasks[2], { waitFor: 'chị Lan' });
  Object.assign(p1.tasks[3], { waitFor: 'người đã xong', waitUntil: vn(-1) });
  Object.assign(p1.tasks[5], { waitFor: '   ' });
  return { schema: 1, projects: [p1], notes: [] };
};
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) => [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg), [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
const taskOf = (server, id) => server.workspace.projects[0].tasks.find((t) => t.id === id);
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// ---- A. Kiểm dữ liệu --------------------------------------------------------------------------------------------------------------
{
  const ok = (mut) => {
    const w = seed();
    mut(w.projects[0].tasks[4]);
    return validWorkspace(w);
  };
  assert.equal(validWorkspace(seed()), true, 'dữ liệu có việc chờ hợp lệ');
  assert.equal(ok((t) => (t.waitFor = 'a'.repeat(60))), true, 'tên đúng 60 ký tự');
  assert.equal(ok((t) => (t.waitFor = 'a'.repeat(61))), false, 'tên 61 ký tự bị từ chối');
  assert.equal(ok((t) => (t.waitFor = 5)), false, 'tên sai kiểu bị từ chối');
  assert.equal(ok((t) => (t.waitUntil = '2026-13-40')), false, 'ngày sai bị từ chối');
  assert.equal(ok((t) => (t.waitUntil = 'mai')), false, 'ngày không đúng dạng bị từ chối');
  assert.equal(ok((t) => (t.waitUntil = 20261120)), false, 'ngày sai kiểu bị từ chối');
  assert.equal(ok((t) => ((t.waitFor = 'anh Sơn'), (t.waitUntil = ''))), true, 'ngày trống hợp lệ');
  const plain = seed();
  for (const t of plain.projects[0].tasks) {
    delete t.waitFor;
    delete t.waitUntil;
  }
  assert.equal(validWorkspace(plain), true, 'dữ liệu cũ không có hai trường vẫn hợp lệ');
  console.log('PASS: máy chủ kiểm waitFor / waitUntil');
}

const h = await startHarness({ seed });
try {
  // ---- B. Bộ giúp và hàm kiểm của ứng dụng ----------------------------------------------------------------------------------------
  {
    const { context, page } = await h.open(1440, { workspace: seed() });
    const r = await page.evaluate(
      ([d1, d2, d3]) => {
        const z = window.zenWaiting;
        const mk = (o) => ({ col: 'List', ...o });
        const w = seed2();
        function seed2() {
          return structuredClone(data);
        }
        const bad = (mut) => {
          const c = structuredClone(w);
          mut(c.projects[0].tasks[4]);
          return valid(c);
        };
        return {
          none: z.info(mk({})),
          blank: z.info(mk({ waitFor: '   ' })),
          done: z.info({ col: 'Done', waitFor: 'ai đó' }),
          plain: z.info(mk({ waitFor: ' anh Sơn ', waitUntil: d2 })),
          badDate: z.info(mk({ waitFor: 'x', waitUntil: 'mai' })),
          past: z.label({ who: 'x', until: d1 }),
          today: z.label({ who: 'x', until: d2 }),
          future: z.label({ who: 'x', until: d3 }),
          noDate: z.label({ who: 'x', until: '' }),
          okClient: valid(w),
          longClient: bad((t) => (t.waitFor = 'a'.repeat(61))),
          dateClient: bad((t) => (t.waitUntil = '2026-13-40')),
          typeClient: bad((t) => (t.waitFor = 7)),
        };
      },
      [vn(-2), vn(0), vn(4)],
    );
    assert.equal(r.none, null);
    assert.equal(r.blank, null, 'tên chỉ có khoảng trắng không tính');
    assert.equal(r.done, null, 'việc đã xong không tính là đang chờ');
    assert.deepEqual(r.plain, { who: 'anh Sơn', until: vn(0) });
    assert.deepEqual(r.badDate, { who: 'x', until: '' }, 'ngày sai bị bỏ, vẫn là đang chờ');
    assert.equal(r.past, 'Quá hẹn hỏi lại 2 ngày');
    assert.equal(r.today, 'Hỏi lại hôm nay');
    assert.match(r.future, /^Nhắc lại \d{2}[-/]\d{2}$/);
    assert.equal(r.noDate, '');
    assert.equal(r.okClient, true, 'ứng dụng nhận dữ liệu hợp lệ');
    assert.equal(r.longClient, false, 'ứng dụng từ chối tên quá dài');
    assert.equal(r.dateClient, false, 'ứng dụng từ chối ngày sai');
    assert.equal(r.typeClient, false, 'ứng dụng từ chối tên sai kiểu');
    await context.close();
    console.log('PASS: bộ giúp zenWaiting và valid() của ứng dụng');
  }

  // ---- C. Giao diện ---------------------------------------------------------------------------------------------------------------
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const [name, colorScheme, setup] of [
      ['Thiền', 'light', null],
      ['tối', 'dark', null],
      ['Giang hồ', 'light', GH],
    ]) {
      const giang = name === 'Giang hồ';
      const at = ' (' + width + 'px ' + name + ')';
      const { context, page, server } = await h.open(width, { touch, workspace: seed(), colorScheme, setup });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      // 1. Tổng quan: khối “Đang chờ” (3 việc: quá hẹn, hẹn sau, chưa hẹn; việc đã xong và tên trống không có).
      await h.show(page, 'dashboard');
      await page.waitForSelector('.wf-wait-panel');
      const dash = await page.evaluate(() => {
        const panel = document.querySelector('.wf-wait-panel');
        const r = panel.getBoundingClientRect();
        return {
          head: panel.querySelector('h2').innerText.replace(/\s+/g, ' ').trim(),
          rows: [...panel.querySelectorAll('.wait-row')].map((row) => ({
            title: row.querySelector('strong').textContent,
            who: row.querySelector('.wait-who').textContent,
            when: row.querySelector('.wait-when')?.textContent || '',
            due: row.classList.contains('is-due'),
            label: row.querySelector('.wait-label').textContent,
            actions: [...row.querySelectorAll('.wait-actions .text-btn')].map((b) => [b.textContent, b.getBoundingClientRect().height]),
          })),
          inside: r.left >= 0 && r.right <= innerWidth + 0.5,
        };
      });
      assert.equal(dash.rows.length, 3, 'ba việc đang chờ' + at);
      assert.deepEqual(dash.rows.map((x) => x.who), ['anh Sơn', 'bên nhà in', 'chị Lan'], 'quá hẹn trước, rồi có ngày, rồi chưa hẹn' + at);
      assert.equal(dash.rows[0].due, true, 'việc quá hẹn được nhấn mạnh' + at);
      assert.equal(dash.rows[1].due || dash.rows[2].due, false, 'việc chưa tới hẹn không nhấn mạnh' + at);
      assert.equal(dash.rows[2].when, '', 'chưa hẹn ngày thì không có câu ngày' + at);
      assert.equal(dash.inside, true, 'khối nằm gọn trong màn hình' + at);
      assert.match(dash.head, giang ? /^Đang đợi hồi âm 3 / : /^Đang chờ 3 việc$/, 'tiêu đề khối' + at);
      assert.equal(dash.rows[0].label, giang ? 'Đang đợi' : 'Đang chờ', 'nhãn dòng' + at);
      assert.equal(dash.rows[0].when, giang ? 'Lỡ hẹn hỏi lại 2 ngày' : 'Quá hẹn hỏi lại 2 ngày', 'câu ngày quá hẹn' + at);
      assert.match(dash.rows[1].when, giang ? /^Hẹn hỏi lại \d{2}[-/]\d{2}$/ : /^Nhắc lại \d{2}[-/]\d{2}$/, 'câu ngày hẹn' + at);
      assert.deepEqual(dash.rows[0].actions.map((a) => a[0]), giang ? ['Đã có hồi âm', 'Hẹn lại sau 3 ngày'] : ['Đã có phản hồi', 'Nhắc lại sau 3 ngày'], 'hai nút' + at);
      if (touch) assert.ok(dash.rows[0].actions.every((a) => a[1] >= 43.5), 'nút ≥ 44 px khi chạm' + at);
      for (const s of ['.wf-wait-panel h2', '.wf-wait-panel .wait-row .wait-who', '.wf-wait-panel .wait-row.is-due .wait-when', '.wf-wait-panel .wait-row:nth-of-type(2) .wait-when', '.wf-wait-panel .wait-actions .text-btn']) {
        const c = await contrast(page, s);
        assert.ok(c !== null && c >= 4.5, 'chữ ' + s + ' đủ tương phản (' + c?.toFixed(2) + ')' + at);
      }
      assert.equal(await noOverflow(page), true, 'Tổng quan không tràn ngang' + at);

      // 2. Chuông: việc quá hẹn cộng vào số chưa xem, có mục “Đến lúc hỏi lại”, bấm mở việc và đánh dấu đã xem.
      const count = () => page.evaluate(() => Number(bell.querySelector('.notification-count')?.textContent.replace('+', '') || 0));
      const before = await count();
      await page.evaluate(() => bell.click());
      await page.waitForSelector('#editor-body .notice-list [data-wait-open]');
      const item = await page.evaluate(() => {
        const el = document.querySelector('#editor-body .notice-list [data-wait-open]');
        return { count: document.querySelectorAll('#editor-body .notice-list [data-wait-open]').length, text: el.innerText.replace(/\s+/g, ' ').trim(), title: el.querySelector('span').textContent };
      });
      assert.equal(item.count, 1, 'chỉ việc đến hẹn có mục nhắc (việc hẹn sau, chưa hẹn, đã xong thì không)' + at);
      assert.match(item.text, giang ? /Đang đợi anh Sơn · Lỡ hẹn hỏi lại 2 ngày/ : /Đang chờ anh Sơn · Quá hẹn hỏi lại 2 ngày/, 'nội dung mục nhắc' + at);
      assert.equal(item.title, 'Việc số 1');
      await page.click('#editor-body .notice-list [data-wait-open]');
      await page.waitForSelector('dialog[open] [name=waitFor]');
      assert.equal(await page.inputValue('dialog[open] [name=waitFor]'), 'anh Sơn', 'bấm mục nhắc mở đúng việc' + at);
      assert.equal(await page.evaluate(() => localStorage.getItem('zen-wait-seen:qa:p1t0:' + document.querySelector('[name=waitUntil]').value)), '1', 'đã đánh dấu đã xem' + at);
      assert.equal(await count(), before - 1, 'số chưa xem giảm đúng một sau khi bấm mục nhắc' + at);

      // 3. Trình sửa việc: khối nằm ngay dưới “Lịch & thời hạn”.
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await h.show(page, 'projects');
      await page.locator('[data-task="p1t4"]').first().click();
      await page.waitForSelector('dialog[open] [name=waitFor]');
      const ed = await page.evaluate(() => {
        const section = document.querySelector('#editor-form .zen-wait');
        const prev = section.previousElementSibling;
        const inputs = [...section.querySelectorAll('input[name=waitFor], input[name=waitUntil], .zen-wait-presets .btn')].map((e) => e.getBoundingClientRect().height);
        const r = section.getBoundingClientRect();
        return {
          after: prev?.querySelector('h3')?.textContent,
          heading: section.querySelector('h3').textContent,
          who: section.querySelector('[name=waitFor]').value,
          until: section.querySelector('[name=waitUntil]').value,
          label: section.querySelector('.field').firstChild.textContent.trim(),
          inputs,
          fits: r.left >= 0 && r.right <= innerWidth + 0.5,
          presets: [...section.querySelectorAll('[data-wait-preset]')].map((b) => b.textContent),
        };
      });
      assert.match(ed.after, giang ? /Ngày giờ/ : /Lịch/, 'ngay dưới “Lịch & thời hạn”' + at);
      assert.equal(ed.heading, giang ? 'Đang đợi hồi âm' : 'Đang chờ người khác', 'tiêu đề khối' + at);
      assert.equal(ed.label, giang ? 'Đang đợi ai hồi âm' : 'Đang chờ ai', 'nhãn ô tên' + at);
      assert.equal(ed.who + ed.until, '', 'việc bình thường: hai ô trống' + at);
      assert.equal(ed.fits, true, 'khối nằm gọn' + at);
      if (touch) assert.ok(ed.inputs.every((x) => x >= 43.5), 'ô và nút ≥ 44 px khi chạm ' + ed.inputs + at);
      assert.deepEqual(ed.presets, ['Ngày mai', '3 ngày nữa', 'Tuần sau'], 'ba nút chọn nhanh' + at);
      await page.click('[data-wait-preset="3"]');
      assert.equal(await page.inputValue('[name=waitUntil]'), vn(3), '“3 ngày nữa” điền đúng ngày' + at);
      await page.click('[data-wait-preset="1"]');
      assert.equal(await page.inputValue('[name=waitUntil]'), vn(1), '“Ngày mai”' + at);
      await page.click('[data-wait-preset="7"]');
      assert.equal(await page.inputValue('[name=waitUntil]'), vn(7), '“Tuần sau”' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);

      // 4. Lưu: tên được gọn khoảng trắng; chữ lạ chỉ là chữ thuần.
      await page.fill('[name=waitFor]', '  anh   Minh  ');
      await page.click('#editor-form button[type=submit]');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await until(() => taskOf(server, 'p1t4').waitFor === 'anh Minh', 'lưu tên lên máy chủ' + at);
      assert.equal(taskOf(server, 'p1t4').waitUntil, vn(7), 'ngày lưu đúng' + at);
      assert.equal(taskOf(server, 'p1t4').title, 'Việc số 5', 'trường khác không đổi' + at);
      // Thẻ việc có dòng “Đang chờ …”.
      const chip = await page.locator('[data-task="p1t4"] .task-card-wait').first().innerText();
      assert.match(chip.replace(/\s+/g, ' '), giang ? /^Đang đợi anh Minh · Hẹn hỏi lại \d{2}[-/]\d{2}$/ : /^Đang chờ anh Minh · Nhắc lại \d{2}[-/]\d{2}$/, 'dòng trên thẻ' + at);
      // Mở lại rồi đóng bằng nút Hủy: không báo thay đổi chưa lưu.
      await page.locator('[data-task="p1t4"]').first().click();
      await page.waitForSelector('dialog[open] [name=waitFor]');
      assert.equal(await page.inputValue('[name=waitFor]'), 'anh Minh', 'mở lại thấy tên đã lưu' + at);
      await page.click('[data-action="close-modal"]');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 }).catch(() => {});
      assert.equal(await page.locator('.task-unsaved-confirm').count(), 0, 'không báo thay đổi chưa lưu khi chưa đổi gì' + at);
      assert.equal(await page.locator('dialog[open]').count(), 0, 'đóng được' + at);
      // Chữ lạ chỉ là chữ thuần.
      await page.locator('[data-task="p1t4"]').first().click();
      await page.waitForSelector('dialog[open] [name=waitFor]');
      await page.fill('[name=waitFor]', '<img src=x onerror="window.__xss=1">');
      await page.click('#editor-form button[type=submit]');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await until(() => taskOf(server, 'p1t4').waitFor?.startsWith('<img'), 'lưu chữ lạ' + at);
      await h.show(page, 'dashboard');
      await page.waitForSelector('.wf-wait-panel');
      assert.equal(await page.evaluate(() => document.querySelectorAll('.wf-wait-panel img, .task-card img[src="x"]').length + (window.__xss ? 1 : 0)), 0, 'chữ lạ không thành thẻ, không chạy mã' + at);
      // Xóa tên thì xóa cả hai trường.
      await h.show(page, 'projects');
      await page.locator('[data-task="p1t4"]').first().click();
      await page.waitForSelector('dialog[open] [name=waitFor]');
      await page.fill('[name=waitFor]', '');
      await page.click('#editor-form button[type=submit]');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await until(() => !('waitFor' in taskOf(server, 'p1t4')) && !('waitUntil' in taskOf(server, 'p1t4')), 'xóa cả hai trường' + at);

      // 5. “Nhắc lại sau 3 ngày” và “Đã có phản hồi” ở Tổng quan.
      await h.show(page, 'dashboard');
      await page.waitForSelector('.wf-wait-panel');
      await page.locator('.wf-wait-panel .wait-row').first().locator('[data-wait-snooze]').click();
      await until(() => taskOf(server, 'p1t0').waitUntil === vn(3), 'hoãn 3 ngày lên máy chủ' + at);
      assert.equal(taskOf(server, 'p1t0').waitFor, 'anh Sơn', 'hoãn không đổi tên' + at);
      await until(() => page.evaluate(() => /sau 3 ngày/.test(document.querySelector('#toast').textContent)), 'thông báo hoãn' + at);
      const rows = await page.evaluate(() => [...document.querySelectorAll('.wf-wait-panel .wait-row')].map((r) => [r.querySelector('.wait-who').textContent, r.classList.contains('is-due')]));
      assert.deepEqual(rows.map((r) => r[0]), ['anh Sơn', 'bên nhà in', 'chị Lan'], 'danh sách vẽ lại: hẹn sớm trước, chưa hẹn sau cùng' + at);
      assert.equal(rows.some((r) => r[1]), false, 'không còn việc đến hẹn' + at);
      const bellAfter = await page.evaluate(() => {
        bell.click();
        return document.querySelectorAll('#editor-body .notice-list [data-wait-open]').length;
      });
      assert.equal(bellAfter, 0, 'hoãn rồi thì chuông không còn nhắc' + at);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await page.locator('.wf-wait-panel .wait-row').filter({ hasText: 'chị Lan' }).locator('[data-wait-got]').click();
      await until(() => !('waitFor' in taskOf(server, 'p1t2')), 'đã có phản hồi: xóa trường' + at);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('.wf-wait-panel .wait-who')].map((e) => e.textContent).includes('chị Lan')), false, 'khối không còn việc đó' + at);
      await h.show(page, 'projects');
      assert.equal(await page.locator('[data-task="p1t2"] .task-card-wait').count(), 0, 'thẻ không còn dòng chờ' + at);

      // 6. Việc đã xong không bao giờ hiện là đang chờ; bản chỉ xem không có nút sửa.
      assert.equal(await page.locator('[data-task="p1t3"] .task-card-wait').count(), 0, 'việc đã xong không có dòng chờ' + at);
      await h.show(page, 'dashboard');
      await page.evaluate(() => {
        contentReadOnly = true;
        render();
      });
      await page.waitForSelector('.wf-wait-panel');
      assert.equal(await page.locator('.wf-wait-panel .wait-actions').count(), 0, 'bản chỉ xem: không có nút sửa' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at + ': ' + errors);
      await context.close();
    }
  }
  console.log('PASS: việc chờ người khác — 390, 820, 1440px × Thiền, tối, Giang hồ (nhập, thẻ, Tổng quan, chuông, hoãn, đã có phản hồi, chữ thuần, chỉ xem)');
} finally {
  await h.close();
}
