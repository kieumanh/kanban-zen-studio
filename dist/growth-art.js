'use strict';
// v1.83.0 (Kiếm Ảnh): nhân vật phong cách kiếm hiệp, chibi, vẽ bằng SVG — không dùng ảnh ngoài, không mô phỏng nhân vật có sẵn.
//   Nam: thiếu hiệp áo thanh lam, ngọc quan cài trâm, tóc buộc đuôi cao với dải lụa đỏ, kiếm đeo sau lưng, ngọc bội bên hông.
//   Nữ: nữ hiệp áo trắng khoác đỏ son, búi tóc cao cài trâm bộ dao, lụa khoác (phi bạch) bay quanh vai, kiếm tua đỏ bên hông.
// v1.84.0: tên tư thế đổi sang Hán Việt (Đàm tiếu, Luyện kiếm, Thái cực, Tọa thiền).
// Bốn tư thế (giữ nguyên mã để dữ liệu và lựa chọn cũ vẫn đúng): talk = cười nói (nam cầm quạt), martial = luyện kiếm (vung kiếm, có vệt kiếm khí),
// taichi = thái cực (vòng âm dương xoay sau lưng), zen = tọa thiền trên đá (khí tụ, hạt sáng bay lên).
// Hoạt họa nằm trong growth.css; mọi chuyển động phụ (tóc, dải lụa, ngọc bội, tay áo) lệch pha nhau cho mềm và tự nhiên.
// zenHero.svg(hero, pose) trả về chuỗi SVG nhân vật; zenHero.scene() trả về phông sơn thủy cho sân khấu.
(function () {
  const SKIN = '#ffe3cf', BLUSH = '#ff9fb2', INK = '#231a2b';
  const PALETTE = {
    nam: {
      hair: '#1d1822', hairHi: '#3b3147', ribbon: '#c23a2e', ribbon2: '#e0604f', crown: '#efe4c4', jade: '#5fae8f',
      robe: '#2e5466', robe2: '#21404f', sleeve: '#2e5466', cuff: '#c9a24a', lining: '#e3d8bb', inner: '#f6f1e6', trim: '#c9a24a',
      belt: '#1c2830', skirt: '#e6dfd1', boot: '#1d1822', sheath: '#3a2a21', blade: '#e8eef3', tassel: '#c23a2e', qi: '#6cc3d6',
    },
    nu: {
      hair: '#1d1822', hairHi: '#3b3147', ribbon: '#e0566f', ribbon2: '#f39aae', crown: '#d8b25a', jade: '#7fd0b0',
      robe: '#b8344a', robe2: '#952a3c', sleeve: '#fbe6ea', cuff: '#b8344a', lining: '#f8dfe3', inner: '#fff7f3', trim: '#e7c46a',
      belt: '#e7c46a', skirt: '#f6dde1', boot: '#7a2a3a', sheath: '#f1ebe0', blade: '#e8eef3', tassel: '#d63c55', qi: '#ff9fbd', scarf: '#f4b4c4',
    },
  };
  const POSES = [
    { id: 'talk', label: 'Đàm tiếu' },
    { id: 'martial', label: 'Luyện kiếm' },
    { id: 'taichi', label: 'Thái cực' },
    { id: 'zen', label: 'Tọa thiền' },
  ];
  const HERO_LABEL = { nam: 'Thiếu hiệp', nu: 'Nữ hiệp' };

  // ---- Phía sau thân: đuôi tóc, dải lụa, kiếm sau lưng, lụa khoác -------------------------------------------------------
  function back(h, c, p) {
    if (h === 'nam') {
      const sword =
        '<g class="gr-backsword"><path d="M136,176 L66,104" stroke="' + c.sheath + '" stroke-width="7.5" stroke-linecap="round"/>' +
        '<path d="M131,171 L139,179" stroke="' + c.trim + '" stroke-width="8" stroke-linecap="round"/>' +
        (p === 'martial'
          ? ''
          : '<path d="M60,110 L72,98" stroke="' + c.trim + '" stroke-width="3.4" stroke-linecap="round"/>' +
            '<path d="M64,102 L54,92" stroke="#5a3b2c" stroke-width="5" stroke-linecap="round"/><circle cx="52" cy="90" r="3.2" fill="' + c.trim + '"/>' +
            '<g class="gr-swordtassel"><path d="M52,92 C48,100 50,108 46,116" stroke="' + c.tassel + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M46,112 l-3,9 M46,112 l1,9 M46,112 l4,8" stroke="' + c.tassel + '" stroke-width="1.6" stroke-linecap="round"/></g>') +
        '</g>';
      return (
        sword +
        '<g class="gr-tail"><path d="M104,34 C134,26 160,46 156,76 C153,98 160,114 172,128 C150,124 138,104 138,84 C138,64 128,50 108,46Z" fill="' + c.hair + '"/>' +
        '<path d="M140,60 C146,76 144,92 150,106" stroke="' + c.hairHi + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></g>' +
        '<g class="gr-ribbon"><path d="M108,36 C124,42 134,58 146,64 L141,71 C128,62 118,52 105,42Z" fill="' + c.ribbon + '"/>' +
        '<path d="M108,38 C118,56 122,76 136,92 L129,96 C116,80 110,60 103,42Z" fill="' + c.ribbon2 + '"/></g>'
      );
    }
    const hipSword =
      p === 'martial'
        ? ''
        : '<g class="gr-hipsword"><path d="M72,148 L44,200" stroke="' + c.sheath + '" stroke-width="7" stroke-linecap="round"/><path d="M70,152 L76,141" stroke="' + c.trim + '" stroke-width="8" stroke-linecap="round"/>' +
          '<path d="M77,140 L82,130" stroke="#6b4a3a" stroke-width="5" stroke-linecap="round"/><path d="M47,194 L43,202" stroke="' + c.trim + '" stroke-width="8" stroke-linecap="round"/>' +
          '<g class="gr-swordtassel"><path d="M83,129 C88,138 86,146 90,154" stroke="' + c.tassel + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M90,150 l-2,9 M90,150 l2,9 M90,150 l5,7" stroke="' + c.tassel + '" stroke-width="1.6" stroke-linecap="round"/></g></g>';
    return (
      '<g class="gr-scarf"><path d="M52,166 C36,130 66,100 100,104 C134,100 164,130 148,166" stroke="' + c.scarf + '" stroke-width="5.5" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M52,166 C44,178 46,190 36,200" stroke="' + c.scarf + '" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M148,166 C156,178 154,190 164,198" stroke="' + c.scarf + '" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".7"/></g>' +
      '<path d="M56,74 C50,28 150,28 144,74 L150,150 Q138,160 124,150 L120,118 L80,118 L76,150 Q62,160 50,150Z" fill="' + c.hair + '"/>' +
      hipSword
    );
  }

  // ---- Đầu ---------------------------------------------------------------------------------------------------------------
  function hairFront(h, c) {
    if (h === 'nam')
      return (
        '<ellipse cx="100" cy="35" rx="12.5" ry="11" fill="' + c.hair + '"/>' +
        '<path d="M89,32 L91,20 L100,25 L109,20 L111,32Z" fill="' + c.crown + '" stroke="' + c.trim + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<rect x="82" y="28" width="36" height="3.4" rx="1.7" fill="' + c.jade + '"/><circle cx="118" cy="29.7" r="2.6" fill="' + c.jade + '"/>' +
        '<path d="M60,80 C55,40 145,40 140,80 C134,63 121,55 106,56 L100,72 L95,56 C80,55 66,63 60,80Z" fill="' + c.hair + '"/>' +
        '<path d="M80,61 C87,57 93,57 97,59" stroke="' + c.hairHi + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>' +
        '<g class="gr-lock gr-lock-l"><path d="M62,70 C55,94 58,116 67,130 C70,112 68,92 71,79Z" fill="' + c.hair + '"/></g>' +
        '<g class="gr-lock gr-lock-r"><path d="M138,70 C145,94 142,116 133,130 C130,112 132,92 129,79Z" fill="' + c.hair + '"/></g>'
      );
    const blossom = (x, y, s) =>
      '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      [0, 72, 144, 216, 288].map((a) => '<ellipse cx="0" cy="-5.5" rx="3.6" ry="4.6" fill="#f07c96" transform="rotate(' + a + ')"/>').join('') +
      '<circle r="2.6" fill="#ffe08a"/></g>';
    return (
      '<ellipse cx="85" cy="28" rx="11" ry="14" fill="' + c.hair + '" transform="rotate(-24 85 28)"/>' +
      '<ellipse cx="115" cy="28" rx="11" ry="14" fill="' + c.hair + '" transform="rotate(24 115 28)"/>' +
      '<circle cx="100" cy="38" r="10" fill="' + c.hair + '"/>' +
      '<path d="M116,24 L142,12" stroke="' + c.crown + '" stroke-width="2.6" stroke-linecap="round"/><circle cx="143" cy="11.5" r="3.4" fill="' + c.jade + '"/>' +
      '<g class="gr-bodao"><path d="M138,15 L139,40" stroke="' + c.crown + '" stroke-width="1.2"/><circle cx="139" cy="27" r="2" fill="' + c.jade + '"/><circle cx="139" cy="36" r="2.2" fill="' + c.crown + '"/>' +
      '<path d="M139,40 l-3,9 M139,40 l0,10 M139,40 l3,9" stroke="' + c.tassel + '" stroke-width="1.6" stroke-linecap="round"/></g>' +
      blossom(80, 38, 1) +
      '<path d="M60,80 C55,40 145,40 140,80 C134,63 121,55 106,56 L100,70 L94,56 C79,55 66,63 60,80Z" fill="' + c.hair + '"/>' +
      '<path d="M80,61 C87,57 93,57 97,59" stroke="' + c.hairHi + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>' +
      '<g class="gr-lock gr-lock-l"><path d="M62,70 C54,98 57,122 66,138 C70,118 68,94 71,79Z" fill="' + c.hair + '"/></g>' +
      '<g class="gr-lock gr-lock-r"><path d="M138,70 C146,98 143,122 134,138 C130,118 132,94 129,79Z" fill="' + c.hair + '"/></g>' +
      '<path d="M100,61 l2.2,3 -2.2,3 -2.2,-3Z" fill="#d63c55"/>'
    );
  }
  function face(h, open, talk) {
    const brows =
      h === 'nam'
        ? '<path d="M92,71 Q84,66 75,67 M108,71 Q116,66 125,67" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : '<path d="M76,71 q8,-5 16,-1 M108,70 q8,-4 16,1" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".6"/>';
    let eyes;
    if (!open) eyes = '<path d="M77,86 q7,6 14,0 M109,86 q7,6 14,0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    else if (h === 'nam')
      eyes =
        '<g class="gr-eyes"><path d="M77,82 q7,-5 14,0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="84" cy="85" rx="4.8" ry="5.8" fill="' + INK + '"/><circle cx="85.8" cy="82.8" r="1.8" fill="#fff"/>' +
        '<path d="M109,82 q7,-5 14,0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="116" cy="85" rx="4.8" ry="5.8" fill="' + INK + '"/><circle cx="117.8" cy="82.8" r="1.8" fill="#fff"/></g>';
    else
      eyes =
        '<g class="gr-eyes"><ellipse cx="84" cy="85" rx="5.4" ry="7" fill="' + INK + '"/><circle cx="86" cy="82" r="2.2" fill="#fff"/><circle cx="82.5" cy="88" r="1" fill="#fff" opacity=".8"/><path d="M78,80 l-4,-3 M79,78 l-3,-4" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<ellipse cx="116" cy="85" rx="5.4" ry="7" fill="' + INK + '"/><circle cx="118" cy="82" r="2.2" fill="#fff"/><circle cx="114.5" cy="88" r="1" fill="#fff" opacity=".8"/><path d="M122,80 l4,-3 M121,78 l3,-4" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/></g>';
    const mouth = talk
      ? '<ellipse class="gr-mouth" cx="100" cy="99" rx="4.6" ry="3.8" fill="#b8445e"/>'
      : h === 'nam'
        ? '<path d="M93,97 q7,5 15,-1" stroke="#b8445e" stroke-width="2.3" fill="none" stroke-linecap="round"/>'
        : '<path d="M94,97 q6,5 12,0" stroke="#c4475f" stroke-width="2.3" fill="none" stroke-linecap="round"/>';
    return (
      '<path d="M94,112 L106,112 L106,120 L94,120Z" fill="' + SKIN + '"/>' +
      '<ellipse cx="100" cy="82" rx="38" ry="35" fill="' + SKIN + '"/>' +
      brows + eyes +
      '<ellipse cx="73" cy="96" rx="6.5" ry="3.6" fill="' + BLUSH + '" opacity=".55"/><ellipse cx="127" cy="96" rx="6.5" ry="3.6" fill="' + BLUSH + '" opacity=".55"/>' +
      mouth
    );
  }

  // ---- Thân áo ------------------------------------------------------------------------------------------------------------
  // kind: 'stand' (áo dài tới mắt cá), 'wide' (thế tấn: vạt áo xẻ, lộ chân), 'seat' (tọa thiền: vạt áo trải rộng)
  function torso(h, c, kind) {
    const hemY = kind === 'stand' ? 200 : kind === 'wide' ? 184 : 182;
    const hemX = kind === 'stand' ? 42 : kind === 'wide' ? 46 : 44;
    if (h === 'nam')
      return (
        '<path d="M70,114 Q100,106 130,114 L' + (100 + hemX) + ',' + hemY + ' Q100,' + (hemY + 10) + ' ' + (100 - hemX) + ',' + hemY + 'Z" fill="' + c.robe + '"/>' +
        '<path d="M100,160 L' + (kind === 'stand' ? 96 : 100) + ',' + (hemY + 6) + '" stroke="' + c.robe2 + '" stroke-width="2"/>' +
        '<path d="M' + (100 - hemX) + ',' + hemY + ' Q100,' + (hemY + 10) + ' ' + (100 + hemX) + ',' + hemY + '" stroke="' + c.trim + '" stroke-width="2.4" fill="none"/>' +
        '<path d="M86,112 L100,134 L114,112" stroke="' + c.inner + '" stroke-width="8" fill="none" stroke-linejoin="round"/>' +
        '<path d="M84,113 L100,133" stroke="' + c.robe2 + '" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M117,112 L91,150" stroke="' + c.lining + '" stroke-width="6" stroke-linecap="round"/><path d="M117,112 L91,150" stroke="' + c.trim + '" stroke-width="1.4" transform="translate(2.6 1.2)"/>' +
        '<rect x="69" y="147" width="62" height="12" rx="3" fill="' + c.belt + '"/><rect x="94" y="148.5" width="12" height="9" rx="2" fill="' + c.jade + '"/>' +
        '<g class="gr-pendant"><path d="M116,159 L116,170" stroke="' + c.tassel + '" stroke-width="1.6"/><circle cx="116" cy="174" r="5" fill="' + c.jade + '" stroke="#3f8a6c" stroke-width="1.2"/><circle cx="116" cy="174" r="1.6" fill="' + c.robe2 + '"/>' +
        '<path d="M116,179 l-2.5,12 M116,179 l0,13 M116,179 l2.5,12" stroke="' + c.tassel + '" stroke-width="1.6" stroke-linecap="round"/></g>'
      );
    return (
      '<path d="M74,146 Q100,140 126,146 L' + (100 + hemX + 4) + ',' + (hemY + 2) + ' Q100,' + (hemY + 12) + ' ' + (100 - hemX - 4) + ',' + (hemY + 2) + 'Z" fill="' + c.skirt + '"/>' +
      '<path d="M' + (100 - hemX - 2) + ',' + (hemY - 6) + ' Q100,' + (hemY + 4) + ' ' + (100 + hemX + 2) + ',' + (hemY - 6) + '" stroke="#efc3cc" stroke-width="2" fill="none"/>' +
      '<path d="M72,114 Q100,108 128,114 L126,150 L74,150Z" fill="' + c.inner + '"/>' +
      '<path d="M70,114 L89,113 L84,' + (hemY - 6) + ' L' + (100 - hemX + 2) + ',' + (hemY - 4) + 'Z" fill="' + c.robe + '"/>' +
      '<path d="M130,114 L111,113 L116,' + (hemY - 6) + ' L' + (100 + hemX - 2) + ',' + (hemY - 4) + 'Z" fill="' + c.robe + '"/>' +
      '<path d="M89,113 L84,' + (hemY - 6) + ' M111,113 L116,' + (hemY - 6) + '" stroke="' + c.trim + '" stroke-width="1.8"/>' +
      '<path d="M86,112 L100,132 L114,112" stroke="' + c.robe2 + '" stroke-width="4" fill="none" stroke-linejoin="round"/>' +
      '<rect x="74" y="142" width="52" height="9" rx="4" fill="' + c.belt + '"/>' +
      '<g class="gr-sash"><path d="M100,150 C96,166 92,176 95,192" stroke="' + c.ribbon + '" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M102,150 C108,164 110,174 106,188" stroke="' + c.ribbon2 + '" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>' +
      '<circle cx="100" cy="146.5" r="4.2" fill="' + c.ribbon + '"/>'
    );
  }
  // Tay áo rộng: vai ở (0,0), cánh tay hướng +y; xoay cả nhóm để đổi tư thế. hold = đồ cầm trong tay (kiếm, quạt).
  function arm(c, x, y, len, cls, hold) {
    return (
      '<g transform="translate(' + x + ' ' + y + ')"><g class="gr-arm ' + cls + '">' +
      (hold || '') +
      '<path d="M-8,-3 L8,-3 L15,' + (len - 4) + ' Q0,' + (len + 5) + ' -15,' + (len - 4) + 'Z" fill="' + c.sleeve + '"/>' +
      '<path d="M-15,' + (len - 4) + ' Q0,' + (len + 5) + ' 15,' + (len - 4) + '" stroke="' + c.cuff + '" stroke-width="3" fill="none"/>' +
      '<ellipse cx="0" cy="' + (len - 1) + '" rx="10" ry="3.6" fill="' + c.lining + '"/>' +
      '<circle cx="0" cy="' + (len + 4) + '" r="6.4" fill="' + SKIN + '"/></g></g>'
    );
  }
  const sword = (c, len) =>
    '<g class="gr-blade"><path d="M-2.4,' + (len + 10) + ' L2.4,' + (len + 10) + ' L1.4,' + (len + 62) + ' L0,' + (len + 70) + ' L-1.4,' + (len + 62) + 'Z" fill="' + c.blade + '" stroke="#9fb3c2" stroke-width=".7"/>' +
    '<path d="M0,' + (len + 12) + ' L0,' + (len + 60) + '" stroke="#ffffff" stroke-width=".9" opacity=".8"/>' +
    '<rect x="-8" y="' + (len + 7) + '" width="16" height="3.4" rx="1.7" fill="' + c.trim + '"/>' +
    '<path d="M0,' + (len - 4) + ' L0,' + (len + 7) + '" stroke="#5a3b2c" stroke-width="4"/>' +
    '<g class="gr-hilt-tassel"><path d="M0,' + (len - 5) + ' C-5,' + (len - 12) + ' -3,' + (len - 20) + ' -8,' + (len - 26) + '" stroke="' + c.tassel + '" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></g>';
  const fan = (len) =>
    '<g class="gr-fan" transform="translate(0 ' + (len + 4) + ')"><path d="M0,0 L-20,24 A31,31 0 0 0 20,24Z" fill="#f6f1e6" stroke="#3a2a21" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M0,0 L-10,29 M0,0 L0,31 M0,0 L10,29" stroke="#3a2a21" stroke-width=".8" opacity=".5"/>' +
    '<path d="M-14,25 L-7,18 L-2,23 L5,15 L13,25" stroke="#2e5466" stroke-width="1.6" fill="none" stroke-linejoin="round"/></g>';
  function legs(c, kind) {
    const boot = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="11" ry="6" fill="' + c.boot + '"/>';
    if (kind === 'stand') return boot(87, 206) + boot(113, 206);
    if (kind === 'martial')
      return '<path d="M88,176 L60,202 M112,176 L142,200" stroke="' + c.skirt + '" stroke-width="15" stroke-linecap="round"/>' + boot(56, 206) + boot(146, 204);
    return '<path d="M88,178 L72,202 M112,178 L134,200" stroke="' + c.skirt + '" stroke-width="15" stroke-linecap="round"/>' + boot(68, 206) + boot(138, 204);
  }

  // ---- Ghép nhân vật ------------------------------------------------------------------------------------------------------
  function svg(hero, pose) {
    const h = hero === 'nu' ? 'nu' : 'nam', c = PALETTE[h];
    const p = POSES.some((x) => x.id === pose) ? pose : 'talk';
    let behind = '', front = '', lower = '', arms = '', kind = 'stand', bodyCls = 'gr-body', open = true, talk = false, ground = '<ellipse cx="100" cy="214" rx="56" ry="7" fill="#1b1424" opacity=".14"/>';
    if (p === 'talk') {
      lower = legs(c, 'stand');
      arms = arm(c, 76, 122, 34, 'gr-arm-rest-l') + arm(c, 124, 122, 34, h === 'nam' ? 'gr-fanning' : 'gr-wave', h === 'nam' ? fan(34) : '');
      talk = true;
    } else if (p === 'martial') {
      kind = 'wide';
      lower = legs(c, 'martial');
      behind =
        '<path class="gr-slash" d="M154,40 A86,86 0 0 1 166,198" pathLength="100" stroke="' + c.qi + '" stroke-width="6" fill="none" stroke-linecap="round"/>' +
        '<path class="gr-slash gr-slash-2" d="M150,52 A74,74 0 0 1 160,186" pathLength="100" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      arms = arm(c, 76, 126, 30, 'gr-sword-hand') + arm(c, 124, 126, 30, 'gr-cut', sword(c, 30));
      bodyCls += ' gr-lunge';
    } else if (p === 'taichi') {
      kind = 'wide';
      lower = legs(c, 'taichi');
      behind =
        '<g class="gr-taiji" opacity=".22"><circle cx="100" cy="128" r="66" fill="none" stroke="' + c.qi + '" stroke-width="2.4"/>' +
        '<path d="M100,62 A66,66 0 0 1 100,194 A33,33 0 0 1 100,128 A33,33 0 0 0 100,62Z" fill="' + c.qi + '"/>' +
        '<circle cx="100" cy="95" r="8" fill="' + c.qi + '"/><circle cx="100" cy="161" r="8" fill="none" stroke="' + c.qi + '" stroke-width="2.4"/></g>' +
        '<g class="gr-qi-swirl"><path d="M44,150 C40,110 70,80 104,82" stroke="' + c.qi + '" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".55"/><path d="M156,104 C162,144 132,176 98,174" stroke="' + c.qi + '" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".55"/></g>';
      arms = arm(c, 76, 122, 36, 'gr-cloud-l') + arm(c, 124, 122, 36, 'gr-cloud-r');
      bodyCls += ' gr-sway';
    } else {
      kind = 'seat';
      open = false;
      ground =
        '<ellipse cx="100" cy="222" rx="70" ry="6" fill="#1b1424" opacity=".14"/>' +
        '<path d="M34,222 Q36,200 64,196 L138,196 Q166,200 168,222Z" fill="#9b93ad"/><path d="M48,203 Q100,193 152,203" stroke="#c4bdd3" stroke-width="3" fill="none" stroke-linecap="round"/>';
      behind =
        '<g class="gr-aura"><circle cx="100" cy="120" r="80" fill="' + c.qi + '" opacity=".12"/><circle cx="100" cy="120" r="62" fill="' + c.qi + '" opacity=".16"/><circle cx="100" cy="120" r="44" fill="' + c.qi + '" opacity=".18"/></g>' +
        [0, 1, 2, 3, 4, 5].map((i) => '<circle class="gr-mote gr-mote-' + i + '" cx="' + (52 + i * 19) + '" cy="' + (186 - (i % 2) * 14) + '" r="' + (2.2 + (i % 3) * 0.8) + '" fill="' + c.qi + '"/>').join('');
      lower = '<ellipse cx="100" cy="190" rx="58" ry="16" fill="' + c.robe2 + '"/><path d="M48,190 Q100,206 152,190" stroke="' + c.trim + '" stroke-width="2.2" fill="none"/>';
      arms = arm(c, 76, 122, 44, 'gr-zen-l') + arm(c, 124, 122, 44, 'gr-zen-r');
      bodyCls += ' gr-breathe';
    }
    return (
      '<svg class="gr-hero" data-pose="' + p + '" data-hero="' + h + '" viewBox="0 0 200 232" role="img" aria-label="' + HERO_LABEL[h] + ' · ' + POSES.find((x) => x.id === p).label + '">' +
      ground + behind +
      '<g class="' + bodyCls + '">' + back(h, c, p) + lower + torso(h, c, kind) +
      '<g class="gr-head">' + face(h, open, talk) + hairFront(h, c) + '</g>' + arms + front + '</g></svg>'
    );
  }

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
  window.zenHero = { svg, scene, POSES };
})();
