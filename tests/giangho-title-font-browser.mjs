// v2.9.0 (Thư Pháp): tiêu đề Giang hồ theo phong cách võ lâm kiếm hiệp: phông bút lông Potta One tự lưu (SIL OFL 1.1).
//  1. Giang hồ: tiêu đề trang, tiêu đề khung, tiêu đề hộp thoại, ấn cảnh giới, danh hiệu thanh bên dùng Potta One (dự phòng Noto
//     Serif), độ đậm 400, không in đậm giả; chữ thường giữ nguyên. Phông có đủ dấu tiếng Việt (mọi chữ có dấu vẽ bằng Potta One).
//  2. Phông tải từ máy chủ của ứng dụng (đúng kiểu, tệp hợp lệ), được tải sớm; không tiêu đề nào tràn ngang.
//  3. Thiền: tiêu đề không đổi, không tải tệp Potta One.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px; sáng và tối.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const seed = () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 6)], growth: { v: 1, hero: 'nam', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [60, 0, 0, 0, 0, 0, 0, 0] }] } });
const style = (s) => ({ context, page }) => context.addInitScript((v) => localStorage.setItem('zen-style', v), s);
const VI = 'Giang hồ tu luyện Huyết Nguyệt lộ Võ lâm chí tôn ẮẰẲẴẶ ẤẦẨẪẬ ĐƠƯ ơư ỳýỷỹỵ';

const h = await startHarness({ seed });
try {
  for (const [width, touch, theme] of [
    [390, true, 'light'],
    [820, true, 'dark'],
    [1440, false, 'light'],
  ]) {
    const at = ' (' + width + 'px, ' + theme + ')';
    // 1 + 2. Giang hồ.
    {
      const requests = [];
      const { context, page } = await h.open(width, { touch, colorScheme: theme, setup: ({ context, page }) => (page.on('request', (r) => requests.push(r.url())), style('giangho')({ context, page })) });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.evaluate(() => document.fonts.ready);
      const f = await page.evaluate(async (vi) => {
        await document.fonts.load("400 24px 'Potta One'", vi);
        const fam = (sel) => { const el = document.querySelector(sel); return el ? [getComputedStyle(el).fontFamily, getComputedStyle(el).fontWeight, getComputedStyle(el).fontSynthesisWeight || getComputedStyle(el).fontSynthesis] : null; };
        // Mọi ký tự có dấu đều vẽ bằng Potta One: bề rộng khác hẳn khi chỉ dùng phông dự phòng đơn cách.
        const c = document.createElement('canvas').getContext('2d');
        const width = (font, ch) => ((c.font = font), c.measureText(ch).width);
        const missing = [...new Set(vi.replace(/\s/g, ''))].filter((ch) => width("40px 'Potta One', monospace", ch) === width('40px monospace', ch));
        const res = await fetch('/fonts/potta-one-latin-400.v1.woff2');
        const head = new Uint8Array(await res.arrayBuffer()).slice(0, 4);
        return {
          h1: fam('#main h1'), h2: fam('#main .panel > h2'), realm: fam('.gr-realm-name'), rank: fam('.sidebar .gh-rank strong'), body: getComputedStyle(document.querySelector('#main .help-copy')).fontFamily,
          ok: document.fonts.check("400 24px 'Potta One'", vi), missing, type: res.headers.get('Content-Type'), magic: String.fromCharCode(...head),
          preload: [...document.querySelectorAll('link[rel=preload][as=font]')].map((l) => l.getAttribute('href')),
          wide: [...document.querySelectorAll('#main h1, #main .panel > h2')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.slice(0, 30)),
        };
      }, VI);
      for (const [name, v] of [['tiêu đề trang', f.h1], ['tiêu đề khung', f.h2], ['ấn cảnh giới', f.realm], ['danh hiệu thanh bên', f.rank]]) {
        if (name === 'danh hiệu thanh bên' && !v && width < 1000) continue; // thanh bên thu gọn trên điện thoại / máy tính bảng
        assert.ok(v, name + ' có trên trang' + at);
        assert.match(v[0], /^"?Potta One"?, "?Noto Serif"?/, name + ': phông bút lông, dự phòng Noto Serif' + at);
        assert.equal(v[1], '400', name + ': độ đậm 400' + at);
      }
      assert.doesNotMatch(f.body, /Potta One/, 'chữ thường giữ nguyên' + at);
      assert.ok(f.ok, 'phông tiêu đề đã nạp' + at);
      assert.deepEqual(f.missing, [], 'đủ dấu tiếng Việt trong phông tiêu đề' + at);
      assert.equal(f.type, 'font/woff2', 'máy chủ trả đúng kiểu phông' + at);
      assert.equal(f.magic, 'wOF2', 'tệp phông hợp lệ' + at);
      assert.ok(f.preload.includes('/fonts/potta-one-vietnamese-400.v1.woff2') && f.preload.includes('/fonts/potta-one-latin-400.v1.woff2'), 'tải sớm phông tiêu đề' + at);
      assert.ok(requests.some((u) => /\/fonts\/potta-one-(latin|vietnamese)-400\.v1\.woff2$/.test(u)), 'tải phông từ máy chủ của ứng dụng' + at);
      assert.deepEqual(f.wide, [], 'tiêu đề không tràn khung' + at);
      // Hộp thoại.
      await page.click('[data-gr-story="0"]');
      await page.waitForSelector('dialog.gr-story[open]');
      const dlg = await page.evaluate(() => getComputedStyle(document.querySelector('#gr-story-title')).fontFamily);
      assert.match(dlg, /^"?Potta One"?/, 'tiêu đề hộp thoại dùng phông bút lông' + at);
      await page.keyboard.press('Escape');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3. Thiền.
    {
      const requests = [];
      const { context, page } = await h.open(width, { touch, colorScheme: theme, setup: ({ context, page }) => (page.on('request', (r) => requests.push(r.url())), style('zen')({ context, page })) });
      await h.show(page, 'growth');
      await page.evaluate(() => document.fonts.ready);
      assert.doesNotMatch(await page.evaluate(() => getComputedStyle(document.querySelector('#main h1')).fontFamily), /Potta One/, 'Thiền: tiêu đề không đổi' + at);
      assert.ok(!requests.some((u) => /potta-one/i.test(u)), 'Thiền không tải phông Potta One' + at);
      await context.close();
    }
  }
  console.log('giangho-title-font-browser ok');
} finally {
  await h.close();
}
