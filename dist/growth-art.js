'use strict';
// v1.83.0 (Kiếm Ảnh): nhân vật phong cách kiếm hiệp, chibi, không dùng ảnh ngoài, không mô phỏng nhân vật có sẵn.
//   Nam: thiếu hiệp áo thanh lam, ngọc quan cài trâm, tóc buộc đuôi cao với dải lụa đỏ, kiếm đeo sau lưng, ngọc bội bên hông.
//   Nữ: nữ hiệp áo trắng khoác đỏ son, búi tóc đôi cài trâm bộ dao, lụa khoác (phi bạch) bay quanh vai, kiếm tua đỏ bên hông.
// v1.84.0: tên tư thế đổi sang Hán Việt (Đàm tiếu, Luyện kiếm, Thái cực, Tọa thiền); mã tư thế giữ nguyên: talk, martial, taichi, zen.
// v2.15.0 (Thân Pháp): chuyển sang dựng hình 3D bằng lõi growth-rig.js. Nhân vật là một bộ khớp trong không gian: đầu là khối cầu có
//   mặt xoay theo, tay/chân tự uốn theo mục tiêu (IK), áo là ống vải đổ bóng theo ánh sáng thật, tóc/dải lụa/tua rua là dây Verlet.
//   Mỗi tư thế là một chuỗi khung chính lặp vòng; con trỏ làm camera nghiêng nhẹ nên thấy chiều sâu.
//   - Đàm tiếu: đứng nói chuyện, đầu quay qua lại, nam phe phẩy quạt, nữ vẫy tay áo.
//   - Luyện kiếm: khởi kiếm, đâm thẳng, chém ngang, xoay người trọn vòng, cuốn hoa kiếm; kiếm khí vẽ theo mũi kiếm.
//   - Thái cực: bài quyền tám thức (Khởi thế → Dã mã phân tông → Bạch hạc lượng sí → Lâu tất ao bộ → Vân thủ → Đơn tiên →
//     Kim kê độc lập → Thu thế), có hư/thực dưới chân, hơi thở lên xuống nơi đan điền, vệt khí theo bàn tay, bàn đồ âm dương dưới sân.
//   - Tọa thiền: ngồi xếp bằng trên đá, hơi thở nâng hạ thân, pháp luân sau lưng xoay, hạt sáng bay lên.
// zenHero.svg(hero, pose) trả chuỗi SVG nhân vật (một khung đứng yên; lõi tự gắn hoạt họa khi phần tử vào trang);
// zenHero.scene() trả phông sơn thủy; zenHero.SEQ[pose] là các thức của tư thế (tên, chữ Hán, ý quyết, mốc thời gian);
// zenHero.formAt(pose, giây) cho thức đang luyện; phần tử SVG phát sự kiện 'gr-form' (nổi bọt) mỗi khi đổi thức.
(function () {
  const Z = window.zenRig;
  const { V, M, clamp, lerp, mat, Scene, Chain, Clip, solveIK } = Z;
  const { rotY, rotX, rotZ, mm, mv } = M;
  const SKIN = '#ffe3cf', BLUSH = '#ff9fb2', INK = '#231a2b';
  const PEL = 62; // chiều cao xương chậu khi đứng
  const PALETTE = {
    nam: {
      hair: '#1d1822', ribbon: '#c23a2e', ribbon2: '#e0604f', crown: '#efe4c4', jade: '#5fae8f', robe: '#2e5466', sleeve: '#2e5466', cuff: '#c9a24a',
      lining: '#e3d8bb', inner: '#f6f1e6', trim: '#c9a24a', belt: '#1c2830', skirt: '#d9d2c3', boot: '#1d1822', sheath: '#3a2a21', blade: '#e8eef3', tassel: '#c23a2e', qi: '#6cc3d6',
    },
    nu: {
      hair: '#1d1822', ribbon: '#e0566f', ribbon2: '#f39aae', crown: '#d8b25a', jade: '#7fd0b0', robe: '#b8344a', sleeve: '#f6d9df', cuff: '#b8344a',
      lining: '#f8dfe3', inner: '#fff7f3', trim: '#e7c46a', belt: '#e7c46a', skirt: '#f1d2d8', boot: '#7a2a3a', sheath: '#f1ebe0', blade: '#e8eef3', tassel: '#d63c55', qi: '#ff9fbd', scarf: '#f4b4c4',
    },
  };
  const POSES = [
    { id: 'talk', label: 'Đàm tiếu' },
    { id: 'martial', label: 'Luyện kiếm' },
    { id: 'taichi', label: 'Thái cực' },
    { id: 'zen', label: 'Tọa thiền' },
  ];
  const HERO_LABEL = { nam: 'Thiếu hiệp', nu: 'Nữ hiệp' };

  // ---- Các thức thái cực -------------------------------------------------------------------------------------------------------
  // from/to: giây trong vòng lặp 38 giây. tip: ý quyết ngắn, hiện dưới sân khấu.
  const FORMS = [
    { id: 'khoithe', from: 0, to: 5.5, name: 'Khởi thế', han: '起勢', tip: 'Hít vào, hai tay nâng ngang vai; thở ra, buông vai, trụy khuỷu, hạ khí về đan điền.' },
    { id: 'damaphantong', from: 5.5, to: 11, name: 'Dã mã phân tông', han: '野馬分鬃', tip: 'Bước cung: một tay vươn chéo lên, một tay ấn xuống, như rẽ bờm ngựa hoang mà không dùng sức.' },
    { id: 'bachhac', from: 11, to: 15, name: 'Bạch hạc lượng sí', han: '白鶴亮翅', tip: 'Dồn trọng tâm về chân sau, một tay giơ cao như hạc xòe cánh; chân trước hư, chân sau thực.' },
    { id: 'lautat', from: 15, to: 19, name: 'Lâu tất ao bộ', han: '摟膝拗步', tip: 'Tay quét qua gối, tay kia đẩy tới; eo dẫn tay đi, tay không đi trước eo.' },
    { id: 'vanthu', from: 19, to: 26, name: 'Vân thủ', han: '雲手', tip: 'Trọng tâm dịch sang hai bên, hai tay vẽ vòng như mây trôi; mắt theo tay, tâm yên trong chuyển động.' },
    { id: 'dantien', from: 26, to: 30, name: 'Đơn tiên', han: '單鞭', tip: 'Một tay câu, một tay mở: tay ra rất xa mà thân vẫn đứng như cột, tâm không rời đan điền.' },
    { id: 'kimke', from: 30, to: 35, name: 'Kim kê độc lập', han: '金雞獨立', tip: 'Đứng một chân vững như gà vàng: tay trên nâng, tay dưới án; vững chân là vững tâm.' },
    { id: 'thuthe', from: 35, to: 38, name: 'Thu thế', han: '收勢', tip: 'Khí quy đan điền, hai tay hạ xuống. Luyện tới chỗ cuối cùng là tĩnh.' },
  ];
  // Luyện kiếm (vòng 16 giây) và tọa thiền (vòng 8 giây) cũng có "thức" để nhìn vào mà biết nhân vật đang luyện gì.
  const SWORD_FORMS = [
    { id: 'khoikiem', from: 0, to: 2.4, name: 'Khởi kiếm', han: '起劍', tip: 'Kiếm dựng trước ngực, mắt nhìn mũi kiếm; chưa ra chiêu mà ý đã tới.' },
    { id: 'thich', from: 2.4, to: 4.2, name: 'Thích', han: '直刺', tip: 'Đâm thẳng: lực khởi từ gót, qua eo, ra mũi kiếm; tay sau giữ thăng bằng.' },
    { id: 'phach', from: 4.2, to: 7, name: 'Phách', han: '橫劈', tip: 'Chém ngang: xoay eo trước, kiếm theo thân, không dùng sức tay.' },
    { id: 'chuyenthan', from: 7, to: 11.8, name: 'Chuyển thân', han: '轉身', tip: 'Xoay người trọn vòng: mắt đi trước, đầu theo mắt, thân theo đầu, kiếm theo thân.' },
    { id: 'cuonhoa', from: 11.8, to: 14.4, name: 'Cuốn hoa', han: '捲花', tip: 'Kiếm vẽ vòng trên đầu, che thân mà không che mắt.' },
    { id: 'thukiem', from: 14.4, to: 16, name: 'Thu kiếm', han: '收劍', tip: 'Thu kiếm về, tĩnh như chưa từng động.' },
  ];
  const ZEN_FORMS = [
    { id: 'hit', from: 0, to: 4, name: 'Hít vào', han: '吸', tip: 'Hít chậm bằng mũi, bụng nở, khí xuống đan điền; vai buông.' },
    { id: 'tho', from: 4, to: 8, name: 'Thở ra', han: '呼', tip: 'Thở dài hơn hít, tâm lắng như mặt hồ; không đuổi theo ý nghĩ.' },
  ];
  const SEQ = { taichi: FORMS, martial: SWORD_FORMS, zen: ZEN_FORMS };
  const DURS = { taichi: 38, martial: 16, zen: 8 };
  // formAt(pose, giây) → thức đang luyện (undefined nếu tư thế không có thức, ví dụ Đàm tiếu).
  const formAt = (pose, t) => {
    const L = SEQ[pose];
    if (!L) return null;
    const x = (((t || 0) % DURS[pose]) + DURS[pose]) % DURS[pose];
    return L.find((f) => x >= f.from && x < f.to) || L[0];
  };

  // ---- Kênh chuyển động mặc định và các chuỗi khung -----------------------------------------------------------------------------
  // x,y,z: dịch xương chậu (khung thân, quay theo yaw); yaw/pitch/roll: thân; tw: xoắn ngực; hd: đầu [yaw,pitch,roll];
  // ha/hb: bàn tay trái/phải màn hình theo khung ngực; fa/fb: bàn chân [x, z, nâng, xoay]; hem: gấu áo; br: hơi thở -1..1.
  const DEF = {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, tw: 0, hd: [0, 0, 0],
    ha: [-30, -38, 2], hb: [30, -38, 2], fa: [-13, 0, 0, 0], fb: [13, 0, 0, 0],
    hem: 14, br: 0, mouth: 0, eye: 1, kn: 0.25, sw: [0, 0, 1], fan: 0, fd: 0, qi: 0, wide: 0,
  };
  const TAICHI = [
    [0, { yaw: 14 }],
    [3, { yaw: 14, y: -1, br: 1, ha: [-22, 6, 42], hb: [22, 6, 42], hd: [0, -3, 0] }],
    [5.5, { yaw: 14, y: -8, hem: 22, br: -0.6, ha: [-17, -14, 32], hb: [17, -14, 32], fa: [-15, 0, 0, 0], fb: [15, 0, 0, 0] }],
    [8.5, { yaw: 44, y: -13, pitch: 3, hem: 34, z: 7, tw: -16, fa: [-12, 32, 0, -6], fb: [20, -14, 0, 28], ha: [-30, 22, 36], hb: [33, -26, -4], hd: [-12, 0, 0], br: 0.4, qi: 1 }],
    [11.5, { yaw: 24, y: -9, hem: 26, z: -5, tw: 14, fa: [-10, 26, 3, -4], fb: [16, -8, 0, 30], ha: [-26, -30, 18], hb: [27, 46, 14], hd: [10, 2, 5], br: 1, qi: 1 }],
    [15.5, { yaw: -38, y: -13, pitch: 3, hem: 34, z: 7, tw: 18, fa: [-20, -14, 0, -28], fb: [14, 32, 0, 6], ha: [-15, -34, 28], hb: [22, 4, 48], hd: [8, 0, 0], br: -0.2, qi: 1 }],
    [19.5, { yaw: 2, y: -10, hem: 30, x: -11, tw: 20, fa: [-27, 0, 0, 12], fb: [27, 0, 0, -12], ha: [-16, -22, 34], hb: [-6, 24, 36], hd: [16, -1, -3], br: 0.8, qi: 1, wide: 1 }],
    [22.5, { yaw: 2, y: -10, hem: 30, x: 11, tw: -20, fa: [-27, 0, 0, 12], fb: [27, 0, 0, -12], ha: [6, 24, 36], hb: [16, -22, 34], hd: [-16, -1, 3], br: -0.8, qi: 1, wide: 1 }],
    [25.5, { yaw: 2, y: -10, hem: 30, x: -11, tw: 20, fa: [-27, 0, 0, 12], fb: [27, 0, 0, -12], ha: [-16, -22, 34], hb: [-6, 24, 36], hd: [16, -1, -3], br: 0.8, qi: 1, wide: 1 }],
    [28.5, { yaw: 52, y: -13, hem: 36, x: -3, fa: [-34, 8, 0, 14], fb: [30, -6, 0, -34], tw: -4, ha: [-54, 8, 10], hb: [50, 12, -8], hd: [-26, 0, 0], br: 0.5, qi: 1, wide: 1 }],
    [32, { yaw: 2, y: -1, hem: 22, x: -10, fa: [-10, 0, 0, 0], fb: [8, 16, 30, 0], ha: [-27, -34, 12], hb: [24, 52, 12], hd: [0, -2, 7], br: 1, qi: 1 }],
    [35.5, { yaw: 14, y: -2, br: -1, hd: [0, 3, 0], ha: [-28, -40, 3], hb: [28, -40, 3] }],
  ];
  const CLIPS = {
    taichi: () => new Clip(38, TAICHI, DEF),
    martial: () => new Clip(16, [
      [0, { yaw: 28, y: -4, hem: 22, fa: [-18, -4, 0, 0], fb: [18, 6, 0, -10], ha: [-10, 10, 28], hb: [20, 22, 30], sw: [0.1, 1, 0.15], hd: [-6, 0, 0] }],
      [2.4, { yaw: 42, y: -14, pitch: 5, hem: 34, z: 8, tw: 10, fa: [-18, -22, 0, -12], fb: [14, 36, 0, 0], ha: [-34, 30, -14], hb: [12, 8, 56], sw: [0.1, 0.06, 1], hd: [-8, 2, 0], qi: 1 }],
      [4.2, { yaw: 40, y: -10, hem: 28, z: 2, tw: -35, fa: [-20, -8, 0, 8], fb: [20, 10, 0, -14], ha: [-30, 26, -8], hb: [40, 16, -10], sw: [1, 0.3, -0.3], hd: [-18, 0, 0] }],
      [5.4, { yaw: -26, y: -13, hem: 32, z: 4, tw: 38, fa: [-22, -6, 0, 16], fb: [22, 12, 0, -6], ha: [-26, 24, -4], hb: [-36, 12, 40], sw: [-1, 0.05, 0.4], hd: [14, 0, 0], qi: 1 }],
      [7, { yaw: -22, y: -18, hem: 34, tw: 26, fa: [-24, -4, 0, 18], fb: [24, 8, 0, -8], ha: [-28, 22, 0], hb: [-40, 0, 30], sw: [-1, -0.3, 0.2], hd: [10, 3, 0] }],
      [9, { yaw: -24, y: -19, hem: 34, tw: 0, fa: [-24, 0, 0, 0], fb: [24, 0, 0, 0], ha: [-40, 14, 4], hb: [40, 14, 4], sw: [1, 0.2, 0], hd: [0, 0, 0] }],
      [10.4, { yaw: 150, y: -7, hem: 30, fa: [-22, 0, 0, 0], fb: [22, 0, 0, 0], ha: [-42, 14, 6], hb: [42, 14, 6], sw: [1, 0.22, 0], hd: [0, 0, 0], qi: 1, wide: 1 }],
      [11.8, { yaw: 336, y: -9, hem: 30, fa: [-20, 0, 0, 0], fb: [20, 0, 0, 0], ha: [-36, 12, 8], hb: [40, 14, 8], sw: [1, 0.22, 0.1], hd: [-6, 0, 0], qi: 1 }],
      [13.4, { yaw: 352, y: -4, hem: 24, fa: [-17, 0, 0, 0], fb: [17, 0, 0, 0], ha: [-14, 32, 20], hb: [16, 50, 16], sw: [-0.25, 1, 0.1], hd: [-8, -3, 0] }],
      [14.8, { yaw: 374, y: -3, hem: 22, fa: [-18, -3, 0, 0], fb: [18, 5, 0, -8], ha: [-10, 10, 28], hb: [20, 22, 30], sw: [0.1, 1, 0.15], hd: [-5, 0, 0] }],
    ], DEF, { yaw: 360 }),
    zen: () => new Clip(8, [
      [0, { y: -43, hem: 18, br: -1, hd: [0, 6, 0], ha: [-9, -17, 25], hb: [9, -17, 25], fa: [11, 22, 8, 0], fb: [-11, 20, 10, 0], kn: 1.2, eye: 0, wide: 2 }],
      [4, { y: -41, hem: 18, br: 1, hd: [0, 4, 0], ha: [-9, -16, 26], hb: [9, -16, 26], fa: [11, 22, 8, 0], fb: [-11, 20, 10, 0], kn: 1.2, eye: 0, wide: 2 }],
    ], DEF),
    talk: (h) => (h === 'nam'
      ? new Clip(8, [
        [0, { yaw: 10, hb: [30, -12, 32], fan: 0.12, fd: 40, ha: [-30, -38, 2] }],
        [1.6, { yaw: 14, y: -1, hb: [38, 0, 34], fan: 1, fd: 60, mouth: 1, hd: [-8, -2, 2], ha: [-28, -34, 4] }],
        [3.2, { yaw: 8, hb: [34, 8, 38], fan: 1, fd: 36, hd: [6, 0, -2], mouth: 0.3 }],
        [4.8, { yaw: 12, x: 2, hb: [40, -2, 32], fan: 1, fd: 66, mouth: 1, hd: [-4, -1, 0], br: 0.4 }],
        [6.4, { yaw: 10, hb: [30, -12, 32], fan: 0.15, fd: 40, hd: [2, 1, 0], mouth: 0 }],
      ], DEF)
      : new Clip(8, [
        [0, { yaw: 10, hb: [30, 4, 30], ha: [-30, -38, 2] }],
        [1.6, { yaw: 14, y: -1, hb: [36, 28, 22], mouth: 1, hd: [-8, -2, 4], roll: 1 }],
        [2.4, { yaw: 12, hb: [30, 34, 24], mouth: 1, hd: [-6, -2, 4] }],
        [3.4, { yaw: 8, hb: [38, 24, 22], hd: [6, 0, -3], mouth: 0.3 }],
        [4.8, { yaw: 12, x: 2, hb: [32, 30, 24], mouth: 1, hd: [-4, -1, 3], br: 0.4 }],
        [6.4, { yaw: 10, hb: [30, 4, 30], hd: [2, 1, 0], mouth: 0 }],
      ], DEF)),
  };
  const START = { talk: 0.3, martial: 2.4, taichi: 17.2, zen: 1 };

  // ---- Bộ khớp --------------------------------------------------------------------------------------------------------------------
  // Mọi tọa độ chân/tay trong "khung thân" (quay theo yaw quanh gốc sàn). Trả toàn bộ điểm khớp cần để dựng hình.
  function solve(P) {
    const Ry = rotY(P.yaw), Rr = mm(Ry, mm(rotX(P.pitch), rotZ(P.roll)));
    const pel = mv(Ry, [P.x, PEL + P.y, P.z]);
    const breath = P.br;
    const Rc = mm(Rr, rotY(P.tw));
    const chestC = V.add(pel, mv(Rc, [0, 34 + breath * 0.8, 0]));
    const Rh = mm(Rc, mm(rotY(P.hd[0]), mm(rotX(P.hd[1]), rotZ(P.hd[2]))));
    const neck = V.add(pel, mv(Rc, [0, 46 + breath * 1.2, 0]));
    const headC = V.add(neck, mv(Rh, [0, 25, 2]));
    const arms = [-1, 1].map((s, i) => {
      const S = V.add(pel, mv(Rc, [s * (23 + breath * 0.5), 40 + breath * 1.2, 0]));
      const Tw = V.add(chestC, mv(Rc, i ? P.hb : P.ha));
      const ik = solveIK(S, Tw, 27, 25, mv(Rc, V.norm([s * 0.6, -1, -0.6])));
      return { S, E: ik.E, W: ik.T };
    });
    const legs = [-1, 1].map((s, i) => {
      const f = i ? P.fb : P.fa, Hh = V.add(pel, mv(Rr, [s * 11, -4, 0]));
      const Rf = mm(Ry, rotY(f[3]));
      const T = mv(Ry, [f[0], 7 + f[2], f[1]]);
      const ik = solveIK(Hh, T, 28, 28, mv(Rf, V.norm([s * P.kn, 0.12, 1])));
      return { H: Hh, K: ik.E, A: ik.T, heel: V.add(T, mv(Rf, [0, -2.5, -7])), toe: V.add(T, mv(Rf, [0, -3.5, 12])), F: [f[0], f[1], f[2]], Rf };
    });
    return { P, Ry, Rr, Rc, Rh, pel, chestC, neck, headC, arms, legs };
  }

  // ---- Một nhân vật đang sống ---------------------------------------------------------------------------------------------------
  function makeHero(hero, pose) {
    const h = hero === 'nu' ? 'nu' : 'nam', p = POSES.some((x) => x.id === pose) ? pose : 'talk';
    const clip = CLIPS[p](h), pal = PALETTE[h];
    const inst = {
      hero: h, pose: p, clip, pal, t: START[p], cam: { yaw: -14, pitch: 7, ty: -14, tp: 7 }, sk: null, last: null, lag: [0, 0], feetPrev: null,
      chains: {}, hist: { a: [], b: [], tip: [] }, visible: true, form: '', accum: 0, histT: 0, clock: 0,
    };
    const ch = inst.chains;
    const mk = (n, seg) => new Chain(n, seg);
    if (h === 'nam') { ch.tail = mk(7, 9); ch.rib = mk(5, 7); ch.rib2 = mk(5, 7); ch.lockA = mk(4, 7); ch.lockB = mk(4, 7); ch.pend = mk(4, 5); ch.stas = mk(4, 5); }
    else { ch.hair = mk(7, 12); ch.lockA = mk(4, 8); ch.lockB = mk(4, 8); ch.scA = mk(7, 9); ch.scB = mk(7, 9); ch.sash = mk(5, 9); ch.sashB = mk(5, 9); ch.pin = mk(4, 5); ch.stas = mk(4, 5); }
    ch.sleeveA = mk(5, 6); ch.sleeveB = mk(5, 6);
    inst.advance = (dt, ptr) => advance(inst, dt, ptr);
    inst.frame = () => frame(inst);
    inst.advance(0, { x: 0, y: 0 }, true);
    for (let i = 0; i < 90; i++) inst.advance(1 / 60, { x: 0, y: 0 }, true);
    return inst;
  }

  function advance(inst, dt, ptr, quiet) {
    const clip = inst.clip;
    inst.accum += dt;
    const step = 1 / 60;
    let n = 0;
    while (inst.accum >= step && n < 4) { inst.accum -= step; n++; sim(inst, step); }
    if (!inst.sk) sim(inst, step);
    if (inst.accum > step * 4) inst.accum = 0;
    // Camera: nghiêng theo con trỏ, lắc nhẹ tự nhiên.
    const c = inst.cam, sway = Math.sin(inst.clock * 0.35) * 4;
    c.ty = -14 + (ptr ? ptr.x * 16 : 0) + sway; c.tp = 7 + (ptr ? ptr.y * 4 : 0);
    const k = 1 - Math.pow(0.001, dt || 0.016);
    c.yaw += (c.ty - c.yaw) * k; c.pitch += (c.tp - c.pitch) * k;
    if (SEQ[inst.pose] && !quiet && inst.svg) {
      const f = formAt(inst.pose, inst.t);
      if (f.id !== inst.form) {
        inst.form = f.id;
        inst.svg.setAttribute('data-form', f.id);
        inst.svg.dispatchEvent(new CustomEvent('gr-form', { bubbles: true, detail: Object.assign({ pose: inst.pose }, f) }));
      }
    }
    void clip;
  }

  function sim(inst, dt) {
    inst.t += dt; inst.clock += dt;
    const P = inst.clip.at(inst.t);
    // Nâng chân tự nhiên khi bước: chân đang dịch chuyển thì nhấc lên.
    const fp = inst.feetPrev, cur = [P.fa, P.fb];
    if (fp) {
      [0, 1].forEach((i) => {
        const sp = Math.hypot(cur[i][0] - fp[i][0], cur[i][1] - fp[i][1]) / dt;
        const lift = clamp(sp * 0.22, 0, 11);
        P[i ? 'fb' : 'fa'] = [cur[i][0], cur[i][1], cur[i][2] + lift, cur[i][3]];
      });
    }
    inst.feetPrev = [cur[0].slice(), cur[1].slice()];
    const S = solve(P);
    const prevPel = inst.sk ? inst.sk.pel : S.pel;
    const vel = V.sub(S.pel, prevPel);
    inst.lag = [inst.lag[0] * 0.9 - vel[0] * 1.6, inst.lag[1] * 0.9 - vel[2] * 1.6];
    inst.sk = S;
    updateChains(inst, S, dt);
    // Vết khí: lấy mẫu mỗi ~0.03 giây.
    inst.histT += dt;
    if (inst.histT > 0.03) {
      inst.histT = 0;
      const hist = inst.hist, push = (a, v) => { a.push(v); if (a.length > 30) a.shift(); };
      push(hist.a, S.arms[0].W); push(hist.b, S.arms[1].W);
      if (inst.pose === 'martial') {
        const d = V.norm(mv(S.Rc, V.norm(P.sw)));
        push(hist.tip, V.add(S.arms[1].W, V.mul(d, 70)));
      }
    }
  }

  // Điểm neo tóc/vải theo đầu và thân, rồi cho các dây chạy một bước.
  function updateChains(inst, S, dt) {
    void dt;
    const ch = inst.chains, h = inst.hero, { Rh, Rc, headC, pel, chestC } = S;
    const H = (v) => V.add(headC, mv(Rh, v)), Bd = (v) => V.add(pel, mv(Rc, v));
    const rest = (a, dirs, seg) => dirs.map((d, i) => V.add(a, V.mul(d, i * seg)));
    if (h === 'nam') {
      const a = H([0, 33, -12]);
      ch.tail.step(a, rest(a, [0, 1, 2, 3, 4, 5, 6].map((i) => mv(Rh, V.norm([0, -0.1 - i * 0.12, -1 + i * 0.05]))), 9), { stiff: 0.05, g: 0.28, drag: 0.9 });
      const b = H([-2, 36, -8]);
      ch.rib.step(b, null, { g: 0.12, drag: 0.93 });
      ch.rib2.step(b, null, { g: 0.1, drag: 0.94 });
      const la = H([-34, 8, 4]), lb = H([34, 8, 4]);
      ch.lockA.step(la, rest(la, [0, 1, 2, 3].map(() => mv(Rh, [-0.1, -1, 0])), 7), { stiff: 0.07, g: 0.2 });
      ch.lockB.step(lb, rest(lb, [0, 1, 2, 3].map(() => mv(Rh, [0.1, -1, 0])), 7), { stiff: 0.07, g: 0.2 });
      ch.pend.step(Bd([16, 3, 12]), null, { g: 0.35, drag: 0.9 });
      ch.stas.step(Bd([-24, 40, -17]), null, { g: 0.2, drag: 0.92 });
    } else {
      const a = H([0, 18, -26]);
      ch.hair.step(a, rest(a, [0, 1, 2, 3, 4, 5, 6].map((i) => mv(Rh, V.norm([0, -0.8 - i * 0.05, -0.35]))), 12), { stiff: 0.05, g: 0.24, drag: 0.9 });
      const la = H([-32, 10, 4]), lb = H([32, 10, 4]);
      ch.lockA.step(la, rest(la, [0, 1, 2, 3].map(() => mv(Rh, [-0.05, -1, 0.05])), 8), { stiff: 0.07, g: 0.2 });
      ch.lockB.step(lb, rest(lb, [0, 1, 2, 3].map(() => mv(Rh, [0.05, -1, 0.05])), 8), { stiff: 0.07, g: 0.2 });
      ch.scA.step(Bd([-20, 42, -4]), null, { g: 0.18, drag: 0.95 });
      ch.scB.step(Bd([20, 42, -4]), null, { g: 0.18, drag: 0.95 });
      ch.sash.step(Bd([-2, 3, 14]), null, { g: 0.3, drag: 0.92 });
      ch.sashB.step(Bd([3, 3, 14]), null, { g: 0.3, drag: 0.92 });
      ch.pin.step(H([30, 34, -4]), null, { g: 0.25, drag: 0.92 });
      ch.stas.step(V.add(pel, mv(S.Rr, [-24, -8, 4])), null, { g: 0.3, drag: 0.9 });
    }
    ch.sleeveA.step(S.arms[0].W, null, { g: 0.55, drag: 0.9 });
    ch.sleeveB.step(S.arms[1].W, null, { g: 0.55, drag: 0.9 });
    void chestC;
  }

  // ---- Dựng khung hình -----------------------------------------------------------------------------------------------------------
  const EYE_O = {
    nam: '<path d="M-7,-3 q7,-5 14,0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse rx="4.8" ry="5.8" cy="1" fill="' + INK + '"/><circle cx="1.8" cy="-1.4" r="1.8" fill="#fff"/>',
    nu: '<ellipse rx="5.4" ry="7" fill="' + INK + '"/><circle cx="2" cy="-3" r="2.2" fill="#fff"/><circle cx="-1.5" cy="3" r="1" fill="#fff" opacity=".8"/><path d="M-6,-5 l-4,-3 M-5,-7 l-3,-4" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>',
  };
  const EYE_C = '<path d="M-7,0 q7,6 14,0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';

  function frame(inst) {
    const S = inst.sk, P = S.P, h = inst.hero, pal = PALETTE[h], t = inst.clock, pose = inst.pose;
    const cam = Z.camera(inst.cam.yaw, inst.cam.pitch);
    const sc = new Scene(cam);
    cam.fwd = mv([[cam.R[0][0], cam.R[1][0], cam.R[2][0]], [cam.R[0][1], cam.R[1][1], cam.R[2][1]], [cam.R[0][2], cam.R[1][2], cam.R[2][2]]], [0, 0, 1]);
    const skin = mat(SKIN), M_ = (c) => mat(c);
    const { Rc, Rr, Rh, Ry, pel, chestC, neck, headC, arms, legs } = S;
    const Bd = (v) => V.add(pel, mv(Rc, v)), Hd = (v) => V.add(headC, mv(Rh, v));
    const robe = M_(pal.robe), sleeve = M_(pal.sleeve), trim = M_(pal.trim), lining = M_(pal.lining), inner = M_(pal.inner), hair = M_(pal.hair);
    const legC = M_(pal.skirt), boot = M_(pal.boot), br = P.br;
    const lit = (a, b, f) => V.lerp(a, b, f);
    void lit;

    // Sàn: bóng đổ + hào quang theo tư thế (vẽ trước tiên, độ sâu rất thấp).
    floor(sc, inst, S, pal, t);

    // Chân và gấu áo.
    legs.forEach((L, i) => {
      sc.limb('lt' + i, L.H, L.K, 8.4, 7.2, legC, -60);
      sc.limb('ls' + i, L.K, L.A, 7.2, 6.4, legC, -30);
      sc.limb('lb' + i, L.heel, L.toe, 7.4, 6.6, boot, -20);
    });
    const hemY = P.hem, wide = P.wide;
    const feetMid = V.lerp(legs[0].A, legs[1].A, 0.5);
    const spread = V.len(V.sub(legs[0].A, legs[1].A)) * 0.5;
    const hemC = [lerp(pel[0], feetMid[0], 0.5), hemY, lerp(pel[2], feetMid[2], 0.5)];
    const top = V.add(pel, [0, 7, 0]);
    const sk = [0, 0.33, 0.68, 1].map((s, i) => {
      const r = lerp(19, Math.max(27, 21 + spread * 0.62 + wide * 2 + (pose === 'zen' ? 22 : 0)), Math.pow(s, 0.8)) * (1 + br * 0.012);
      const lag = Math.pow(s, 2);
      const c = V.add(V.lerp(top, hemC, Math.pow(s, 1.05)), [-inst.lag[0] * lag * 2.2, 0, -inst.lag[1] * lag * 2.2]);
      return { c, u: mv(Ry, [r, 0, 0]), w: mv(Ry, [0, 0, r * (pose === 'zen' ? 1 : 0.82)]) };
    });
    sc.tube('skirt', sk, M_(h === 'nam' ? pal.robe : pal.skirt), { zb: -6, edge: pal.trim });

    // Thân.
    const ringAt = (y, rx, rz) => ({ c: Bd([0, y, 0]), u: mv(Rc, [rx * (1 + br * 0.03), 0, 0]), w: mv(Rc, [0, 0, rz * (1 + br * 0.03)]) });
    const torso = [ringAt(45, 15, 10.5), ringAt(38, 22, 15), ringAt(22, 20.5, 14.5), ringAt(8, 18, 13)];
    sc.tube('torso', torso, h === 'nam' ? robe : robe, { zb: 0 });
    // Hoa văn trước ngực: áo lót, viền áo, nút ngọc (dán lên mặt phẳng ngực, xoay theo thân).
    const O = Bd([0, 34, 15.4]), U = mv(Rc, [1, 0, 0]), Vv = mv(Rc, [0, 1, 0]);
    if (h === 'nam') {
      sc.planar('chest', O, U, Vv, '<path d="M-12,12 L0,-12 L12,12" stroke="' + pal.inner + '" stroke-width="7" fill="none" stroke-linejoin="round"/><path d="M-11,12 L0,-10" stroke="#21404f" stroke-width="3" stroke-linecap="round"/><path d="M14,12 L-8,-26" stroke="' + pal.lining + '" stroke-width="5" stroke-linecap="round"/><path d="M16,13 L-6,-25" stroke="' + pal.trim + '" stroke-width="1.2"/>', { zb: 0.5 });
    } else {
      sc.planar('chest', O, U, Vv, '<path d="M-13,12 L0,-14 L13,12 L8,14 L0,-4 L-8,14Z" fill="' + pal.inner + '"/><path d="M-13,12 L0,-14 L13,12" stroke="' + pal.trim + '" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M-6,-12 q6,9 12,0" stroke="' + pal.trim + '" stroke-width="1.2" fill="none" opacity=".7"/>', { zb: 0.5 });
    }
    // Đai lưng và ngọc.
    const belt = [{ c: Bd([0, 11, 0]), u: mv(Rc, [19.4, 0, 0]), w: mv(Rc, [0, 0, 14.2]) }, { c: Bd([0, 3, 0]), u: mv(Rc, [19.4, 0, 0]), w: mv(Rc, [0, 0, 14.2]) }];
    sc.tube('belt', belt, M_(pal.belt), { zb: 0.6 });
    sc.sphere('buckle', Bd([0, 7, 14.6]), h === 'nam' ? [6, 4.8] : [4.4, 4.4], M_(pal.jade), 1);
    if (h === 'nu') {
      // Dải thắt lưng đỏ rủ xuống.
      sc.group('gr-sash', () => {
        sc.ribbon('sashA', ch2(inst.chains.sash), 3, 1.6, M_(pal.ribbon), 1, { plain: true });
        sc.ribbon('sashB', ch2(inst.chains.sashB), 2.6, 1.4, M_(pal.ribbon2), 0.9, { plain: true });
      });
    } else {
      const pd = inst.chains.pend.p;
      sc.group('gr-pendant', () => {
        sc.ribbon('pendL', pd, 0.9, 0.9, M_(pal.tassel), 0.6, { plain: true });
        sc.sphere('jade', V.add(pd[3], [0, -2, 0]), [5.2, 5.2], M_(pal.jade), 0.8);
      });
    }
    // Cổ.
    sc.limb('neck', Bd([0, 44, 0]), neck, 7, 7, skin, 0);
    // Kiếm sau lưng (nam) hoặc bên hông (nữ).
    if (pose !== 'martial') sword(sc, inst, S, pal, h);
    // Phi bạch (nữ).
    if (h === 'nu') {
      sc.group('gr-scarf', () => {
        sc.ribbon('scarfA', inst.chains.scA.p, 5, 3, M_(pal.scarf), -3, { plain: true });
        sc.ribbon('scarfB', inst.chains.scB.p, 5, 3, M_(pal.scarf), -3, { plain: true });
      });
    }

    // Đầu.
    headWork(sc, inst, S, pal, h, skin, hair, cam);

    // Tay: tay áo rộng — bắp tay, cẳng tay loe dần, mép áo rủ, bàn tay.
    arms.forEach((A, i) => {
      const s = i ? 'b' : 'a', fwd = V.norm(V.sub(A.W, A.E));
      sc.limb('ua' + s, A.S, A.E, 10, 9.4, sleeve, 0.2);
      sc.limb('fa' + s, A.E, A.W, 9.4, 13.2, sleeve, 0.4);
      {
        let u = V.cross(fwd, [0, 0, 1]);
        if (V.len(u) < 0.2) u = V.cross(fwd, [1, 0, 0]);
        u = V.norm(u);
        const w = V.norm(V.cross(fwd, u));
        sc.planar('cf' + s, A.W, V.mul(u, 12.6), V.mul(w, 12.6), '<circle r="1" fill="' + pal.lining + '" stroke="' + pal.cuff + '" stroke-width=".11"/>', { twoSided: true, zb: 0.55 });
      }
      // Mép tay áo rủ theo trọng lực.
      const sl = i ? inst.chains.sleeveB : inst.chains.sleeveA;
      sc.ribbon('sl' + s, sl.p.map((q, k) => (k ? q : A.W)), 11, 6, sleeve, 0.35, { plain: true });
      sc.sphere('hand' + s, V.add(A.W, V.mul(fwd, 4.5)), [6.4, 6.4], skin, 0.7);
    });
    // Vật cầm tay.
    if (pose === 'martial') bladeInHand(sc, inst, S, pal, cam);
    if (pose === 'talk') { if (h === 'nam') sc.group('gr-fan', () => fanInHand(sc, S, P)); }
    taichiFx(sc, inst, S, pal, t);
    void ringAt; void chestC; void Rr; void trim; void lining; void inner;
    return sc;
  }
  const ch2 = (c) => c.p;

  function sword(sc, inst, S, pal, h) {
    sc.group(h === 'nam' ? 'gr-backsword' : 'gr-hipsword', () => swordParts(sc, inst, S, pal, h));
  }
  function swordParts(sc, inst, S, pal, h) {
    const { Rc, pel, Rr } = S;
    if (h === 'nam') {
      const B = (v) => V.add(pel, mv(Rc, v));
      sc.limb('sheath', B([14, 6, -17]), B([-22, 52, -17]), 3.9, 3.9, mat(pal.sheath), -12);
      sc.limb('hilt', B([-22, 52, -17]), B([-30, 64, -17]), 2.8, 2.6, mat('#5a3b2c'), -12);
      sc.limb('guard', B([-27, 53, -17]), B([-16, 62, -17]), 2, 2, mat(pal.trim), -11.9);
      sc.sphere('pomm', B([-31, 66, -17]), [3.2, 3.2], mat(pal.trim), -11.8);
      sc.ribbon('stas', inst.chains.stas.p.map((q, i) => (i ? q : B([-31, 66, -17]))), 1.3, 0.9, mat(pal.tassel), -11.7, { plain: true });
    } else {
      const B = (v) => V.add(pel, mv(Rr, v));
      sc.limb('sheath', B([-17, 16, 6]), B([-31, -26, -4]), 3.9, 3.9, mat(pal.sheath), 2);
      sc.limb('hilt', B([-17, 16, 6]), B([-12, 28, 8]), 2.8, 2.6, mat('#6b4a3a'), 2);
      sc.limb('guard', B([-21, 18, 6]), B([-10, 20, 8]), 2, 2, mat(pal.trim), 2.1);
      sc.ribbon('stas', inst.chains.stas.p.map((q, i) => (i ? q : B([-12, 29, 8]))), 1.3, 0.9, mat(pal.tassel), 2.2, { plain: true });
    }
  }

  function bladeInHand(sc, inst, S, pal, cam) {
    const A = S.arms[1], d = V.norm(mv(S.Rc, V.norm(S.P.sw)));
    const fwd = V.norm(V.sub(A.W, A.E));
    const hand = V.add(A.W, V.mul(fwd, 4.5));
    const w = V.norm(V.cross(d, cam.fwd));
    const b0 = V.add(hand, V.mul(d, 8)), b1 = V.add(hand, V.mul(d, 70));
    sc.limb('hilt', V.sub(hand, V.mul(d, 10)), V.add(hand, V.mul(d, 5)), 3, 3, mat('#5a3b2c'), 1.2);
    sc.limb('guard', V.add(hand, V.add(V.mul(d, 7), V.mul(w, 8))), V.add(hand, V.add(V.mul(d, 7), V.mul(w, -8))), 2, 2, mat(pal.trim), 1.3);
    sc.flat('blade', [V.add(b0, V.mul(w, 2.8)), V.add(b1, V.mul(w, 1)), V.add(V.add(b1, V.mul(d, 7)), V.mul(w, 0)), V.add(b1, V.mul(w, -1)), V.add(b0, V.mul(w, -2.8))], mat(pal.blade), 1.4, { stroke: '#9fb3c2' });
    sc.nestLast('gr-cut', 'gr-blade');
    sc.ribbon('hiltTas', [V.sub(hand, V.mul(d, 10)), V.add(V.sub(hand, V.mul(d, 14)), [0, -6, 0]), V.add(V.sub(hand, V.mul(d, 15)), [0, -14, 0])], 1.4, 1, mat(pal.tassel), 1.2, { plain: true });
    sc.group('gr-slash', () => {
      const tip = inst.hist.tip.concat([V.add(b1, [0, 0, 0])]);
      sc.trail('slash', tip, pal.qi, 7 * clamp(S.P.qi, 0, 1), -1);
      sc.trail('slashCore', tip, '#ffffff', 2.6 * clamp(S.P.qi, 0, 1), -0.9);
    });
  }

  function fanInHand(sc, S, P) {
    const A = S.arms[1], c = V.add(A.W, V.mul(V.norm(V.sub(A.W, A.E)), 4));
    const open = clamp(P.fan, 0, 1), spread = lerp(8, 62, open), base = P.fd;
    const pt = (ang, r) => V.add(c, mv(S.Rc, [Math.sin((base + ang) * Math.PI / 180) * r, Math.cos((base + ang) * Math.PI / 180) * r, 0]));
    const poly = [c];
    for (let i = 0; i <= 8; i++) poly.push(pt(-spread / 2 + (spread * i) / 8, 36));
    sc.flat('fan', poly, mat('#f6f1e6'), 1.5, { stroke: '#3a2a21', sw: 1 });
    if (open > 0.3) sc.flat('fanArt', [pt(-spread * 0.4, 20), pt(-spread * 0.12, 27), pt(spread * 0.14, 21), pt(spread * 0.42, 28), pt(spread * 0.4, 24), pt(spread * 0.1, 17), pt(-spread * 0.12, 22), pt(-spread * 0.38, 16)], mat('#2e5466'), 1.6, { stroke: 'none', attrs: { opacity: 0.8 } });
  }

  // Đầu: tóc sau, đầu cầu, mặt, tóc trước, phụ kiện.
  function headWork(sc, inst, S, pal, h, skin, hair, cam) {
    const { Rh, headC, P } = S, R = [37, 34, 34], br = P.br;
    const Hd = (v) => V.add(headC, mv(Rh, v));
    const talk = inst.pose === 'talk' && P.mouth > 0.02 ? P.mouth * (0.35 + 0.65 * Math.abs(Math.sin(inst.clock * 11))) : 0;
    const blink = ((inst.clock * 1.0) % 5.2) > 5.0 ? 0 : 1;
    const eyeOpen = P.eye > 0.5 && blink;
    // Tóc sau (khối cầu lớn hơn đầu một chút) — vẽ sau đầu khi mặt hướng về người xem.
    sc.sphere('hairBack', Hd([0, 4, -8]), [h === 'nam' ? 40.5 : 41, h === 'nam' ? 38 : 39], hair, -6);
    if (h === 'nam') {
      sc.group('gr-tail', () => sc.ribbon('tail', inst.chains.tail.p, 9, 2.2, hair, 0, {}));
      sc.group('gr-ribbon', () => {
        sc.ribbon('rib1', inst.chains.rib.p, 4, 1.4, mat(pal.ribbon), 0.1, { plain: true });
        sc.ribbon('rib2', inst.chains.rib2.p.map((q, i) => V.add(q, [0, 0, i * 0.8])), 3.4, 1.2, mat(pal.ribbon2), 0.05, { plain: true });
      });
    } else {
      sc.ribbon('hairL', inst.chains.hair.p, 24, 17, hair, 0, {});
    }
    sc.sphere('head', headC, R, skin, 0);
    // Mặt.
    const mk = (k, lat, lon, inner, z) => sc.mark(k, headC, Rh, R, lat, lon, inner, { zb: z });
    const brows = h === 'nam' ? ['<path d="M-9,2 Q-1,-5 8,-1" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>', '<path d="M9,2 Q1,-5 -8,-1" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>']
      : ['<path d="M-8,2 q8,-5 16,-1" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>', '<path d="M-8,-1 q8,-4 16,1" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>'];
    mk('browA', 25, -25, brows[0], 1); mk('browB', 25, 25, brows[1], 1);
    const eye = eyeOpen ? EYE_O[h] : EYE_C;
    mk('eyeA', -4, -26, eye, 1.1); mk('eyeB', -4, 26, h === 'nu' && eyeOpen ? EYE_O.nu.replace('M-6,-5 l-4,-3 M-5,-7 l-3,-4', 'M6,-5 l4,-3 M5,-7 l3,-4').replace('cx="2"', 'cx="2"') : eye, 1.1);
    mk('blushA', -17, -41, '<ellipse rx="6.5" ry="3.6" fill="' + BLUSH + '" opacity=".55"/>', 0.8); mk('blushB', -17, 41, '<ellipse rx="6.5" ry="3.6" fill="' + BLUSH + '" opacity=".55"/>', 0.8);
    mk('nose', -13, 0, '<path d="M-1.4,0 q1.4,1.8 2.8,0" stroke="#e0a58f" stroke-width="1.2" fill="none" stroke-linecap="round"/>', 0.9);
    const mouth = talk > 0.05 ? '<ellipse rx="4.6" ry="' + (3.8 * talk + 0.6).toFixed(2) + '" fill="#b8445e"/>' : h === 'nam' ? '<path d="M-7,-1 q7,5 15,0" stroke="#b8445e" stroke-width="2.3" fill="none" stroke-linecap="round"/>' : '<path d="M-6,-1 q6,5 12,0" stroke="#c4475f" stroke-width="2.3" fill="none" stroke-linecap="round"/>';
    mk('mouth', -32, 0, mouth, 1);
    // Tóc trước: mái và đỉnh đầu (dán lên mặt cầu).
    const fringe = h === 'nam'
      ? [[0, -94], [28, -74], [45, -48], [52, -22], [47, -8], [38, 0], [47, 8], [52, 22], [45, 48], [28, 74], [0, 94], [34, 112], [34, 140], [34, 168], [34, 196], [34, 224], [34, 252]]
      : [[0, -94], [30, -74], [46, -48], [50, -22], [49, 0], [50, 22], [46, 48], [30, 74], [0, 94], [34, 112], [34, 140], [34, 168], [34, 196], [34, 224], [34, 252]];
    sc.decal('fringe', headC, Rh, R, fringe, 'url(#GID-' + hair.id + ')', { grow: 1.045, zb: 0.5, sub: 4 });
    sc.decal('fringeHi', headC, Rh, R, [[56, -50], [60, -20], [55, 8], [45, 4], [49, -24]], pal.hair === '#1d1822' ? '#3b3147' : pal.hair, { grow: 1.06, zb: 0.55, sub: 3, attrs: { opacity: 0.7 } });
    if (h === 'nam') {
      // Ngọc quan, trâm, búi tóc.
      sc.sphere('bun', Hd([0, 36, -4]), [13, 11.5], hair, 1.4);
      sc.limb('crown', Hd([0, 41, -3]), Hd([0, 51, -2]), 9, 6, mat(pal.crown), 1.5);
      sc.limb('pin', Hd([-22, 40, -4]), Hd([22, 40, -4]), 2.1, 2.1, mat(pal.jade), 1.6);
      sc.sphere('pinB', Hd([22, 40, -4]), [3, 3], mat(pal.jade), 1.7);
      sc.ribbon('lockA', inst.chains.lockA.p, 6, 2.2, hair, 0.7, { plain: true });
      sc.ribbon('lockB', inst.chains.lockB.p, 6, 2.2, hair, 0.7, { plain: true });
    } else {
      sc.sphere('bunA', Hd([-19, 34, -4]), [13, 15.5], hair, 1.4);
      sc.sphere('bunB', Hd([19, 34, -4]), [13, 15.5], hair, 1.4);
      sc.sphere('bunC', Hd([0, 40, -8]), [10, 9], hair, 1.2);
      sc.group('gr-bodao', () => {
        sc.limb('pin', Hd([14, 36, -4]), Hd([40, 46, -6]), 2, 1.8, mat(pal.crown), 1.6);
        sc.sphere('pinJ', Hd([42, 47, -6]), [3.6, 3.6], mat(pal.jade), 1.7);
        sc.ribbon('pinTas', inst.chains.pin.p.map((q, i) => (i ? q : Hd([42, 44, -6]))), 1.8, 1, mat(pal.tassel), 1.7, { plain: true });
      });
      sc.sphere('flower', Hd([-26, 40, 8]), [7, 7], mat('#f07c96'), 1.6);
      sc.sphere('flowerC', Hd([-26, 40, 13]), [2.8, 2.8], mat('#ffe08a'), 1.7);
      sc.ribbon('lockA', inst.chains.lockA.p, 6.5, 3, hair, 0.7, { plain: true });
      sc.ribbon('lockB', inst.chains.lockB.p, 6.5, 3, hair, 0.7, { plain: true });
      mk('mark', 36, 0, '<path d="M0,3 l2.6,-3.4 l-2.6,-3.4 l-2.6,3.4Z" fill="#d63c55"/>', 1.1);
    }
    void br; void cam;
  }

  // ---- Sàn, bóng, hiệu ứng theo tư thế --------------------------------------------------------------------------------------------
  function floorAt(sc, k, c, r, inner, opt) {
    sc.planar(k, [c[0], 0.2, c[2]], [1, 0, 0], [0, 0, -1], inner, Object.assign({ twoSided: true }, opt));
    void r;
  }
  function floor(sc, inst, S, pal, t) {
    const pose = inst.pose;
    if (pose === 'zen') {
      floorAt(sc, 'shadow', [0, 0, 0], 0, '<ellipse rx="74" ry="46" fill="#1b1424" opacity=".16"/>');
      // Tảng đá ngồi thiền.
      const g = (y, rx, rz) => ({ c: [0, y, 0], u: [rx, 0, 0], w: [0, 0, rz] });
      sc.tube('stone', [g(16, 56, 38), g(11, 66, 44), g(0, 68, 46)], mat('#9b93ad'), { zb: -80 });
      floorAt(sc, 'stoneTop', [0, 16, 0], 0, '<ellipse rx="54" ry="36" fill="#b7afc8"/><ellipse rx="40" ry="26" fill="none" stroke="#d3cde0" stroke-width="3" opacity=".8"/>', { zb: -79 });
      return;
    }
    floorAt(sc, 'shadow', [S.pel[0], 0, S.pel[2]], 0, '<ellipse rx="58" ry="22" fill="#1b1424" opacity=".14"/>');
    if (pose === 'martial' && S.P.qi > 0.5) floorAt(sc, 'ring', [S.pel[0], 0, S.pel[2]], 0, '<ellipse rx="64" ry="26" fill="none" stroke="' + pal.qi + '" stroke-width="2" opacity=".35"/>');
    void t;
  }

  function taichiFx(sc, inst, S, pal, t) {
    const pose = inst.pose;
    const q = mat(pal.qi);
    if (pose === 'taichi') {
      // Bàn đồ âm dương: trên sân xoay chậm, sau lưng đung đưa như con lắc.
      const rot = (t * 6) % 360;
      let tri = '';
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 * Math.PI) / 180, x = Math.cos(a) * 79, y = Math.sin(a) * 79, d = (i * 45 + 90);
        tri += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + d + ')" stroke="' + pal.qi + '" stroke-width="2.6" stroke-linecap="round"><path d="M-9,-5 L9,-5"/><path d="M-9,0 L-2,0 M2,0 L9,0"/><path d="M-9,5 L9,5"/></g>';
      }
      floorAt(sc, 'bagua', [0, 0, 0], 0, '<g transform="rotate(' + rot.toFixed(1) + ')" opacity=".5"><circle r="66" fill="' + pal.qi + '" fill-opacity=".07" stroke="' + pal.qi + '" stroke-width="1.6"/><circle r="52" fill="none" stroke="' + pal.qi + '" stroke-width="1" stroke-dasharray="3 5"/>' + tri + '</g>');
      // Hư/thực: chân nào chịu lực thì ánh khí đậm.
      const A = S.legs[0], B = S.legs[1], pel = S.pel;
      const ab = V.sub(B.A, A.A), ab2 = ab[0] * ab[0] + ab[2] * ab[2] || 1;
      let sB = clamp(((pel[0] - A.A[0]) * ab[0] + (pel[2] - A.A[2]) * ab[2]) / ab2, 0, 1);
      const liftA = clamp(A.A[1] - 7, 0, 30), liftB = clamp(B.A[1] - 7, 0, 30);
      let wA = (1 - sB) * (1 - liftA / 14), wB = sB * (1 - liftB / 14);
      wA = clamp(wA, 0, 1); wB = clamp(wB, 0, 1);
      [[A, wA, 'wa'], [B, wB, 'wb']].forEach(([L, w, k]) => {
        floorAt(sc, k, [L.A[0], 0, L.A[2]], 0, '<ellipse rx="' + (12 + w * 10).toFixed(1) + '" ry="' + (5 + w * 4).toFixed(1) + '" fill="' + pal.qi + '" fill-opacity="' + (0.08 + w * 0.5).toFixed(2) + '" stroke="' + pal.qi + '" stroke-width="1.4" stroke-opacity="' + (0.35 + w * 0.5).toFixed(2) + '"' + (w < 0.25 ? ' stroke-dasharray="3 3"' : '') + '/>', { zb: 0.2 });
      });
      // Âm dương treo sau lưng.
      const ang = 50 * Math.sin(t * 0.42);
      const Uv = mv(rotY(ang), [1, 0, 0]), Vv = [0, 1, 0];
      sc.group('gr-taiji', () => sc.planar('taiji', [0, 108, -62], V.mul(Uv, 1), Vv, '<g opacity=".36"><circle r="74" fill="none" stroke="' + pal.qi + '" stroke-width="2.6"/><path d="M0,74 A74,74 0 0 0 0,-74 A37,37 0 0 0 0,0 A37,37 0 0 1 0,74Z" fill="' + pal.qi + '"/><circle cy="37" r="9" fill="#fff" fill-opacity=".8"/><circle cy="-37" r="9" fill="' + pal.qi + '"/></g>', { twoSided: true, zb: -200 }));
      // Ánh đan điền nhịp theo hơi thở.
      sc.sphere('dantian', V.add(S.pel, mv(S.Rc, [0, 17, 16.5])), [9 + S.P.br * 2.2, 9 + S.P.br * 2.2], q, 1.5);
      sc.ops[sc.ops.length - 1].a.opacity = (0.28 + 0.28 * (S.P.br * 0.5 + 0.5)).toFixed(2);
      // Vệt khí theo hai bàn tay.
      const qi = clamp(S.P.qi, 0, 1);
      sc.trail('qiA', inst.hist.a, pal.qi, 6.5 * qi, -2); sc.trail('qiB', inst.hist.b, pal.qi, 6.5 * qi, -2);
      // Hạt khí quanh thân.
      for (let i = 0; i < 6; i++) {
        const a = t * 0.45 + i * 1.05, rr = 70 + (i % 3) * 8, ph = (t * 0.1 + i / 6) % 1;
        sc.sphere('m' + i, [Math.cos(a) * rr, 20 + ph * 150, Math.sin(a) * rr * 0.6], [2 + (i % 3) * 0.6, 2 + (i % 3) * 0.6], q, 0);
        Object.assign(sc.ops[sc.ops.length - 1].a, { opacity: (Math.sin(ph * Math.PI) * 0.75).toFixed(2), class: 'gr-mote' });
      }
    } else if (pose === 'zen') {
      // Pháp luân sau lưng.
      let spokes = '';
      for (let i = 0; i < 8; i++) spokes += '<path d="M0,0 L' + (Math.cos((i * Math.PI) / 4) * 62).toFixed(1) + ',' + (Math.sin((i * Math.PI) / 4) * 62).toFixed(1) + '"/>';
      const rotw = (t * 9) % 360;
      sc.planar('wheel', [0, 124, -50], [1, 0, 0], [0, 1, 0], '<g opacity=".3" stroke="' + pal.qi + '" fill="none" stroke-width="2"><circle r="66"/><circle r="50" stroke-dasharray="4 6"/><g transform="rotate(' + rotw.toFixed(1) + ')">' + spokes + '<circle r="9" fill="' + pal.qi + '" fill-opacity=".5"/></g></g>', { twoSided: true, zb: -200 });
      const br = S.P.br * 0.5 + 0.5;
      [[84, 0.1], [64, 0.14], [46, 0.16]].forEach(([r, o], i) => {
        sc.planar('aura' + i, [0, 124, -46], [1, 0, 0], [0, 1, 0], '<circle r="' + (r * (0.94 + br * 0.1)).toFixed(1) + '" fill="' + pal.qi + '" fill-opacity="' + o + '"/>', { twoSided: true, zb: -190 });
      });
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.13 + i / 6) % 1, a = i * 2.4 + t * 0.4;
        sc.sphere('m' + i, [Math.sin(a) * (54 + (i % 3) * 8), 26 + ph * 150, Math.cos(a) * 34], [2.2 + (i % 3) * 0.7, 2.2 + (i % 3) * 0.7], q, 0);
        Object.assign(sc.ops[sc.ops.length - 1].a, { opacity: (Math.sin(ph * Math.PI) * 0.9).toFixed(2), class: 'gr-mote' });
      }
    }
  }

  // ---- API công khai ------------------------------------------------------------------------------------------------------------------
  let counter = 0;
  function svg(hero, pose) {
    const h = hero === 'nu' ? 'nu' : 'nam', p = POSES.some((x) => x.id === pose) ? pose : 'talk';
    const inst = makeHero(h, p), sc = inst.frame(), gid = 'zh' + ++counter;
    return (
      '<svg class="gr-hero" data-pose="' + p + '" data-hero="' + h + '" data-gid="' + gid + '" viewBox="0 0 200 232" role="img" aria-label="' + HERO_LABEL[h] + ' · ' + POSES.find((x) => x.id === p).label + '">' +
      '<defs>' + sc.defs(gid) + '</defs><g class="gr-world">' + sc.toMarkup(gid) + '</g></svg>'
    );
  }
  Z.track('svg.gr-hero', (el) => makeHero(el.dataset.hero, el.dataset.pose));

  // ---- Phông sơn thủy cho sân khấu ---------------------------------------------------------------------------------------
  // Màu đặt trong growth.css (các lớp gr-sc-*) để giao diện tối đổi được; ở đây chỉ có hình.
  function scene() {
    const petals = [0, 1, 2, 3, 4, 5].map((i) => '<ellipse class="gr-sc-petal gr-fall-' + i + '" cx="' + (40 + i * 62) + '" cy="-10" rx="3.2" ry="5"/>').join('');
    return (
      '<svg class="gr-scene" viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
      '<circle class="gr-sc-sun" cx="296" cy="92" r="34"/>' +
      '<g class="gr-sc-cloud gr-drift-a"><ellipse cx="90" cy="70" rx="44" ry="10"/><ellipse cx="118" cy="62" rx="26" ry="9"/></g>' +
      '<g class="gr-sc-cloud gr-drift-b"><ellipse cx="300" cy="140" rx="52" ry="9"/><ellipse cx="272" cy="133" rx="24" ry="8"/></g>' +
      '<path class="gr-sc-far" d="M0,214 L34,176 L58,192 L104,124 L146,176 L176,156 L214,194 L262,132 L306,182 L346,152 L400,196 L400,320 L0,320Z"/>' +
      '<g class="gr-sc-mist gr-drift-b"><rect x="-40" y="196" width="220" height="14" rx="7"/><rect x="230" y="186" width="210" height="12" rx="6"/></g>' +
      '<path class="gr-sc-mid" d="M0,246 C40,224 72,204 104,220 C134,194 164,176 204,210 C244,190 282,204 312,192 C344,182 372,212 400,206 L400,320 L0,320Z"/>' +
      '<path class="gr-sc-near" d="M0,286 C80,268 140,276 200,272 C262,268 330,276 400,286 L400,320 L0,320Z"/>' +
      '<g class="gr-sc-pine"><path class="gr-sc-trunk" d="M-6,44 C30,40 54,52 78,46 C96,42 112,30 126,34" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path class="gr-sc-trunk" d="M52,50 C60,64 58,78 70,88" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<g class="gr-sc-needle"><ellipse cx="22" cy="34" rx="24" ry="9"/><ellipse cx="76" cy="36" rx="22" ry="8"/><ellipse cx="124" cy="26" rx="18" ry="7"/><ellipse cx="72" cy="88" rx="16" ry="6"/></g></g>' +
      '<g class="gr-sc-birds"><path d="M0,0 q5,-5 10,0 q5,-5 10,0" transform="translate(150 96)"/><path d="M0,0 q4,-4 8,0 q4,-4 8,0" transform="translate(178 108)"/></g>' +
      petals +
      '</svg>'
    );
  }
  window.zenHero = { svg, scene, POSES, FORMS, SEQ, formAt, makeHero, START };
})();
