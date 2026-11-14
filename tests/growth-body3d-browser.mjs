// v2.15.0 (Thân Pháp): nhân vật dựng bằng lõi 3D (growth-rig.js). Kiểm tra: hình có chiều sâu thật (mặt xoay khi quay lưng, camera nghiêng
// theo con trỏ), hoạt họa chạy khi cho phép và đứng yên khi giảm chuyển động, các thức thái cực/luyện kiếm/tọa thiền đổi đúng nhịp,
// hư/thực dưới chân theo trọng tâm, hơi thở nâng hạ thân. Ở 390 (chạm), 820, 1440 px: không tràn ngang, nhân vật nằm trong sân khấu.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const seed = (hero = 'nam') => () => {
  const p = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4);
  return { schema: 1, projects: [p], notes: [], growth: { v: 1, hero, since: '2026-11-01', log: [{ id: 'l1', d: '2026-11-02', s: 'task', k: 'task:o1', n: 'Việc cũ', p: [2, 1, 1, 0, 2, 1, 1, 0] }] } };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, tries = 80) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá thời gian chờ: ' + label);
}
const attr = (page, key, name) => page.evaluate(([k, n]) => document.querySelector('#gr-figure svg.gr-hero:not(.is-leave) [data-k="' + k + '"]')?.getAttribute(n), [key, name]);
const pick = async (page, pose) => {
  await page.click('[data-gr-pose="' + pose + '"]');
  await page.waitForFunction((p) => document.querySelector('#gr-figure svg.gr-hero:not(.is-leave)')?.dataset.pose === p, pose);
};
// Dựng một khung theo thời điểm chỉ định (không chạy vòng lặp): trả danh sách khóa khối và vài thông số.
const frameAt = (page, hero, pose, t) =>
  page.evaluate(([h, p, tt]) => {
    const inst = zenHero.makeHero(h, p);
    inst.cam.yaw = inst.cam.ty = -14;
    inst.t = tt - 1.2;
    for (let i = 0; i < 72; i++) inst.advance(1 / 60, { x: 0, y: 0 }, true);
    const sc = inst.frame(), by = {};
    sc.ops.forEach((o) => (by[o.k] = o));
    return { keys: Object.keys(by), op: (k) => null, torso: by.torsod?.a.points || '', weights: ['wa', 'wb'].map((k) => (by[k]?.inner || '').match(/fill-opacity="([0-9.]+)"/)?.[1]), t: inst.t };
  }, [hero, pose, t]);

const h = await startHarness({ seed: seed('nam') });
try {
  // 0. Dữ liệu thức: liền mạch, đủ tên.
  {
    const { context, page } = await h.open(1440, { workspace: seed('nam')() });
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-figure svg.gr-hero');
    const seq = await page.evaluate(() => ({ s: zenHero.SEQ, d: { taichi: 38, martial: 16, zen: 8 } }));
    assert.equal(seq.s.taichi.length, 8, 'Thái cực có tám thức');
    assert.deepEqual(seq.s.taichi.map((f) => f.name), ['Khởi thế', 'Dã mã phân tông', 'Bạch hạc lượng sí', 'Lâu tất ao bộ', 'Vân thủ', 'Đơn tiên', 'Kim kê độc lập', 'Thu thế']);
    for (const k of ['taichi', 'martial', 'zen']) {
      const L = seq.s[k];
      assert.equal(L[0].from, 0, k + ' bắt đầu từ 0');
      assert.equal(L.at(-1).to, seq.d[k], k + ' khép đúng vòng lặp');
      L.forEach((f, i) => {
        if (i) assert.equal(f.from, L[i - 1].to, k + ': các thức nối liền');
        assert.ok(f.tip.length > 20 && f.han, k + ': thức có ý quyết và chữ Hán');
      });
    }
    assert.equal(await page.evaluate(() => [zenHero.formAt('taichi', 20).name, zenHero.formAt('taichi', 20 + 38).name, zenHero.formAt('talk', 3)].join('|')), 'Vân thủ|Vân thủ|', 'tra thức theo thời gian, lặp vòng, Đàm tiếu không có thức');
    await context.close();
  }

  // 1. Hình dựng đủ khối, đủ tư thế, hai nhân vật, ba cỡ màn hình.
  for (const hero of ['nam', 'nu']) {
    for (const [width, touch] of [[390, true], [820, false], [1440, false]]) {
      const at = ' (' + hero + ', ' + width + 'px)';
      const { context, page } = await h.open(width, { touch, workspace: seed(hero)() });
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      for (const pose of ['talk', 'martial', 'taichi', 'zen']) {
        await pick(page, pose);
        await page.waitForFunction(() => !document.querySelector('#gr-figure svg.is-leave'));
        await page.waitForTimeout(300);
        const info = await page.evaluate(() => {
          const s = document.querySelector('#gr-figure svg.gr-hero:not(.is-leave)'), st = document.querySelector('.gr-stage-bg').getBoundingClientRect(), r = s.getBoundingClientRect();
          return {
            shapes: s.querySelectorAll('.gr-world > *').length, grads: s.querySelectorAll('defs radialGradient').length, label: s.getAttribute('aria-label'),
            inside: r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1,
            form: document.querySelector('#gr-form'), formHidden: document.querySelector('#gr-form').hidden, formText: document.querySelector('#gr-form').textContent.trim(),
            wide: document.documentElement.scrollWidth <= innerWidth, live: [...zenRig.live].filter((i) => i.svg.closest('#gr-figure')).length,
          };
        });
        assert.ok(info.shapes >= 80, pose + ': đủ khối 3D (' + info.shapes + ')' + at);
        assert.ok(info.grads >= 3, pose + ': có dải màu xuyên tâm cho khối cầu' + at);
        assert.ok(/Thiếu hiệp|Nữ hiệp/.test(info.label), pose + ': giữ nhãn truy cập' + at);
        assert.equal(info.inside, true, pose + ': nhân vật nằm trong sân khấu' + at);
        assert.equal(info.wide, true, pose + ': không tràn ngang' + at);
        assert.equal(info.formHidden, pose === 'talk', pose + ': chú giải thức chỉ ẩn ở Đàm tiếu' + at);
        if (pose !== 'talk') assert.ok(info.formText.length > 20, pose + ': có tên thức và ý quyết' + at);
        assert.equal(info.live, 1, 'chỉ hình hiện tại chạy hoạt họa, hình cũ đã gỡ khỏi vòng lặp' + at);
      }
      await context.close();
    }
  }

  // 2. Hoạt họa chạy thật khi cho phép chuyển động; chiều sâu: camera nghiêng theo con trỏ.
  {
    const { context, page } = await h.open(1440, { workspace: seed('nam')() });
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-figure svg.gr-hero');
    await pick(page, 'taichi');
    await page.mouse.move(40, 400);
    await wait(1300);
    const a = { hand: await attr(page, 'handb', 'cx'), head: await attr(page, 'head', 'cy'), taiji: await attr(page, 'taiji', 'transform') };
    await wait(1500);
    const b = { hand: await attr(page, 'handb', 'cx'), head: await attr(page, 'head', 'cy') };
    assert.ok(Math.abs(a.hand - b.hand) + Math.abs(a.head - b.head) > 0.4, 'thân và tay chuyển động theo thời gian (' + JSON.stringify([a, b]) + ')');
    await page.mouse.move(1400, 400);
    await wait(1600);
    const c = await attr(page, 'taiji', 'transform');
    assert.notEqual(a.taiji, c, 'con trỏ chuyển sang phải thì camera quay, đồ âm dương sau lưng đổi hình chiếu');
    await context.close();
  }

  // 3. Giảm chuyển động: dựng một khung đứng yên, vòng lặp không chạy; vẫn có chú giải thức.
  {
    const { context, page } = await h.open(820, { workspace: seed('nu')(), reducedMotion: 'reduce' });
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-figure svg.gr-hero');
    await pick(page, 'taichi');
    await wait(600);
    const a = await attr(page, 'handb', 'cx'), live = await page.evaluate(() => zenRig.live.size);
    await wait(1600);
    const b = await attr(page, 'handb', 'cx');
    assert.equal(a, b, 'giảm chuyển động: nhân vật đứng yên');
    assert.equal(live, 0, 'giảm chuyển động: không có vòng lặp hoạt họa');
    assert.ok((await page.locator('#gr-form').textContent()).includes('Lâu tất ao bộ'), 'giảm chuyển động: chú giải thức theo khung đứng yên');
    await context.close();
  }

  // 4. Chiều sâu thật: quay lưng thì mặt biến mất, tóc sau hiện ra; hư/thực theo trọng tâm; hơi thở nâng hạ thân.
  {
    const { context, page } = await h.open(1440, { workspace: seed('nam')() });
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-figure svg.gr-hero');
    const front = await frameAt(page, 'nam', 'martial', 0), back = await frameAt(page, 'nam', 'martial', 10.4);
    assert.ok(front.keys.includes('eyeA') && front.keys.includes('eyeB') && front.keys.includes('mouth'), 'quay mặt về phía người xem thì thấy mắt và miệng');
    assert.ok(!back.keys.includes('eyeA') && !back.keys.includes('mouth'), 'xoay người trọn vòng: lúc quay lưng không còn mặt trên màn hình');
    assert.ok(back.keys.includes('hairBack') && back.keys.includes('tail'), 'quay lưng thì thấy mái tóc và đuôi tóc sau đầu');
    const crane = await frameAt(page, 'nam', 'taichi', 11.5), rooster = await frameAt(page, 'nam', 'taichi', 32);
    assert.ok(crane.weights[1] > crane.weights[0] + 0.15, 'Bạch hạc lượng sí: chân sau thực, chân trước hư (' + crane.weights + ')');
    assert.ok(rooster.weights[0] > rooster.weights[1] + 0.2, 'Kim kê độc lập: chân trụ thực, chân nhấc hư (' + rooster.weights + ')');
    const inhale = await frameAt(page, 'nam', 'zen', 4), exhale = await frameAt(page, 'nam', 'zen', 0);
    assert.notEqual(inhale.torso, exhale.torso, 'tọa thiền: hít vào và thở ra làm thân nở/xẹp');
    await context.close();
  }

  // 5. Chú giải thức đổi theo nhịp luyện (thái cực bắt đầu ở thức Lâu tất ao bộ, sau ~2 giây sang Vân thủ).
  {
    const { context, page } = await h.open(820, { workspace: seed('nam')() });
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-figure svg.gr-hero');
    await pick(page, 'taichi');
    assert.ok((await page.locator('#gr-form strong').textContent()).includes('Lâu tất ao bộ'), 'vào Thái cực: bắt đầu ở thức Lâu tất ao bộ');
    await until(async () => (await page.locator('#gr-form strong').textContent()).includes('Vân thủ'), 'sang thức Vân thủ', 90);
    await pick(page, 'zen');
    assert.ok((await page.locator('#gr-form strong').textContent()).match(/Hít vào|Thở ra/), 'Tọa thiền: có nhịp hít thở');
    await pick(page, 'talk');
    assert.equal(await page.locator('#gr-form').isHidden(), true, 'Đàm tiếu: không có chú giải thức');
    await context.close();
  }
} finally {
  await h.close();
}
console.log('growth-body3d-browser: ok');
