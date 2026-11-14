'use strict';
// v2.17.0 (Họa Cảnh): bộ dựng tranh minh họa nhiều lớp cho truyện ký. Mỗi trang truyện có MỘT bức tranh riêng theo ngữ cảnh
// (nơi chốn, giờ giấc, khí trời, điều đang xảy ra) thay cho hình hiệp khách lặp lại.
// Cách dựng (kiểu "máy quay nhiều tầng" của phim hoạt họa): tranh gồm nhiều lớp SVG xếp từ xa tới gần
//   trời · núi xa · núi giữa · cảnh chính · sân khấu (người, vật) · tiền cảnh · hiệu ứng (mưa, tuyết, đom đóm…).
// Máy quay có tâm ngắm và độ phóng: lớp càng gần càng trôi nhanh khi quay, nên khi đổi trang tranh "lia" sang nơi khác, có chiều sâu.
// Màu xa nhạt dần theo "sương" (phối cảnh khí quyển) nên núi xa mờ, núi gần đậm như tranh thủy mặc.
// Mọi hình là SVG sinh bằng toán từ một hạt giống cố định (cùng cảnh luôn ra cùng tranh), không ảnh ngoài, không thư viện.
// Giảm chuyển động thì tranh đứng yên, máy quay nhảy thẳng tới khung hình mới.
// API: window.zenScene = { W, H, PAL, SETS, CAST, PROPS, FX, parse, shotFor, mount, show, destroy, html, kit }.
// Các bộ cảnh (SETS), nhân vật (CAST), vật (PROPS) nằm ở growth-sets.js / growth-cast.js, khung hình từng trang ở growth-plates.js.
(function () {
  const W = 1600,
    H = 1000;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // Làm tròn một chữ số thập phân cho đường vẽ gọn.
  const f = (n) => Math.round(n * 10) / 10;
  const hash = (s) => {
    let h = 2166136261;
    for (const ch of String(s)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  // Số ngẫu nhiên có hạt giống (mulberry32): cùng hạt, cùng dãy số.
  const rng = (seed) => {
    let a = hash(seed);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const between = (r, a, b) => a + (b - a) * r();
  const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
  // ---- Màu ----------------------------------------------------------------------------------------------------------------
  const hex = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const toHex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => {
    const x = hex(a), y = hex(b);
    return toHex(x.map((v, i) => v + (y[i] - v) * t));
  };
  // ---- Bảng màu theo giờ và khí trời ----------------------------------------------------------------------------------------
  // sky: [đỉnh, giữa, chân trời]; ink: màu đậm nhất (bóng cây, núi gần); glow: ánh sáng chân trời; lamp: ánh đèn ấm;
  // body: [loại, x, y, bán kính] của mặt trời / trăng; stars: độ dày của sao.
  const PAL = {
    dawn: { sky: ['#8d98c8', '#efb7a8', '#ffe4b6'], ink: '#46395f', glow: '#ffd9a2', lamp: '#ffcf8a', body: ['sun', 0.72, 0.4, 58], stars: 0.1 },
    morning: { sky: ['#a6cce0', '#dbe9ea', '#fbf1d9'], ink: '#3d4b62', glow: '#fff3cf', lamp: '#ffd89a', body: ['sun', 0.76, 0.2, 54], stars: 0 },
    day: { sky: ['#86bfdc', '#cfe5ec', '#f6f3e4'], ink: '#33465c', glow: '#fffbe6', lamp: '#ffe2a8', body: ['sun', 0.5, 0.1, 50], stars: 0 },
    dusk: { sky: ['#474a86', '#c26f8c', '#f7b97b'], ink: '#2a2147', glow: '#ffc98d', lamp: '#ffc070', body: ['sun', 0.24, 0.56, 70], stars: 0.15 },
    night: { sky: ['#0c142e', '#232f5a', '#4c5e8c'], ink: '#0d1226', glow: '#9fb4e6', lamp: '#ffc477', body: ['moon', 0.74, 0.2, 62], stars: 1 },
    blood: { sky: ['#150919', '#4a1228', '#92303f'], ink: '#12060d', glow: '#ff6a78', lamp: '#ff8a6a', body: ['red', 0.7, 0.24, 80], stars: 0.2 },
    eclipse: { sky: ['#040207', '#130918', '#36101f'], ink: '#030105', glow: '#ff3b4f', lamp: '#ff7a5a', body: ['eclipse', 0.5, 0.26, 74], stars: 0.55 },
    storm: { sky: ['#3b4453', '#657181', '#a0aab4'], ink: '#222934', glow: '#c8d2dc', lamp: '#ffd08a', body: null, stars: 0 },
    mist: { sky: ['#cdd7d9', '#e2e8e4', '#f3f0e3'], ink: '#44535a', glow: '#fffbea', lamp: '#ffd89a', body: null, stars: 0 },
    snow: { sky: ['#cbd8e6', '#e8eef4', '#fbfcfd'], ink: '#4a5970', glow: '#ffffff', lamp: '#ffd89a', body: ['sun', 0.7, 0.2, 42], stars: 0 },
    snowy: { sky: ['#0f1934', '#2e4172', '#8ea1c6'], ink: '#0f1730', glow: '#c9d8f5', lamp: '#ffc477', body: ['moon', 0.3, 0.22, 68], stars: 0.9 },
    lamp: { sky: ['#1c1220', '#3a2430', '#6a4a44'], ink: '#140c14', glow: '#ffb86a', lamp: '#ffc477', body: null, stars: 0 },
    deep: { sky: ['#03161f', '#0a3948', '#17686e'], ink: '#020e14', glow: '#7ee0d2', lamp: '#9ff0e0', body: null, stars: 0 },
    holy: { sky: ['#b9c6ea', '#f3e6cc', '#fffaf0'], ink: '#4d3e72', glow: '#fff1bd', lamp: '#fff0b0', body: ['sun', 0.5, 0.3, 84], stars: 0 },
    void: { sky: ['#0d040a', '#340c1d', '#741b2f'], ink: '#080206', glow: '#ff5266', lamp: '#ff8a6a', body: null, stars: 0.3 },
  };
  const TIME_NAMES = {
    dawn: 'rạng đông', morning: 'sáng', day: 'ban ngày', dusk: 'hoàng hôn', night: 'đêm trăng', blood: 'đêm trăng máu', eclipse: 'đêm nguyệt thực',
    storm: 'mưa gió', mist: 'sương mù', snow: 'ngày tuyết', snowy: 'đêm tuyết', lamp: 'ánh đèn', deep: 'đáy biển', holy: 'Thần giới', void: 'cõi mắt đỏ',
  };
  function palette(id) {
    const p = PAL[id] || PAL.day;
    const h = p.sky[2];
    const dark = ['night', 'blood', 'eclipse', 'snowy', 'lamp', 'deep', 'void'].includes(id), cold = ['snow', 'snowy', 'storm', 'mist', 'holy', 'void', 'eclipse', 'blood'].includes(id);
    return Object.assign({ id }, p, {
      haze: h,
      far: mix(h, p.ink, 0.2),
      mid: mix(h, p.ink, 0.42),
      near: mix(h, p.ink, 0.68),
      fg: mix(h, p.ink, 0.93),
      water: [mix(mix(h, p.ink, 0.16), '#5a98a4', cold ? 0 : dark ? 0.1 : 0.3), mix(mix(h, p.ink, 0.6), '#1f5e72', cold ? 0 : dark ? 0.12 : 0.34)],
      // cỏ và đất: pha sắc xanh ô-liu / nâu vào tông mực để cảnh không đơn sắc (ban đêm nhạt hơn, tuyết thì không)
      grass: mix(mix(h, p.ink, 0.5), '#6f9a4e', cold ? 0 : dark ? 0.14 : 0.42),
      earth: mix(mix(h, p.ink, 0.46), '#a8825a', cold ? 0 : dark ? 0.14 : 0.4),
      paper: mix(h, '#ffffff', 0.55),
      dark,
    });
  }
  // ---- Đường cong -------------------------------------------------------------------------------------------------------------
  const pt = (p) => f(p[0]) + ',' + f(p[1]);
  // Đi qua các điểm bằng đường Catmull-Rom đổi sang Bézier. closed: khép kín.
  function smooth(pts, closed) {
    const n = pts.length;
    const at = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
    let d = 'M' + pt(pts[0]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += 'C' + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + pt(p2);
    }
    return d + (closed ? 'Z' : '');
  }
  // Khối tròn có mép lượn sóng (tán lá, bụi cây, mây).
  function blob(r, cx, cy, rx, ry, bumps, flat, soft) {
    bumps = bumps || 6;
    const pts = [];
    for (let i = 0; i < bumps * 2; i++) {
      const a = (i / (bumps * 2)) * Math.PI * 2;
      const k = soft ? (i % 2 ? 0.9 : 1.0 + r() * 0.08) : i % 2 ? 0.8 : 1.02 + r() * 0.14;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (flat && Math.sin(a) > 0 ? 0.5 : 1)]);
    }
    return smooth(pts, true);
  }
  // Nhiễu một chiều mượt: phép cộng nhiều tần số, dùng cho đường núi, sóng, bờ ruộng.
  function noise1(r, octaves) {
    const waves = Array.from({ length: octaves }, (_, k) => ({ a: 1 / Math.pow(1.9, k), f: (2.2 + k * 2.1) * (0.8 + r() * 0.5), p: r() * 6.283 }));
    const total = waves.reduce((s, w) => s + w.a, 0);
    return (t) => waves.reduce((s, w) => s + w.a * Math.sin(t * w.f + w.p), 0) / total;
  }
  // ---- Ngữ cảnh dựng một bức tranh ------------------------------------------------------------------------------------------
  let uid = 0;
  function context(shot) {
    const id = 'sc' + ++uid;
    const defs = [];
    const seen = new Set();
    const c = {
      id,
      shot,
      W,
      H,
      P: palette(shot.t),
      defs,
      rnd: (k) => rng(shot.s + '/' + (shot.v || '') + '/' + shot.t + '/' + k),
      // Chuyển sắc tuyến tính / tròn; trả về url(#…) để dùng làm fill.
      lin(name, stops, v) {
        const gid = id + name;
        if (!seen.has(gid)) {
          seen.add(gid);
          const [x1, y1, x2, y2] = v || [0, 0, 0, 1];
          defs.push('<linearGradient id="' + gid + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('') + '</linearGradient>');
        }
        return 'url(#' + gid + ')';
      },
      rad(name, stops, v) {
        const gid = id + name;
        if (!seen.has(gid)) {
          seen.add(gid);
          const [cx, cy, r, fx, fy] = v || [0.5, 0.5, 0.5];
          defs.push('<radialGradient id="' + gid + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (fx !== undefined ? ' fx="' + fx + '" fy="' + fy + '"' : '') + '>' + stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('') + '</radialGradient>');
        }
        return 'url(#' + gid + ')';
      },
    };
    return c;
  }
  // Quầng sáng mềm dùng khắp nơi (đèn, trăng, lửa): vòng tròn tô chuyển sắc trong suốt dần.
  const glow = (c, x, y, r, col, op) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + c.rad('g' + col.slice(1), [[0, col, 1], [0.35, col, 0.45], [1, col, 0]]) + '"' + (op !== undefined ? ' opacity="' + op + '"' : '') + '/>';

  // ---- Trời, sao, trăng, mặt trời -------------------------------------------------------------------------------------------
  function stars(c, r, density) {
    const n = Math.round(130 * density);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = Math.pow(r(), 1.6) * H * 0.55, big = r() > 0.93;
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + (big ? f(1.8 + r() * 1.2) : f(0.7 + r() * 0.8)) + '" fill="#fff" opacity="' + f(0.35 + r() * 0.6) + '"' + (big ? ' class="sc-twinkle" style="animation-delay:' + f(r() * 4) + 's"' : '') + '/>';
    }
    return '<g>' + s + '</g>';
  }
  // Một thiên thể: sun, moon, red (trăng máu), eclipse, crescent (vành trăng khuyết), eye (mắt đỏ), pale (trăng bạc nhạt).
  function bodyArt(c, b) {
    const [k, bx, by, rr] = b, x = bx * W, y = by * H, R = rr || 60;
    const P = c.P;
    if (k === 'sun') {
      return glow(c, x, y, R * 4.2, P.glow, 0.55) + glow(c, x, y, R * 1.9, '#ffffff', 0.55) + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + R + '" fill="' + mix(P.glow, '#ffffff', 0.55) + '"/>';
    }
    if (k === 'moon' || k === 'pale') {
      const col = k === 'pale' ? '#e9ecf4' : '#f5f0dc';
      return glow(c, x, y, R * 4.4, P.glow, 0.5) + glow(c, x, y, R * 2, '#ffffff', 0.35) + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + R + '" fill="' + col + '"/>' +
        '<g fill="#b9b49c" opacity=".28"><circle cx="' + f(x - R * 0.32) + '" cy="' + f(y - R * 0.18) + '" r="' + f(R * 0.22) + '"/><circle cx="' + f(x + R * 0.28) + '" cy="' + f(y + R * 0.3) + '" r="' + f(R * 0.3) + '"/><circle cx="' + f(x + R * 0.12) + '" cy="' + f(y - R * 0.4) + '" r="' + f(R * 0.13) + '"/></g>';
    }
    if (k === 'red') {
      const g = c.rad('red', [[0, '#ffb9a2'], [0.45, '#e5405a'], [1, '#8a1228']], [0.38, 0.34, 0.75]);
      return glow(c, x, y, R * 4.8, '#e0344c', 0.5) + glow(c, x, y, R * 2.2, '#ff7a6a', 0.3) + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + R + '" fill="' + g + '"/>' +
        '<g fill="#6e0f20" opacity=".22"><circle cx="' + f(x - R * 0.3) + '" cy="' + f(y + R * 0.12) + '" r="' + f(R * 0.2) + '"/><circle cx="' + f(x + R * 0.3) + '" cy="' + f(y - R * 0.2) + '" r="' + f(R * 0.26) + '"/></g>';
    }
    if (k === 'eclipse') {
      const g = c.rad('ecl', [[0.68, '#ff5a3c', 0], [0.82, '#ff3b4f', 0.9], [0.9, '#ff9a5a', 0.7], [1, '#ff3b4f', 0]], [0.5, 0.5, 0.5]);
      return glow(c, x, y, R * 3.6, '#c4162e', 0.45) + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(R * 1.45) + '" fill="' + g + '"/><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + R + '" fill="#050206"/>';
    }
    if (k === 'crescent') {
      const id = c.id + 'cr' + Math.round(x);
      return glow(c, x, y, R * 4, '#ff3b4f', 0.4) + '<mask id="' + id + '"><rect x="' + f(x - R * 2) + '" y="' + f(y - R * 2) + '" width="' + R * 4 + '" height="' + R * 4 + '" fill="#fff"/><circle cx="' + f(x + R * 0.5) + '" cy="' + f(y - R * 0.12) + '" r="' + f(R * 0.92) + '" fill="#000"/></mask>' +
        '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + R + '" fill="' + c.rad('crf', [[0, '#ff9a86'], [0.6, '#e5405a'], [1, '#8a1228']], [0.3, 0.4, 0.8]) + '" mask="url(#' + id + ')"/>';
    }
    if (k === 'eye') {
      const g = c.rad('eye', [[0, '#ffd0b8'], [0.4, '#f0495c'], [1, '#7c0f22']], [0.5, 0.5, 0.6]);
      return glow(c, x, y, R * 5, '#e0344c', 0.55) + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + R + '" fill="' + g + '"/>' +
        '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(R * 0.2) + '" ry="' + f(R * 0.86) + '" fill="#1a050a"/>' +
        '<g stroke="#8a1228" stroke-width="2.2" fill="none" opacity=".6"><path d="M' + f(x - R) + ',' + f(y) + ' q' + f(R * 0.3) + ',-' + f(R * 0.2) + ' ' + f(R * 0.5) + ',-' + f(R * 0.05) + '"/><path d="M' + f(x + R) + ',' + f(y + 4) + ' q-' + f(R * 0.3) + ',' + f(R * 0.2) + ' -' + f(R * 0.5) + ',' + f(R * 0.06) + '"/></g>';
    }
    return '';
  }
  function skyLayer(c, o) {
    const r = c.rnd('sky'), P = c.P, shot = c.shot;
    let s = '<rect x="-40" y="-40" width="' + (W + 80) + '" height="' + (H + 80) + '" fill="' + c.lin('sky', [[0, P.sky[0]], [0.55, P.sky[1]], [1, P.sky[2]]]) + '"/>';
    if (P.stars) s += stars(c, r, P.stars);
    const bodies = shot.b || (P.body ? [P.body] : []);
    for (const b of bodies) s += bodyArt(c, b);
    // vài dải mây mỏng kéo ngang trời
    if (!o || o.clouds !== false) {
      const col = mix(P.sky[1], P.dark ? P.ink : '#ffffff', P.dark ? 0.25 : 0.5);
      const n = o && o.clouds ? o.clouds : 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) s += cloudBand(c, r, between(r, 40, 520), col, between(r, 0.25, 0.5), between(r, 0.7, 1.3));
    }
    return s;
  }
  // Dải mây mỏng: vài khối tròn dẹt chồng nhau, trôi chậm.
  function cloudBand(c, r, y, col, op, k) {
    const x = between(r, 100, W - 100);
    let g = '';
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) g += '<ellipse cx="' + f(x + (i - n / 2) * 90 * k + between(r, -20, 20)) + '" cy="' + f(y + between(r, -8, 8)) + '" rx="' + f(between(r, 70, 150) * k) + '" ry="' + f(between(r, 10, 22) * k) + '"/>';
    return '<g fill="' + col + '" opacity="' + f(op) + '" class="sc-drift" style="animation-duration:' + f(between(r, 70, 130)) + 's;animation-delay:-' + f(r() * 60) + 's">' + g + '</g>';
  }
  // ---- Núi, sương ------------------------------------------------------------------------------------------------------------
  // Đường núi lượn: y là nền, amp là độ cao, ghép nhiễu nhiều tần số; fade: màu chân núi tan vào sương.
  function ridge(c, r, o) {
    const n = o.n || 46, x0 = -120, x1 = W + 120, f1 = noise1(r, 4), f2 = noise1(r, 2);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(x0, x1, t);
      let h = f1(t * (o.freq || 1)) * 0.6 + f2(t * 1.7 + 3) * 0.4;
      if (o.peak !== undefined) h += Math.max(0, 1 - Math.abs(t - o.peak) * (o.peakW || 4)) * 0.9;
      pts.push([x, o.y - (h * 0.5 + 0.5) * o.amp]);
    }
    const d = smooth(pts);
    const fill = c.lin('r' + (o.id || Math.round(o.y)), [[0, o.fill], [1, o.fade || o.fill]]);
    let s = '<path d="' + d + 'L' + (x1 + 10) + ',' + (H + 60) + 'L' + (x0 - 10) + ',' + (H + 60) + 'Z" fill="' + fill + '"' + (o.op ? ' opacity="' + o.op + '"' : '') + '/>';
    if (o.rim) s += '<path d="' + d + '" fill="none" stroke="' + o.rim + '" stroke-width="' + (o.rimW || 2) + '" opacity="' + (o.rimOp || 0.5) + '"/>';
    return s;
  }
  // Núi đá dựng đứng kiểu sơn thủy (đỉnh tròn, sườn lượn, có vân đá).
  function spire(c, r, x, base, w, h, fill, o) {
    o = o || {};
    const lean = (o.lean || 0) * w;
    const top = [x + lean, base - h];
    const pts = [
      [x - w, base + 20], [x - w * 0.82, base - h * 0.28], [x - w * 0.62 + lean * 0.3, base - h * 0.56], [x - w * 0.38 + lean * 0.7, base - h * 0.86],
      [top[0] - w * 0.14, top[1] + h * 0.03], [top[0], top[1]], [top[0] + w * 0.16, top[1] + h * 0.04],
      [x + w * 0.4 + lean * 0.7, base - h * 0.8], [x + w * 0.66 + lean * 0.3, base - h * 0.5], [x + w * 0.86, base - h * 0.22], [x + w, base + 20],
    ];
    const d = smooth(pts);
    let s = '<path d="' + d + 'Z" fill="' + c.lin('sp' + Math.round(x) + Math.round(base), [[0, mix(fill, '#ffffff', o.light === undefined ? 0.1 : o.light)], [1, o.fade || fill]]) + '"/>';
    // vân đá: mấy nét ngang mờ và một mảng tối ở sườn phải
    s += '<path d="' + smooth([pts[5], pts[7], pts[8], pts[9], pts[10], [x + w * 0.2, base + 20], [x + w * 0.1, base - h * 0.4]], true) + '" fill="' + mix(fill, o.shade || '#000000', 0.2) + '" opacity=".42"/>';
    const strata = o.strata === undefined ? 4 : o.strata;
    for (let i = 0; i < strata; i++) {
      const yy = base - h * (0.18 + 0.17 * i + r() * 0.05), ww = w * (0.8 - 0.14 * i) * (0.7 + r() * 0.25);
      s += '<path d="M' + f(x - ww + lean * 0.4) + ',' + f(yy) + ' q' + f(ww * 0.5) + ',-' + f(8 + r() * 6) + ' ' + f(ww * 1.1) + ',-' + f(2 + r() * 6) + '" fill="none" stroke="' + mix(fill, '#ffffff', 0.35) + '" stroke-width="2" opacity=".35" stroke-linecap="round"/>';
    }
    return s;
  }
  // Dải sương: vài vệt mờ hình bầu dục tan dần ra mép.
  function mist(c, r, y, n, op, col, spread) {
    col = col || c.P.haze;
    let s = '';
    const g = c.rad('mist' + col.slice(1), [[0, col, 0.95], [0.55, col, 0.4], [1, col, 0]]);
    for (let i = 0; i < n; i++) s += '<ellipse cx="' + f(between(r, -100, W + 100)) + '" cy="' + f(y + between(r, -(spread || 30), spread || 30)) + '" rx="' + f(between(r, 260, 520)) + '" ry="' + f(between(r, 26, 54)) + '" fill="' + g + '" opacity="' + f(op * between(r, 0.6, 1)) + '"/>';
    return '<g class="sc-drift sc-drift-slow" style="animation-delay:-' + f(r() * 40) + 's">' + s + '</g>';
  }
  // ---- Cây cỏ -----------------------------------------------------------------------------------------------------------------
  function pine(c, r, x, y, h, col, o) {
    o = o || {};
    const lean = (o.lean !== undefined ? o.lean : between(r, -0.18, 0.18)) * h;
    let s = '<path d="M' + f(x) + ',' + f(y + 6) + ' C' + f(x - h * 0.05) + ',' + f(y - h * 0.3) + ' ' + f(x + lean * 0.8) + ',' + f(y - h * 0.55) + ' ' + f(x + lean) + ',' + f(y - h) + '" fill="none" stroke="' + col + '" stroke-width="' + f(Math.max(3, h * 0.045)) + '" stroke-linecap="round"/>';
    const tiers = o.tiers || 5;
    for (let i = 0; i < tiers; i++) {
      const t = (i + 0.6) / (tiers + 0.2), side = i % 2 ? 1 : -1;
      const cx = x + lean * t + side * h * 0.1 * (1 - t * 0.5), cy = y - h * (0.28 + 0.72 * t);
      const rx = h * (0.24 - 0.14 * t) * between(r, 0.9, 1.15), ry = rx * 0.34;
      s += '<path d="' + blob(r, cx, cy, rx, ry, 6, true) + '" fill="' + col + '"/>';
      s += '<path d="M' + f(x + lean * t) + ',' + f(cy + 2) + ' L' + f(cx) + ',' + f(cy) + '" stroke="' + col + '" stroke-width="' + f(Math.max(2, h * 0.02)) + '" stroke-linecap="round"/>';
    }
    return '<g>' + s + '</g>';
  }
  function bamboo(c, r, x, y, h, col, light) {
    let s = '';
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const bx = x + i * between(r, 10, 20) - n * 8, hh = h * between(r, 0.75, 1.1), sway = between(r, -18, 18);
      s += '<path d="M' + f(bx) + ',' + f(y) + ' Q' + f(bx + sway * 0.3) + ',' + f(y - hh * 0.5) + ' ' + f(bx + sway) + ',' + f(y - hh) + '" fill="none" stroke="' + col + '" stroke-width="' + f(5 + r() * 2) + '" stroke-linecap="round"/>';
      for (let k = 1; k < 5; k++) {
        const t = k / 5;
        s += '<path d="M' + f(bx + sway * t * t - 4) + ',' + f(y - hh * t) + ' l8,0" stroke="' + (light || mix(col, '#ffffff', 0.4)) + '" stroke-width="1.6" opacity=".7"/>';
      }
      for (let k = 0; k < 6; k++) {
        const a = -2.6 + k * 0.5 + between(r, -0.15, 0.15), len = between(r, 36, 62);
        const ex = bx + sway + Math.cos(a) * len, ey = y - hh + 10 + Math.sin(a) * len * 0.8 + 20;
        s += '<path d="M' + f(bx + sway) + ',' + f(y - hh + 8) + ' Q' + f((bx + sway + ex) / 2) + ',' + f(ey - 18) + ' ' + f(ex) + ',' + f(ey) + ' Q' + f((bx + sway + ex) / 2) + ',' + f(ey - 8) + ' ' + f(bx + sway) + ',' + f(y - hh + 8) + 'Z" fill="' + col + '"/>';
      }
    }
    return '<g>' + s + '</g>';
  }
  function rock(c, r, x, y, w, h, col, hi) {
    const pts = [[x - w, y], [x - w * 0.8, y - h * 0.55], [x - w * 0.35, y - h * 0.95], [x + w * 0.1, y - h], [x + w * 0.6, y - h * 0.62], [x + w, y]];
    return '<path d="' + smooth(pts) + 'Z" fill="' + col + '"/>' + (hi ? '<path d="' + smooth([pts[1], pts[2], pts[3], [x - w * 0.1, y - h * 0.6], [x - w * 0.6, y - h * 0.4]], true) + '" fill="' + hi + '" opacity=".35"/>' : '');
  }
  function grass(c, r, x0, x1, y, n, h, col) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = between(r, x0, x1), hh = h * between(r, 0.5, 1.2), sw = between(r, -10, 10);
      s += 'M' + f(x) + ',' + f(y) + ' q' + f(sw * 0.2) + ',-' + f(hh * 0.6) + ' ' + f(sw) + ',-' + f(hh) + ' ';
    }
    return '<path d="' + s + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linecap="round"/>';
  }
  // ---- Nhà cửa ----------------------------------------------------------------------------------------------------------------
  // Mái cong kiểu Á Đông: x là tâm, y là chân mái, w rộng, h cao.
  function roof(x, y, w, h, col, o) {
    o = o || {};
    const up = o.up === undefined ? 14 : o.up;
    return '<path d="M' + f(x - w / 2 - up) + ',' + f(y + 2) + ' Q' + f(x - w * 0.32) + ',' + f(y - 2) + ' ' + f(x - w * 0.2) + ',' + f(y - h * 0.62) + ' L' + f(x - w * 0.07) + ',' + f(y - h) + ' L' + f(x + w * 0.07) + ',' + f(y - h) + ' L' + f(x + w * 0.2) + ',' + f(y - h * 0.62) + ' Q' + f(x + w * 0.32) + ',' + f(y - 2) + ' ' + f(x + w / 2 + up) + ',' + f(y + 2) + ' Q' + f(x) + ',' + f(y + h * 0.16) + ' ' + f(x - w / 2 - up) + ',' + f(y + 2) + 'Z" fill="' + col + '"/>';
  }
  // Ngôi nhà: tường, mái, cửa; lit: có đèn trong nhà.
  function house(c, r, x, y, w, h, o) {
    const P = c.P;
    const wall = o.wall || P.mid, rf = o.roof || P.near;
    let s = '<rect x="' + f(x - w / 2) + '" y="' + f(y - h) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + wall + '"/>';
    s += roof(x, y - h, w * 1.18, h * 0.62, rf);
    const lit = o.lit === undefined ? r() > 0.5 : o.lit;
    const dw = w * 0.2, dh = h * 0.55;
    s += '<rect x="' + f(x - dw / 2) + '" y="' + f(y - dh) + '" width="' + f(dw) + '" height="' + f(dh) + '" fill="' + (lit ? P.lamp : mix(wall, P.ink, 0.5)) + '"' + (lit ? ' opacity=".92"' : '') + '/>';
    if (lit) s += glow(c, x, y - dh * 0.5, w * 0.7, P.lamp, 0.35);
    for (const sx of [-0.3, 0.3]) s += '<rect x="' + f(x + w * sx - 7) + '" y="' + f(y - h * 0.7) + '" width="14" height="' + f(h * 0.22) + '" fill="' + (lit ? mix(P.lamp, '#fff', 0.25) : mix(wall, P.ink, 0.35)) + '" opacity="' + (lit ? 0.9 : 0.8) + '"/>';
    return '<g>' + s + '</g>';
  }
  function lantern(c, x, y, s, col, o) {
    o = o || {};
    const P = c.P, lamp = col || P.lamp;
    return '<g class="' + (o.still ? '' : 'sc-sway') + '" style="transform-origin:' + f(x) + 'px ' + f(y - 40 * s) + 'px">' +
      '<path d="M' + f(x) + ',' + f(y - 60 * s) + ' L' + f(x) + ',' + f(y - 36 * s) + '" stroke="' + P.ink + '" stroke-width="2"/>' +
      glow(c, x, y, 70 * s, lamp, 0.55) +
      '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(17 * s) + '" ry="' + f(22 * s) + '" fill="' + lamp + '"/>' +
      '<rect x="' + f(x - 11 * s) + '" y="' + f(y - 24 * s) + '" width="' + f(22 * s) + '" height="' + f(5 * s) + '" fill="' + P.ink + '"/><rect x="' + f(x - 9 * s) + '" y="' + f(y + 19 * s) + '" width="' + f(18 * s) + '" height="' + f(4 * s) + '" fill="' + P.ink + '"/>' +
      '<path d="M' + f(x) + ',' + f(y + 23 * s) + ' l0,' + f(14 * s) + '" stroke="' + mix(lamp, '#b8344a', 0.5) + '" stroke-width="2.4"/>' +
      '</g>';
  }
  // ---- Mặt nước -----------------------------------------------------------------------------------------------------------------
  // y: đường chân nước. reflect: danh sách chuỗi SVG phía trên cần soi bóng (lật dọc quanh y).
  function water(c, r, y, o) {
    o = o || {};
    const P = c.P;
    let s = '<rect x="-40" y="' + f(y) + '" width="' + (W + 80) + '" height="' + f(H - y + 60) + '" fill="' + c.lin('water' + Math.round(y), [[0, P.water[0]], [1, P.water[1]]]) + '"/>';
    if (o.reflect) s += '<g opacity="' + (o.reflectOp || 0.4) + '"><g transform="translate(0,' + f(y * 2) + ') scale(1,-1)">' + o.reflect + '</g><rect x="-40" y="' + f(y) + '" width="' + (W + 80) + '" height="' + f(H - y + 60) + '" fill="' + c.lin('wfade' + Math.round(y), [[0, P.water[0], 0], [0.9, P.water[1], 0.85]]) + '"/></g>';
    // vệt sáng của trăng / mặt trời dưới nước
    const b = (c.shot.b || (P.body ? [P.body] : []))[0];
    if (b && !o.noGlint) {
      const bx = b[1] * W, col = b[0] === 'red' ? '#ff6a78' : b[0] === 'sun' ? '#ffe9b8' : '#f3efe0';
      for (let i = 0; i < 14; i++) {
        const yy = y + 10 + i * ((H - y - 30) / 14), ww = (24 + i * 8) * between(r, 0.6, 1.2);
        s += '<rect x="' + f(bx - ww / 2 + between(r, -14, 14)) + '" y="' + f(yy) + '" width="' + f(ww) + '" height="' + f(3 + i * 0.25) + '" rx="2" fill="' + col + '" opacity="' + f(0.55 - i * 0.03) + '" class="sc-shimmer" style="animation-delay:' + f(r() * 3) + 's"/>';
      }
    }
    for (let i = 0; i < 16; i++) {
      const x = r() * W, yy = y + 14 + Math.pow(r(), 0.8) * (H - y - 30), ww = 30 + (yy - y) * 0.28 * r();
      s += '<path d="M' + f(x - ww) + ',' + f(yy) + ' q' + f(ww) + ',-' + f(3 + (yy - y) * 0.02) + ' ' + f(ww * 2) + ',0" fill="none" stroke="' + mix(P.water[0], '#ffffff', 0.5) + '" stroke-width="1.6" opacity=".4" stroke-linecap="round"/>';
    }
    return s;
  }
  // ---- Khung hình của một trang -------------------------------------------------------------------------------------------------
  // Mỗi trang truyện có một dòng mô tả, các mục cách nhau bằng dấu cách (xem growth-plates.js):
  //   bộ[/biến thể]       nơi chốn (SETS); bỏ trống thì giữ như trang trước
  //   dawn|night|…         giờ và khí trời (PAL); bỏ trống thì giữ như trang trước
  //   +rain +fireflies     hiệu ứng (FX); có ít nhất một thì thay danh sách cũ; "-" để xóa hết
  //   ~red@.7,.24,80       thiên thể: loại@x,y,bán kính (bỏ mặc định của giờ); "~-" để không vẽ
  //   @.5,.6,1.4           máy quay: tâm x, y (0–1) và độ phóng (1 = toàn cảnh)
  //   su:talk@.42*1.1<     người: ai:thế@x[,y][*cỡ][<: quay mặt trái]
  //   ladle@.5,.66*1.2^20! vật: tên@x[,y][*cỡ][^độ xoay][?số][!: vẽ trước mặt người | _: gắn vào cảnh, đi cùng bàn, bệ… khi máy quay đổi]
  //   "chú thích"          mô tả bằng chữ cho người dùng đọc màn hình
  const num = (s) => Number(s);
  function parse(line, prev) {
    const out = { s: prev?.s, v: prev?.v, t: prev?.t, fx: prev?.fx || [], b: prev?.b || null, c: [0.5, 0.55, 1], f: [], p: [], alt: '' };
    const quoted = line.match(/"([^"]*)"/);
    if (quoted) {
      out.alt = quoted[1];
      line = line.replace(quoted[0], ' ');
    }
    let fxSet = false, bodies = null;
    for (const tok of line.split(/\s+/).filter(Boolean)) {
      if (tok === '-') {
        out.fx = [];
        fxSet = true;
      } else if (tok[0] === '+') {
        if (!fxSet) out.fx = [];
        fxSet = true;
        out.fx.push(tok.slice(1));
      } else if (tok[0] === '@') {
        const [x, y, z] = tok.slice(1).split(',').map(num);
        out.c = [x, y === undefined ? 0.55 : y, z || 1];
      } else if (tok[0] === '~') {
        if (tok === '~-') bodies = [];
        else {
          const m = tok.slice(1).match(/^([a-z]+)@([\d.]+),([\d.]+),([\d.]+)$/);
          if (!m) throw new Error('thiên thể sai: ' + tok);
          (bodies = bodies || []).push([m[1], num(m[2]), num(m[3]), num(m[4])]);
        }
      } else if (/^[a-z0-9]+:[a-z0-9]+@/.test(tok)) {
        const m = tok.match(/^([a-z0-9]+):([a-z0-9]+)@([\d.]+)(?:,([\d.]+))?(?:\*([\d.]+))?(<)?$/);
        if (!m) throw new Error('người sai: ' + tok);
        out.f.push({ who: m[1], pose: m[2], x: num(m[3]), y: m[4] === undefined ? null : num(m[4]), s: m[5] === undefined ? 1 : num(m[5]), flip: !!m[6] });
      } else if (/^[a-z0-9]+@/.test(tok)) {
        const m = tok.match(/^([a-z0-9]+)@([\d.]+),([\d.]+)(?:\*([\d.]+))?(?:\^(-?[\d.]+))?(?:\?([\d.]+))?([!_])?$/);
        if (!m) throw new Error('vật sai: ' + tok);
        out.p.push({ id: m[1], x: num(m[2]), y: num(m[3]), s: m[4] === undefined ? 1 : num(m[4]), r: m[5] === undefined ? 0 : num(m[5]), a: m[6] === undefined ? undefined : num(m[6]), front: m[7] === '!', on: m[7] === '_' });
      } else if (PAL[tok]) out.t = tok;
      else {
        const [s, v] = tok.split('/');
        if (!window.zenScene.SETS[s]) throw new Error('mục lạ: ' + tok);
        out.s = s;
        out.v = v || '';
      }
    }
    if (bodies) out.b = bodies.length ? bodies : [];
    else if (prev && prev.s !== out.s) out.b = null;
    if (!out.s || !out.t) throw new Error('thiếu nơi chốn hoặc giờ: ' + line);
    return out;
  }
  const keyOf = (shot) => [shot.s, shot.v, shot.t, shot.fx.join(','), shot.b ? shot.b.map((b) => b.join(':')).join('|') : ''].join('/');
  // Tranh của trang thứ i trong mục id (chương: 't<cấp>', kỳ ngộ: 'm:<mã>', chiến ký: 'g:<mã>'). Có bản vẽ riêng thì dùng,
  // không có thì dựng từ ngữ cảnh (derive trong growth-plates.js) để không bao giờ phải vẽ lại hình hiệp khách lặp.
  const parsed = new Map();
  function shotFor(id, i, entry) {
    const P = window.zenPlates;
    id = typeof id === 'number' ? 't' + id : String(id);
    let list = parsed.get(id);
    if (!list) {
      const lines = P?.LINES?.[id];
      list = [];
      if (lines) lines.reduce((prev, line, k) => ((list[k] = parse(line, prev)), list[k]), null);
      parsed.set(id, list);
    }
    if (list[i]) return list[i];
    return P?.derive ? P.derive(id, i, entry, list[i - 1] || list[list.length - 1] || null) : null;
  }
  // ---- Dựng một bức tranh ----------------------------------------------------------------------------------------------------
  const LAYERS = [['sky', 0.06, 0.0], ['far', 0.16, 0.14], ['mid', 0.32, 0.3], ['set', 0.55, 0.58], ['stage', 0.85, 1], ['fg', 1.05, 1.2], ['fx', 0.9, 0.9]];
  const SVG = (inner, cls) => '<svg class="sc-svg' + (cls ? ' ' + cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + inner + '</svg>';
  const FIG_H = 190;
  function subjects(c, shot, info) {
    const Z = window.zenScene;
    const ground = info.ground || (() => H * 0.82);
    const at = (x, y) => [x * W, (y === null || y === undefined ? ground(x) / H : y) * H];
    let behind = '', front = '', onset = '';
    for (const p of shot.p) {
      const draw = Z.PROPS[p.id];
      if (!draw) throw new Error('vật lạ: ' + p.id);
      const xy = [p.x * W, p.y * H];
      const g = '<g class="sc-subj" transform="translate(' + f(xy[0]) + ' ' + f(xy[1]) + ') rotate(' + p.r + ') scale(' + p.s + ')">' + draw(c, { s: p.s, a: p.a }) + '</g>';
      if (p.on) onset += g;
      else if (p.front) front += g;
      else behind += g;
    }
    let people = '';
    for (const q of shot.f) {
      const xy = at(q.x, q.y);
      const depth = info.depth ? info.depth(xy[1]) : 1;
      const sc = (FIG_H / 100) * q.s * depth;
      people += '<g class="sc-subj" transform="translate(' + f(xy[0]) + ' ' + f(xy[1]) + ') scale(' + f(q.flip ? -sc : sc) + ' ' + f(sc) + ')">' + Z.CAST.draw(c, q.who, q.pose) + '</g>';
    }
    return { stage: behind + people + front, set: onset };
  }
  const FX_LAYER = { rain: 'fx', snow: 'fx', ash: 'fx', petals: 'fx', leaves: 'fx', embers: 'fx', fireflies: 'set', bubbles: 'fx', lightning: 'fx', rays: 'fx', dust: 'fx', steam: 'set', redmist: 'fx', spiral: 'sky', redthread: 'set', ripple: 'set', sparks: 'fx', birds: 'sky', drift: 'fx' };
  function build(shot) {
    const Z = window.zenScene;
    const set = Z.SETS[shot.s];
    if (!set) throw new Error('bộ cảnh lạ: ' + shot.s);
    const c = context(shot);
    const info = set(c, shot.v || '', shot);
    const layers = { sky: info.sky || skyLayer(c, info.skyOpt), far: info.far || '', mid: info.mid || '', set: info.set || '', fg: info.fg || '', fx: '' };
    for (const name of shot.fx) {
      const fx = Z.FX[name];
      if (!fx) throw new Error('hiệu ứng lạ: ' + name);
      const lay = FX_LAYER[name] || 'fx';
      layers[lay] += fx(c, c.rnd('fx-' + name), info);
    }
    const sub = subjects(c, shot, info);
    layers.set += '<g class="sc-onset">' + sub.set + '</g>';
    const stage = sub.stage;
    const defs = c.defs.join('');
    let html = '';
    for (const [id] of LAYERS) {
      const body = id === 'stage' ? stage : layers[id];
      html += '<div class="sc-l sc-l-' + id + '" data-l="' + id + '"><div class="sc-d">' + SVG((id === 'sky' ? '<defs>' + defs + '</defs>' : '') + body, 'sc-svg-' + id) + '</div></div>';
    }
    const el = document.createElement('div');
    el.className = 'sc-scene';
    el.dataset.key = keyOf(shot);
    el.innerHTML = html + '<div class="sc-grade" aria-hidden="true"></div>';
    el.style.setProperty('--sc-ink', c.P.ink);
    return { el, c, info };
  }
  // Đổi riêng sân khấu (người, vật) khi vẫn ở cùng một cảnh: máy quay lia, người mới hiện dần.
  function swapStage(st, shot) {
    const c = st.c;
    const layer = st.el.querySelector('.sc-l-stage .sc-d');
    const n0 = c.defs.length;
    const sub = subjects(c, shot, st.info);
    // Người và vật mới có thể cần chuyển sắc chưa từng khai báo; <defs> nằm ở lớp trời nên bổ sung vào đó.
    if (c.defs.length > n0) st.el.querySelector('.sc-l-sky defs')?.insertAdjacentHTML('beforeend', c.defs.slice(n0).join(''));
    layer.innerHTML = SVG(sub.stage, 'sc-svg-stage');
    const on = st.el.querySelector('.sc-l-set .sc-onset');
    if (on) on.innerHTML = sub.set;
    const setD = st.el.querySelector('.sc-l-set .sc-d');
    for (const d of [layer, setD]) {
      if (!d) continue;
      d.classList.remove('is-swap');
      void d.offsetWidth;
      d.classList.add('is-swap');
    }
  }
  // ---- Máy quay -------------------------------------------------------------------------------------------------------------------
  const BASE = 1.06;
  function camFor(cam, cw, ch) {
    const [fx, fy, z] = cam;
    const k = Math.max(cw / W, ch / H);
    const F = [(cw - W * k) / 2 + fx * W * k, (ch - H * k) / 2 + fy * H * k];
    const out = {};
    for (const [id, ws, wt] of LAYERS) {
      const s = BASE * (1 + (z - 1) * (0.35 + 0.65 * ws));
      const mid = [cw / 2 * (1 - s), ch / 2 * (1 - s)], aim = [cw / 2 - s * F[0], ch / 2 - s * F[1]];
      const tx = clamp(lerp(mid[0], aim[0], wt), cw * (1 - s), 0), ty = clamp(lerp(mid[1], aim[1], wt), ch * (1 - s), 0);
      out[id] = 'translate3d(' + f(tx) + 'px,' + f(ty) + 'px,0) scale(' + f(s * 1000) / 1000 + ')';
    }
    return out;
  }
  const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function aim(st, cam, instant) {
    const r = st.root.getBoundingClientRect();
    if (!r.width) return;
    st.cam = cam;
    const tf = camFor(cam, r.width, r.height);
    const els = st.el.querySelectorAll('.sc-l');
    for (const l of els) {
      if (instant) l.style.transition = 'none';
      l.style.transform = tf[l.dataset.l];
    }
    if (instant) {
      void st.el.offsetWidth;
      for (const l of els) l.style.transition = '';
    }
    st.root.dataset.cam = cam.join(',');
  }
  // ---- Gắn vào trang ----------------------------------------------------------------------------------------------------------------
  // host: phần tử chứa tranh (gắn một lần, đổi trang chỉ gọi show). Trả về trạng thái để thử nghiệm đọc.
  function mount(host, shot, opt) {
    let st = host._sc;
    if (!st) {
      const root = document.createElement('div');
      root.className = 'sc';
      root.setAttribute('role', 'img');
      root.innerHTML = '<div class="sc-chip" aria-hidden="true"></div>';
      host.append(root);
      st = host._sc = { host, root, el: null, c: null, info: null, key: '', cam: null, drop: null };
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => st.cam && aim(st, st.cam, true));
        ro.observe(root);
        st.ro = ro;
      }
    }
    show(host, shot, opt);
    return st;
  }
  function label(st, shot, info) {
    const z = window.zenScene;
    const place = info.place || '';
    const when = z.TIME_NAMES[shot.t] || '';
    st.root.querySelector('.sc-chip').textContent = place + (when ? ' · ' + when : '');
    st.root.setAttribute('aria-label', 'Tranh minh họa: ' + (shot.alt || place + ', ' + when + (shot.f.length ? '; ' + shot.f.map((q) => z.CAST.name(q.who)).join(', ') : '')));
  }
  function show(host, shot, opt) {
    const st = host._sc;
    if (!st) return mount(host, shot, opt);
    const key = keyOf(shot);
    const instant = reduced() || (opt && opt.instant);
    st.root.dataset.set = shot.s;
    st.root.dataset.t = shot.t;
    st.root.dataset.key = key;
    st.root.dataset.fx = shot.fx.join(',');
    st.root.dataset.who = shot.f.map((q) => q.who).join(',');
    st.root.dataset.props = shot.p.map((q) => q.id).join(',');
    st.shot = shot;
    if (st.el && st.key === key) {
      swapStage(st, shot);
      aim(st, shot.c, instant);
      label(st, shot, st.info);
      return st;
    }
    const nb = build(shot);
    const old = st.el;
    st.el = nb.el;
    st.c = nb.c;
    st.info = nb.info;
    st.key = key;
    st.root.insertBefore(nb.el, st.root.querySelector('.sc-chip'));
    // Cảnh mới vào từ máy quay hơi lùi rồi tiến dần tới khung hình.
    aim(st, instant ? shot.c : [shot.c[0], shot.c[1], Math.max(1, shot.c[2] - 0.18)], true);
    if (!instant) {
      nb.el.classList.add('is-new');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (st.el !== nb.el) return;
        nb.el.classList.remove('is-new');
        aim(st, shot.c, false);
      }));
    } else aim(st, shot.c, true);
    if (old) {
      old.classList.add('is-old');
      const gone = () => old.remove();
      if (instant) gone();
      else setTimeout(gone, 1100);
    }
    label(st, shot, nb.info);
    return st;
  }
  function destroy(host) {
    const st = host._sc;
    if (!st) return;
    st.ro?.disconnect();
    st.root.remove();
    host._sc = null;
  }
  const kit = { W, H, f, clamp, lerp, hash, rng, between, pick, hex, toHex, mix, smooth, blob, noise1, glow, palette, skyLayer, stars, bodyArt, cloudBand, ridge, spire, mist, pine, bamboo, rock, grass, roof, house, lantern, water, context };
  window.zenScene = { W, H, PAL, TIME_NAMES, SETS: {}, CAST: {}, PROPS: {}, FX: {}, kit, parse, shotFor, keyOf, mount, show, destroy, build, camFor, FIG_H };
})();
