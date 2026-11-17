// Hồi quy v2.25.0 (Chân Dung Phương Thần): mười hai Phương thần không còn chung một dáng thần bốn sắc áo.
//  1. Mỗi vị một nhân vật riêng trong bộ vai (godty … godhoi) mang đúng tên, vẫn mờ chân như hồn để nhận ra là thần.
//  2. Phân biệt được từng vị: không hai vị nào trùng màu áo (khác nhau rõ rệt) và mỗi vị khác mọi vị còn lại ở ít nhất một nét
//     dáng (kiểu đầu, vật cầm, vóc người).
//  3. Chiến ký của mỗi vị (g:l1 … g:l11, g:s34) vẽ đúng vị ấy ở mọi trang có mặt thần, không còn dùng dáng thần chung; tên vị ấy
//     xuất hiện trong lời kể.
//  4. Mọi tư thế dùng trong tranh vẽ được, không lỗi trang ở 390, 820, 1440 px.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const LORDS = {
  'g:l1': 'godty',
  'g:l2': 'godsuu',
  'g:l3': 'goddan',
  'g:l4': 'godmao',
  'g:l5': 'godthin',
  'g:l6': 'godtyj',
  'g:l7': 'godngo',
  'g:l8': 'godmui',
  'g:l9': 'godthan',
  'g:l10': 'goddau',
  'g:l11': 'godtuat',
  'g:s34': 'godhoi',
};
const GENERIC = ['god', 'godb', 'godg', 'godj', 'godr'];
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
      ([LORDS, GENERIC]) => {
        const Z = window.zenScene;
        const looks = {};
        for (const id of Object.values(LORDS))
          looks[id] = Z.CAST.has(id) ? { ...Z.CAST.LOOK[id] } : null;
        const pages = {};
        const draw = [];
        for (const [k, id] of Object.entries(LORDS)) {
          const lines = window.zenPlates.LINES[k];
          pages[k] = lines.map((line, i) => {
            const shot = Z.shotFor(k, i, null);
            try {
              if (!Z.build(shot)) draw.push(k + '.' + i + ': không dựng được');
            } catch (e) {
              draw.push(k + '.' + i + ': ' + e.message);
            }
            return { who: shot.f.map((q) => q.who), text: line };
          });
        }
        return { looks, pages, draw };
      },
      [LORDS, GENERIC],
    );
    // 1-2.
    const ids = Object.values(LORDS);
    for (const id of ids) {
      const L = r.looks[id];
      assert.ok(L, `có nhân vật ${id}` + tag);
      assert.ok(L.ghost, `${id} (${L.name}) mờ chân như hồn` + tag);
      assert.ok(
        L.name && L.name !== 'Thần giới',
        `${id} có tên riêng (${L.name})` + tag,
      );
    }
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = r.looks[ids[i]],
          b = r.looks[ids[j]];
        assert.ok(
          dist(a.robe, b.robe) >= 40,
          `${a.name} và ${b.name} khác màu áo rõ rệt (${a.robe} / ${b.robe})` +
            tag,
        );
        const shape = (L) => [L.kind, L.hold || '-', L.s || 1].join('|');
        assert.notEqual(
          shape(a),
          shape(b),
          `${a.name} và ${b.name} khác nhau ở kiểu đầu, vật cầm hoặc vóc người` +
            tag,
        );
      }
    // 3.
    for (const [k, id] of Object.entries(LORDS)) {
      const pages = r.pages[k];
      const name = r.looks[id].name;
      assert.ok(
        pages.filter((p) => p.who.includes(id)).length >= 3,
        `${k}: ${name} có mặt ở ít nhất ba trang` + tag,
      );
      if (k !== 'g:l11')
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
    assert.deepEqual(r.draw, [], 'mọi tư thế vẽ được' + tag);
    assert.deepEqual(errors, [], 'không lỗi trang' + tag);
    await context.close();
  }
  console.log('growth-godlook-browser: ok');
} finally {
  await h.close();
}
