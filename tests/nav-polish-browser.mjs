// v2.87.0 (Thanh Điều Hướng): (1) thanh chế độ xem điện thoại phong cách Giang hồ: “Liên hoàn” có dòng phụ “Việc ưu tiên” như các mục khác,
// tên mục không bị cắt; phong cách Thiền giữ nhãn một dòng cũ; (2) nút × đóng menu bên là ô 44px bo tròn, không đè lên tường vân ở thanh bên.
// Kiểm tra ở 390 (chạm), 820, 1440 px: không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const giangho = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness();
try {
  // A. Phong cách Giang hồ, điện thoại: nhãn bốn mục đủ hai dòng, không cắt.
  {
    const { context, page } = await h.open(390, { touch: true, setup: giangho });
    await h.show(page, 'projects');
    await page.waitForSelector('.mobile-viewbar .view-mode[data-view="worklist"]');
    const bar = await page.evaluate(() =>
      [...document.querySelectorAll('.mobile-viewbar .view-mode')].map((b) => {
        const name = b.querySelector('.gh-nav-name') || b.querySelector('span');
        const host = name.parentElement;
        return { text: b.innerText.replace(/\s+/g, ' ').trim(), clipped: name.scrollWidth > host.clientWidth + 1, h: b.offsetHeight };
      }),
    );
    assert.equal(bar.length, 4, 'thanh điện thoại có bốn mục');
    assert.match(bar[3].text, /^Liên hoàn Việc ưu tiên$/, 'Liên hoàn có dòng phụ “Việc ưu tiên”');
    for (const item of bar) {
      assert.equal(item.clipped, false, 'tên mục không bị cắt: ' + item.text);
      assert.match(item.text, /\S+ \S+/, 'mỗi mục có tên và dòng phụ: ' + item.text);
    }
    assert.equal(new Set(bar.map((i) => i.h)).size, 1, 'bốn mục cao bằng nhau');
    assert.equal(await noOverflow(page), true, 'không tràn ngang (390, Giang hồ)');
    await context.close();
  }

  // B. Phong cách Thiền, điện thoại: “Liên hoàn” giữ nhãn một dòng như trước.
  {
    const { context, page } = await h.open(390, { touch: true });
    await h.show(page, 'projects');
    await page.waitForSelector('.mobile-viewbar .view-mode[data-view="worklist"]');
    const text = await page.locator('.mobile-viewbar .view-mode[data-view="worklist"]').innerText();
    assert.equal(text.replace(/\s+/g, ' ').trim(), 'Liên hoàn', 'phong cách Thiền: nhãn Liên hoàn một dòng');
    await context.close();
  }

  // C. Nút × đóng menu bên (Giang hồ, 390): ô 44px bo tròn, không chồng lên tường vân.
  {
    const { context, page } = await h.open(390, { touch: true, setup: giangho });
    await h.show(page, 'projects');
    await page.click('#menu');
    await page.waitForSelector('.sidebar.open .mobile-menu-close');
    await page.waitForTimeout(450);
    const geo = await page.evaluate(() => {
      const x = document.querySelector('.sidebar .mobile-menu-close').getBoundingClientRect();
      const sb = document.querySelector('.sidebar');
      const sr = sb.getBoundingClientRect();
      const bgPos = getComputedStyle(sb).backgroundPosition;
      // Tường vân: đặt bằng “right Npx top Mpx”, rộng 46px, cao 25px (xem scripts/giangho-skin.css).
      // Trình duyệt trả về dạng “calc(100% - Npx) Mpx” (tương đương “right Npx top Mpx”).
      const m = bgPos.match(/calc\(100% - (-?\d+(?:\.\d+)?)px\)\s+(-?\d+(?:\.\d+)?)px/) || bgPos.match(/right\s+(-?\d+(?:\.\d+)?)px\s+top\s+(-?\d+(?:\.\d+)?)px/);
      if (!m) throw new Error('không đọc được vị trí tường vân: ' + bgPos);
      const right = Number(m[1]);
      const cloud = { x0: sr.right - right - 46, x1: sr.right - right, y0: sr.top + Number(m[2]), y1: sr.top + Number(m[2]) + 25 };
      return {
        w: Math.round(x.width),
        h: Math.round(x.height),
        radius: getComputedStyle(document.querySelector('.sidebar .mobile-menu-close')).borderTopLeftRadius,
        overlapsCloud: !(x.right <= cloud.x0 || x.left >= cloud.x1 || x.bottom <= cloud.y0 || x.top >= cloud.y1),
        right,
      };
    });
    assert.equal(geo.w, 44, 'nút × rộng 44px (chạm)');
    assert.equal(geo.h, 44, 'nút × cao 44px (chạm)');
    assert.notEqual(geo.radius, '0px', 'nút × bo tròn');
    assert.equal(geo.overlapsCloud, false, 'nút × không đè lên tường vân bên cạnh tên ứng dụng');
    assert.equal(await noOverflow(page), true, 'không tràn ngang (drawer 390)');
    await context.close();
  }

  // D. Máy tính bảng và máy tính: không tràn ngang; mục Liên hoàn lệnh có dòng phụ ở mọi kích thước.
  for (const width of [820, 1440]) {
    const { context, page } = await h.open(width, { touch: false, setup: giangho });
    await h.show(page, 'projects');
    await page.waitForSelector('.view-options .view-mode[data-view="worklist"]');
    const text = await page.locator('.view-options .view-mode[data-view="worklist"]').innerText();
    assert.match(text.replace(/\s+/g, ' '), /Việc ưu tiên/, 'Liên hoàn lệnh có dòng phụ (' + width + 'px)');
    assert.equal(await noOverflow(page), true, 'không tràn ngang (' + width + 'px)');
    await context.close();
  }
  console.log('nav-polish-browser ok');
} finally {
  await h.close();
}
