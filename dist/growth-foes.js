'use strict';
// v2.8.0 (Huyết Nguyệt Lộ): tranh phe ác của truyện "Hằng Nguyệt và Huyết Nguyệt": Huyết Nguyệt Giáo chủ và Thập Nguyệt Sứ.
// v2.16.0 (Ma Ảnh): dựng hình 3D bằng lõi growth-rig.js, cùng cách với hiệp khách (growth-art.js). Mỗi nhân vật là một bộ khớp
//   trong không gian: đầu là khối cầu có mặt/mặt nạ dán lên, tay chân uốn theo mục tiêu (IK), áo là ống vải đổ bóng theo ánh sáng thật,
//   tóc/dải lụa/xích là dây Verlet; "tà công" (hiệu ứng riêng) nằm trong không gian nên bay vòng quanh, lướt ra trước ra sau thân.
//   Khổ 200 × 232, nhãn đọc, mã nhân vật và API giữ nguyên: zenFoe.svg(id) trả chuỗi SVG, lõi tự gắn hoạt họa khi phần tử vào trang.
//   giao  Lệ Vô Khuyết: áo trắng viền son, tóc bạc, mặt nạ trăng khuyết; trăng máu sau lưng, xoáy Thôn Nguyệt Quyết hút hạt sáng về viên huyết châu.
//   mien  Miên Hồ: mặt nạ hồ ly có tai, quạt tím phe phẩy, khói Mê Hồn Hương cuộn lên từ túi hương, chữ "Z" bay lên.
//   dien  Thiên Diện: mũ hai cánh, ba chiếc mặt nạ thay nhau hiện (có lóe sáng khi đổi), ba đèn lồng bay vòng quanh thân.
//   loi   Lôi Tốc: khăn buộc trán có đuôi, tóc dựng, song đao bắt chéo rồi bật ra; bóng ảnh lướt theo sau, tia chớp lóe.
//   khuc  Khúc U: tóc che một mắt, sáo xương ngang môi, vòng âm thanh lan ra theo hướng thổi, nốt nhạc bay.
//   bach  Bách Tý: đầu trọc búi tó, giáp đồng, bốn tay vung, bánh xe sáu món binh khí xoay sau lưng.
//   ngoc  Ngọc Vô Hà: giáp lưu ly nhiều mặt cắt, ánh lóe lướt qua, bốn kim băng lơ lửng bay vòng.
//   kho   Khô Vinh: lão gầy lưng còng, râu bạc, gậy cành khô, lá úa rơi, viên đan đỏ nhấp nháy, sinh khí bị hút từ đất lên tay.
//   kinh  Ảnh Song: mặt nửa sáng nửa tối, gương đồng lớn có bóng người chập chờn, xoay chậm.
//   suong Lãnh Tịch: tóc trắng búi cài trâm băng, tinh thể băng bay vòng, sương phủ dưới chân.
//   vong  Vô Vọng: thân khổng lồ, vầng nhật thực sau lưng, hai sợi xích đen đung đưa, vũng Hắc Thủy gợn sóng.
// Tia hào quang sau lưng vẫn là hoạt họa CSS (lớp gr-fo-halo) nên hình nhỏ trong danh sách vẫn sống động khi lõi chạy nửa nhịp.
(function () {
  const Z = window.zenRig;
  const { V, M, clamp, lerp, mat, Scene, Chain, Clip, solveIK } = Z;
  const { rotY, rotX, rotZ, mm, mv } = M;
  const INK = '#231a2b';
  const frac = (x) => x - Math.floor(x);
  const PEL = 62;
  // Kênh chuyển động: giống hiệp khách (x,y,z,yaw,pitch,roll,tw,hd,ha,hb,fa,fb,hem,br,mouth,eye,kn,wide); thêm hc/he (hai tay phụ của
  // Bách Tý) và g (kênh số riêng của từng nhân vật: góc quạt, độ mở…).
  const DEF = {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, tw: 0, hd: [0, 0, 0],
    ha: [-30, -38, 2], hb: [30, -38, 2], hc: [-34, -8, 24], he: [34, -8, 24],
    fa: [-13, 0, 0, 0], fb: [13, 0, 0, 0], hem: 14, br: 0, mouth: 0, eye: 1, kn: 0.25, wide: 0, g: 0,
  };

  // ---- Mặt: mắt, mày, miệng dán lên mặt cầu (toạ độ cục bộ, y hướng xuống) -----------------------------------------------------
  const mir = (s) => '<g transform="scale(-1 1)">' + s + '</g>';
  const line = (d, w, c = INK) => '<path d="' + d + '" stroke="' + c + '" stroke-width="' + w + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  const EYE = {
    open: '<ellipse rx="4.8" ry="5.6" cy="1" fill="' + INK + '"/><circle cx="1.6" cy="-1.4" r="1.7" fill="#fff"/>',
    fierce: '<path d="M-7,1 Q0,-7 8,-2 Q1,5 -7,1Z" fill="' + INK + '"/><circle cx="2.4" cy="-1" r="1.5" fill="#fff"/>',
    sly: line('M-7,1 q7,-7 14,0', 2.8),
    cold: line('M-8,0 L7,-1.4', 2.6),
    shut: line('M-7,-1 q7,6 14,0', 2.6),
    glow: '<path d="M-8,1 L8,-3" stroke="#ff4a66" stroke-width="3.6" stroke-linecap="round"/>',
    dot: '<circle r="3.2" fill="' + INK + '"/>',
    gem: '<path d="M-6,0 L0,-5 L7,0 L0,4Z" fill="#f0d98a" stroke="' + INK + '" stroke-width="1.2"/>',
  };
  const BROW = {
    fierce: line('M-9,-4 L8,3', 3.4), sly: line('M-8,-2 L8,1', 2.4), cold: line('M-8,-1 L8,0', 2), heavy: line('M-10,-4 L9,3', 5.2), calm: line('M-8,1 q8,-4 16,-1', 2),
    white: line('M-9,-3 q8,-4 17,3', 4.6, '#f2efe6'),
  };
  const MOUTH = {
    smirk: line('M-7,0 Q1,4 8,-3', 2.4, '#8a2f45'), flat: line('M-6,0 L6,0', 2.4), smile: line('M-7,-1 q7,5 15,0', 2.4, '#8a2f45'),
    frown: line('M-7,2 q7,-5 15,0', 2.8), o: '<ellipse rx="3.4" ry="3" fill="#8a2f45"/>', fox: line('M-5,-1 L0,3 L5,-1', 2, '#c23a2e'),
    old: line('M-6,0 Q0,3 6,0', 2) + line('M-9,4 q4,3 8,0 M2,4 q4,3 8,0', 1.4, '#a18c6a'),
  };

  // ---- Tóc mái (vòng [vĩ độ, kinh độ] trên mặt cầu), dùng chung -------------------------------------------------------------------
  const FRINGE = {
    long: [[0, -94], [30, -74], [46, -48], [50, -22], [49, 0], [50, 22], [46, 48], [30, 74], [0, 94], [34, 112], [34, 140], [34, 168], [34, 196], [34, 224], [34, 252]],
    knot: [[0, -94], [28, -74], [45, -48], [52, -22], [47, -8], [38, 0], [47, 8], [52, 22], [45, 48], [28, 74], [0, 94], [34, 112], [34, 140], [34, 168], [34, 196], [34, 224], [34, 252]],
  };

  // ---- Bộ khớp ----------------------------------------------------------------------------------------------------------------
  // Như hiệp khách, thêm vai rộng hơn (L.shoulder) và hai tay phụ (L.arms4).
  function solve(P, L) {
    const Ry = rotY(P.yaw), Rr = mm(Ry, mm(rotX(P.pitch), rotZ(P.roll)));
    const pel = mv(Ry, [P.x, PEL + P.y, P.z]), br = P.br;
    const Rc = mm(Rr, rotY(P.tw));
    const chestC = V.add(pel, mv(Rc, [0, 34 + br * 0.8, 0]));
    const Rh = mm(Rc, mm(rotY(P.hd[0]), mm(rotX(P.hd[1]), rotZ(P.hd[2]))));
    const neck = V.add(pel, mv(Rc, [0, 46 + br * 1.2, 0]));
    const headC = V.add(neck, mv(Rh, [0, 25, 2]));
    const sw = L.shoulder || 23;
    const arm = (s, target, sy, l1, l2) => {
      const Sh = V.add(pel, mv(Rc, [s * (sw + br * 0.5), sy + br * 1.2, 0]));
      const ik = solveIK(Sh, V.add(chestC, mv(Rc, target)), l1, l2, mv(Rc, V.norm([s * 0.6, -1, -0.6])));
      return { S: Sh, E: ik.E, W: ik.T };
    };
    const arms = [arm(-1, P.ha, 40, 27, 25), arm(1, P.hb, 40, 27, 25)];
    const arms2 = L.arms4 ? [arm(-1, P.hc, 30, 26, 24), arm(1, P.he, 30, 26, 24)] : null;
    const legs = [-1, 1].map((s, i) => {
      const f = i ? P.fb : P.fa, Hh = V.add(pel, mv(Rr, [s * 11, -4, 0]));
      const Rf = mm(Ry, rotY(f[3]));
      const T = mv(Ry, [f[0], 7 + f[2], f[1]]);
      const ik = solveIK(Hh, T, 28, 28, mv(Rf, V.norm([s * P.kn, 0.12, 1])));
      return { H: Hh, K: ik.E, A: ik.T, heel: V.add(T, mv(Rf, [0, -2.5, -7])), toe: V.add(T, mv(Rf, [0, -3.5, 12])) };
    });
    return { P, Ry, Rr, Rc, Rh, pel, chestC, neck, headC, arms, arms2, legs };
  }
  const rest = (a, dirs, seg) => dirs.map((d, i) => V.add(a, V.mul(d, i * seg)));
  const down = (S, y = -1, z = 0) => mv(S.Rh, V.norm([0, y, z]));

  // ---- Một nhân vật đang sống -------------------------------------------------------------------------------------------------
  function makeFoe(id) {
    const L = LOOKS[id];
    if (!L) return null;
    const inst = {
      foe: id, look: L, clip: L.clip(), t: L.start || 0, cam: { yaw: -12, pitch: 7, ty: -12, tp: 7 }, sk: null, lag: [0, 0], feetPrev: null,
      chains: {}, hist: { sk: [], tip: [], a: [], b: [] }, visible: true, accum: 0, clock: 0, histT: 0,
    };
    (L.chains || []).forEach(([n, len, seg]) => { inst.chains[n] = new Chain(len, seg); });
    inst.chains.sleeveA = new Chain(5, 6);
    inst.chains.sleeveB = new Chain(5, 6);
    if (L.arms4) { inst.chains.sleeveC = new Chain(5, 6); inst.chains.sleeveD = new Chain(5, 6); }
    inst.advance = (dt, ptr) => advance(inst, dt, ptr);
    inst.frame = (into) => frame(inst, into);
    inst.advance(0, { x: 0, y: 0 }, true);
    for (let i = 0; i < 90; i++) inst.advance(1 / 60, { x: 0, y: 0 }, true);
    return inst;
  }
  function advance(inst, dt, ptr) {
    inst.accum += dt;
    const step = 1 / 60;
    let n = 0;
    while (inst.accum >= step && n < 4) { inst.accum -= step; n++; sim(inst, step); }
    if (!inst.sk) sim(inst, step);
    if (inst.accum > step * 4) inst.accum = 0;
    const c = inst.cam, sway = Math.sin(inst.clock * 0.33) * 4;
    c.ty = -12 + (ptr ? ptr.x * 16 : 0) + sway; c.tp = 7 + (ptr ? ptr.y * 4 : 0);
    const k = 1 - Math.pow(0.001, dt || 0.016);
    c.yaw += (c.ty - c.yaw) * k; c.pitch += (c.tp - c.pitch) * k;
    // Hình nhỏ (danh sách, thẻ): vẽ nửa số khung. Chỉ đo khi đã gắn vào trang (lúc dựng thử chưa có phần tử); mỗi giây đo lại.
    if (inst.svg && (inst.chk = (inst.chk || 0) - dt) < 0) {
      inst.chk = 1;
      const w = inst.svg.getBoundingClientRect().width;
      inst.every = w && w < 90 ? 2 : 1;
    }
  }
  function sim(inst, dt) {
    const L = inst.look;
    inst.t += dt; inst.clock += dt;
    const P = inst.clip.at(inst.t);
    if (L.tweak) L.tweak(P, inst.clock, inst);
    const fp = inst.feetPrev, cur = [P.fa, P.fb];
    if (fp) {
      [0, 1].forEach((i) => {
        const sp = Math.hypot(cur[i][0] - fp[i][0], cur[i][1] - fp[i][1]) / dt;
        P[i ? 'fb' : 'fa'] = [cur[i][0], cur[i][1], cur[i][2] + clamp(sp * 0.22, 0, 11), cur[i][3]];
      });
    }
    inst.feetPrev = [cur[0].slice(), cur[1].slice()];
    const S = solve(P, L);
    const prev = inst.sk ? inst.sk.pel : S.pel;
    const vel = V.sub(S.pel, prev);
    inst.lag = [inst.lag[0] * 0.9 - vel[0] * 1.6, inst.lag[1] * 0.9 - vel[2] * 1.6];
    inst.sk = S;
    const ch = inst.chains;
    if (L.step) L.step(inst, S, dt);
    ch.sleeveA.step(S.arms[0].W, null, { g: 0.55, drag: 0.9 });
    ch.sleeveB.step(S.arms[1].W, null, { g: 0.55, drag: 0.9 });
    if (S.arms2) { ch.sleeveC.step(S.arms2[0].W, null, { g: 0.55, drag: 0.9 }); ch.sleeveD.step(S.arms2[1].W, null, { g: 0.55, drag: 0.9 }); }
    const h = inst.hist;
    h.sk.push(S); if (h.sk.length > 24) h.sk.shift();
    inst.histT += dt;
    if (inst.histT > 0.03) {
      inst.histT = 0;
      const push = (a, v) => { a.push(v); if (a.length > 26) a.shift(); };
      push(h.a, S.arms[0].W); push(h.b, S.arms[1].W);
    }
  }

  // ---- Dựng khung hình ---------------------------------------------------------------------------------------------------------
  const sprite = (c, k, pos, size, inner, opt) => c.sc.planar(k, pos, V.mul(c.cam.R[0], size), V.mul(c.cam.R[1], size), inner, Object.assign({ twoSided: true }, opt));
  const floorAt = (sc, k, x, z, inner, opt) => sc.planar(k, [x, 0.2, z], [1, 0, 0], [0, 0, -1], inner, Object.assign({ twoSided: true }, opt));
  const fade = (sc, n, o) => { for (let i = n; i < sc.ops.length; i++) { const a = sc.ops[i].a; a.opacity = (a.opacity == null ? 1 : a.opacity) * o; } };
  // Vòng thân theo một bộ khớp bất kỳ (bóng ảnh của Lôi Tốc dùng bộ khớp cũ).
  const ringOf = (S, y, rx, rz) => ({ c: V.add(S.pel, mv(S.Rc, [0, y, 0])), u: mv(S.Rc, [rx, 0, 0]), w: mv(S.Rc, [0, 0, rz]) });
  const orbit = (t, i, rr, h, ang0, spd, flat) => { const a = ang0 + t * spd; return [Math.cos(a) * rr, h, Math.sin(a) * rr * (flat || 0.75)]; };

  function frame(inst, into) {
    const L = inst.look, S = inst.sk, P = S.P, t = inst.clock;
    let sc = into;
    if (!sc) {
      let cam = Z.camera(inst.cam.yaw, inst.cam.pitch);
      cam.fwd = cam.R[2];
      if (L.s && L.s !== 1) cam = Z.place(cam, { s: L.s });
      sc = new Scene(cam);
    }
    const c = { sc, cam: sc.cam, inst, L, S, P, t, pal: L.pal };
    c.Bd = (v) => V.add(S.pel, mv(S.Rc, v));
    c.Hd = (v) => V.add(S.headC, mv(S.Rh, v));
    c.dot = (k, pos, r, color, op, zb) => {
      const n = sc.ops.length;
      sc.sphere(k, pos, [r, r], mat(color), zb || 0);
      if (op != null && op < 1) fade(sc, n, op);
    };
    body(c);
    if (L.draw) L.draw(c);
    return sc;
  }

  function body(c) {
    const { sc, S, P, L, pal, Bd, Hd, inst, t } = c;
    const { Rc, Ry, Rh, pel, neck, headC, arms, arms2, legs } = S;
    const skin = mat(L.skin || '#ffe3cf'), robe = mat(pal.robe), sleeve = mat(pal.sleeve || pal.robe), hairM = mat(pal.hair);
    const bulk = L.bulk || 1, br = P.br, armR = L.armR || 1;
    floorAt(sc, 'shadow', pel[0], pel[2], '<ellipse rx="' + (58 * (L.shadow || 1)) + '" ry="22" fill="#1b1424" opacity=".16"/>', { zb: -300 });
    if (L.floor) L.floor(c);
    // Chân và gấu áo.
    const legM = mat(pal.leg || pal.robe), boot = mat(pal.boot || '#1d1822');
    legs.forEach((Lg, i) => {
      sc.limb('lt' + i, Lg.H, Lg.K, 8.4, 7.2, legM, -60);
      sc.limb('ls' + i, Lg.K, Lg.A, 7.2, 6.4, legM, -30);
      sc.limb('lb' + i, Lg.heel, Lg.toe, 7.4, 6.6, boot, -20);
    });
    const feetMid = V.lerp(legs[0].A, legs[1].A, 0.5);
    const spread = V.len(V.sub(legs[0].A, legs[1].A)) * 0.5;
    const hemC = [lerp(pel[0], feetMid[0], 0.5), P.hem, lerp(pel[2], feetMid[2], 0.5)];
    const top = V.add(pel, [0, 7, 0]);
    const sk = [0, 0.33, 0.68, 1].map((s) => {
      const r = lerp(19 * bulk, Math.max(L.skirtR || 27, 21 + spread * 0.62 + P.wide * 2), Math.pow(s, 0.8)) * (1 + br * 0.012);
      const lag = s * s;
      return { c: V.add(V.lerp(top, hemC, Math.pow(s, 1.05)), [-inst.lag[0] * lag * 2.2, 0, -inst.lag[1] * lag * 2.2]), u: mv(Ry, [r, 0, 0]), w: mv(Ry, [0, 0, r * 0.82]) };
    });
    sc.tube('skirt', sk, mat(pal.skirt || pal.robe), { zb: -6, edge: pal.trim });
    // Thân, cổ áo, đai.
    const ringAt = (y, rx, rz) => ({ c: Bd([0, y, 0]), u: mv(Rc, [rx * bulk * (1 + br * 0.03), 0, 0]), w: mv(Rc, [0, 0, rz * bulk * (1 + br * 0.03)]) });
    c.ringAt = ringAt;
    sc.tube('torso', [ringAt(45, 15, 10.5), ringAt(38, 22, 15), ringAt(22, 20.5, 14.5), ringAt(8, 18, 13)], robe, { zb: 0 });
    sc.planar('chest', Bd([0, 34, 15.4 * bulk]), mv(Rc, [1, 0, 0]), mv(Rc, [0, 1, 0]),
      '<path d="M-12,12 L0,-12 L12,12" stroke="' + pal.inner + '" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M14,12 L-8,-26" stroke="' + pal.trim + '" stroke-width="2" stroke-linecap="round"/>', { zb: 0.5 });
    sc.tube('belt', [{ c: Bd([0, 11, 0]), u: mv(Rc, [19.4 * bulk, 0, 0]), w: mv(Rc, [0, 0, 14.2 * bulk]) }, { c: Bd([0, 3, 0]), u: mv(Rc, [19.4 * bulk, 0, 0]), w: mv(Rc, [0, 0, 14.2 * bulk]) }], mat(pal.belt), { zb: 0.6 });
    sc.sphere('buckle', Bd([0, 7, 14.6 * bulk]), [5, 4.2], mat(pal.buckle || pal.trim), 1);
    sc.limb('neck', Bd([0, 44, 0]), neck, 7, 7, skin, 0);
    // Đầu: tóc sau, đầu, mặt, tóc mái.
    const R = [37, 34, 34];
    c.R = R;
    sc.mats.add(hairM);
    if (L.hairStyle !== 'bald') sc.sphere('hairBack', Hd([0, 4, -8]), [L.hairR ? L.hairR[0] : 40.5, L.hairR ? L.hairR[1] : 38], hairM, -6);
    if (L.hairStyle === 'long' && inst.chains.hair) sc.ribbon('hairL', inst.chains.hair.p, 24, 17, hairM, 0, {});
    sc.sphere('head', headC, R, skin, 0);
    const mk = (k, lat, lon, inner, z) => sc.mark(k, headC, Rh, R, lat, lon, inner, { zb: z });
    c.mk = mk;
    const F = L.face || {};
    const blink = (t % 5.2) > 5.0;
    const eye = (e) => (blink && (e === 'open' || e === 'fierce' || e === 'sly') ? EYE.shut : EYE[e] || e);
    const bA = F.browA !== undefined ? F.browA : F.brow, bB = F.browB !== undefined ? F.browB : F.brow;
    if (bA) mk('browA', 25, -25, BROW[bA], 1);
    if (bB) mk('browB', 25, 25, mir(BROW[bB]), 1);
    const eA = F.eyeA || F.eye, eB = F.eyeB || F.eye;
    if (eA) mk('eyeA', -4, -26, eye(eA), 1.1);
    if (eB) mk('eyeB', -4, 26, mir(eye(eB)), 1.1);
    if (F.blush) { mk('blushA', -17, -41, '<ellipse rx="6.5" ry="3.6" fill="#ff9fb2" opacity=".5"/>', 0.8); mk('blushB', -17, 41, '<ellipse rx="6.5" ry="3.6" fill="#ff9fb2" opacity=".5"/>', 0.8); }
    if (F.nose !== false) mk('nose', -13, 0, line('M-1.4,0 q1.4,1.8 2.8,0', 1.2, '#d49a85'), 0.9);
    const mouth = P.mouth > 0.4 ? MOUTH.o : MOUTH[F.mouth];
    if (mouth) mk('mouth', -32, 0, mouth, 1);
    if (L.hairStyle && L.hairStyle !== 'bald' && FRINGE[L.fringe || L.hairStyle]) sc.decal('fringe', headC, Rh, R, FRINGE[L.fringe || L.hairStyle], 'url(#GID-' + hairM.id + ')', { grow: 1.045, zb: 0.5, sub: 4 });
    if (L.hairStyle === 'long') {
      sc.ribbon('lockA', inst.chains.lockA.p, 6.5, 3, hairM, 0.7, { plain: true });
      sc.ribbon('lockB', inst.chains.lockB.p, 6.5, 3, hairM, 0.7, { plain: true });
    }
    // Tay: bắp tay, cẳng tay loe dần, mép áo rủ, bàn tay.
    const lining = pal.lining || pal.inner, cuff = pal.cuff || pal.trim;
    const limbArm = (A, key, chain, r) => {
      const fwd = V.norm(V.sub(A.W, A.E));
      sc.limb('ua' + key, A.S, A.E, 10 * r, 9.4 * r, sleeve, 0.2);
      sc.limb('fa' + key, A.E, A.W, 9.4 * r, 13.2 * r, sleeve, 0.4);
      let u = V.cross(fwd, [0, 0, 1]);
      if (V.len(u) < 0.2) u = V.cross(fwd, [1, 0, 0]);
      u = V.norm(u);
      const w = V.norm(V.cross(fwd, u));
      sc.planar('cf' + key, A.W, V.mul(u, 12.6 * r), V.mul(w, 12.6 * r), '<circle r="1" fill="' + lining + '" stroke="' + cuff + '" stroke-width=".11"/>', { twoSided: true, zb: 0.55 });
      sc.ribbon('sl' + key, chain.p.map((q, k) => (k ? q : A.W)), 11 * r, 6 * r, sleeve, 0.35, { plain: true });
      sc.sphere('hand' + key, V.add(A.W, V.mul(fwd, 4.5)), [6.4 * r, 6.4 * r], skin, 0.7);
    };
    limbArm(arms[0], 'a', inst.chains.sleeveA, armR);
    limbArm(arms[1], 'b', inst.chains.sleeveB, armR);
    if (arms2) { limbArm(arms2[0], 'c', inst.chains.sleeveC, 0.9 * armR); limbArm(arms2[1], 'd', inst.chains.sleeveD, 0.9 * armR); }
  }

  // Bộ phận dùng chung: tóc dài (dây Verlet neo sau đầu và hai bên mặt).
  function longHair(inst, S) {
    const ch = inst.chains, H = (v) => V.add(S.headC, mv(S.Rh, v));
    const a = H([0, 18, -26]);
    ch.hair.step(a, rest(a, [0, 1, 2, 3, 4, 5, 6].map((i) => mv(S.Rh, V.norm([0, -0.8 - i * 0.05, -0.35]))), 12), { stiff: 0.05, g: 0.24, drag: 0.9 });
    const la = H([-32, 10, 4]), lb = H([32, 10, 4]);
    ch.lockA.step(la, rest(la, [0, 1, 2, 3].map(() => mv(S.Rh, [-0.05, -1, 0.05])), 8), { stiff: 0.07, g: 0.2 });
    ch.lockB.step(lb, rest(lb, [0, 1, 2, 3].map(() => mv(S.Rh, [0.05, -1, 0.05])), 8), { stiff: 0.07, g: 0.2 });
  }
  const LONG = [['hair', 7, 12], ['lockA', 4, 8], ['lockB', 4, 8]];
  // Phần tử dựng quanh nhân vật dùng chung: vầng sáng/đĩa phía sau lưng (mặt phẳng hướng về người xem).
  const backDisc = (c, k, y, z, inner, opt) => c.sc.planar(k, [0, y, z], [1, 0, 0], [0, 1, 0], inner, Object.assign({ twoSided: true, zb: -200 }, opt));

  const LOOKS = {};

  // ===================================================================================================================================
  // Huyết Nguyệt Giáo chủ Lệ Vô Khuyết
  LOOKS.giao = {
    skin: '#f4e4dc', start: 2, skirtR: 29, hairStyle: 'long', chains: LONG.concat([['sash', 6, 9], ['sashB', 6, 9]]),
    pal: { robe: '#f6f3f0', trim: '#b3263b', inner: '#2a1d2c', belt: '#2a1d2c', boot: '#2a1d2c', leg: '#2a1d2c', hair: '#e8e4ef', buckle: '#b3263b' },
    face: { eyeA: null, eyeB: 'fierce', browA: null, browB: 'fierce', mouth: 'smirk' },
    clip: () => new Clip(9, [
      [0, { yaw: -14, hb: [46, 50, 14], ha: [-28, -34, 8], hd: [8, 0, 0], br: -0.4 }],
      [2.25, { yaw: -4, x: 2, hb: [50, 56, 20], ha: [-34, -20, 18], hd: [-6, 2, -3], br: 0.6 }],
      [4.5, { yaw: -10, y: -1, hb: [44, 60, 24], ha: [-24, -10, 26], hd: [-10, 3, -4], br: 1 }],
      [6.75, { yaw: -18, x: -2, hb: [48, 48, 12], ha: [-30, -30, 10], hd: [4, -3, 3], br: -0.6 }],
    ], DEF),
    step(inst, S) {
      longHair(inst, S);
      const B = (v) => V.add(S.pel, mv(S.Rc, v));
      inst.chains.sash.step(B([-3, 3, 14]), null, { g: 0.3, drag: 0.92 });
      inst.chains.sashB.step(B([3, 3, 14]), null, { g: 0.3, drag: 0.92 });
    },
    draw(c) {
      const { sc, S, t, Hd, inst } = c;
      sc.ribbon('sashA', inst.chains.sash.p, 3, 1.6, mat('#b3263b'), 1, { plain: true });
      sc.ribbon('sashB', inst.chains.sashB.p, 2.6, 1.4, mat('#d8344c'), 0.9, { plain: true });
      // Mặt nạ trăng khuyết che nửa mặt (bên trái người xem), khe mắt đỏ phát sáng.
      sc.decal('mask', S.headC, S.Rh, c.R, [[44, -96], [46, -60], [40, -22], [24, -4], [-6, -4], [-30, -16], [-40, -44], [-26, -76], [4, -96]], '#d9dbe3', { grow: 1.05, zb: 0.7, sub: 4, attrs: { stroke: '#a7a9b6', 'stroke-width': 1.2 } });
      c.mk('maskEye', -4, -28, '<path d="M-8,1 L8,-3" stroke="#d8344c" stroke-width="3.6" stroke-linecap="round" opacity="' + (0.65 + 0.35 * Math.sin(t * 4)).toFixed(2) + '"/>', 1.2);
      sc.limb('crown', Hd([0, 33, 0]), Hd([0, 52, 0]), 7, 0.8, mat('#c9c3d6'), 1.2);
      // Viên huyết châu trên tay giơ cao.
      const A = S.arms[1], hand = V.add(A.W, V.mul(V.norm(V.sub(A.W, A.E)), 4.5)), orb = V.add(hand, [0, 15, 4]), pu = 1 + 0.12 * Math.sin(t * 3.4);
      let n = sc.ops.length;
      sc.sphere('orbG', orb, [20 * pu, 20 * pu], mat('#e0485e'), 1.5);
      fade(sc, n, 0.3);
      sc.sphere('orb', orb, [10.5 * pu, 10.5 * pu], mat('#e0485e'), 1.6);
      sc.sphere('orbC', V.add(orb, [-1.5, 1.5, 4]), [4.6, 4.6], mat('#ffd0d6'), 1.7);
      // Trăng máu sau lưng, xoáy Thôn Nguyệt Quyết xoay ngược, vòng nhịp.
      const rot = -((t * 40) % 360), ring = 62 + 4 * Math.sin(t * 2);
      backDisc(c, 'moon', 120, -76, '<circle r="72" fill="#c8243c" fill-opacity=".2"/><circle r="56" fill="#d8344c" fill-opacity=".12"/><circle r="' + ring.toFixed(1) + '" fill="none" stroke="#d8344c" stroke-width="3" opacity=".7"/>' +
        '<g transform="rotate(' + rot.toFixed(1) + ')" fill="none" stroke="#b3263b" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M0,60 C46,56 60,6 38,-26"/><path d="M0,-60 C-46,-56 -60,-6 -38,26"/><path d="M60,0 C52,-44 8,-62 -22,-42"/></g>');
      // Hạt sáng bị hút xoắn ốc vào huyết châu.
      for (let i = 0; i < 8; i++) {
        const ph = frac(t * 0.32 + i / 8), a = i * 0.785 + ph * 3.4, r = lerp(92, 8, Math.pow(ph, 1.25));
        const pos = V.add(orb, [Math.cos(a) * r, (1 - ph) * (i % 2 ? 26 : -22), Math.sin(a) * r * 0.7]);
        c.dot('mo' + i, pos, 3.2 * (1 - ph * 0.5), '#ffb3bd', Math.sin(ph * Math.PI) * 0.95);
      }
    },
  };

  // ===================================================================================================================================
  // Thụy Nguyệt Sứ Miên Hồ
  LOOKS.mien = {
    skin: '#ffe3cf', start: 1.5, skirtR: 28, hairStyle: 'long', chains: LONG.concat([['sm0', 9, 8], ['sm1', 9, 8], ['sm2', 9, 8]]),
    pal: { robe: '#8e6bbf', trim: '#e0c3ff', inner: '#e8dbff', belt: '#e0c3ff', boot: '#5b3f8a', leg: '#5b3f8a', hair: '#1d1822' },
    face: { eye: 'sly', brow: null, mouth: null, nose: false },
    clip: () => new Clip(7.2, [
      [0, { yaw: 10, hb: [34, 16, 30], ha: [-28, -34, 6], hd: [-6, 0, 8], g: -16, br: 0 }],
      [1.8, { yaw: 14, hb: [38, 22, 34], ha: [-30, -30, 8], hd: [4, 1, -6], g: 16, br: 1 }],
      [3.6, { yaw: 10, hb: [34, 16, 30], ha: [-28, -34, 6], hd: [-6, 0, 8], g: -16, br: 0 }],
      [5.4, { yaw: 14, hb: [38, 22, 34], ha: [-30, -30, 8], hd: [4, 1, -6], g: 16, br: -0.6 }],
    ], DEF),
    step(inst, S) {
      longHair(inst, S);
      const B = (v) => V.add(S.pel, mv(S.Rc, v));
      [0, 1, 2].forEach((i) => {
        const ch = inst.chains['sm' + i];
        ch.step(B([32 + i * 3, 12 + i * 2, 8]), null, { g: -0.26, drag: 0.93 });
        for (let j = 1; j < ch.p.length; j++) ch.p[j][0] += Math.sin(inst.clock * 1.6 + j * 0.9 + i * 2) * 0.4;
      });
    },
    draw(c) {
      const { sc, S, t, Hd, Bd, inst } = c;
      // Mặt nạ hồ ly: tấm mặt dán lên mặt cầu, tai nhọn, vạch đỏ và mũi.
      sc.decal('mask', S.headC, S.Rh, c.R, [[46, -62], [48, -20], [50, 0], [48, 20], [46, 62], [12, 72], [-18, 58], [-38, 28], [-46, 0], [-38, -28], [-18, -58], [12, -72]], '#fff8f2', { grow: 1.05, zb: 0.7, sub: 4, attrs: { stroke: '#d9cfc3', 'stroke-width': 1.2 } });
      c.mk('rk', 12, -26, line('M-8,-5 L8,4', 2.6, '#c23a2e'), 1.2); c.mk('rl', 12, 26, mir(line('M-8,-5 L8,4', 2.6, '#c23a2e')), 1.2);
      c.mk('fx', -22, 0, MOUTH.fox, 1.2);
      const ear = (s) => [Hd([s * 26, 30, 0]), Hd([s * 40, 66, -2]), Hd([s * 8, 40, 0])];
      [-1, 1].forEach((s, i) => {
        sc.flat('ear' + i, ear(s), mat('#fff8f2'), 1.4, { stroke: '#c23a2e', sw: 1.4 });
        sc.flat('earIn' + i, [Hd([s * 24, 34, 0.5]), Hd([s * 34, 56, -1.5]), Hd([s * 12, 40, 0.5])], mat('#e8a0a0'), 1.5, { stroke: 'none', sw: 0 });
      });
      // Quạt tím phe phẩy ở tay phải.
      const A = S.arms[1], cc = V.add(A.W, V.mul(V.norm(V.sub(A.W, A.E)), 4)), base = c.P.g, poly = [cc];
      const pt = (ang, r) => V.add(cc, mv(S.Rc, [Math.sin((base + ang) * Math.PI / 180) * r, Math.cos((base + ang) * Math.PI / 180) * r, 0]));
      for (let i = 0; i <= 8; i++) poly.push(pt(-30 + (60 * i) / 8, 34));
      sc.flat('fan', poly, mat('#c9b0f0'), 1.5, { stroke: '#5b3f8a', sw: 1 });
      sc.flat('fanArt', [pt(-20, 14), pt(-8, 24), pt(8, 16), pt(22, 26), pt(20, 18), pt(6, 10), pt(-8, 16), pt(-18, 10)], mat('#8e6bbf'), 1.6, { stroke: 'none', sw: 0 });
      // Túi hương bên hông và khói cuộn.
      sc.sphere('pouch', Bd([32, 8, 8]), [6, 7], mat('#e0c3ff'), 1);
      [0, 1, 2].forEach((i) => {
        const n = sc.ops.length;
        sc.ribbon('sm' + i, inst.chains['sm' + i].p, 5.4 - i * 0.6, 1.6, mat('#b79be0'), 2, { plain: true });
        fade(sc, n, 0.7);
      });
      // Chữ Z bay lên.
      for (let i = 0; i < 2; i++) {
        const ph = frac(t * 0.28 + i * 0.5), pos = V.add(S.headC, [-30 - i * 12 + Math.sin(ph * 6) * 4, 28 + ph * 44, 6]);
        sprite(c, 'z' + i, pos, 1.2 - i * 0.3, '<path d="M-6,6 H6 L-6,-6 H6" stroke="#8e6bbf" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="' + (Math.sin(ph * Math.PI) * 0.9).toFixed(2) + '"/>');
      }
    },
  };

  // ===================================================================================================================================
  // Huyễn Nguyệt Sứ Thiên Diện
  LOOKS.dien = {
    skin: '#ffe3cf', start: 1, skirtR: 28, hairStyle: 'knot', chains: [],
    pal: { robe: '#d0892c', trim: '#f3d36b', inner: '#2a1d2c', belt: '#2a1d2c', boot: '#2a1d2c', leg: '#2a1d2c', hair: '#2a1d2c' },
    face: { eye: null, brow: null, mouth: null, nose: false },
    clip: () => new Clip(6, [
      [0, { yaw: -10, roll: 3, x: -2, ha: [-46, 10, 20], hb: [34, -22, 16], hd: [10, 0, -8] }],
      [1.5, { yaw: 2, roll: -3, x: 2, ha: [-34, -18, 14], hb: [48, 16, 22], hd: [-8, 0, 8], br: 1 }],
      [3, { yaw: 12, roll: 3, x: -2, ha: [-30, 24, 24], hb: [40, -10, 14], hd: [8, 0, -8] }],
      [4.5, { yaw: 2, roll: -3, x: 2, ha: [-44, -6, 16], hb: [30, 20, 24], hd: [-6, 0, 8], br: -1 }],
    ], DEF),
    draw(c) {
      const { sc, S, t, Hd, Bd } = c;
      // Mũ hai cánh: cánh trái cam, cánh phải đen, bi vàng ở đầu cánh.
      sc.sphere('cap', Hd([0, 30, 0]), [36, 17], mat('#2a1d2c'), 1);
      sc.limb('wingL', Hd([-18, 36, 0]), Hd([-54, 62, -4]), 8, 3, mat('#e8892c'), 1.4);
      sc.limb('wingR', Hd([18, 36, 0]), Hd([54, 62, -4]), 8, 3, mat('#2a1d2c'), 1.4);
      sc.sphere('ballL', Hd([-54, 62, -4]), [5.4, 5.4], mat('#f3d36b'), 1.6);
      sc.sphere('ballR', Hd([54, 62, -4]), [5.4, 5.4], mat('#f3d36b'), 1.6);
      sc.limb('peak', Hd([0, 40, 0]), Hd([0, 58, -2]), 6, 1.6, mat('#d0892c'), 1.4);
      // Ba chiếc mặt nạ thay nhau (mỗi chiếc 2 giây), lóe sáng lúc đổi.
      const k = ((Math.floor(t / 2) % 3) + 3) % 3, u = frac(t / 2), tone = ['#ffffff', '#f3d36b', '#e8e8f2'][k];
      sc.decal('mask', S.headC, S.Rh, c.R, [[42, -58], [46, -20], [46, 20], [42, 58], [8, 66], [-28, 46], [-42, 0], [-28, -46], [8, -66]], tone, { grow: 1.05, zb: 0.7, sub: 4, attrs: { stroke: '#5a3b2c', 'stroke-width': 1.4 } });
      c.mk('meA', -4, -26, line('M-7,1 q7,-6 14,0', 3), 1.2); c.mk('meB', -4, 26, mir(line('M-7,1 q7,-6 14,0', 3)), 1.2);
      c.mk('mm', -30, 0, [line('M-8,-1 Q0,6 8,-1', 2.6), line('M-8,3 Q0,-4 8,3', 2.6), '<circle r="4" fill="' + INK + '"/>'][k], 1.2);
      if (u < 0.12) c.mk('flash', 4, 0, '<ellipse rx="40" ry="38" fill="#fff" opacity="' + (0.7 * (1 - u / 0.12)).toFixed(2) + '"/>', 1.4);
      // Ba đèn lồng bay quanh thân, sáng chập chờn.
      for (let i = 0; i < 3; i++) {
        const dir = i % 2 ? -1 : 1, pos = orbit(t, i, 74 + i * 7, 62 + i * 38 + Math.sin(t * 1.7 + i) * 6, i * 2.1, 0.55 * dir);
        sc.limb('lnc' + i, V.add(pos, [0, 17, 0]), V.add(pos, [0, 9, 0]), 0.7, 0.7, mat('#5a3b2c'), 0);
        sc.sphere('lnb' + i, pos, [9.4, 11], mat('#e8892c'), 0);
        c.dot('lng' + i, V.add(pos, [0, 0, 2]), 5.6, '#ffd27a', 0.55 + 0.4 * Math.sin(t * 5 + i * 2), 0.5);
        sc.limb('lnt' + i, V.add(pos, [0, -10, 0]), V.add(pos, [0, -18, 0]), 3, 1, mat('#b35f12'), 0);
      }
    },
  };

  // ===================================================================================================================================
  // Tật Nguyệt Sứ Lôi Tốc
  LOOKS.loi = {
    skin: '#ffe3cf', start: 0.2, skirtR: 24, hairStyle: 'knot', chains: [['tailA', 6, 7], ['tailB', 6, 7]],
    pal: { robe: '#3b7dd8', trim: '#9fd0ff', inner: '#12243f', belt: '#1f3f73', boot: '#12243f', leg: '#12243f', hair: '#1d1822' },
    face: { eye: 'fierce', brow: 'fierce', mouth: 'flat' },
    clip: () => new Clip(2.2, [
      [0, { yaw: 20, y: -8, z: -6, pitch: 6, hem: 44, kn: 0.4, fa: [-18, -10, 0, -10], fb: [18, 16, 0, 10], ha: [-6, 6, 32], hb: [10, 6, 36], hd: [-8, 2, 0] }],
      [0.5, { yaw: 8, y: -15, z: -12, pitch: 9, hem: 40, kn: 0.45, fa: [-18, -12, 0, -10], fb: [18, 14, 0, 10], ha: [-14, 8, 30], hb: [16, 8, 34], hd: [-10, 3, 0] }],
      [0.8, { yaw: -12, y: -4, z: 18, pitch: 14, hem: 46, kn: 0.3, fa: [-16, -14, 0, -6], fb: [16, 36, 0, 6], ha: [-52, 14, 30], hb: [54, -4, 36], hd: [6, 4, 0], br: 1 }],
      [1.3, { yaw: 12, y: -6, z: 6, pitch: 8, hem: 44, fa: [-18, -10, 0, -8], fb: [18, 20, 0, 8], ha: [-30, 10, 24], hb: [30, 4, 30], hd: [4, 2, 0] }],
    ], DEF),
    step(inst, S) {
      const H = (v) => V.add(S.headC, mv(S.Rh, v)), w = Math.sin(inst.clock * 9);
      [['tailA', 0, 1], ['tailB', 6, -1]].forEach(([n, dz, s]) => {
        const ch = inst.chains[n];
        ch.step(H([36, 22 - dz, -8]), null, { g: 0.08, drag: 0.9 });
        for (let j = 1; j < ch.p.length; j++) ch.p[j][1] += Math.sin(inst.clock * 11 + j + s) * 0.4 + w * 0.05;
      });
    },
    draw(c) {
      const { sc, S, t, Hd, inst, cam } = c;
      // Khăn buộc trán và đuôi khăn; tóc dựng nhọn.
      sc.decal('band', S.headC, S.Rh, c.R, [[24, -104], [24, -60], [27, 0], [24, 60], [24, 104], [11, 104], [11, 60], [14, 0], [11, -60], [11, -104]], '#1f3f73', { grow: 1.06, zb: 0.8, sub: 4 });
      [[-24, 0], [-12, 10], [0, 14], [12, 10], [24, 0]].forEach(([x, z], i) => sc.limb('sp' + i, Hd([x, 30, z]), Hd([x * 1.5, 56 - Math.abs(x) * 0.3, z * 1.5 - 2]), 7, 0.8, mat('#1d1822'), 1.3));
      sc.ribbon('khanA', inst.chains.tailA.p, 3.4, 1.4, mat('#1f3f73'), 0.9, { plain: true });
      sc.ribbon('khanB', inst.chains.tailB.p, 3, 1.2, mat('#3b7dd8'), 0.9, { plain: true });
      // Song đao: cầm theo hướng cẳng tay.
      S.arms.forEach((A, i) => {
        const fwd = V.norm(V.sub(A.W, A.E)), d0 = V.norm(V.add(fwd, [0, 0.12, 0.1])), hand = V.add(A.W, V.mul(fwd, 4.5));
        const d = V.norm(V.sub(d0, V.mul(cam.fwd, V.dot(d0, cam.fwd) * 0.75)));
        const w = V.norm(V.cross(d, cam.fwd));
        sc.limb('sh' + i, V.sub(hand, V.mul(d, 9)), V.add(hand, V.mul(d, 5)), 2.8, 2.8, mat('#1f3f73'), 1.2);
        sc.limb('sg' + i, V.add(hand, V.add(V.mul(d, 6), V.mul(w, 6))), V.add(hand, V.add(V.mul(d, 6), V.mul(w, -6))), 1.8, 1.8, mat('#9fd0ff'), 1.3);
        const b0 = V.add(hand, V.mul(d, 7)), b1 = V.add(hand, V.mul(d, 58)), b2 = V.add(V.add(hand, V.mul(d, 66)), V.mul(w, -3));
        sc.flat('sb' + i, [V.add(b0, V.mul(w, 2.6)), V.add(b1, V.mul(w, 3.4)), b2, V.add(b1, V.mul(w, -1.2)), V.add(b0, V.mul(w, -2.6))], mat('#dfe8f2'), 1.4, { stroke: '#7d93ab' });
      });
      // Bóng ảnh: thân cũ vẽ mờ phía sau (khoảng 0,22 giây trước).
      const old = inst.hist.sk[Math.max(0, inst.hist.sk.length - 14)];
      if (old && old !== S) {
        const n = sc.ops.length, gm = mat('#9fd0ff');
        old.legs.forEach((Lg, i) => { sc.limb('gl' + i, Lg.H, Lg.A, 8, 6.4, gm, -90); });
        sc.tube('gtorso', [ringOf(old, 45, 15, 10.5), ringOf(old, 22, 20.5, 14.5), ringOf(old, 8, 18, 13)], gm, { zb: -88 });
        sc.sphere('ghead', old.headC, [37, 34], gm, -88);
        old.arms.forEach((A, i) => { sc.limb('ga' + i, A.S, A.E, 9, 8, gm, -88); sc.limb('gb' + i, A.E, A.W, 8, 11, gm, -88); });
        fade(sc, n, 0.26);
      }
      // Tia chớp lóe theo nhịp.
      const ph = t % 2.2;
      if (ph < 0.12 || (ph > 0.44 && ph < 0.56)) {
        sprite(c, 'bolt0', [-74, 150, -10], 1, '<path d="M8,40 L-6,6 L4,4 L-12,-34" stroke="#9fd0ff" stroke-width="4" fill="none" stroke-linejoin="round"/>');
        sprite(c, 'bolt1', [78, 142, -16], 1, '<path d="M-8,40 L6,8 L-4,6 L12,-30" stroke="#9fd0ff" stroke-width="4" fill="none" stroke-linejoin="round"/>');
      }
    },
  };

  // ===================================================================================================================================
  // Âm Nguyệt Sứ Khúc U
  LOOKS.khuc = {
    skin: '#f2ece8', start: 1, skirtR: 28, hairStyle: 'long', chains: LONG.concat([['front', 8, 10]]),
    pal: { robe: '#4f8a83', trim: '#a7d3cc', inner: '#1d2e2c', belt: '#a7d3cc', boot: '#1d2e2c', leg: '#1d2e2c', hair: '#14181c' },
    face: { eyeA: null, eyeB: 'cold', brow: 'cold', mouth: null },
    clip: () => new Clip(6, [
      [0, { yaw: 8, ha: [-12, 22, 30], hb: [24, 20, 30], hd: [-6, 2, 4], br: -0.5 }],
      [2, { yaw: 12, ha: [-12, 24, 31], hb: [26, 22, 30], hd: [4, 0, -3], br: 1 }],
      [4, { yaw: 8, ha: [-13, 21, 30], hb: [24, 19, 31], hd: [-2, 3, 4], br: 0 }],
    ], DEF),
    step(inst, S) {
      longHair(inst, S);
      const a = V.add(S.headC, mv(S.Rh, [-30, 24, 14]));
      inst.chains.front.step(a, rest(a, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => mv(S.Rh, V.norm([-0.1, -1, 0.25 - i * 0.02]))), 10), { stiff: 0.06, g: 0.22, drag: 0.9 });
    },
    draw(c) {
      const { sc, S, t, inst } = c;
      // Tóc che mắt trái.
      sc.decal('cover', S.headC, S.Rh, c.R, [[46, -96], [42, -52], [26, -16], [0, -10], [-24, -30], [-42, -62], [-30, -96]], 'url(#GID-' + mat('#14181c').id + ')', { grow: 1.07, zb: 0.9, sub: 4 });
      sc.ribbon('hairF', inst.chains.front.p, 5, 2.4, mat('#14181c'), 1.1, { plain: true });
      // Sáo xương ngang môi: hai tay giữ hai đầu.
      const WA = S.arms[0].W, WB = S.arms[1].W, u = V.norm(V.sub(WB, WA)), e0 = V.sub(WA, V.mul(u, 9)), e1 = V.add(WB, V.mul(u, 11));
      sc.limb('flute', e0, e1, 2.7, 2.7, mat('#efe8dc'), 2);
      [0.55, 0.68, 0.8].forEach((f, i) => sc.sphere('hole' + i, V.add(V.lerp(e0, e1, f), [0, 1.5, 2]), [1.2, 1.2], mat('#8f826d'), 2.1));
      // Vòng âm thanh lan ra từ đầu sáo; nốt nhạc bay.
      const dir = V.norm(V.add(u, [0.2, 0.1, 0.5]));
      for (let i = 0; i < 3; i++) {
        const ph = frac(t * 0.7 + i / 3), pos = V.add(e1, V.mul(dir, 8 + ph * 18));
        const rr = 6 + ph * 40;
        sprite(c, 'rg' + i, pos, rr, '<circle r="1" fill="none" stroke="#4f8a83" stroke-width="' + (2.4 / rr).toFixed(3) + '" opacity="' + ((1 - ph) * 0.85).toFixed(2) + '"/>');
      }
      for (let i = 0; i < 2; i++) {
        const ph = frac(t * 0.3 + i * 0.5), pos = V.add(e1, [10 + i * 12 + Math.sin(ph * 7) * 5, 6 + ph * 52, 4 + i * 8]);
        sprite(c, 'nt' + i, pos, 1.1, '<g opacity="' + (Math.sin(ph * Math.PI) * 0.95).toFixed(2) + '"><ellipse rx="5" ry="3.6" fill="#2e5e58" transform="rotate(-20)"/><path d="M4,1 V17 l8,-3" stroke="#2e5e58" stroke-width="2" fill="none"/></g>');
      }
    },
  };

  // ===================================================================================================================================
  // Thiên Thủ Nguyệt Sứ Bách Tý
  const WEAPONS = [
    '<path d="M0,-58 L0,-26" stroke="#c9d3dc" stroke-width="4"/><path d="M-6,-26 H6" stroke="#5a3b2c" stroke-width="4"/>',
    '<path d="M0,-62 L0,-24" stroke="#5a3b2c" stroke-width="3"/><path d="M-6,-62 L0,-74 L6,-62Z" fill="#c9d3dc"/>',
    '<path d="M0,-60 L0,-26" stroke="#5a3b2c" stroke-width="3"/><path d="M0,-60 C14,-62 16,-46 2,-44Z" fill="#c9d3dc"/>',
    '<path d="M0,-56 L0,-26" stroke="#5a3b2c" stroke-width="3"/><rect x="-9" y="-66" width="18" height="12" rx="2" fill="#8d8898"/>',
    '<circle cx="0" cy="-48" r="10" fill="none" stroke="#c9d3dc" stroke-width="3"/><circle cx="0" cy="-48" r="3" fill="#c9d3dc"/>',
    '<path d="M0,-58 L0,-30" stroke="#c9d3dc" stroke-width="3"/><path d="M-5,-30 H5" stroke="#5a3b2c" stroke-width="3"/><path d="M0,-58 l-3,-6 l3,-4 l3,4Z" fill="#c9d3dc"/>',
  ];
  LOOKS.bach = {
    skin: '#f0c9a8', start: 0, s: 1.04, bulk: 1.26, shoulder: 28, shadow: 1.15, skirtR: 31, arms4: true, hairStyle: 'bald', chains: [],
    pal: { robe: '#9a5b2e', sleeve: '#874f27', trim: '#d7a35f', inner: '#3a2414', belt: '#5a3b2c', boot: '#3a2414', leg: '#5a3b2c', hair: '#1d1822', buckle: '#d7a35f' },
    face: { eye: 'fierce', brow: 'heavy', mouth: 'frown', nose: false },
    clip: () => new Clip(8, [
      [0, { yaw: 8, y: -8, hem: 12, kn: 0.45, fa: [-26, 0, 0, 8], fb: [26, 0, 0, -8], hd: [0, 2, 0], br: 0 }],
      [4, { yaw: -6, y: -9, hem: 12, kn: 0.45, fa: [-26, 0, 0, 8], fb: [26, 0, 0, -8], hd: [0, 0, 0], br: 1 }],
    ], DEF),
    tweak(P, t) {
      const w = t * 1.5, o = (i, cx, cy, cz, r) => [cx + Math.cos(w + i * 1.57) * r, cy + Math.sin(w + i * 1.57) * r * 0.9, cz];
      P.ha = o(0, -48, 26, 22, 9); P.hb = o(2, 48, 26, 22, 9); P.hc = o(1, -40, -4, 30, 8); P.he = o(3, 40, -4, 30, 8);
    },
    draw(c) {
      const { sc, S, t, Hd, Bd } = c;
      // Búi tó, râu, ngọc trán.
      sc.sphere('knot', Hd([0, 38, -2]), [10.5, 9], mat('#1d1822'), 1.2);
      sc.limb('band', Hd([-8, 33, -1]), Hd([8, 33, -1]), 3, 3, mat('#c23a2e'), 1.3);
      sc.decal('beard', S.headC, S.Rh, c.R, [[-24, -52], [-30, -22], [-34, 0], [-30, 22], [-24, 52], [-48, 30], [-56, 0], [-48, -30]], 'url(#GID-' + mat('#1d1822').id + ')', { grow: 1.05, zb: 0.7, sub: 3 });
      c.mk('must', -24, 0, '<path d="M-14,0 Q-6,-5 0,0 Q6,-5 14,0" stroke="#1d1822" stroke-width="3.4" fill="none" stroke-linecap="round"/>', 1.2);
      // Giáp đồng: vai, ngực.
      S.arms.forEach((A, i) => sc.sphere('pld' + i, V.add(A.S, [0, 3, 0]), [13, 11], mat('#b98a4c'), 1.4));
      sc.planar('plate', Bd([0, 28, 18.6]), mv(S.Rc, [1, 0, 0]), mv(S.Rc, [0, 1, 0]), '<rect x="-19" y="-14" width="38" height="26" rx="5" fill="#b98a4c" fill-opacity=".72" stroke="#5a3b2c" stroke-width="1"/><path d="M-19,-1 H19" stroke="#5a3b2c" stroke-width="1.4"/><circle cx="-12" cy="-7" r="1.6" fill="#5a3b2c"/><circle cx="12" cy="-7" r="1.6" fill="#5a3b2c"/><circle cx="-12" cy="6" r="1.6" fill="#5a3b2c"/><circle cx="12" cy="6" r="1.6" fill="#5a3b2c"/>', { zb: 0.8 });
      // Bánh xe binh khí sau lưng.
      const wheel = WEAPONS.map((w, i) => '<g transform="rotate(' + i * 60 + ')">' + w + '</g>').join('');
      backDisc(c, 'wheel', 112, -46, '<circle r="68" fill="none" stroke="#9a5b2e" stroke-width="2" stroke-dasharray="4 6" opacity=".6"/><g transform="rotate(' + ((t * 50) % 360).toFixed(1) + ') scale(1.3 -1.3)">' + wheel + '</g>');
    },
  };

  // ===================================================================================================================================
  // Lưu Ly Nguyệt Sứ Ngọc Vô Hà
  LOOKS.ngoc = {
    skin: '#ffe8da', start: 1, skirtR: 28, hairStyle: 'knot', chains: [],
    pal: { robe: '#5aa6b8', trim: '#ffffff', inner: '#e9f7fa', belt: '#9fdbe8', boot: '#e9f7fa', leg: '#9fdbe8', hair: '#1d1822', buckle: '#5fae8f' },
    face: { eye: 'cold', brow: 'cold', mouth: 'flat' },
    clip: () => new Clip(8, [
      [0, { yaw: -8, ha: [-18, -26, -10], hb: [24, 14, 30], hd: [-4, -3, 0], br: -0.4 }],
      [4, { yaw: -4, ha: [-18, -26, -10], hb: [28, 22, 32], hd: [4, -4, -3], br: 1 }],
    ], DEF),
    draw(c) {
      const { sc, S, t, Hd, Bd, ringAt } = c;
      sc.sphere('knot', Hd([0, 39, -4]), [13, 13], mat('#1d1822'), 1.2);
      sc.limb('pin', Hd([-22, 40, -2]), Hd([26, 38, -6]), 1.8, 1.8, mat('#5fae8f'), 1.4);
      // Giáp lưu ly: lớp ngoài trong như thủy tinh, mặt cắt, mảnh vai, đai hông.
      const n = sc.ops.length;
      sc.tube('armor', [ringAt(44, 16, 11.4), ringAt(36, 23.4, 16), ringAt(20, 22, 15.6), ringAt(9, 19.4, 14)], mat('#bfeaf3'), { zb: 0.4 });
      fade(sc, n, 0.78);
      sc.planar('facet', Bd([0, 27, 16.4]), mv(S.Rc, [1, 0, 0]), mv(S.Rc, [0, 1, 0]), '<g fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"><path d="M-17,12 L-7,-14 L7,-14 L17,12 L0,18Z"/><path d="M-7,-14 L0,18 L7,-14 M-17,12 L0,-2 L17,12" fill="none"/></g>', { zb: 0.9 });
      S.arms.forEach((A, i) => {
        const s = i ? 1 : -1, P0 = A.S;
        sc.flat('sh' + i, [V.add(P0, [s * 4, 12, 4]), V.add(P0, [s * 18, 2, 2]), V.add(P0, [s * 10, -10, 4]), V.add(P0, [s * 0, 0, 8])], mat('#bfeaf3'), 1.5, { stroke: '#fff', sw: 1.2 });
      });
      const band = [{ c: V.add(S.pel, [0, -8, 0]), u: mv(S.Ry, [27, 0, 0]), w: mv(S.Ry, [0, 0, 20]) }, { c: V.add(S.pel, [0, -22, 0]), u: mv(S.Ry, [29, 0, 0]), w: mv(S.Ry, [0, 0, 22]) }];
      const n2 = sc.ops.length;
      sc.tube('hipband', band, mat('#9fdbe8'), { zb: 0.2, edge: '#ffffff' });
      fade(sc, n2, 0.7);
      // Ánh lóe nhấp nháy trên giáp.
      [[-12, 28, 17], [13, 20, 16], [4, -2, 20], [-6, 14, 18]].forEach((p, i) => {
        const f = Math.max(0, Math.sin(t * 2.6 + i * 1.9));
        sprite(c, 'gl' + i, i < 3 ? Bd(p) : V.add(S.pel, mv(S.Ry, [p[0], p[1] - 24, p[2] + 6])), 0.4 + f * 1.2, '<path d="M0,7 L2,2 L7,0 L2,-2 L0,-7 L-2,-2 L-7,0 L-2,2Z" fill="#fff" opacity="' + (f * 0.95).toFixed(2) + '"/>');
      });
      // Bốn kim băng lơ lửng bay vòng.
      for (let i = 0; i < 4; i++) {
        const a = t * 0.8 + i * 1.57, p0 = [Math.cos(a) * 68, 76 + i * 22 + Math.sin(t * 1.6 + i) * 4, Math.sin(a) * 52];
        const tan = V.norm([-Math.sin(a) * 68, 0.9, Math.cos(a) * 52]);
        sc.limb('nd' + i, p0, V.add(p0, V.mul(tan, 24)), 1.9, 0.5, mat('#bfeaf3'), 0.5);
        c.dot('ng' + i, p0, 2.4, '#ffffff', 0.85, 0.6);
      }
    },
  };

  // ===================================================================================================================================
  // Khô Nguyệt Sứ Khô Vinh
  LOOKS.kho = {
    skin: '#e6d6b8', start: 1, s: 0.93, bulk: 0.86, shoulder: 20, skirtR: 25, hairStyle: 'knot', chains: [['beard', 5, 6]],
    pal: { robe: '#7d7a3a', trim: '#c9c27a', inner: '#3a3818', belt: '#3a3818', boot: '#3a3818', leg: '#3a3818', hair: '#f2efe6' },
    face: { eye: 'dot', brow: 'white', mouth: 'old', nose: false },
    hairR: [36, 33],
    clip: () => new Clip(6, [
      [0, { yaw: 10, pitch: 15, y: -3, x: 2, hb: [34, -30, 16], ha: [-24, -6, 26], hd: [0, -9, 0], br: -0.2 }],
      [3, { yaw: 12, pitch: 17, y: -5, x: 3, hb: [36, -30, 18], ha: [-24, -4, 28], hd: [3, -11, 2], br: 1 }],
    ], DEF),
    step(inst, S) {
      const a = V.add(S.headC, mv(S.Rh, [0, -22, 24]));
      inst.chains.beard.step(a, rest(a, [0, 1, 2, 3, 4].map(() => V.norm([0, -1, 0.1])), 6), { stiff: 0.08, g: 0.2, drag: 0.9 });
    },
    draw(c) {
      const { sc, S, t, Hd } = c;
      sc.sphere('knot', Hd([0, 36, -4]), [7, 6], mat('#f2efe6'), 1.2);
      sc.ribbon('beard', c.inst.chains.beard.p, 9, 2, mat('#f2efe6'), 1.2, { plain: true });
      // Gậy cành khô ở tay phải; ba nhánh khô ở đầu gậy.
      const R = S.arms[1], hand = V.add(R.W, V.mul(V.norm(V.sub(R.W, R.E)), 4.5)), base = [hand[0] + 6, 2, hand[2] - 2], tip = V.add(hand, [3, 58, 0]);
      sc.limb('staff', base, tip, 2.8, 2, mat('#5a4428'), 1.2);
      [[-12, 12], [10, 14], [-4, 20]].forEach(([dx, dy], i) => sc.limb('br' + i, V.add(tip, [0, -8 + i * 2, 0]), V.add(tip, [dx, dy, 0]), 1.8, 0.6, mat('#5a4428'), 1.2));
      // Viên đan đỏ nhấp nháy ở tay trái.
      const Lh = S.arms[0], palm = V.add(V.add(Lh.W, V.mul(V.norm(V.sub(Lh.W, Lh.E)), 4.5)), [0, 9, 2]), fl = 0.55 + 0.45 * Math.abs(Math.sin(t * 5.3 + Math.sin(t * 2)));
      c.dot('pillG', palm, 11, '#d8344c', 0.28 * fl, 1.4);
      c.dot('pill', palm, 6, '#d8344c', 0.7 + 0.3 * fl, 1.6);
      c.dot('pillH', V.add(palm, [-1.4, 1.6, 3]), 2.2, '#ffd0d6', 1, 1.7);
      // Lá úa rơi.
      const cols = ['#a68a3a', '#8a6d2c', '#b59a4c', '#7d6326'];
      for (let i = 0; i < 6; i++) {
        const ph = frac(t * 0.2 + i / 6), pos = [(i - 2.5) * 30 + Math.sin(t * 1.3 + i * 2) * 10, 190 - ph * 186, 30 * Math.sin(i * 2.3)];
        sprite(c, 'lf' + i, pos, 1, '<g transform="rotate(' + ((ph * 300 + i * 50) % 360).toFixed(0) + ')" opacity="' + Math.min(1, Math.sin(ph * Math.PI) * 1.6).toFixed(2) + '"><path d="M0,-7 C7,-6 8,3 0,8 C-8,3 -7,-6 0,-7Z" fill="' + cols[i % 4] + '"/><path d="M0,-6 V7" stroke="#5a4428" stroke-width=".9"/></g>');
      }
      // Sinh khí bị hút từ đất lên tay trái.
      for (let i = 0; i < 6; i++) {
        const ph = frac(t * 0.5 + i / 6), e = ph * ph * (3 - 2 * ph);
        const p = V.lerp(V.lerp([-46, 2, 16], [-62, 44, 24], e), V.lerp([-62, 44, 24], palm, e), e);
        c.dot('dr' + i, p, 2.4, '#9fd28a', Math.sin(ph * Math.PI) * 0.9, 1.5);
      }
    },
  };

  // ===================================================================================================================================
  // Kính Nguyệt Sứ Ảnh Song
  LOOKS.kinh = {
    skin: '#ffe3cf', start: 1, skirtR: 28, hairStyle: 'knot', chains: [],
    pal: { robe: '#a08a4a', trim: '#f0d98a', inner: '#2a2214', belt: '#f0d98a', boot: '#2a2214', leg: '#2a2214', hair: '#1d1822' },
    face: { eyeA: 'sly', eyeB: 'gem', brow: null, mouth: 'smirk', nose: false },
    clip: () => new Clip(8, [
      [0, { yaw: 8, hb: [46, 6, 20], ha: [-20, -8, 26], hd: [8, 0, -6], br: 0 }],
      [2.7, { yaw: 12, hb: [50, 12, 24], ha: [-20, -6, 28], hd: [-6, 2, 4], br: 1 }],
      [5.4, { yaw: 6, hb: [44, 2, 16], ha: [-20, -10, 24], hd: [2, 0, -2], br: -0.5 }],
    ], DEF),
    draw(c) {
      const { sc, S, t, Hd } = c;
      sc.decal('dark', S.headC, S.Rh, c.R, [[44, -6], [46, -60], [20, -82], [-20, -72], [-44, -42], [-48, -6]], '#3a2a40', { grow: 1.06, zb: 0.6, sub: 4, attrs: { opacity: 0.5 } });
      sc.sphere('knot', Hd([0, 38, -4]), [12, 11], mat('#1d1822'), 1.2);
      sc.limb('pin', Hd([0, 40, -2]), Hd([0, 56, -2]), 2.6, 1, mat('#f0d98a'), 1.4);
      // Gương đồng lớn ở tay phải: viền, mặt gương, bóng người chập chờn, vệt sáng.
      const A = S.arms[1], hand = V.add(A.W, V.mul(V.norm(V.sub(A.W, A.E)), 4.5)), mc = V.add(hand, [12, 18, 12]);
      sc.limb('hdl', V.sub(hand, [0, 4, 0]), V.sub(mc, [0, 20, 0]), 3, 3, mat('#7a5a1c'), 1.3);
      const fl = 0.35 + 0.35 * Math.abs(Math.sin(t * 3.1 + Math.sin(t * 7)));
      sprite(c, 'mirror', mc, 0.8, '<circle r="34" fill="#c99a3c" stroke="#7a5a1c" stroke-width="4"/><circle r="28" fill="#e9d7a4"/><g opacity="' + fl.toFixed(2) + '" fill="#7a5a1c"><ellipse cx="0" cy="8" rx="9" ry="9"/><path d="M-14,-22 C-12,-4 12,-4 14,-22Z"/></g><path d="M-18,20 L-6,28" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>', { zb: 3 });
    },
  };

  // ===================================================================================================================================
  // Sương Nguyệt Sứ Lãnh Tịch
  LOOKS.suong = {
    skin: '#eaf1fb', start: 1, skirtR: 28, hairStyle: 'long', chains: LONG,
    pal: { robe: '#6f8fb3', trim: '#ffffff', inner: '#e6f0fb', belt: '#ffffff', boot: '#e6f0fb', leg: '#e6f0fb', hair: '#d9e5f6' },
    face: { eye: 'cold', brow: 'cold', mouth: 'flat' },
    clip: () => new Clip(9, [
      [0, { yaw: 4, ha: [-10, 2, 30], hb: [10, 2, 30], hd: [0, 2, 0], br: -0.5 }],
      [4.5, { yaw: 8, ha: [-10, 4, 31], hb: [10, 4, 31], hd: [3, 0, 2], br: 1 }],
    ], DEF),
    step(inst, S) { longHair(inst, S); },
    floor(c) {
      const { sc, S } = c;
      floorAt(sc, 'frost', S.pel[0], S.pel[2], '<ellipse rx="74" ry="26" fill="#dfeeff" fill-opacity=".8"/><ellipse rx="52" ry="16" fill="#fff" fill-opacity=".5"/>', { zb: -290 });
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.4, x = Math.cos(a) * (46 + (i % 3) * 8), z = Math.sin(a) * 18 + 4, h = 8 + (i % 3) * 5;
        sc.flat('ic' + i, [[x - 4, 0, z], [x + 4, 0, z], [x + 1, h, z]], mat('#cfe3ff'), -40, { stroke: '#fff', sw: 0.8 });
      }
    },
    draw(c) {
      const { sc, t, Hd } = c;
      sc.sphere('bun', Hd([0, 38, -4]), [17, 11], mat('#d9e5f6'), 1.4);
      sc.limb('pin', Hd([-24, 36, -4]), Hd([26, 42, -6]), 2, 2, mat('#9fd0ff'), 1.6);
      sc.flat('pinTip', [Hd([26, 42, -6]), Hd([36, 48, -6]), Hd([28, 36, -6])], mat('#9fd0ff'), 1.7, { stroke: 'none', sw: 0 });
      // Tinh thể băng bay vòng quanh thân.
      for (let i = 0; i < 4; i++) {
        const pos = orbit(t, i, 72, 112 + Math.sin(t * 1.3 + i * 1.6) * 8, i * 1.57, 0.6, 0.8);
        sprite(c, 'fk' + i, pos, 1.1, '<g transform="rotate(' + ((t * 40 + i * 30) % 360).toFixed(0) + ')" stroke="#cfe3ff" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M0,-8 V8 M-7,-4 L7,4 M-7,4 L7,-4"/></g>');
      }
    },
  };

  // ===================================================================================================================================
  // Thực Nguyệt Sứ Vô Vọng
  LOOKS.vong = {
    skin: '#b9adb8', start: 1, s: 1, bulk: 1.3, shoulder: 28, shadow: 1.3, skirtR: 33, hairStyle: 'knot', chains: [['chainA', 6, 9], ['chainB', 6, 9]],
    pal: { robe: '#3d3550', trim: '#6d6182', inner: '#16121e', belt: '#2a2433', boot: '#16121e', leg: '#2a2433', hair: '#16121e' },
    face: { eye: 'dot', brow: 'heavy', mouth: 'frown', nose: false },
    clip: () => new Clip(8, [
      [0, { yaw: 6, y: -4, hem: 12, ha: [-44, -30, 14], hb: [44, -30, 14], hd: [0, 6, 0], br: -1, fa: [-17, 0, 0, 0], fb: [17, 0, 0, 0] }],
      [4, { yaw: 10, y: -3, hem: 12, ha: [-48, -26, 18], hb: [48, -26, 18], hd: [3, 4, 2], br: 1, fa: [-17, 0, 0, 0], fb: [17, 0, 0, 0] }],
    ], DEF),
    step(inst, S) {
      [['chainA', S.arms[0].W, 1], ['chainB', S.arms[1].W, -1]].forEach(([n, a, s]) => {
        const ch = inst.chains[n];
        ch.step(a, null, { g: 0.5, drag: 0.96 });
        for (let j = 1; j < ch.p.length; j++) ch.p[j][0] += Math.sin(inst.clock * 1.5 + j * 0.5 + s) * 0.22;
      });
    },
    floor(c) {
      const { sc, S, t } = c;
      let rings = '';
      for (let i = 0; i < 3; i++) { const ph = frac(t * 0.36 + i / 3); rings += '<ellipse rx="' + (24 + ph * 56).toFixed(1) + '" ry="' + (7 + ph * 14).toFixed(1) + '" fill="none" stroke="#5b5070" stroke-width="2" opacity="' + ((1 - ph) * 0.9).toFixed(2) + '"/>'; }
      floorAt(sc, 'pool', S.pel[0], S.pel[2], '<ellipse rx="82" ry="27" fill="#1a1622"/>' + rings, { zb: -290 });
    },
    draw(c) {
      const { sc, S, t, Hd, inst } = c;
      sc.sphere('knot', Hd([0, 38, -2]), [11, 9], mat('#16121e'), 1.2);
      c.mk('scar', -10, 36, line('M-6,-8 L8,10', 2, '#8a6a7a'), 1.2);
      // Vầng nhật thực sau lưng: đĩa đen viền đỏ, tia rìa.
      const p = 1 + 0.04 * Math.sin(t * 1.6);
      let rays = '';
      for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r1 = 62, r2 = 70 + (i % 2) * 9; rays += '<path d="M' + (Math.cos(a) * r1).toFixed(1) + ',' + (Math.sin(a) * r1).toFixed(1) + ' L' + (Math.cos(a) * r2).toFixed(1) + ',' + (Math.sin(a) * r2).toFixed(1) + '" stroke="#d8344c" stroke-width="1.6" opacity=".55"/>'; }
      backDisc(c, 'eclipse', 124, -60, '<g transform="scale(' + p.toFixed(3) + ')"><circle r="56" fill="#120e18"/><circle r="56" fill="none" stroke="#d8344c" stroke-width="2.6" opacity=".85"/>' + rays + '</g>');
      // Hai sợi xích đen đung đưa từ cổ tay, đầu xích có mũi nhọn.
      ['chainA', 'chainB'].forEach((n, k) => {
        const pp = inst.chains[n].p;
        sc.ribbon('ch' + k, pp, 2.6, 2.2, mat('#2a2433'), 1.2, { plain: true });
        pp.forEach((q, j) => { if (j) sc.sphere('lk' + k + '_' + j, q, [3.6, 3.6], mat(j % 2 ? '#3d3550' : '#2a2433'), 1.3); });
        const e = pp[pp.length - 1], d = V.norm(V.sub(e, pp[pp.length - 2]));
        sc.flat('sp' + k, [V.add(e, V.mul([d[1], -d[0], 0], 3.4)), V.add(e, V.mul(d, 13)), V.add(e, V.mul([-d[1], d[0], 0], 3.4))], mat('#2a2433'), 1.4, { stroke: '#6d6182', sw: 0.8 });
      });
    },
  };

  // ---- API công khai ------------------------------------------------------------------------------------------------------------
  let counter = 0;
  // Tranh một nhân vật phe ác; trả '' nếu mã không có. Chuỗi SVG gồm hào quang CSS (lớp gr-fo-halo) và nhóm .gr-world do lõi 3D vẽ lại mỗi khung.
  const HALO = { giao: ['#c8243c', 0.18], mien: ['#8e6bbf', 0.16], dien: ['#e8892c', 0.16], loi: ['#3b7dd8', 0.16], khuc: ['#4f8a83', 0.16], bach: ['#9a5b2e', 0.16], ngoc: ['#5aa6b8', 0.16], kho: ['#7d7a3a', 0.16], kinh: ['#c99a3c', 0.16], suong: ['#9fd0ff', 0.2], vong: ['#3a1a40', 0.3] };
  function svg(id) {
    const f = LOOKS[id], info = (window.zenTale?.FOES || []).find((x) => x.id === id);
    if (!f) return '';
    const label = (info ? info.title + ' ' + info.name + ' · ' + info.art : id).replace(/"/g, '');
    const inst = makeFoe(id), sc = inst.frame(), gid = 'zf' + ++counter, h = HALO[id];
    return (
      '<svg class="gr-foe" data-foe="' + id + '" data-gid="' + gid + '" viewBox="0 0 200 232" role="img" aria-label="' + label + '">' +
      '<defs>' + sc.defs(gid) + '</defs><circle class="gr-fo-halo" cx="100" cy="116" r="74" fill="' + h[0] + '" fill-opacity="' + h[1] + '"/><g class="gr-world">' + sc.toMarkup(gid) + '</g></svg>'
    );
  }
  Z.track('svg.gr-foe', (el) => makeFoe(el.dataset.foe));
  window.zenFoe = { svg, IDS: Object.keys(LOOKS), make: makeFoe };
})();
