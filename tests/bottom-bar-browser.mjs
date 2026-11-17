// v2.39.0 (Thanh Dưới Điện Thoại): thanh điều hướng dưới đáy trên điện thoại, 5 ô: Tổng quan · Bảng · [+] · Hằng ngày · Ghi chú.
// A. 390 và 360 px (chạm): thanh dính đáy màn hình, đúng thứ tự năm ô, ô nào cũng đủ lớn để chạm (≥ 44px), có vùng điều hướng có tên;
//    ô đang xem có aria-current; bấm từng ô sang đúng trang; ô giữa “+” mở hộp Thêm nhanh và tạo được việc “Gọi anh Sơn mai 9h #farm”.
// B. Không che nội dung: cuối trang chừa chỗ (chân trang nằm trên thanh), thông báo nằm trên thanh, không tràn ngang; thanh ẩn khi bàn phím mở
//    (ô tìm kiếm có focus) và khi ngăn kéo ☰ mở.
// C. 820 và 1440 px: không có thanh (máy tính bảng / máy tính dùng thanh bên) và chân trang không bị chừa chỗ thừa.
// D. Giang hồ: Tổng đàn · Cáo thị · Ghi nhanh · Nhật khóa · Tàng thư; chữ ≥ 4,5:1 ở sáng / tối / Giang hồ / tương phản cao.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 8), makeProject('p2', 'Farm Yêu Thương', '#e78c56', 5)], notes: [] });
const NOW = '2026-11-17T03:00:00Z';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, label) => {
  for (let i = 0; i < 80; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
};
const goTo = async (page, v, id = 'p1') => {
  await page.evaluate(([v, id]) => go(v, id), [v, id]);
  await page.waitForFunction((v) => view === v && !!document.querySelector('#main > *'), v);
  await page.waitForTimeout(150);
};
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {}))).then(() => undefined));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const info = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('.zen-bottom-bar');
    const r = bar.getBoundingClientRect();
    const cells = [...bar.querySelectorAll('.zbb-cell')].map((c) => {
      const b = c.getBoundingClientRect();
      return { text: c.textContent.trim(), w: Math.round(b.width), h: Math.round(b.height), current: c.getAttribute('aria-current'), label: c.getAttribute('aria-label') };
    });
    return { shown: getComputedStyle(bar).display !== 'none' && r.height > 0, pos: getComputedStyle(bar).position, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, name: bar.getAttribute('aria-label'), tag: bar.tagName, cells };
  });
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

const ORDER = ['Tổng quan', 'Bảng', 'Thêm', 'Hằng ngày', 'Ghi chú'];
const h = await startHarness({ seed });
try {
  // A + B. Điện thoại -----------------------------------------------------------------------------------------------------------------
  for (const [width, height] of [[390, 844], [360, 740]]) {
    const at = ' ở ' + width + ' px';
    const { context, page, server } = await h.open(width, { touch: true, height, now: NOW });
    try {
      await goTo(page, 'dashboard');
      let r = await info(page);
      assert.equal(r.shown, true, 'thanh hiện' + at);
      assert.equal(r.tag, 'NAV', 'là vùng điều hướng' + at);
      assert.equal(r.name, 'Điều hướng nhanh', 'vùng điều hướng có tên' + at);
      assert.equal(r.pos, 'fixed', 'thanh dính đáy' + at);
      assert.equal(r.bottom, r.vh, 'thanh sát đáy màn hình' + at);
      assert.deepEqual(r.cells.map((c) => c.text), ORDER, 'đúng thứ tự năm ô' + at);
      for (const c of r.cells) assert.ok(c.w >= 44 && c.h >= 44, 'ô “' + c.text + '” đủ lớn để chạm (' + c.w + '×' + c.h + ')' + at);
      assert.equal(r.cells[2].label, 'Thêm nhanh một việc bằng câu tự nhiên', 'ô giữa có tên đọc được' + at);

      // Ô đang xem.
      const current = async () => (await info(page)).cells.filter((c) => c.current === 'page').map((c) => c.text);
      assert.deepEqual(await current(), ['Tổng quan'], 'Tổng quan: ô Tổng quan' + at);
      for (const [view, want] of [['projects', ['Bảng']], ['calendar', ['Bảng']], ['gantt', ['Bảng']], ['habits', ['Hằng ngày']], ['notes', ['Ghi chú']], ['budget', []], ['archive', []], ['versions', []]]) {
        await goTo(page, view);
        assert.deepEqual(await current(), want, 'ô đang xem ở trang ' + view + at);
      }

      // Bấm từng ô.
      await page.click('.zen-bottom-bar [data-bottom-go="dashboard"]');
      await page.waitForFunction(() => view === 'dashboard');
      await page.click('.zen-bottom-bar [data-bottom-go="projects"]');
      await page.waitForFunction(() => view === 'projects' && document.querySelector('#main h1'));
      await page.click('.zen-bottom-bar [data-bottom-go="habits"]');
      await page.waitForFunction(() => view === 'habits');
      await page.click('.zen-bottom-bar [data-bottom-go="notes"]');
      await page.waitForFunction(() => view === 'notes');
      assert.deepEqual(await current(), ['Ghi chú'], 'sau khi bấm Ghi chú' + at);
      await goTo(page, 'calendar');
      await page.click('.zen-bottom-bar [data-bottom-go="projects"]');
      await page.waitForFunction(() => view === 'projects');
      assert.equal(await page.evaluate(() => view), 'projects', 'đang ở Lịch, bấm Bảng thì sang Bảng' + at);

      // Ô giữa: Thêm nhanh.
      await page.click('.zen-bottom-bar [data-bottom-go="quick"]');
      await page.waitForSelector('#editor[open] #qa-line');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'qa-line', 'ô gõ được focus' + at);
      await page.fill('#qa-line', 'Gọi anh Sơn mai 9h #farm');
      await page.press('#qa-line', 'Enter');
      await page.waitForFunction(() => !document.querySelector('#editor').open);
      const made = await page.evaluate(() => data.projects.find((p) => p.id === 'p2').tasks.find((t) => t.title === 'Gọi anh Sơn'));
      assert.ok(made && made.due === '2026-11-18' && made.end === '2026-11-18T09:00', 'tạo đúng việc có hạn và dự án từ ô giữa' + at);
      await until(() => server.workspace.projects.find((p) => p.id === 'p2').tasks.some((t) => t.title === 'Gọi anh Sơn'), 'việc mới lên máy chủ' + at);

      // B. Không che nội dung.
      await goTo(page, 'dashboard');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(250);
      const foot = await page.evaluate(() => ({ footer: Math.round(document.querySelector('footer').getBoundingClientRect().bottom), bar: Math.round(document.querySelector('.zen-bottom-bar').getBoundingClientRect().top) }));
      assert.ok(foot.footer <= foot.bar + 1, 'chân trang nằm trên thanh (chân trang ' + foot.footer + ', thanh ' + foot.bar + ')' + at);
      await page.evaluate(() => notify('Thử thông báo'));
      await page.waitForSelector('#toast.show, #toast:not(:empty)');
      const toast = await page.evaluate(() => ({ bottom: Math.round(document.querySelector('#toast').getBoundingClientRect().bottom), bar: Math.round(document.querySelector('.zen-bottom-bar').getBoundingClientRect().top) }));
      assert.ok(toast.bottom <= toast.bar, 'thông báo nằm trên thanh (' + toast.bottom + ' ≤ ' + toast.bar + ')' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      // Trình duyệt tự cuộn tới một phần tử (phím Tab, liên kết neo): phần tử dừng phía trên thanh, không nằm dưới nó.
      await page.evaluate(() => window.scrollTo(0, 0));
      const stop = await page.evaluate(() => {
        const target = document.querySelector('#main').lastElementChild;
        target.scrollIntoView({ block: 'end' });
        return { bottom: Math.round(target.getBoundingClientRect().bottom), bar: Math.round(document.querySelector('.zen-bottom-bar').getBoundingClientRect().top), pad: parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) };
      });
      assert.ok(stop.pad >= 76, 'khoảng đệm cuộn đủ chứa thanh (' + stop.pad + ')' + at);
      assert.ok(stop.bottom <= stop.bar, 'phần tử được cuộn tới nằm trên thanh (' + stop.bottom + ' ≤ ' + stop.bar + ')' + at);

      // Bàn phím mở (ô tìm kiếm có focus): thanh ẩn; rời ô: hiện lại.
      await page.focus('#search');
      await page.waitForTimeout(150);
      assert.equal((await info(page)).shown, false, 'thanh ẩn khi bàn phím mở' + at);
      await page.evaluate(() => document.activeElement.blur());
      await page.waitForTimeout(150);
      assert.equal((await info(page)).shown, true, 'thanh hiện lại khi rời ô gõ' + at);
      // Ngăn kéo ☰ mở: thanh ẩn.
      await page.click('#menu');
      await page.waitForSelector('.sidebar.open');
      assert.equal((await info(page)).shown, false, 'thanh ẩn khi ngăn kéo mở' + at);
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.querySelector('.sidebar').classList.remove('open'));
      await page.waitForTimeout(150);
      assert.equal((await info(page)).shown, true, 'thanh hiện lại khi đóng ngăn kéo' + at);
    } finally {
      await context.close();
    }
  }

  // C. Máy tính bảng / máy tính ------------------------------------------------------------------------------------------------------------
  for (const [width, touch] of [[820, true], [1440, false]]) {
    const at = ' ở ' + width + ' px';
    const { context, page } = await h.open(width, { touch, now: NOW });
    try {
      await goTo(page, 'dashboard');
      assert.equal((await info(page)).shown, false, 'không có thanh dưới' + at);
      const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.app')).paddingBottom));
      assert.ok(pad < 40, 'chân trang không bị chừa chỗ thừa (' + pad + 'px)' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    } finally {
      await context.close();
    }
  }

  // D. Giang hồ và độ tương phản -------------------------------------------------------------------------------------------------------------
  const THEMES = [
    ['sáng', {}, null],
    ['tối', { colorScheme: 'dark' }, null],
    ['Giang hồ', {}, ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'))],
    ['tương phản cao', { contrast: 'more' }, ({ context }) => context.addInitScript(() => localStorage.setItem('zen-contrast', 'high'))],
  ];
  for (const [name, opts, setup] of THEMES) {
    const at = ' ở 390 px (' + name + ')';
    const { context, page } = await h.open(390, { touch: true, now: NOW, ...opts, ...(setup ? { setup } : {}) });
    try {
      await goTo(page, 'dashboard');
      await settle(page);
      const r = await info(page);
      if (name === 'Giang hồ') {
        assert.deepEqual(r.cells.map((c) => c.text), ['Tổng đàn', 'Cáo thị', 'Ghi nhanh', 'Nhật khóa', 'Tàng thư'], 'nhãn giang hồ' + at);
        assert.equal(r.name, 'Lối đi nhanh', 'tên vùng điều hướng giang hồ' + at);
        assert.equal(r.cells[2].label, 'Ghi nhanh một nhiệm vụ bằng một câu', 'tên ô giữa giang hồ' + at);
      } else assert.deepEqual(r.cells.map((c) => c.text), ORDER, 'nhãn' + at);
      for (const sel of ['.zbb-cell[data-bottom-go="projects"] .zbb-label', '.zbb-cell[data-bottom-go="dashboard"] .zbb-label', '.zbb-cell[data-bottom-go="notes"] .zbb-label']) {
        const c = await contrast(page, sel);
        assert.ok(c >= 4.5, 'chữ ' + sel + ' ≥ 4,5:1 (' + c?.toFixed(2) + ')' + at);
      }
      // Dấu + nằm trên nút tròn nền chuyển màu (vẽ bằng ::before): so với màu đậm nhất trong các điểm dừng của nền.
      const add = await page.evaluate(() => {
        const icon = document.querySelector('.zbb-add .zbb-icon');
        const lum = ([r, g, b]) => [r, g, b].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
        const stops = [...getComputedStyle(icon, '::before').backgroundImage.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map((m) => [+m[1], +m[2], +m[3]]);
        const fg = (getComputedStyle(icon).color.match(/\d+/g) || []).slice(0, 3).map(Number);
        const ratios = stops.map((s) => (Math.max(lum(s), lum(fg)) + 0.05) / (Math.min(lum(s), lum(fg)) + 0.05));
        return { n: stops.length, min: Math.min(...ratios) };
      });
      assert.ok(add.n >= 2 && add.min >= 3, 'dấu + trên nút tròn ≥ 3:1 (' + add.min.toFixed(2) + ', ' + add.n + ' điểm dừng)' + at);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    } finally {
      await context.close();
    }
  }
  console.log('bottom-bar ok');
} finally {
  await h.close();
}
