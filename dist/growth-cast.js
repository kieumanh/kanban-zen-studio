'use strict';
// v2.17.0 (Họa Cảnh): nhân vật và vật dụng trong tranh minh họa truyện ký (xem growth-scene.js).
// Nhân vật vẽ theo lối bóng mực: áo dài, đầu nhỏ, không mặt, mỗi người một màu áo, tóc, mũ và vật cầm riêng nên nhìn xa vẫn nhận ra.
// Tư thế dựng từ bộ xương hai đốt (vai → khuỷu → cổ tay) nên cùng một nhân vật làm được mọi thế mà không phải vẽ tay từng thế.
// Người đứng xa, nhỏ: tranh kể chuyện bằng nơi chốn và khoảnh khắc, không phải chân dung.
(function () {
  const Z = window.zenScene;
  const K = Z.kit;
  const { f, mix, clamp, between } = K;
  // ---- Bộ dạng từng người ---------------------------------------------------------------------------------------------------
  // robe: màu áo; trim: viền; sash: dây lưng; hair: màu tóc; kind: kiểu đầu; hold: vật cầm mặc định; ghost: mờ như hồn; s: cỡ người.
  const LOOK = {
    hero: { name: 'Hiệp khách', robe: '#3f7f86', trim: '#ecdcb4', sash: '#c4573a', hair: '#1c1620', kind: 'knot', hold: 'woodsword' },
    su: { name: 'Sư phụ Tùng Hạc', robe: '#8c8a88', trim: '#d9d4c8', sash: '#6b5a48', hair: '#efeae0', kind: 'oldman', hold: 'staff', stoop: 4 },
    moc: { name: 'Tiểu Mộc', robe: '#6a9a58', trim: '#e8e2b8', sash: '#b9803a', hair: '#2a2026', kind: 'buns', s: 0.72 },
    phong: { name: 'Hàn Phong', robe: '#23212b', trim: '#b8344a', sash: '#b8344a', hair: '#15131a', kind: 'knot', hold: 'sword' },
    giao: { name: 'Giáo chủ Lệ Vô Khuyết', robe: '#f1ece6', trim: '#c9b9b0', sash: '#a3283c', hair: '#17121a', kind: 'mask', hold: null },
    thien: { name: 'Thiền sư Không Nguyệt', robe: '#d7d3c8', trim: '#ffffff', sash: '#9a8a6a', hair: '#e8e4da', kind: 'monk', ghost: true, hold: null },
    hai: { name: 'Mạc Trấn Hải', robe: '#6b5640', trim: '#a8926f', sash: '#4a3a2c', hair: '#c9c4b8', kind: 'straw', hold: null, stoop: 3 },
    me: { name: 'Thủy Nương', robe: '#8a6c58', trim: '#b99c82', sash: '#5c4638', hair: '#2a2024', kind: 'bun', hold: null, s: 0.95 },
    be: { name: 'Cậu bé Vô Khuyết', robe: '#8d7664', trim: '#b8a48e', sash: '#5c4638', hair: '#1c1620', kind: 'knot', s: 0.56 },
    batu: { name: 'Bà Tư', robe: '#8a7a9a', trim: '#c9bcd6', sash: '#6a5a48', hair: '#d9d6d0', kind: 'scarf', hold: 'fan', s: 0.92, stoop: 3 },
    hinh: { name: 'Thiên Hình', robe: '#c9d3e0', trim: '#ffffff', sash: '#8fa3c0', hair: '#f4f4f8', kind: 'crown', hold: 'ruler', ghost: true, s: 1.08 },
    mien: { name: 'Miên Hồ', robe: '#7e5bb0', trim: '#d9c4f0', sash: '#e3b0d0', hair: '#1c1620', kind: 'fox', hold: 'fan' },
    dien: { name: 'Thiên Diện', robe: '#d28a2c', trim: '#f4d38a', sash: '#6b3d8a', hair: '#1c1620', kind: 'hood', hold: 'lamp' },
    loi: { name: 'Lôi Tốc', robe: '#3478c8', trim: '#ffe27a', sash: '#ffe27a', hair: '#1c1620', kind: 'knot', hold: 'sabers' },
    khuc: { name: 'Khúc U', robe: '#2f5a58', trim: '#79b8ae', sash: '#1a2a2a', hair: '#0d1413', kind: 'cowl', hold: 'flute' },
    bach: { name: 'Bách Tý', robe: '#8a5a2c', trim: '#d4a05a', sash: '#4a2f18', hair: '#2a1a12', kind: 'knot', hold: null, s: 1.12, arms: 6 },
    ngoc: { name: 'Ngọc Vô Hà', robe: '#8fd6e0', trim: '#e8fbff', sash: '#2a8a9a', hair: '#e8fbff', kind: 'helm', hold: null, glass: true },
    kho: { name: 'Khô Vinh', robe: '#8a8a3c', trim: '#c8c27a', sash: '#4a4a1e', hair: '#d8d2b8', kind: 'oldman', hold: 'staff', s: 1.04, stoop: 6 },
    kinh: { name: 'Ảnh Song', robe: '#a88a44', trim: '#e6cf86', sash: '#6a5420', hair: '#1c1620', kind: 'knot', hold: 'mirror' },
    suong: { name: 'Lãnh Tịch', robe: '#a9c4e0', trim: '#ffffff', sash: '#5f84b3', hair: '#f2f6fb', kind: 'long', hold: null },
    vong: { name: 'Vô Vọng', robe: '#2e2a40', trim: '#5a5478', sash: '#15121f', hair: '#0d0b14', kind: 'hood', hold: 'chain', s: 1.28 },
    dan: { name: 'Dân trấn', robe: '#9a8668', trim: '#c6b595', sash: '#5c4a36', hair: '#2a2024', kind: 'knot' },
    dan2: { name: 'Dân làng', robe: '#7f8f78', trim: '#b4c0aa', sash: '#5a4a36', hair: '#2a2024', kind: 'scarf', s: 0.95 },
    tho: { name: 'Thợ', robe: '#6a4a3a', trim: '#a0806a', sash: '#2a1c14', hair: '#1c1620', kind: 'knot', hold: 'hammer', s: 1.06 },
    quan: { name: 'Lính', robe: '#6a2a32', trim: '#d4a05a', sash: '#2a1014', hair: '#15131a', kind: 'helm2', hold: 'spear' },
    kid: { name: 'Trẻ nhỏ', robe: '#c9a063', trim: '#e6c98c', sash: '#8a5a36', hair: '#1c1620', kind: 'buns', s: 0.5 },
    thay: { name: 'Thầy thuốc', robe: '#5f8a78', trim: '#cfe0d4', sash: '#8a6a3a', hair: '#1c1620', kind: 'bun', hold: 'box', s: 0.98 },
    king: { name: 'Thần Vương', robe: '#e8d8a8', trim: '#fff6d0', sash: '#b8863a', hair: '#ffffff', kind: 'crown', ghost: true, s: 1.2, hold: null, stoop: 3 },
    god: { name: 'Thần giới', robe: '#d8c8f0', trim: '#ffffff', sash: '#9a7ac8', hair: '#f8f4ff', kind: 'crown', ghost: true, hold: null },
    heronu: { name: 'Nữ hiệp', robe: '#b8344a', trim: '#e7c46a', sash: '#e7c46a', hair: '#1c1620', kind: 'bun', hold: 'woodsword' },
    ma: { name: 'Tâm ma', robe: '#1a1620', trim: '#4a3a5a', sash: '#2a1c34', hair: '#000000', kind: 'cowl', ghost: true, s: 1.3, hold: null },
    // Kỳ ngộ (v2.17.0): mỗi người một màu áo, một kiểu đầu, một vật cầm riêng để nhìn xa vẫn nhận ra.
    luc: { name: 'Lục Lục', robe: '#8a7a62', trim: '#b8a88a', sash: '#4a3a2c', hair: '#2a2024', kind: 'buns', s: 0.62 },
    cuu: { name: 'Thiết Cửu', robe: '#5a4a44', trim: '#b09070', sash: '#2a1c14', hair: '#1c1620', kind: 'knot', hold: 'hammer', s: 1.12 },
    diep: { name: 'Diệp Thanh Đàn', robe: '#5f9a86', trim: '#e0efe6', sash: '#9a6a3a', hair: '#1c1620', kind: 'bun', hold: 'box', s: 0.98 },
    yen: { name: 'Phi Yến', robe: '#2f3a5a', trim: '#8ea0d0', sash: '#d06a4a', hair: '#15131a', kind: 'long', hold: null, s: 0.96 },
    nhan: { name: 'Ảnh Nhận', robe: '#1c1a24', trim: '#b8344a', sash: '#b8344a', hair: '#0d0b14', kind: 'cowl', hold: 'sword' },
    lamhat: { name: 'Lam Hạt', robe: '#2d6ab0', trim: '#9fd0f0', sash: '#1a3a6a', hair: '#15131a', kind: 'bun', hold: 'fan' },
    kytien: { name: 'Kỳ Tiên Ông', robe: '#7a8a68', trim: '#d0d8c0', sash: '#5a4a2c', hair: '#f0ede6', kind: 'oldman', hold: 'staff', stoop: 5 },
    cokiem: { name: 'Cô Kiếm Lãng Tử', robe: '#58626e', trim: '#aeb8c4', sash: '#2a2a34', hair: '#1c1620', kind: 'straw', hold: 'sword' },
    vantam: { name: 'Tạ Văn Tâm', robe: '#5a6aa0', trim: '#d0d8f0', sash: '#8a7a5a', hair: '#1c1620', kind: 'bun', hold: null },
    nhuy: { name: 'Kim Như Ý', robe: '#a8742c', trim: '#f0d890', sash: '#6a3a1a', hair: '#1c1620', kind: 'scarf', hold: null, s: 1.04 },
    ngao: { name: 'Hách Liên Ngạo', robe: '#7a3a2a', trim: '#e8c870', sash: '#2a1a14', hair: '#15131a', kind: 'helm2', hold: 'sword' },
    tuytang: { name: 'Túy Tăng', robe: '#c47a3a', trim: '#f0d0a0', sash: '#8a4a24', hair: '#e8e4da', kind: 'monk', hold: null, s: 1.06, stoop: 3 },
    dao: { name: 'Đào', robe: '#c8486a', trim: '#ffd0dc', sash: '#ffd04a', hair: '#1c1620', kind: 'buns', s: 0.78 },
    ly: { name: 'Lý', robe: '#3a9aa8', trim: '#d0f0f4', sash: '#ffd04a', hair: '#1c1620', kind: 'buns', s: 0.78 },
    vongtinh: { name: 'Vọng Tinh Bà', robe: '#4a4668', trim: '#c8c0e8', sash: '#8a7ac0', hair: '#e8e6ee', kind: 'scarf', hold: 'staff', s: 0.9, stoop: 4 },
    hotam: { name: 'Hồ Tam', robe: '#4a3236', trim: '#b8344a', sash: '#1a1214', hair: '#15131a', kind: 'cowl', hold: null },
    trinhho: { name: 'Trịnh Bá Hổ', robe: '#6a2a3a', trim: '#e8c870', sash: '#e8c870', hair: '#15131a', kind: 'helm2', hold: null, s: 1.08 },
    moclao: { name: 'Mộc Lão', robe: '#6a5a3a', trim: '#a89a70', sash: '#3a2c1a', hair: '#d8d4c8', kind: 'straw', hold: 'hammer', stoop: 3 },
    tieuhuyet: { name: 'Tiểu Huyết', robe: '#2a2430', trim: '#b8344a', sash: '#b8344a', hair: '#15131a', kind: 'buns', hold: 'sword', s: 0.6 },
    bacham: { name: 'Bạch Âm', robe: '#a8c8e8', trim: '#ffffff', sash: '#6a88b8', hair: '#15131a', kind: 'long', hold: null },
    // Thần giới: cùng một dáng thần, bốn sắc áo theo quy luật.
    godg: { name: 'Thần giới', robe: '#e8d098', trim: '#fff6d0', sash: '#b8863a', hair: '#fffaf0', kind: 'crown', ghost: true, hold: null },
    godj: { name: 'Thần giới', robe: '#b8e0cc', trim: '#ffffff', sash: '#4a9a7a', hair: '#f4fff8', kind: 'crown', ghost: true, hold: null },
    godb: { name: 'Thần giới', robe: '#b4c8f0', trim: '#ffffff', sash: '#5a78c0', hair: '#f4f8ff', kind: 'crown', ghost: true, hold: null },
    godr: { name: 'Thần giới', robe: '#f0c0c8', trim: '#ffffff', sash: '#c0506a', hair: '#fff4f6', kind: 'crown', ghost: true, hold: null },
  };
  // ---- Tư thế --------------------------------------------------------------------------------------------------------------------
  // legs: kiểu chân; hands: [tay trái, tay phải] (toạ độ trong khung người, chân ở y=0, đỉnh đầu ở y≈-100); lean: độ ngả của thân trên.
  const POSE = {
    stand: { legs: 'stand', hands: [[-11, -52], [11, -52]] },
    talk: { legs: 'stand', hands: [[-11, -54], [20, -74]], lean: 2 },
    zen: { legs: 'stand', hands: [[-3, -60], [3, -60]], lean: 3 },
    bow: { legs: 'stand', hands: [[-3, -66], [3, -66]], lean: 22 },
    walk: { legs: 'stride', hands: [[-12, -56], [14, -58]], lean: 4 },
    carry: { legs: 'stride', hands: [[-19, -80], [19, -82]], lean: 5, pole: true },
    martial: { legs: 'wide', hands: [[-17, -64], [26, -80]], lean: 4 },
    strike: { legs: 'lunge', hands: [[-14, -70], [32, -64]], lean: 14 },
    taichi: { legs: 'wide', hands: [[-17, -72], [17, -62]], lean: 0 },
    sit: { legs: 'sit', hands: [[-4, -26], [4, -26]], lean: 0 },
    kneel: { legs: 'kneel', hands: [[-8, -38], [8, -38]], lean: 3 },
    point: { legs: 'stand', hands: [[-11, -54], [34, -88]], lean: 0 },
    fall: { legs: 'stride', hands: [[-24, -100], [24, -96]], lean: -22 },
    cast: { legs: 'wide', hands: [[-20, -106], [20, -106]], lean: -4 },
    hold: { legs: 'stand', hands: [[-8, -64], [8, -64]], lean: 2 },
    hurt: { legs: 'kneel', hands: [[-10, -66], [12, -40]], lean: 8 },
    lie: { legs: 'stand', hands: [[-8, -50], [8, -50]], lie: true },
    float: { legs: 'float', hands: [[-14, -62], [14, -62]], lean: 0 },
    stagger: { legs: 'stride', hands: [[-12, -48], [18, -60]], lean: 12 },
    back: { legs: 'stand', hands: [[-10, -52], [10, -52]], back: true },
  };
  // Thân dưới (váy áo + chân) theo kiểu chân.
  const SKIRT = {
    stand: 'M-8,-48 C-10,-30 -14,-14 -16,-2 Q0,3 16,-2 C14,-14 10,-30 8,-48Z',
    stride: 'M-8,-48 C-10,-32 -15,-16 -21,-3 Q-12,3 -6,-3 L1,-24 L8,-4 Q17,3 25,-3 C17,-16 10,-32 8,-48Z',
    wide: 'M-8,-48 C-14,-38 -26,-26 -32,-3 Q-22,3 -14,-3 L-4,-26 L0,-28 L4,-26 L14,-3 Q22,3 32,-3 C26,-26 14,-38 8,-48Z',
    lunge: 'M-8,-48 C-14,-34 -28,-18 -36,-3 Q-26,3 -16,-3 C-10,-14 -4,-24 4,-28 C10,-22 18,-14 26,-6 Q32,0 38,-4 C32,-18 20,-34 8,-48Z',
    sit: 'M-8,-30 C-14,-18 -34,-12 -38,-2 Q0,7 38,-2 C34,-12 14,-18 8,-30Z',
    kneel: 'M-8,-38 C-10,-26 -16,-12 -17,-2 Q0,4 17,-2 C16,-12 10,-26 8,-38Z',
    float: 'M-8,-48 C-9,-30 -5,-12 0,8 C5,-12 9,-30 8,-48Z',
  };
  const FEET = { stand: [[-7, -1], [7, -1]], stride: [[-14, -1], [18, -1]], wide: [[-25, -1], [25, -1]], lunge: [[-26, -1], [31, -3]], sit: [], kneel: [], float: [] };
  const DROP = { sit: 20, kneel: 11 };
  // ---- Cánh tay -------------------------------------------------------------------------------------------------------------------
  const A1 = 17, A2 = 17;
  function armPts(sh, hand, bend) {
    let dx = hand[0] - sh[0], dy = hand[1] - sh[1];
    let d = Math.hypot(dx, dy) || 1;
    const max = A1 + A2 - 0.6;
    if (d > max) {
      hand = [sh[0] + (dx * max) / d, sh[1] + (dy * max) / d];
      dx = hand[0] - sh[0];
      dy = hand[1] - sh[1];
      d = max;
    }
    const a = (A1 * A1 - A2 * A2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A1 * A1 - a * a));
    const ux = dx / d, uy = dy / d;
    return [sh, [sh[0] + ux * a - uy * h * bend, sh[1] + uy * a + ux * h * bend], hand];
  }
  // ---- Đầu --------------------------------------------------------------------------------------------------------------------------
  function head(L, ink) {
    const skin = L.glass ? '#dff3f6' : '#e8c9a8', hair = L.hair, k = L.kind;
    let s = '';
    const back = (k === 'long' || k === 'mask' || k === 'fox') ? '<path class="sc-hair" d="M-6.4,-93 C-9,-80 -8,-66 -5,-54 L5,-54 C8,-66 9,-80 6.4,-93Z" fill="' + hair + '"/>' : '';
    s += back;
    s += '<rect x="-2.4" y="-89" width="4.8" height="5" fill="' + skin + '"/>';
    s += '<circle cx="0" cy="-93" r="6.4" fill="' + skin + '"/>';
    const cap = '<path d="M-6.7,-92 A6.7,6.7 0 0 1 6.7,-92 Q3.5,-96.5 0,-95.6 Q-3.5,-96.5 -6.7,-92Z" fill="' + hair + '"/>';
    if (k === 'knot') s += cap + '<circle cx="0" cy="-101" r="3" fill="' + hair + '"/><path d="M-3,-98 h6" stroke="' + L.sash + '" stroke-width="1.2"/>';
    else if (k === 'bun') s += cap + '<circle cx="0" cy="-100.5" r="3.6" fill="' + hair + '"/>';
    else if (k === 'buns') s += cap + '<circle cx="-5" cy="-99" r="2.9" fill="' + hair + '"/><circle cx="5" cy="-99" r="2.9" fill="' + hair + '"/>';
    else if (k === 'oldman') s += '<path d="M-6.8,-92 A6.8,6.8 0 0 1 6.8,-92 Q4,-95 0,-94.5 Q-4,-95 -6.8,-92Z" fill="' + hair + '"/><path d="M-4.2,-88.5 Q0,-71 4.2,-88.5Z" fill="' + hair + '"/><path d="M-6.4,-93 C-7.5,-86 -7,-80 -5.5,-76" stroke="' + hair + '" stroke-width="2.2" fill="none"/><path d="M6.4,-93 C7.5,-86 7,-80 5.5,-76" stroke="' + hair + '" stroke-width="2.2" fill="none"/>';
    else if (k === 'monk') s += '<path d="M-6.5,-96 Q0,-101 6.5,-96" stroke="' + mix(skin, '#000', 0.2) + '" stroke-width="1" fill="none" opacity=".4"/>';
    else if (k === 'straw') s += '<path d="M-17,-94 L0,-110 L17,-94 Q0,-89 -17,-94Z" fill="#c9a869"/><path d="M-17,-94 Q0,-89 17,-94" stroke="#8a6a34" stroke-width="1.4" fill="none"/><path d="M-4.2,-88.5 Q0,-76 4.2,-88.5Z" fill="#dcd6c8"/>';
    else if (k === 'scarf') s += '<path d="M-7.4,-92 A7.4,7.4 0 0 1 7.4,-92 L8,-86 Q0,-83 -8,-86Z" fill="' + mix(L.robe, '#ffffff', 0.15) + '"/>';
    else if (k === 'crown') s += '<path d="M-6.8,-92 A6.8,6.8 0 0 1 6.8,-92 Q3.5,-96 0,-95.4 Q-3.5,-96 -6.8,-92Z" fill="' + hair + '"/><path d="M-7,-97 L-4,-103 L0,-98 L4,-103 L7,-97Z" fill="#f2cf6a"/>';
    else if (k === 'hood' || k === 'cowl') s += '<path d="M-8.4,-86 C-9,-100 -3,-104 0,-104 C3,-104 9,-100 8.4,-86 Q0,-90 -8.4,-86Z" fill="' + L.robe + '"/><ellipse cx="0" cy="-92.5" rx="4.4" ry="5" fill="#0c0a10"/>';
    else if (k === 'helm') s += '<path d="M-7.4,-92 A7.4,7.4 0 0 1 7.4,-92 L7.4,-90 L-7.4,-90Z" fill="' + L.trim + '"/><path d="M0,-99 L0,-106" stroke="' + L.trim + '" stroke-width="2"/>';
    else if (k === 'helm2') s += '<path d="M-7.4,-92 A7.4,7.4 0 0 1 7.4,-92 L7.4,-90 L-7.4,-90Z" fill="#4a3a30"/><path d="M0,-99 L0,-107" stroke="#b8344a" stroke-width="2.4"/>';
    else if (k === 'long') s += cap + '<path d="M-6.5,-92 C-9,-80 -8,-68 -6,-58" stroke="' + hair + '" stroke-width="2.4" fill="none"/>';
    else if (k === 'mask') s += cap + '<circle cx="0" cy="-93" r="5.6" fill="#f3f1ec"/><path d="M-2.2,-97 A5.4,5.4 0 1 0 -2.2,-89 A3.6,3.6 0 1 1 -2.2,-97Z" fill="#2a2430"/>';
    else if (k === 'fox') s += cap + '<path d="M-6,-95 L-8,-104 L-2.4,-97Z M6,-95 L8,-104 L2.4,-97Z" fill="#f4f0f6"/><path d="M-5.8,-93 Q0,-99 5.8,-93 L0,-86Z" fill="#f4f0f6"/><path d="M-3,-92.5 l2,0.6 M3,-92.5 l-2,0.6" stroke="#c0305a" stroke-width="1.2"/>';
    else s += cap;
    return s;
  }
  // ---- Vật cầm trong tay -------------------------------------------------------------------------------------------------------------
  // Tọa độ gốc tại bàn tay (hx, hy); ang: độ nghiêng.
  function holding(kind, hx, hy, L, ink) {
    const g = (inner, ang) => '<g transform="translate(' + f(hx) + ' ' + f(hy) + ') rotate(' + (ang || 0) + ')">' + inner + '</g>';
    switch (kind) {
      case 'staff': return g('<path d="M0,26 L0,-58" stroke="#6b4a2c" stroke-width="2.6" stroke-linecap="round"/>', 0);
      case 'woodsword': return g('<path d="M0,6 L0,-6 M-4,-6 h8" stroke="#6b4a2c" stroke-width="2.2"/><path d="M-2,-6 L-2,-46 L2,-46 L2,-6Z" fill="#c69a63"/><path d="M-2,-18 l2,1.4" stroke="#6b4a2c" stroke-width="1.2"/>', 20);
      case 'sword': return g('<path d="M0,5 L0,-5 M-5,-5 h10" stroke="#bfae7a" stroke-width="2"/><path d="M-1.6,-5 L-1.6,-54 L0,-58 L1.6,-54 L1.6,-5Z" fill="#dfe6ee"/>', 24);
      case 'sabers': return g('<path d="M0,4 L0,-4 M-4,-4 h8" stroke="#c9b25a" stroke-width="2"/><path d="M-1.6,-4 L-1.6,-40 Q0,-48 1.6,-40 L1.6,-4Z" fill="#e8f2ff"/><path d="M-1,-6 L-1,-40" stroke="#6ab4ff" stroke-width="1" opacity=".8"/>', 26) + g('<path d="M0,4 L0,-4 M-4,-4 h8" stroke="#c9b25a" stroke-width="2"/><path d="M-1.6,-4 L-1.6,-40 Q0,-48 1.6,-40 L1.6,-4Z" fill="#e8f2ff"/>', -30);
      case 'fan': return g('<path d="M0,2 L-14,-16 Q0,-26 14,-16Z" fill="' + L.sash + '" stroke="' + L.trim + '" stroke-width="1"/><path d="M0,2 L0,-20 M0,2 L-9,-18 M0,2 L9,-18" stroke="' + L.trim + '" stroke-width=".8"/>', 8);
      case 'lamp': return g('<path d="M0,0 L0,16" stroke="' + ink + '" stroke-width="1.4"/><ellipse cx="0" cy="22" rx="7" ry="9" fill="#ffc86a"/><path d="M-5,13 h10 M-4,31 h8" stroke="' + ink + '" stroke-width="2"/>', 0);
      case 'flute': return g('<path d="M-12,-3 L16,3" stroke="#efe9d6" stroke-width="3.2" stroke-linecap="round"/><circle cx="-3" cy="-1.4" r=".9" fill="#222"/><circle cx="4" cy="0.4" r=".9" fill="#222"/>', -22);
      case 'ruler': return g('<path d="M0,10 L0,-32" stroke="#bfe8d0" stroke-width="4" stroke-linecap="round"/><path d="M0,10 L0,-32" stroke="#ffffff" stroke-width="1.4" opacity=".7"/>', 0);
      case 'mirror': return g('<circle cx="0" cy="-14" r="11" fill="#d8bc6a" stroke="#8a6a24" stroke-width="2"/><circle cx="0" cy="-14" r="8" fill="#f4ecc8"/><path d="M0,-3 L0,8" stroke="#8a6a24" stroke-width="3"/>', 0);
      case 'chain': return g('<path d="M0,0 Q16,10 22,28 T34,52" stroke="#1a1822" stroke-width="3" fill="none" stroke-dasharray="4 2.4"/>', 0);
      case 'hammer': return g('<path d="M0,6 L0,-22" stroke="#6b4a2c" stroke-width="2.4"/><rect x="-7" y="-30" width="14" height="9" fill="#4a4e58"/>', 18);
      case 'spear': return g('<path d="M0,26 L0,-66" stroke="#6b4a2c" stroke-width="2.2"/><path d="M0,-66 L-3,-58 L3,-58Z M0,-80 L3,-66 L-3,-66Z" fill="#cfd6df"/><path d="M0,-62 l0,6" stroke="#b8344a" stroke-width="3"/>', 0);
      case 'box': return g('<rect x="-9" y="2" width="18" height="14" rx="2" fill="#8a5a36"/><rect x="-9" y="2" width="18" height="4" fill="#6b4226"/>', 0);
      default: return '';
    }
  }
  // ---- Một người ---------------------------------------------------------------------------------------------------------------------
  // Trả về nhóm SVG có chân ở (0,0), đỉnh đầu ở khoảng y=-100 (cỡ theo bộ dạng).
  function draw(c, who, poseId) {
    const L = LOOK[who === 'hero' && Z.heroKind === 'nu' ? 'heronu' : who] || LOOK.dan, Pz = POSE[poseId] || POSE.stand, P = c.P;
    const ink = P.ink;
    const robe = L.glass ? mix(L.robe, '#ffffff', 0.35) : L.robe;
    const g = c.lin('fg' + robe.slice(1), [[0, mix(robe, '#ffffff', 0.22)], [0.55, robe], [1, mix(robe, ink, P.dark ? 0.55 : 0.35)]]);
    const drop = DROP[Pz.legs] || 0;
    const sc = L.s || 1;
    const stoop = (L.stoop || 0) + (Pz.lean || 0);
    let s = '<g class="sc-fig" transform="scale(' + sc + ') ' + (Pz.lie ? 'translate(46 -8) rotate(-86)' : '') + '">';
    // bóng dưới chân
    if (!L.ghost) s += '<ellipse cx="0" cy="1.4" rx="' + f(20 * (Pz.legs === 'wide' || Pz.legs === 'sit' || Pz.legs === 'lunge' ? 1.5 : 1)) + '" ry="3.4" fill="' + ink + '" opacity=".28"/>';
    // vật phía sau lưng (đòn gánh gác vai nằm sau đầu)
    let after = '';
    // thân dưới
    const skirt = SKIRT[Pz.legs] || SKIRT.stand;
    const fade = L.ghost ? c.lin('gh' + robe.slice(1), [[0, robe, 0.92], [0.6, robe, 0.7], [1, robe, 0]]) : g;
    s += '<path d="' + skirt + '" fill="' + fade + '"/>';
    if (!L.ghost) {
      s += '<path d="' + skirt + '" fill="none" stroke="' + L.trim + '" stroke-width="1.2" opacity=".35" stroke-dasharray="0 0"/>';
      for (const ft of FEET[Pz.legs] || []) s += '<ellipse cx="' + ft[0] + '" cy="' + ft[1] + '" rx="5.2" ry="2.4" fill="' + mix(ink, '#000', 0.2) + '"/>';
    }
    // thân trên (xoay quanh hông khi ngả người)
    const pivot = -46 + drop;
    s += '<g transform="translate(0 ' + drop + ') rotate(' + stoop + ' 0 -46)">';
    s += '<path d="M-9,-85 Q-10.8,-66 -8.2,-46 L8.2,-46 Q10.8,-66 9,-85 Q0,-89.5 -9,-85Z" fill="' + fade + '"/>';
    s += '<path d="M-3.4,-87 L0,-72 L3.4,-87Z" fill="' + L.trim + '" opacity=".9"/>';
    s += '<path d="M-8.4,-52 Q0,-49.4 8.4,-52 L8.2,-46.4 Q0,-44 -8.2,-46.4Z" fill="' + L.sash + '"/>';
    if (L.glass) s += '<path d="M-6,-82 L-3,-56 M5,-80 L2,-54 M-8,-70 L8,-66" stroke="#ffffff" stroke-width="1" opacity=".7"/>';
    // cánh tay
    const arms = [armPts([-8.6, -83.5], Pz.hands[0], 1), armPts([8.6, -83.5], Pz.hands[1], -1)];
    const extra = [];
    if (L.arms === 6) {
      extra.push(armPts([-7, -80], [-24, -60], 1), armPts([7, -80], [26, -58], -1), armPts([-6, -78], [-19, -88], 1), armPts([6, -78], [22, -92], -1));
    }
    if (Pz.pole) after += '<path d="M-38,-86 L38,-80" stroke="#2a2018" stroke-width="2.8" stroke-linecap="round"/><g class="sc-sway" style="transform-origin:-34px -86px"><path d="M-34,-86 L-34,-66" stroke="#6b4a2c" stroke-width="1"/><path d="M-42,-66 h16 l-2,16 h-12Z" fill="#8a6a44"/><ellipse cx="-34" cy="-66" rx="8" ry="1.8" fill="#9fc6d8"/></g><g class="sc-sway" style="transform-origin:34px -80px"><path d="M34,-80 L34,-60" stroke="#6b4a2c" stroke-width="1"/><path d="M26,-60 h16 l-2,16 h-12Z" fill="#8a6a44"/><ellipse cx="34" cy="-60" rx="8" ry="1.8" fill="#9fc6d8"/></g>';
    const sleeve = (a, w) => '<path d="M' + a.map(pt0).join(' L') + '" stroke="' + robe + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="' + (L.ghost ? 0.88 : 1) + '"/>';
    const pt0 = (p) => f(p[0]) + ',' + f(p[1]);
    for (const a of extra) s += sleeve(a, 4.4) + '<circle cx="' + f(a[2][0]) + '" cy="' + f(a[2][1]) + '" r="1.9" fill="#e8c9a8"/>';
    for (const a of arms) {
      s += sleeve(a, 6.8);
      const e = a[1], h = a[2];
      const ux = h[0] - e[0], uy = h[1] - e[1], d = Math.hypot(ux, uy) || 1;
      s += '<path d="M' + f(h[0] - (ux / d) * 5) + ',' + f(h[1] - (uy / d) * 5) + ' L' + f(h[0]) + ',' + f(h[1]) + '" stroke="' + L.trim + '" stroke-width="8" stroke-linecap="round" opacity=".92"/>';
      s += '<circle cx="' + f(h[0] + (ux / d) * 1.8) + '" cy="' + f(h[1] + (uy / d) * 1.8) + '" r="2.5" fill="' + (L.glass ? '#dff3f6' : '#e8c9a8') + '"/>';
    }
    // đầu
    s += '<g class="sc-head">' + head(L, ink) + '</g>';
    // vật cầm
    const hold = Pz.hold !== undefined ? Pz.hold : L.hold;
    if (hold && !Pz.pole) {
      const r = arms[1][2];
      s += holding(hold, r[0], r[1], L, ink);
    }
    s += after + '</g></g>';
    return s;
  }
  Z.CAST = { LOOK, POSE, draw, name: (who) => (LOOK[who] || LOOK.dan).name, has: (who) => !!LOOK[who] };
})();
