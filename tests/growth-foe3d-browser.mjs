// v2.16.0 (Ma Ảnh): phe ác dựng 3D bằng lõi growth-rig.js (dist/growth-foes.js), cùng cách với hiệp khách. Kiểm tra:
//  1. Mười một nhân vật đều là bộ khớp 3D: đủ khối, có dải màu xuyên tâm, khóa khối không trùng, không số hỏng suốt 20 giây mô phỏng;
//  2. Nét riêng của từng nhân vật (mặt nạ trăng khuyết, tai hồ ly, song đao, sáu món binh khí, gương đồng, xích đen...) có mặt trong hình dựng;
//  3. Chiều sâu thật: quay lưng thì mặt biến mất; Bách Tý có bốn tay, các nhân vật khác hai tay;
//  4. Hoạt họa chạy thật trong khung Huyết Nguyệt lộ, hình nhỏ vẽ nửa nhịp; giảm chuyển động thì đứng yên, không có vòng lặp;
//  5. Ở 390 (chạm), 820 (chạm), 1440 px: khung Huyết Nguyệt lộ và khung đọc truyện (Miên Hồ) đều vẽ 3D, nằm trong khung, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// 60 nửa điểm = 30 điểm: cấp 22, đã qua Miên Hồ, Thiên Diện, Lôi Tốc.
const seed = () => ({ schema: 1, projects: [], notes: [], growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [60, 0, 0, 0, 0, 0, 0, 0] }] } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Vật đặc trưng của từng nhân vật: khóa khối (tiền tố) phải có trong khung dựng.
const SIGN = {
  giao: ['mask', 'orb', 'moon', 'sashA'],
  mien: ['ear0', 'ear1', 'fan', 'pouch'],
  dien: ['wingLd', 'wingRd', 'mask', 'lnb0', 'lnb2'],
  loi: ['band', 'sb0', 'sb1', 'khanA', 'ghead'],
  khuc: ['fluted', 'cover', 'hole2', 'rg0'],
  bach: ['wheel', 'plate', 'handc', 'handd'],
  ngoc: ['armord', 'facet', 'nd0d', 'nd3d'],
  kho: ['staffd', 'pill', 'beard'],
  kinh: ['mirror', 'dark', 'hdld'],
  suong: ['frost', 'fk0', 'fk3', 'pinTip'],
  vong: ['eclipse', 'pool', 'ch0', 'ch1', 'sp0'],
};

const h = await startHarness({ seed });
try {
  // 1–3. Dựng thẳng từng nhân vật: ổn định lâu dài, nét riêng, chiều sâu, số tay.
  {
    const { context, page } = await h.open(1440, { workspace: seed() });
    await h.show(page, 'growth');
    const r = await page.evaluate(() => {
      const out = {};
      for (const id of zenFoe.IDS) {
        const inst = zenFoe.make(id), bad = { dup: 0, nan: 0, min: 1e9, max: 0, grads: 0, head: 0, keys: new Set() };
        for (let k = 0; k < 40; k++) {
          for (let i = 0; i < 30; i++) inst.advance(1 / 60, { x: 0, y: 0 }, true);
          const sc = inst.frame(), seen = new Set();
          sc.ops.forEach((o) => {
            if (seen.has(o.k)) bad.dup++;
            seen.add(o.k);
            if (Object.values(o.a).some((v) => /NaN|Infinity/.test(String(v))) || /NaN|Infinity/.test(String(o.inner ?? ''))) bad.nan++;
            bad.keys.add(o.k);
          });
          bad.min = Math.min(bad.min, sc.ops.length);
          bad.max = Math.max(bad.max, sc.ops.length);
          bad.grads = sc.mats.size;
          bad.head += seen.has('head') ? 1 : 0;
        }
        // Chiều sâu: nhìn từ phía sau thì không còn miệng; nhìn từ phía trước thì có.
        const back = zenFoe.make(id);
        back.cam.yaw = 180;
        const front = zenFoe.make(id);
        const keysOf = (i) => new Set(i.frame().ops.map((o) => o.k));
        const kf = keysOf(front), kb = keysOf(back);
        out[id] = {
          dup: bad.dup, nan: bad.nan, min: bad.min, max: bad.max, grads: bad.grads, head: bad.head, keys: [...bad.keys],
          mouthFront: kf.has('mouth') || kf.has('mm'), mouthBack: kb.has('mouth') || kb.has('mm'),
          hands: [...bad.keys].filter((k) => /^hand[a-d]$/.test(k)).length,
        };
      }
      return out;
    });
    assert.deepEqual(Object.keys(r).sort(), Object.keys(SIGN).sort(), 'đủ mười một nhân vật phe ác');
    for (const [id, x] of Object.entries(r)) {
      assert.equal(x.dup, 0, id + ': khóa khối không trùng (trùng thì khối bị mất khi vẽ lại)');
      assert.equal(x.nan, 0, id + ': suốt 20 giây mô phỏng không có số hỏng (NaN/vô cực)');
      assert.equal(x.head, 40, id + ': khung nào cũng có đầu');
      assert.ok(x.min >= 60 && x.max <= 220, id + ': số khối hợp lý (' + x.min + '–' + x.max + ')');
      assert.ok(x.grads >= 3, id + ': có dải màu xuyên tâm cho khối cầu (' + x.grads + ')');
      for (const k of SIGN[id]) assert.ok(x.keys.includes(k), id + ': có vật đặc trưng ' + k);
      assert.equal(x.hands, id === 'bach' ? 4 : 2, id + ': số tay');
      assert.equal(x.mouthBack, false, id + ': quay lưng thì không còn mặt (miệng) trên màn hình');
    }
    for (const id of ['giao', 'bach', 'vong', 'loi']) assert.equal(r[id].mouthFront, true, id + ': quay mặt về phía người xem thì thấy miệng');
    // Hai nhân vật khác nhau thì hình khác nhau (không dùng chung một khuôn).
    assert.ok(new Set(Object.values(r).map((x) => x.keys.join(','))).size === 11, 'mỗi nhân vật có bộ khối riêng');
    await context.close();
  }

  // 4a. Hoạt họa chạy thật (hình ngoài màn hình thì nghỉ, cuộn tới mới chạy); hình nhỏ vẽ nửa nhịp.
  {
    const { context, page } = await h.open(1440, { workspace: seed() });
    await h.show(page, 'growth');
    await page.waitForSelector('.gr-route-foe svg.gr-foe .gr-world > *');
    const sample = (id) => page.evaluate((x) => {
      const s = document.querySelector('.gr-route-foe[data-foe=' + x + '] svg.gr-foe');
      return [s.querySelector('[data-k=head]')?.getAttribute('cy'), s.querySelector('[data-k=handb]')?.getAttribute('cx'), s.querySelector('[data-k=handa]')?.getAttribute('cy')].join('/');
    }, id);
    for (const id of ['mien', 'loi', 'bach']) {
      await page.locator('.gr-route-foe[data-foe=' + id + ']').scrollIntoViewIfNeeded();
      await wait(500);
      const a = await sample(id);
      await wait(900);
      const b = await sample(id);
      assert.notEqual(a, b, id + ': thân và tay chuyển động theo thời gian (' + a + ' → ' + b + ')');
    }
    const live = await page.evaluate(() => [...zenRig.live].filter((i) => i.foe && i.every !== undefined).map((i) => [i.foe, i.every]));
    assert.ok(live.length >= 3, 'các nhân vật đang hiện trong khung Huyết Nguyệt lộ chạy hoạt họa (' + live.length + ')');
    assert.ok(live.every(([, e]) => e === 2), 'hình nhỏ trong danh sách chỉ vẽ nửa số khung: ' + JSON.stringify(live));
    await context.close();
  }

  // 4b. Giảm chuyển động: một khung đứng yên, không vòng lặp, vẫn là hình 3D đủ khối.
  {
    const { context, page } = await h.open(820, { touch: true, workspace: seed(), reducedMotion: 'reduce' });
    await h.show(page, 'growth');
    await page.waitForSelector('.gr-route-foe svg.gr-foe .gr-world > *');
    const snap = () => page.evaluate(() => [...document.querySelectorAll('.gr-route-foe svg.gr-foe')].map((s) => s.querySelector('[data-k=head]')?.getAttribute('cy') + '/' + s.querySelectorAll('.gr-world > *').length));
    const a = await snap();
    await wait(1500);
    const b = await snap();
    assert.deepEqual(a, b, 'giảm chuyển động: phe ác đứng yên');
    assert.equal(a.length, 11, 'đủ mười một hình');
    assert.ok(a.every((x) => Number(x.split('/')[1]) >= 60), 'giảm chuyển động: vẫn là hình 3D đủ khối: ' + a.join(' '));
    assert.equal(await page.evaluate(() => [...zenRig.live].filter((i) => i.foe).length), 0, 'giảm chuyển động: không có vòng lặp hoạt họa cho phe ác');
    await context.close();
  }

  // 5. Ba cỡ màn hình: khung Huyết Nguyệt lộ và khung đọc truyện.
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'growth');
    await page.waitForSelector('.gr-route-panel');
    await page.waitForSelector('.gr-route-foe svg.gr-foe .gr-world > *');
    await wait(300);
    const route = await page.evaluate(() => [...document.querySelectorAll('.gr-route-foe')].map((li) => {
      const s = li.querySelector('svg.gr-foe'), art = li.querySelector('.gr-route-art').getBoundingClientRect(), r = s.getBoundingClientRect();
      return { id: li.dataset.foe, shapes: s.querySelectorAll('.gr-world > *').length, view: s.getAttribute('viewBox'), label: s.getAttribute('aria-label'), grads: s.querySelectorAll('defs radialGradient').length, inside: r.left >= art.left - 1 && r.right <= art.right + 1, w: Math.round(r.width) };
    }));
    assert.equal(route.length, 11, 'mười một đối thủ trên lộ' + at);
    route.forEach((x) => {
      assert.ok(x.shapes >= 60, x.id + ': hình 3D đủ khối trong khung lộ (' + x.shapes + ')' + at);
      assert.ok(x.grads >= 3, x.id + ': có dải màu xuyên tâm' + at);
      assert.equal(x.view, '0 0 200 232', x.id + ': giữ khổ vẽ' + at);
      assert.ok(x.label && x.label.includes(' · '), x.id + ': giữ nhãn đọc (danh hiệu, tên, tà công)' + at);
      assert.equal(x.inside, true, x.id + ': hình nằm trong ô tranh' + at);
    });
    // Khung đọc: chương gặp Miên Hồ, trang Miên Hồ nói thì thấy Miên Hồ 3D lớn.
    await page.click('.gr-route-foe[data-foe=mien] button');
    await page.waitForSelector('dialog.gr-story[open]');
    let seen = null;
    for (let i = 0; i < 14 && !seen; i++) {
      seen = await page.evaluate(() => {
        const d = document.querySelector('dialog.gr-story[open]');
        if (d.querySelector('.gr-story-who')?.textContent !== 'Thụy Nguyệt Sứ Miên Hồ') return null;
        const s = d.querySelector('.gr-story-foe svg.gr-foe'), st = d.querySelector('.gr-story-stage').getBoundingClientRect(), r = s.getBoundingClientRect();
        return { foe: s.dataset.foe, shapes: s.querySelectorAll('.gr-world > *').length, w: Math.round(r.width), inside: r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1 };
      });
      if (!seen) await page.keyboard.press('ArrowRight');
    }
    assert.ok(seen, 'có trang Miên Hồ nói' + at);
    await wait(400);
    const big = await page.evaluate(() => {
      const s = document.querySelector('dialog.gr-story[open] .gr-story-foe svg.gr-foe'), inst = [...zenRig.live].find((i) => i.svg === s);
      return { shapes: s.querySelectorAll('.gr-world > *').length, every: inst ? inst.every || 1 : 0 };
    });
    assert.equal(seen.foe, 'mien', 'trang Miên Hồ vẽ Miên Hồ' + at);
    assert.ok(seen.shapes >= 60 && big.shapes >= 60, 'hình lớn trong khung đọc là 3D đủ khối (' + seen.shapes + '/' + big.shapes + ')' + at);
    assert.equal(seen.inside, true, 'hình nằm trong sân khấu của khung đọc' + at);
    assert.equal(big.every, 1, 'hình lớn trong khung đọc vẽ đủ nhịp' + at);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.gr-story'));
    await wait(200);
    assert.equal(await page.evaluate(() => [...zenRig.live].filter((i) => i.foe && !i.svg.isConnected).length), 0, 'đóng khung đọc: hình đã gỡ khỏi vòng lặp' + at);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('growth-foe3d-browser: ok');
} finally {
  await h.close();
}
