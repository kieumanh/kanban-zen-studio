// Hồi quy v2.26.0 (Thiên Cang Chân Dung): ba mươi sáu Thiên Cang mỗi vị một dáng riêng như Phương thần; Phương Thìn có nơi riêng.
//  1. Mỗi sao có nhân vật riêng trong bộ vai (godc01 … godc32, hinh, godhoi, godc35, godc36) mang đúng tên sao, vẫn mờ chân như hồn.
//  2. Phân biệt được từng vị: không hai vị nào trùng màu áo (khác nhau rõ rệt, kể cả với mười hai Phương thần) và mỗi vị khác mọi vị
//     còn lại ở ít nhất một nét dáng (kiểu đầu, vật cầm, vóc người, nét riêng như áo choàng, vầng sáng, áo hai sắc).
//  3. Chiến ký của mỗi vị (g:s1 … g:s35) vẽ đúng vị ấy ở mọi trang có mặt thần, không còn dùng dáng thần chung; tên sao có trong lời kể;
//     cảnh các vị đứng xem (đầu và cuối g:s35) cũng là các vị riêng.
//  4. Phương Thìn có nơi riêng heaven/thin mang tên "Phương Thìn", dựng được ở mọi giờ; bốn trang đầu g:l5 diễn ra ở đó, trang cuối
//     vẫn là cổng Thần giới (heaven/gate); chân người đứng đúng mặt đất (y = 836) theo máy quay của từng khung.
//  5. Mọi tư thế vẽ được với từng vị, không lỗi trang ở 390, 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const GENERIC = ['god', 'godb', 'godg', 'godj', 'godr'];
const starId = (n) =>
  ({ 33: 'hinh', 34: 'godhoi' })[n] || 'godc' + String(n).padStart(2, '0');
const LORD_IDS = [
  'godty',
  'godsuu',
  'goddan',
  'godmao',
  'godthin',
  'godtyj',
  'godngo',
  'godmui',
  'godthan',
  'goddau',
  'godtuat',
];
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

const h = await startHarness({});
try {
  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    const tag = ` (${width}px)`;
    const { context, page } = await h.open(width, {
      touch,
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    const r = await page.evaluate(
      ([GENERIC, LORD_IDS]) => {
        const Z = window.zenScene;
        const starId = (n) =>
          ({ 33: 'hinh', 34: 'godhoi' })[n] ||
          'godc' + String(n).padStart(2, '0');
        const stars = window.zenGods.STARS.map((s) => s.name);
        const out = {
          stars,
          looks: {},
          pages: {},
          draw: [],
          bad: [],
          feet: [],
        };
        const ids = [...LORD_IDS, ...stars.map((_, i) => starId(i + 1))];
        for (const id of ids)
          out.looks[id] = Z.CAST.has(id) ? { ...Z.CAST.LOOK[id] } : null;
        // Trang chiến ký của từng sao.
        for (let n = 1; n <= 35; n++) {
          const k = 'g:s' + n;
          out.pages[k] = window.zenPlates.LINES[k].map((line, i) => {
            const shot = Z.shotFor(k, i, null);
            try {
              if (!Z.build(shot))
                out.draw.push(k + '.' + i + ': không dựng được');
            } catch (e) {
              out.draw.push(k + '.' + i + ': ' + e.message);
            }
            return { who: shot.f.map((q) => q.who), text: line };
          });
        }
        // Mọi tư thế của từng vị.
        for (const id of new Set(ids))
          for (const pose of Object.keys(Z.CAST.POSE))
            try {
              Z.build(
                Z.parse(
                  'heaven/hall holy ' + id + ':' + pose + '@.5,.9 "thử"',
                  null,
                ),
              );
            } catch (e) {
              out.draw.push(id + ':' + pose + ' ' + e.message);
            }
        // Nơi riêng của Phương Thìn ở mọi giờ.
        for (const t of Object.keys(Z.PAL)) {
          try {
            if (
              !Z.build(
                Z.parse('heaven/thin ' + t + ' hero:stand@.5 "thử"', null),
              )
            )
              out.bad.push('thin ' + t + ': không dựng được');
          } catch (e) {
            out.bad.push('thin ' + t + ': ' + e.message);
          }
        }
        const host = document.createElement('div');
        host.style.cssText =
          'position:fixed;left:0;top:0;width:320px;height:200px';
        document.body.append(host);
        Z.mount(host, Z.parse('heaven/thin day hero:stand@.5 "thử"', null), {
          instant: true,
        });
        out.placeName = (host.textContent || '').trim();
        Z.destroy(host);
        host.remove();
        // g:l5: nơi của từng trang và chân người.
        const layer = (tf) => {
          const m = tf.match(
            /translate3d\(([-\d.]+)px,\s*([-\d.]+)px,0\) scale\(([\d.]+)\)/,
          );
          return { ty: +m[2], s: +m[3] };
        };
        const lines = window.zenPlates.LINES['g:l5'];
        out.l5 = lines.map((_, i) => {
          const shot = Z.shotFor('g:l5', i, null);
          return {
            s: shot.s,
            v: shot.v,
          };
        });
        for (let i = 0; i < lines.length; i++) {
          const shot = Z.shotFor('g:l5', i, null);
          if (shot.s !== 'heaven' || shot.v !== 'thin') continue;
          const cam = Z.camFor(shot.c, Z.W, Z.H);
          const set = layer(cam.set),
            stage = layer(cam.stage);
          const ground = (set.ty + set.s * 836 - stage.ty) / stage.s / Z.H;
          for (const q of shot.f)
            if (q.s >= 0.8) out.feet.push({ i, who: q.who, y: q.y, ground });
        }
        return out;
      },
      [GENERIC, LORD_IDS],
    );
    // 1.
    const ids = r.stars.map((_, i) => starId(i + 1));
    assert.equal(ids.length, 36, 'ba mươi sáu Thiên Cang' + tag);
    r.stars.forEach((name, i) => {
      const id = ids[i];
      const L = r.looks[id];
      assert.ok(L, `sao ${i + 1} (${name}) có nhân vật ${id}` + tag);
      assert.equal(L.name, name, `${id} mang tên sao ${name}` + tag);
      assert.ok(L.ghost, `${name} mờ chân như hồn` + tag);
    });
    // 2.
    const all = [...new Set([...LORD_IDS, ...ids])];
    assert.equal(
      all.length,
      47,
      'mười hai Phương thần và ba mươi sáu sao, Phong Đăng chung một vị' + tag,
    );
    const shape = (L) =>
      [
        L.kind,
        L.hold || '-',
        L.s || 1,
        L.hold2 || '-',
        L.stoop || 0,
        ...[
          'halo',
          'moon',
          'cape',
          'split',
          'ripple',
          'swirl',
          'glow',
          'train',
          'ears',
          'goggles',
          'dipper',
        ].map((k) => (L[k] ? 1 : 0)),
      ].join('|');
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = r.looks[all[i]],
          b = r.looks[all[j]];
        assert.ok(
          dist(a.robe, b.robe) >= 40,
          `${a.name} và ${b.name} khác màu áo rõ rệt (${a.robe} / ${b.robe})` +
            tag,
        );
        assert.notEqual(
          shape(a),
          shape(b),
          `${a.name} và ${b.name} khác nhau ở ít nhất một nét dáng` + tag,
        );
      }
    // 3.
    for (let n = 1; n <= 35; n++) {
      const k = 'g:s' + n,
        id = ids[n - 1],
        name = r.stars[n - 1];
      const pages = r.pages[k];
      assert.ok(
        pages.filter((p) => p.who.includes(id)).length >= 3,
        `${k}: ${name} có mặt ở ít nhất ba trang` + tag,
      );
      for (const p of pages)
        assert.deepEqual(
          p.who.filter((w) => GENERIC.includes(w)),
          [],
          `${k}: không còn dáng thần chung ở trang "${p.text.slice(0, 40)}…"` +
            tag,
        );
      assert.ok(
        pages.some((p) => p.text.includes(name)),
        `${k}: lời kể nhắc tên ${name}` + tag,
      );
    }
    const s35 = r.pages['g:s35'];
    assert.deepEqual(
      s35[0].who.filter((w) => w !== 'hero' && w !== 'godc35').sort(),
      ['godc07', 'godc30'],
      'trang đầu g:s35: hai vị khác đứng xem là hai Thiên Cang riêng' + tag,
    );
    assert.deepEqual(
      s35[4].who.filter((w) => w !== 'hero').sort(),
      ['godc01', 'godc12', 'godc32', 'hinh'],
      'trang cuối g:s35: bốn Thiên Cang đứng xem' + tag,
    );
    // 4.
    assert.deepEqual(r.bad, [], 'Mương mây dựng được ở mọi giờ' + tag);
    assert.match(
      r.placeName,
      /Phương Thìn/,
      `nơi mang tên Phương Thìn (${r.placeName})` + tag,
    );
    for (let i = 0; i < 4; i++)
      assert.deepEqual(
        [r.l5[i].s, r.l5[i].v],
        ['heaven', 'thin'],
        `g:l5 trang ${i + 1} ở heaven/thin` + tag,
      );
    assert.deepEqual(
      [r.l5[4].s, r.l5[4].v],
      ['heaven', 'gate'],
      'g:l5 trang cuối vẫn là cổng Thần giới' + tag,
    );
    assert.ok(r.feet.length >= 6, `đo đủ người đứng (${r.feet.length})` + tag);
    for (const p of r.feet)
      assert.ok(
        Math.abs(p.y - p.ground) <= 0.015,
        `g:l5 trang ${p.i + 1}: ${p.who} đứng đúng mặt đất (${p.y} so với ${p.ground.toFixed(3)})` +
          tag,
      );
    // 5.
    assert.deepEqual(r.draw, [], 'mọi trang và tư thế vẽ được' + tag);
    assert.deepEqual(errors, [], 'không lỗi trang' + tag);
    await context.close();
  }
  console.log('growth-thiencang-browser: ok');
} finally {
  await h.close();
}
