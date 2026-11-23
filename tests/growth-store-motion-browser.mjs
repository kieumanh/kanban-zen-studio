// v2.57.0: chuyển động của bà chủ Liễu Linh Lung trong Tàng Bảo Các. Tranh chia thành nền tĩnh + các lớp SVG nhỏ (đèn lồng, tóc, thân, đầu, mí mắt, hạt ngọc,
// quạt, khói trà) chỉ đổi rotate / translate / scale / opacity để chạy trên bộ ghép lớp. Kiểm tra: lớp khớp đúng vị trí ở 390 / 820 / 1440 px, thứ tự chồng
// lớp, mọi hoạt họa chỉ dùng thuộc tính ghép lớp và gắn vào lớp (không gắn vào phần tử con trong SVG), chớp mắt, bà chủ phản ứng khi được hỏi, giảm chuyển động
// thì đứng yên hoàn toàn.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const rich = () => ({ schema: 1, projects: [], notes: [], growth: { v: 1, hero: 'nu', name: 'Lam Y', since: day(-200), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [240, 600, 160, 90, 520, 820, 300, 190] }], spend: [] } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// v2.83.0: “Hỏi bà chủ” mở hộp thông tin giá trị món; cử động của bà chủ vẫn chạy phía sau, nên chỉ cần đóng hộp để hỏi tiếp.
async function closeAskDialog(page) {
  await page.waitForSelector('#gr-store-ask[open]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#gr-store-ask', { state: 'detached' });
}
const COMPOSITOR = new Set(['rotate', 'scale', 'translate', 'opacity', 'offset', 'composite', 'easing', 'computedOffset']);
// Đưa mọi hoạt họa của tranh về đúng thời điểm t (ms) rồi giữ nguyên.
const freezeAt = (page, t) =>
  page.evaluate((ms) => {
    const sc = document.querySelector('.gr-st-scene');
    for (const a of document.getAnimations()) if (a.effect?.target && sc.contains(a.effect.target)) { a.pause(); a.currentTime = ms; }
  }, t);

const h = await startHarness({ seed: rich });
try {
  for (const width of [390, 820, 1440]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch: width < 700, workspace: rich() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    // Đo vị trí lúc đứng yên (hộp bao đã xoay thì không còn khớp viewBox); gỡ lại sau khi đo.
    const still = await page.addStyleTag({ content: '.gr-st-scene,.gr-st-scene *{animation:none!important}' });
    const info = await page.evaluate(() => {
      const sc = document.querySelector('.gr-st-scene'), sr = sc.getBoundingClientRect();
      const layers = [...sc.querySelectorAll('svg.gr-st-layer')].map((l) => {
        const r = l.getBoundingClientRect(), vb = l.viewBox.baseVal;
        // Hộp mong đợi: viewBox của lớp quy theo khung cảnh 420×260 (lớp lồng trong đầu thì quy theo hộp đầu).
        return { cls: l.getAttribute('class'), x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height, vb: [vb.x, vb.y, vb.width, vb.height], hidden: l.getAttribute('aria-hidden') };
      });
      const order = [...sc.querySelectorAll('.gr-st-base, .gr-st-layer')].map((n) => (n.getAttribute('class') || '').split(' ').filter((c) => /^gr-st-(base|lamp|hair|body|part|beads|lids|fan|front|steam)$/.test(c))[0]);
      return { sw: sr.width, sh: sr.height, layers, order, role: sc.getAttribute('role'), imgs: sc.querySelectorAll('[role=img]').length, over: document.documentElement.scrollWidth <= innerWidth };
    });
    assert.ok(Math.abs(info.sw / info.sh - 420 / 260) < 0.01, 'khung cảnh giữ tỉ lệ 420:260' + at);
    assert.equal(info.over, true, 'không tràn ngang' + at);
    assert.equal(info.role, 'img');
    assert.equal(info.imgs, 0, 'chỉ một hình đọc được cho trình đọc màn hình' + at);
    assert.ok(info.layers.length === 13, 'có đủ các lớp chuyển động' + at);
    const scale = info.sw / 420;
    for (const l of info.layers) {
      assert.equal(l.hidden, 'true', 'lớp ẩn khỏi trình đọc màn hình: ' + l.cls + at);
      if (/gr-st-(beads|lids)/.test(l.cls)) continue; // lớp lồng trong đầu: vị trí kiểm qua hộp đầu bên dưới
      assert.ok(Math.abs(l.x - l.vb[0] * scale) < 1 && Math.abs(l.y - l.vb[1] * scale) < 1, 'lớp ' + l.cls + ' đặt đúng chỗ' + at);
      assert.ok(Math.abs(l.w - l.vb[2] * scale) < 1 && Math.abs(l.h - l.vb[3] * scale) < 1, 'lớp ' + l.cls + ' đúng kích thước' + at);
    }
    const nested = info.layers.filter((l) => /gr-st-(beads|lids)/.test(l.cls));
    assert.equal(nested.length, 2);
    for (const l of nested) {
      assert.ok(Math.abs(l.x - l.vb[0] * scale) < 1 && Math.abs(l.y - l.vb[1] * scale) < 1, 'lớp lồng ' + l.cls + ' trùng tọa độ cảnh' + at);
      assert.ok(Math.abs(l.w - l.vb[2] * scale) < 1 && Math.abs(l.h - l.vb[3] * scale) < 1, 'lớp lồng ' + l.cls + ' đúng kích thước' + at);
    }
    await still.evaluate((el) => el.remove());
    // Thứ tự chồng lớp: nền < đèn < tóc sau < thân < đầu (mặt, hạt, mí) < quạt < quầy < khói trà.
    const order = info.order.join(',');
    assert.match(order, /^gr-st-base,(gr-st-lamp,){4}gr-st-hair,gr-st-body,gr-st-part,gr-st-beads,gr-st-lids,gr-st-fan,gr-st-front,gr-st-steam,gr-st-steam$/, 'thứ tự lớp: ' + order + at);

    // Hoạt họa: chỉ thuộc tính ghép lớp, gắn vào lớp/khung (không gắn vào phần tử con của SVG).
    const anim = await page.evaluate(() => {
      const sc = document.querySelector('.gr-st-scene');
      return document.getAnimations().filter((a) => a.effect?.target && sc.contains(a.effect.target)).map((a) => ({
        name: a.animationName,
        tag: a.effect.target.tagName.toLowerCase(),
        inside: !!a.effect.target.ownerSVGElement,
        props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))],
        dur: a.effect.getTiming().duration,
      }));
    });
    assert.ok(anim.length >= 12, 'đủ hoạt họa (đèn, thở, tóc, đầu, mí, quạt, khói…): ' + anim.length + at);
    for (const a of anim) {
      assert.equal(a.inside, false, a.name + ' không gắn vào phần tử con trong SVG' + at);
      for (const p of a.props) assert.ok(COMPOSITOR.has(p), a.name + ' chỉ đổi thuộc tính ghép lớp, gặp ' + p + at);
    }
    const names = new Set(anim.map((a) => a.name));
    for (const n of ['gr-st-sway', 'gr-st-steam', 'gr-st-breath', 'gr-st-chest', 'gr-st-hair', 'gr-st-head', 'gr-st-bob', 'gr-st-blink', 'gr-st-fan']) assert.ok(names.has(n), 'có hoạt họa ' + n + at);
    assert.ok(new Set(anim.map((a) => a.dur)).size >= 6, 'các chu kỳ lệch nhau, không lặp đều như máy' + at);

    // Chớp mắt: mí mắt ẩn lúc đầu, khép ở ~3,7 giây, rồi mở; chớp đôi ở ~7,8 giây.
    const lid = (t) => freezeAt(page, t).then(() => page.evaluate(() => +getComputedStyle(document.querySelector('.gr-st-lids')).opacity));
    assert.equal(await lid(0), 0, 'mắt mở lúc đầu' + at);
    assert.equal(await lid(3700), 1, 'chớp lần một' + at);
    assert.equal(await lid(5000), 0, 'mắt mở lại' + at);
    assert.equal(await lid(7700), 1, 'chớp đôi, nhịp một' + at);
    assert.ok((await lid(7860)) < 0.2, 'chớp đôi, nhịp nghỉ giữa hai lần' + at);
    assert.equal(await lid(7940), 1, 'chớp đôi, nhịp hai' + at);
    // Đầu thật sự nghiêng, tóc nghiêng lệch pha (theo sau đầu).
    const rot = (t, sel) => freezeAt(page, t).then(() => page.evaluate((s) => getComputedStyle(document.querySelector(s)).rotate, sel));
    assert.notEqual(await rot(0, '.gr-st-head'), await rot(3700, '.gr-st-head'), 'đầu đổi góc theo thời gian' + at);
    assert.notEqual(await rot(3700, '.gr-st-head'), await rot(3700, '.gr-st-hair'), 'tóc lệch pha với đầu' + at);
    await context.close();
  }

  // Phản ứng khi được hỏi: gật đầu, phe phẩy quạt; lớp is-talk tự gỡ; hỏi liên tiếp thì chạy lại từ đầu.
  {
    const { context, page } = await h.open(1440, { workspace: rich() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    const talk = () => page.evaluate(() => ({ on: document.querySelector('.gr-st-scene').classList.contains('is-talk'), anims: document.getAnimations().filter((a) => ['gr-st-nod', 'gr-st-fanwave'].includes(a.animationName)).map((a) => a.animationName).sort() }));
    assert.deepEqual(await talk(), { on: false, anims: [] }, 'chưa hỏi thì chưa phản ứng');
    await page.click('[data-gr-shop-ask="tro"]');
    await closeAskDialog(page); // v2.83.0: hộp thông tin giá trị mở ra, đóng lại để hỏi món kế
    assert.deepEqual(await talk(), { on: true, anims: ['gr-st-fanwave', 'gr-st-nod'] }, 'hỏi xong bà chủ gật đầu và phe phẩy quạt');
    await wait(700);
    await page.click('[data-gr-shop-ask="son"]');
    await closeAskDialog(page);
    await wait(1000);
    assert.equal((await talk()).on, true, 'hỏi tiếp thì kéo dài thêm, không bị gỡ sớm');
    await wait(900);
    assert.deepEqual(await talk(), { on: false, anims: [] }, 'cử động xong thì tự gỡ');
    await context.close();
  }

  // Giảm chuyển động: không hoạt họa nào, mí mắt ẩn, hỏi bà chủ cũng không cử động.
  {
    const { context, page } = await h.open(390, { touch: true, reducedMotion: 'reduce', workspace: rich() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    const count = () => page.evaluate(() => { const sc = document.querySelector('.gr-st-scene'); return document.getAnimations().filter((a) => a.effect?.target && sc.contains(a.effect.target)).length; });
    assert.equal(await count(), 0, 'giảm chuyển động: không hoạt họa nào');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.gr-st-lids')).opacity), '0', 'mí mắt không che mắt khi đứng yên');
    await page.click('[data-gr-shop-ask="tro"]');
    await closeAskDialog(page);
    assert.equal(await count(), 0, 'hỏi bà chủ cũng không cử động khi giảm chuyển động');
    await context.close();
  }

  // Chân dung nhỏ cạnh lời tư vấn vẫn đủ hạt ngọc ở trâm và không có mí mắt chồng.
  {
    const { context, page } = await h.open(820, { workspace: rich() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    assert.equal(await page.locator('.gr-store-face svg.gr-st-face circle[fill="#7fd0b0"]').count(), 1, 'chân dung có hạt ngọc xanh');
    assert.equal(await page.locator('.gr-store-face svg.gr-st-face .gr-st-lids').count(), 0);
    await context.close();
  }
} finally {
  await h.close();
}
console.log('growth store motion browser ok');
