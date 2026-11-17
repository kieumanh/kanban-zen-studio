// v2.37.0 (Tải Theo Nhu Cầu): lần mở đầu không tải mã Điểm tích lũy, Giang hồ, nhật ký phát hành; ba khối này tải khi cần mà không mất việc nào.
// Bài này chạy ĐÚNG đường tải theo nhu cầu như ngoài đời (startHarness({ lazy: true })); các bài khác chạy với thẻ đánh dấu đã đổi về thẻ thường.
// A. Mở lần đầu (phong cách Thiền, chưa bắt đầu Điểm tích lũy) ở 390 / 820 / 1440 px: không có tệp growth*, giangho-lex/lunar/fx/ach, giangho.css,
//    releases.js; tổng tải sau nén ≤ 460 KB (trước đây ~745 KB); nút “Điểm tích lũy” vẫn có trên thanh bên, đúng chỗ, có biểu tượng; bộ kiểm data.growth đã có.
// B. Mở trang Điểm tích lũy: hiện “Đang mở…” rồi trang thật; CSS growth chèn đúng chỗ cũ; mất mạng giữa chừng thì báo lỗi, chưa chạy dở tệp nào, “Thử lại” chạy trọn.
// C. Người đã bắt đầu Điểm tích lũy hoàn thành việc TRƯỚC khi mã nạp xong: vẫn hiện bảng cộng điểm, ghi đúng vào sổ (không mất lần hỏi điểm, không ghi hai lần);
//    chuỗi 7 ngày của việc hằng ngày cũng vậy. Người đó được nạp lúc rảnh, không cần mở trang.
// D. Phong cách Giang hồ lúc mở: giangho.css chặn vẽ (không chớp giao diện Thiền), chữ Giang hồ đã có, kèm nhóm Điểm tích lũy; đổi sang Giang hồ trong lúc dùng thì
//    đợi CSS rồi mới đổi; đổi về Thiền trả đúng chữ cũ; Bảng chú giải nạp bộ chữ khi người dùng Thiền mở.
// E. Trang Phiên bản nạp nhật ký khi mở; chuông có phiên bản mới chưa đọc cũng nạp; mọi tệp tải theo nhu cầu có trong danh sách ngoại tuyến của service worker.
import assert from 'node:assert/strict';
import { brotliCompressSync } from 'node:zlib';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const GROWTH = {
  v: 1,
  hero: 'nam',
  since: '2026-11-01',
  log: [{ id: 'l1', d: '2026-11-02', s: 'task', k: 'task:old1', n: 'Việc cũ một', p: [2, 0, 0, 0, 0, 0, 0, 0] }],
};
const seed = (growth) => () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4);
  p.tasks[2].title = 'Gửi báo cáo tuần';
  p.tasks[2].col = 'Doing';
  return { schema: 1, projects: [p], notes: [], ...(growth ? { growth } : {}) };
};
// Tệp tải theo nhu cầu (bản chạy thật có băm 16 ký tự do bộ dựng thêm vào tên; máy chủ thử dùng tên gốc, nên băm là tùy chọn).
const LAZY_JS = /\/(growth(?:-(?!notify)[a-z]+)?|giangho-(?:fx|ach|lex|lunar)|releases)(?:\.[0-9a-f]{16})?\.js$/;
const LAZY_CSS = /\/(growth|giangho)(?:\.[0-9a-f]{16})?\.css$/;
const isLazy = (u) => LAZY_JS.test(u) || LAZY_CSS.test(u);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const until = async (fn, label, ms = 15000) => {
  for (let t = 0; t < ms; t += 100) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
};
const watch = () => {
  const st = { urls: [], br: 0 };
  return [
    st,
    ({ context }) => {
      context.on('response', async (r) => {
        try {
          const u = new URL(r.url());
          if (u.pathname.startsWith('/api/')) return;
          st.urls.push(u.pathname);
          st.br += brotliCompressSync(await r.body()).length;
        } catch {}
      });
    },
  ];
};
// Service worker của trang trả tệp từ bộ nhớ đệm nên page.route không chặn được; giữ lại / làm hỏng ngay trong lệnh fetch của trang.
const holdFetch = (page, re) =>
  page.evaluate((src) => {
    const f = (window.__fetch0 = window.__fetch0 || window.fetch.bind(window));
    window.__held = [];
    window.fetch = (u, ...a) => (new RegExp(src).test(String(u?.url || u)) ? new Promise((r) => window.__held.push(r)).then(() => f(u, ...a)) : f(u, ...a));
  }, re.source);
const releaseFetch = (page) => page.evaluate(() => { window.fetch = window.__fetch0; (window.__held || []).forEach((r) => r()); window.__held = []; });
const failFetch = (page, re) =>
  page.evaluate((src) => {
    const f = (window.__fetch0 = window.__fetch0 || window.fetch.bind(window));
    window.fetch = (u, ...a) => (new RegExp(src).test(String(u?.url || u)) ? Promise.reject(new TypeError('Failed to fetch')) : f(u, ...a));
  }, re.source);
const normalFetch = (page) => page.evaluate(() => { if (window.__fetch0) window.fetch = window.__fetch0; });
const withStyle = (style) => ({ context }) => context.addInitScript((s) => localStorage.setItem('zen-style', s), style);
const both = (...fns) => async (arg) => { for (const f of fns) await f(arg); };

const h = await startHarness({ seed: seed(), lazy: true });
try {
  // ---- A. Mở lần đầu ----
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const [st, setup] = watch();
    const { context, page } = await h.open(width, { touch, workspace: seed()(), setup });
    await page.waitForSelector('#main h1');
    await wait(3500); // quá thời gian “lúc rảnh” (1,5 giây + hàng chờ): người chưa bắt đầu Điểm tích lũy vẫn không nạp gì
    assert.deepEqual(st.urls.filter(isLazy), [], 'không tải khối nào tải theo nhu cầu' + at);
    assert.ok(st.br < 460 * 1024, 'tổng tải sau nén ' + Math.round(st.br / 1024) + ' KB phải < 460 KB' + at);
    const state = await page.evaluate(() => {
      const b = document.querySelector('.sidebar [data-view="growth"]');
      const nav = [...document.querySelectorAll('.sidebar .nav[data-view]')].map((x) => x.dataset.view);
      return {
        label: b?.textContent.trim(),
        path: b?.querySelector('svg path')?.getAttribute('d') || '',
        order: nav.indexOf('growth') + 1 === nav.indexOf('budget'),
        stub: window.zenGrowth?.stub === true,
        ready: [window.zenLazy.ready('growth'), window.zenLazy.ready('giangho'), window.zenLazy.ready('releases')],
        groups: window.zenLazy.groups().sort(),
        badGrowth: valid({ schema: 1, projects: [], growth: { v: 2 } }),
        okGrowth: valid({ schema: 1, projects: [], growth: { v: 1, hero: 'nam', since: '2026-11-01', log: [] } }),
        noGrowth: valid({ schema: 1, projects: [] }),
        giangho: !!document.querySelector('link[data-zen-css]'),
      };
    });
    assert.equal(state.label, 'Điểm tích lũy', 'nút trên thanh bên' + at);
    assert.ok(state.path.length > 10, 'nút có biểu tượng' + at);
    assert.equal(state.order, true, 'nút đứng ngay trước Phân bổ tài nguyên' + at);
    assert.equal(state.stub, true, 'chưa nạp growth.js' + at);
    assert.deepEqual(state.ready, [false, false, false], 'ba khối chưa nạp' + at);
    assert.deepEqual(state.groups, ['giangho', 'growth', 'releases'], 'ba nhóm tải theo nhu cầu' + at);
    assert.equal(state.badGrowth, false, 'bộ kiểm data.growth đã có từ đầu: từ chối dữ liệu sai' + at);
    assert.equal(state.okGrowth, true, 'chấp nhận dữ liệu đúng' + at);
    assert.equal(state.noGrowth, true, 'không có data.growth cũng hợp lệ' + at);
    assert.equal(state.giangho, false, 'không có giangho.css khi phong cách Thiền' + at);
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);

    // ---- B. Mở trang Điểm tích lũy ----
    await holdFetch(page, /growth-art(?:\.[0-9a-f]{16})?\.js/);
    await page.evaluate(() => go('growth'));
    await page.waitForSelector('#main [role=status]');
    assert.match(await page.locator('#main').innerText(), /Đang mở Điểm tích lũy/, 'báo đang mở' + at);
    assert.equal(await page.evaluate(() => document.querySelector('#crumb').textContent), 'Điểm tích lũy', 'đường dẫn đúng ngay khi chờ' + at);
    await releaseFetch(page);
    await page.waitForFunction(() => document.querySelector('#main h1')?.textContent === 'Hành tẩu giang hồ', null, { timeout: 15000 });
    assert.ok(st.urls.some((u) => /\/growth-art(?:\.[0-9a-f]{16})?\.js$/.test(u)) && st.urls.some((u) => /\/growth(?:\.[0-9a-f]{16})?\.css$/.test(u)), 'đã tải mã và CSS Điểm tích lũy' + at);
    const after = await page.evaluate(() => {
      const link = [...document.querySelectorAll('link[rel=stylesheet]')].find((l) => /\/growth(?:\.[0-9a-f]{16})?\.css/.test(l.href));
      return {
        css: !!link?.sheet,
        slot: link?.nextElementSibling?.getAttribute('rel') === 'zen-lazy',
        real: !!window.zenGrowth && !window.zenGrowth.stub,
        nav: document.querySelectorAll('.sidebar [data-view="growth"]').length,
        active: document.querySelector('.sidebar [data-view="growth"]').classList.contains('active'),
        gh: !!window.zenGiangHo,
      };
    });
    assert.deepEqual(after, { css: true, slot: true, real: true, nav: 1, active: true, gh: false }, 'sau khi nạp: CSS đúng chỗ cũ, một nút, không kéo theo Giang hồ' + at);
    assert.equal(await noOverflow(page), true, 'trang Điểm tích lũy không tràn ngang' + at);
    await context.close();
  }

  // ---- B2. Mất mạng giữa chừng rồi thử lại ----
  {
    const { context, page } = await h.open(1440, { workspace: seed()() });
    await page.waitForSelector('#main h1');
    await failFetch(page, /growth-store(?:\.[0-9a-f]{16})?\.js/);
    await page.evaluate(() => go('growth'));
    await page.waitForSelector('#main [role=alert] [data-lazy-retry]');
    assert.match(await page.locator('#main').innerText(), /Chưa tải được trang Điểm tích lũy/, 'báo lỗi rõ');
    const partial = await page.evaluate(() => ({ stub: window.zenGrowth.stub === true, emblem: typeof window.zenEmblem, art: typeof window.zenHero }));
    assert.deepEqual(partial, { stub: true, emblem: 'undefined', art: 'undefined' }, 'chưa chạy dở tệp nào của nhóm');
    await normalFetch(page);
    await page.click('[data-lazy-retry]');
    await page.waitForFunction(() => document.querySelector('#main h1')?.textContent === 'Hành tẩu giang hồ', null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => typeof window.zenStore), 'object', 'đã chạy trọn nhóm sau khi thử lại');
    await context.close();
  }

  // ---- C. Hoàn thành việc / chuỗi thói quen khi mã chưa nạp xong ----
  {
    const { context, page, server } = await h.open(1440, { workspace: seed(GROWTH)() });
    await page.waitForSelector('#main h1');
    const early = await page.evaluate(() => window.zenLazy.ready('growth'));
    assert.equal(early, false, 'lúc hoàn thành việc, mã Điểm tích lũy chưa nạp');
    await page.evaluate(() => moveTask(project('p1'), project('p1').tasks[2], 'Done'));
    await page.waitForSelector('dialog#growth-award[open]', { timeout: 15000 });
    await page.click('[data-gr-plus="0"]');
    await page.click('[data-gr-plus="0"]');
    await page.click('[data-gr-save]');
    await page.waitForFunction(() => !document.querySelector('dialog#growth-award[open]'));
    const log = await page.evaluate(() => data.growth.log.filter((e) => e.k === 'task:p1t2').map((e) => [e.s, e.p[0]]));
    assert.deepEqual(log, [['task', 2]], 'đã ghi đúng một dòng vào sổ cho việc vừa xong');
    await until(() => server.workspace.growth?.log.some((e) => e.k === 'task:p1t2'), 'lưu lên máy chủ');
    // Kéo lại về Done lần nữa không hỏi lần hai.
    await page.evaluate(() => {
      moveTask(project('p1'), project('p1').tasks[2], 'Doing');
      moveTask(project('p1'), project('p1').tasks[2], 'Done');
    });
    await wait(900);
    assert.equal(await page.locator('dialog#growth-award[open]').count(), 0, 'mỗi việc chỉ hỏi điểm một lần');
    assert.equal(await page.evaluate(() => data.growth.log.filter((e) => e.k === 'task:p1t2').length), 1, 'không ghi hai lần');
    await context.close();
  }
  {
    // Người đã bắt đầu được nạp lúc rảnh, không cần mở trang.
    const { context, page } = await h.open(820, { touch: true, workspace: seed(GROWTH)() });
    await page.waitForSelector('#main h1');
    await until(() => page.evaluate(() => window.zenLazy.ready('growth')), 'nạp lúc rảnh', 20000);
    assert.equal(await page.evaluate(() => window.zenGrowth.stub === undefined && window.zenGrowth.started()), true, 'zenGrowth thật, đã bắt đầu');
    assert.equal(await page.evaluate(() => view), 'dashboard', 'vẫn đứng ở Tổng quan');
    await context.close();
  }
  {
    // Chuỗi 7 ngày liền của việc hằng ngày khi mã chưa nạp: nạp rồi mới hỏi điểm.
    const ws = seed(GROWTH)();
    ws.dailyHabits = [{ id: 'h1', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: '2026-10-01', goal: 7, done: ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'] }];
    const { context, page } = await h.open(1440, { workspace: ws, now: '2026-11-17T03:00:00Z' });
    await page.waitForSelector('#main h1');
    assert.equal(await page.evaluate(() => window.zenLazy.ready('growth')), false, 'mã chưa nạp');
    await page.evaluate(() => window.zenGrowth.habitStreak({ id: 'h1', name: 'Đi bộ' }, 7));
    await page.waitForSelector('dialog#growth-award[open]', { timeout: 15000 });
    assert.match(await page.locator('dialog#growth-award').innerText(), /“Đi bộ” đã khổ luyện đủ 7 ngày liền/, 'hỏi điểm cho chuỗi 7 ngày');
    await context.close();
  }

  // ---- D. Giang hồ ----
  {
    const [st, setup] = watch();
    const { context, page } = await h.open(1440, { workspace: seed()(), setup: both(setup, withStyle('giangho')) });
    await page.waitForFunction(() => window.zenGiangHo && window.zenGrowth && !window.zenGrowth.stub, null, { timeout: 15000 });
    const gh = await page.evaluate(() => {
      const link = document.querySelector('link[data-zen-css="giangho"]');
      return { sheet: !!link?.sheet, after: link?.previousElementSibling?.getAttribute('data-css') ? 'slot' : link?.previousElementSibling?.tagName, style: document.documentElement.dataset.style };
    });
    assert.equal(gh.sheet, true, 'giangho.css đã áp');
    assert.equal(gh.style, 'giangho');
    await page.waitForFunction(() => document.querySelector('.sidebar [data-view="dashboard"]')?.textContent.includes('Tổng đàn'), null, { timeout: 15000 });
    assert.ok(st.urls.some((u) => /\/giangho-lex(?:\.[0-9a-f]{16})?\.js$/.test(u)) && st.urls.some((u) => /\/giangho-fx(?:\.[0-9a-f]{16})?\.js$/.test(u)), 'đã tải bộ chữ Giang hồ và nhóm Điểm tích lũy');
    await context.close();
  }
  {
    // Đổi phong cách trong lúc dùng.
    const [st, setup] = watch();
    const { context, page } = await h.open(1440, { workspace: seed()(), setup });
    await page.waitForSelector('#main h1');
    assert.equal(await page.evaluate(() => !!document.querySelector('link[data-zen-css]') || !!window.zenGiangHo), false, 'Thiền: chưa có CSS và chữ Giang hồ');
    await page.evaluate(() => window.zenTheme.setStyle('giangho'));
    await page.waitForFunction(() => document.documentElement.dataset.style === 'giangho' && !!document.querySelector('link[data-zen-css="giangho"]')?.sheet, null, { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('.sidebar [data-view="dashboard"]')?.textContent.includes('Tổng đàn'), null, { timeout: 15000 });
    assert.equal(
      await page.evaluate(() => document.querySelector('link[data-zen-css="giangho"]').previousElementSibling.getAttribute('data-need')),
      'giangho',
      'CSS chèn đúng chỗ cũ (ngay sau thẻ đánh dấu)',
    );
    await page.evaluate(() => window.zenTheme.setStyle('zen'));
    await page.waitForFunction(() => !document.documentElement.dataset.style && document.querySelector('.sidebar [data-view="dashboard"]')?.textContent.includes('Tổng quan'), null, { timeout: 15000 });
    assert.ok(st.urls.some((u) => /giangho(?:\.[0-9a-f]{16})?\.css$/.test(u)), 'đã tải giangho.css');
    await context.close();
  }
  {
    // Bảng chú giải: người dùng Thiền mở thì nạp bộ chữ trước.
    const { context, page } = await h.open(1440, { workspace: seed()() });
    await page.waitForSelector('#main h1');
    assert.equal(await page.evaluate(() => window.zenLazy.ready('giangho')), false, 'chưa nạp bộ chữ');
    await page.evaluate(() => window.zenGuide.glossary());
    await page.waitForSelector('.gh-glossary .gh-glossary-group', { timeout: 15000 });
    const rows = await page.locator('.gh-glossary-group').first().locator('tr, li, .gh-gloss-row').count();
    assert.ok(rows >= 8, 'bảng có đủ mục điều hướng (' + rows + ')');
    await context.close();
  }

  // ---- E. Nhật ký phát hành và ngoại tuyến ----
  {
    const [st, setup] = watch();
    const { context, page } = await h.open(390, { touch: true, workspace: seed()(), setup });
    await page.waitForSelector('#main h1');
    assert.equal(await page.evaluate(() => RELEASES.length), 0, 'chưa nạp nhật ký');
    // render() gốc gọi versions() cho mọi trang không có hàm riêng rồi trang đó vẽ đè: đi qua các trang khác không được kéo nhật ký về.
    for (const v of ['budget', 'habits', 'notes', 'resources', 'focus', 'archive', 'trash']) await h.show(page, v);
    await wait(500);
    assert.equal(await page.evaluate(() => RELEASES.length), 0, 'đi qua các trang khác không nạp nhật ký');
    assert.deepEqual(st.urls.filter((u) => /\/releases(?:\.[0-9a-f]{16})?\.js$/.test(u)), [], 'không có yêu cầu tải releases.js');
    await page.evaluate(() => go('versions'));
    await page.waitForFunction(() => document.querySelectorAll('.release-card').length >= 40, null, { timeout: 15000 });
    assert.ok(st.urls.some((u) => /\/releases(?:\.[0-9a-f]{16})?\.js$/.test(u)), 'đã tải releases.js');
    assert.match(await page.locator('.release-card').first().innerText(), /^v\d+\.\d+\.\d+/, 'thẻ đầu là phiên bản hiện tại');
    assert.equal(await noOverflow(page), true, 'không tràn ngang');
    await context.close();
  }
  {
    // Chuông: phiên bản mới chưa đọc vẫn hiện số “1” ngay, nhưng nội dung chỉ nạp khi người dùng mở chuông.
    const [st, setup] = watch();
    const { context, page } = await h.open(1440, { workspace: seed()(), setup });
    await page.waitForSelector('#main h1');
    await wait(1500);
    const boot = await page.evaluate(() => ({ n: RELEASES.length, label: document.querySelector('#notifications-button')?.getAttribute('aria-label') || '', unread: releaseUnread() }));
    assert.equal(boot.unread, true, 'có phiên bản mới chưa đọc');
    assert.equal(boot.n, 0, 'chưa nạp nhật ký chỉ vì có phiên bản mới chưa đọc');
    assert.match(boot.label, /1 chưa xem|có phiên bản mới/, 'chuông vẫn báo có điều mới: ' + boot.label);
    assert.deepEqual(st.urls.filter((u) => /\/releases(?:\.[0-9a-f]{16})?\.js$/.test(u)), [], 'chưa tải releases.js lúc mở');
    await page.evaluate(() => document.querySelector('#notifications-button').click());
    await page.waitForSelector('.release-notice span');
    await page.waitForFunction(() => RELEASES.length > 0 && document.querySelector('.release-notice span').textContent === RELEASES[0].text, null, { timeout: 15000 });
    const text = await page.locator('.release-notice span').first().innerText();
    assert.ok(text.length > 40 && !/Bấm Xem chi tiết để đọc\.$/.test(text) && !/undefined/.test(text), 'chuông có nội dung phiên bản mới: ' + text.slice(0, 60));
    await context.close();
  }
  {
    // Service worker: không lưu sẵn tệp tải theo nhu cầu lúc cài đặt; mở tới đâu lưu tới đó, rồi dùng được cả khi mất mạng.
    const { context, page } = await h.open(1440, { workspace: seed()() });
    await page.waitForSelector('#main h1');
    await until(() => page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker nhận trang', 20000);
    const cached = () => page.evaluate(async () => {
      const name = (await caches.keys()).find((k) => k.startsWith('zen-shell-'));
      return name ? (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname) : [];
    });
    const lists = await page.evaluate(async () => {
      const sw = await (await fetch('/sw.js')).text();
      const shell = JSON.parse(sw.match(/const SHELL_ASSETS=(\[.*?\]);/)[1]);
      const lazy = JSON.parse(sw.match(/const LAZY_ASSETS=(\{.*?\});/)[1]);
      const marked = [...document.querySelectorAll('script[type="zen/lazy"][src], link[rel="zen-lazy"][href], script[data-css]')].map((e) => e.getAttribute('data-css') || e.getAttribute('src') || e.getAttribute('href'));
      return { shell, lazy, marked };
    });
    assert.deepEqual(Object.keys(lists.lazy).sort(), ['giangho', 'growth', 'releases'], 'ba nhóm trong service worker');
    const all = Object.values(lists.lazy).flat();
    assert.ok(lists.marked.length >= 20, 'có đủ thẻ đánh dấu (' + lists.marked.length + ')');
    assert.deepEqual(lists.marked.filter((u) => !all.includes(u)), [], 'mọi tệp đánh dấu tải theo nhu cầu đều thuộc một nhóm của service worker');
    assert.deepEqual(all.filter((u) => !lists.shell.includes(u)), [], 'mọi tệp của nhóm đều nằm trong danh sách service worker được phép phục vụ');
    assert.ok(lists.lazy.giangho.some((u) => u.startsWith('/fonts/')), 'phông chữ Giang hồ thuộc nhóm Giang hồ');
    const first = await cached();
    assert.ok(first.includes('/lazy.js') && first.includes('/dark.css'), 'lõi đã được lưu sẵn cho ngoại tuyến');
    assert.deepEqual(first.filter((u) => all.includes(u)), [], 'chưa lưu sẵn tệp tải theo nhu cầu nào');
    // Mở trang Điểm tích lũy: nhóm growth được lưu lại; Giang hồ vẫn chưa.
    await page.evaluate(() => go('growth'));
    await page.waitForFunction(() => document.querySelector('#main h1')?.textContent === 'Hành tẩu giang hồ', null, { timeout: 15000 });
    await until(async () => { const now = await cached(); return lists.lazy.growth.every((u) => now.includes(u)); }, 'lưu nhóm Điểm tích lũy');
    const second = await cached();
    assert.deepEqual(second.filter((u) => lists.lazy.giangho.includes(u) || lists.lazy.releases.includes(u)), [], 'nhóm chưa dùng vẫn chưa được lưu');
    // Mất mạng: nhóm đã dùng vẫn lấy được từ bộ nhớ đệm, nhóm chưa dùng thì không.
    await context.setOffline(true);
    const off = await page.evaluate(
      async ([used, unused]) => ({
        used: await fetch(used).then((r) => r.ok, () => false),
        unused: await fetch(unused).then((r) => r.ok, () => false),
      }),
      [lists.lazy.growth[0], lists.lazy.giangho.find((u) => /lex/.test(u))],
    );
    assert.deepEqual(off, { used: true, unused: false }, 'ngoại tuyến: nhóm đã dùng có sẵn, nhóm chưa dùng thì chưa');
    await context.setOffline(false);
    await context.close();
  }
  console.log('lazy-load ok');
} finally {
  await h.close();
}
