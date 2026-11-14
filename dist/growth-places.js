'use strict';
// v2.17.0 (Họa Cảnh): nơi chốn có người ở và cõi khác của truyện ký — trấn, làng, miếu, am, đài, ngục, cổng trời, Thần giới, cõi mắt đỏ, đấu trường.
// Mỗi bộ cảnh cùng hợp đồng với growth-sets.js: (c, biến thể) → { place, far, mid, set, fg, ground(x), depth, hot, sky }.
(function () {
  const Z = window.zenScene;
  const K = Z.kit;
  const { W, H, f, mix, between, smooth, blob, glow, ridge, spire, mist, pine, bamboo, rock, grass, roof, house, lantern, lerp, broad, willow, folk, crowd, cracks, hut, polyY } = K;
  const SETS = Z.SETS;
  const rect = (x, y, w, h, fill, extra) => '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + fill + '"' + (extra || '') + '/>';
  // Nhà phố hai tầng: tường gỗ, tầng trên nhô ra có lan can, mái ngói cong, cửa sổ sáng đèn, biển hiệu treo.
  const shophouse = (c, r, x, y, w, h, o) => {
    o = o || {};
    const P = c.P, wall = o.wall || P.mid, lit = o.lit === undefined ? r() > 0.35 : o.lit;
    let s = rect(x - w / 2, y - h, w, h, wall) + rect(x - w / 2 - 8, y - h * 0.56, w + 16, 9, P.fg, ' opacity=".8"');
    for (let k = 0; k < 2; k++) {
      const fy = y - h * (k ? 0.88 : 0.46), n = Math.max(2, Math.round(w / 60));
      for (let i = 0; i < n; i++) {
        const wx = x - w / 2 + (w / n) * (i + 0.5);
        s += rect(wx - 11, fy, 22, h * 0.2, lit ? mix(P.lamp, '#ffffff', 0.12) : mix(wall, P.ink, 0.45), lit ? ' opacity=".92"' : ' opacity=".85"');
        if (lit) s += glow(c, wx, fy + h * 0.1, 46, P.lamp, P.dark ? 0.4 : 0.1);
      }
    }
    s += rect(x - 17, y - h * 0.36, 34, h * 0.36, o.door || mix(wall, P.ink, 0.55));
    s += roof(x, y - h, w * 1.22, h * 0.42, o.roof || P.fg, { up: 16 });
    if (o.sign) s += '<g class="sc-sway" style="transform-origin:' + f(x + w / 2 + 14) + 'px ' + f(y - h * 0.62) + 'px"><path d="M' + f(x + w / 2) + ',' + f(y - h * 0.62) + ' h24 v6" stroke="' + P.ink + '" stroke-width="3" fill="none"/><rect x="' + f(x + w / 2 + 10) + '" y="' + f(y - h * 0.6) + '" width="26" height="46" fill="#c9a3a0" stroke="' + P.ink + '" stroke-width="1.6" opacity=".95"/></g>';
    if (o.lantern) s += lantern(c, x - w / 2 + 14, y - h * 0.5, 0.7, P.lamp, { still: false });
    return '<g>' + s + '</g>';
  };
  // Tháp chuông / lầu: mái chồng nhiều tầng thu nhỏ dần.
  const pagoda = (c, x, y, w, tiers, col, o) => {
    o = o || {};
    let s = '';
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers, ww = w * (1 - t * 0.5), hh = w * 0.34 * (1 - t * 0.25), yy = y - i * hh * 1.18;
      s += rect(x - ww * 0.36, yy - hh, ww * 0.72, hh, mix(col, '#ffffff', 0.04)) + roof(x, yy - hh, ww * 1.1, hh * 0.78, col, { up: 12 });
      if (o.lit) s += rect(x - 8, yy - hh * 0.78, 16, hh * 0.5, o.lit, ' opacity=".9"');
    }
    s += '<path d="M' + x + ',' + f(y - tiers * w * 0.34 * 1.18 - w * 0.08) + ' v-' + f(w * 0.2) + '" stroke="' + col + '" stroke-width="4"/>';
    return '<g>' + s + '</g>';
  };
  const stoneWall = (c, y0, y1, col, o) => {
    o = o || {};
    let s = rect(-40, y0, W + 80, y1 - y0, c.lin('wall' + y0 + (o.id || ''), [[0, mix(col, '#ffffff', 0.08)], [1, mix(col, c.P.ink, 0.5)]]));
    const bh = o.bh || 46, bw = o.bw || 96;
    let d = '';
    for (let j = 0; y0 + j * bh < y1; j++) {
      d += 'M-40,' + (y0 + j * bh) + ' H' + (W + 40) + ' ';
      for (let i = 0; i < W / bw + 1; i++) d += 'M' + (-40 + i * bw + (j % 2) * bw / 2) + ',' + (y0 + j * bh) + ' v' + bh + ' ';
    }
    return s + '<path d="' + d + '" stroke="' + c.P.ink + '" stroke-width="1.6" opacity=".34"/>';
  };
  Object.assign(K, { shophouse, pagoda, stoneWall, rect });

  // ===========================================================================================================================
  // TRẤN THANH KHÊ
  // ===========================================================================================================================
  SETS.town = (c, v) => {
    const P = c.P, r = c.rnd('tw');
    let far = '', mid = '', set = '', fg = '', place = 'Phố Thanh Khê', ground = () => 856, depth = () => 1, hot;
    far += ridge(c, r, { y: 600, amp: 230, fill: P.far, fade: P.haze, id: 'a', n: 30 }) + spire(c, r, 1330, 650, 110, 330, mix(P.far, P.haze, 0.3), { fade: P.haze, strata: 2 }) + mist(c, r, 610, 3, 0.55);
    // mái nhà xa
    let far2 = '';
    for (let i = 0; i < 16; i++) far2 += rect(60 + i * 100 + between(r, -18, 18), 700 - between(r, 20, 60), between(r, 50, 80), 80, mix(P.mid, P.haze, 0.3)) + roof(60 + i * 100 + between(r, -18, 18) + 30, 700 - between(r, 20, 60), 90, 30, mix(P.near, P.haze, 0.25));
    mid += far2 + mist(c, r, 760, 3, 0.5);
    const ground0 = (yTop, col) => '<path d="M-100,1100 L-100,' + yTop + ' L1700,' + (yTop - 6) + ' L1700,1100Z" fill="' + c.lin('rd' + yTop, [[0, col || mix(P.earth, P.haze, 0.2)], [1, mix(P.earth, P.fg, 0.55)]]) + '"/>';
    if (v === 'square') {
      // Chợ hội đèn: dãy sạp mái vải, dây đèn lồng chăng ngang, cầu gỗ nhỏ, đám đông bóng.
      place = 'Chợ Thanh Khê, hội đèn';
      set += ground0(850);
      for (let i = 0; i < 6; i++) set += shophouse(c, r, 120 + i * 290, 800, between(r, 200, 250), between(r, 230, 300), { lit: true, lantern: i % 2 === 0, sign: i % 3 === 0 });
      for (let row = 0; row < 3; row++) {
        const y0 = 360 + row * 70, n = 11;
        set += '<path d="' + smooth([[-60, y0 - 30], [400, y0 + 30], [800, y0 - 6], [1200, y0 + 36], [1660, y0 - 24]]) + '" stroke="' + P.ink + '" stroke-width="2.4" fill="none"/>';
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, x = lerp(-40, 1640, t), y = y0 + 8 + Math.sin(t * 9 + row) * 26;
          const col = ['#ff8a5a', P.lamp, '#ffb3c0', '#ffd27a'][(i + row) % 4];
          set += glow(c, x, y + 26, 58, col, 0.5) + '<ellipse cx="' + f(x) + '" cy="' + f(y + 28) + '" rx="15" ry="20" fill="' + col + '"/>' + rect(x - 8, y + 6, 16, 5, P.ink) + '<path d="M' + f(x) + ',' + f(y + 48) + ' v12" stroke="#b8344a" stroke-width="2"/>';
        }
      }
      let people = '';
      for (let i = 0; i < 26; i++) people += folk(between(r, 20, 1580), 880 + between(r, 0, 130), between(r, 1.3, 2.2), P.fg, { hat: r() > 0.7 });
      fg += '<g>' + people + '</g>' + grass(c, r, 0, W, 1040, 20, 30, P.fg);
      hot = [800, 700];
    } else if (v === 'roofs') {
      // Trên mái ngói nhìn xuống trấn: mái nhà gần chiếm tiền cảnh, các nóc nhà xa dần.
      place = 'Mái ngói trấn Thanh Khê';
      for (let k = 0; k < 4; k++) {
        const y = 640 + k * 56, col = mix(P.near, P.haze, 0.55 - k * 0.14);
        for (let i = 0; i < 6; i++) mid += roof(100 + i * 280 + (k % 2) * 120, y, between(r, 220, 300), 70 - k * 8, col, { up: 18 });
      }
      set += '<path d="M-100,1100 L-100,860 L420,820 L1180,820 L1700,860 L1700,1100Z" fill="' + P.fg + '"/>';
      for (let j = 0; j < 8; j++) for (let i = 0; i < 28; i++) set += '<path d="M' + (-80 + i * 62 + (j % 2) * 31) + ',' + (840 + j * 30) + ' q16,22 32,0" stroke="' + mix(P.fg, '#ffffff', 0.18) + '" stroke-width="3" fill="none" opacity=".7"/>';
      set += '<path d="M-100,840 L420,806 L1180,806 L1700,840" stroke="' + mix(P.fg, '#ffffff', 0.25) + '" stroke-width="14" fill="none"/>';
      ground = () => 820;
      set += shophouse(c, r, 1440, 830, 200, 280, { lit: true });
      fg += pagoda(c, 160, 1100, 220, 3, P.fg);
    } else if (v === 'gate') {
      // Cổng trấn: tường thành, cổng vòm có chòi chuông, đường đất dẫn vào, đuốc hai bên.
      place = 'Cổng trấn Thanh Khê';
      set += ground0(868);
      set += stoneWall(c, 640, 868, mix(P.mid, P.near, 0.4), { id: 'gt', bh: 42, bw: 84 });
      set += '<path d="M610,868 V700 Q800,560 990,700 V868Z" fill="' + c.rad('gt', [[0, P.lamp, P.dark ? 0.7 : 0.2], [1, P.ink, 0.95]], [0.5, 0.8, 0.8]) + '"/>';
      set += rect(560, 540, 480, 130, mix(P.mid, P.near, 0.55)) + roof(800, 540, 640, 200, P.fg, { up: 24 }) + '<path d="M650,660 v-110 M950,660 v-110" stroke="' + P.fg + '" stroke-width="12"/>';
      set += '<g class="sc-sway" style="transform-origin:800px 556px;animation-duration:3.2s"><path d="M800,556 v34" stroke="' + P.ink + '" stroke-width="4"/><path d="M768,640 C768,606 780,590 800,590 C820,590 832,606 832,640 Q800,650 768,640Z" fill="' + mix('#8a6a3a', P.ink, P.dark ? 0.4 : 0.05) + '"/></g>';
      for (const x of [380, 1220]) set += '<path d="M' + x + ',868 v-130" stroke="' + P.fg + '" stroke-width="9"/>' + glow(c, x, 726, 120, '#ffae5a', 0.55) + '<path d="M' + x + ',726 c-12,-16 -4,-30 0,-44 c6,14 14,28 0,44Z" fill="#ffb347" class="sc-flame"/>';
      set += '<path d="M600,1100 Q760,960 800,880 Q840,960 1000,1100Z" fill="' + mix(P.earth, '#ffffff', 0.12) + '" opacity=".7"/>';
      fg += pine(c, r, 70, 1040, 480, P.fg, { lean: 0.14 }) + rock(c, r, 1500, 1060, 200, 100, P.fg);
      hot = [800, 520];
    } else {
      // street (mặc định): dãy nhà phố hai bên đường, đèn lồng, sạp hàng, thùng gánh.
      set += ground0(856);
      for (let i = 0; i < 7; i++) set += shophouse(c, r, 100 + i * 250 + between(r, -10, 10), 810, between(r, 180, 230), between(r, 230, 330), { lit: P.dark ? r() > 0.3 : r() > 0.7, lantern: r() > 0.5, sign: r() > 0.6 });
      set += '<path d="M-100,1100 L-100,980 Q800,930 1700,990 L1700,1100Z" fill="' + mix(P.earth, P.fg, 0.4) + '" opacity=".7"/>';
      for (let i = 0; i < 10; i++) set += '<ellipse cx="' + f(between(r, 0, W)) + '" cy="' + f(between(r, 880, 1020)) + '" rx="' + f(between(r, 20, 60)) + '" ry="5" fill="' + mix(P.earth, '#ffffff', 0.16) + '" opacity=".5"/>';
      fg += rect(60, 940, 160, 130, mix(P.fg, P.earth, 0.2)) + roof(140, 944, 240, 50, P.fg, { up: 12 }) + grass(c, r, 600, 1500, 1050, 14, 26, P.fg);
      hot = [1180, 500];
    }
    return { place, far, mid, set, fg, ground, depth, hot };
  };

  // ===========================================================================================================================
  // LÀNG, ĐÊ, TRẠI QUÂN
  // ===========================================================================================================================
  SETS.village = (c, v) => {
    const P = c.P, r = c.rnd('vg');
    let far = '', mid = '', set = '', fg = '', place = 'Làng ven sông', ground = () => 850, depth = () => 1, hot;
    far += ridge(c, r, { y: 580, amp: 240, fill: P.far, fade: P.haze, id: 'a', n: 30 }) + spire(c, r, 220, 640, 100, 300, mix(P.far, P.haze, 0.3), { fade: P.haze, strata: 2 }) + mist(c, r, 600, 3, 0.55);
    mid += ridge(c, r, { y: 740, amp: 130, fill: P.mid, fade: mix(P.mid, P.haze, 0.5), id: 'b', n: 28 });
    for (let i = 0; i < 7; i++) mid += broad(c, r, between(r, 40, 1560), between(r, 740, 790), between(r, 70, 120), mix(P.mid, P.ink, 0.25));
    const land = (y) => '<path d="M-100,1100 L-100,' + y + ' Q400,' + (y - 24) + ' 900,' + (y - 6) + ' Q1300,' + (y - 20) + ' 1700,' + y + ' L1700,1100Z" fill="' + c.lin('vgl' + y, [[0, mix(P.grass, P.haze, 0.1)], [1, mix(P.grass, P.fg, 0.6)]]) + '"/>';
    if (v === 'fire') {
      // Kho lúa cháy: ngọn lửa lớn bên kho, cột khói đen bốc lên trời, dân làng chạy.
      place = 'Làng Đông, kho lúa cháy';
      set += land(820);
      for (const x of [260, 560, 1480]) set += hut(c, r, x, 830, 150, 80, { lit: true });
      set += rect(900, 690, 300, 140, mix(P.mid, P.near, 0.5)) + roof(1050, 694, 380, 150, mix(P.near, P.fg, 0.5), { up: 20 });
      set += glow(c, 1050, 760, 360, '#ff7a2a', 0.65) + '<path d="M940,840 C920,760 980,730 990,660 C1010,700 1030,680 1040,610 C1070,680 1110,700 1100,770 C1150,740 1170,800 1150,840Z" fill="#ff7a2a" class="sc-flame"/><path d="M990,840 C980,790 1020,780 1040,730 C1060,780 1090,790 1100,840Z" fill="#ffd36a"/>';
      set += '<path d="M1040,640 C1000,520 1100,440 1050,330 C1010,240 1110,150 1060,40" stroke="#1d1a22" stroke-width="78" fill="none" stroke-linecap="round" opacity=".6"/>';
      fg += crowd(r, [[160, 960, 2], [300, 990, 1.8], [1360, 980, 2.1], [1460, 1010, 1.9]], P.fg) + grass(c, r, 0, W, 1040, 30, 40, P.fg) + rock(c, r, 700, 1060, 150, 70, P.fg);
      hot = [1050, 640];
    } else if (v === 'dyke') {
      // Đê sông vỡ: bờ đê đắp đất, một chỗ vỡ nước đục ào ra ruộng.
      place = 'Làng Tây, đê vỡ';
      set += land(850);
      set += '<path d="M-100,830 Q400,780 800,790 L900,830 L1700,810 L1700,1100 L-100,1100Z" fill="' + mix(P.earth, P.near, 0.4) + '"/>';
      set += '<path d="M-100,1100 L-100,900 Q300,880 520,880 L560,1100Z" fill="' + c.lin('flood', [[0, mix(P.water[0], '#8a6a44', 0.5)], [1, mix(P.water[1], '#6a4a2c', 0.5)]]) + '"/>';
      let gush = '';
      for (let i = 0; i < 12; i++) gush += '<path d="M' + f(540 + i * 4) + ',' + f(800 + i * 6) + ' q' + f(120 + i * 30) + ',' + f(60 + i * 10) + ' ' + f(300 + i * 60) + ',' + f(150 + i * 14) + '" stroke="#d8c8a0" stroke-width="' + f(4 + i * 0.4) + '" fill="none" opacity="' + f(0.55 - i * 0.03) + '" class="sc-shimmer" style="animation-delay:' + f(i * 0.2) + 's"/>';
      set += '<path d="M520,800 Q700,840 1000,920 Q1300,1000 1700,1020 L1700,1100 L560,1100Z" fill="' + c.lin('flood2', [[0, mix(P.water[0], '#8a6a44', 0.5)], [1, mix(P.water[1], '#6a4a2c', 0.5)]]) + '" opacity=".92"/>' + gush;
      set += '<path d="M0,830 q14,-20 28,0 M100,826 q14,-20 28,0" stroke="' + P.fg + '" stroke-width="4" fill="none"/>';
      fg += grass(c, r, 0, 400, 1000, 18, 50, P.fg) + rock(c, r, 1500, 1060, 190, 90, P.fg);
    } else {
      // camp: sườn đồi, trại quân bố trận, cờ phướn, lửa trại
      place = 'Chân núi, quân Huyết Nguyệt vây núi';
      set += land(830);
      for (let i = 0; i < 9; i++) {
        const x = 60 + i * 190 + between(r, -20, 20), y = 860 + between(r, 0, 90) * (i % 2 ? 0.4 : 1);
        set += '<path d="M' + (x - 70) + ',' + y + ' L' + x + ',' + (y - 100) + ' L' + (x + 70) + ',' + y + 'Z" fill="' + mix(P.near, '#7a1a2a', P.dark ? 0.3 : 0.15) + '"/><path d="M' + x + ',' + (y - 100) + ' v-50" stroke="' + P.ink + '" stroke-width="3"/><path d="M' + x + ',' + (y - 148) + ' l40,10 l-40,12Z" fill="#8a1a2e" class="sc-wave"/>';
      }
      set += crowd(r, Array.from({ length: 24 }, (_, i) => [40 + i * 66 + between(r, -10, 10), 940 + between(r, 0, 70), between(r, 1.5, 2)]), P.fg, { spear: true });
      for (const x of [420, 1180]) set += glow(c, x, 930, 140, '#ff8a3a', 0.5) + '<path d="M' + x + ',950 c-14,-22 -4,-36 0,-52 c8,18 16,32 0,52Z" fill="#ff9a3a" class="sc-flame"/>';
      fg += pine(c, r, 90, 1040, 460, P.fg, { lean: 0.16 }) + grass(c, r, 0, W, 1040, 30, 40, P.fg);
    }
    return { place, far, mid, set, fg, ground, depth, hot };
  };

  // ===========================================================================================================================
  // MIẾU HOANG
  // ===========================================================================================================================
  SETS.temple = (c, v) => {
    const P = c.P, r = c.rnd('tp');
    let far = '', mid = '', set = '', fg = '';
    far += ridge(c, r, { y: 620, amp: 220, fill: P.far, fade: P.haze, id: 'a', n: 30 }) + mist(c, r, 640, 3, 0.6);
    mid += ridge(c, r, { y: 760, amp: 120, fill: P.mid, fade: mix(P.mid, P.haze, 0.5), id: 'b', n: 26 });
    for (let i = 0; i < 6; i++) mid += pine(c, r, between(r, 60, 1540), between(r, 760, 800), between(r, 90, 160), mix(P.mid, P.ink, 0.35));
    set += '<path d="M-100,1100 L-100,850 Q400,826 900,840 Q1300,830 1700,852 L1700,1100Z" fill="' + c.lin('tpl', [[0, mix(P.earth, P.haze, 0.12)], [1, P.fg]]) + '"/>';
    // miếu: mái nghiêng sụp một bên, cột gãy, tượng thần bên trong ánh lửa
    const tx = 800;
    set += rect(tx - 330, 560, 660, 290, mix(P.mid, P.near, 0.6));
    set += '<path d="M' + (tx - 200) + ',850 V600 Q' + tx + ',500 ' + (tx + 200) + ',600 V850Z" fill="' + c.rad('tin', [[0, P.lamp, P.dark ? 0.55 : 0.12], [1, P.ink, 0.96]], [0.5, 0.85, 0.8]) + '"/>';
    set += '<path d="M' + (tx - 420) + ',580 Q' + (tx - 200) + ',500 ' + (tx - 90) + ',380 L' + (tx + 40) + ',372 Q' + (tx + 190) + ',470 ' + (tx + 360) + ',520 L' + (tx + 440) + ',612 Q' + tx + ',548 ' + (tx - 420) + ',580Z" fill="' + P.fg + '"/>';
    set += '<path d="M' + (tx + 190) + ',470 L' + (tx + 280) + ',560 L' + (tx + 250) + ',600 L' + (tx + 150) + ',520Z" fill="' + mix(P.fg, P.near, 0.4) + '"/>';
    for (const [dx, h] of [[-310, 250], [-110, 270], [110, 270], [310, 160]]) set += '<path d="M' + (tx + dx) + ',850 V' + (850 - h) + '" stroke="' + P.fg + '" stroke-width="22"/>';
    set += '<path d="M' + (tx - 40) + ',810 q-20,-110 4,-170 q30,-40 70,0 q16,60 -8,170Z" fill="' + mix(P.near, P.ink, 0.5) + '" opacity=".85"/>';
    fg += pine(c, r, 80, 1040, 500, P.fg, { lean: 0.18 }) + rock(c, r, 1480, 1060, 210, 110, P.fg) + grass(c, r, 0, W, 1040, 40, 50, P.fg);
    return { place: 'Miếu hoang', far, mid, set, fg, ground: () => 860, depth: () => 1, hot: [tx, 500] };
  };

  // ===========================================================================================================================
  // TRONG NHÀ: AM TÙNG HẠC
  // ===========================================================================================================================
  SETS.interior = (c, v) => {
    const P = c.P, r = c.rnd('in');
    const night = P.dark;
    const wood = mix(P.mid, P.earth, 0.5), woodD = mix(P.near, P.earth, 0.45);
    let sky = rect(-40, -40, W + 80, H + 80, c.lin('wl', [[0, mix(wood, P.ink, night ? 0.5 : 0.12)], [1, mix(woodD, P.ink, night ? 0.7 : 0.25)]]));
    for (let i = 0; i < 24; i++) sky += '<path d="M' + (i * 70) + ',0 V1000" stroke="' + P.ink + '" stroke-width="2" opacity=".22"/>';
    // xà ngang và cột
    sky += rect(-40, 140, W + 80, 40, woodD) + rect(-40, 300, W + 80, 18, woodD, ' opacity=".7"');
    for (const x of [60, 1540]) sky += rect(x - 30, 0, 60, 900, woodD);
    // cửa sổ ra ngoài (ánh trăng / ánh sáng ban ngày)
    const win = (x, y, w, h) => {
      const out = night ? c.lin('win' + x, [[0, '#1c2a52'], [1, '#6a7aa8']]) : c.lin('win' + x, [[0, '#bfd8e6'], [1, '#fbf1d9']]);
      return rect(x - w / 2, y, w, h, out) + (night ? '<circle cx="' + (x + w * 0.16) + '" cy="' + (y + h * 0.3) + '" r="30" fill="#f5f0dc"/>' : '') + '<path d="M' + x + ',' + y + ' v' + h + ' M' + (x - w / 2) + ',' + (y + h * 0.5) + ' h' + w + '" stroke="' + woodD + '" stroke-width="8"/>' + '<rect x="' + (x - w / 2) + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" stroke="' + woodD + '" stroke-width="12"/>' + glow(c, x, y + h * 0.5, 280, night ? '#9fb4e6' : '#fff6d0', night ? 0.25 : 0.4);
    };
    sky += win(430, 330, 240, 280);
    sky += rect(1000, 330, 300, 380, mix(woodD, P.ink, 0.2), ' opacity=".5"');
    // giá treo: hồ lô, áo tơi, đòn gánh trên xà
    sky += '<path d="M1160,180 v70" stroke="' + P.ink + '" stroke-width="3"/><path d="M1160,250 q-30,28 -6,64 q34,18 40,-24 q4,-30 -34,-40Z" fill="' + mix('#b88a44', P.ink, night ? 0.4 : 0.1) + '"/>';
    sky += '<path d="M780,180 L1120,176" stroke="' + mix('#241a14', P.ink, 0.1) + '" stroke-width="9" stroke-linecap="round"/>';
    sky += lantern(c, 760, 380, 1.2, P.lamp, { still: false });
    let set = '<path d="M-100,1100 L-100,880 Q800,860 1700,880 L1700,1100Z" fill="' + c.lin('fl', [[0, mix(woodD, P.ink, 0.2)], [1, mix(P.fg, woodD, 0.3)]]) + '"/>';
    for (let i = 0; i < 12; i++) set += '<path d="M' + (i * 140 - 40) + ',885 L' + (i * 190 - 300) + ',1100" stroke="' + P.ink + '" stroke-width="2" opacity=".3"/>';
    // chiếu và bàn thấp
    set += '<path d="M560,950 H1100 L1160,1010 H500Z" fill="' + mix('#c9b886', P.ink, night ? 0.45 : 0.1) + '" opacity=".9"/>';
    set += rect(1020, 810, 360, 22, mix('#7a5a3a', P.ink, night ? 0.4 : 0.1)) + '<path d="M1050,832 v54 M1350,832 v54" stroke="' + mix('#7a5a3a', P.ink, 0.3) + '" stroke-width="12"/>' + glow(c, 1200, 790, 160, P.lamp, night ? 0.5 : 0.1) + '<path d="M1180,810 q-6,-24 0,-40 q10,20 0,40Z" fill="#ffc86a" class="sc-flame"/>';
    return { place: 'Trong am Tùng Hạc', sky, far: '', mid: '', set, fg: '<path d="M-100,1100 V1000 Q400,1030 800,1020 T1700,1010 V1100Z" fill="' + P.fg + '" opacity=".9"/>', ground: () => 900, depth: () => 1, hot: [1200, 770] };
  };

  // ===========================================================================================================================
  // HUYẾT NGUYỆT ĐÀI VÀ NGỤC ĐÁ
  // ===========================================================================================================================
  const brazier = (c, x, y, s) => glow(c, x, y - 60 * s, 130 * s, '#ff7a3a', 0.6) + '<path d="M' + (x - 26 * s) + ',' + y + ' L' + (x - 34 * s) + ',' + (y - 40 * s) + ' H' + (x + 34 * s) + ' L' + (x + 26 * s) + ',' + y + 'Z" fill="' + c.P.fg + '"/><path d="M' + x + ',' + (y - 40 * s) + ' c-26,-30 -8,-48 0,-84 c10,34 28,52 0,84Z" fill="#ff8a3a" class="sc-flame"/><path d="M' + x + ',' + (y - 40 * s) + ' c-12,-16 -4,-26 0,-44 c6,18 14,26 0,44Z" fill="#ffe08a"/>';
  const torchWall = (c, x, y) => glow(c, x, y - 20, 150, '#ff9a4a', 0.55) + '<path d="M' + x + ',' + (y + 50) + ' V' + (y - 4) + '" stroke="' + c.P.fg + '" stroke-width="8" stroke-linecap="round"/><path d="M' + x + ',' + (y - 4) + ' c-16,-22 -6,-34 0,-58 c8,24 18,34 0,58Z" fill="#ffa040" class="sc-flame"/><path d="M' + x + ',' + (y - 6) + ' c-7,-12 -2,-18 0,-30 c4,12 9,18 0,30Z" fill="#ffe8a0"/>';
  SETS.altar = (c, v) => {
    const P = c.P, r = c.rnd('al');
    if (v === 'cell' || v === 'chamber' || v === 'tunnel' || v === 'dungeon') {
      const rock = mix(P.mid, P.near, 0.5);
      let sky = '', far = '', mid = '', set = '', fg = '', place = 'Ngục đá dưới Huyết Nguyệt đài', ground = () => 880, hot;
      if (v === 'tunnel') {
        place = 'Đường hầm trong ngục';
        sky = rect(-40, -40, W + 80, H + 80, c.lin('tun', [[0, mix(P.earth, P.ink, 0.7)], [1, mix(P.earth, P.ink, 0.45)]]));
        sky += '<ellipse cx="800" cy="520" rx="640" ry="470" fill="' + mix(P.earth, P.ink, 0.88) + '"/><ellipse cx="800" cy="520" rx="130" ry="96" fill="' + c.rad('tl', [[0, '#cfe6ff', 1], [1, '#cfe6ff', 0.0]], [0.5, 0.5, 0.5]) + '"/>';
        for (let i = 0; i < 4; i++) sky += '<path d="M' + (160 + i * 120) + ',1000 L' + (330 + i * 90) + ',470 H' + (1270 - i * 90) + ' L' + (1440 - i * 120) + ',1000" stroke="' + mix(P.earth, '#8a5a30', 0.4) + '" stroke-width="' + (22 - i * 4) + '" fill="none" opacity="' + (0.85 - i * 0.18) + '"/>';
        set = '<path d="M-100,1100 L-100,900 Q800,820 1700,900 L1700,1100Z" fill="' + mix(P.earth, P.ink, 0.55) + '"/>' + torchWall(c, 340, 640) + crowd(r, [[1100, 905, 1.2], [1220, 900, 1.1]], P.fg);
        return { place, sky, far, mid, set, fg, ground: () => 905, depth: () => 1, hot: [340, 560] };
      }
      sky = stoneWall(c, -40, 900, rock, { id: 'dg', bh: 54, bw: 120 });
      for (const x of [260, 800, 1340]) sky += '<path d="M' + (x - 130) + ',900 V470 Q' + x + ',330 ' + (x + 130) + ',470 V900Z" fill="' + mix(rock, P.ink, 0.62) + '"/>';
      set = '<path d="M-100,1100 L-100,892 L1700,892 L1700,1100Z" fill="' + c.lin('dgf', [[0, mix(rock, P.ink, 0.35)], [1, mix(P.fg, rock, 0.25)]]) + '"/>';
      for (let i = 1; i < 6; i++) set += '<path d="M-100,' + (892 + i * i * 6) + ' H1700" stroke="' + P.ink + '" stroke-width="1.6" opacity=".3"/>';
      if (v === 'chamber') {
        place = 'Thạch thất mười một chiếc ghế';
        const chair = Z.PROPS.chair;
        for (let i = 0; i < 10; i++) {
          const t = i / 9, x = lerp(210, 1390, t), y = 760 + Math.sin(t * Math.PI) * -14 + 12;
          set += '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(0.62)">' + chair(c, { a: 1 }) + '</g>';
        }
        set += glow(c, 800, 770, 260, P.lamp, 0.12) + torchWall(c, 80, 560) + torchWall(c, 1520, 560);
        hot = [800, 700];
      } else {
        // cell: song sắt phía trước, cửa sổ nhỏ có trăng đỏ, vách có ba cột vạch
        place = 'Ngục tầng chín';
        sky += '<g transform="translate(1260 280)">' + rect(-60, -60, 120, 140, '#1a0c14') + '<circle cx="14" cy="-10" r="38" fill="' + c.rad('cw', [[0, '#ff9a8a'], [1, '#c4203c']]) + '"/><path d="M-30,-60 v140 M0,-60 v140 M30,-60 v140" stroke="' + P.fg + '" stroke-width="8"/></g>' + glow(c, 1260, 300, 260, '#e0344c', 0.28);
        sky += '<g stroke="' + mix(rock, '#ffffff', 0.4) + '" stroke-width="3" opacity=".8" fill="none">';
        for (let col = 0; col < 3; col++) for (let k = 0; k < (col === 2 ? 14 : col === 1 ? 3 : 2); k++) sky += '<path d="M' + (460 + col * 120 + (k % 5) * 14) + ',' + (520 + Math.floor(k / 5) * 40) + ' v28"/>';
        sky += '</g>' + ['Chưa làm', 'Đang làm', 'Đã xong'].map((t, i) => '<text x="' + (480 + i * 120) + '" y="496" text-anchor="middle" font-size="22" font-weight="700" fill="' + mix(rock, '#ffffff', 0.45) + '" font-family="Georgia,serif" opacity=".85">' + t + '</text>').join('');
        set += torchWall(c, 150, 600) + '<path d="M120,892 q80,-26 180,-6 q-20,22 -90,26Z" fill="' + mix('#b89a5a', P.ink, 0.45) + '"/>';
        hot = [150, 520];
      }
      fg = '<g stroke="' + P.fg + '" stroke-width="14">' + [-20, 150, 1450, 1620].map((x) => '<path d="M' + x + ',-20 V1100"/>').join('') + '</g><path d="M-40,60 H260 M1340,60 H1640" stroke="' + P.fg + '" stroke-width="16"/>' + (v === 'chamber' ? '' : '');
      return { place, sky, far, mid, set, fg, ground, depth: () => 1, hot };
    }
    // terrace: đài cao trên vách núi, bậc đá dài, cột đen cờ đỏ, lư lửa, vầng huyết nguyệt lớn
    let far = '', mid = '', set = '', fg = '';
    far += ridge(c, r, { y: 620, amp: 260, fill: P.far, fade: P.haze, id: 'a', n: 32 }) + spire(c, r, 260, 680, 120, 380, mix(P.far, P.haze, 0.3), { fade: P.haze, strata: 2 }) + spire(c, r, 1380, 680, 110, 340, mix(P.far, P.haze, 0.3), { fade: P.haze, strata: 2 }) + mist(c, r, 640, 4, 0.7, '#c4203c');
    mid += ridge(c, r, { y: 760, amp: 150, fill: P.mid, fade: mix(P.mid, P.haze, 0.5), id: 'b', n: 30 }) + pagoda(c, 160, 780, 170, 4, mix(P.mid, P.ink, 0.25)) + pagoda(c, 1460, 780, 190, 5, mix(P.mid, P.ink, 0.25));
    set += '<path d="M120,660 H1480 L1640,722 H-40Z" fill="' + c.lin('plat', [[0, mix(P.near, P.haze, 0.1)], [1, P.near]]) + '"/>' + rect(-40, 722, W + 80, 60, P.fg);
    for (let i = 0; i < 20; i++) set += '<path d="M' + (i * 90) + ',728 v40" stroke="' + mix(P.fg, '#ffffff', 0.15) + '" stroke-width="3" opacity=".5"/>';
    // bậc thang
    set += '<path d="M600,782 H1000 L1280,1100 H320Z" fill="' + mix(P.near, P.fg, 0.4) + '"/><path d="M700,782 H900 L1000,1100 H600Z" fill="#7a1428" opacity=".85"/>';
    for (let i = 1; i < 9; i++) { const y = 782 + Math.pow(i / 9, 1.3) * 318, k = (y - 782) / 318; set += '<path d="M' + f(lerp(600, 320, k)) + ',' + f(y) + ' H' + f(lerp(1000, 1280, k)) + '" stroke="' + mix(P.fg, '#ffffff', 0.18) + '" stroke-width="' + f(2 + i * 0.5) + '" opacity=".6"/>'; }
    for (const [x, y] of [[190, 700], [1410, 700]]) set += '<path d="M' + (x - 30) + ',' + y + ' V' + (y - 330) + '" stroke="' + P.fg + '" stroke-width="34"/>' + '<path d="M' + (x - 30) + ',' + (y - 290) + ' h50 q22,60 0,150 h-50Z" fill="#7a1428" opacity=".95"/>';
    set += brazier(c, 440, 700, 1.1) + brazier(c, 1160, 700, 1.1);
    fg += '<path d="M-20,1100 V560 M1620,1100 V600" stroke="' + P.fg + '" stroke-width="30"/><path d="M-20,560 h130 l-14,200 l-50,-30 l-66,40Z" fill="#7a1428"/><path d="M1620,600 h-130 l14,190 l50,-30 l66,40Z" fill="#7a1428"/>';
    return { place: 'Huyết Nguyệt đài', far, mid, set, fg, ground: () => 690, depth: () => 1, hot: [440, 620] };
  };

  // ===========================================================================================================================
  // THẦN GIỚI, CÕI MẮT ĐỎ, ĐẤU TRƯỜNG
  // ===========================================================================================================================
  SETS.heaven = (c, v) => {
    const P = c.P, r = c.rnd('hv');
    let far = '', mid = '', set = '', fg = '', place = 'Thần giới';
    const gold = '#e6c36a', cloud = mix('#ffffff', P.haze, 0.3);
    const sea = (y, n, col, op) => { let s = ''; for (let i = 0; i < n; i++) { const yy = y + i * 34 + between(r, -6, 6); s += '<path d="' + smooth(Array.from({ length: 10 }, (_, k) => [-100 + k * 200, yy - between(r, 10, 36)])) + 'L1700,1100 L-100,1100Z" fill="' + mix(col, '#ffffff', i * 0.06) + '" opacity="' + op + '"/>'; } return s; };
    far += sea(560, 5, mix(P.haze, gold, 0.25), 0.55);
    for (const [x, y, w] of [[300, 560, 120], [800, 520, 160], [1300, 580, 110]]) far += '<g opacity=".7"><path d="M' + (x - w) + ',' + y + ' Q' + x + ',' + (y + 60) + ' ' + (x + w) + ',' + y + 'Z" fill="' + mix(P.far, gold, 0.3) + '"/>' + pagoda(c, x, y, w * 0.9, 3, mix(P.far, gold, 0.45)) + '</g>';
    mid += sea(680, 5, cloud, 0.7);
    for (const x of [200, 1400]) mid += pagoda(c, x, 760, 200, 4, mix(gold, P.ink, 0.35)) + '<ellipse cx="' + x + '" cy="780" rx="220" ry="26" fill="' + cloud + '" opacity=".85"/>';
    if (v === 'stairs') {
      place = 'Bậc thềm Thần giới';
      set += '<path d="M560,520 H1040 L1300,1100 H300Z" fill="' + c.lin('hst', [[0, '#fffaf0'], [1, mix('#e8dcc0', P.ink, 0.2)]]) + '"/>';
      for (let i = 1; i < 12; i++) { const k = Math.pow(i / 12, 1.2), y = lerp(520, 1100, k); set += '<path d="M' + f(lerp(560, 300, k)) + ',' + f(y) + ' H' + f(lerp(1040, 1300, k)) + '" stroke="' + mix(gold, P.ink, 0.1) + '" stroke-width="' + f(2 + k * 4) + '" opacity=".6"/>'; }
      set += rect(620, 360, 360, 160, '#fff6dc') + roof(800, 360, 480, 180, mix(gold, P.ink, 0.15), { up: 22 }) + glow(c, 800, 480, 380, '#fff1bd', 0.7);
      for (const x of [510, 1090]) set += rect(x - 14, 380, 28, 160, mix('#fff6dc', P.ink, 0.1));
    } else {
      set += '<path d="M-100,1100 L-100,830 Q400,800 800,812 Q1200,800 1700,830 L1700,1100Z" fill="' + c.lin('hfl', [[0, '#fffaf0'], [1, mix('#e8dcc0', P.ink, 0.18)]]) + '"/>';
      for (let i = 0; i < 10; i++) set += '<path d="M' + (i * 180 - 60) + ',840 L' + (i * 260 - 500) + ',1100" stroke="' + gold + '" stroke-width="2.4" opacity=".45"/>';
      for (const x of [170, 1430]) set += rect(x - 26, 360, 52, 480, mix('#fff6dc', P.ink, 0.1)) + rect(x - 40, 340, 80, 30, gold) + rect(x - 40, 826, 80, 24, gold);
      set += '<path d="M-100,830 Q400,810 800,818 Q1200,810 1700,830" stroke="#fff" stroke-width="4" opacity=".6" fill="none"/>';
    }
    fg += sea(960, 2, '#ffffff', 0.85);
    return { place, far, mid, set, fg, ground: () => 836, depth: () => 1, hot: [800, 420] };
  };
  SETS.void = (c, v) => {
    const P = c.P, r = c.rnd('vd');
    let sky, far = '', mid = '', set = '', fg = '', place = 'Cõi mắt đỏ', ground = () => 850;
    if (v === 'abyss') {
      place = 'Cõi tâm ma';
      sky = rect(-40, -40, W + 80, H + 80, c.lin('ab', [[0, '#05020a'], [0.6, '#190a1e'], [1, '#34102a']])) + glow(c, 800, 560, 760, '#6a1a4a', 0.34) + glow(c, 300, 300, 400, '#3a1a6a', 0.3);
      for (let i = 0; i < 5; i++) sky += '<ellipse cx="800" cy="' + (880 + i * 6) + '" rx="' + (320 + i * 130) + '" ry="' + (28 + i * 10) + '" fill="none" stroke="#e0344c" stroke-width="2" opacity="' + f(0.5 - i * 0.08) + '" class="sc-ring" style="animation-delay:-' + i * 1.2 + 's"/>';
      for (const b of c.shot.b || []) sky += K.bodyArt(c, b);
      set = '<path d="M-100,1100 L-100,900 Q800,860 1700,900 L1700,1100Z" fill="#0a0410"/><path d="M-100,900 Q800,860 1700,900" stroke="#e0344c" stroke-width="3" fill="none" opacity=".6"/>';
      ground = () => 880;
    } else {
      // field: thửa ruộng nứt vô tận dưới con mắt đỏ khổng lồ, đường nứt hội tụ về chân trời
      sky = rect(-40, -40, W + 80, H + 80, c.lin('vf', [[0, '#12040c'], [0.6, '#42101f'], [1, '#8a2a3a']])) + K.bodyArt(c, ['eye', 0.5, 0.26, 190]);
      far += '<path d="M-100,600 Q400,560 800,590 T1700,590 V1100 H-100Z" fill="' + mix(P.haze, P.ink, 0.5) + '"/>' + mist(c, r, 600, 4, 0.7, '#c4203c');
      set += '<path d="M-100,1100 L-100,640 Q800,600 1700,640 L1700,1100Z" fill="' + c.lin('vff', [[0, '#4a1424'], [1, '#14060c']]) + '"/>';
      let d = '';
      for (let i = 0; i < 26; i++) { const x0 = lerp(-1200, 2800, i / 25), j = between(r, -40, 40); d += 'M800,620 L' + f(lerp(800, x0, 0.3) + j) + ',' + f(lerp(620, 1100, 0.2)) + ' L' + f(lerp(800, x0, 0.62)) + ',' + f(lerp(620, 1100, 0.52)) + ' L' + f(x0) + ',1100 '; }
      set += '<path d="' + d + '" stroke="#1a060c" stroke-width="3" fill="none" opacity=".85"/>';
      for (let k = 1; k < 7; k++) set += '<path d="M-100,' + f(620 + Math.pow(k / 7, 1.6) * 480) + ' Q800,' + f(600 + Math.pow(k / 7, 1.6) * 480) + ' 1700,' + f(620 + Math.pow(k / 7, 1.6) * 480) + '" stroke="#1a060c" stroke-width="2" opacity=".5" fill="none"/>';
      ground = () => 860;
    }
    return { place, sky, far, mid, set, fg, ground, depth: () => 1, hot: [800, 600] };
  };
  SETS.arena = (c, v) => {
    const P = c.P, r = c.rnd('ar');
    let far = '', mid = '', set = '', fg = '', place = 'Võ đài kinh thành', ground = () => 850;
    far += ridge(c, r, { y: 600, amp: 200, fill: P.far, fade: P.haze, id: 'a', n: 28 }) + mist(c, r, 620, 3, 0.55);
    if (v === 'field') {
      // trận địa ngoài trời: hai hàng người đối diện nhau, cờ phướn, núi phía sau
      place = 'Chân núi Vân Mộng, thế trận';
      mid += ridge(c, r, { y: 740, amp: 120, fill: P.mid, fade: mix(P.mid, P.haze, 0.5), id: 'b', n: 28 });
      for (let i = 0; i < 6; i++) mid += pine(c, r, between(r, 40, 1560), between(r, 740, 790), between(r, 80, 150), mix(P.mid, P.ink, 0.35));
      set += '<path d="M-100,1100 L-100,830 Q500,806 900,818 Q1300,806 1700,832 L1700,1100Z" fill="' + c.lin('arf', [[0, mix(P.grass, P.haze, 0.1)], [1, mix(P.grass, P.fg, 0.6)]]) + '"/>';
      set += crowd(r, Array.from({ length: 22 }, (_, i) => [30 + i * 30 + between(r, -6, 6), 850 + (i % 4) * 22, 1.5 + (i % 4) * 0.12]), P.fg, { spear: true });
      set += crowd(r, Array.from({ length: 22 }, (_, i) => [900 + i * 32 + between(r, -6, 6), 850 + (i % 4) * 22, 1.5 + (i % 4) * 0.12]), mix(P.fg, '#7a1428', 0.28), { spear: true });
      for (const x of [180, 520, 1080, 1420]) set += '<path d="M' + x + ',850 v-170" stroke="' + P.ink + '" stroke-width="5"/><path d="M' + x + ',680 l62,12 l-8,36 l-54,-10Z" fill="' + (x > 800 ? '#8a1a2e' : '#d9c9a0') + '" class="sc-wave"/>';
      fg += grass(c, r, 0, W, 1040, 40, 44, P.fg) + rock(c, r, 120, 1070, 200, 100, P.fg);
    } else {
      // plaza: sân đá lát, hai tầng khán đài kín người, cờ treo, trống lớn
      mid += '<path d="M-100,720 H1700 V850 H-100Z" fill="' + mix(P.mid, P.near, 0.5) + '"/>';
      for (let i = 0; i < 8; i++) mid += pagoda(c, 100 + i * 220, 720, 130, 2, mix(P.mid, P.ink, 0.2));
      set += '<path d="M-100,1100 L-100,840 L1700,840 L1700,1100Z" fill="' + c.lin('arp', [[0, mix(P.earth, P.haze, 0.18)], [1, mix(P.earth, P.fg, 0.55)]]) + '"/>';
      for (let j = 1; j < 6; j++) set += '<path d="M-100,' + f(840 + j * j * 8) + ' H1700" stroke="' + P.ink + '" stroke-width="1.6" opacity=".25"/>';
      set += crowd(r, Array.from({ length: 34 }, (_, i) => [20 + i * 48 + between(r, -8, 8), 790 + (i % 2) * 10, 1.4]), mix(P.fg, P.mid, 0.2));
      set += '<path d="M120,980 H1480 L1560,1100 H40Z" fill="' + mix(P.earth, P.near, 0.4) + '" opacity=".9"/>';
      for (const x of [150, 700, 1250]) set += '<path d="M' + x + ',0 v120" stroke="' + P.ink + '" stroke-width="4"/><path d="M' + (x - 22) + ',120 h92 l-12,190 l-34,-18 l-34,18Z" fill="#8a1a2e" opacity=".92"/>';
      fg += crowd(r, Array.from({ length: 12 }, (_, i) => [30 + i * 140 + between(r, -20, 20), 1040 + between(r, 0, 40), between(r, 2.4, 3.2)]), P.fg);
    }
    return { place, far, mid, set, fg, ground, depth: () => 1 };
  };
})();
