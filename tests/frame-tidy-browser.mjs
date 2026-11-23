// v2.77.0 (Khung Gọn): hai khung bị đánh dấu trong ảnh người dùng.
//  1. Hàng tiêu đề hộp chi tiết ("Chi tiết công việc" / "Chi tiết nhiệm vụ" ở Giang hồ): chữ không bị cắt hay bị nút Ghim / Liên hoàn
//     lệnh / Bế quan đè lên. Ba nút cùng kiểu viên tròn, cùng chiều cao; ≤600px chỉ còn icon (vẫn có tên đọc). Khi chữ rất lớn thì
//     cụm nút rơi xuống dòng dưới chứ không đè chữ.
//  2. Thẻ cấp bậc ở thanh bên (Giang hồ): huy hiệu cấp nằm ở góc trên phải, thanh tiến cấp có chỗ riêng dưới thẻ (không dính huy hiệu
//     hay chữ); danh xưng và "57% tới cấp 10" mỗi thứ một dòng, "tới cấp 10" không bị bẻ giữa chừng.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px, Thiền và Giang hồ, sáng và tối.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const day = (n) =>
  new Date(Date.parse(NOW) + n * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
// 13 điểm = 6,5 điểm: cấp 9, 57% tới cấp 10 (khớp ảnh người dùng).
const growth = {
  v: 1,
  hero: 'nu',
  name: 'Lam Y',
  since: day(-40),
  log: [
    {
      id: 'e1',
      d: day(-1),
      s: 'task',
      k: 'task:e1',
      n: 'Việc cũ',
      p: [13, 0, 0, 0, 0, 0, 0, 0],
    },
  ],
};
const seed = () => {
  const p = makeProject('p1', 'Farm Gửi Yêu Thương Vào Đất', '#7950c8', 3);
  p.tasks[0].title = 'Xây dựng trang Công việc cụ thể của farm';
  p.tasks[0].col = 'Doing';
  return { schema: 1, projects: [p], notes: [], growth };
};
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

// Hàng tiêu đề: đo chữ (Range của nút văn bản) và từng nút.
const headerGeo = (page) =>
  page.evaluate(() => {
    const row = document.querySelector('#editor-body .wf-task-heading-row');
    const node = [...row.childNodes].find(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    const range = document.createRange();
    range.selectNodeContents(node);
    const t = range.getBoundingClientRect(),
      rb = row.getBoundingClientRect();
    const a = row
      .querySelector('.wf-task-heading-actions')
      .getBoundingClientRect();
    const btns = [...row.querySelectorAll('.wf-task-heading-actions .btn')].map(
      (b) => {
        const r = b.getBoundingClientRect(),
          cs = getComputedStyle(b);
        return {
          cls: b.className,
          w: Math.round(r.width),
          h: Math.round(r.height),
          radius: parseFloat(cs.borderTopLeftRadius),
          name: b.getAttribute('aria-label') || b.textContent.trim(),
          label: [...b.querySelectorAll('span')].some(
            (s) => s.offsetWidth > 0 && s.textContent.trim(),
          ),
        };
      },
    );
    return {
      text: node.textContent.trim(),
      textW: t.width,
      textL: t.left,
      textR: t.right,
      textB: t.bottom,
      natural: (() => {
        const s = document.createElement('span');
        s.style.cssText =
          'position:absolute;visibility:hidden;white-space:nowrap;font:inherit';
        s.textContent = node.textContent.trim();
        row.appendChild(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      })(),
      rowL: rb.left,
      rowR: rb.right,
      rowSW: row.scrollWidth,
      rowCW: row.clientWidth,
      aL: a.left,
      aR: a.right,
      aT: a.top,
      btns,
    };
  });

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const style of ['zen', 'giangho']) {
      for (const theme of ['light', 'dark']) {
        const at = ` (${width}px, ${style === 'zen' ? 'Thiền' : 'Giang hồ'}, ${theme === 'dark' ? 'tối' : 'sáng'})`;
        const { context, page } = await h.open(width, {
          touch,
          now: NOW,
          workspace: seed(),
          setup: cfg(style, theme),
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await h.show(page, 'projects', 'p1');

        // 2. Thẻ cấp bậc (chỉ Giang hồ).
        if (style === 'giangho') {
          if (width < 900)
            await page.evaluate(() =>
              document.querySelector('.sidebar')?.classList.add('open'),
            );
          await page.waitForSelector('.sidebar .gh-rank.has-emblem');
          await page.waitForTimeout(250);
          const g = await page.evaluate(() => {
            const r = document.querySelector('.sidebar .gh-rank'),
              box = (e) => {
                const b = e.getBoundingClientRect();
                return {
                  l: b.left,
                  r: b.right,
                  t: b.top,
                  b: b.bottom,
                  w: b.width,
                  h: b.height,
                };
              };
            const card = box(r),
              seal = box(r.querySelector('.gh-rank-seal')),
              badge = box(r.querySelector('b')),
              text = box(r.querySelector('.gh-rank-text'));
            const after = getComputedStyle(r, '::after'),
              bar = {
                t: card.b - parseFloat(after.bottom) - parseFloat(after.height),
                h: parseFloat(after.height),
                l: card.l + parseFloat(after.left),
                r: card.r - parseFloat(after.right),
              };
            const next = r.querySelector('.gh-rank-next'),
              title = r.querySelector('.gh-rank-title'),
              side = document.querySelector('.sidebar').getBoundingClientRect();
            const lh = (e) => parseFloat(getComputedStyle(e).lineHeight);
            return {
              card,
              seal,
              badge,
              text,
              bar,
              side: { r: side.right },
              sub: r.querySelector('small').textContent,
              nextTxt: next && next.textContent,
              nextLines:
                next &&
                Math.round(next.getBoundingClientRect().height / lh(next)),
              titleTxt: title && title.textContent,
              blocks:
                next &&
                title &&
                getComputedStyle(next).display === 'block' &&
                getComputedStyle(title).display === 'block',
              nextBelowTitle:
                next &&
                title &&
                next.getBoundingClientRect().top >=
                  title.getBoundingClientRect().bottom - 1,
              level: r.querySelector('b').textContent,
              sepHidden:
                getComputedStyle(r.querySelector('.gh-rank-sep')).display ===
                'none',
            };
          });
          assert.equal(g.level, '9', 'cấp hiện tại' + at);
          assert.equal(
            g.sub,
            'Khí Hải Sơ Thành · 57% tới cấp 10',
            'chữ đọc giữ nguyên (có dấu ·)' + at,
          );
          assert.equal(g.titleTxt, 'Khí Hải Sơ Thành', 'dòng danh xưng' + at);
          assert.equal(g.nextTxt, '57% tới cấp 10', 'dòng tiến cảnh' + at);
          assert.ok(
            g.blocks && g.nextBelowTitle && g.sepHidden,
            'danh xưng và tiến cảnh mỗi thứ một dòng, dấu · ẩn' + at,
          );
          assert.equal(
            g.nextLines,
            1,
            '"57% tới cấp 10" không bị bẻ dòng' + at,
          );
          // Thanh tiến cấp có chỗ riêng: dưới ấn, huy hiệu và chữ ít nhất 6px, nằm gọn trong thẻ.
          const gap = g.bar.t - Math.max(g.seal.b, g.badge.b, g.text.b);
          assert.ok(
            gap >= 6,
            `thanh tiến cấp cách ấn/chữ ≥ 6px (đang ${gap.toFixed(1)}px)` + at,
          );
          assert.ok(
            g.bar.l >= g.card.l &&
              g.bar.r <= g.card.r &&
              g.bar.t + g.bar.h <= g.card.b,
            'thanh tiến cấp nằm gọn trong thẻ' + at,
          );
          assert.ok(
            g.badge.t >= g.card.t + 2 && g.badge.r <= g.text.l + 1,
            'huy hiệu cấp nằm trong thẻ, không đè chữ' + at,
          );
          assert.ok(
            g.seal.l >= g.card.l + 6 && g.text.r <= g.card.r - 6,
            'ấn và chữ cách mép thẻ ≥ 6px' + at,
          );
          assert.ok(g.card.r <= g.side.r, 'thẻ không tràn thanh bên' + at);
          await page.evaluate(() =>
            document.querySelector('.sidebar')?.classList.remove('open'),
          );
        }

        // 1. Hàng tiêu đề hộp chi tiết.
        await page.evaluate(() =>
          taskDetail(project('p1'), project('p1').tasks[0]),
        );
        await page.waitForSelector(
          '#editor[open] #editor-body .task-pin-shortcut',
          { state: 'attached' },
        );
        await page.waitForTimeout(300);
        const hd = await headerGeo(page);
        assert.equal(
          hd.text,
          style === 'giangho' ? 'Chi tiết nhiệm vụ' : 'Chi tiết công việc',
          'tiêu đề' + at,
        );
        assert.ok(
          hd.textW >= hd.natural - 1,
          `chữ tiêu đề không bị co/cắt (${hd.textW.toFixed(0)} / ${hd.natural.toFixed(0)}px)` +
            at,
        );
        assert.ok(
          hd.textR <= hd.aL - 4 || hd.aT >= hd.textB - 2,
          'cụm nút không đè lên chữ tiêu đề' + at,
        );
        assert.ok(
          hd.rowSW <= hd.rowCW &&
            hd.aR <= hd.rowR + 1 &&
            hd.textL >= hd.rowL - 1,
          'hàng tiêu đề không tràn' + at,
        );
        assert.equal(
          hd.btns.length,
          3,
          'ba nút: Ghim, Liên hoàn lệnh, Bế quan / Chế độ tập trung' + at,
        );
        for (const b of hd.btns) {
          assert.equal(
            b.h,
            hd.btns[0].h,
            'ba nút cùng chiều cao: ' + b.cls + at,
          );
          assert.ok(b.h >= 40, 'nút cao ≥ 40px (chạm 44px): ' + b.cls + at);
          assert.ok(b.radius >= b.h / 2 - 1, 'nút viên tròn: ' + b.cls + at);
          assert.ok(b.name, 'nút có tên đọc: ' + b.cls + at);
          if (width <= 600)
            assert.ok(
              !b.label && b.w <= 44,
              'điện thoại: chỉ icon: ' + b.cls + at,
            );
        }
        // Chữ rất lớn (phóng chữ): cụm nút rơi xuống dòng dưới, không đè.
        if (width === 390) {
          await page.evaluate(() =>
            document
              .querySelector('#editor-body .wf-task-heading-row')
              .style.setProperty('font-size', '28px', 'important'),
          );
          const big = await headerGeo(page);
          assert.ok(
            big.textW >= big.natural - 1,
            'chữ rất lớn vẫn nguyên vẹn' + at,
          );
          assert.ok(
            big.textR <= big.aL - 4 || big.aT >= big.textB - 2,
            'chữ rất lớn: nút rơi xuống dòng dưới, không đè' + at,
          );
          assert.ok(
            big.rowSW <= big.rowCW && big.aR <= big.rowR + 1,
            'chữ rất lớn: hàng không tràn' + at,
          );
        }
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          'không tràn ngang trang' + at,
        );
        assert.deepEqual(errors, [], 'không lỗi trang' + at);
        await context.close();
      }
    }
  }
  console.log(
    'PASS: khung chi tiết nhiệm vụ và thẻ cấp bậc (390/820/1440px, Thiền/Giang hồ, sáng/tối): không đè chữ, không tràn.',
  );
} finally {
  await h.close();
}
