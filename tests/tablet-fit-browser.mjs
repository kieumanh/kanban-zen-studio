// v2.80.0 (Tablet): rà giao diện tablet (768 / 820 / 1024 / 1180 px) ra bốn lỗi chữ tràn / họa tiết đè chữ, mỗi lỗi một phần kiểm:
//  1. Thanh bên Giang hồ (≤1200px rộng 208px): đám mây trang trí không được đè chữ "kanban", "ZEN STUDIO" hay biểu tượng.
//  2. Phân bổ tài nguyên, biểu đồ rỗng: chữ "Chưa có số liệu" không bị nhãn "Tổng chi 0 ₫" in chồng lên.
//  3. Tổng quan, vòng "Bức tranh công việc": số và nhãn "Tổng công việc" nằm gọn trong lỗ vòng (đo hình học), ở mọi khổ từ 360 đến 1440px;
//     701–810px xếp một cột để vòng không bị ép nhỏ.
//  4. Lịch, mục "Chưa định ngày": số đếm nằm cạnh tiêu đề, không rơi xuống dòng dưới.
// Mỗi khổ kiểm cả Thiền / Giang hồ, sáng / tối; không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const cfg =
  (style, theme) =>
  ({ context }) =>
    context.addInitScript(
      ([s, t]) => {
        localStorage.setItem('zen-style', s);
        localStorage.setItem('zen-theme', t);
      },
      [style, theme],
    );
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const h = await startHarness();
try {
  const TABLETS = [
    [768, 1024],
    [820, 1180],
    [1024, 768],
    [1180, 820],
  ];
  const STYLES = [
    ['zen', 'light'],
    ['giangho', 'light'],
    ['giangho', 'dark'],
    ['zen', 'dark'],
  ];

  // 1. Đám mây thanh bên không đè tên ứng dụng (Giang hồ), mọi khổ có thanh bên cố định.
  for (const [w, ht] of [...TABLETS, [1440, 900]]) {
    for (const theme of ['light', 'dark']) {
      const at = ` (${w}px, giangho, ${theme})`;
      const { context, page } = await h.open(w, {
        setup: cfg('giangho', theme),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewportSize({ width: w, height: ht });
      await h.show(page, 'dashboard');
      const g = await page.evaluate(() => {
        const sb = document.querySelector('.sidebar'),
          s = getComputedStyle(sb),
          r = sb.getBoundingClientRect();
        const size = s.backgroundSize.split(' ').map(parseFloat);
        // computed background-position: "calc(100% - 12px) 5px" hoặc số px; đổi thành toạ độ trong thanh bên.
        const num = (txt, total, boxSize) => {
          const m = txt.match(/^calc\(100% - ([\d.]+)px\)$/);
          if (m) return total - parseFloat(m[1]) - boxSize;
          if (/%$/.test(txt))
            return ((total - boxSize) * parseFloat(txt)) / 100;
          return parseFloat(txt);
        };
        const cloud = {
          left: num(s.backgroundPositionX, r.width, size[0]),
          top: num(s.backgroundPositionY, r.height, size[1]),
        };
        cloud.right = cloud.left + size[0];
        cloud.bottom = cloud.top + size[1];
        const rects = [];
        const brand = sb.querySelector('.brand');
        for (const e of brand.querySelectorAll(
          '.brandmark, .brand-sub, .brand > span:not(.brandmark)',
        )) {
          const range = document.createRange();
          range.selectNodeContents(e);
          const parts = e.classList.contains('brandmark')
            ? [e.getBoundingClientRect()]
            : [...range.getClientRects()];
          for (const q of parts)
            rects.push({
              left: q.left - r.left,
              right: q.right - r.left,
              top: q.top - r.top,
              bottom: q.bottom - r.top,
            });
        }
        const hit = rects.filter(
          (q) =>
            q.left < cloud.right - 1 &&
            q.right > cloud.left + 1 &&
            q.top < cloud.bottom - 1 &&
            q.bottom > cloud.top + 1,
        );
        return {
          sbw: Math.round(r.width),
          cloud,
          hit: hit.length,
          hasImage: s.backgroundImage !== 'none',
        };
      });
      assert.ok(g.hasImage, 'thanh bên Giang hồ có tường vân' + at);
      assert.equal(
        g.hit,
        0,
        'đám mây không đè chữ / biểu tượng tên ứng dụng: ' +
          JSON.stringify(g) +
          at,
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // 2. Biểu đồ rỗng ở Phân bổ tài nguyên: chỉ còn một dòng chữ, không nhãn tổng chồng lên.
  for (const [w, ht] of TABLETS) {
    for (const [style, theme] of STYLES) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { setup: cfg(style, theme) });
      await page.setViewportSize({ width: w, height: ht });
      await h.show(page, 'budget');
      await page.waitForSelector('.bg-donut-empty');
      const m = await page.evaluate(() => {
        const empty = document.querySelector('.bg-donut-empty'),
          center = empty.parentElement.querySelector('.bg-donut-center');
        const er = (() => {
          const range = document.createRange();
          range.selectNodeContents(empty);
          return range.getBoundingClientRect();
        })();
        let overlap = false;
        if (center && getComputedStyle(center).display !== 'none') {
          for (const t of center.querySelectorAll('small, strong')) {
            const range = document.createRange();
            range.selectNodeContents(t);
            const q = range.getBoundingClientRect();
            if (
              q.left < er.right &&
              q.right > er.left &&
              q.top < er.bottom &&
              q.bottom > er.top
            )
              overlap = true;
          }
        }
        return {
          overlap,
          text: empty.textContent.trim(),
          shown: !!center && getComputedStyle(center).display !== 'none',
        };
      });
      assert.equal(m.text, 'Chưa có số liệu', 'biểu đồ rỗng còn chữ' + at);
      assert.equal(
        m.overlap,
        false,
        'nhãn tổng không chồng lên chữ "Chưa có số liệu"' + at,
      );
      assert.equal(m.shown, false, 'biểu đồ rỗng ẩn nhãn tổng' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      await context.close();
    }
  }

  // 3. Vòng "Bức tranh công việc": nhãn nằm trong lỗ vòng.
  for (const w of [360, 390, 701, 768, 810, 820, 1024, 1180, 1440]) {
    for (const [style, theme] of STYLES) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { setup: cfg(style, theme) });
      await h.show(page, 'dashboard');
      await page.waitForSelector('.work-chart-ring svg');
      const m = await page.evaluate(() => {
        const svg = document.querySelector('.work-chart-ring svg'),
          r = svg.getBoundingClientRect();
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2,
          hole = (r.width * 62) / 220;
        let worst = 0;
        for (const e of document.querySelectorAll(
          '.work-chart-total strong, .work-chart-total span',
        )) {
          const range = document.createRange();
          range.selectNodeContents(e);
          for (const q of range.getClientRects())
            for (const [x, y] of [
              [q.left, q.top],
              [q.right, q.top],
              [q.left, q.bottom],
              [q.right, q.bottom],
            ])
              worst = Math.max(worst, Math.hypot(x - cx, y - cy));
        }
        return {
          size: Math.round(r.width),
          hole: Math.round(hole),
          worst: Math.round(worst),
          fs: parseFloat(
            getComputedStyle(document.querySelector('.work-chart-total span'))
              .fontSize,
          ),
        };
      });
      assert.ok(
        m.worst <= m.hole,
        `nhãn nằm trong lỗ vòng (${m.worst} > ${m.hole}, vòng ${m.size}px)` +
          at,
      );
      assert.ok(
        m.fs >= 12,
        'cỡ chữ nhãn không dưới 12px (thang chữ chung)' + at,
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      await context.close();
    }
  }

  // 4. Lịch: số đếm "Chưa định ngày" nằm cạnh tiêu đề.
  for (const [w, ht] of [
    [768, 1024],
    [820, 1180],
  ]) {
    for (const [style, theme] of STYLES) {
      const at = ` (${w}px, ${style}, ${theme})`;
      const { context, page } = await h.open(w, { setup: cfg(style, theme) });
      await page.setViewportSize({ width: w, height: ht });
      await h.show(page, 'calendar');
      const m = await page.evaluate(() => {
        const head = document.querySelector('.zen-unscheduled h2');
        if (!head) return null;
        const small = head.querySelector('small');
        if (!small) return null;
        const hr = head.getBoundingClientRect(),
          sr = small.getBoundingClientRect();
        return {
          inline: sr.bottom <= hr.bottom + 1 && sr.top >= hr.top - 1,
          h: Math.round(hr.height),
          display: getComputedStyle(small).display,
        };
      });
      assert.ok(m, 'có mục Chưa định ngày kèm số đếm' + at);
      assert.equal(
        m.inline,
        true,
        'số đếm nằm cạnh tiêu đề, không rơi xuống dòng dưới: ' +
          JSON.stringify(m) +
          at,
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      await context.close();
    }
  }

  console.log(
    'PASS: giao diện tablet (768/820/1024/1180px, Thiền/Giang hồ, sáng/tối): mây không đè logo, biểu đồ rỗng không chồng chữ, nhãn vòng nằm trong lỗ, số đếm cạnh tiêu đề.',
  );
} finally {
  await h.close();
}
