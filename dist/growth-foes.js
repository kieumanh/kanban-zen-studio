'use strict';
// v2.8.0 (Huyết Nguyệt Lộ): tranh động phe ác của truyện "Hằng Nguyệt và Huyết Nguyệt": Huyết Nguyệt Giáo chủ và Thập Nguyệt Sứ.
// Cùng khổ và phong cách chibi với hiệp khách (growth-art.js, khung 200 × 232), vẽ bằng SVG, không dùng ảnh ngoài, mọi tạo hình
// là sáng tác riêng. Mỗi nhân vật có một "tà công" chuyển động riêng (hoạt họa trong growth.css, lớp gr-fo-*); giảm chuyển động
// thì đứng yên.
//   giao  Lệ Vô Khuyết: áo trắng viền son, tóc bạc, mặt nạ trăng khuyết; sau lưng trăng máu và xoáy Thôn Nguyệt Quyết hút hạt sáng vào.
//   mien  Miên Hồ: mặt nạ hồ ly, quạt tím phe phẩy, khói Mê Hồn Hương cuộn lên.
//   dien  Thiên Diện: mũ hai chóp, ba chiếc mặt nạ thay nhau hiện, đèn lồng bay quanh.
//   loi   Lôi Tốc: khăn buộc trán, song đao bắt chéo, tia chớp lóe và bóng ảnh lướt theo.
//   khuc  Khúc U: tóc che một mắt, sáo xương ngang môi, vòng âm thanh lan ra, nốt nhạc bay.
//   bach  Bách Tý: đầu trọc búi tó, giáp đồng, bánh xe chín món binh khí xoay sau lưng.
//   ngoc  Ngọc Vô Hà: giáp lưu ly nhiều mặt cắt, ánh sáng lướt qua, kim băng lơ lửng.
//   kho   Khô Vinh: lão gầy lưng còng, gậy cành khô, lá úa rơi, viên đan đỏ nhấp nháy trong tay.
//   kinh  Ảnh Song: mặt nửa sáng nửa tối, gương đồng lớn có bóng người chập chờn.
//   suong Lãnh Tịch: tóc trắng cài trâm băng, tinh thể băng bay vòng quanh, sương phủ dưới chân.
//   vong  Vô Vọng: thân khổng lồ, vầng nhật thực sau lưng, xích đen đung đưa, vũng Hắc Thủy gợn sóng.
(function () {
  const INK = '#231a2b';
  const SHADOW = '<ellipse cx="100" cy="216" rx="58" ry="7" fill="#1b1424" opacity=".18"/>';
  // Thân áo dài: a = màu áo, b = màu vạt trong, t = viền.
  const robe = (a, b, t, w = 44, hem = 204) =>
    '<path d="M70,114 Q100,106 130,114 L' + (100 + w) + ',' + hem + ' Q100,' + (hem + 10) + ' ' + (100 - w) + ',' + hem + 'Z" fill="' + a + '"/>' +
    '<path d="M' + (100 - w) + ',' + hem + ' Q100,' + (hem + 10) + ' ' + (100 + w) + ',' + hem + '" stroke="' + t + '" stroke-width="2.6" fill="none"/>' +
    '<path d="M86,112 L100,136 L114,112" stroke="' + b + '" stroke-width="8" fill="none" stroke-linejoin="round"/>' +
    '<path d="M116,113 L92,152" stroke="' + t + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="70" y="148" width="60" height="10" rx="3" fill="' + b + '"/>';
  // Tay áo: vai (x, y), xoay deg; hold = đồ cầm ở cổ tay (tọa độ trong nhóm tay, cổ tay ở (0, len + 4)).
  const arm = (x, y, deg, len, sleeve, cuff, skin, hold = '', cls = '') =>
    '<g transform="translate(' + x + ' ' + y + ') rotate(' + deg + ')"><g' + (cls ? ' class="' + cls + '"' : '') + '>' + hold +
    '<path d="M-8,-3 L8,-3 L15,' + (len - 4) + ' Q0,' + (len + 5) + ' -15,' + (len - 4) + 'Z" fill="' + sleeve + '"/>' +
    '<path d="M-15,' + (len - 4) + ' Q0,' + (len + 5) + ' 15,' + (len - 4) + '" stroke="' + cuff + '" stroke-width="3" fill="none"/>' +
    '<circle cx="0" cy="' + (len + 4) + '" r="6.4" fill="' + skin + '"/></g></g>';
  const headBase = (skin) => '<ellipse cx="100" cy="82" rx="38" ry="35" fill="' + skin + '"/>';
  // Mắt: sly (híp cười), fierce (xếch, mày chau), cold (mảnh, lạnh), shut (nhắm).
  const EYES = {
    sly: '<path d="M77,88 q8,-7 16,0 M107,88 q8,-7 16,0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M76,74 L92,78 M124,74 L108,78" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
    fierce: '<path d="M73,70 L93,79 M127,70 L107,79" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/><path d="M78,86 Q85,80 93,86 Q85,92 78,86Z M107,86 Q115,80 122,86 Q115,92 107,86Z" fill="' + INK + '"/><circle cx="87" cy="85" r="1.5" fill="#fff"/><circle cx="117" cy="85" r="1.5" fill="#fff"/>',
    cold: '<path d="M77,87 L93,85 M107,85 L123,87" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M76,75 L92,76 M124,75 L108,76" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>',
    shut: '<path d="M77,86 q8,5 16,0 M107,86 q8,5 16,0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  };
  const smirk = '<path d="M92,103 Q101,108 110,101" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  const flat = '<path d="M93,104 L107,104" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>';
  const wrap = (id, label, inner) =>
    '<svg class="gr-foe" data-foe="' + id + '" viewBox="0 0 200 232" role="img" aria-label="' + label + '">' + inner + '</svg>';

  const DRAW = {
    // Huyết Nguyệt Giáo chủ Lệ Vô Khuyết.
    giao() {
      const skin = '#f4e4dc';
      const motes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2, x = (100 + Math.cos(a) * 84).toFixed(1), y = (104 + Math.sin(a) * 84).toFixed(1);
        return '<circle class="gr-fo-sink gr-fo-d' + i + '" cx="' + x + '" cy="' + y + '" r="3" fill="#ffb3bd" style="--dx:' + (100 - x).toFixed(1) + 'px;--dy:' + (104 - y).toFixed(1) + 'px"/>';
      }).join('');
      return (
        '<circle cx="100" cy="100" r="74" fill="#c8243c" opacity=".16"/><circle class="gr-fo-pulse" cx="100" cy="100" r="62" fill="none" stroke="#d8344c" stroke-width="3" opacity=".7"/>' +
        '<g class="gr-fo-vortex"><path d="M100,40 C150,44 166,96 140,124" stroke="#b3263b" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/><path d="M160,112 C150,160 98,172 74,148" stroke="#b3263b" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/><path d="M48,128 C34,84 66,46 104,52" stroke="#b3263b" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/></g>' +
        motes + SHADOW +
        '<g class="gr-fo-sway"><path class="gr-fo-hair" d="M64,70 C52,110 54,160 66,190 L80,186 C72,150 74,110 80,82Z M136,70 C148,110 146,160 134,190 L120,186 C128,150 126,110 120,82Z" fill="#e8e4ef"/>' +
        robe('#f6f3f0', '#2a1d2c', '#b3263b') +
        '<path d="M100,150 L100,212" stroke="#b3263b" stroke-width="2"/>' +
        arm(78, 122, 18, 34, '#f6f3f0', '#b3263b', skin) +
        arm(124, 122, -150, 32, '#f6f3f0', '#b3263b', skin, '<circle class="gr-fo-orb" cx="0" cy="44" r="11" fill="#e0485e" opacity=".85"/><circle cx="0" cy="44" r="5" fill="#ffd0d6"/>') +
        '<g class="gr-fo-head">' + headBase(skin) +
        '<path d="M62,74 C64,40 136,40 138,74 C128,58 112,52 100,52 C88,52 72,58 62,74Z" fill="#e8e4ef"/>' +
        '<path d="M92,44 L100,30 L108,44Z" fill="#c9c3d6" stroke="#b3263b" stroke-width="1.6"/>' +
        '<path d="M66,80 C70,62 92,56 112,62 C96,66 88,80 90,96 C82,96 72,92 66,80Z" fill="#d9dbe3" stroke="#a7a9b6" stroke-width="1.4"/>' +
        '<path d="M76,80 L88,77" stroke="#d8344c" stroke-width="3.2" stroke-linecap="round" class="gr-fo-glow"/>' +
        '<path d="M108,77 L124,74" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M108,86 Q116,82 123,86" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        smirk + '</g></g>'
      );
    },
    // Thụy Nguyệt Sứ Miên Hồ.
    mien() {
      const skin = '#ffe3cf';
      const smoke = [0, 1, 2].map((i) => '<path class="gr-fo-smoke gr-fo-d' + i * 2 + '" d="M' + (142 + i * 10) + ',150 c-10,-14 10,-22 0,-36 c-10,-14 10,-22 0,-36" stroke="#b79be0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>').join('');
      return (
        smoke + SHADOW +
        '<g class="gr-fo-sway"><path d="M66,72 C56,112 62,150 70,176 L84,170 C78,140 78,110 82,84Z M134,72 C144,112 138,150 130,176 L116,170 C122,140 122,110 118,84Z" fill="#1d1822"/>' +
        robe('#8e6bbf', '#e8dbff', '#e0c3ff') +
        arm(78, 122, 20, 34, '#8e6bbf', '#e0c3ff', skin) +
        arm(124, 122, -130, 32, '#8e6bbf', '#e0c3ff', skin, '<g transform="translate(0 38)"><g class="gr-fo-fan"><path d="M0,0 L-22,24 A32,32 0 0 0 22,24Z" fill="#c9b0f0" stroke="#5b3f8a" stroke-width="1.4"/><path d="M0,0 L-11,29 M0,0 L0,32 M0,0 L11,29" stroke="#5b3f8a" stroke-width=".9" opacity=".6"/></g></g>') +
        '<g class="gr-fo-head">' + headBase(skin) +
        '<path d="M62,70 C66,40 134,40 138,70 C124,56 76,56 62,70Z" fill="#1d1822"/>' +
        '<path d="M70,60 L66,30 L88,50Z M130,60 L134,30 L112,50Z" fill="#fff8f2" stroke="#c23a2e" stroke-width="1.6"/>' +
        '<path d="M66,66 C76,54 124,54 134,66 L130,96 C118,104 82,104 70,96Z" fill="#fff8f2" stroke="#d9cfc3" stroke-width="1.2"/>' +
        '<path d="M74,74 L90,82 M126,74 L110,82" stroke="#c23a2e" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M77,88 q8,-6 16,0 M107,88 q8,-6 16,0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M95,100 L100,104 L105,100" stroke="#c23a2e" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
        '<g class="gr-fo-zzz" fill="none" stroke="#8e6bbf" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M40,60 h10 l-10,10 h10"/><path d="M28,40 h7 l-7,7 h7"/></g></g>'
      );
    },
    // Huyễn Nguyệt Sứ Thiên Diện.
    dien() {
      const skin = '#ffe3cf';
      const lantern = (x, y, i) => '<g transform="translate(' + x + ' ' + y + ')"><g class="gr-fo-bob gr-fo-d' + i + '"><path d="M0,-14 L0,-6" stroke="#5a3b2c" stroke-width="1.6"/><rect x="-9" y="-6" width="18" height="22" rx="8" fill="#e8892c"/><path d="M-9,5 H9" stroke="#b35f12" stroke-width="1.2"/><rect x="-5" y="15" width="10" height="3" fill="#b35f12"/><circle cx="0" cy="5" r="4" fill="#ffd27a" class="gr-fo-glow"/></g></g>';
      const mask = (i, mouth) => '<g class="gr-fo-mask gr-fo-m' + i + '"><path d="M68,66 C78,54 122,54 132,66 L128,98 C116,108 84,108 72,98Z" fill="' + ['#fff', '#f3d36b', '#e8e8f2'][i] + '" stroke="#5a3b2c" stroke-width="1.4"/>' +
        '<path d="M78,82 q7,-6 14,0 M108,82 q7,-6 14,0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' + mouth + '</g>';
      return (
        lantern(34, 70, 0) + lantern(168, 56, 2) + lantern(160, 150, 4) + SHADOW +
        '<g class="gr-fo-sway">' + robe('#d0892c', '#2a1d2c', '#f3d36b') +
        '<path d="M80,170 l8,-10 l8,10 l-8,10Z M104,170 l8,-10 l8,10 l-8,10Z" fill="#2a1d2c" opacity=".35"/>' +
        arm(78, 122, 24, 34, '#d0892c', '#f3d36b', skin) + arm(124, 122, -40, 34, '#d0892c', '#f3d36b', skin) +
        '<g class="gr-fo-head">' + headBase(skin) +
        '<path d="M64,64 C70,40 96,38 100,54 C104,38 130,40 136,64Z" fill="#2a1d2c"/><path d="M64,62 L48,34 L84,50Z" fill="#e8892c"/><path d="M136,62 L152,34 L116,50Z" fill="#2a1d2c"/><circle cx="48" cy="34" r="5" fill="#f3d36b"/><circle cx="152" cy="34" r="5" fill="#f3d36b"/>' +
        mask(0, '<path d="M88,94 Q100,104 112,94" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>') +
        mask(1, '<path d="M88,100 Q100,90 112,100" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>') +
        mask(2, '<circle cx="100" cy="97" r="4" fill="' + INK + '"/>') + '</g></g>'
      );
    },
    // Tật Nguyệt Sứ Lôi Tốc.
    loi() {
      const skin = '#ffe3cf';
      const saber = '<g><path d="M0,40 C6,62 4,84 -6,100 C-2,82 -2,62 -4,42Z" fill="#dfe8f2" stroke="#7d93ab" stroke-width="1"/><rect x="-7" y="36" width="14" height="4" rx="2" fill="#1f3f73"/></g>';
      const body = (op, cls) =>
        '<g' + (cls ? ' class="' + cls + '"' : '') + ' opacity="' + op + '">' + robe('#3b7dd8', '#12243f', '#9fd0ff', 40, 184) +
        '<path d="M86,182 L62,206 M114,182 L140,206" stroke="#12243f" stroke-width="14" stroke-linecap="round"/>' +
        arm(78, 122, 120, 30, '#3b7dd8', '#9fd0ff', skin, saber) + arm(124, 122, -120, 30, '#3b7dd8', '#9fd0ff', skin, saber) +
        '<g class="gr-fo-head">' + headBase(skin) + '<path d="M62,70 L70,40 L82,56 L92,34 L102,54 L114,34 L120,56 L134,42 L138,70 C124,58 76,58 62,70Z" fill="#1d1822"/>' +
        '<rect x="62" y="62" width="76" height="9" rx="3" fill="#1f3f73"/><path class="gr-fo-tail" d="M136,66 C152,62 160,70 172,64 M136,68 C150,72 158,82 170,80" stroke="#1f3f73" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        EYES.fierce + '<path d="M92,102 L108,102" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/></g></g>';
      return (
        '<g class="gr-fo-bolt"><path d="M30,30 L46,62 L36,64 L54,100" stroke="#9fd0ff" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M168,40 L154,70 L164,72 L148,108" stroke="#9fd0ff" stroke-width="4" fill="none" stroke-linejoin="round"/></g>' +
        SHADOW + '<g class="gr-fo-ghost" transform="translate(-22 4)">' + body(0.22) + '</g>' + body(1, 'gr-fo-dash')
      );
    },
    // Âm Nguyệt Sứ Khúc U.
    khuc() {
      const skin = '#f2ece8';
      const rings = [0, 1, 2].map((i) => '<circle class="gr-fo-ring gr-fo-d' + i * 2 + '" cx="146" cy="102" r="14" fill="none" stroke="#4f8a83" stroke-width="2.4"/>').join('');
      const notes = [0, 1].map((i) => '<g transform="translate(' + (160 + i * 14) + ' ' + (80 - i * 18) + ')"><g class="gr-fo-note gr-fo-d' + (i * 3 + 1) + '"><ellipse cx="0" cy="10" rx="5" ry="3.6" fill="#2e5e58"/><path d="M4,10 V-6 l8,3" stroke="#2e5e58" stroke-width="2" fill="none"/></g></g>').join('');
      return (
        rings + notes + SHADOW +
        '<g class="gr-fo-sway">' + robe('#4f8a83', '#1d2e2c', '#a7d3cc') +
        '<path d="M56,204 l8,-10 l8,10 l8,-10 l8,10 l8,-10 l8,10 l8,-10 l8,10 l8,-10 l8,10 l8,-10" stroke="#1d2e2c" stroke-width="2" fill="none"/>' +
        arm(78, 122, -70, 30, '#4f8a83', '#a7d3cc', skin) + arm(124, 122, -100, 30, '#4f8a83', '#a7d3cc', skin) +
        '<g class="gr-fo-head">' + headBase(skin) +
        '<path d="M60,90 C54,46 146,40 140,86 C134,64 116,56 100,58 C90,74 80,96 70,120 C64,110 60,100 60,90Z" fill="#14181c"/>' +
        '<path d="M107,88 q8,-5 16,0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M109,76 L124,72" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
        '<g transform="translate(70 104)"><rect x="0" y="-3" width="84" height="6" rx="3" fill="#efe8dc" stroke="#b8ab95" stroke-width="1"/><circle cx="58" cy="0" r="1.4" fill="#8f826d"/><circle cx="68" cy="0" r="1.4" fill="#8f826d"/><circle cx="78" cy="0" r="1.4" fill="#8f826d"/></g></g></g>'
      );
    },
    // Thiên Thủ Nguyệt Sứ Bách Tý.
    bach() {
      const skin = '#f0c9a8';
      const W = [
        '<path d="M0,-58 L0,-26" stroke="#c9d3dc" stroke-width="4"/><path d="M-6,-26 H6" stroke="#5a3b2c" stroke-width="4"/>',
        '<path d="M0,-62 L0,-24" stroke="#5a3b2c" stroke-width="3"/><path d="M-6,-62 L0,-74 L6,-62Z" fill="#c9d3dc"/>',
        '<path d="M0,-60 L0,-26" stroke="#5a3b2c" stroke-width="3"/><path d="M0,-60 C14,-62 16,-46 2,-44Z" fill="#c9d3dc"/>',
        '<path d="M0,-56 L0,-26" stroke="#5a3b2c" stroke-width="3"/><rect x="-9" y="-66" width="18" height="12" rx="2" fill="#8d8898"/>',
        '<circle cx="0" cy="-48" r="10" fill="none" stroke="#c9d3dc" stroke-width="3"/><circle cx="0" cy="-48" r="3" fill="#c9d3dc"/>',
        '<path d="M0,-58 L0,-30" stroke="#c9d3dc" stroke-width="3"/><path d="M-5,-30 H5" stroke="#5a3b2c" stroke-width="3"/><path d="M0,-58 l-3,-6 l3,-4 l3,4Z" fill="#c9d3dc"/>',
      ];
      const wheel = W.map((w, i) => '<g transform="rotate(' + i * 60 + ')">' + w + '</g>').join('');
      return (
        '<g transform="translate(100 108)"><circle r="66" fill="none" stroke="#9a5b2e" stroke-width="2" stroke-dasharray="4 6" opacity=".6"/><g class="gr-fo-wheel"><g transform="scale(1.32)">' + wheel + '</g></g></g>' + SHADOW +
        '<g class="gr-fo-sway">' + robe('#9a5b2e', '#3a2414', '#d7a35f', 46) +
        '<path d="M76,118 h48 v22 h-48Z" fill="#b98a4c" opacity=".55"/><path d="M76,129 h48" stroke="#5a3b2c" stroke-width="1.4"/>' +
        arm(74, 124, 60, 30, '#9a5b2e', '#d7a35f', skin) + arm(126, 124, -60, 30, '#9a5b2e', '#d7a35f', skin) +
        arm(76, 128, 20, 32, '#874f27', '#d7a35f', skin) + arm(124, 128, -20, 32, '#874f27', '#d7a35f', skin) +
        '<g class="gr-fo-head">' + headBase(skin) + '<circle cx="100" cy="44" r="9" fill="#1d1822"/><path d="M96,50 h8" stroke="#c23a2e" stroke-width="3"/>' +
        '<path d="M70,72 L92,76 M130,72 L108,76" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' + EYES.fierce.replace(/stroke-width="3.6"/, 'stroke-width="0"') +
        '<path d="M88,100 Q100,96 112,100" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M84,106 C92,116 108,116 116,106" stroke="#1d1822" stroke-width="5" fill="none" stroke-linecap="round"/></g></g>'
      );
    },
    // Lưu Ly Nguyệt Sứ Ngọc Vô Hà.
    ngoc() {
      const skin = '#ffe8da';
      const needles = [0, 1, 2, 3].map((i) => '<path class="gr-fo-bob gr-fo-d' + i + '" d="M' + (30 + i * 6) + ',' + (60 + i * 30) + ' l18,-6" stroke="#bfeaf3" stroke-width="2.2" stroke-linecap="round"/>').join('');
      const glints = [[70, 140], [128, 128], [104, 182], [86, 118]].map(([x, y], i) => '<path class="gr-fo-glint gr-fo-d' + i * 2 + '" d="M' + x + ',' + (y - 7) + ' L' + (x + 2) + ',' + (y - 2) + ' L' + (x + 7) + ',' + y + ' L' + (x + 2) + ',' + (y + 2) + ' L' + x + ',' + (y + 7) + ' L' + (x - 2) + ',' + (y + 2) + ' L' + (x - 7) + ',' + y + ' L' + (x - 2) + ',' + (y - 2) + 'Z" fill="#ffffff"/>').join('');
      return (
        needles + SHADOW +
        '<g class="gr-fo-sway">' + robe('#5aa6b8', '#e9f7fa', '#ffffff') +
        '<path d="M70,116 L86,112 L100,136 L114,112 L130,116 L136,158 L100,170 L64,158Z" fill="#bfeaf3" opacity=".85" stroke="#ffffff" stroke-width="1.6"/>' +
        '<path d="M70,116 L100,170 L130,116 M64,158 L100,136 L136,158" stroke="#ffffff" stroke-width="1.2" opacity=".8" fill="none"/>' +
        '<path d="M60,170 L100,182 L140,170 L144,200 L100,212 L56,200Z" fill="#9fdbe8" opacity=".7" stroke="#ffffff" stroke-width="1.2"/>' +
        arm(76, 122, 26, 34, '#9fdbe8', '#ffffff', skin) + arm(124, 122, -26, 34, '#9fdbe8', '#ffffff', skin) +
        '<g class="gr-fo-shine"><rect x="40" y="100" width="14" height="120" fill="#ffffff" opacity=".35" transform="skewX(-20)"/></g>' +
        glints +
        '<g class="gr-fo-head">' + headBase(skin) + '<path d="M62,74 C62,44 138,44 138,74 C126,58 74,58 62,74Z" fill="#1d1822"/><circle cx="100" cy="42" r="13" fill="#1d1822"/><path d="M84,40 L118,36" stroke="#5fae8f" stroke-width="3.4" stroke-linecap="round"/>' +
        EYES.cold + '<path d="M92,102 Q100,98 108,102" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></g>'
      );
    },
    // Khô Nguyệt Sứ Khô Vinh.
    kho() {
      const skin = '#e6d6b8';
      const leaves = [0, 1, 2, 3].map((i) => '<path class="gr-fo-leaf gr-fo-d' + i * 2 + '" d="M' + (40 + i * 40) + ',20 c6,-6 14,-4 14,4 c-6,6 -14,4 -14,-4Z" fill="' + ['#a68a3a', '#8a6d2c', '#b59a4c', '#7d6326'][i] + '"/>').join('');
      return (
        leaves + SHADOW +
        '<g class="gr-fo-hunch">' + robe('#7d7a3a', '#3a3818', '#c9c27a', 40) +
        '<g transform="translate(150 70)"><path d="M0,0 C-4,30 4,70 -2,140" stroke="#5a4428" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M0,0 L-10,-12 M0,0 L8,-14 M-2,10 L-12,4" stroke="#5a4428" stroke-width="3" stroke-linecap="round"/></g>' +
        arm(124, 122, -28, 30, '#7d7a3a', '#c9c27a', skin) +
        arm(78, 122, 50, 30, '#7d7a3a', '#c9c27a', skin, '<circle class="gr-fo-orb" cx="0" cy="44" r="7" fill="#d8344c"/><circle cx="-2" cy="42" r="2.4" fill="#ffd0d6"/>') +
        '<g class="gr-fo-drain"><path d="M42,170 C52,150 46,134 58,124" stroke="#9fd28a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="4 5"/></g>' +
        '<g class="gr-fo-head">' + headBase(skin) + '<path d="M70,66 C76,50 124,50 130,66" stroke="#f2efe6" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path d="M80,78 l12,2 M120,78 l-12,2" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/><circle cx="86" cy="88" r="3" fill="' + INK + '"/><circle cx="114" cy="88" r="3" fill="' + INK + '"/><path d="M78,94 q8,4 16,0 M106,94 q8,4 16,0" stroke="#a18c6a" stroke-width="1.6" fill="none"/>' +
        '<path d="M92,104 Q100,108 108,104" stroke="' + INK + '" stroke-width="2" fill="none"/><path d="M90,110 C92,132 108,132 110,110 C104,118 96,118 90,110Z" fill="#f2efe6"/></g></g>'
      );
    },
    // Kính Nguyệt Sứ Ảnh Song.
    kinh() {
      const skin = '#ffe3cf';
      return (
        SHADOW +
        '<g class="gr-fo-sway">' + robe('#a08a4a', '#2a2214', '#f0d98a') +
        arm(78, 122, 22, 34, '#a08a4a', '#f0d98a', skin) +
        '<g transform="translate(146 120)"><circle r="34" fill="#c99a3c" stroke="#7a5a1c" stroke-width="4"/><circle r="28" fill="#e9d7a4"/><g class="gr-fo-flicker"><ellipse cx="0" cy="-6" rx="9" ry="9" fill="#7a5a1c" opacity=".55"/><path d="M-14,22 C-12,4 12,4 14,22Z" fill="#7a5a1c" opacity=".55"/></g><path class="gr-fo-shine" d="M-18,-20 L-6,-28" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".8"/><rect x="-5" y="34" width="10" height="26" rx="3" fill="#7a5a1c"/></g>' +
        arm(124, 122, -40, 26, '#a08a4a', '#f0d98a', skin) +
        '<g class="gr-fo-head">' + headBase(skin) + '<path d="M100,47 A38,35 0 0 1 100,117 Z" fill="#3a2a40" opacity=".35"/>' +
        '<path d="M62,74 C64,42 136,42 138,74 C126,58 74,58 62,74Z" fill="#1d1822"/><path d="M100,44 L100,60" stroke="#f0d98a" stroke-width="3"/>' +
        '<path d="M77,88 q8,-6 16,0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M107,84 Q115,80 122,84 Q115,90 107,84Z" fill="#f0d98a"/>' + smirk + '</g></g>'
      );
    },
    // Sương Nguyệt Sứ Lãnh Tịch.
    suong() {
      const skin = '#f1f4fa';
      const flake = (i) => '<g class="gr-fo-orbit gr-fo-d' + i * 2 + '"><g transform="translate(100 112) rotate(' + i * 90 + ') translate(70 0)"><path d="M0,-8 V8 M-7,-4 L7,4 M-7,4 L7,-4" stroke="#cfe3ff" stroke-width="2.4" stroke-linecap="round"/></g></g>';
      return (
        [0, 1, 2, 3].map(flake).join('') +
        '<ellipse cx="100" cy="214" rx="72" ry="9" fill="#dfeeff" opacity=".8"/>' +
        '<g class="gr-fo-sway">' + robe('#6f8fb3', '#e6f0fb', '#ffffff') +
        arm(78, 122, 16, 34, '#6f8fb3', '#ffffff', skin) + arm(124, 122, -16, 34, '#6f8fb3', '#ffffff', skin) +
        '<g class="gr-fo-head">' + headBase(skin) + '<path d="M62,76 C60,44 140,44 138,76 C128,58 72,58 62,76Z" fill="#f4f6fb" stroke="#c9d6e8" stroke-width="1.2"/>' +
        '<ellipse cx="100" cy="42" rx="18" ry="11" fill="#f4f6fb" stroke="#c9d6e8" stroke-width="1.2"/><path d="M78,40 L124,30" stroke="#9fd0ff" stroke-width="3" stroke-linecap="round"/><path d="M124,30 l6,-4 l-1,7Z" fill="#9fd0ff"/>' +
        EYES.cold + flat + '</g></g>'
      );
    },
    // Thực Nguyệt Sứ Vô Vọng.
    vong() {
      const skin = '#b9adb8';
      const chain = (x, cls) => '<g transform="translate(' + x + ' 150)"><g class="' + cls + '">' + [0, 1, 2, 3, 4].map((i) => '<ellipse cx="0" cy="' + i * 10 + '" rx="4" ry="6" fill="none" stroke="#2a2433" stroke-width="3"/>').join('') + '<path d="M-7,52 L0,64 L7,52Z" fill="#2a2433"/></g></g>';
      return (
        '<circle class="gr-fo-halo" cx="100" cy="86" r="62" fill="#120e18"/><circle cx="100" cy="86" r="62" fill="none" stroke="#d8344c" stroke-width="2.4" opacity=".8"/>' +
        '<g class="gr-fo-ripple"><ellipse cx="100" cy="216" rx="78" ry="10" fill="#1a1622"/><ellipse class="gr-fo-ring2" cx="100" cy="216" rx="40" ry="5" fill="none" stroke="#5b5070" stroke-width="2"/></g>' +
        '<g class="gr-fo-heavy" transform="translate(100 120) scale(1.12) translate(-100 -120)">' + robe('#3d3550', '#16121e', '#6d6182', 50) +
        arm(72, 124, 30, 36, '#3d3550', '#6d6182', skin) + arm(128, 124, -30, 36, '#3d3550', '#6d6182', skin) +
        chain(58, 'gr-fo-chain') + chain(142, 'gr-fo-chain gr-fo-d3') +
        '<g class="gr-fo-head">' + headBase(skin) + '<path d="M62,70 C62,48 138,48 138,70 L134,62 C120,54 80,54 66,62Z" fill="#16121e"/>' +
        '<path d="M70,72 L94,80 M130,72 L106,80" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/><circle cx="86" cy="88" r="3.4" fill="' + INK + '"/><circle cx="114" cy="88" r="3.4" fill="' + INK + '"/>' +
        '<path d="M118,70 L126,100" stroke="#8a6a7a" stroke-width="2" stroke-linecap="round"/><path d="M88,106 Q100,100 112,106" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>'
      );
    },
  };
  // Tranh một nhân vật phe ác; trả '' nếu mã không có.
  function svg(id) {
    const f = DRAW[id], info = (window.zenTale?.FOES || []).find((x) => x.id === id);
    if (!f) return '';
    const label = info ? info.title + ' ' + info.name + ' · ' + info.art : id;
    return wrap(id, label.replace(/"/g, ''), f());
  }
  window.zenFoe = { svg, IDS: Object.keys(DRAW) };
})();
