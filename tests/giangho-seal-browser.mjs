// v2.58.0 (Ấn Triện): con dấu “Công thành” ở Giang hồ là ấn triện kiếm hiệp vẽ bằng SVG (dist/giangho-fx.js sealSvg): khối son sứt mẻ, chữ Công / thành
// và khung khắc lõm bằng mặt nạ (nền thấu qua nên sáng hay tối đều đẹp), vết mực mòn, đường gươm giữa hai hàng chữ, góc vân. Kiểm ở 390 / 820 / 1440 px,
// sáng và tối: cấu trúc SVG (mặt nạ có mã riêng cho từng con dấu, chữ nằm trong mặt nạ, không style nội tuyến, ẩn khỏi trình đọc màn hình), màu son theo giao diện,
// con dấu nằm gọn trong thẻ lời chúc và trong thẻ việc, không tràn ngang; sóng ấn chỉ chạy khi cho phép chuyển động.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const seed = () => ({
  schema: 1,
  notes: [],
  projects: [makeProject('p1', 'Alpha', '#7950c8', 8)],
});
const setup =
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
const dismiss = (page) =>
  page.evaluate(() =>
    typeof dismissCompletion === 'function' ? dismissCompletion() : null,
  );

const h = await startHarness({ seed });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { context, page } = await h.open(width, {
        touch,
        now: NOW,
        setup: setup(theme),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      const id = await finish(page);
      await page.waitForSelector(
        '.completion-overlay.gh-sealed .gh-overlay-seal',
      );
      await page.waitForSelector(
        '.task-card[data-task="' + id + '"] .gh-stamp',
      );
      await page.waitForTimeout(900); // sau khi dấu đóng xong
      const info = await page.evaluate(() => {
        const seals = [
          ...document.querySelectorAll('.gh-overlay-seal, .gh-stamp'),
        ];
        return seals.map((el) => {
          const svg = el.querySelector('svg.gh-seal-svg'),
            mask = svg?.querySelector('mask'),
            body = svg?.querySelector('.gh-seal-body');
          const r = el.getBoundingClientRect(),
            host = el
              .closest('.completion-card, .task-card')
              .getBoundingClientRect();
          return {
            cls: el.className.split(' ')[0],
            svgs: el.querySelectorAll('svg').length,
            hidden:
              el.getAttribute('aria-hidden') === 'true' ||
              svg?.getAttribute('aria-hidden') === 'true',
            maskId: mask?.id,
            bodyMask: body?.getAttribute('mask'),
            texts: [...(mask?.querySelectorAll('text') || [])].map(
              (t) => t.textContent,
            ),
            fill: body && getComputedStyle(body).fill,
            font:
              mask && getComputedStyle(mask.querySelector('text')).fontFamily,
            serif: getComputedStyle(document.documentElement)
              .getPropertyValue('--gh-serif')
              .trim(),
            upper:
              mask &&
              getComputedStyle(mask.querySelector('text')).textTransform,
            inlineStyle: svg?.querySelectorAll('[style]').length,
            external: svg?.querySelectorAll('image, use, foreignObject, script')
              .length,
            size: [Math.round(r.width), Math.round(r.height)],
            inside:
              r.left >= host.left - 12 &&
              r.right <= host.right + 12 &&
              r.top >= host.top - 12 &&
              r.bottom <= host.bottom + 12,
            ring: getComputedStyle(el, '::after').animationName,
            raw: el.textContent,
          };
        });
      });
      assert.equal(
        info.length,
        2,
        'một ấn trên lời chúc, một ấn trên thẻ việc' + at,
      );
      assert.notEqual(
        info[0].maskId,
        info[1].maskId,
        'mỗi con dấu một mã mặt nạ riêng' + at,
      );
      for (const s of info) {
        assert.equal(s.svgs, 1, s.cls + ': đúng một SVG' + at);
        assert.ok(s.hidden, s.cls + ': ẩn khỏi trình đọc màn hình' + at);
        assert.equal(
          s.bodyMask,
          'url(#' + s.maskId + ')',
          s.cls + ': khối son dùng đúng mặt nạ của mình' + at,
        );
        assert.deepEqual(
          s.texts,
          ['Công', 'thành'],
          s.cls + ': hai hàng chữ khắc lõm' + at,
        );
        assert.equal(
          s.raw,
          'Côngthành',
          s.cls + ': chữ chỉ nằm trong mặt nạ' + at,
        );
        assert.equal(s.upper, 'uppercase', s.cls + ': viết hoa bằng CSS' + at);
        const norm = (v) => v.replace(/["']/g, '').replace(/\s+/g, '');
        assert.equal(
          norm(s.font),
          norm(s.serif),
          s.cls + ': chữ dùng phông serif của Giang hồ' + at,
        );
        assert.equal(
          s.fill,
          theme === 'dark' ? 'rgb(201, 74, 94)' : 'rgb(184, 52, 74)',
          s.cls + ': màu son theo giao diện' + at,
        );
        assert.equal(
          s.inlineStyle,
          0,
          s.cls + ': không style nội tuyến trong SVG' + at,
        );
        assert.equal(s.external, 0, s.cls + ': không tài nguyên ngoài' + at);
        assert.ok(
          s.size[0] >= 60 &&
            s.size[0] <= 96 &&
            Math.abs(s.size[0] - s.size[1]) <= 2,
          s.cls + ' vuông, cỡ ' + s.size + at,
        );
        assert.ok(s.inside, s.cls + ' nằm gọn trong thẻ chứa' + at);
        assert.equal(
          s.ring,
          'gh-stamp-ring',
          s.cls + ': sóng ấn chạy khi cho phép chuyển động' + at,
        );
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'không tràn ngang' + at,
      );
      // Mặt nạ thật sự khoét: chữ nằm trong khung nhìn 100×100 và không rỗng.
      const boxes = await page.evaluate(() =>
        [...document.querySelectorAll('.gh-overlay-seal mask text')].map(
          (t) => {
            const b = t.getBBox();
            return [b.x, b.y, b.width, b.height].map(Math.round);
          },
        ),
      );
      for (const [x, y, w, hh] of boxes)
        assert.ok(
          x >= 8 && y >= 8 && x + w <= 92 && y + hh <= 92 && w > 40 && hh > 10,
          'chữ khắc nằm trong khung ấn ' + [x, y, w, hh] + at,
        );
      await dismiss(page);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      // Giảm chuyển động: không sóng ấn, ấn đứng yên.
      if (theme === 'light') {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const id2 = await finish(page);
        await page.waitForSelector(
          '.task-card[data-task="' + id2 + '"] .gh-stamp',
        );
        const still = await page.evaluate(() =>
          [...document.querySelectorAll('.gh-overlay-seal, .gh-stamp')].map(
            (el) => [
              getComputedStyle(el).animationName,
              getComputedStyle(el, '::after').animationName,
            ],
          ),
        );
        assert.ok(
          still.length >= 1 &&
            still.every((x) => x[0] === 'none' && x[1] === 'none'),
          'giảm chuyển động: ấn đứng yên, không sóng' + at,
        );
      }
      await context.close();
    }
  }
} finally {
  await h.close();
}
console.log('giangho seal browser ok');
