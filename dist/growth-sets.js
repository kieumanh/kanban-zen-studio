'use strict';
// v2.17.0 (Họa Cảnh): các bộ cảnh và hiệu ứng của tranh minh họa truyện ký (xem growth-scene.js).
// Một bộ cảnh là hàm (c, biến thể, khung hình) → { place, far, mid, set, fg, ground(x), depth(y), hot }:
//   far/mid/set/fg là nội dung SVG của bốn lớp từ xa tới gần; ground(x) cho độ cao mặt đất tại x (px) để đặt người; place là tên nơi chốn.
// Cùng một bộ cảnh đổi giờ, khí trời và biến thể là ra nhiều nơi khác nhau; màu luôn lấy từ bảng màu của giờ nên không lệch tông.
(function () {
  const Z = window.zenScene;
  const K = Z.kit;
  const { W, H, f, mix, between, pick, smooth, blob, noise1, glow, ridge, spire, mist, pine, bamboo, rock, grass, roof, house, lantern, water, lerp, clamp } = K;
  const SETS = Z.SETS, FX = Z.FX;

  // ===========================================================================================================================
  // HIỆU ỨNG
  // ===========================================================================================================================
  // Hạt rơi (hoặc bay lên) theo vòng lặp liền mạch: nhóm hạt phủ hai khoảng cao 1000 rồi trượt đúng 1000 mỗi vòng.
  function fall(r, o) {
    let d = '';
    const n = o.n;
    for (let i = 0; i < n; i++) {
      const x = between(r, -60, W + 60), y = between(r, 0, H);
      for (const yy of [y, y - H]) d += o.shape(x, yy, i);
    }
    return '<g class="' + (o.sway ? 'sc-fx-sway' : '') + '" style="' + (o.sway ? 'animation-duration:' + o.sway + 's' : '') + '"><g class="' + (o.up ? 'sc-rise' : 'sc-fall') + '" style="animation-duration:' + o.dur + 's' + (o.delay ? ';animation-delay:-' + o.delay + 's' : '') + '">' + d + '</g></g>';
  }
  const streak = (len, w, col, op, slant) => (r) => (x, y) => 'M' + f(x) + ',' + f(y) + ' l' + f(-len * slant) + ',' + f(len) + ' ';
  FX.rain = (c, r) => {
    const col = c.P.dark ? '#cfe0ff' : '#8fa1b8';
    const mk = (n, len, w, op, dur) => {
      const slant = 0.2;
      let d = '';
      return '<path d="' + Array.from({ length: n * 2 }, (_, i) => { const x = between(r, -200, W + 200), y = between(r, 0, H) - (i % 2 ? H : 0); return 'M' + f(x) + ',' + f(y) + ' l' + f(-len * slant) + ',' + f(len); }).join(' ') + '" stroke="' + col + '" stroke-width="' + w + '" opacity="' + op + '" stroke-linecap="round" class="sc-fall" style="animation-duration:' + dur + 's"/>';
    };
    return '<g>' + mk(130, 46, 1.2, 0.35, 1.2) + mk(80, 96, 2, 0.5, 0.62) + '</g><rect x="-40" y="-40" width="' + (W + 80) + '" height="' + (H + 80) + '" fill="' + c.P.sky[1] + '" opacity=".12"/>';
  };
  FX.snow = (c, r) => {
    const dot = (rad, col) => (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rad * between(r, 0.7, 1.3)) + '" fill="' + col + '"/>';
    return fall(r, { n: 120, dur: 24, sway: 7, shape: dot(1.7, 'rgba(255,255,255,.7)') }) + fall(r, { n: 70, dur: 13, sway: 5, delay: 4, shape: dot(3.6, 'rgba(255,255,255,.92)') });
  };
  FX.ash = (c, r) => fall(r, { n: 70, dur: 30, sway: 9, shape: (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(between(r, 1.2, 2.8)) + '" fill="#e9c4c8" opacity="' + f(between(r, 0.3, 0.7)) + '"/>' });
  FX.embers = (c, r) => fall(r, { n: 46, dur: 16, up: true, sway: 6, shape: (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(between(r, 1.4, 3.2)) + '" fill="#ffb35a" opacity="' + f(between(r, 0.4, 0.95)) + '"/>' });
  FX.sparks = (c, r) => fall(r, { n: 36, dur: 9, up: true, sway: 4, shape: (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(between(r, 1.4, 3)) + '" fill="#ffe9a0" opacity="' + f(between(r, 0.5, 1)) + '"/>' });
  const petal = (col) => (r) => (x, y) => '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(between(r, 4, 7)) + '" ry="' + f(between(r, 2.4, 3.6)) + '" fill="' + col + '" transform="rotate(' + f(between(r, 0, 180)) + ' ' + f(x) + ' ' + f(y) + ')" opacity=".85"/>';
  FX.petals = (c, r) => fall(r, { n: 26, dur: 26, sway: 8, shape: petal('#f6a9be')(r) });
  FX.leaves = (c, r) => fall(r, { n: 22, dur: 22, sway: 7, shape: petal(pick(r, ['#b9783a', '#c49a3c', '#8a5a2c']))(r) });
  FX.bubbles = (c, r) => fall(r, { n: 40, dur: 20, up: true, sway: 6, shape: (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(between(r, 3, 11)) + '" fill="none" stroke="#bff6ee" stroke-width="1.6" opacity="' + f(between(r, 0.3, 0.7)) + '"/>' });
  FX.dust = (c, r) => fall(r, { n: 50, dur: 60, up: true, sway: 14, shape: (x, y) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(between(r, 1, 2.2)) + '" fill="' + c.P.lamp + '" opacity="' + f(between(r, 0.25, 0.6)) + '"/>' });
  FX.fireflies = (c, r) => {
    let s = '';
    for (let i = 0; i < 18; i++) {
      const x = between(r, 60, W - 60), y = between(r, 420, 880);
      s += '<g class="sc-fly" style="--dx:' + f(between(r, -80, 80)) + 'px;--dy:' + f(between(r, -60, 40)) + 'px;animation-duration:' + f(between(r, 5, 11)) + 's;animation-delay:-' + f(r() * 9) + 's">' + glow(c, x, y, 16, '#f2ffa0', 0.9) + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="2.2" fill="#fbffd0"/></g>';
    }
    return s;
  };
  FX.lightning = (c, r) => {
    let x = between(r, 300, 1300), y = 0, d = 'M' + f(x) + ',0';
    while (y < 560) {
      x += between(r, -70, 70);
      y += between(r, 50, 90);
      d += ' L' + f(x) + ',' + f(y);
    }
    return '<rect x="-40" y="-40" width="' + (W + 80) + '" height="' + (H + 80) + '" fill="#dfe8ff" class="sc-flash"/><path d="' + d + '" stroke="#f4f8ff" stroke-width="5" fill="none" stroke-linejoin="round" class="sc-bolt"/>';
  };
  FX.rays = (c, r) => {
    let s = '';
    const col = c.P.dark ? c.P.glow : '#fff6d0';
    for (let i = 0; i < 5; i++) {
      const x0 = between(r, 100, 1100), w = between(r, 60, 150);
      s += '<path d="M' + f(x0) + ',-20 L' + f(x0 + w) + ',-20 L' + f(x0 + w + 320) + ',' + (H + 20) + ' L' + f(x0 + 160) + ',' + (H + 20) + 'Z" fill="' + c.lin('ray', [[0, col, 0.38], [1, col, 0]]) + '" class="sc-pulse" style="animation-delay:-' + f(r() * 8) + 's"/>';
    }
    return s;
  };
  FX.steam = (c, r, info) => {
    const [x, y] = info.hot || [0.5 * W, 0.7 * H];
    let s = '';
    const g = c.rad('steam', [[0, '#ffffff', 0.7], [1, '#ffffff', 0]]);
    for (let i = 0; i < 5; i++) s += '<circle cx="' + f(x + between(r, -14, 14)) + '" cy="' + f(y) + '" r="' + f(between(r, 22, 40)) + '" fill="' + g + '" class="sc-puff" style="animation-delay:-' + f(i * 1.6) + 's"/>';
    return s;
  };
  FX.redmist = (c, r) => {
    let s = '';
    const g = c.rad('rmist', [[0, '#c4203c', 0.55], [1, '#c4203c', 0]]);
    for (let i = 0; i < 7; i++) s += '<ellipse cx="' + f(between(r, -100, W + 100)) + '" cy="' + f(between(r, 700, 960)) + '" rx="' + f(between(r, 280, 520)) + '" ry="' + f(between(r, 30, 60)) + '" fill="' + g + '"/>';
    return '<g class="sc-drift sc-drift-slow">' + s + '</g>';
  };
  FX.drift = (c, r) => {
    let s = '';
    const g = c.rad('fog', [[0, '#ffffff', 0.5], [1, '#ffffff', 0]]);
    for (let i = 0; i < 6; i++) s += '<ellipse cx="' + f(between(r, -100, W + 100)) + '" cy="' + f(between(r, 500, 940)) + '" rx="' + f(between(r, 300, 560)) + '" ry="' + f(between(r, 40, 80)) + '" fill="' + g + '"/>';
    return '<g class="sc-drift">' + s + '</g>';
  };
  // Xoáy hút quanh vầng trăng: các nhánh xoắn đỏ quay chậm (Thôn Nguyệt).
  FX.spiral = (c, r) => {
    const b = (c.shot.b || (c.P.body ? [c.P.body] : []))[0];
    const x = (b ? b[1] : 0.7) * W, y = (b ? b[2] : 0.24) * H;
    let arms = '';
    for (let k = 0; k < 4; k++) {
      let d = '';
      for (let t = 0; t <= 1.001; t += 0.05) {
        const a = k * 1.571 + t * 5.4, rad = 60 + t * 520;
        d += (t === 0 ? 'M' : 'L') + f(x + Math.cos(a) * rad) + ',' + f(y + Math.sin(a) * rad * 0.7);
      }
      arms += '<path d="' + d + '" stroke="#e0344c" stroke-width="' + (5 - k * 0.6) + '" fill="none" opacity=".34" stroke-linecap="round"/>';
    }
    return '<g class="sc-spin" style="transform-origin:' + f(x) + 'px ' + f(y) + 'px">' + arms + '</g>';
  };
  // Những sợi chỉ đỏ từ mặt đất kéo về vầng trăng (nỗi khổ của người đời chảy về Huyết Nguyệt đài).
  FX.redthread = (c, r) => {
    const b = (c.shot.b || (c.P.body ? [c.P.body] : []))[0];
    const tx = (b ? b[1] : 0.7) * W, ty = (b ? b[2] : 0.24) * H;
    let s = '';
    for (let i = 0; i < 14; i++) {
      const x0 = between(r, 40, W - 40), y0 = between(r, 780, 980);
      s += '<path d="M' + f(x0) + ',' + f(y0) + ' C' + f(x0 + between(r, -200, 200)) + ',' + f(y0 - 420) + ' ' + f(tx + between(r, -240, 240)) + ',' + f(ty + 320) + ' ' + f(tx) + ',' + f(ty + 30) + '" stroke="#ff4a62" stroke-width="' + f(between(r, 1.4, 3)) + '" fill="none" opacity=".55" stroke-dasharray="14 18" class="sc-thread" style="animation-duration:' + f(between(r, 4, 9)) + 's"/>';
    }
    return s;
  };
  FX.ripple = (c, r, info) => {
    const y0 = info.waterY || 0.8 * H;
    let s = '';
    for (let i = 0; i < 6; i++) s += '<ellipse cx="' + f(between(r, 100, W - 100)) + '" cy="' + f(y0 + between(r, 40, 160)) + '" rx="60" ry="10" fill="none" stroke="#fff" stroke-width="1.8" class="sc-ring" style="animation-delay:-' + f(i * 1.1) + 's"/>';
    return s;
  };
  FX.birds = (c, r) => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * 60 + between(r, -20, 20), y = 160 + between(r, -40, 60) + Math.abs(i - 2) * 24;
      s += '<path d="M' + f(x) + ',' + f(y) + ' q8,-8 16,0 q8,-8 16,0" stroke="' + c.P.ink + '" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>';
    }
    return '<g class="sc-drift sc-drift-fast">' + s + '</g>';
  };

  // ===========================================================================================================================
  // BỘ CẢNH
  // ===========================================================================================================================
  const polyY = (pts) => (x) => {
    for (let i = 0; i < pts.length - 1; i++) if (x * W <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (x * W - pts[i][0]) / (pts[i + 1][0] - pts[i][0]));
    return pts[pts.length - 1][1];
  };
  // ---- Núi (Vân Mộng, Tùng Hạc, Tuyết Phong) ----------------------------------------------------------------------------------
  SETS.peaks = (c, v) => {
    const P = c.P, r = c.rnd('pk');
    const snowy = v === 'snow' || P.id === 'snow' || P.id === 'snowy';
    const capCol = snowy ? '#f4f8ff' : null;
    let far = '', mid = '', set = '', fg = '';
    const farC = snowy ? mix(P.far, '#ffffff', 0.35) : P.far, midC = snowy ? mix(P.mid, '#ffffff', 0.3) : P.mid;
    far += ridge(c, r, { y: 600, amp: 250, fill: farC, fade: P.haze, id: 'a', n: 34, rim: snowy ? '#fff' : null, rimOp: 0.6 });
    for (const [x, w, h] of [[250, 110, 360], [900, 140, 450], [1430, 100, 320]]) far += spire(c, r, x, 660, w, h, mix(farC, P.haze, 0.3), { fade: P.haze, lean: between(r, -0.12, 0.12), strata: 2 });
    far += mist(c, r, 580, 3, 0.65);
    mid += ridge(c, r, { y: 740, amp: 230, fill: midC, fade: mix(midC, P.haze, 0.5), id: 'b', n: 40, peak: 0.74, peakW: 3, freq: 1.3, rim: snowy ? '#fff' : null, rimOp: 0.5 });
    mid += spire(c, r, 1190, 770, 130, 400, midC, { fade: mix(midC, P.haze, 0.55), lean: 0.1 });
    mid += spire(c, r, 140, 790, 120, 330, midC, { fade: mix(midC, P.haze, 0.55), lean: -0.1, strata: 3 });
    mid += mist(c, r, 700, 3, 0.55);
    // cây thông xa trên sườn núi giữa
    for (let i = 0; i < 7; i++) mid += pine(c, r, between(r, 60, 1540), between(r, 740, 800), between(r, 60, 110), mix(midC, P.ink, 0.35));
    let ground = () => H * 0.82, depth = () => 1, hot, place = 'Núi Vân Mộng';
    const stone = mix(P.near, P.haze, snowy ? 0.7 : 0.1);
    if (v === 'path' || v === 'hut') {
      // Dốc núi Tùng Hạc: đường bậc đá leo từ trái dưới lên am trên đỉnh phải.
      place = 'Dốc núi Tùng Hạc';
      const pts = [[-100, 900], [300, 880], [640, 800], [980, 680], [1260, 600], [1500, 560], [1700, 540]];
      ground = polyY(pts.map((p) => [p[0], p[1] - 18]));
      set += '<path d="' + smooth(pts) + 'L1700,1100L-100,1100Z" fill="' + c.lin('slope', [[0, mix(P.near, P.haze, 0.15)], [1, P.near]]) + '"/>';
      for (let i = 0; i < 26; i++) {
        const x = -60 + i * 66, y = polyY(pts)(x / W) - 6;
        set += '<path d="M' + f(x) + ',' + f(y) + ' l34,-10 l8,5 l-34,10Z" fill="' + mix(P.near, '#ffffff', 0.22) + '" opacity=".65"/>';
      }
      set += house(c, r, 1470, 568, 190, 120, { wall: mix(P.near, P.haze, 0.1), roof: mix(P.fg, P.ink, 0.2), lit: true });
      for (const [x, y, h] of [[180, 880, 260], [520, 826, 200], [1090, 650, 210], [1610, 556, 190]]) set += pine(c, r, x, y, h, P.fg);
      fg += pine(c, r, 70, 1010, 520, P.fg, { lean: 0.2 }) + rock(c, r, 1420, 1040, 220, 130, P.fg, mix(P.fg, P.haze, 0.2)) + grass(c, r, 1200, 1700, 1010, 36, 50, P.fg);
      hot = [1500, 480];
    } else if (v === 'am') {
      // Sân am Tùng Hạc: nền đá phẳng, am tranh bên phải, cổng và tre bên trái.
      place = 'Am Tùng Hạc';
      ground = () => 812;
      set += '<path d="M-100,790 Q300,760 800,772 Q1300,764 1700,790 L1700,1100 L-100,1100Z" fill="' + c.lin('yard', [[0, mix(P.near, P.haze, 0.2)], [1, P.near]]) + '"/>';
      for (let i = 0; i < 7; i++) set += '<ellipse cx="' + f(150 + i * 215) + '" cy="' + f(840 + (i % 2) * 22) + '" rx="' + f(80 + (i % 3) * 20) + '" ry="14" fill="' + mix(P.near, '#ffffff', 0.14) + '" opacity=".6"/>';
      set += '<g>' + '<rect x="980" y="560" width="440" height="230" fill="' + mix(P.mid, P.near, 0.5) + '"/>' + roof(1200, 566, 580, 190, P.fg) + '<rect x="1130" y="650" width="140" height="140" fill="' + (P.dark ? P.lamp : mix(P.lamp, P.ink, 0.3)) + '" opacity=".95"/>' + glow(c, 1200, 730, 240, P.lamp, P.dark ? 0.5 : 0.18) + '<path d="M1200,650 V790 M1130,720 H1270" stroke="' + P.ink + '" stroke-width="5" opacity=".6"/>' + '</g>';
      set += '<path d="M1480,788 q20,-90 8,-180 M1520,790 q-6,-80 14,-150" stroke="' + P.fg + '" stroke-width="3" fill="none" opacity=".0"/>';
      set += bamboo(c, r, 120, 800, 380, P.fg) + bamboo(c, r, 250, 810, 320, mix(P.fg, P.mid, 0.2)) + pine(c, r, 1620, 800, 420, P.fg, { lean: -0.2 });
      set += '<g transform="translate(560 800)"><path d="M-70,0 V-170 M70,0 V-170 M-96,-170 H96 M-80,-146 H80" stroke="' + P.fg + '" stroke-width="12" fill="none"/>' + roof(0, -170, 220, 50, P.fg) + '</g>';
      fg += grass(c, r, 0, W, 990, 60, 60, P.fg) + rock(c, r, 1480, 1040, 160, 90, P.fg);
      hot = [1230, 540];
    } else if (v === 'summit') {
      // Đỉnh Vân Mộng: bệ đá nhô khỏi biển mây, một cây tùng nghiêng.
      place = 'Đỉnh Vân Mộng';
      ground = () => 790;
      mid += mist(c, r, 800, 5, 0.85);
      set += '<path d="M-100,1100 L-100,830 Q160,780 460,790 Q860,800 1160,790 Q1480,784 1700,820 L1700,1100Z" fill="' + c.lin('top', [[0, mix(P.near, P.haze, 0.1)], [1, P.fg]]) + '"/>' + mist(c, r, 900, 4, 0.7);
      set += '<path d="M-100,830 Q160,780 460,790 Q860,800 1160,790 Q1480,784 1700,820" stroke="' + mix(P.near, '#ffffff', 0.4) + '" stroke-width="3" fill="none" opacity=".5"/>';
      fg += pine(c, r, 150, 1030, 560, P.fg, { lean: 0.28 }) + rock(c, r, 1500, 1050, 240, 140, P.fg, mix(P.fg, P.haze, 0.3));
    } else if (v === 'snow') {
      // Tuyết Phong: đỉnh phủ tuyết, am tranh nhỏ, bồ đoàn.
      place = 'Tuyết Phong';
      ground = () => 806;
      set += '<path d="M-100,1100 L-100,840 Q200,790 520,800 Q880,812 1200,796 Q1500,786 1700,820 L1700,1100Z" fill="' + c.lin('snowg', [[0, '#fbfdff'], [1, mix('#dbe6f4', P.ink, P.dark ? 0.45 : 0.05)]]) + '"/>';
      for (let i = 0; i < 6; i++) set += '<path d="M' + f(100 + i * 280) + ',' + f(880 + (i % 2) * 40) + ' q60,-26 140,0" stroke="' + mix('#c4d2e6', P.ink, P.dark ? 0.4 : 0) + '" stroke-width="3" fill="none" opacity=".6"/>';
      set += '<g transform="translate(1180 800)"><rect x="-110" y="-120" width="220" height="120" fill="' + mix(P.mid, P.ink, 0.25) + '"/><path d="M-160,-118 Q0,-224 160,-118 L140,-100 Q0,-180 -140,-100Z" fill="' + mix('#f4f8ff', P.ink, P.dark ? 0.3 : 0) + '"/><path d="M-110,-118 H110" stroke="' + P.ink + '" stroke-width="5" opacity=".5"/><rect x="-26" y="-84" width="52" height="84" fill="' + mix(P.lamp, P.ink, P.dark ? 0 : 0.5) + '"/>' + glow(c, 0, -44, 160, P.lamp, P.dark ? 0.5 : 0.12) + '</g>';
      for (const [x, y, h] of [[1010, 810, 150], [1380, 806, 190]]) set += pine(c, r, x, y, h, mix(P.fg, '#ffffff', 0.1));
      fg += pine(c, r, 80, 1040, 480, mix(P.fg, '#ffffff', 0.05), { lean: 0.22 }) + rock(c, r, 1520, 1040, 220, 120, mix(P.fg, '#ffffff', 0.1), '#ffffff');
      hot = [1180, 560];
    } else {
      set += '<path d="M-100,1100 L-100,860 Q300,810 800,830 Q1300,816 1700,850 L1700,1100Z" fill="' + c.lin('base', [[0, mix(P.near, P.haze, 0.1)], [1, P.fg]]) + '"/>';
      ground = () => 850;
    }
    return { place, far, mid, set, fg, ground, depth, hot };
  };

  // ===========================================================================================================================
  // DỤNG CỤ CHUNG CHO CÁC BỘ CẢNH
  // ===========================================================================================================================
  // Cây lá rộng (đa, mận, cây ven làng): thân ngắn, tán là các khối tròn chồng nhau, mảng sáng ở đỉnh.
  const broad = (c, r, x, y, h, col, o) => {
    o = o || {};
    let s = '<path d="M' + f(x - h * 0.04) + ',' + f(y + 4) + ' Q' + f(x - h * 0.02) + ',' + f(y - h * 0.3) + ' ' + f(x) + ',' + f(y - h * 0.5) + ' Q' + f(x + h * 0.02) + ',' + f(y - h * 0.3) + ' ' + f(x + h * 0.04) + ',' + f(y + 4) + 'Z" fill="' + col + '"/>';
    const n = o.lobes || 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      s += '<path d="' + blob(r, x + Math.cos(a) * h * 0.27 * (o.wide || 1) + between(r, -6, 6), y - h * 0.62 + Math.sin(a) * h * 0.17, h * 0.27, h * 0.21, 8, false, true) + '" fill="' + col + '"/>';
    }
    s += '<path d="' + blob(r, x - h * 0.05, y - h * 0.74, h * 0.28, h * 0.13, 9, false, true) + '" fill="' + mix(col, o.lit || '#ffffff', o.light === undefined ? 0.16 : o.light) + '" opacity=".38"/>';
    return '<g>' + s + '</g>';
  };
  // Liễu rủ: tán nhỏ, nhiều dải lá buông xuống đung đưa.
  const willow = (c, r, x, y, h, col) => {
    let s = '<path d="M' + f(x) + ',' + f(y + 4) + ' Q' + f(x + h * 0.06) + ',' + f(y - h * 0.4) + ' ' + f(x - h * 0.02) + ',' + f(y - h * 0.72) + '" stroke="' + col + '" stroke-width="' + f(h * 0.05) + '" fill="none" stroke-linecap="round"/>';
    s += '<path d="' + blob(r, x - h * 0.02, y - h * 0.78, h * 0.3, h * 0.13, 9, false, true) + '" fill="' + col + '"/>';
    let strands = '';
    for (let i = 0; i < 40; i++) {
      const sx = x - h * 0.02 + between(r, -h * 0.34, h * 0.34), len = h * between(r, 0.3, 0.66), sw = between(r, -8, 8);
      strands += 'M' + f(sx) + ',' + f(y - h * 0.76) + ' q' + f(sw) + ',' + f(len * 0.5) + ' ' + f(sw * 0.4) + ',' + f(len) + ' ';
    }
    return '<g>' + s + '<g class="sc-sway" style="transform-origin:' + f(x) + 'px ' + f(y - h * 0.78) + 'px"><path d="' + strands + '" stroke="' + col + '" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/></g></g>';
  };
  // Một người nhỏ dạng bóng: dùng cho đám đông, hàng người chuyền nước, dân làng, quân lính.
  const folk = (x, y, s, col, o) => {
    o = o || {};
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(s) + ')" fill="' + col + '"><path d="M-7,0 L-6,-19 Q-6,-30 0,-30 Q6,-30 6,-19 L7,0Z"/><circle cx="0" cy="-36" r="5.2"/>' +
      (o.hat ? '<path d="M-11,-38 L0,-48 L11,-38Z"/>' : '') + (o.bucket ? '<path d="M-14,-26 L-9,-24" stroke="' + col + '" stroke-width="2"/><path d="M-20,-24 h12 l-2,10 h-8Z"/>' : '') + (o.spear ? '<path d="M9,2 L9,-58" stroke="' + col + '" stroke-width="2"/><path d="M9,-58 l-3,8 h6Z"/>' : '') + '</g>';
  };
  const crowd = (r, pts, col, o) => '<g>' + pts.map((p) => folk(p[0], p[1], p[2] === undefined ? 1 : p[2], col, o && o.pick ? o.pick(r) : o)).join('') + '</g>';
  // Dải ruộng bậc thang / lúa: nhiều đường cong song song thu nhỏ dần về chân trời.
  const paddies = (c, r, y0, y1, col, glint) => {
    let s = '';
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), y = lerp(y0, y1, Math.pow(t, 1.4)), h = lerp(8, 44, t), amp = lerp(10, 36, t);
      const pts = [];
      for (let k = 0; k <= 10; k++) pts.push([-80 + k * 176, y + Math.sin(k * 1.3 + i * 2.1) * amp * 0.3]);
      const d = smooth(pts);
      s += '<path d="' + d + 'L1700,' + f(y + h) + ' L-100,' + f(y + h) + 'Z" fill="' + mix(col, c.P.ink, t * 0.25) + '"/>' + (glint ? '<path d="' + d + '" stroke="' + glint + '" stroke-width="' + f(1 + t * 1.6) + '" fill="none" opacity="' + f(0.12 + t * 0.2) + '"/>' : '');
    }
    return s;
  };
  // Lớp đất nứt: các đường nứt gấp khúc tỏa ra từ vài tâm.
  const cracks = (c, r, y0, y1, col, n) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      let x = between(r, -40, W + 40), y = between(r, y0, y1);
      const k = (y - y0) / (y1 - y0 + 1);
      const seg = 3 + Math.floor(r() * 4);
      d += 'M' + f(x) + ',' + f(y);
      for (let j = 0; j < seg; j++) {
        x += between(r, -60, 60) * (0.5 + k);
        y += between(r, -10, 22) * (0.4 + k);
        d += ' L' + f(x) + ',' + f(y);
      }
    }
    return '<path d="' + d + '" stroke="' + col + '" stroke-width="2.4" fill="none" stroke-linejoin="round" opacity=".7"/>';
  };
  // Nhà tranh: tường gỗ thấp, mái rơm dày che hiên; lit: có đèn.
  const hut = (c, r, x, y, w, h, o) => {
    o = o || {};
    const P = c.P, wall = o.wall || P.mid, thatch = o.thatch || mix(P.near, '#c9a15a', P.dark ? 0.04 : 0.26);
    let s = '<rect x="' + f(x - w / 2) + '" y="' + f(y - h) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + wall + '"/>';
    for (let i = 1; i < 5; i++) s += '<path d="M' + f(x - w / 2) + ',' + f(y - h + i * h * 0.2) + ' h' + f(w) + '" stroke="' + mix(wall, P.ink, 0.3) + '" stroke-width="1.4" opacity=".5"/>';
    const lit = o.lit !== false;
    const dw = w * 0.26, dh = h * 0.7;
    s += '<rect x="' + f(x - dw / 2 + (o.doorX || 0)) + '" y="' + f(y - dh) + '" width="' + f(dw) + '" height="' + f(dh) + '" fill="' + (lit ? P.lamp : mix(wall, P.ink, 0.55)) + '"' + (lit ? ' opacity=".95"' : '') + '/>';
    if (lit) s += glow(c, x + (o.doorX || 0), y - dh * 0.5, w * 0.8, P.lamp, P.dark ? 0.45 : 0.16);
    // mái rơm: hình thang vòng, mép lởm chởm
    s += '<path d="M' + f(x - w * 0.68) + ',' + f(y - h + 12) + ' Q' + f(x - w * 0.3) + ',' + f(y - h - h * 0.62) + ' ' + f(x) + ',' + f(y - h - h * 0.74) + ' Q' + f(x + w * 0.3) + ',' + f(y - h - h * 0.62) + ' ' + f(x + w * 0.68) + ',' + f(y - h + 12) + ' Q' + f(x) + ',' + f(y - h + 28) + ' ' + f(x - w * 0.68) + ',' + f(y - h + 12) + 'Z" fill="' + thatch + '"/>';
    for (let i = 0; i < 9; i++) s += '<path d="M' + f(x - w * 0.6 + i * w * 0.15) + ',' + f(y - h - h * 0.3 + Math.abs(i - 4) * 5) + ' l' + f(between(r, -5, 5)) + ',' + f(h * 0.4) + '" stroke="' + mix(thatch, P.ink, 0.35) + '" stroke-width="2" opacity=".5"/>';
    return '<g>' + s + '</g>';
  };
  // Vách đá dựng đứng hai bên hẻm núi: mép lượn, vân đá; side: -1 trái, 1 phải.
  const cliff = (c, r, side, edge, top, base, fill, o) => {
    o = o || {};
    const dir = side, pts = [];
    const f1 = noise1(r, 3);
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, y = lerp(top, base, t);
      pts.push([edge + dir * (f1(t * 3) * 0.5 + 0.5) * (o.wob || 70) + dir * Math.pow(t, 1.5) * (o.slope || 90), y]);
    }
    const far = side < 0 ? -140 : W + 140;
    const d = smooth(pts);
    let s = '<path d="M' + far + ',' + (top - 60) + ' L' + f(pts[0][0]) + ',' + f(top - 10) + ' ' + d.replace(/^M[^C]*/, '') + ' L' + far + ',' + (base + 10) + 'Z" fill="' + c.lin('cl' + side + Math.round(edge), [[0, mix(fill, '#ffffff', 0.1)], [1, o.fade || fill]], [0, 0, 0, 1]) + '"/>';
    for (let i = 0; i < 7; i++) {
      const y = lerp(top + 30, base - 20, i / 7) + between(r, -10, 10), x0 = pts[Math.min(14, Math.round(((y - top) / (base - top)) * 14))][0];
      s += '<path d="M' + f(x0) + ',' + f(y) + ' q' + f(-dir * 60) + ',-' + f(6 + r() * 8) + ' ' + f(-dir * between(r, 90, 200)) + ',-' + f(r() * 10) + '" stroke="' + mix(fill, '#ffffff', 0.3) + '" stroke-width="2" fill="none" opacity=".3"/>';
    }
    return s;
  };
  Object.assign(K, { broad, willow, folk, crowd, paddies, cracks, hut, cliff, polyY });

  // ===========================================================================================================================
  // BỘ CẢNH THIÊN NHIÊN
  // ===========================================================================================================================
  // ---- Chân núi Vân Mộng: quán trà, suối, võ đường -----------------------------------------------------------------------------
  SETS.valley = (c, v) => {
    const P = c.P, r = c.rnd('vl');
    const snowy = P.id === 'snow' || P.id === 'snowy';
    const farC = snowy ? mix(P.far, '#ffffff', 0.35) : P.far, midC = snowy ? mix(P.mid, '#ffffff', 0.3) : P.mid;
    let far = '', mid = '', set = '', fg = '';
    far += ridge(c, r, { y: 560, amp: 260, fill: farC, fade: P.haze, id: 'a', n: 34, rim: snowy ? '#fff' : null });
    for (const [x, w, h] of [[380, 120, 380], [1180, 150, 420]]) far += spire(c, r, x, 640, w, h, mix(farC, P.haze, 0.3), { fade: P.haze, lean: between(r, -0.1, 0.1), strata: 2 });
    far += mist(c, r, 600, 3, 0.6);
    mid += ridge(c, r, { y: 740, amp: 150, fill: midC, fade: mix(midC, P.haze, 0.5), id: 'b', n: 36, freq: 1.4, rim: snowy ? '#fff' : null, rimOp: 0.4 });
    for (let i = 0; i < 9; i++) mid += broad(c, r, between(r, 60, 1540), between(r, 740, 790), between(r, 70, 120), mix(midC, P.ink, 0.25));
    for (const hx of [260, 640, 1450]) mid += hut(c, r, hx, 770, between(r, 70, 100), 50, { lit: P.dark, wall: mix(midC, P.ink, 0.1) });
    mid += mist(c, r, 780, 3, 0.55);
    let ground = () => H * 0.83, depth = () => 1, hot, waterY, place = 'Chân núi Vân Mộng';
    const grassC = snowy ? mix(P.near, P.haze, 0.8) : mix(P.grass, P.haze, 0.1);
    const land = (yTop) => '<path d="M-100,1100 L-100,' + (yTop + 20) + ' Q300,' + (yTop - 30) + ' 800,' + yTop + ' Q1300,' + (yTop - 24) + ' 1700,' + (yTop + 16) + ' L1700,1100Z" fill="' + c.lin('land' + yTop, [[0, grassC], [1, snowy ? mix('#dbe6f4', P.ink, P.dark ? 0.45 : 0.05) : P.fg]]) + '"/>';
    if (v === 'tea') {
      place = 'Quán trà chân núi Vân Mộng';
      ground = () => 842;
      set += land(800);
      // con đường đất dẫn từ tiền cảnh vào quán
      set += '<path d="M520,1100 Q700,960 900,900 Q1000,868 1120,846 L1180,846 Q1020,890 900,960 Q780,1040 760,1100Z" fill="' + mix(grassC, '#d9bf8a', P.dark ? 0.1 : 0.4) + '" opacity=".75"/>';
      // quán: nhà gỗ rộng, mái rơm, hiên có cột, biển vải, bếp
      const qx = 1190, qy = 846;
      set += '<g><rect x="' + (qx - 230) + '" y="' + (qy - 190) + '" width="460" height="190" fill="' + mix(P.mid, P.near, 0.55) + '"/>';
      for (let i = 0; i < 6; i++) set += '<path d="M' + (qx - 230) + ',' + (qy - 160 + i * 28) + ' h460" stroke="' + P.ink + '" stroke-width="1.6" opacity=".25"/>';
      set += '<rect x="' + (qx - 96) + '" y="' + (qy - 128) + '" width="192" height="128" fill="' + (P.dark ? P.lamp : mix(P.lamp, P.ink, 0.32)) + '" opacity=".95"/>' + glow(c, qx, qy - 70, 300, P.lamp, P.dark ? 0.55 : 0.2) + '<path d="M' + qx + ',' + (qy - 128) + ' V' + qy + ' M' + (qx - 96) + ',' + (qy - 64) + ' H' + (qx + 96) + '" stroke="' + P.ink + '" stroke-width="5" opacity=".55"/>';
      set += '<path d="M' + (qx - 320) + ',' + (qy - 170) + ' Q' + (qx - 170) + ',' + (qy - 236) + ' ' + (qx - 60) + ',' + (qy - 316) + ' L' + (qx + 60) + ',' + (qy - 316) + ' Q' + (qx + 170) + ',' + (qy - 236) + ' ' + (qx + 320) + ',' + (qy - 170) + ' Q' + qx + ',' + (qy - 130) + ' ' + (qx - 320) + ',' + (qy - 170) + 'Z" fill="' + mix(P.near, '#c9a15a', P.dark ? 0.04 : 0.24) + '"/>';
      for (let i = 0; i < 14; i++) set += '<path d="M' + (qx - 290 + i * 42) + ',' + (qy - 190 + Math.abs(i - 6.5) * 6) + ' l' + f(between(r, -6, 6)) + ',34" stroke="' + P.ink + '" stroke-width="2" opacity=".28"/>';
      for (const px of [-212, 212]) set += '<rect x="' + (qx + px - 7) + '" y="' + (qy - 150) + '" width="14" height="150" fill="' + P.fg + '"/>';
      set += '<g class="sc-sway" style="transform-origin:' + (qx - 212) + 'px ' + (qy - 150) + 'px"><path d="M' + (qx - 212) + ',' + (qy - 150) + ' v34" stroke="' + P.ink + '" stroke-width="2"/><rect x="' + (qx - 244) + '" y="' + (qy - 116) + '" width="64" height="86" fill="#d9c9a0" stroke="' + P.ink + '" stroke-width="2" opacity=".95"/><text x="' + (qx - 212) + '" y="' + (qy - 62) + '" text-anchor="middle" font-size="44" font-weight="700" fill="#9a2f2f" font-family="Georgia,serif">Trà</text></g>';
      set += lantern(c, qx + 212, qy - 100, 1.1, P.lamp) + '</g>';
      // bếp lò + khói
      hot = [qx + 277, qy - 270];
      set += '<rect x="' + (qx + 262) + '" y="' + (qy - 250) + '" width="30" height="86" fill="' + P.fg + '"/><rect x="' + (qx + 256) + '" y="' + (qy - 258) + '" width="42" height="12" fill="' + P.fg + '"/>';
      // hàng rào và cây
      set += broad(c, r, 560, 836, 300, P.near) + broad(c, r, 120, 840, 360, mix(P.near, P.fg, 0.4));
      for (let i = 0; i < 8; i++) set += '<path d="M' + (700 + i * 46) + ',840 v-52 M' + (690 + i * 46) + ',814 h56" stroke="' + P.fg + '" stroke-width="5" opacity=".8"/>';
      fg += grass(c, r, 0, W, 1000, 70, 66, P.fg) + rock(c, r, 1500, 1050, 190, 100, P.fg) + broad(c, r, -40, 1100, 620, P.fg, { lobes: 5 });
    } else if (v === 'stream') {
      // Suối: dải nước chạy ngang giữa cảnh, đá ngâm nước, liễu bên bờ, đá bước chân.
      place = 'Bờ suối chân núi';
      ground = () => 850;
      waterY = 760;
      set += land(840);
      const wy = 740;
      const bed = 'M-100,' + wy + ' Q300,' + (wy - 20) + ' 800,' + (wy + 6) + ' Q1300,' + (wy - 10) + ' 1700,' + (wy + 10) + ' L1700,' + (wy + 120) + ' Q1300,' + (wy + 96) + ' 800,' + (wy + 118) + ' Q300,' + (wy + 100) + ' -100,' + (wy + 126) + 'Z';
      set += '<path d="' + bed + '" fill="' + mix(P.fg, P.ink, 0.2) + '" transform="translate(0 6)"/><path d="' + bed + '" fill="' + c.lin('stw', [[0, mix(P.sky[1], P.water[1], 0.35)], [0.5, mix(P.sky[2], P.water[1], 0.6)], [1, mix(P.water[1], P.ink, 0.35)]]) + '"/>';
      for (let i = 0; i < 18; i++) {
        const x = between(r, 0, W), y = wy + between(r, 14, 104);
        set += '<path d="M' + f(x) + ',' + f(y) + ' q40,-6 88,0" stroke="' + mix(P.water[0], '#ffffff', 0.6) + '" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round" class="sc-shimmer" style="animation-delay:' + f(r() * 3) + 's"/>';
      }
      for (const [x, w] of [[180, 70], [560, 54], [980, 90], [1340, 60]]) set += rock(c, r, x, wy + 80 + (x % 3) * 8, w, w * 0.6, P.fg, mix(P.fg, P.haze, 0.25));
      set += willow(c, r, 1400, 850, 520, mix(P.near, P.fg, 0.5)) + broad(c, r, 220, 780, 240, P.mid);
      for (const x of [420, 470, 520]) set += '<ellipse cx="' + x + '" cy="' + (wy + 62) + '" rx="26" ry="8" fill="' + mix(P.near, P.haze, 0.2) + '"/>';
      fg += grass(c, r, 0, W, 990, 60, 70, P.fg) + rock(c, r, 130, 1050, 220, 120, P.fg, mix(P.fg, P.haze, 0.2)) + '<path d="M1490,1100 q-8,-110 20,-190 M1530,1100 q4,-90 -16,-170 M1566,1100 q16,-100 6,-160" stroke="' + P.fg + '" stroke-width="5" fill="none" opacity=".9"/>';
      hot = [900, 700];
    } else if (v === 'dojo') {
      // Võ đường dưới chân núi: sân lát đá, sảnh mái cong, cổng gỗ, bảng tre ở cổng.
      place = 'Võ đường chân núi';
      ground = () => 846;
      set += land(800);
      set += '<path d="M180,1100 L420,880 L1500,880 L1700,1100Z" fill="' + mix(grassC, '#cfc8bd', P.dark ? 0.1 : 0.32) + '" opacity=".85"/>';
      for (let i = 1; i < 6; i++) set += '<path d="M' + f(lerp(420, 180, i / 6)) + ',' + f(lerp(880, 1100, i / 6)) + ' H' + f(lerp(1500, 1700, i / 6)) + '" stroke="' + P.ink + '" stroke-width="1.6" opacity=".22"/>';
      const hx = 760, hy = 880;
      set += '<g><rect x="' + (hx - 300) + '" y="' + (hy - 200) + '" width="600" height="200" fill="' + mix(P.mid, P.near, 0.6) + '"/>';
      for (let i = 0; i < 7; i++) set += '<rect x="' + (hx - 280 + i * 88) + '" y="' + (hy - 170) + '" width="12" height="170" fill="' + P.fg + '"/>';
      set += '<rect x="' + (hx - 200) + '" y="' + (hy - 150) + '" width="400" height="140" fill="' + (P.dark ? P.lamp : mix(P.lamp, P.ink, 0.35)) + '" opacity=".92"/>' + glow(c, hx, hy - 80, 420, P.lamp, P.dark ? 0.5 : 0.16) + '<path d="M' + (hx - 100) + ',' + (hy - 150) + ' v140 M' + hx + ',' + (hy - 150) + ' v140 M' + (hx + 100) + ',' + (hy - 150) + ' v140" stroke="' + P.fg + '" stroke-width="4" opacity=".6"/>';
      set += roof(hx, hy - 196, 720, 230, P.fg, { up: 24 }) + '</g>';
      set += '<g transform="translate(1370 ' + 890 + ')"><path d="M-84,0 V-210 M84,0 V-210" stroke="' + P.fg + '" stroke-width="16"/><path d="M-120,-210 H120 M-96,-178 H96" stroke="' + P.fg + '" stroke-width="12"/>' + roof(0, -214, 280, 70, P.fg) + '</g>';
      set += broad(c, r, 90, 880, 380, mix(P.near, P.fg, 0.45)) + pine(c, r, 1590, 900, 360, P.fg, { lean: -0.12 });
      if (v === 'dojo' && c.shot.v === 'dojo') hot = [hx + 240, hy - 360];
      fg += grass(c, r, 0, W, 1000, 50, 56, P.fg) + rock(c, r, 1480, 1050, 150, 80, P.fg);
    } else {
      set += land(840);
      ground = () => 860;
    }
    return { place, far, mid, set, fg, ground, depth, hot, waterY };
  };

  // ---- Ruộng (Lệ thôn, ruộng không xanh, mầm lúa) --------------------------------------------------------------------------------
  SETS.field = (c, v) => {
    const P = c.P, r = c.rnd('fd');
    let far = '', mid = '', set = '', fg = '', place = 'Cánh đồng', ground = () => 840, hot;
    const gc = P.dark ? '#2f5a3c' : '#6fae52', green = v === 'green';
    const farC = green ? mix(P.far, gc, 0.22) : P.far, midC = green ? mix(P.mid, gc, 0.28) : P.mid;
    far += ridge(c, r, { y: 600, amp: 200, fill: farC, fade: P.haze, id: 'a', n: 30 });
    far += spire(c, r, 1260, 640, 120, 330, mix(farC, P.haze, 0.3), { fade: P.haze, strata: 2 }) + mist(c, r, 610, 3, 0.55);
    mid += ridge(c, r, { y: 700, amp: 110, fill: midC, fade: mix(midC, P.haze, 0.45), id: 'b', n: 30, freq: 1.3 });
    if (v === 'green') {
      place = 'Ruộng lúa chân Vân Mộng';
      mid += paddies(c, r, 700, 790, mix(gc, P.haze, 0.45), mix(P.haze, '#ffffff', 0.5));
      for (let i = 0; i < 8; i++) mid += broad(c, r, between(r, 40, 1560), between(r, 700, 740), between(r, 60, 100), mix(midC, P.ink, 0.25));
      mid += hut(c, r, 520, 740, 80, 46, { lit: P.dark }) + hut(c, r, 1100, 748, 90, 50, { lit: P.dark });
      set += paddies(c, r, 800, 1000, mix(gc, P.haze, 0.12), mix(P.haze, '#ffffff', 0.7));
      for (const x of [300, 900, 1320]) set += folk(x, 880 + (x % 5) * 6, 1.7, P.fg, { hat: true });
      fg += grass(c, r, 0, W, 1010, 80, 60, mix(gc, P.ink, 0.6)) + rock(c, r, 120, 1050, 180, 90, P.fg);
      ground = () => 900;
    } else {
      // dry / chain: đất nứt, lòng suối cạn, nền nhà đổ, cây khô
      place = v === 'chain' ? 'Ruộng khô, hàng người chuyền nước' : 'Lệ thôn, ruộng nứt';
      const earth = P.id === 'blood' || P.id === 'eclipse' ? mix(P.near, '#7a3a3a', 0.3) : P.earth;
      set += '<path d="M-100,1100 L-100,800 Q300,770 800,790 Q1300,776 1700,806 L1700,1100Z" fill="' + c.lin('dry', [[0, mix(earth, P.haze, 0.2)], [1, mix(earth, P.fg, 0.6)]]) + '"/>';
      set += cracks(c, r, 810, 1040, mix(P.fg, '#000000', 0.2), 36);
      // lòng suối cạn: dải đá cuội uốn từ xa về gần
      set += '<path d="M700,800 Q640,870 520,920 Q400,980 300,1100 L470,1100 Q560,1010 700,940 Q820,880 840,800Z" fill="' + mix(earth, '#ffffff', 0.12) + '" opacity=".8"/>';
      for (let i = 0; i < 22; i++) set += '<ellipse cx="' + f(between(r, 360, 820)) + '" cy="' + f(between(r, 830, 1060)) + '" rx="' + f(between(r, 5, 14)) + '" ry="' + f(between(r, 3, 8)) + '" fill="' + mix(P.fg, '#ffffff', 0.18) + '" opacity=".7"/>';
      // nền nhà đổ + cây khô
      // nhà đổ: nền đá thấp, hai cột gãy, mái xiêu chống xuống đất, khung cửa trơ
      set += '<path d="M1040,826 L1380,826 L1380,806 L1040,806Z" fill="' + P.fg + '"/><path d="M1060,806 V690 L1074,676 L1086,692 V806Z M1250,806 V720 L1262,706 L1274,722 V806Z" fill="' + P.fg + '"/><path d="M1060,700 L1160,640 L1290,780 L1262,790 L1160,676 L1086,720Z" fill="' + mix(P.fg, P.near, 0.3) + '"/><path d="M1300,806 V736 H1350 V806" stroke="' + P.fg + '" stroke-width="9" fill="none"/><path d="M1100,806 l30,-30 l24,30 M1180,806 l18,-18 l20,18" stroke="' + P.fg + '" stroke-width="6" fill="none" opacity=".8"/>';
      const dead = (x, y, h) => '<path d="M' + x + ',' + y + ' q-4,-' + h * 0.5 + ' 6,-' + h + ' M' + x + ',' + (y - h * 0.5) + ' q-34,-' + h * 0.2 + ' -52,-' + h * 0.5 + ' M' + x + ',' + (y - h * 0.62) + ' q30,-' + h * 0.15 + ' 46,-' + h * 0.4 + ' M' + (x + 4) + ',' + (y - h * 0.9) + ' q-18,-' + h * 0.1 + ' -28,-' + h * 0.24 + '" stroke="' + P.fg + '" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      set += dead(1480, 830, 280) + dead(200, 840, 220);
      fg += cracks(c, r, 980, 1080, P.ink, 14) + rock(c, r, 1500, 1060, 170, 80, P.fg) + '<path d="M140,1100 q-4,-60 10,-110 M180,1100 q8,-50 -4,-96" stroke="' + P.fg + '" stroke-width="4" fill="none" opacity=".8"/>';
      if (v === 'chain') {
        // hàng người truyền thùng nước từ chân trời (sông) lên ruộng, kéo dài theo đường chéo
        let line = '';
        for (let i = 0; i < 22; i++) {
          const t = i / 21, x = lerp(1380, 200, t) + Math.sin(t * 6) * 30, y = lerp(790, 1000, Math.pow(t, 1.1));
          line += folk(x, y, lerp(0.7, 1.9, t), P.fg, { bucket: i % 2 === 0, hat: i % 3 === 1 });
        }
        set += '<g>' + line + '</g>';
      }
      hot = [1300, 640];
    }
    return { place, far, mid, set, fg, ground, hot };
  };

  // ---- Bờ biển, đảo đá, đáy biển -------------------------------------------------------------------------------------------------
  function seaBands(c, r, y0, y1, n) {
    const P = c.P;
    let s = '<rect x="-40" y="' + y0 + '" width="' + (W + 80) + '" height="' + (H - y0 + 60) + '" fill="' + c.lin('sea', [[0, mix(P.haze, P.water[0], 0.5)], [0.35, P.water[0]], [1, P.water[1]]]) + '"/>';
    const b = (c.shot.b || (P.body ? [P.body] : []))[0];
    if (b) {
      const col = b[0] === 'red' ? '#ff6a78' : b[0] === 'sun' ? '#ffe9b8' : '#f3efe0';
      for (let i = 0; i < 12; i++) {
        const yy = y0 + 8 + i * ((y1 - y0) / 12), ww = (30 + i * 10) * between(r, 0.6, 1.2);
        s += '<rect x="' + f(b[1] * W - ww / 2 + between(r, -16, 16)) + '" y="' + f(yy) + '" width="' + f(ww) + '" height="' + f(3 + i * 0.3) + '" rx="2" fill="' + col + '" opacity="' + f(0.5 - i * 0.03) + '" class="sc-shimmer" style="animation-delay:' + f(r() * 3) + 's"/>';
      }
    }
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), y = lerp(y0 + 14, y1, Math.pow(t, 1.3)), amp = lerp(3, 16, t), len = lerp(70, 260, t);
      let d = '';
      for (let k = 0; k < 4; k++) {
        const x = between(r, -100, W + 60);
        d += 'M' + f(x) + ',' + f(y + between(r, -8, 8)) + ' q' + f(len * 0.25) + ',-' + f(amp) + ' ' + f(len * 0.5) + ',0 t' + f(len * 0.5) + ',0 ';
      }
      s += '<path d="' + d + '" stroke="' + mix(P.water[0], '#ffffff', 0.55) + '" stroke-width="' + f(1.4 + t * 1.8) + '" fill="none" opacity="' + f(0.3 + t * 0.2) + '" stroke-linecap="round" class="sc-wave" style="animation-delay:-' + f(r() * 3) + 's"/>';
    }
    return s;
  }
  SETS.shore = (c, v) => {
    const P = c.P, r = c.rnd('sh');
    let far = '', mid = '', set = '', fg = '', place = 'Đảo Thiết Thạch', ground = () => 820, hot, waterY = 560, sky, skyOpt;
    if (v === 'deep') {
      // Đáy biển: nước xanh thẫm, tia sáng mờ từ mặt, hang đá, rong biển lay động.
      place = 'Hang đá đáy biển';
      sky = '<rect x="-40" y="-40" width="1680" height="1080" fill="' + c.lin('deep', [[0, '#0d4a5a'], [0.45, P.sky[1]], [1, P.ink]]) + '"/>';
      for (let i = 0; i < 6; i++) {
        const x0 = between(r, 100, 1500), w = between(r, 50, 130);
        sky += '<path d="M' + f(x0) + ',-20 L' + f(x0 + w) + ',-20 L' + f(x0 + w - 200 + between(r, -60, 60)) + ',1000 L' + f(x0 - 260) + ',1000Z" fill="' + c.lin('beam', [[0, '#9ff0e0', 0.3], [1, '#9ff0e0', 0]]) + '" class="sc-pulse" style="animation-delay:-' + f(r() * 8) + 's"/>';
      }
      far += '<path d="' + smooth([[-100, 700], [200, 640], [520, 690], [900, 620], [1300, 680], [1700, 630]]) + 'L1700,1100 L-100,1100Z" fill="' + mix(P.sky[1], P.ink, 0.45) + '"/>' + mist(c, r, 700, 4, 0.5, '#4ab8b0');
      mid += '<path d="' + smooth([[-100, 800], [300, 740], [700, 790], [1000, 720], [1400, 770], [1700, 730]]) + 'L1700,1100 L-100,1100Z" fill="' + mix(P.sky[1], P.ink, 0.72) + '"/>';
      // miệng hang: vòm đá đen, bên trong sáng mờ
      set += '<path d="M-100,1100 L-100,800 Q140,780 260,640 Q520,500 900,520 Q1260,540 1380,700 Q1500,790 1700,800 L1700,1100Z" fill="' + P.fg + '"/><path d="M300,820 Q330,660 560,600 Q860,560 1120,640 Q1260,700 1290,820Z" fill="' + c.rad('cave', [[0, '#1d7a80', 0.7], [1, '#04202a', 1]], [0.5, 0.9, 0.7]) + '"/>';
      set += '<path d="M240,820 Q620,846 1340,820 L1340,1100 L240,1100Z" fill="' + mix(P.ink, P.water[0], 0.25) + '"/>';
      for (const [x, h] of [[120, 300], [200, 220], [1450, 340], [1540, 240], [1380, 200]]) {
        let kel = '';
        for (let k = 0; k < 3; k++) kel += '<path d="M' + (x + k * 14) + ',1000 q-26,-' + h * 0.4 + ' 8,-' + h * 0.7 + ' q24,-' + h * 0.2 + ' -4,-' + h * (0.9 + k * 0.05) + '" stroke="' + mix('#2c8a6a', P.ink, 0.45) + '" stroke-width="9" fill="none" stroke-linecap="round"/>';
        set += '<g class="sc-sway" style="transform-origin:' + x + 'px 1000px;animation-duration:' + f(5 + r() * 3) + 's">' + kel + '</g>';
      }
      ground = () => 840;
      fg += rock(c, r, 1500, 1060, 220, 120, P.fg) + rock(c, r, 90, 1070, 200, 100, P.fg) + '<path d="M0,1000 Q400,960 800,990 T1600,980 L1600,1100 L0,1100Z" fill="' + P.fg + '"/>';
      return { place, far, mid, set, fg, ground, sky, hot, waterY };
    }
    // mặt biển tới chân trời, rồi nhiều lớp sóng, đá, đảo nhỏ
    far += seaBands(c, r, 520, 700, 7);
    far += '<path d="M-100,520 Q300,512 800,518 Q1300,512 1700,520 L1700,540 L-100,540Z" fill="' + mix(P.haze, P.water[0], 0.4) + '" opacity=".7"/>';
    far += spire(c, r, 300, 540, 70, 120, mix(P.far, P.haze, 0.35), { fade: P.haze, strata: 1 }) + mist(c, r, 540, 2, 0.5);
    mid += seaBands(c, r, 700, 860, 6) + '<path d="M-100,700 Q500,690 1700,700" stroke="#fff" stroke-width="2" opacity=".3" fill="none"/>';
    // đá nhọn nhô khỏi sóng
    for (const [x, w, h] of [[1280, 90, 240], [1450, 60, 160], [520, 70, 130]]) mid += spire(c, r, x, 740, w, h, mix(P.near, P.haze, 0.1), { fade: P.near, strata: 3, shade: P.ink });
    // bãi đá nơi người đứng: phẳng, nhô khỏi mặt biển
    set += '<path d="M-100,1100 L-100,862 Q200,840 520,846 Q900,858 1200,830 Q1500,810 1700,830 L1700,1100Z" fill="' + c.lin('shelf', [[0, mix(P.near, P.haze, 0.1)], [1, P.fg]]) + '"/>';
    for (let i = 0; i < 14; i++) set += '<path d="M' + f(between(r, 0, W)) + ',' + f(between(r, 880, 1040)) + ' q30,-7 70,0" stroke="' + mix(P.near, '#ffffff', 0.25) + '" stroke-width="2" fill="none" opacity=".4"/>';
    // sóng bạc đầu đập vào mép đá: viền bọt lượn, nhiều lớp
    let foam = '';
    for (let k = 0; k < 3; k++) {
      let d = 'M-100,' + (900 + k * 12) + ' ';
      for (let i = 0; i <= 17; i++) d += 'Q' + f(-100 + i * 100 + 50) + ',' + f(880 + k * 12 - 26 - r() * 16) + ' ' + f(-100 + (i + 1) * 100) + ',' + f(900 + k * 12) + ' ';
      foam += '<path d="' + d + ' L1700,960 L-100,960Z" fill="#ffffff" opacity="' + f(0.5 - k * 0.14) + '"/>';
    }
    set += '<g class="sc-wave" style="animation-duration:4.4s">' + foam + '</g>';
    ground = (x) => 840 + (x > 0.6 ? -18 : 0);
    if (v === 'hut') {
      place = 'Túp lều lão ngư, đảo Thiết Thạch';
      set += hut(c, r, 1180, 836, 200, 100, { lit: true, doorX: -40 });
      // giá phơi lưới
      set += '<path d="M780,838 V690 M1000,838 V696 M770,692 H1010" stroke="' + P.fg + '" stroke-width="8"/><path d="M790,700 Q890,770 990,704" stroke="' + mix(P.near, '#c9b894', 0.4) + '" stroke-width="2.4" fill="none"/>';
      for (let i = 0; i < 9; i++) set += '<path d="M' + (800 + i * 22) + ',700 q0,60 ' + f(between(r, -6, 6)) + ',100' + '" stroke="' + mix(P.near, '#c9b894', 0.4) + '" stroke-width="1.6" fill="none" opacity=".8"/>';
      hot = [1230, 640];
    }
    fg += rock(c, r, 100, 1060, 240, 130, P.fg, mix(P.fg, P.haze, 0.2)) + rock(c, r, 1520, 1050, 170, 90, P.fg);
    return { place, far, mid, set, fg, ground, hot, waterY };
  };

  // ---- Hẻm núi và cầu Lạc Nhạn; sông ---------------------------------------------------------------------------------------------
  SETS.bridge = (c, v) => {
    const P = c.P, r = c.rnd('bg');
    let far = '', mid = '', set = '', fg = '', place = 'Cầu Lạc Nhạn', ground = () => 600, depth = () => 1, hot, waterY;
    far += ridge(c, r, { y: 580, amp: 260, fill: P.far, fade: P.haze, id: 'a', n: 34 });
    for (const [x, w, h] of [[760, 100, 320], [1080, 80, 250]]) far += spire(c, r, x, 640, w, h, mix(P.far, P.haze, 0.3), { fade: P.haze, strata: 2 });
    far += mist(c, r, 600, 3, 0.65);
    if (v === 'river') {
      place = 'Sông Lạc Nhạn';
      mid += ridge(c, r, { y: 690, amp: 140, fill: P.mid, fade: mix(P.mid, P.haze, 0.5), id: 'b', n: 30 });
      mid += mist(c, r, 700, 3, 0.55);
      waterY = 700;
      const reflect = ridge(c, r, { y: 690, amp: 140, fill: P.mid, fade: mix(P.mid, P.haze, 0.5), id: 'b2', n: 30 });
      set += water(c, r, 700, { reflect, reflectOp: 0.35 });
      ground = () => 840;
      // mỏm đá và lau sậy hai bên
      fg += rock(c, r, 60, 1070, 260, 150, P.fg, mix(P.fg, P.haze, 0.2)) + rock(c, r, 1540, 1060, 220, 120, P.fg);
      let reeds = '';
      for (let i = 0; i < 26; i++) { const x = between(r, 1280, 1640), h = between(r, 120, 260), sw = between(r, -22, 4); reeds += 'M' + f(x) + ',1040 q' + f(sw * 0.4) + ',-' + f(h * 0.6) + ' ' + f(sw) + ',-' + f(h) + ' '; }
      fg += '<g class="sc-sway" style="transform-origin:1460px 1040px;animation-duration:7s"><path d="' + reeds + '" stroke="' + P.fg + '" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>';
      return { place, far, mid, set, fg, ground, depth, hot, waterY };
    }
    // hai vách đá, cầu gỗ cong bắc qua, sông nằm sâu dưới đáy hẻm
    mid += cliff(c, r, -1, 470, 300, 1000, P.mid, { wob: 60, slope: 80, fade: mix(P.mid, P.near, 0.6) });
    mid += cliff(c, r, 1, 1130, 260, 1000, P.mid, { wob: 60, slope: 80, fade: mix(P.mid, P.near, 0.6) });
    mid += mist(c, r, 860, 4, 0.8);
    for (const [x, y, h] of [[120, 330, 200], [330, 340, 150], [1380, 290, 220], [1560, 300, 160]]) mid += pine(c, r, x, y, h, mix(P.mid, P.ink, 0.4));
    const deckPts = [[-100, 612], [400, 606], [800, 548], [1200, 606], [1700, 596]];
    ground = polyY(deckPts.map((p) => [p[0], p[1] - 4]));
    const deck = smooth(deckPts.slice(1, 4));
    // đáy hẻm: dòng sông mờ trong sương
    set += '<path d="M470,1000 Q800,960 1130,1000 L1130,1100 L470,1100Z" fill="' + c.lin('gorge', [[0, mix(P.water[0], P.haze, 0.4)], [1, P.water[1]]]) + '" opacity=".9"/>';
    // nhịp cầu: ván, thành lan can, trụ gỗ chéo
    set += '<path d="' + deck + ' L1200,636 Q800,578 400,636Z" fill="' + P.fg + '"/><path d="' + deck + '" stroke="' + mix(P.near, '#ffffff', 0.25) + '" stroke-width="3" fill="none" opacity=".6"/>';
    for (let i = 0; i <= 16; i++) {
      const x = 400 + i * 50, t = (x - 400) / 800, y = 606 - 58 * Math.sin(Math.PI * t);
      set += '<path d="M' + x + ',' + f(y) + ' v-62" stroke="' + P.fg + '" stroke-width="7"/>';
      if (i % 2 === 0) set += '<path d="M' + x + ',' + f(y + 30) + ' L' + (x + 80 * (t < 0.5 ? 1 : -1)) + ',' + f(y + 180) + '" stroke="' + P.fg + '" stroke-width="9" opacity=".85"/>';
    }
    set += '<path d="' + smooth(Array.from({ length: 17 }, (_, i) => [400 + i * 50, 606 - 58 * Math.sin((Math.PI * i) / 16) - 62])) + '" stroke="' + P.fg + '" stroke-width="7" fill="none"/>';
    set += '<path d="' + smooth(Array.from({ length: 17 }, (_, i) => [400 + i * 50, 606 - 58 * Math.sin((Math.PI * i) / 16) - 34])) + '" stroke="' + P.fg + '" stroke-width="3" fill="none"/>';
    for (const x of [400, 1200]) set += '<path d="M' + x + ',606 v-96" stroke="' + P.fg + '" stroke-width="14"/>' + lantern(c, x + (x < 800 ? 24 : -24), 560, 0.8, P.lamp, { still: false });
    fg += pine(c, r, 60, 1040, 560, P.fg, { lean: 0.18 }) + pine(c, r, 1560, 1040, 480, P.fg, { lean: -0.2 }) + rock(c, r, 1380, 1070, 230, 110, P.fg);
    hot = [800, 520];
    return { place, far, mid, set, fg, ground, depth, hot, waterY };
  };
})();
