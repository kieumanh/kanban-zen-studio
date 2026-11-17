// Hồi quy v2.24.0 (Thập Nhị Phương): mười một Phương thần còn lại có nơi riêng trong Thần giới (Phương Thìn có biển mây từ v2.20.0).
//  1. Mười một nơi mới (heaven/ty, suu, dan, mao, tyj, ngo, mui, than, dau, tuat, hoi) dựng được ở mọi giờ, mỗi nơi một tên riêng mang tên phương.
//  2. Bốn trang đầu của mỗi chiến ký Phương thần diễn ra ở đúng nơi của vị ấy; trang "mở đường" cuối chương vẫn là đường núi có cổng.
//  3. Chân người đứng đúng mặt đất (y = 836) theo máy quay của từng khung, sai lệch ≤ 1,5% chiều cao tranh.
//  4. Dựng thật trên trang ở 390, 820, 1440 px: không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const PLACES = {
  'g:l1': ['ty', 'Tý'],
  'g:l2': ['suu', 'Sửu'],
  'g:l3': ['dan', 'Dần'],
  'g:l4': ['mao', 'Mão'],
  'g:l6': ['tyj', 'Tỵ'],
  'g:l7': ['ngo', 'Ngọ'],
  'g:l8': ['mui', 'Mùi'],
  'g:l9': ['than', 'Thân'],
  'g:l10': ['dau', 'Dậu'],
  'g:l11': ['tuat', 'Tuất'],
  'g:s34': ['hoi', 'Hợi'],
};

const h = await startHarness({});
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const { context, page } = await h.open(width, {
      touch,
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    const r = await page.evaluate((PLACES) => {
      const Z = window.zenScene;
      const out = { names: {}, bad: [], pages: {}, feet: [] };
      // 1. Mọi giờ.
      for (const [, [v]] of Object.entries(PLACES)) {
        for (const t of Object.keys(Z.PAL)) {
          try {
            const info = Z.build(
              Z.parse('heaven/' + v + ' ' + t + ' hero:stand@.5 "thử"', null),
            );
            if (!info) out.bad.push(v + ' ' + t + ': không dựng được');
          } catch (e) {
            out.bad.push(v + ' ' + t + ': ' + e.message);
          }
        }
        const host = document.createElement('div');
        host.style.cssText =
          'position:fixed;left:0;top:0;width:320px;height:200px';
        document.body.append(host);
        Z.mount(
          host,
          Z.parse('heaven/' + v + ' day hero:stand@.5 "thử"', null),
          { instant: true },
        );
        out.names[v] = (host.textContent || '').trim();
        Z.destroy(host);
        host.remove();
      }
      // 2-3. Các trang chiến ký.
      const layer = (tf) => {
        const m = tf.match(
          /translate3d\(([-\d.]+)px,\s*([-\d.]+)px,0\) scale\(([\d.]+)\)/,
        );
        return { ty: +m[2], s: +m[3] };
      };
      for (const [k, [v]] of Object.entries(PLACES)) {
        const lines = window.zenPlates.LINES[k];
        out.pages[k] = lines.map((_, i) => {
          const shot = Z.shotFor(k, i, null);
          return {
            s: shot.s,
            v: shot.v,
            gate: shot.p.some((p) => p.id === 'gate'),
          };
        });
        for (let i = 0; i < lines.length; i++) {
          const shot = Z.shotFor(k, i, null);
          if (shot.s !== 'heaven' || shot.v !== v) continue;
          const cam = Z.camFor(shot.c, Z.W, Z.H);
          const set = layer(cam.set),
            stage = layer(cam.stage);
          const ground = (set.ty + set.s * 836 - stage.ty) / stage.s / Z.H;
          // Người nhỏ đứng xa phía sau (tỉ lệ dưới 0,8, như bóng sư phụ trong hồi ức) cố ý đứng cao hơn mặt đất tiền cảnh.
          for (const q of shot.f)
            if (q.s >= 0.8) out.feet.push({ k, i, who: q.who, y: q.y, ground });
        }
      }
      return out;
    }, PLACES);
    const tag = ` (${width}px)`;
    assert.deepEqual(r.bad, [], 'mười một nơi mới dựng được ở mọi giờ' + tag);
    const names = Object.values(r.names);
    for (const [k, [v, ten]] of Object.entries(PLACES)) {
      assert.match(
        r.names[v],
        new RegExp('Phương ' + ten),
        `nơi ${v} mang tên Phương ${ten} (${r.names[v]})` + tag,
      );
      const pages = r.pages[k];
      assert.ok(pages.length >= 4, `${k} có ít nhất bốn trang`);
      for (let i = 0; i < 4; i++)
        assert.deepEqual(
          [pages[i].s, pages[i].v],
          ['heaven', v],
          `${k} trang ${i + 1} ở nơi riêng heaven/${v}` + tag,
        );
      if (k !== 'g:s34')
        assert.ok(
          pages[4] && pages[4].gate && pages[4].s === 'peaks',
          `${k} trang cuối là đường núi có cổng` + tag,
        );
    }
    assert.equal(
      new Set(names).size,
      names.length,
      'mỗi nơi một tên riêng' + tag,
    );
    assert.ok(r.feet.length >= 70, `đo đủ người đứng (${r.feet.length})`);
    for (const p of r.feet)
      assert.ok(
        Math.abs(p.y - p.ground) <= 0.015,
        `${p.k} trang ${p.i + 1}: ${p.who} đứng đúng mặt đất (${p.y} so với ${p.ground.toFixed(3)})` +
          tag,
      );
    assert.deepEqual(errors, [], 'không lỗi trang' + tag);
    await context.close();
  }
  console.log('growth-phuong-browser: ok');
} finally {
  await h.close();
}
