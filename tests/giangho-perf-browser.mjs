// v1.94.0 (Khinh Công): tối ưu tải cho phong cách Giang hồ.
//  1. Phông chữ có chân Noto Serif tự lưu: máy chủ trả tệp woff2 đúng kiểu, CSP cho phép phông cùng nguồn; Giang hồ tải và dùng
//     được phông (tiêu đề ra Noto Serif), không còn yêu cầu nào tới Google cho Noto Serif; phong cách Thiền không tải tệp phông nào.
//  2. Bộ chuyển ngữ làm việc vừa đủ: mỗi lần dựng lại bảng 180 nhiệm vụ chỉ một lượt quan sát, số chữ được xem không vượt số chữ trên
//     trang (trước đây cây con thêm chồng nhau bị quét lại ~4 lần), phần lớn chữ lấy từ bộ nhớ "chắc chắn không đổi"; chữ vẫn đổi đúng.
// Kiểm ở 390 (chạm), 820 (chạm), 1440 px. Thời gian chỉ in ra để theo dõi, không dùng để chấm đỗ / trượt (máy CI dao động).
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 120), makeProject('p2', 'Beta', '#2e7d5b', 60)] });
const style = (s) => ({ context }) => context.addInitScript((v) => localStorage.setItem('zen-style', v), s);

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // 1. Giang hồ: phông tự lưu.
    {
      const requests = [];
      const { context, page } = await h.open(width, { touch, setup: ({ context, page }) => (page.on('request', (r) => requests.push(r.url())), style('giangho')({ context })) });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      const font = await page.evaluate(async () => {
        const faces = await document.fonts.load("600 24px 'Noto Serif'", 'Tầm thư Ầ');
        await document.fonts.ready;
        const res = await fetch('/fonts/noto-serif-latin-700.v1.woff2'); // tệp khác với tệp được tải sớm, để đếm lượt tải bên dưới cho đúng
        const head = new Uint8Array(await res.arrayBuffer()).slice(0, 4);
        return { faces: faces.length, ok: document.fonts.check("600 24px 'Noto Serif'", 'Tầm'), h1: getComputedStyle(document.querySelector('#main h1')).fontFamily, type: res.headers.get('Content-Type'), csp: res.headers.get('Content-Security-Policy') || '', magic: String.fromCharCode(...head) };
      });
      assert.ok(font.faces >= 1 && font.ok, 'Giang hồ nạp được phông Noto Serif tự lưu' + at);
      assert.match(font.h1, /^"?Noto Serif"?,/, 'tiêu đề dùng Noto Serif' + at);
      assert.equal(font.type, 'font/woff2', 'máy chủ trả đúng kiểu phông' + at);
      assert.equal(font.magic, 'wOF2', 'tệp phông hợp lệ' + at);
      assert.ok(requests.some((u) => /\/fonts\/noto-serif-vietnamese-600\.v1\.woff2$/.test(u)), 'tải phông từ máy chủ của ứng dụng' + at);
      assert.equal(await page.evaluate(() => document.querySelectorAll('link[rel=preload][as=font][crossorigin]').length), 2, 'tải sớm phông tiêu đề (đậm 600)' + at);
      assert.equal(requests.filter((u) => u.endsWith('/fonts/noto-serif-vietnamese-600.v1.woff2')).length, 1, 'tải sớm và @font-face dùng chung một lần tải' + at);
      assert.ok(!requests.some((u) => /Noto\+Serif|noto-serif/i.test(u) && !u.includes('/fonts/noto-serif-')), 'không gọi Google cho Noto Serif' + at);
      const doc = await page.evaluate(async () => (await fetch('/')).headers.get('Content-Security-Policy') || '');
      assert.match(doc, /font-src 'self' https:\/\/fonts\.gstatic\.com;/, 'CSP cho phép phông cùng nguồn' + at);

      // 2. Bộ chuyển ngữ: dựng lại bảng 180 nhiệm vụ.
      const work = await page.evaluate(async () => {
        const st = window.zenGiangHo.stats;
        const texts = () => { let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) n++; return n; };
        render();
        await new Promise((r) => setTimeout(r, 50));
        const before = { ...st }, onPage = texts(), runs = [];
        for (let i = 0; i < 5; i++) {
          const t = performance.now();
          render();
          await null;
          runs.push(performance.now() - t);
          await new Promise((r) => setTimeout(r, 30));
        }
        const d = Object.fromEntries(Object.keys(st).map((k) => [k, (st[k] - before[k]) / 5]));
        runs.sort((a, b) => a - b);
        return { onPage, d, median: runs[2], add: document.querySelector('.board-tools .btn.primary')?.textContent.trim() };
      });
      console.log('bảng 180 nhiệm vụ' + at + ': ' + work.onPage + ' chữ trên trang, mỗi lần dựng lại xem ' + work.d.texts + ' chữ / ' + work.d.attrs + ' phần tử có nhãn, bộ chuyển ngữ ' + work.d.ms.toFixed(1) + ' ms, dựng + đổi chữ ' + work.median.toFixed(1) + ' ms');
      assert.equal(work.d.batches, 1, 'một lần dựng lại = một lượt quan sát' + at);
      assert.ok(work.d.texts <= work.onPage * 1.05, 'không quét lại chữ đã quét trong cùng lượt: ' + work.d.texts + ' / ' + work.onPage + at);
      assert.ok(work.d.misses >= work.d.texts * 0.5, 'phần lớn chữ lấy từ bộ nhớ "không đổi": ' + work.d.misses + ' / ' + work.d.texts + at);
      assert.match(work.add || '', /Thêm nhiệm vụ/, 'chữ vẫn đổi đúng sau khi dựng lại' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
    // 3. Thiền: không tải tệp phông giang hồ.
    {
      const requests = [];
      const { context, page } = await h.open(width, { touch, setup: ({ page }) => page.on('request', (r) => requests.push(r.url())) });
      await h.show(page, 'projects', 'p1');
      await page.evaluate(() => document.fonts.ready);
      assert.ok(!requests.some((u) => /noto-serif|Noto\+Serif/i.test(u)), 'Thiền không tải phông Noto Serif: ' + requests.filter((u) => /noto/i.test(u)) + at);
      assert.equal(await page.evaluate(() => document.querySelectorAll('link[rel=preload][as=font]').length), 0, 'Thiền không tải sớm phông' + at);
      await context.close();
    }
  }
  console.log('giangho-perf-browser ok');
} finally {
  await h.close();
}
