// v2.78.0 (Ấn Tròn): dấu “Công thành” (Giang hồ) đổi từ ấn vuông sang ấn tròn: khối son tròn sứt mẻ, viền kép lõm, vòng hạt châu có bốn thoi,
// đường gươm giữa hai hàng chữ. Cả dấu trong lời chúc (.gh-overlay-seal) lẫn dấu đóng lên thẻ (.gh-stamp) đều tròn, sóng ấn loang tròn.
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px, sáng và tối: thân ấn tròn (mọi đỉnh cách tâm 42–49/100), vuông vức, nằm gọn trong thẻ lời chúc và
// không đè chữ, màu son đúng theo nền, chữ vẫn là “Công” “thành”, giảm chuyển động thì đứng yên, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const seed = () => ({
  schema: 1,
  notes: [],
  projects: [makeProject('p1', 'Alpha', '#7950c8', 8)],
});
const cfg =
  (theme) =>
  ({ context }) =>
    context.addInitScript((t) => {
      localStorage.setItem('zen-style', 'giangho');
      localStorage.setItem('zen-theme', t);
    }, theme);
const finish = (page) =>
  page.evaluate(() => {
    const p = project('p1'),
      t = p.tasks.find((x) => x.col !== 'Done' && !x.archived);
    moveTask(p, t, 'Done');
    return t.id;
  });
const clear = (page) =>
  page.evaluate(() =>
    typeof dismissCompletion === 'function' ? dismissCompletion() : null,
  );
// Hình học của ấn: bán kính (theo hệ 100×100 của SVG) của mọi đỉnh thân ấn, số hạt châu và thoi, hai vòng viền.
const sealShape = (page, sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel),
      svg = el.querySelector('svg'),
      body = svg.querySelector('.gh-seal-body');
    const pts = [
      ...body.getAttribute('d').matchAll(/[ML]([\d.]+),([\d.]+)/g),
    ].map((m) => Math.hypot(m[1] - 50, m[2] - 50));
    const mask = svg.querySelector('mask'),
      r = el.getBoundingClientRect();
    return {
      viewBox: svg.getAttribute('viewBox'),
      n: pts.length,
      rMin: Math.min(...pts),
      rMax: Math.max(...pts),
      rings: [...mask.querySelectorAll('circle[fill="none"]')]
        .map((c) => +c.getAttribute('r'))
        .sort((a, b) => b - a),
      beads: mask.querySelectorAll('g[fill="#000"] > circle[r="1.05"]').length,
      diamonds: (
        mask
          .querySelector('path[d^="M50.0,9"]')
          ?.getAttribute('d')
          .match(/Z/g) || []
      ).length,
      sword: !!mask.querySelector('path[d^="M25,50.6"]'),
      text: el.textContent,
      fill: getComputedStyle(body).fill,
      w: Math.round(r.width),
      h: Math.round(r.height),
      afterRadius: getComputedStyle(el, '::after').borderTopLeftRadius,
      hidden: el.getAttribute('aria-hidden'),
    };
  }, sel);
const expectShape = (s, at, label) => {
  assert.equal(s.viewBox, '0 0 100 100', label + ': khung vẽ vuông' + at);
  assert.ok(
    s.n >= 90,
    label + ': thân ấn đủ đỉnh để tròn mượt (' + s.n + ')' + at,
  );
  assert.ok(
    s.rMin >= 42 && s.rMax <= 49.5,
    `${label}: thân ấn tròn, mọi đỉnh cách tâm 42–49 (đang ${s.rMin.toFixed(1)}–${s.rMax.toFixed(1)})` +
      at,
  );
  assert.deepEqual(
    s.rings,
    [42.4, 34.4],
    label + ': hai vòng viền khắc lõm' + at,
  );
  assert.ok(
    s.beads >= 20 && s.diamonds === 4,
    `${label}: vòng hạt châu ${s.beads} hạt và 4 thoi (${s.diamonds})` + at,
  );
  assert.ok(s.sword, label + ': có đường gươm giữa hai hàng chữ' + at);
  assert.equal(s.text, 'Côngthành', label + ': chữ vẫn là “Công” “thành”' + at);
  assert.equal(s.w, s.h, label + ': ấn vuông vức (khung chứa hình tròn)' + at);
  assert.equal(s.afterRadius, '50%', label + ': sóng ấn loang tròn' + at);
  assert.equal(
    s.hidden,
    'true',
    label + ': trang trí, ẩn khỏi trình đọc màn hình' + at,
  );
};

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ` (${width}px, ${theme === 'dark' ? 'tối' : 'sáng'})`;
      const { context, page } = await h.open(width, {
        touch,
        now: NOW,
        setup: cfg(theme),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      const id = await finish(page);

      // Dấu trong lời chúc.
      await page.waitForSelector(
        '.completion-overlay.gh-sealed .gh-overlay-seal',
      );
      await page.waitForTimeout(900);
      const o = await sealShape(page, '.gh-overlay-seal');
      expectShape(o, at, 'lời chúc');
      assert.equal(
        o.fill,
        theme === 'dark' ? 'rgb(201, 74, 94)' : 'rgb(184, 52, 74)',
        'khối ấn màu son theo nền' + at,
      );
      assert.ok(
        o.w >= 72 && o.w <= 96,
        'ấn trong lời chúc cỡ 72–96px (đang ' + o.w + ')' + at,
      );
      const fit = await page.evaluate(() => {
        const seal = document
            .querySelector('.gh-overlay-seal')
            .getBoundingClientRect(),
          card = document
            .querySelector('.completion-overlay .completion-card')
            .getBoundingClientRect();
        const text = [
          ...document.querySelectorAll(
            '.completion-overlay .completion-card > :not(.gh-overlay-seal):not(button)',
          ),
        ]
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => e.getBoundingClientRect());
        return {
          inside:
            seal.left >= card.left - 2 &&
            seal.right <= card.right + 2 &&
            seal.top >= card.top - 12 &&
            seal.bottom <= card.bottom + 12 &&
            seal.bottom <= innerHeight &&
            seal.right <= innerWidth,
          clear: text.every(
            (t) =>
              t.left >= seal.right - 6 ||
              t.right <= seal.left + 6 ||
              t.top >= seal.bottom - 2 ||
              t.bottom <= seal.top + 2,
          ),
        };
      });
      assert.ok(
        fit.inside,
        'ấn nằm gọn trong thẻ lời chúc và trong màn hình' + at,
      );
      assert.ok(fit.clear, 'ấn không đè lên chữ lời chúc' + at);
      await clear(page);

      // Dấu đóng lên thẻ vừa xong.
      await page.waitForSelector(
        '.task-card[data-task="' + id + '"] .gh-stamp',
      );
      await page.waitForTimeout(800);
      const s = await sealShape(
        page,
        '.task-card[data-task="' + id + '"] .gh-stamp',
      );
      expectShape(s, at, 'dấu trên thẻ');
      assert.ok(
        s.w >= 56 && s.w <= 80,
        'dấu trên thẻ cỡ 56–80px (đang ' + s.w + ')' + at,
      );
      const inCard = await page.evaluate((id) => {
        const st = document
            .querySelector('.task-card[data-task="' + id + '"] .gh-stamp')
            .getBoundingClientRect(),
          c = document
            .querySelector('.task-card[data-task="' + id + '"]')
            .getBoundingClientRect();
        return (
          st.right <= c.right + 6 && st.top >= c.top - 6 && st.left >= c.left
        );
      }, id);
      assert.ok(inCard, 'dấu nằm trong thẻ' + at);
      await page.waitForFunction(
        () => !document.querySelector('.gh-stamp'),
        null,
        { timeout: 8000 },
      );

      // Giảm chuyển động: đứng yên.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const id2 = await finish(page);
      await page.waitForSelector(
        '.task-card[data-task="' + id2 + '"] .gh-stamp',
      );
      const still = await page.evaluate((id) => {
        const st = document.querySelector(
          '.task-card[data-task="' + id + '"] .gh-stamp',
        );
        return [
          getComputedStyle(st).animationName,
          getComputedStyle(st, '::after').animationName,
          getComputedStyle(document.querySelector('.gh-overlay-seal'))
            .animationName,
        ];
      }, id2);
      assert.deepEqual(
        still,
        ['none', 'none', 'none'],
        'giảm chuyển động: ấn và sóng ấn đứng yên' + at,
      );
      await clear(page);

      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'không tràn ngang' + at,
      );
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log(
    'PASS: ấn Công thành hình tròn (lời chúc và dấu trên thẻ; 390/820/1440px, sáng/tối).',
  );
} finally {
  await h.close();
}
