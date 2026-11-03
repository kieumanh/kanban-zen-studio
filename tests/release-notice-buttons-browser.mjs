// Hồi quy v1.19.5: khi có bản mới, thông báo phiên bản trong chuông có HAI nút ("Xem chi tiết" và "Tải lại trang").
// Trước đây cả hai cùng xếp vào một ô lưới nên "Tải lại trang" đè lên "Xem chi tiết". Phải đứng cạnh nhau (hoặc xuống dòng),
// không chồng lên nhau, bấm vào giữa nút nào thì trúng đúng nút đó, nằm gọn trong khung thông báo ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const h = await startHarness();
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, {
      touch: width < 1000,
      setup: async ({ context }) => {
        // Trình phục vụ nền (PWA) xử lý mọi yêu cầu nên page.route không chặn được; thay fetch của trang để /health báo bản mới hơn.
        await context.addInitScript(() => {
          const original = window.fetch.bind(window);
          window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : input.url;
            if (/\/health(\?|$)/.test(url)) {
              return Promise.resolve(new Response(JSON.stringify({ ok: true, version: '99.0.0' }), { headers: { 'content-type': 'application/json' } }));
            }
            return original(input, init);
          };
        });
      },
    });
    const at = ` (${width}px)`;
    await page.waitForSelector('#main');
    await page.evaluate(() => checkRelease());
    await page.evaluate(() => document.querySelector('#notifications-button').click());
    await page.waitForSelector('.release-notice #release-reload');

    const m = await page.evaluate(() => {
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const card = document.querySelector('.release-notice');
      const read = card.querySelector('#release-read');
      const reload = card.querySelector('#release-reload');
      reload.scrollIntoView({ block: 'center' }); // nút có thể nằm dưới màn hình: cuộn vào vùng nhìn thì elementFromPoint mới đo được
      const hit = (el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el === top || el.contains(top);
      };
      return {
        card: box(card),
        read: box(read),
        reload: box(reload),
        readHit: hit(read),
        reloadHit: hit(reload),
        readText: read.textContent.trim(),
        reloadText: reload.textContent.trim(),
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const overlap = !(m.read.right <= m.reload.left + 1 || m.reload.right <= m.read.left + 1 || m.read.bottom <= m.reload.top + 1 || m.reload.bottom <= m.read.top + 1);
    assert.ok(!overlap, 'hai nút chồng lên nhau ' + JSON.stringify({ read: m.read, reload: m.reload }) + at);
    assert.ok(m.readHit && m.reloadHit, 'giữa nút bị nút khác che' + at);
    assert.equal(m.readText, 'Xem chi tiết', at);
    assert.equal(m.reloadText, 'Tải lại trang', at);
    for (const key of ['read', 'reload']) {
      // Cảm ứng (390/820px): vùng chạm tối thiểu 44px. Chuột (1440px) dùng kích thước nút chung của app, không đổi trong bản này.
      assert.ok(m[key].height >= (width < 1000 ? 44 : 32), `nút ${key} quá thấp: ${m[key].height}` + at);
      assert.ok(m[key].left >= m.card.left - 1 && m[key].right <= m.card.right + 1, `nút ${key} ra ngoài khung thông báo` + at);
    }
    assert.ok(!m.pageOverflow, 'tràn ngang' + at);
    await context.close();
  }
  console.log('PASS: hai nút "Xem chi tiết" và "Tải lại trang" không chồng nhau, bấm trúng nút, nằm gọn ở 390/820/1440px.');
} finally {
  await h.close();
}
