// v2.17.0 (Họa Cảnh): tranh minh họa riêng cho từng trang truyện (dist/growth-scene.js, growth-cast.js, growth-props.js, growth-sets.js,
// growth-places.js, growth-plates.js). Kiểm tra:
//  1. Dữ liệu (kiểm một lần): mỗi chương chính có đúng một dòng tranh cho mỗi trang; mọi nhân vật, thế, vật, hiệu ứng, nơi chốn đều đã
//     biết và dựng được; mỗi chương có ít nhất 5 nơi-giờ khác nhau, không hai trang nào trùng khung hình; tổng số nơi-giờ khác nhau ≥ 200;
//     người nói có mặt trong tranh (trừ vài trang chỉ nghe tiếng); kỳ ngộ (44) và chiến ký (48) dựng được và không trang nào trùng khung;
//  2. Khung đọc (390 chạm, 820 chạm, 1440): mỗi trang một tranh có mô tả cho người đọc màn hình, nằm trong khung, không tràn ngang, không
//     lỗi trang; lật liền các trang cùng một cảnh thì mọi dải màu được dùng đều đã khai báo (không hình nào mất màu);
//  3. Đổi nơi thì chuyển cảnh mờ dần (hai cảnh cùng có mặt một lúc); giảm chuyển động thì không có hoạt họa nào trong tranh;
//  4. Nữ hiệp vẽ áo đỏ, thiếu hiệp vẽ áo xanh ngọc; đóng sách gỡ tranh sạch, không để lại bộ theo dõi.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const project = { id: 'p1', name: 'Dự án A', description: '', color: '#7950c8', icon: '✺', columns: ['Idea', 'List', 'Doing', 'Done'], columnNames: { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang làm', Done: 'Xong' }, tasks: [] };
// 200000 nửa điểm: đủ cấp để mọi chương và kỳ ngộ đã mở.
const growth = (hero) => ({ v: 1, hero, name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [200000, 0, 0, 0, 0, 0, 0, 0] }] });
const seed = (hero) => () => ({ schema: 1, projects: [structuredClone(project)], notes: [], growth: growth(hero) });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Mọi url(#id) trong tranh phải trỏ tới phần tử có thật.
const danglingRefs = (page) =>
  page.evaluate(() => {
    const miss = new Set();
    for (const el of document.querySelectorAll('.gr-story-art .sc [fill*="url(#"], .gr-story-art .sc [stroke*="url(#"], .gr-story-art .sc [style*="url(#"]')) {
      for (const a of ['fill', 'stroke', 'style']) {
        const v = el.getAttribute(a) || '';
        for (const m of v.matchAll(/url\(#([^)]+)\)/g)) if (!document.getElementById(m[1])) miss.add(m[1]);
      }
    }
    return [...miss];
  });

const h = await startHarness({ seed: seed('nam') });
try {
  // 1. Dữ liệu.
  {
    const { context, page } = await h.open(1440, { workspace: seed('nam')() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    const r = await page.evaluate(() => {
      const Z = window.zenScene, PL = window.zenPlates, bad = [];
      const sig = (s) => JSON.stringify([s.s, s.t, s.f.map((q) => [q.who, q.pose, q.x]), s.p.map((q) => q.id), s.c]);
      let shots = 0;
      const check = (label, shot) => {
        shots++;
        try {
          for (const q of shot.f) {
            if (!Z.CAST.has(q.who)) bad.push(label + ': người lạ ' + q.who);
            if (!Z.CAST.POSE[q.pose]) bad.push(label + ': thế lạ ' + q.pose);
          }
          for (const p of shot.p) if (!Z.PROPS[p.id]) bad.push(label + ': vật lạ ' + p.id);
          for (const x of shot.fx) if (!Z.FX[x]) bad.push(label + ': hiệu ứng lạ ' + x);
          if (!Z.SETS[shot.s]) bad.push(label + ': nơi lạ ' + shot.s);
          if (!Z.TIME_NAMES[shot.t]) bad.push(label + ': giờ lạ ' + shot.t);
          Z.build(shot);
        } catch (e) {
          bad.push(label + ': ' + e.message);
        }
      };
      const NARR = new Set(['ke', 'than', 'trang', 'ac', 'bao']);
      const envs = new Set(), absent = [], weak = [], few = [];
      let speakers = 0;
      for (const c of window.zenTale.CHAPTERS) {
        const key = 't' + c.lv, lines = PL.LINES[key];
        if (!lines || lines.length !== c.pages.length) {
          bad.push(key + ': ' + (lines ? lines.length : 0) + ' dòng ≠ ' + c.pages.length + ' trang');
          continue;
        }
        const list = c.pages.map((_, i) => Z.shotFor(c.lv, i, { pages: c.pages }));
        list.forEach((s, i) => { check(key + '.' + i, s); envs.add(Z.keyOf(s)); });
        if (new Set(list.map(sig)).size !== list.length) weak.push(key);
        if (new Set(list.map((s) => Z.keyOf(s))).size < 5) few.push(key);
        c.pages.forEach(([who], i) => {
          if (NARR.has(who) || !Z.CAST.has(who)) return;
          speakers++;
          if (!list[i].f.some((q) => q.who === who)) absent.push(key + '.' + i + ':' + who);
        });
      }
      for (const k of Object.keys(PL.LINES)) if (!window.zenTale.CHAPTERS.some((c) => 't' + c.lv === k)) bad.push(k + ': khung thừa');
      // Kỳ ngộ.
      let meets = 0;
      const dup = [];
      for (const cast of window.zenMeet.CAST) {
        cast.meets.forEach((m, k) => {
          const id = 'm:' + cast.id + '-' + (k + 1), entry = { id, pages: m.pages, meet: { cast, meet: m, k: k + 1 } };
          const list = m.pages.map((_, i) => Z.shotFor(id, i, entry));
          list.forEach((s, i) => check(id + '.' + i, s));
          if (new Set(list.map(sig)).size !== list.length) dup.push(id);
          meets++;
        });
      }
      // Chiến ký.
      const ids = [...Array.from({ length: 35 }, (_, i) => 'g:s' + (i + 1)), ...Array.from({ length: 12 }, (_, i) => 'g:l' + (i + 1)), 'g:k'];
      let duels = 0;
      for (const id of ids) {
        const e = window.zenGods.entry(id);
        if (!e) { bad.push(id + ': không có mục'); continue; }
        const list = e.pages.map((_, i) => Z.shotFor(id, i, e));
        list.forEach((s, i) => check(id + '.' + i, s));
        if (new Set(list.map(sig)).size !== list.length) dup.push(id);
        duels++;
      }
      return { bad, shots, chapters: window.zenTale.CHAPTERS.length, envs: envs.size, weak, few, absent, speakers, meets, duels, dup };
    });
    assert.deepEqual(r.bad, [], 'mọi khung tranh hợp lệ và dựng được');
    assert.equal(r.chapters, 39, 'khai cuộc + 38 chương');
    assert.equal(r.meets, 44, 'đủ 44 kỳ ngộ');
    assert.equal(r.duels, 48, 'đủ 48 chiến ký');
    assert.ok(r.shots >= 700, 'đủ khung tranh (' + r.shots + ')');
    assert.deepEqual(r.weak, [], 'chương không có hai trang trùng khung hình');
    assert.deepEqual(r.few, [], 'mỗi chương có ít nhất 5 nơi-giờ khác nhau');
    assert.ok(r.envs >= 200, 'tổng số nơi-giờ khác nhau của truyện chính ≥ 200 (' + r.envs + ')');
    assert.deepEqual(r.dup, [], 'kỳ ngộ và chiến ký không có hai trang trùng khung hình');
    assert.ok(r.absent.length <= 12 && r.absent.length / r.speakers < 0.08, 'người nói có mặt trong tranh, trừ vài trang chỉ nghe tiếng: ' + r.absent.join(' '));
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }

  // 2 + 4. Khung đọc ở ba cỡ, thiếu hiệp và nữ hiệp.
  for (const [w, touch, hero] of [[390, true, 'nu'], [820, true, 'nam'], [1440, false, 'nu']]) {
    const at = ' (' + w + ' px)';
    const { context, page } = await h.open(w, { touch, workspace: seed(hero)() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await page.click('[data-gr-story="0"]');
    await page.waitForSelector('dialog.gr-story[open] .gr-story-art .sc');
    const seen = new Set(), places = new Set();
    let overlap = false, heroRobe = null;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(260);
      const s = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-story[open]'), sc = d.querySelector('.gr-story-art .sc');
        if (!sc) return null;
        const a = sc.getBoundingClientRect(), dl = d.getBoundingClientRect();
        const hero = sc.querySelector('.sc-fig');
        return {
          label: sc.getAttribute('aria-label'), role: sc.getAttribute('role'), chip: sc.querySelector('.sc-chip').textContent, key: sc.dataset.key, who: sc.dataset.who,
          scenes: sc.querySelectorAll('.sc-scene').length, inside: a.left >= dl.left - 1 && a.right <= dl.right + 1 && a.top >= dl.top - 1 && a.bottom <= dl.bottom + 1,
          area: Math.round(a.width * a.height), robe: hero ? hero.outerHTML.includes('#b8344a') : false,
        };
      });
      if (!s) break; // trang Tâm đắc
      assert.equal(s.role, 'img', 'tranh là hình có mô tả' + at);
      assert.ok(s.label.startsWith('Tranh minh họa: ') && s.label.length > 30, 'mô tả tranh đủ ý' + at + ': ' + s.label);
      assert.ok(s.chip.includes(' · '), 'nhãn nơi chốn và giờ' + at);
      assert.equal(s.inside, true, 'tranh nằm trong khung đọc' + at);
      assert.ok(s.area > 20000, 'tranh đủ lớn' + at);
      if (s.scenes > 1) overlap = true;
      seen.add(s.key);
      places.add(s.chip);
      if (s.who.split(',').includes('hero') && heroRobe === null) heroRobe = s.robe;
      assert.deepEqual(await danglingRefs(page), [], 'mọi dải màu của tranh đã khai báo' + at + ' trang ' + i);
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await page.keyboard.press('ArrowRight');
    }
    assert.ok(places.size >= 4, 'khai cuộc đi qua ít nhất 4 nơi-giờ khác nhau' + at + ' (' + [...places].join(' | ') + ')');
    assert.equal(heroRobe, hero === 'nu', hero === 'nu' ? 'nữ hiệp vẽ áo đỏ' + at : 'thiếu hiệp không vẽ áo đỏ' + at);
    if (w === 1440) assert.ok(overlap, 'đổi nơi thì hai cảnh cùng có mặt một lúc (chuyển mờ)' + at);
    // Đóng sách: tranh gỡ sạch.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    assert.equal(await page.evaluate(() => document.querySelectorAll('.sc').length), 0, 'đóng sách gỡ tranh' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }

  // 2b. Lật liền một chương dài (nhiều trang cùng cảnh, nhiều người mới): không dải màu nào bị mất.
  {
    const { context, page } = await h.open(1440, { workspace: seed('nam')() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await page.click('[data-gr-story="50"]'); // chương có 5 cặp trang liền nhau cùng nơi-giờ nhưng đổi người
    await page.waitForSelector('dialog.gr-story[open] .gr-story-art .sc');
    const keys = [];
    for (let i = 0; i < 24; i++) {
      const s = await page.evaluate(() => {
        const sc = document.querySelector('dialog.gr-story[open] .gr-story-art .sc');
        return sc ? { key: sc.dataset.key, who: sc.dataset.who } : null;
      });
      if (!s) break;
      keys.push(s.key);
      assert.deepEqual(await danglingRefs(page), [], 'trang ' + i + ': không dải màu nào mất sau khi đổi người trong cùng cảnh');
      await page.keyboard.press('ArrowRight');
    }
    assert.ok(keys.length >= 8 && keys.some((k, i) => i && k === keys[i - 1]), 'có trang liền nhau cùng một cảnh để thử đường đổi người');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }

  // 3. Giảm chuyển động: không hoạt họa nào trong tranh.
  {
    const { context, page } = await h.open(1440, { reducedMotion: 'reduce', workspace: seed('nam')() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await page.click('[data-gr-story="0"]');
    await page.waitForSelector('dialog.gr-story[open] .gr-story-art .sc');
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      const n = await page.evaluate(() => {
        const sc = document.querySelector('dialog.gr-story[open] .gr-story-art .sc');
        return sc.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length;
      });
      assert.equal(n, 0, 'giảm chuyển động: không hoạt họa nào chạy trong tranh (trang ' + i + ')');
      await page.keyboard.press('ArrowRight');
    }
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }
  console.log('growth-scene-browser: ok');
} finally {
  await h.close();
}
