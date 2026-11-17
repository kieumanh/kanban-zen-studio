// Hồi quy v2.22.0 (Sinh Khí): hiệp khách 2D sống động hơn nhưng vẫn là tranh vẽ phẳng (không 3D, không canvas, không thư viện ngoài).
//  1. Cấu trúc: mọi hình có thân (gr-torso) và mày (gr-brows); mắt mở có tròng mắt (gr-gaze) tách khỏi mí để liếc được; chỉ cười nói mới có miệng.
//  2. Nhịp tự nhiên: chớp mắt không đều (có cặp chớp liền nhau, có quãng nghỉ dài), thỉnh thoảng liếc trái rồi liếc phải rất chậm,
//     miệng nói thành cụm rồi nghỉ (không đóng mở đều như máy), mày nhướn theo lời nói, ngực nhấp nhô nhẹ trừ tọa thiền, hiện hình có độ nảy.
//  3. Ngân sách: mỗi hình chạy không quá 20 hoạt họa CSS.
//  4. Nhìn theo con trỏ (chuột, bút): đặt hai biến --gr-gx, --gr-gy trong [−1, 1] lên #gr-figure; mắt và đầu xoay đúng chiều, bị chặn ở biên,
//     bố cục không xê dịch một điểm ảnh nào; con trỏ rời cửa sổ hoặc cửa sổ mất tiêu điểm thì mắt về giữa; ngón tay (cảm ứng) không điều khiển được.
//  5. Chạm hay bấm vào nhân vật thì nhảy chào một lần (không chồng lên nhau khi bấm dồn), xong tự gỡ.
//  6. Giảm chuyển động: không hoạt họa nào, không đặt biến, không nhảy; kể cả hình dựng ngoài khung #gr-figure và khi biến đã bị đặt sẵn.
//  7. Ở 390, 820 và 1440 px: không lỗi trang, không tràn ngang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) =>
  new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
const seed = (hero) => () => ({
  schema: 1,
  projects: [],
  notes: [],
  growth: {
    v: 1,
    hero,
    name: 'Lam Y',
    since: day(-40),
    log: [
      {
        id: 'e1',
        d: day(-1),
        s: 'task',
        k: 'task:e1',
        n: 'Việc cũ',
        p: [60, 0, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
});
const POSES = ['talk', 'martial', 'taichi', 'zen'];

// Dựng từng hiệp khách (hai người x bốn thế) vào trang rồi đọc hoạt họa CSS đang chạy: tên, đích, thời lượng, từng khung.
const survey = (page) =>
  page.evaluate((poses) => {
    const nums = (s) =>
      (String(s || '').match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
    const scaleOf = (t) => {
      const s = String(t || '');
      let m = s.match(/matrix\(([^)]+)\)/);
      if (m) {
        const v = nums(m[1]);
        return [v[0], v[3]];
      }
      m = s.match(/scaleY\(([^)]+)\)/);
      if (m) return [1, nums(m[1])[0]];
      m = s.match(/scale\(([^)]+)\)/);
      if (m) {
        const v = nums(m[1]);
        return [v[0], v.length > 1 ? v[1] : v[0]];
      }
      return [1, 1];
    };
    const liftOf = (t) => {
      const s = String(t || '');
      const m = s.match(/translateY\((-?[\d.]+)px\)/);
      if (m) return Number(m[1]);
      const k = s.match(/matrix\(([^)]+)\)/);
      return k ? nums(k[1])[5] : 0;
    };
    const info = (a) => {
      const t = a.effect.getTiming();
      return {
        cls: a.effect.target.getAttribute('class'),
        duration: t.duration,
        direction: t.direction,
        infinite: t.iterations === Infinity,
        frames: a.effect.getKeyframes().map((k) => {
          const sc = scaleOf(k.transform);
          const sh = nums(k.translate);
          return {
            o: k.offset,
            sx: sc[0],
            sy: sc[1],
            lift: liftOf(k.transform),
            gx: sh[0] || 0,
            gy: sh[1] || 0,
          };
        }),
      };
    };
    const out = [];
    for (const hero of ['nam', 'nu']) {
      for (const pose of poses) {
        const box = document.createElement('div');
        box.className = 'probe';
        box.innerHTML = zenHero.svg(hero, pose);
        document.body.append(box);
        const svg = box.firstElementChild;
        const anims = svg.getAnimations({ subtree: true });
        const by = {};
        for (const a of anims)
          if (!by[a.animationName]) by[a.animationName] = info(a);
        out.push({
          hero,
          pose,
          count: anims.length,
          by,
          has: {
            torso: svg.querySelectorAll('.gr-torso').length,
            brows: svg.querySelectorAll('.gr-brows').length,
            eyes: svg.querySelectorAll('.gr-eyes').length,
            gaze: svg.querySelectorAll('.gr-eyes > .gr-gaze').length,
            mouth: svg.querySelectorAll('.gr-mouth').length,
            solids: svg.querySelectorAll(
              '[data-k], canvas, foreignObject, image',
            ).length,
          },
        });
        box.remove();
      }
    }
    return out;
  }, POSES);

// Đo mắt và đầu của hình hiện tại trên sân khấu: biến CSS, độ dịch của tròng mắt, góc nghiêng của đầu.
const look = (page) =>
  page.evaluate(() => {
    const fig = document.querySelector('#gr-figure');
    const svg = fig.querySelector('svg.gr-hero:not(.is-leave)');
    const gaze = svg.querySelector('.gr-gaze');
    const head = svg.querySelector('.gr-head');
    const tf = getComputedStyle(gaze).transform;
    const m = new DOMMatrix(tf === 'none' ? undefined : tf);
    const rot = parseFloat(getComputedStyle(head).rotate);
    return {
      gx: fig.style.getPropertyValue('--gr-gx'),
      gy: fig.style.getPropertyValue('--gr-gy'),
      tx: m.m41,
      ty: m.m42,
      rot: Number.isFinite(rot) ? rot : 0,
      hop: fig.classList.contains('is-hop'),
    };
  });

// Hộp của khung nhân vật, hình, sân khấu và cỡ trang: nhìn theo con trỏ không được làm bố cục xê dịch.
const layout = (page) =>
  page.evaluate(() => {
    const rect = (n) => {
      const r = n.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height].map(
        (v) => Math.round(v * 10) / 10,
      );
    };
    return {
      fig: rect(document.querySelector('#gr-figure')),
      svg: rect(document.querySelector('#gr-figure svg.gr-hero')),
      stage: rect(document.querySelector('.gr-stage-bg')),
      sw: document.documentElement.scrollWidth,
      sh: document.documentElement.scrollHeight,
      over: document.documentElement.scrollWidth - innerWidth,
    };
  });

// Điểm nhìn của nhân vật (đường mắt) và cỡ để chọn đích cho con trỏ.
const eyeLine = (page) =>
  page.evaluate(() => {
    const r = document.querySelector('#gr-figure').getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height * 0.36,
      w: r.width,
      h: r.height,
      vw: innerWidth,
      vh: innerHeight,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
    };
  });

const open = async (h, width, opts = {}) => {
  const ctx = await h.open(width, {
    workspace: seed(opts.hero || 'nu')(),
    ...opts,
  });
  const errors = [];
  ctx.page.on('pageerror', (e) => errors.push(String(e)));
  await h.show(ctx.page, 'growth');
  await ctx.page.waitForSelector('#gr-figure svg.gr-hero');
  // Ghim tư thế cười nói để hình không tự đổi giữa chừng. Bấm bằng mã để chuột chưa động đến trang.
  await ctx.page.evaluate(() =>
    document.querySelector('[data-gr-pose="talk"]').click(),
  );
  await ctx.page.evaluate(() =>
    document.querySelector('#gr-figure').scrollIntoView({ block: 'center' }),
  );
  await ctx.page.waitForTimeout(80);
  return { ...ctx, errors };
};

const near = (a, b, tol, msg) =>
  assert.ok(
    Math.abs(a - b) <= tol,
    `${msg} (${a} so với ${b}, sai lệch cho phép ${tol})`,
  );
const same = (a, b, msg) =>
  a.forEach((v, i) => near(v, b[i], 0.6, `${msg} [${i}]`));
// Làm tròn đến 0,01 và đổi −0 thành 0 để so sánh nghiêm ngặt được.
const flat = (v) => Math.round(v * 100) + 0;

const h = await startHarness({ seed: seed('nu') });
try {
  // ---- 1-3. Cấu trúc, nhịp tự nhiên, ngân sách hoạt họa ----------------------------------------------------------------------
  {
    const { context, page, errors } = await open(h, 1440);
    const rows = await survey(page);
    assert.equal(rows.length, 8, 'hai hiệp khách x bốn thế');
    for (const s of rows) {
      const t = `${s.hero}/${s.pose}`;
      // 1. Cấu trúc.
      assert.equal(s.has.torso, 1, `${t}: có đúng một nhóm gr-torso`);
      assert.equal(s.has.brows, 1, `${t}: có đúng một nhóm gr-brows`);
      assert.equal(
        s.has.solids,
        0,
        `${t}: vẫn là SVG phẳng, không khối 3D, canvas hay ảnh`,
      );
      if (s.pose === 'zen') {
        assert.equal(
          s.has.eyes,
          0,
          `${t}: nhắm mắt thiền nên không có nhóm mắt`,
        );
        assert.equal(
          s.by['gr-blink'],
          undefined,
          `${t}: nhắm mắt thì không chớp`,
        );
        assert.equal(
          s.by['gr-glance'],
          undefined,
          `${t}: nhắm mắt thì không liếc`,
        );
        assert.equal(
          s.by['gr-chest'],
          undefined,
          `${t}: tọa thiền đã có nhịp thở riêng, thân áo đứng yên`,
        );
      } else {
        assert.equal(s.has.eyes, 1, `${t}: mắt mở có nhóm gr-eyes`);
        assert.equal(
          s.has.gaze,
          1,
          `${t}: tròng mắt (gr-gaze) nằm trong nhóm mắt để liếc riêng khỏi mí`,
        );
        // 2a. Chớp mắt: ít nhất ba lần khép mí trong một vòng, có cặp chớp liền nhau, có quãng nghỉ dài.
        const blink = s.by['gr-blink'];
        assert.ok(
          blink && blink.cls === 'gr-eyes' && blink.infinite,
          `${t}: chớp mắt lặp mãi trên nhóm mắt`,
        );
        assert.ok(
          blink.duration >= 4000 && blink.duration <= 8000,
          `${t}: một vòng chớp dài 4–8 giây (${blink.duration}ms)`,
        );
        const shut = blink.frames.filter((f) => f.sy < 0.5).map((f) => f.o);
        assert.ok(
          shut.length >= 3,
          `${t}: ít nhất ba lần khép mí mỗi vòng (${shut.length})`,
        );
        const gaps = shut.slice(1).map((o, i) => o - shut[i]);
        gaps.push(1 - shut[shut.length - 1] + shut[0]);
        assert.ok(
          Math.min(...gaps) <= 0.1,
          `${t}: có cặp chớp liền nhau (khoảng ngắn nhất ${Math.min(...gaps).toFixed(2)} vòng)`,
        );
        assert.ok(
          Math.max(...gaps) >= 0.3,
          `${t}: có quãng nghỉ dài giữa các lần chớp (dài nhất ${Math.max(...gaps).toFixed(2)} vòng)`,
        );
        assert.ok(
          blink.frames.every((f) => f.sy >= 0 && f.sy <= 1.0001),
          `${t}: mí chỉ khép, không giãn quá cỡ`,
        );
        // 2b. Liếc: trái rồi phải, rất chậm, độ dịch nhỏ nằm trong tròng.
        const glance = s.by['gr-glance'];
        assert.ok(
          glance && glance.cls === 'gr-gaze' && glance.infinite,
          `${t}: liếc lặp mãi trên tròng mắt`,
        );
        assert.ok(
          glance.duration >= 8000,
          `${t}: liếc thưa và chậm (${glance.duration}ms)`,
        );
        const xs = glance.frames.map((f) => f.gx);
        assert.ok(
          Math.min(...xs) <= -1 && Math.max(...xs) >= 1,
          `${t}: liếc cả bên trái lẫn bên phải (${Math.min(...xs)} … ${Math.max(...xs)})`,
        );
        assert.ok(
          xs.every((v) => Math.abs(v) <= 3) &&
            glance.frames.every((f) => Math.abs(f.gy) <= 2),
          `${t}: tròng mắt không lệch quá 3px ngang, 2px dọc`,
        );
        // 2c. Thân áo nhấp nhô nhẹ.
        const chest = s.by['gr-chest'];
        assert.ok(
          chest && chest.cls === 'gr-torso' && chest.infinite,
          `${t}: thân áo thở lặp mãi`,
        );
        assert.ok(
          chest.duration >= 3500 && chest.duration <= 6000,
          `${t}: nhịp thở 3,5–6 giây (${chest.duration}ms)`,
        );
        const peak = Math.max(...chest.frames.map((f) => Math.max(f.sx, f.sy)));
        assert.ok(
          peak >= 1.005 && peak <= 1.03,
          `${t}: thân nở ra vừa phải, thấy được mà không phồng (${peak})`,
        );
      }
      // 2d. Cười nói: miệng nói thành cụm rồi nghỉ, mày nhướn theo; các thế khác không có miệng nói và mày đứng yên.
      if (s.pose === 'talk') {
        assert.equal(s.has.mouth, 1, `${t}: có miệng`);
        const talk = s.by['gr-talk'];
        assert.ok(
          talk && talk.cls === 'gr-mouth' && talk.infinite,
          `${t}: miệng nói lặp mãi`,
        );
        assert.equal(
          talk.direction,
          'normal',
          `${t}: miệng nói theo cụm, không đóng mở qua lại đều đặn (direction ${talk.direction})`,
        );
        assert.ok(
          talk.duration >= 2000,
          `${t}: một cụm nói dài từ 2 giây (${talk.duration}ms)`,
        );
        const wide = talk.frames.filter((f) => f.sy >= 0.7).map((f) => f.o);
        assert.ok(
          wide.length >= 3,
          `${t}: ít nhất ba âm tiết há miệng mỗi cụm (${wide.length})`,
        );
        assert.ok(
          1 - Math.max(...wide) >= 0.3,
          `${t}: cuối cụm miệng nghỉ ít nhất 30% vòng (${(1 - Math.max(...wide)).toFixed(2)})`,
        );
        assert.ok(
          talk.frames[talk.frames.length - 1].sy <= 0.3,
          `${t}: kết thúc cụm với miệng khép`,
        );
        const brow = s.by['gr-brow'];
        assert.ok(
          brow && brow.cls === 'gr-brows' && brow.infinite,
          `${t}: mày nhướn theo lời nói`,
        );
        assert.equal(
          brow.duration,
          talk.duration,
          `${t}: mày nhướn cùng nhịp với miệng`,
        );
        assert.ok(
          brow.frames.some((f) => f.lift <= -1) &&
            brow.frames.every((f) => f.lift >= -3 && f.lift <= 0.01),
          `${t}: mày nhướn lên 1–3px rồi về`,
        );
      } else {
        assert.equal(s.has.mouth, 0, `${t}: thế này không có miệng nói`);
        assert.equal(
          s.by['gr-talk'],
          undefined,
          `${t}: không có hoạt họa miệng nói`,
        );
        assert.equal(
          s.by['gr-brow'],
          undefined,
          `${t}: mày đứng yên khi không nói`,
        );
      }
      // 3. Ngân sách hoạt họa của mỗi hình.
      assert.ok(
        s.count >= 10 && s.count <= 20,
        `${t}: số hoạt họa CSS đang chạy nằm trong 10–20 (${s.count})`,
      );
    }
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }

  // ---- 2e. Hiện hình có độ nảy: đổi thế thì hình mới trồi lên, vượt một chút rồi về chỗ ------------------------------------------
  {
    const { context, page, errors } = await open(h, 1440);
    const enter = await page.evaluate(() => {
      document.querySelector('[data-gr-pose="martial"]').click();
      const svg = document.querySelector(
        '#gr-figure svg.gr-hero:not(.is-leave)',
      );
      const a = svg.getAnimations().find((x) => x.animationName === 'gr-enter');
      if (!a) return null;
      return {
        pose: svg.dataset.pose,
        duration: a.effect.getTiming().duration,
        frames: a.effect
          .getKeyframes()
          .map((k) => ({
            o: k.offset,
            op: Number(k.opacity),
            transform: String(k.transform),
          })),
      };
    });
    assert.ok(enter, 'đổi thế thì hình mới chạy hoạt họa gr-enter');
    assert.equal(enter.pose, 'martial', 'hình mới đúng thế đã chọn');
    assert.ok(
      enter.duration >= 600 && enter.duration <= 900,
      `hiện hình trong 0,6–0,9 giây (${enter.duration}ms)`,
    );
    const lift = (f) =>
      Number((f.transform.match(/translateY\((-?[\d.]+)px\)/) || [])[1] || 0);
    const grow = (f) =>
      Number((f.transform.match(/scale\(([\d.]+)/) || [])[1] || 1);
    const first = enter.frames[0];
    const last = enter.frames[enter.frames.length - 1];
    assert.equal(first.op, 0, 'bắt đầu từ trong suốt');
    assert.ok(
      lift(first) > 0 && grow(first) < 1,
      'bắt đầu từ thấp hơn và nhỏ hơn một chút',
    );
    assert.ok(
      enter.frames.some((f) => lift(f) < 0 && grow(f) > 1),
      'có khung vượt lên cao và phình nhẹ trước khi về chỗ (độ nảy)',
    );
    assert.ok(
      last.op === 1 &&
        ((lift(last) === 0 && grow(last) === 1) || last.transform === 'none'),
      'kết thúc đúng chỗ, đủ cỡ, đủ rõ',
    );
    await page.waitForTimeout(700);
    const left = await page.evaluate(
      () => document.querySelectorAll('#gr-figure svg.gr-hero').length,
    );
    assert.equal(left, 1, 'hình cũ đã gỡ sau khi mờ hẳn');
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }

  // ---- 4. Nhìn theo con trỏ và 5. nhảy chào, ở ba khổ, cả hai hiệp khách --------------------------------------------------------
  for (const [width, hero] of [
    [390, 'nam'],
    [820, 'nu'],
    [1440, 'nam'],
    [1440, 'nu'],
  ]) {
    const tag = ` (${width}px, ${hero})`;
    const { context, page, errors } = await open(h, width, { hero });
    const idle = await look(page);
    assert.equal(
      idle.gx,
      '',
      'chưa có con trỏ thì chưa đặt biến --gr-gx' + tag,
    );
    assert.equal(
      idle.gy,
      '',
      'chưa có con trỏ thì chưa đặt biến --gr-gy' + tag,
    );
    assert.deepEqual(
      [idle.tx, idle.ty, idle.rot],
      [0, 0, 0],
      'mắt và đầu ở giữa khi chưa có con trỏ' + tag,
    );
    const before = await layout(page);
    const eye = await eyeLine(page);
    const reach = 0.9 * Math.max(160, eye.w);
    const target = {
      left: [Math.max(2, eye.x - reach), eye.y],
      right: [Math.min(eye.vw - 2, eye.x + reach), eye.y],
      up: [eye.x, Math.max(2, eye.y - 0.9 * Math.max(160, eye.h))],
      down: [eye.x, Math.min(eye.vh - 2, eye.y + 0.9 * Math.max(160, eye.h))],
    };
    for (const [dir, [x, y]] of Object.entries(target)) {
      const far = Math.hypot(x - eye.x, y - eye.y);
      assert.ok(
        far >= 40,
        `đích "${dir}" cách đường mắt đủ xa để đo (${Math.round(far)}px)` + tag,
      );
      await page.mouse.move(x, y);
      await page.waitForFunction(
        () =>
          document
            .querySelector('#gr-figure')
            .style.getPropertyValue('--gr-gx') !== '',
      );
      await page.waitForTimeout(650);
      const s = await look(page);
      const gx = parseFloat(s.gx);
      const gy = parseFloat(s.gy);
      assert.ok(
        gx >= -1 && gx <= 1 && gy >= -1 && gy <= 1,
        `biến nằm trong [−1, 1] (${s.gx}, ${s.gy})` + tag,
      );
      near(
        s.tx,
        gx * 3,
        0.2,
        `tròng mắt dịch ngang đúng ba px nhân với ${s.gx}` + tag,
      );
      near(
        s.ty,
        gy * 2,
        0.2,
        `tròng mắt dịch dọc đúng hai px nhân với ${s.gy}` + tag,
      );
      near(
        s.rot,
        gx * 3,
        0.25,
        `đầu nghiêng đúng ba độ nhân với ${s.gx}` + tag,
      );
      if (dir === 'left')
        assert.ok(
          gx <= -0.35 && s.tx <= -1 && s.rot <= -1,
          `nhìn sang trái: mắt và đầu về bên trái (${s.gx}, ${s.tx.toFixed(2)}px, ${s.rot.toFixed(2)}°)` +
            tag,
        );
      if (dir === 'right')
        assert.ok(
          gx >= 0.35 && s.tx >= 1 && s.rot >= 1,
          `nhìn sang phải: mắt và đầu về bên phải (${s.gx}, ${s.tx.toFixed(2)}px, ${s.rot.toFixed(2)}°)` +
            tag,
        );
      if (dir === 'up')
        assert.ok(
          gy <= -0.3 && s.ty <= -0.6,
          `nhìn lên: tròng mắt lên cao (${s.gy}, ${s.ty.toFixed(2)}px)` + tag,
        );
      if (dir === 'down')
        assert.ok(
          gy >= 0.3 && s.ty >= 0.6,
          `nhìn xuống: tròng mắt xuống thấp (${s.gy}, ${s.ty.toFixed(2)}px)` +
            tag,
        );
    }
    // Chặn ở biên: con trỏ cực xa vẫn không quá 1 (3px, 2px, 3 độ), theo cả bốn hướng.
    for (const [px, py, sx, sy] of [
      [1e6, -1e6, 1, -1],
      [-1e6, 1e6, -1, 1],
    ]) {
      await page.evaluate(
        ([x, y]) =>
          document.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: x,
              clientY: y,
              pointerType: 'mouse',
              bubbles: true,
            }),
          ),
        [px, py],
      );
      await page.waitForTimeout(650);
      const s = await look(page);
      assert.deepEqual(
        [parseFloat(s.gx), parseFloat(s.gy)],
        [sx, sy],
        `con trỏ cực xa thì biến bị chặn ở ±1 (${s.gx}, ${s.gy})` + tag,
      );
      near(s.tx, sx * 3, 0.05, 'tròng mắt không quá 3px ngang' + tag);
      near(s.ty, sy * 2, 0.05, 'tròng mắt không quá 2px dọc' + tag);
      near(s.rot, sx * 3, 0.05, 'đầu không nghiêng quá 3 độ' + tag);
    }
    // Rời cửa sổ hoặc mất tiêu điểm: về giữa.
    await page.evaluate(() =>
      document.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, relatedTarget: null }),
      ),
    );
    await page.waitForTimeout(650);
    let back = await look(page);
    assert.deepEqual(
      [parseFloat(back.gx), parseFloat(back.gy)],
      [0, 0],
      'con trỏ rời cửa sổ thì biến về 0' + tag,
    );
    assert.deepEqual(
      [flat(back.tx), flat(back.ty), flat(back.rot)],
      [0, 0, 0],
      'mắt và đầu về giữa' + tag,
    );
    await page.evaluate(() =>
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 1e6,
          clientY: 0,
          pointerType: 'pen',
          bubbles: true,
        }),
      ),
    );
    await page.waitForFunction(
      () =>
        parseFloat(
          document
            .querySelector('#gr-figure')
            .style.getPropertyValue('--gr-gx'),
        ) === 1,
    );
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    back = await look(page);
    assert.deepEqual(
      [parseFloat(back.gx), parseFloat(back.gy)],
      [0, 0],
      'bút cũng điều khiển được và cửa sổ mất tiêu điểm thì về 0' + tag,
    );
    // Không xê dịch bố cục: khung, hình, sân khấu, cỡ trang đều như trước khi con trỏ động đến.
    await page.waitForTimeout(500);
    const after = await layout(page);
    same(before.fig, after.fig, 'khung nhân vật không xê dịch' + tag);
    same(before.svg, after.svg, 'hình nhân vật không xê dịch' + tag);
    same(before.stage, after.stage, 'sân khấu không xê dịch' + tag);
    assert.deepEqual(
      [after.sw, after.sh],
      [before.sw, before.sh],
      'cỡ trang không đổi' + tag,
    );
    assert.ok(after.over <= 0, 'không tràn ngang' + tag);

    // 5. Nhảy chào: bấm bằng chuột thật vào nhân vật.
    const mid = await eyeLine(page);
    await page.mouse.click(mid.cx, mid.cy);
    await page.waitForFunction(() =>
      document.querySelector('#gr-figure').classList.contains('is-hop'),
    );
    const hop = await page.evaluate(() => {
      const fig = document.querySelector('#gr-figure');
      const a = fig.getAnimations().find((x) => x.animationName === 'gr-hop');
      if (!a) return null;
      window.__hop = a;
      const lift = (k) =>
        Number(
          (String(k.transform).match(/translateY\((-?[\d.]+)px\)/) || [])[1] ||
            0,
        );
      const sy = (k) =>
        Number(
          (String(k.transform).match(/scale\(([^)]+)\)/) || [, '1'])[1]
            .split(',')
            .pop(),
        );
      const frames = a.effect.getKeyframes();
      return {
        duration: a.effect.getTiming().duration,
        jump: Math.min(...frames.map(lift)),
        squash: Math.min(...frames.map(sy)),
        stretch: Math.max(...frames.map(sy)),
        t: a.currentTime,
      };
    });
    assert.ok(hop, 'bấm vào nhân vật thì khung chạy hoạt họa gr-hop' + tag);
    assert.ok(
      hop.duration >= 600 && hop.duration <= 1000,
      `nhảy chào trong 0,6–1 giây (${hop.duration}ms)` + tag,
    );
    assert.ok(
      hop.jump <= -8 && hop.jump >= -20,
      `nhảy cao 8–20px (${hop.jump}px)` + tag,
    );
    assert.ok(
      hop.squash < 1 && hop.stretch > 1,
      `có nhún xuống và vươn lên (${hop.squash}, ${hop.stretch})` + tag,
    );
    // Bấm dồn khi đang nhảy (ba lần liền trong cùng một nhịp): không chạy lại từ đầu, không chồng hoạt họa.
    const dup = await page.evaluate(() => {
      const fig = document.querySelector('#gr-figure');
      if (!fig.classList.contains('is-hop')) return null;
      const t0 = window.__hop.currentTime;
      fig.click();
      fig.click();
      fig
        .querySelector('svg')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const now = fig
        .getAnimations()
        .filter((x) => x.animationName === 'gr-hop');
      return {
        count: now.length,
        same: now[0] === window.__hop,
        back: window.__hop.currentTime < t0,
      };
    });
    assert.ok(dup, 'nhân vật còn đang nhảy khi thử bấm dồn' + tag);
    assert.deepEqual(
      [dup.count, dup.same, dup.back],
      [1, true, false],
      'bấm dồn khi đang nhảy thì giữ nguyên một hoạt họa, không chạy lại từ đầu' +
        tag,
    );
    await page.waitForFunction(
      () => !document.querySelector('#gr-figure').classList.contains('is-hop'),
      null,
      { timeout: 3000 },
    );
    const done = await layout(page);
    same(before.fig, done.fig, 'nhảy xong khung nhân vật về đúng chỗ' + tag);
    assert.deepEqual(errors, [], 'không lỗi trang' + tag);
    await context.close();
  }

  // ---- 4b. Cảm ứng: ngón tay không điều khiển mắt; chạm vào nhân vật vẫn nhảy chào ------------------------------------------------
  {
    const tag = ' (390px cảm ứng)';
    const { context, page, errors } = await open(h, 390, { touch: true });
    const eye = await eyeLine(page);
    await page.evaluate(() =>
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 1e6,
          clientY: 1e6,
          pointerType: 'touch',
          bubbles: true,
        }),
      ),
    );
    await page.waitForTimeout(300);
    let s = await look(page);
    assert.equal(s.gx, '', 'pointermove của ngón tay bị bỏ qua' + tag);
    assert.deepEqual(
      [s.tx, s.ty, s.rot],
      [0, 0, 0],
      'mắt và đầu không động đậy theo ngón tay' + tag,
    );
    // Đối chứng: cùng trang, cùng cách bắn sự kiện, nhưng là chuột thì có tác dụng (iPad gắn bàn rê chuột).
    await page.evaluate(() =>
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 1e6,
          clientY: 1e6,
          pointerType: 'mouse',
          bubbles: true,
        }),
      ),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector('#gr-figure')
          .style.getPropertyValue('--gr-gx') === '1.000',
    );
    s = await look(page);
    assert.deepEqual(
      [s.gx, s.gy],
      ['1.000', '1.000'],
      'đối chứng: chuột trên trang cảm ứng vẫn điều khiển được' + tag,
    );
    // Chạm vào nhân vật: nhảy chào.
    await page.touchscreen.tap(eye.cx, eye.cy);
    await page.waitForFunction(() =>
      document.querySelector('#gr-figure').classList.contains('is-hop'),
    );
    await page.waitForFunction(
      () => !document.querySelector('#gr-figure').classList.contains('is-hop'),
      null,
      { timeout: 3000 },
    );
    // Rời khỏi trang Điểm tích lũy rồi quay lại: không lỗi dù con trỏ vẫn di chuyển ở trang khác.
    await h.show(page, 'board');
    await page.mouse.move(40, 40);
    await page.mouse.move(300, 300);
    await page.waitForTimeout(150);
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-figure svg.gr-hero');
    const fresh = await look(page);
    assert.equal(
      fresh.hop,
      false,
      'hình mới dựng lại không dính cờ nhảy' + tag,
    );
    assert.deepEqual(errors, [], 'không lỗi trang' + tag);
    await context.close();
  }

  // ---- 6. Giảm chuyển động: đứng yên tuyệt đối -----------------------------------------------------------------------------------
  {
    const { context, page, errors } = await open(h, 1440, {
      reducedMotion: 'reduce',
    });
    const eye = await eyeLine(page);
    await page.mouse.move(Math.min(eye.vw - 2, eye.x + 300), eye.y);
    await page.mouse.move(Math.max(2, eye.x - 300), eye.y + 40);
    await page.evaluate(() =>
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 1e6,
          clientY: 1e6,
          pointerType: 'mouse',
          bubbles: true,
        }),
      ),
    );
    await page.mouse.click(eye.cx, eye.cy);
    await page.waitForTimeout(500);
    const s = await look(page);
    assert.equal(s.gx, '', 'giảm chuyển động: không đặt biến --gr-gx');
    assert.equal(s.gy, '', 'giảm chuyển động: không đặt biến --gr-gy');
    assert.equal(
      s.hop,
      false,
      'giảm chuyển động: chạm vào nhân vật không nhảy',
    );
    const calm = await page.evaluate(() => {
      const fig = document.querySelector('#gr-figure');
      // Cố tình đặt sẵn biến và cờ nhảy như một phiên cũ để thử riêng phần CSS.
      fig.style.setProperty('--gr-gx', '1');
      fig.style.setProperty('--gr-gy', '1');
      fig.classList.add('is-hop');
      const svg = fig.querySelector('svg.gr-hero');
      const head = svg.querySelector('.gr-head');
      const gaze = svg.querySelector('.gr-gaze');
      const moving = [...svg.querySelectorAll('*'), svg, fig].filter(
        (n) => getComputedStyle(n).animationName !== 'none',
      ).length;
      return {
        running:
          svg.getAnimations({ subtree: true }).length +
          fig.getAnimations().length,
        moving,
        rotate: getComputedStyle(head).rotate,
        gaze: getComputedStyle(gaze).transform,
        shift: getComputedStyle(gaze).translate,
        transition: getComputedStyle(head).transitionDuration,
      };
    });
    assert.equal(
      calm.running,
      0,
      'giảm chuyển động: không hoạt họa nào đang chạy trên nhân vật',
    );
    assert.equal(
      calm.moving,
      0,
      'giảm chuyển động: không phần tử nào khai báo hoạt họa, kể cả khung khi cờ nhảy bị đặt sẵn',
    );
    assert.equal(
      calm.rotate,
      'none',
      'giảm chuyển động: đầu không xoay dù biến đã đặt sẵn',
    );
    assert.equal(
      calm.gaze,
      'none',
      'giảm chuyển động: tròng mắt không dịch dù biến đã đặt sẵn',
    );
    assert.ok(
      calm.shift === 'none' || calm.shift === '0px',
      `giảm chuyển động: không liếc (${calm.shift})`,
    );
    assert.ok(
      /^0s(, 0s)*$/.test(calm.transition),
      `giảm chuyển động: không chuyển tiếp mượt (${calm.transition})`,
    );
    // Hình dựng ngoài khung #gr-figure (trang kể truyện, bảng vận công…) cũng đứng yên, và hình đang hiện dần cũng thế.
    const outside = await page.evaluate((poses) => {
      const box = document.createElement('div');
      box.id = 'probe-out';
      box.innerHTML = ['nam', 'nu']
        .flatMap((who) => poses.map((p) => zenHero.svg(who, p)))
        .join('');
      for (const svg of box.querySelectorAll('svg'))
        svg.classList.add('is-enter');
      document.body.append(box);
      const bad = [...box.querySelectorAll('svg, svg *')]
        .filter((n) => getComputedStyle(n).animationName !== 'none')
        .map((n) => n.getAttribute('class') || n.tagName);
      box.remove();
      return bad;
    }, POSES);
    assert.deepEqual(
      outside,
      [],
      'giảm chuyển động: hình dựng ngoài khung và hình đang hiện dần cũng đứng yên',
    );
    assert.deepEqual(errors, [], 'không lỗi trang');
    await context.close();
  }

  console.log('growth-motion-browser: ok');
} finally {
  await h.close();
}
