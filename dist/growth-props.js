'use strict';
// v2.17.0 (Họa Cảnh): vật dụng và biểu tượng trong tranh minh họa truyện ký (đặt bằng "tên@x,y*cỡ^độ xoay?số" trong growth-plates.js).
// Mỗi vật vẽ quanh gốc (0,0) ở cỡ 1 ≈ 100–200 đơn vị tranh; "?số" là tham số riêng (ổ khóa đã rơi, vết nứt, số thẻ tre…).
// Màu gỗ, đá, vải pha về màu "mực" của giờ trong tranh nên ban đêm vật cũng tối theo.
(function () {
  const Z = window.zenScene;
  const K = Z.kit;
  const { f, mix, between, rng, smooth, glow } = K;
  const T = (c, col, k) => mix(col, c.P.ink, (c.P.dark ? 0.4 : 0.08) + (k || 0));
  const R = (c, k) => rng('prop-' + k + c.shot.s);
  const PROPS = Z.PROPS;

  // Gáo gỗ sứt quai: gáo dừa có cán gãy, nước trong gáo.
  PROPS.ladle = (c, o) => {
    const wood = T(c, '#b07a46'), dk = T(c, '#744a26'), lt = T(c, '#dba96c'), P = c.P;
    const water = mix('#9ec6dc', P.ink, P.dark ? 0.3 : 0);
    return '<ellipse cx="4" cy="38" rx="52" ry="7" fill="' + P.ink + '" opacity=".28"/>' +
      '<path d="M-46,-4 Q-46,36 0,38 Q46,36 46,-4Z" fill="' + c.lin('lw', [[0, lt], [0.55, wood], [1, dk]], [0, 0, 1, 1]) + '"/>' +
      '<path d="M-34,10 Q-10,28 24,24 M-40,0 Q-10,22 30,16" stroke="' + dk + '" stroke-width="1.6" fill="none" opacity=".4"/>' +
      '<ellipse cx="0" cy="-5" rx="46" ry="11" fill="' + dk + '"/><ellipse cx="0" cy="-4" rx="40" ry="7.6" fill="' + water + '"/>' +
      '<ellipse cx="-10" cy="-5" rx="15" ry="2.4" fill="#fff" opacity=".5"/>' +
      '<path d="M42,-8 C56,-20 68,-30 80,-46 L90,-40 C80,-24 66,-12 50,2Z" fill="' + wood + '"/>' +
      '<path d="M80,-46 l3,-9 l4,6 l5,-5 l-1,9 l-6,2 l-3,5Z" fill="' + wood + '"/><path d="M96,-30 l5,-4 l1,6Z" fill="' + dk + '"/>' +
      '<path d="M-18,-12 l4,-8 M10,-14 l3,-7" stroke="#fff" stroke-width="1.5" opacity="0" />' +
      (o.a ? '<path d="M-6,-20 q0,-10 0,-16 q4,6 0,16Z" fill="' + water + '" opacity=".9"/>' : '');
  };
  // Thùng nước gỗ; ?1 = có trăng trong thùng.
  PROPS.bucket = (c, o) => {
    const wood = T(c, '#9a6a3c'), dk = T(c, '#5e3c1e'), P = c.P, moon = o.a;
    return '<ellipse cx="0" cy="2" rx="46" ry="6" fill="' + P.ink + '" opacity=".28"/>' +
      '<path d="M-40,-70 L-34,0 Q0,8 34,0 L40,-70Z" fill="' + c.lin('bk', [[0, mix(wood, '#fff', 0.15)], [1, dk]], [0, 0, 1, 0]) + '"/>' +
      '<path d="M-14,-68 L-12,2 M14,-68 L12,2" stroke="' + dk + '" stroke-width="1.4" opacity=".5"/>' +
      '<path d="M-38,-48 Q0,-42 38,-48 M-36,-18 Q0,-12 36,-18" stroke="' + T(c, '#3a3a40') + '" stroke-width="4" fill="none"/>' +
      '<ellipse cx="0" cy="-70" rx="40" ry="10" fill="' + dk + '"/><ellipse cx="0" cy="-69" rx="36" ry="8" fill="' + (moon ? '#16213f' : mix('#9ec6dc', P.ink, P.dark ? 0.3 : 0)) + '"/>' +
      (moon ? '<circle cx="3" cy="-69" r="6.6" fill="#f6f1dc"/><path d="M-30,-69 q4,-1 8,0 M18,-67 q5,-1 9,0" stroke="#9fb4e6" stroke-width="1" fill="none"/>' : '') +
      '<path d="M-40,-70 Q0,-122 40,-70" stroke="' + dk + '" stroke-width="3" fill="none"/>';
  };
  // Đòn gánh đen có vết khấc, hai thùng nước đong đưa. ?1 = chỉ có đòn gánh.
  PROPS.pole = (c, o) => {
    const dk = T(c, '#241a14'), wood = T(c, '#9a6a3c'), P = c.P;
    const bucket = (x, y) => '<g class="sc-sway" style="transform-origin:' + x + 'px ' + y + 'px"><path d="M' + x + ',' + y + ' L' + x + ',' + (y + 42) + '" stroke="' + dk + '" stroke-width="1.6"/><path d="M' + (x - 26) + ',' + (y + 42) + ' h52 l-6,52 h-40Z" fill="' + wood + '"/><ellipse cx="' + x + '" cy="' + (y + 42) + '" rx="26" ry="6" fill="' + mix('#9ec6dc', P.ink, P.dark ? 0.3 : 0) + '"/><path d="M' + (x - 24) + ',' + (y + 64) + ' h48" stroke="' + dk + '" stroke-width="3"/></g>';
    return '<path d="M-150,0 Q0,-10 150,0" stroke="' + dk + '" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-146,-3 l2,10" stroke="' + mix(dk, '#fff', 0.5) + '" stroke-width="2"/>' + (o.a ? '' : bucket(-134, 4) + bucket(134, 4));
  };
  // Mộc kiếm Đòn Gánh dựng đứng, có vết khấc ở đầu.
  PROPS.sword = (c, o) => {
    const wood = T(c, '#bd8b52'), dk = T(c, '#6b4a2c');
    return '<ellipse cx="0" cy="2" rx="22" ry="4" fill="' + c.P.ink + '" opacity=".28"/><path d="M-5,0 L-6,-150 Q0,-166 6,-150 L5,0Z" fill="' + wood + '"/><path d="M-6,-86 l4,2 l-4,3Z" fill="' + dk + '"/><path d="M-5,-150 l3,-6" stroke="' + mix(wood, '#fff', 0.4) + '" stroke-width="1.6"/><rect x="-14" y="-4" width="28" height="7" fill="' + dk + '"/><rect x="-4" y="3" width="8" height="30" rx="3" fill="' + dk + '"/>';
  };
  // Bảng tre ba cột: Chưa làm · Đang làm · Đã xong. ?n = số thẻ ở cột Đã xong (0–9).
  PROPS.board = (c, o) => {
    const bam = T(c, '#c8b06a'), dk = T(c, '#7a6430'), done = o.a === undefined ? 5 : Math.min(9, o.a);
    let s = '<rect x="-132" y="-86" width="264" height="168" rx="6" fill="' + T(c, '#e9dcb4') + '" stroke="' + bam + '" stroke-width="8"/>';
    const cols = [['Chưa làm', 3, '#d9a0a0'], ['Đang làm', 2, '#e6c06a'], ['Đã xong', done, '#9bc59a']];
    cols.forEach((col, i) => {
      const x = -88 + i * 88;
      s += '<path d="M' + (x + 44) + ',-84 L' + (x + 44) + ',80" stroke="' + bam + '" stroke-width="3"/><text x="' + x + '" y="-62" text-anchor="middle" font-size="15" font-weight="700" fill="' + dk + '" font-family="Georgia,serif">' + col[0] + '</text>';
      for (let k = 0; k < col[1]; k++) s += '<rect x="' + (x - 28) + '" y="' + (-46 + k * 20) + '" width="56" height="15" rx="2" fill="' + T(c, col[2]) + '" stroke="' + dk + '" stroke-width=".8"/><path d="M' + (x - 21) + ',' + (-38.5 + k * 20) + ' h42" stroke="' + dk + '" stroke-width="1.2" opacity=".55"/>';
    });
    return s + '<path d="M-110,86 L-118,120 M110,86 L118,120" stroke="' + bam + '" stroke-width="7" stroke-linecap="round"/>';
  };
  PROPS.bell = (c) => {
    const br = T(c, '#8a6a3a'), gr = T(c, '#4f8a72');
    return '<path d="M0,-90 L0,-50" stroke="' + T(c, '#3a2a1c') + '" stroke-width="5"/><path d="M-34,24 C-34,-14 -22,-50 0,-50 C22,-50 34,-14 34,24 Q0,34 -34,24Z" fill="' + c.lin('bl', [[0, mix(br, '#fff', 0.3)], [0.6, br], [1, T(c, '#4a3418')]], [0, 0, 1, 0]) + '"/><path d="M-30,12 Q0,22 30,12" stroke="' + gr + '" stroke-width="3" fill="none" opacity=".6"/><circle cx="0" cy="30" r="5" fill="' + T(c, '#3a2a1c') + '"/>';
  };
  // Đèn lồng lớn; ?1 = đèn có hình mặt (đèn nghìn mặt).
  PROPS.lamp = (c, o) => {
    const lamp = c.P.lamp;
    return '<g class="sc-sway" style="transform-origin:0px -78px"><path d="M0,-80 L0,-52" stroke="' + c.P.ink + '" stroke-width="3"/>' + glow(c, 0, 0, 130, lamp, 0.55) + '<ellipse cx="0" cy="0" rx="42" ry="52" fill="' + c.rad('lmp', [[0, '#fff6d0'], [0.6, lamp], [1, mix(lamp, '#b8344a', 0.5)]], [0.5, 0.5, 0.6]) + '"/><path d="M-36,-18 Q0,-26 36,-18 M-40,0 Q0,-8 40,0 M-36,18 Q0,10 36,18" stroke="' + mix(lamp, '#8a2a30', 0.6) + '" stroke-width="2" fill="none" opacity=".7"/><rect x="-24" y="-58" width="48" height="10" rx="3" fill="' + c.P.ink + '"/><rect x="-20" y="48" width="40" height="8" rx="3" fill="' + c.P.ink + '"/><path d="M0,56 l0,30 M-8,56 l-4,26 M8,56 l4,26" stroke="#b8344a" stroke-width="3"/>' +
      (o.a ? '<circle cx="-12" cy="-8" r="3" fill="#2a1a14"/><circle cx="12" cy="-8" r="3" fill="#2a1a14"/><path d="M-12,14 Q0,24 12,14" stroke="#2a1a14" stroke-width="3" fill="none"/>' : '') + '</g>';
  };
  // Dây đèn lồng chăng ngang (hội đèn); ?n = số đèn.
  PROPS.lanterns = (c, o) => {
    const n = o.a || 7, lamp = c.P.lamp, r = R(c, 'lns');
    let s = '<path d="M-420,-30 Q0,40 420,-30" stroke="' + c.P.ink + '" stroke-width="3" fill="none"/>';
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = -420 + 840 * t, y = -30 + 4 * Math.sin(Math.PI * t) * 20 + 40 * Math.sin(Math.PI * t) - 6;
      const col = i % 3 === 0 ? '#ff8a5a' : i % 3 === 1 ? lamp : '#ffb3c0';
      s += glow(c, x, y + 30, 70, col, 0.45) + '<ellipse cx="' + f(x) + '" cy="' + f(y + 30) + '" rx="17" ry="22" fill="' + col + '"/><rect x="' + f(x - 9) + '" y="' + f(y + 5) + '" width="18" height="5" fill="' + c.P.ink + '"/><path d="M' + f(x) + ',' + f(y + 52) + ' l0,14" stroke="#b8344a" stroke-width="2"/>';
    }
    return s;
  };
  // Quạt tím (Miên Hồ), kèm khói hương cuộn.
  PROPS.fan = (c) => '<path d="M0,60 L-92,-34 Q0,-84 92,-34Z" fill="' + c.lin('fn', [[0, '#b58ae0'], [1, '#6a3f9a']], [0, 0, 0, 1]) + '" stroke="#f1dcff" stroke-width="2"/>' + [-70, -46, -23, 0, 23, 46, 70].map((x) => '<path d="M0,60 L' + x + ',-52" stroke="#f1dcff" stroke-width="1.6" opacity=".7"/>').join('') + '<path d="M-40,-30 q10,-14 24,-6 M20,-36 q14,-10 26,2" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/><rect x="-4" y="56" width="8" height="30" rx="3" fill="' + T(c, '#5e3c1e') + '"/>';
  // Mặt nạ trăng khuyết bạc; ?1 = nứt một đường.
  PROPS.moonmask = (c, o) => {
    const g = c.lin('mm', [[0, T(c, '#eef0f3')], [0.5, T(c, '#b9bdc6')], [1, T(c, '#767b8b')]], [0.15, 0, 0.85, 1]);
    // Trăng khuyết: cung ngoài bán kính 64, cung trong bán kính 90 lõm vào; dịch sang phải 22 cho tâm vật nằm giữa thân.
    return '<g transform="translate(22 0)"><path d="M18,-62 A64,64 0 1 0 18,62 A90,90 0 0 1 18,-62Z" fill="' + g + '" stroke="' + T(c, '#5e6272') + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M8,-54 A56,56 0 0 0 -50,-4" stroke="#fff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>' +
      '<path d="M-44,-16 q10,-10 24,-4 M-44,22 q10,10 24,4" stroke="' + T(c, '#3a3d4a') + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="-34" cy="38" rx="9" ry="5" fill="' + T(c, '#6a6a60') + '" opacity=".35"/><ellipse cx="-22" cy="-44" rx="7" ry="4" fill="' + T(c, '#6a6a60') + '" opacity=".3"/>' +
      (o.a ? '<path d="M-58,-30 L-40,-12 L-50,6 L-30,22 L-40,40" stroke="#1b1522" stroke-width="3.4" fill="none" stroke-linejoin="round"/>' : '') + '</g>';
  };
  PROPS.foxmask = (c) => '<path d="M-60,-30 L-70,-92 L-20,-52 Q0,-58 20,-52 L70,-92 L60,-30 Q64,26 0,64 Q-64,26 -60,-30Z" fill="#f6f2f6" stroke="#d8c8dc" stroke-width="2"/><path d="M-44,-14 Q-30,-26 -14,-8 M44,-14 Q30,-26 14,-8" stroke="#c0305a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M0,8 l-6,14 h12Z" fill="#2a1a20"/><path d="M-30,36 Q0,52 30,36" stroke="#c0305a" stroke-width="4" fill="none"/>';
  // Ống sáo xương, kèm sóng âm. ?1 = nứt.
  PROPS.flute = (c, o) => '<path d="M-110,-14 L110,14" stroke="#e8e0cc" stroke-width="15" stroke-linecap="round"/><path d="M-110,-14 L110,14" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>' + [-50, -20, 10, 40, 70].map((x, i) => '<circle cx="' + x + '" cy="' + f(-14 + (x + 110) * 0.127) + '" r="3.4" fill="#3a3028"/>').join('') + (o.a ? '<path d="M-6,-14 l6,12 l-7,10 l6,12" stroke="#2a1a14" stroke-width="2.4" fill="none"/>' : '') + [1, 2, 3].map((k) => '<path d="M' + (-140 - k * 20) + ',' + (-26 - k * 8) + ' Q' + (-150 - k * 20) + ',' + (-6) + ' ' + (-140 - k * 20) + ',' + (14 + k * 8) + '" stroke="#bfe0da" stroke-width="2.4" fill="none" opacity="' + f(0.7 - k * 0.18) + '"/>').join('');
  // Gương đồng; ?1 = đã vỡ.
  PROPS.mirror = (c, o) => '<circle cx="0" cy="0" r="82" fill="' + T(c, '#b8944a') + '"/><circle cx="0" cy="0" r="70" fill="' + c.rad('mi', [[0, '#fbf6dc'], [1, '#c9bd8a']], [0.35, 0.3, 0.9]) + '"/><circle cx="0" cy="0" r="76" fill="none" stroke="' + T(c, '#6a5420') + '" stroke-width="3"/><rect x="-9" y="80" width="18" height="70" rx="6" fill="' + T(c, '#8a6a24') + '"/>' + (o.a ? '<path d="M-10,-70 L8,-30 L-14,0 L10,34 L-4,70 M8,-30 L50,-20 M-14,0 L-56,10" stroke="#5a4a1c" stroke-width="2.6" fill="none"/>' : '<path d="M-42,-30 q10,-24 40,-30" stroke="#fff" stroke-width="3" opacity=".6" fill="none"/>');
  // Mảnh giáp lưu ly vỡ.
  PROPS.shards = (c) => {
    const r = R(c, 'sh');
    let s = '';
    for (let i = 0; i < 12; i++) {
      const x = between(r, -120, 120), y = between(r, -30, 10), w = between(r, 14, 34), h = between(r, 12, 30), a = between(r, 0, 180);
      s += '<path d="M' + f(x) + ',' + f(y) + ' l' + f(w) + ',' + f(-h * 0.3) + ' l' + f(-w * 0.2) + ',' + f(h) + 'Z" fill="#bfeaf2" opacity="' + f(between(r, 0.5, 0.85)) + '" stroke="#ffffff" stroke-width="1" transform="rotate(' + f(a) + ' ' + f(x) + ' ' + f(y) + ')"/>';
    }
    return glow(c, 0, -10, 150, '#9fe4f0', 0.35) + s;
  };
  PROPS.pill = (c) => glow(c, 0, 0, 90, '#ff4a4a', 0.5) + '<circle cx="0" cy="0" r="30" fill="' + c.rad('pl', [[0, '#ffb0a0'], [0.5, '#e53a3a'], [1, '#7a1020']], [0.35, 0.3, 0.8]) + '"/><ellipse cx="-9" cy="-10" rx="9" ry="5" fill="#fff" opacity=".55"/>';
  // Giỏ đan trước cửa; ?1 = trong giỏ có gáo và tấm vải bọc.
  PROPS.basket = (c, o) => {
    const wk = T(c, '#b88a54'), dk = T(c, '#7a5530');
    let s = '<ellipse cx="0" cy="40" rx="76" ry="9" fill="' + c.P.ink + '" opacity=".28"/><path d="M-70,-10 Q-74,40 0,44 Q74,40 70,-10Z" fill="' + wk + '"/>';
    for (let i = -3; i <= 3; i++) s += '<path d="M' + i * 20 + ',-8 Q' + (i * 22) + ',20 ' + i * 14 + ',42" stroke="' + dk + '" stroke-width="2" fill="none" opacity=".6"/>';
    for (let k = 0; k < 4; k++) s += '<path d="M-72,' + (4 + k * 11) + ' Q0,' + (14 + k * 11) + ' 72,' + (4 + k * 11) + '" stroke="' + dk + '" stroke-width="2" fill="none" opacity=".5"/>';
    s += '<ellipse cx="0" cy="-10" rx="70" ry="15" fill="' + dk + '"/>';
    if (o.a) s += '<path d="M-52,-12 Q-30,-40 0,-34 Q34,-40 54,-12 Q0,2 -52,-12Z" fill="#e9dcc4"/><path d="M-30,-20 q30,10 60,-4" stroke="#c9b894" stroke-width="2" fill="none"/><path d="M36,-14 q16,-12 30,-4 l-4,10Z" fill="#b07a46"/>';
    return s;
  };
  // Lưới vá, có một nút thắt vụng về của trẻ con; ?1 = làm nổi nút ấy.
  PROPS.net = (c, o) => {
    const col = T(c, '#b8a47a');
    let s = '<path d="M-150,-80 Q0,-100 150,-80" stroke="' + T(c, '#5e3c1e') + '" stroke-width="5" fill="none"/>';
    for (let i = 0; i < 14; i++) s += '<path d="M' + (-140 + i * 20) + ',-80 Q' + (-146 + i * 20) + ',0 ' + (-132 + i * 20) + ',90" stroke="' + col + '" stroke-width="1.6" fill="none" opacity=".85"/>';
    for (let j = 0; j < 9; j++) s += '<path d="M-150,' + (-70 + j * 20) + ' Q0,' + (-58 + j * 20) + ' 150,' + (-70 + j * 20) + '" stroke="' + col + '" stroke-width="1.6" fill="none" opacity=".85"/>';
    s += '<path d="M-60,20 q20,-16 36,0 q-18,18 -36,0Z M-52,14 q10,10 22,2" stroke="#c9503a" stroke-width="3.4" fill="none"/>';
    if (o.a) s += glow(c, -42, 20, 60, '#ffe6a0', 0.5);
    return s;
  };
  // Thư viền đỏ (kèm quạ nếu ?1).
  PROPS.letter = (c, o) => '<rect x="-60" y="-34" width="120" height="68" rx="4" fill="#f3e7cc" stroke="#b8344a" stroke-width="5"/><path d="M-40,-14 h80 M-40,2 h80 M-40,18 h50" stroke="#6b5a3a" stroke-width="2" opacity=".7"/><circle cx="40" cy="20" r="8" fill="#b8344a"/>' + (o.a ? PROPS.crow(c, {}).replace(/^/, '<g transform="translate(-10 -58) scale(.8)">') + '</g>' : '');
  PROPS.crow = (c) => '<path d="M-40,0 Q-34,-26 -6,-30 Q14,-34 30,-22 L46,-20 L32,-12 Q24,8 -6,10 L-14,24 L-18,10 Q-36,12 -40,0Z" fill="#14101a"/><circle cx="26" cy="-22" r="2" fill="#ff5a5a"/><path d="M-40,0 L-62,-8 L-48,6Z" fill="#14101a"/>';
  // Hai thanh đao chéo kèm tia sét.
  PROPS.sabers = (c) => '<path d="M-90,70 L74,-80" stroke="#e8f2ff" stroke-width="10" stroke-linecap="round"/><path d="M90,70 L-74,-80" stroke="#e8f2ff" stroke-width="10" stroke-linecap="round"/><path d="M-90,70 L74,-80 M90,70 L-74,-80" stroke="#6ab4ff" stroke-width="3" opacity=".8"/><path d="M-6,-110 L10,-60 L-4,-56 L12,-10" stroke="#fff4a8" stroke-width="5" fill="none" stroke-linejoin="round"/>' + glow(c, 0, -40, 120, '#8cc4ff', 0.35);
  PROPS.chain = (c) => {
    let s = '';
    for (let i = 0; i < 9; i++) s += '<ellipse cx="' + (-120 + i * 30) + '" cy="' + f(Math.sin(i * 0.7) * 16) + '" rx="15" ry="8" fill="none" stroke="#1a1822" stroke-width="5" transform="rotate(' + (i % 2 ? 90 : 0) + ' ' + (-120 + i * 30) + ' ' + f(Math.sin(i * 0.7) * 16) + ')"/>';
    return s;
  };
  PROPS.ruler = (c) => glow(c, 0, 0, 140, '#bff0d4', 0.4) + '<path d="M0,110 L0,-110" stroke="#9fe0c0" stroke-width="16" stroke-linecap="round"/><path d="M0,110 L0,-110" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".7"/>' + [-80, -40, 0, 40, 80].map((y) => '<path d="M-8,' + y + ' h6" stroke="#4a8a6a" stroke-width="1.6"/>').join('');
  // Tua kiếm đỏ ba nút.
  PROPS.tassel = (c) => '<path d="M0,-110 C-8,-70 8,-50 0,-20" stroke="#b8344a" stroke-width="5" fill="none"/>' + [-86, -58, -30].map((y) => '<circle cx="' + (y === -58 ? 4 : -3) + '" cy="' + y + '" r="9" fill="#c93a52" stroke="#7a1428" stroke-width="2"/>').join('') + '<path d="M0,-20 l-14,50 M0,-20 l-5,56 M0,-20 l6,56 M0,-20 l14,50" stroke="#b8344a" stroke-width="3.4" stroke-linecap="round"/>';
  // Ghế đá khắc tên; ?n = độ phủ rêu (0–3).
  PROPS.chair = (c, o) => {
    const st = T(c, '#8a8a92'), dk = T(c, '#4a4a54'), moss = o.a || 0;
    return '<ellipse cx="0" cy="6" rx="70" ry="8" fill="' + c.P.ink + '" opacity=".3"/><rect x="-54" y="-130" width="108" height="100" rx="10" fill="' + st + '"/><rect x="-62" y="-36" width="124" height="38" rx="6" fill="' + dk + '"/><path d="M-62,2 L-56,36 M62,2 L56,36" stroke="' + dk + '" stroke-width="12"/><rect x="-26" y="-108" width="52" height="46" rx="4" fill="' + dk + '" opacity=".55"/><path d="M-14,-96 h28 M-14,-82 h20 M-14,-68 h26" stroke="' + mix(st, '#fff', 0.35) + '" stroke-width="2.4" opacity=".7"/>' + (moss ? '<path d="M-54,-130 q20,-8 40,2 q20,-6 36,0 M-62,-36 q30,-6 60,0" stroke="#5a8a4a" stroke-width="' + (4 + moss * 3) + '" fill="none" opacity=".75" stroke-linecap="round"/>' : '');
  };
  PROPS.drum = (c) => '<ellipse cx="0" cy="60" rx="64" ry="12" fill="' + c.P.ink + '" opacity=".28"/><path d="M-60,-40 Q-70,10 -56,56 L56,56 Q70,10 60,-40Z" fill="' + T(c, '#8a3a2a') + '"/><ellipse cx="0" cy="-40" rx="60" ry="16" fill="' + T(c, '#e6d3a8') + '" stroke="' + T(c, '#5e2a1e') + '" stroke-width="4"/>' + [-40, -20, 0, 20, 40].map((x) => '<circle cx="' + x + '" cy="-26" r="2.6" fill="' + T(c, '#d4a05a') + '"/>').join('');
  PROPS.torch = (c) => glow(c, 0, -90, 110, '#ffae5a', 0.6) + '<path d="M0,40 L0,-62" stroke="' + T(c, '#5e3c1e') + '" stroke-width="7" stroke-linecap="round"/><path d="M0,-62 C-18,-84 -6,-100 0,-128 C8,-104 20,-86 0,-62Z" fill="#ffb347" class="sc-flame"/><path d="M0,-66 C-8,-80 -2,-90 0,-104 C4,-90 10,-80 0,-66Z" fill="#fff0b0"/>';
  PROPS.teapot = (c) => '<ellipse cx="0" cy="30" rx="60" ry="7" fill="' + c.P.ink + '" opacity=".25"/><path d="M-44,0 Q-44,34 0,34 Q44,34 44,0 Q44,-30 0,-30 Q-44,-30 -44,0Z" fill="' + T(c, '#8a6a58') + '"/><path d="M44,-4 Q74,-12 66,-38 L56,-34 Q60,-14 42,-12Z" fill="' + T(c, '#8a6a58') + '"/><path d="M-44,-4 Q-72,-4 -66,24" stroke="' + T(c, '#6a4a3a') + '" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="-14" y="-40" width="28" height="12" rx="5" fill="' + T(c, '#6a4a3a') + '"/>';
  // Ngọn mạ xanh đầu tiên mọc từ đất nứt.
  PROPS.sprout = (c) => glow(c, 0, -40, 110, '#c9ffae', 0.5) + '<path d="M-120,10 Q-60,-6 0,-2 Q60,-6 120,10 Q60,26 0,22 Q-60,26 -120,10Z" fill="' + T(c, '#5a3a2a') + '"/><path d="M-90,8 L-50,2 L-30,12 M20,4 L60,14 L100,8 M-10,10 L-4,22 M40,10 L36,22 M-60,12 L-70,22" stroke="#1a0e0a" stroke-width="2.6" fill="none" stroke-linejoin="round"/><path d="M0,0 C-2,-30 4,-52 2,-74" stroke="#7fcf6a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M2,-72 C22,-96 46,-90 62,-70 C40,-70 22,-66 2,-72Z" fill="#9fe08a"/><path d="M0,-52 C-20,-74 -44,-72 -56,-54 C-34,-54 -18,-50 0,-52Z" fill="#7fcf6a"/><path d="M4,-72 C24,-86 40,-84 54,-72" stroke="#d4ffbf" stroke-width="1.6" fill="none"/><circle cx="52" cy="-62" r="3.4" fill="#fff" opacity=".8"/>';
  // Cuộn sợi chỉ đỏ; ?1 = đã tuột rời.
  PROPS.thread = (c, o) => '<path d="' + smooth([[-130, 0], [-70, -40], [-10, 10], [50, -36], [110, 6], [150, -20]]) + '" stroke="#e5304a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="' + smooth([[-130, 0], [-70, -40], [-10, 10], [50, -36], [110, 6], [150, -20]]) + '" stroke="#ffb0b8" stroke-width="1.2" fill="none" opacity=".7"/>' + glow(c, 0, -10, 140, '#ff4a62', 0.25) + (o.a ? '' : '<circle cx="-130" cy="0" r="8" fill="#c01a38"/>');
  // Tượng thần trong miếu hoang (nứt, thiếu đầu nếu ?1).
  PROPS.statue = (c, o) => {
    const st = T(c, '#7c7a80'), dk = T(c, '#44424a');
    return '<ellipse cx="0" cy="8" rx="100" ry="10" fill="' + c.P.ink + '" opacity=".35"/><rect x="-86" y="-40" width="172" height="48" rx="6" fill="' + dk + '"/><path d="M-56,-40 C-70,-100 -50,-170 -30,-180 L30,-180 C50,-170 70,-100 56,-40Z" fill="' + st + '"/>' + (o.a ? '' : '<circle cx="0" cy="-208" r="30" fill="' + st + '"/><path d="M-12,-216 q6,-4 12,0 M2,-216 q6,-4 12,0" stroke="' + dk + '" stroke-width="2.4" fill="none"/>') + '<path d="M-40,-150 q18,24 -4,50 q12,20 -2,56" stroke="' + dk + '" stroke-width="3" fill="none"/><path d="M-100,-120 q-40,30 -50,80 M100,-120 q40,30 50,80" stroke="' + st + '" stroke-width="22" fill="none" stroke-linecap="round"/>';
  };
  PROPS.banner = (c) => '<path d="M0,-170 L0,40" stroke="' + T(c, '#2a2028') + '" stroke-width="6"/><path d="M0,-160 L96,-150 Q74,-110 96,-60 L0,-70Z" fill="#17101c" stroke="#b8344a" stroke-width="3" class="sc-wave"/><path d="M54,-128 A20,20 0 1 0 54,-92 A14,14 0 1 1 54,-128Z" fill="#d8344c"/>';
  PROPS.palanquin = (c) => '<rect x="-130" y="-10" width="260" height="14" fill="' + T(c, '#3a1a1c') + '"/><rect x="-100" y="-120" width="200" height="110" fill="' + T(c, '#a8283c') + '"/><path d="M-128,-120 Q0,-170 128,-120 L112,-104 Q0,-142 -112,-104Z" fill="' + T(c, '#5a0f1e') + '"/><path d="M-100,-100 h200" stroke="#e8c36a" stroke-width="3"/><path d="M-60,-100 v90 M60,-100 v90" stroke="' + T(c, '#5a0f1e') + '" stroke-width="5"/><path d="M-170,6 H170" stroke="' + T(c, '#2a1014') + '" stroke-width="9" stroke-linecap="round"/>';
  PROPS.boat = (c, o) => '<path d="M-110,0 Q-70,34 0,34 Q70,34 110,0 Q120,-14 100,-12 L-100,-12 Q-120,-14 -110,0Z" fill="' + T(c, '#5a3c22') + '"/><path d="M-100,-12 L100,-12" stroke="' + T(c, '#8a6a44') + '" stroke-width="4"/>' + (o.a ? '<path d="M104,-12 L130,-26 L118,-4Z M118,-4 l12,-6" fill="' + T(c, '#5a3c22') + '"/>' : '') + '<path d="M-6,-12 L-6,-130" stroke="' + T(c, '#3a2a1c') + '" stroke-width="4"/>';
  PROPS.fire = (c, o) => glow(c, 0, -60, 170 * (o.s || 1), '#ff8a3a', 0.6) + '<path d="M-34,20 C-52,-30 -20,-50 -18,-92 C-6,-70 4,-84 0,-120 C20,-90 30,-70 28,-50 C46,-60 52,-30 34,20Z" fill="#ff7a2a" class="sc-flame"/><path d="M-18,20 C-28,-10 -6,-30 -2,-60 C8,-40 16,-30 14,-8 C22,-16 24,4 16,20Z" fill="#ffd36a"/><path d="M0,-130 q-22,-70 14,-150 q10,-30 -6,-70" stroke="#2a2430" stroke-width="30" fill="none" opacity=".35" stroke-linecap="round"/>';
  // Sách bìa, ấm, bát…: dùng ít, gọn.
  // v2.18.0: bàn cờ (kỳ ngộ Kỳ Tiên Ông): mặt gỗ nhìn nghiêng, lưới 7×7, vài quân đen trắng; ?n = số quân (0 = trống).
  PROPS.goboard = (c, o) => {
    let g = '<ellipse cx="0" cy="40" rx="90" ry="10" fill="' + c.P.ink + '" opacity=".25"/><path d="M-84,-6 L-60,-46 L60,-46 L84,-6Z" fill="' + T(c, '#caa45e') + '"/><path d="M-84,-6 L84,-6 L84,26 L-84,26Z" fill="' + T(c, '#9c7a3c') + '"/>';
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, y = -40 + t * 28, w = 56 + t * 22;
      g += '<path d="M' + (-w).toFixed(1) + ',' + y.toFixed(1) + ' L' + w.toFixed(1) + ',' + y.toFixed(1) + '" stroke="' + T(c, '#4a3516') + '" stroke-width="1.3" opacity=".7"/>';
      const x0 = -56 + t * 112, x1 = -78 + t * 156;
      g += '<path d="M' + x0.toFixed(1) + ',-40 L' + x1.toFixed(1) + ',-12" stroke="' + T(c, '#4a3516') + '" stroke-width="1.3" opacity=".7"/>';
    }
    const n = o && o.a !== undefined ? o.a : 6;
    const pts = [[-34, -30], [-6, -22], [20, -34], [30, -16], [-52, -16], [4, -40], [44, -26], [-20, -38]];
    for (let i = 0; i < Math.min(n, pts.length); i++) g += '<ellipse cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" rx="8" ry="4.6" fill="' + (i % 2 ? '#f1ece0' : '#1e1a22') + '" stroke="#0004" stroke-width=".6"/>';
    return g;
  };
  PROPS.bowl = (c) => '<ellipse cx="0" cy="22" rx="48" ry="6" fill="' + c.P.ink + '" opacity=".25"/><path d="M-44,-8 Q-40,26 0,26 Q40,26 44,-8Z" fill="' + T(c, '#d8cfc0') + '"/><ellipse cx="0" cy="-8" rx="44" ry="9" fill="' + T(c, '#f4eddc') + '"/><ellipse cx="0" cy="-7" rx="34" ry="6" fill="' + T(c, '#e0d2a8') + '"/>';
  // Thiên Môn: cổng đá mười ổ khóa. ?n: n ổ đã rơi (0–10); ?11 hé mở; ?12 mở toang.
  const lockIcon = (i, col) => {
    const s = 'stroke="' + col + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"';
    return [
      '<path d="M0,10 L-12,-6 Q0,-14 12,-6Z M0,10 L0,-8" ' + s + '/>',
      '<ellipse cx="0" cy="0" rx="7" ry="9" ' + s + '/><path d="M-4,-10 h8 M-3,10 h6" ' + s + '/>',
      '<path d="M-10,10 L10,-10 M6,-10 h4 v4" ' + s + '/>',
      '<path d="M-11,3 L11,-3 M-6,3 v0 M0,1 v0 M6,-1 v0" ' + s + '/>',
      '<path d="M0,-11 V11 M-11,0 H11 M-8,-8 L8,8 M8,-8 L-8,8" ' + s + '/>',
      '<path d="M0,-11 L10,-4 L8,8 L-8,8 L-10,-4Z M0,-11 V2 L8,8 M0,2 L-8,8" ' + s + '/>',
      '<path d="M-10,10 Q-4,0 0,-2 Q6,-4 10,-12 M-2,-1 L-6,-8 M2,-3 L8,2" ' + s + '/>',
      '<circle cx="0" cy="-3" r="8" ' + s + '/><path d="M0,5 v7" ' + s + '/>',
      '<path d="M-11,0 H11 M0,-11 V11 M-8,-8 L8,8 M8,-8 L-8,8 M-4,-11 L0,-7 L4,-11" ' + s + '/>',
      '<path d="M-10,-6 Q-4,-12 0,-6 T10,-6 M-10,2 Q-4,-4 0,2 T10,2 M-10,10 Q-4,4 0,10 T10,10" ' + s + '/>',
    ][i];
  };
  PROPS.gate = (c, o) => {
    const n = o.a === undefined ? 0 : o.a, P = c.P;
    const st = T(c, '#8d8a96'), dk = T(c, '#4c4a58'), lt = mix(st, '#ffffff', 0.25);
    const open = n >= 11 ? (n >= 12 ? 1 : 0.35) : 0;
    let s = glow(c, 0, -40, 460, '#fff1bd', open ? 0.55 + open * 0.35 : 0.08);
    s += '<rect x="-250" y="-420" width="62" height="440" rx="8" fill="' + st + '"/><rect x="188" y="-420" width="62" height="440" rx="8" fill="' + st + '"/>';
    s += '<path d="M-278,-420 Q0,-500 278,-420 L278,-376 Q0,-440 -278,-376Z" fill="' + dk + '"/><path d="M-250,-330 Q0,-400 250,-330 L250,-300 Q0,-366 -250,-300Z" fill="' + st + '"/>';
    s += '<path d="M-240,-300 H240 V20 H-240Z" fill="' + (open ? '#fff6d6' : dk) + '"/>';
    if (open) {
      const gap = open * 120;
      s += '<rect x="' + (-gap) + '" y="-300" width="' + gap * 2 + '" height="320" fill="#ffffff" opacity=".95"/>';
      s += '<path d="M' + (-gap - 4) + ',-300 V20 M' + (gap + 4) + ',-300 V20" stroke="#fff" stroke-width="10" opacity=".7"/>';
      s += '<path d="M-' + (gap + 4) + ',-300 L-' + (gap + 460) + ',60 L-' + (gap + 200) + ',60Z" fill="#fff6d6" opacity=".18"/>';
    }
    s += '<path d="M-236,-296 H-6 V16 H-236Z" fill="' + (open ? 'none' : st) + '" opacity="' + (open ? 0 : 1) + '"/><path d="M6,-296 H236 V16 H6Z" fill="' + (open ? 'none' : st) + '" opacity="' + (open ? 0 : 1) + '"/>';
    if (!open) s += '<path d="M0,-296 V16" stroke="' + dk + '" stroke-width="6"/><path d="M-236,-150 H236" stroke="' + dk + '" stroke-width="4" opacity=".7"/>';
    for (let i = 0; i < 10; i++) {
      const row = i < 5 ? 0 : 1, k = i % 5, x = -184 + k * 92, y = -240 + row * 110;
      const fallen = n > i && n <= 10 || n > 10;
      const gold = '#e8c56a';
      if (fallen && n <= 10) s += '<g opacity=".5" transform="translate(' + x + ' ' + (y + 120 + (i % 3) * 18) + ') rotate(' + (i * 37) + ')"><circle r="30" fill="' + dk + '" stroke="' + gold + '" stroke-width="2"/></g>';
      else if (!open) s += '<g transform="translate(' + x + ' ' + y + ')">' + glow(c, 0, 0, 60, '#ffd27a', 0.35) + '<circle r="32" fill="' + T(c, '#2e2c38') + '" stroke="' + gold + '" stroke-width="3.4"/><circle r="25" fill="none" stroke="' + gold + '" stroke-width="1.2" opacity=".6"/>' + lockIcon(i, gold) + '</g>';
    }
    s += '<path d="M-278,-420 Q-210,-470 -150,-436 M278,-420 Q210,-470 150,-436" stroke="' + lt + '" stroke-width="5" fill="none" opacity=".6"/>';
    s += '<rect x="-262" y="14" width="524" height="22" rx="4" fill="' + dk + '"/>';
    return s;
  };
  // Mắt đỏ trong vầng trăng (tranh phụ).
  PROPS.eye = (c) => glow(c, 0, 0, 260, '#e0344c', 0.5) + Z.kit.bodyArt(c, ['eye', 0, 0, 100]).replace(/cx="-?[\d.]+"/g, 'cx="0"').replace(/cy="-?[\d.]+"/g, 'cy="0"');
  // Cột khói báo động.
  PROPS.smoke = (c, o) => '<path d="M0,0 C-30,-80 40,-150 0,-250 C-20,-320 30,-380 10,-460" stroke="#1d1a22" stroke-width="46" fill="none" opacity=".55" stroke-linecap="round"/>' + glow(c, 0, -6, 90, '#ff8a3a', 0.6);
  // Mái nhà tranh/ngói (ngồi trên mái): khối mái dốc phía trước.
  PROPS.tiles = (c) => {
    let s = '<path d="M-400,120 L-320,-40 L320,-40 L400,120Z" fill="' + T(c, '#4a4a58') + '"/>';
    for (let j = 0; j < 7; j++) for (let i = 0; i < 24; i++) s += '<path d="M' + (-380 + i * 32 + (j % 2) * 16 + j * 4) + ',' + (-30 + j * 20) + ' q8,12 16,0" stroke="' + T(c, '#2a2a34') + '" stroke-width="2" fill="none" opacity=".7"/>';
    return s + '<path d="M-330,-44 L330,-44" stroke="' + T(c, '#2a2a34') + '" stroke-width="10"/>';
  };
  // Băng mọc từ đất: cụm trụ băng nhọn trong suốt, có vệt sáng. ?số = số trụ thêm (0–4) cho khối to hơn.
  PROPS.ice = (c, o) => {
    const P = c.P, k = Math.max(0, Math.min(4, Math.round(o.a || 0)));
    const lt = mix('#eaf7ff', P.ink, P.dark ? 0.3 : 0.03), md = mix('#a8d3ec', P.ink, P.dark ? 0.36 : 0.08), dk = mix('#5a8fb6', P.ink, P.dark ? 0.42 : 0.12);
    const g = c.lin('ice', [[0, lt, 0.96], [0.55, md, 0.86], [1, dk, 0.92]], [0.2, 0, 0.8, 1]);
    const sp = [[-46, 34, 120, -6], [-12, 42, 182, 3], [28, 36, 140, 9], [62, 26, 84, 13], [-74, 22, 66, -12], [-98, 20, 48, -14], [92, 22, 58, 12], [-30, 24, 74, -4], [48, 24, 98, 6]].slice(0, 5 + k);
    let s = '<ellipse cx="0" cy="4" rx="' + (86 + k * 8) + '" ry="9" fill="' + mix('#cfe8f6', P.ink, P.dark ? 0.4 : 0.1) + '" opacity=".55"/>';
    for (const [x, w, h, l] of sp) {
      s += '<path d="M' + (x - w / 2) + ',2 L' + (x - w * 0.2 + l) + ',' + (-h * 0.82) + ' L' + (x + l * 1.6) + ',' + (-h) + ' L' + (x + w * 0.3 + l) + ',' + (-h * 0.8) + ' L' + (x + w / 2) + ',2Z" fill="' + g + '" stroke="' + lt + '" stroke-width="1.6" stroke-opacity=".75" stroke-linejoin="round"/>' +
        '<path d="M' + (x - w * 0.12) + ',-8 L' + (x + l * 1.35) + ',' + (-h * 0.9) + '" stroke="#fff" stroke-width="2.2" opacity=".55" stroke-linecap="round"/>' +
        '<path d="M' + (x + w * 0.14) + ',-12 L' + (x + w * 0.16 + l * 1.1) + ',' + (-h * 0.5) + '" stroke="' + dk + '" stroke-width="1.4" opacity=".4"/>';
    }
    return s;
  };
  // Vệt kiếm khí hình trăng khuyết sáng rực. ?0 đỏ (Huyết Nguyệt Trảm), ?1 trắng bạc, ?2 xanh lam.
  PROPS.slash = (c, o) => {
    const v = o.a || 0, col = v === 1 ? ['#ffffff', '#cfe6ff'] : v === 2 ? ['#dcfbff', '#58c8e8'] : ['#ffd6dc', '#e8344e'];
    const g = c.lin('sl' + v, [[0, col[0], 0], [0.35, col[0], 1], [0.72, col[1], 0.9], [1, col[1], 0]], [0, 0.5, 1, 0.5]);
    return glow(c, 0, 0, 150, col[1], 0.42) + '<path d="M-150,44 Q-20,-150 164,-8 Q12,-72 -150,44Z" fill="' + g + '"/>' +
      '<path d="M-128,36 Q-10,-112 142,-8" stroke="#fff" stroke-width="3" fill="none" opacity=".85" stroke-linecap="round"/>' +
      '<path d="M-96,64 q42,-32 96,-36 M-62,84 q42,-28 104,-30" stroke="' + col[1] + '" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>';
  };
})();
