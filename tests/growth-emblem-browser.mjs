// Hồi quy v2.32.0 (Huy Hiệu Bách Cấp), theo yêu cầu của chủ dự án: "Mỗi cấp độ nhân vật lên cấp, sẽ có hình biểu tượng riêng phù hợp,
// cấp sau đẹp, tinh tế hơn cấp trước" (dist/growth-emblem.js).
//  1. Bộ huy hiệu: đủ 103 hình, không hình nào trùng, không lỗi số; cảnh giới của huy hiệu khớp thang cấp của Điểm tích lũy.
//     "Đẹp và tinh tế dần" đo được: khung trang trí ngoài thân dày dần theo cảnh giới (số phần tử tăng chặt qua 11 cảnh giới); trong một
//     cảnh giới, ngọc trên vành sáng thêm đúng một viên mỗi cấp, chi tiết thêm dần, cấp cuối có vòng viên mãn.
//  2. Trên trang Tu vi: khối cảnh giới có huy hiệu của cấp hiện tại (nhãn đọc đủ cấp, danh xưng, số ngọc sáng), chưa có cấp thì ô trống;
//     danh sách 103 cấp mỗi cấp một huy hiệu nhỏ, cấp chưa đạt còn mờ; không tràn ngang, huy hiệu không đè chữ.
//  3. Lên cấp thường: thẻ "Huy hiệu mới" (bên cạnh lời chúc, tự tắt, tắt cùng "Thông báo điểm nghiệp"); đột phá: huy hiệu trong nghi thức
//     (không hiện thêm thẻ); thanh bên (Giang hồ) mang huy hiệu cấp hiện tại và đổi theo cấp.
//  4. Giảm chuyển động tắt ánh lướt; chế độ tối vẫn đọc được; thiếu tệp huy hiệu thì trang vẫn chạy như cũ.
// Mốc điểm lấy từ thang trong trang (zenGrowth.LEVEL_AT) nên bài không gãy khi đổi công thức tính điểm. Kiểm ở 390 (chạm), 820 (chạm),
// 1440 px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// half = số nửa điểm đã tích lũy (sổ cái lưu nửa điểm).
const growth = (half, extra = {}) => ({ v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: half ? [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [half, 0, 0, 0, 0, 0, 0, 0] }] : [], ...extra });
const seed = (g) => () => ({ schema: 1, notes: [], projects: [makeProject('p1', 'Alpha', '#7950c8', 8)], ...(g ? { growth: g } : {}) });
const GH = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const finish = (page) =>
  page.evaluate(() => {
    const p = project('p1'), t = p.tasks.find((x) => x.col !== 'Done' && !x.archived);
    moveTask(p, t, 'Done');
    return t.id;
  });
// Hoàn thành một việc rồi dồn 1 điểm (2 lần vận công) vào mạch đầu.
const award = async (page) => {
  await finish(page);
  await page.waitForSelector('#growth-award[open]');
  await page.mouse.move(2, 2);
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-plus="0"]');
  await page.click('[data-gr-save]');
  await page.mouse.move(2, 2);
};
// Đóng chương truyện nếu lên cấp mở ra chương mới.
const closeStory = async (page) => {
  if (await page.locator('dialog.gr-story[open]').count()) {
    await page.locator('[data-story-close]').click();
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
  }
};
const clearOverlay = (page) => page.evaluate(() => (typeof dismissCompletion === 'function' ? dismissCompletion() : null));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const h = await startHarness({ seed: seed(null) });
try {
  // ---- Thang cấp của trang: mọi mốc bên dưới lấy từ đây ----------------------------------------------------------------
  const probe = await h.open(1440, { workspace: seed(growth(0))() });
  const info = await probe.page.evaluate(() => ({ LA: zenGrowth.LEVEL_AT, names: zenGrowth.LEVEL_NAMES, FROM: zenGrowth.REALM_FROM, MAX: zenGrowth.LEVEL_MAX }));
  await probe.context.close();
  const LA = info.LA;
  const cost = (n) => LA[n] - LA[n - 1];
  // Cấp thường để thử thẻ huy hiệu: không phải bội của 5 (khỏi mở chương truyện), tốn ≥ 1,5 điểm để đúng một việc (1 điểm) vừa đủ lên đúng 1 cấp.
  const UP = Array.from({ length: info.MAX }, (_, i) => i + 1).find((n) => n >= 11 && n % 5 !== 0 && cost(n) >= 1.5);
  assert.ok(UP, 'có một cấp thường tốn ≥ 1,5 điểm để thử');
  assert.ok(cost(10) >= 1.5, 'ải cấp 10 tốn ≥ 1,5 điểm để đúng một việc vừa đủ qua ải');
  const MID = 31; // giữa cảnh giới 4 (Nhất lưu cao thủ): cấp 2/10 của cảnh giới
  const halfOf = (t) => Math.round(t * 2);
  const MID_HALF = halfOf(LA[MID]);
  const UP_HALF = halfOf(LA[UP] - 1);
  const BT_HALF = halfOf(LA[10] - 1);

  // ---- 1. Bộ huy hiệu (một lần, không phụ thuộc kích thước màn hình) ----------------------------------------------------
  {
    const { context, page } = await h.open(1440, { workspace: seed(growth(0))() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'growth');
    const lib = await page.evaluate(() => {
      const Z = window.zenEmblem, G = window.zenGrowth;
      const markups = [];
      const bad = [];
      const drawn = [];
      const host = document.createElement('div');
      document.body.append(host);
      for (let i = 1; i <= Z.COUNT; i++) {
        const m = Z.markup(i);
        markups.push(m);
        if (/NaN|undefined|null/.test(m)) bad.push(i);
        // Dựng thật ra trang: hình phải có nét vẽ (hộp bao có bề ngang) chứ không rỗng.
        host.innerHTML = Z.html(i);
        const use = host.querySelector('use');
        drawn.push(use.getBBox().width);
      }
      const realmOfLevel = (n) => Z.spec(n).realm;
      const decor = Array.from({ length: 11 }, (_, k) => Z.decor(Z.FROM[k]));
      // Trong cảnh giới: số ngọc sáng (mỗi ngọc sáng có 3 hình tròn .zem-on), ngọc tối, độ chi tiết và vòng viên mãn.
      const within = Array.from({ length: 11 }, (_, k) => {
        const rows = [];
        for (let n = Z.FROM[k]; n < Z.FROM[k + 1]; n++) {
          const box = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          box.innerHTML = Z.markup(n);
          rows.push({ n, lit: box.querySelectorAll('.zem-on').length / 3, dark: box.querySelectorAll('.zem-off').length, full: box.querySelectorAll('.zem-full').length, detail: Z.detail(n) });
        }
        return rows;
      });
      host.remove();
      return {
        count: Z.COUNT,
        from: Z.FROM,
        sizes: Z.SIZE,
        growthFrom: G.REALM_FROM,
        max: G.LEVEL_MAX,
        distinct: new Set(markups).size,
        bad,
        minDrawn: Math.min(...drawn),
        decor,
        within,
        names: Z.label(37, G.LEVEL_NAMES[37]),
        spec37: Z.spec(37),
        spec103: Z.spec(103),
        realm100: realmOfLevel(100),
        clampLow: Z.spec(0).level,
        clampHigh: Z.spec(999).level,
      };
    });
    assert.equal(lib.count, info.MAX, 'đủ một huy hiệu cho mỗi cấp (103)');
    assert.deepEqual(lib.from, lib.growthFrom, 'cảnh giới của huy hiệu khớp thang cấp của Điểm tích lũy');
    assert.equal(lib.sizes.reduce((a, b) => a + b, 0), info.MAX, 'các cảnh giới cộng lại đủ 103 cấp');
    assert.equal(lib.distinct, info.MAX, 'không có hai huy hiệu giống nhau');
    assert.deepEqual(lib.bad, [], 'không có số lỗi trong hình');
    assert.ok(lib.minDrawn > 40, 'mọi huy hiệu đều vẽ ra hình (hộp bao rộng ' + lib.minDrawn.toFixed(1) + ')');
    assert.equal(lib.decor[0], 0, 'cảnh giới đầu: khung trơn mộc mạc');
    for (let k = 1; k < 11; k++) assert.ok(lib.decor[k] > lib.decor[k - 1], 'khung dày dần: cảnh giới ' + (k + 1) + ' (' + lib.decor[k] + ') hơn cảnh giới ' + k + ' (' + lib.decor[k - 1] + ')');
    lib.within.forEach((rows, k) => {
      rows.forEach((r, j) => {
        assert.equal(r.lit, j + 1, 'cấp ' + r.n + ': ngọc sáng = số cấp đã đi trong cảnh giới');
        assert.equal(r.lit + r.dark, lib.sizes[k], 'cấp ' + r.n + ': đủ ổ ngọc của cảnh giới ' + (k + 1));
        assert.equal(r.full, j === rows.length - 1 ? 1 : 0, 'cấp ' + r.n + ': vòng viên mãn chỉ ở cấp cuối cảnh giới');
        if (j) assert.ok(r.detail > rows[j - 1].detail, 'cấp ' + r.n + ' tinh tế hơn cấp ' + (r.n - 1) + ' (' + r.detail + ' > ' + rows[j - 1].detail + ')');
      });
    });
    assert.equal(lib.names, 'Huy hiệu cấp 37 · ' + info.names[37] + ', 8/10 ngọc sáng', 'nhãn đọc của huy hiệu');
    assert.deepEqual([lib.spec37.realm, lib.spec37.offset, lib.spec37.lit, lib.spec37.full], [4, 7, 8, false], 'cấp 37: cảnh giới 4, ngọc thứ 8');
    assert.deepEqual([lib.spec103.realm, lib.spec103.lit, lib.spec103.size, lib.spec103.full], [11, 4, 4, true], 'cấp 103: Thần Vương, đủ 4/4 ngọc');
    assert.equal(lib.realm100, 11, 'cấp 100 vào cảnh giới Thần cảnh');
    assert.deepEqual([lib.clampLow, lib.clampHigh], [1, 103], 'cấp ngoài thang được kẹp về 1..103');
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    // ---- 2. Trang Tu vi: khối cảnh giới, thang 103 cấp, thanh bên ---------------------------------------------------------
    {
      const { context, page } = await h.open(width, { touch, setup: GH, workspace: seed(growth(MID_HALF))() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.waitForSelector('.gr-realm');
      const realm = await page.evaluate(() => {
        const b = document.querySelector('.gr-realm'), e = b.querySelector('.gr-emblem'), s = e.querySelector('svg.zem'), top = b.querySelector('.gr-realm-top');
        const r = e.getBoundingClientRect(), t = top.getBoundingClientRect();
        return {
          has: b.classList.contains('has-emblem'), level: e.dataset.level, emblem: s.dataset.emblem, role: e.getAttribute('role'), label: e.getAttribute('aria-label'),
          use: s.querySelector('use').getAttribute('href'), symbol: !!document.getElementById('zem-' + s.dataset.emblem), drawn: s.querySelector('use').getBBox().width,
          w: Math.round(r.width), h: Math.round(r.height), apart: r.right <= t.left + 1, inside: r.left >= 0 && r.right <= innerWidth,
          rank: document.querySelector('.gr-rank').textContent, sprite: document.querySelectorAll('.zem-sprite').length, aria: s.getAttribute('aria-hidden'),
        };
      });
      assert.equal(realm.has, true, 'khối cảnh giới có huy hiệu' + at);
      assert.equal(realm.level, String(MID), 'huy hiệu thuộc đúng cấp hiện tại' + at);
      assert.equal(realm.emblem, String(MID), 'hình vẽ đúng cấp hiện tại' + at);
      assert.equal(realm.role, 'img', 'huy hiệu là hình có nhãn' + at);
      assert.equal(realm.label, 'Huy hiệu cấp 31 · ' + info.names[MID] + ', 2/10 ngọc sáng', 'nhãn đọc: cấp, danh xưng, số ngọc sáng' + at);
      assert.equal(realm.use, '#zem-31', 'hình dùng ký hiệu của cấp 31' + at);
      assert.ok(realm.symbol && realm.drawn > 40, 'ký hiệu có trong bảng ký hiệu và vẽ ra hình' + at);
      assert.equal(realm.aria, 'true', 'hình bên trong không đọc lại lần nữa' + at);
      assert.equal(realm.sprite, 1, 'một bảng ký hiệu dùng chung' + at);
      assert.equal(realm.w, width <= 520 ? 72 : 88, 'cỡ huy hiệu' + at);
      assert.equal(realm.h, realm.w, 'huy hiệu vuông' + at);
      assert.ok(realm.apart && realm.inside, 'huy hiệu nằm bên trái chữ, không đè chữ, vừa màn hình' + at);
      assert.ok(realm.rank.startsWith('Cấp 31/100 · ' + info.names[MID]), 'dòng cấp vẫn như cũ: ' + realm.rank + at);

      // Thang 103 cấp: chỉ dựng huy hiệu khi mở.
      assert.equal(await page.locator('.gr-names-zem svg').count(), 0, 'chưa mở thang thì chưa dựng 103 hình' + at);
      await page.click('details.gr-scale>summary');
      await page.waitForSelector('.gr-names li svg.zem');
      await page.waitForFunction((n) => document.querySelectorAll('.gr-names-zem svg.zem').length === n, info.MAX);
      const list = await page.evaluate((mid) => {
        const lis = [...document.querySelectorAll('.gr-names li')];
        const style = (li) => getComputedStyle(li.querySelector('.gr-names-zem'));
        const locked = lis.find((li) => li.classList.contains('is-locked')), done = lis.find((li) => li.classList.contains('is-done')), now = lis.find((li) => li.classList.contains('is-now'));
        return {
          n: lis.length,
          match: lis.every((li) => li.querySelector('.gr-names-zem svg.zem').dataset.emblem === li.querySelector('b').textContent),
          done: lis.filter((li) => li.classList.contains('is-done')).length, now: lis.filter((li) => li.classList.contains('is-now')).length, locked: lis.filter((li) => li.classList.contains('is-locked')).length,
          lockedOpacity: +style(locked).opacity, lockedFilter: style(locked).filter, doneOpacity: +style(done).opacity, doneFilter: style(done).filter, nowOpacity: +style(now).opacity,
          nowText: now.textContent.replace(/\s+/g, ' ').trim(), size: Math.round(now.querySelector('.gr-names-zem').getBoundingClientRect().width),
          fits: (() => { const w = document.querySelector('.gr-scale-wrap'); return w.scrollWidth <= w.clientWidth + 1; })(),
          help: [...document.querySelectorAll('.gr-scale .help-copy')].some((p) => /huy hiệu riêng/.test(p.textContent)),
          overlap: lis.some((li) => { const z = li.querySelector('.gr-names-zem').getBoundingClientRect(), b = li.querySelector('b').getBoundingClientRect(); return z.right > b.left + 1; }),
          mid,
        };
      }, MID);
      assert.equal(list.n, info.MAX, 'danh sách đủ 103 cấp' + at);
      assert.ok(list.match, 'mỗi viên thuốc mang đúng huy hiệu của cấp ghi trong đó' + at);
      assert.deepEqual([list.done, list.now, list.locked], [MID - 1, 1, info.MAX - MID], 'đã đạt / hiện tại / chưa đạt' + at);
      assert.ok(list.lockedOpacity < 0.6 && /grayscale/.test(list.lockedFilter), 'cấp chưa đạt còn mờ và xám' + at);
      assert.ok(list.doneOpacity === 1 && !/grayscale/.test(list.doneFilter) && list.nowOpacity === 1, 'cấp đã đạt và hiện tại rõ nét' + at);
      assert.equal(list.nowText, MID + ' ' + info.names[MID], 'chữ trong viên thuốc không đổi: ' + list.nowText + at);
      assert.equal(list.size, 24, 'cỡ huy hiệu trong danh sách' + at);
      assert.ok(list.fits && !list.overlap && list.help, 'bảng vừa khung, huy hiệu không đè chữ, có lời giải thích' + at);

      // Thanh bên (Giang hồ): luôn có trong DOM; đo hình học khi thanh bên hiện (máy tính).
      const side = await page.evaluate(() => {
        const r = document.querySelector('.sidebar .gh-rank'), em = r && r.querySelector('.gh-rank-emblem svg.zem'), b = r && r.querySelector('b');
        if (!r || !em) return null;
        const c = r.getBoundingClientRect(), e = em.getBoundingClientRect(), t = r.querySelector('.gh-rank-text').getBoundingClientRect(), bb = b.getBoundingClientRect();
        return { has: r.classList.contains('has-emblem'), level: em.dataset.emblem, badge: b.textContent, label: r.getAttribute('aria-label'), w: Math.round(e.width), h: Math.round(c.height), apart: e.right <= t.left + 1, badgeIn: bb.left >= c.left && bb.right <= c.right + 1 && bb.bottom <= c.bottom + 1, bar: getComputedStyle(r, '::after').height, name: r.querySelector('strong').textContent, shown: c.width > 0 && c.left >= 0 && c.right <= innerWidth };
      });
      assert.ok(side, 'thanh bên có huy hiệu' + at);
      assert.deepEqual([side.has, side.level, side.badge], [true, String(MID), String(MID)], 'thanh bên: huy hiệu và số cấp' + at);
      assert.match(side.label, /^Tu vi: Nhất lưu cao thủ · /, 'nhãn đọc của thanh bên vẫn như cũ' + at);
      if (width >= 1024) {
        assert.equal(side.w, 44, 'cỡ huy hiệu trên thanh bên' + at);
        assert.ok(side.h <= 72 && side.apart && side.badgeIn && side.shown, 'thẻ gọn, huy hiệu không đè chữ, số cấp nằm trong thẻ: cao ' + side.h + at);
        assert.equal(side.bar, '3px', 'thanh tiến cấp mảnh dưới thẻ' + at);
      }
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }

    // Chưa có cấp: ô trống nét đứt, không hình; thanh bên và danh sách vẫn chạy.
    {
      const { context, page } = await h.open(width, { touch, setup: GH, workspace: seed(growth(0))() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.waitForSelector('.gr-realm');
      const none = await page.evaluate(() => {
        const b = document.querySelector('.gr-realm'), e = b.querySelector('.gr-emblem');
        const r = e.getBoundingClientRect(), t = b.querySelector('.gr-realm-top').getBoundingClientRect();
        return { has: b.classList.contains('has-emblem'), empty: e.classList.contains('is-empty'), svg: e.querySelectorAll('svg').length, hidden: e.getAttribute('aria-hidden'), apart: r.right <= t.left + 1, rank: document.querySelector('.gr-rank').textContent, dashed: getComputedStyle(e, '::before').borderTopStyle, side: document.querySelectorAll('.gh-rank.has-emblem').length };
      });
      assert.deepEqual([none.has, none.empty, none.svg, none.hidden, none.apart], [true, true, 0, 'true', true], 'chưa có cấp: ô trống, không hình, không đè chữ' + at);
      assert.equal(none.dashed, 'dashed', 'ô trống nét đứt' + at);
      assert.equal(none.rank, 'Chưa nhập cấp', 'dòng cấp vẫn như cũ' + at);
      assert.equal(none.side, 0, 'thanh bên giữ ấn tròn cũ khi chưa có cấp' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }

    // ---- 3a. Lên cấp thường: thẻ "Huy hiệu mới" ------------------------------------------------------------------------
    {
      const { context, page } = await h.open(width, { touch, setup: GH, workspace: seed(growth(UP_HALF))() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      await award(page);
      await page.waitForSelector('.zem-pop');
      await closeStory(page);
      await page.waitForTimeout(700); // chờ hiệu ứng vào xong (trượt xuống từ trên) rồi mới đo vị trí
      const pop = await page.evaluate(() => {
        const p = document.querySelector('.zem-pop'), r = p.getBoundingClientRect(), bar = document.querySelector('.topbar').getBoundingClientRect();
        return { level: p.dataset.level, aria: p.getAttribute('aria-hidden'), small: p.querySelector('small').textContent, strong: p.querySelector('strong').textContent, emblem: p.querySelector('svg.zem').dataset.emblem, fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, belowBar: r.top >= bar.bottom - 1, count: document.querySelectorAll('.zem-pop').length, events: getComputedStyle(p).pointerEvents, toast: document.querySelector('#toast').textContent };
      });
      assert.equal(pop.level, String(UP), 'thẻ báo huy hiệu của cấp vừa đạt' + at);
      assert.equal(pop.emblem, String(UP), 'thẻ mang hình của cấp vừa đạt' + at);
      assert.equal(pop.small, 'Huy hiệu mới', 'dòng nhỏ' + at);
      assert.equal(pop.strong, 'Cấp ' + UP + ' · ' + info.names[UP], 'dòng chính: cấp và danh xưng' + at);
      assert.equal(pop.aria, 'true', 'thẻ không đọc lại (lời chúc đã được đọc)' + at);
      assert.ok(pop.fits && pop.belowBar && pop.count === 1, 'thẻ vừa màn hình, nằm dưới thanh đầu trang, chỉ một thẻ' + at);
      assert.equal(pop.events, 'none', 'thẻ không chặn thao tác' + at);
      assert.match(pop.toast, new RegExp('lên cấp ' + UP + ' · ' + info.names[UP]), 'lời chúc vẫn như cũ: ' + pop.toast + at);
      // Thanh bên đổi theo cấp mới.
      const rank = await page.evaluate(() => { const r = document.querySelector('.sidebar .gh-rank'); return r && { badge: r.querySelector('b').textContent, emblem: r.querySelector('svg.zem')?.dataset.emblem }; });
      assert.deepEqual(rank, { badge: String(UP), emblem: String(UP) }, 'thanh bên đổi sang huy hiệu cấp mới' + at);
      if (width === 1440) {
        await page.waitForFunction(() => !document.querySelector('.zem-pop'), null, { timeout: 7000 });
      }
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      await clearOverlay(page);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }

    // ---- 3b. Đột phá: huy hiệu trong nghi thức, không hiện thêm thẻ ----------------------------------------------------
    {
      const { context, page } = await h.open(width, { touch, setup: GH, workspace: seed(growth(BT_HALF))() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'projects', 'p1');
      const before = await page.evaluate(() => document.querySelector('.sidebar .gh-rank svg.zem')?.dataset.emblem);
      assert.equal(before, '9', 'trước khi đột phá: thanh bên mang huy hiệu cấp 9' + at);
      await award(page);
      await page.waitForSelector('dialog.gr-breakthrough[open]');
      await page.waitForTimeout(1700);
      const bt = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-breakthrough[open]'), e = d.querySelector('.gr-bt-emblem'), hero = d.querySelector('.gr-bt-hero'), r = d.getBoundingClientRect(), z = e.getBoundingClientRect(), t = d.querySelector('.eyebrow').getBoundingClientRect();
        return { level: e.dataset.level, emblem: e.querySelector('svg.zem').dataset.emblem, w: Math.round(z.width), inside: z.left >= r.left && z.right <= r.right && z.top >= r.top && z.bottom <= r.bottom, aboveText: z.bottom <= t.top + 1, hero: !!hero.querySelector('svg'), fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, pops: document.querySelectorAll('.zem-pop').length, opacity: +getComputedStyle(e).opacity, text: d.querySelector('.gr-bt-text').textContent };
      });
      assert.equal(bt.level, '10', 'nghi thức mang huy hiệu của cấp mới' + at);
      assert.equal(bt.emblem, '10', 'hình đúng cấp mới' + at);
      assert.equal(bt.w, 88, 'cỡ huân chương' + at);
      assert.ok(bt.inside && bt.aboveText && bt.hero && bt.fits, 'huân chương nằm trong bảng, không đè chữ, có hình hiệp khách, vừa màn hình' + at);
      assert.equal(bt.opacity, 1, 'huân chương hiện rõ sau hiệu ứng' + at);
      assert.equal(bt.pops, 0, 'đột phá đã có huy hiệu trong nghi thức nên không hiện thêm thẻ' + at);
      assert.equal(bt.text, 'Lam Y đã phá vỡ bình cảnh, bước vào cảnh giới Tam lưu cao thủ · cấp 10 · ' + info.names[10] + '.', 'lời nghi thức không đổi' + at);
      const after = await page.evaluate(() => document.querySelector('.sidebar .gh-rank svg.zem')?.dataset.emblem);
      assert.equal(after, '10', 'thanh bên đổi sang huy hiệu cấp 10' + at);
      await page.locator('dialog.gr-breakthrough button').click();
      await page.waitForFunction(() => !document.querySelector('dialog.gr-breakthrough'));
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.zem-pop').count(), 0, 'đóng nghi thức cũng không hiện thẻ' + at);
      await closeStory(page);
      await clearOverlay(page);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // ---- 4. Tắt thông báo, giảm chuyển động, chế độ tối, Thiền, thiếu tệp (một cỡ màn hình) -------------------------------------
  {
    // Tắt "Thông báo điểm nghiệp": không thẻ, không nghi thức.
    const quiet = await h.open(1440, { setup: GH, workspace: seed(growth(UP_HALF, { notify: false }))() });
    await h.show(quiet.page, 'projects', 'p1');
    await award(quiet.page);
    await quiet.page.waitForSelector('.completion-card');
    await wait(900);
    assert.equal(await quiet.page.locator('.zem-pop').count(), 0, 'tắt thông báo điểm nghiệp thì không có thẻ huy hiệu');
    assert.equal(await quiet.page.evaluate(() => document.querySelector('.sidebar .gh-rank svg.zem')?.dataset.emblem), String(UP), 'thanh bên vẫn đổi huy hiệu');
    await quiet.context.close();

    // Giảm chuyển động: không ánh lướt, thẻ không trượt vào.
    const calm = await h.open(1440, { setup: GH, reducedMotion: 'reduce', workspace: seed(growth(MID_HALF))() });
    await h.show(calm.page, 'growth');
    await calm.page.waitForSelector('.gr-emblem');
    const still = await calm.page.evaluate(() => { const e = document.querySelector('.gr-emblem'), s = getComputedStyle(e, '::after'); return { name: s.animationName, display: s.display }; });
    assert.deepEqual([still.name, still.display], ['none', 'none'], 'giảm chuyển động: tắt ánh lướt');
    await calm.context.close();
    const calmUp = await h.open(1440, { setup: GH, reducedMotion: 'reduce', workspace: seed(growth(UP_HALF))() });
    await h.show(calmUp.page, 'projects', 'p1');
    await award(calmUp.page);
    await calmUp.page.waitForSelector('.zem-pop');
    assert.notEqual(await calmUp.page.evaluate(() => getComputedStyle(document.querySelector('.zem-pop')).animationName), 'zem-pop', 'giảm chuyển động: thẻ không trượt vào (không dùng hiệu ứng chuyển động)');
    await clearOverlay(calmUp.page);
    await calmUp.context.close();

    // Chế độ tối: hình vẫn vẽ ra, thẻ có nền tối.
    const dark = await h.open(1440, { setup: GH, colorScheme: 'dark', workspace: seed(growth(UP_HALF))() });
    await h.show(dark.page, 'projects', 'p1');
    await award(dark.page);
    await dark.page.waitForSelector('.zem-pop');
    const night = await dark.page.evaluate(() => {
      const p = document.querySelector('.zem-pop'), c = getComputedStyle(p).backgroundColor.match(/\d+/g).map(Number);
      return { theme: document.documentElement.dataset.theme, lum: (c[0] + c[1] + c[2]) / 3, drawn: p.querySelector('use').getBBox().width, ink: getComputedStyle(p).color };
    });
    assert.equal(night.theme, 'dark', 'đang ở chế độ tối');
    assert.ok(night.lum < 90 && night.drawn > 40, 'chế độ tối: thẻ nền tối (' + night.lum.toFixed(0) + '), hình vẫn vẽ ra');
    await dark.context.close();

    // Thiền (phong cách mặc định): không danh hiệu thanh bên, nhưng trang Tu vi vẫn có huy hiệu.
    const zen = await h.open(1440, { workspace: seed(growth(MID_HALF))() });
    await h.show(zen.page, 'growth');
    await zen.page.waitForSelector('.gr-emblem svg.zem');
    assert.equal(await zen.page.locator('.gh-rank').count(), 0, 'Thiền không có danh hiệu trên thanh bên');
    assert.equal(await zen.page.locator('.gr-emblem svg.zem').getAttribute('data-emblem'), String(MID), 'Thiền: trang Tu vi vẫn có huy hiệu');
    await zen.context.close();

    // Thiếu tệp huy hiệu: trang Tu vi, thanh bên và lên cấp vẫn chạy như cũ.
    const miss = await h.open(1440, {
      setup: async (ctx) => {
        await GH(ctx);
        await ctx.context.route(/growth-emblem/, (route) => route.abort());
      },
      workspace: seed(growth(UP_HALF))(),
    });
    const errors = [];
    miss.page.on('pageerror', (e) => errors.push(e.message));
    await h.show(miss.page, 'growth');
    await miss.page.waitForSelector('.gr-realm');
    const bare = await miss.page.evaluate(() => ({ lib: typeof window.zenEmblem, has: document.querySelector('.gr-realm').classList.contains('has-emblem'), emblems: document.querySelectorAll('.gr-emblem, .gr-names-zem').length, side: document.querySelectorAll('.gh-rank.has-emblem').length, rank: !!document.querySelector('.sidebar .gh-rank'), rankText: document.querySelector('.gr-rank').textContent.startsWith('Cấp ') }));
    assert.deepEqual(bare, { lib: 'undefined', has: false, emblems: 0, side: 0, rank: true, rankText: true }, 'thiếu tệp huy hiệu: trang vẫn chạy như cũ');
    await miss.page.click('details.gr-scale>summary');
    assert.equal(await miss.page.locator('.gr-names li').count(), info.MAX, 'thiếu tệp: danh sách 103 cấp vẫn đủ');
    await h.show(miss.page, 'projects', 'p1');
    await award(miss.page);
    await miss.page.waitForSelector('.completion-card');
    await wait(900);
    assert.equal(await miss.page.locator('.zem-pop').count(), 0, 'thiếu tệp: lên cấp không có thẻ huy hiệu');
    await clearOverlay(miss.page);
    assert.deepEqual(errors, [], 'thiếu tệp huy hiệu: không lỗi trang');
    await miss.context.close();
  }
  console.log('growth-emblem-browser ok');
} finally {
  await h.close();
}
