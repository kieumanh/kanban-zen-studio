// v2.81.0 (Núi Mờ): dãy núi mực làm nền ở góc dưới phải (Giang hồ) không còn mép cắt thẳng cạnh thanh bên.
// Hình nền rộng min(64vw, 900px) nên ở tablet mép trái của hình rơi vào giữa trang; trước đây cả hai lớp núi đặc kín ngay cột pixel đầu.
// Kiểm: vẽ hình nền thật ra canvas, cột pixel ngoài cùng bên trái gần như trong suốt và đậm dần sang phải; sáng và tối;
// và ở 768 / 820 / 1440 px hình nằm đúng góc dưới phải, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const cfg =
  (theme) =>
  ({ context }) =>
    context.addInitScript((t) => {
      localStorage.setItem('zen-style', 'giangho');
      localStorage.setItem('zen-theme', t);
    }, theme);

const h = await startHarness();
try {
  for (const theme of ['light', 'dark']) {
    for (const w of [768, 820, 1440]) {
      const at = ` (${w}px, giangho, ${theme})`;
      const { context, page } = await h.open(w, { setup: cfg(theme) });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'habits');
      const r = await page.evaluate(async () => {
        const s = getComputedStyle(document.body);
        const url = s.backgroundImage.match(/url\("([^"]+)"\)/)?.[1];
        if (!url) return null;
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = 880;
        c.height = 320;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0, 880, 320);
        const alphaAt = (x) => {
          let max = 0;
          for (let y = 0; y < 320; y++)
            max = Math.max(max, g.getImageData(x, y, 1, 1).data[3]);
          return max;
        };
        return {
          edge: alphaAt(0),
          mid: alphaAt(150),
          far: alphaAt(440),
          pos: s.backgroundPosition,
          size: s.backgroundSize,
          overflow: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      assert.ok(r, 'có hình nền núi' + at);
      assert.ok(
        r.edge <= 3,
        'cột pixel ngoài cùng bên trái gần như trong suốt (alpha ' +
          r.edge +
          ')' +
          at,
      );
      assert.ok(
        r.mid > r.edge && r.far > r.mid,
        `núi đậm dần sang phải (${r.edge} < ${r.mid} < ${r.far})` + at,
      );
      assert.match(
        r.pos,
        /^100%\s+100%/,
        'hình nằm ở góc dưới phải: ' + r.pos + at,
      );
      assert.ok(r.overflow, 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log(
    'PASS: núi nền Giang hồ mờ dần ở mép trái, không còn đường cắt thẳng (768/820/1440px, sáng/tối).',
  );
} finally {
  await h.close();
}
