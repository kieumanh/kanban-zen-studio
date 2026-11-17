// Hồi quy v2.21.0 (Kiếm Ảnh Trở Về): hiệp khách và phe ác trở lại tranh vẽ 2D như trước v2.15.0. Bản dựng 3D (growth-rig.js) hiển thị lỗi
// và người dùng thấy bản 2D đẹp hơn; hai bài kiểm riêng của lõi 3D (growth-body3d, growth-foe3d) bỏ cùng lõi, bài này giữ chốt chặn cho bản 2D.
//  1. Không còn lõi 3D: Worker không phát /growth-rig.js, trang không có window.zenRig, zenHero không còn formAt/makeHero, không có dòng chú giải thức.
//  2. Hiệp khách (nam, nữ) ở bốn tư thế là SVG phẳng khổ 0 0 200 232 có nhãn đọc, không canvas, không khối 3D (data-k); hoạt họa chạy bằng CSS.
//  3. Mười một nhân vật phe ác cũng là SVG phẳng cùng khổ, hoạt họa CSS; giảm chuyển động thì cả hai đều đứng yên.
//  4. Ở 390 (chạm), 820 (chạm), 1440 px: sân khấu có đủ nhân vật, nhân vật nằm gọn trong sân khấu, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
// 60 nửa điểm = 30 điểm: cấp 22, đã qua Miên Hồ, Thiên Diện, Lôi Tốc.
const seed = (hero) => () => ({ schema: 1, projects: [], notes: [], growth: { v: 1, hero, name: 'Lam Y', since: day(-40), log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p: [60, 0, 0, 0, 0, 0, 0, 0] }] } });
const POSES = ['talk', 'martial', 'taichi', 'zen'];

// Dựng các hình vào trang (để CSS áp dụng) rồi báo từng hình: khổ, vai trò, khối 3D, canvas, có chuyển động không.
const probe = (page, kind) =>
  page.evaluate(
    ([k, poses]) => {
      const html = k === 'hero' ? ['nam', 'nu'].flatMap((h) => poses.map((p) => zenHero.svg(h, p))) : zenFoe.IDS.map((id) => zenFoe.svg(id));
      const box = document.createElement('div');
      box.id = 'probe';
      box.innerHTML = html.join('');
      document.body.append(box);
      const out = [...box.querySelectorAll('svg')].map((s) => ({
        cls: s.getAttribute('class'),
        view: s.getAttribute('viewBox'),
        role: s.getAttribute('role'),
        label: s.getAttribute('aria-label') || '',
        solids: s.querySelectorAll('[data-k]').length,
        canvas: s.querySelectorAll('canvas, foreignObject, image').length,
        moving: [...s.querySelectorAll('*')].filter((el) => getComputedStyle(el).animationName !== 'none').length,
      }));
      box.remove();
      return out;
    },
    [kind, POSES],
  );

const h = await startHarness({ seed: seed('nu') });
try {
  // 1. Không còn lõi 3D.
  {
    const r = await worker.fetch(new Request('http://localhost/growth-rig.js'));
    assert.ok(!(await r.text()).includes('zenRig'), 'Worker không còn phát lõi 3D growth-rig.js');
    const { context, page } = await h.open(1440, { workspace: seed('nam')() });
    await h.show(page, 'growth');
    const three = await page.evaluate(() => ({
      rig: typeof window.zenRig,
      script: !!document.querySelector('script[src*="growth-rig"]'),
      formAt: typeof zenHero.formAt,
      make: typeof zenHero.makeHero,
      caption: !!document.querySelector('#gr-form'),
      api: Object.keys(zenHero).sort().join(','),
    }));
    assert.deepEqual([three.rig, three.script, three.formAt, three.make, three.caption], ['undefined', false, 'undefined', 'undefined', false], 'không còn dấu vết lõi 3D');
    assert.equal(three.api, 'POSES,scene,svg', 'zenHero chỉ còn svg, scene, POSES');

    // 2. Hiệp khách: nam và nữ ở bốn tư thế.
    const heroes = await probe(page, 'hero');
    assert.equal(heroes.length, 8, 'hai hiệp khách x bốn tư thế');
    for (const s of heroes) {
      assert.equal(s.cls, 'gr-hero', 'là hình hiệp khách');
      assert.equal(s.view, '0 0 200 232', 'khổ 0 0 200 232');
      assert.equal(s.role, 'img', 'có vai trò hình');
      assert.match(s.label, /^(Thiếu hiệp|Nữ hiệp) · (Đàm tiếu|Luyện kiếm|Thái cực|Tọa thiền)$/, 'nhãn đọc gồm người và thế: ' + s.label);
      assert.equal(s.solids, 0, 'không có khối 3D (data-k): ' + s.label);
      assert.equal(s.canvas, 0, 'không canvas, ảnh ngoài hay foreignObject: ' + s.label);
      assert.ok(s.moving > 0, 'hoạt họa CSS đang chạy: ' + s.label);
    }

    // 3. Phe ác: mười một nhân vật.
    const foes = await probe(page, 'foe');
    assert.equal(foes.length, 11, 'đủ mười một nhân vật phe ác');
    for (const s of foes) {
      assert.equal(s.cls, 'gr-foe', 'là hình phe ác');
      assert.equal(s.view, '0 0 200 232', 'cùng khổ với hiệp khách: ' + s.label);
      assert.equal(s.solids, 0, 'không có khối 3D (data-k): ' + s.label);
      assert.equal(s.canvas, 0, 'không canvas, ảnh ngoài hay foreignObject: ' + s.label);
      assert.ok(s.moving > 0, 'hoạt họa CSS đang chạy: ' + s.label);
    }
    await context.close();

    // Giảm chuyển động: cả hai đứng yên.
    const still = await h.open(390, { touch: true, reducedMotion: 'reduce', workspace: seed('nu')() });
    await h.show(still.page, 'growth');
    for (const kind of ['hero', 'foe']) {
      const calm = await probe(still.page, kind);
      assert.deepEqual(calm.filter((s) => s.moving > 0).map((s) => s.label), [], 'giảm chuyển động: ' + kind + ' đứng yên');
    }
    await still.context.close();
  }

  // 4. Sân khấu ở ba khổ, cả hai hiệp khách.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const hero of ['nam', 'nu']) {
      const at = ` (${width}px, ${hero})`;
      const { context, page } = await h.open(width, { touch, workspace: seed(hero)() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'growth');
      await page.waitForSelector('#gr-figure svg.gr-hero');
      const m = await page.evaluate(() => {
        const stage = document.querySelector('.gr-stage-bg').getBoundingClientRect();
        const fig = document.querySelector('#gr-figure svg.gr-hero').getBoundingClientRect();
        return {
          inside: fig.left >= stage.left - 0.5 && fig.right <= stage.right + 0.5 && fig.top >= stage.top - 0.5 && fig.bottom <= stage.bottom + 0.5,
          h: fig.height,
          overflow: document.documentElement.scrollWidth - innerWidth,
          chips: [...document.querySelectorAll('.gr-chip')].map((n) => n.textContent),
        };
      });
      assert.ok(m.inside, 'nhân vật nằm gọn trong sân khấu' + at);
      assert.ok(m.h >= 150, 'nhân vật đủ lớn để nhìn (' + Math.round(m.h) + 'px)' + at);
      assert.ok(m.overflow <= 0, 'không tràn ngang' + at);
      assert.deepEqual(m.chips, ['Tùy hứng', 'Đàm tiếu', 'Luyện kiếm', 'Thái cực', 'Tọa thiền'], 'đủ nút chọn tư thế' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }
  console.log('growth-art2d-browser: ok');
} finally {
  await h.close();
}
