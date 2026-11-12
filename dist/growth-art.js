'use strict';
// v1.78.0: nhân vật chibi phong cách cổ trang (nam: búi tóc + áo choàng chàm; nữ: hai búi tóc + váy hồng) vẽ bằng SVG, không dùng ảnh ngoài.
// Nhân vật do tự thiết kế, không mô phỏng nhân vật có sẵn. Bốn tư thế có hoạt họa CSS riêng (growth.css): cười nói, tập võ, đi quyền, ngồi thiền.
// zenHero.svg(hero, pose) trả về chuỗi SVG; hero = 'nam' | 'nu'; pose = 'talk' | 'martial' | 'taichi' | 'zen'.
(function () {
  const SKIN = '#ffe1cb', BLUSH = '#ff9fb2', INK = '#2a1f33';
  const PALETTE = {
    nam: { hair: '#2b2233', robe: '#41519b', robe2: '#2f3b78', trim: '#e8b94a', inner: '#f6f2ff', sash: '#a8323e', pants: '#d6cdef', shoe: '#2a2a3c', glow: '#8fb4ff' },
    nu: { hair: '#2b2233', robe: '#f08aa8', robe2: '#d96b8c', trim: '#fff0b0', inner: '#fff7fa', sash: '#7950c8', pants: '#f6d3df', shoe: '#7a3d5c', glow: '#ffb3d1' },
  };
  const POSES = [
    { id: 'talk', label: 'Cười nói' },
    { id: 'martial', label: 'Tập võ' },
    { id: 'taichi', label: 'Đi quyền' },
    { id: 'zen', label: 'Ngồi thiền' },
  ];

  function hairBack(h, c) {
    return h === 'nam'
      ? '<path d="M56,80 C52,36 148,36 144,80 C148,98 140,112 130,112 L70,112 C60,112 52,98 56,80Z" fill="' + c.hair + '"/>'
      : '<path d="M54,78 C50,30 150,30 146,78 L149,128 Q100,138 51,128Z" fill="' + c.hair + '"/>';
  }
  function hairFront(h, c) {
    if (h === 'nam')
      return (
        '<ellipse cx="100" cy="30" rx="11" ry="12" fill="' + c.hair + '"/><rect x="91" y="36" width="18" height="9" rx="3" fill="' + c.hair + '"/>' +
        '<rect x="80" y="29" width="40" height="4.5" rx="2.2" fill="#7fd6b4" transform="rotate(-12 100 31)"/>' +
        '<path d="M57,76 C54,40 146,40 143,76 C138,62 128,56 114,58 C108,68 94,68 88,58 C74,56 62,62 57,76Z" fill="' + c.hair + '"/>' +
        '<path d="M57,76 C54,92 57,106 63,114 C66,100 64,88 66,80Z M143,76 C146,92 143,106 137,114 C134,100 136,88 134,80Z" fill="' + c.hair + '"/>'
      );
    const flower = (x, y) =>
      '<g transform="translate(' + x + ' ' + y + ')">' +
      [0, 72, 144, 216, 288].map((a) => '<circle cx="0" cy="-6.5" r="4.6" fill="#ff8fb8" transform="rotate(' + a + ')"/>').join('') +
      '<circle r="3.2" fill="#ffe27a"/></g>';
    return (
      '<circle cx="58" cy="44" r="15" fill="' + c.hair + '"/><circle cx="142" cy="44" r="15" fill="' + c.hair + '"/>' +
      flower(58, 44) + flower(142, 44) +
      '<path d="M48,58 L46,92" stroke="#e8b94a" stroke-width="1.8"/><circle cx="46" cy="95" r="3.4" fill="#e8b94a"/><path d="M152,58 L154,92" stroke="#e8b94a" stroke-width="1.8"/><circle cx="154" cy="95" r="3.4" fill="#e8b94a"/>' +
      '<path d="M57,78 C53,40 147,40 143,78 C138,62 122,60 100,64 C78,60 62,62 57,78Z" fill="' + c.hair + '"/>' +
      '<path d="M57,78 C53,98 56,114 63,124 C67,108 65,92 67,82Z M143,78 C147,98 144,114 137,124 C133,108 135,92 133,82Z" fill="' + c.hair + '"/>'
    );
  }
  function face(open, talk) {
    const eyes = open
      ? '<g class="gr-eyes"><ellipse cx="84" cy="83" rx="5" ry="6.5" fill="' + INK + '"/><circle cx="86" cy="80.5" r="2.1" fill="#fff"/><ellipse cx="116" cy="83" rx="5" ry="6.5" fill="' + INK + '"/><circle cx="118" cy="80.5" r="2.1" fill="#fff"/></g>'
      : '<path d="M77,85 q7,7 14,0 M109,85 q7,7 14,0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    const mouth = talk
      ? '<ellipse class="gr-mouth" cx="100" cy="97" rx="5.5" ry="4.6" fill="#b8445e"/>'
      : '<path d="M92,95 q8,7 16,0" stroke="#b8445e" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    return (
      '<ellipse cx="60" cy="84" rx="5" ry="6" fill="' + SKIN + '"/><ellipse cx="140" cy="84" rx="5" ry="6" fill="' + SKIN + '"/>' +
      '<ellipse cx="100" cy="82" rx="40" ry="36" fill="' + SKIN + '"/>' +
      '<path d="M77,72 q7,-5 14,0 M109,72 q7,-5 14,0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>' +
      eyes +
      '<ellipse cx="73" cy="95" rx="6.5" ry="3.8" fill="' + BLUSH + '" opacity=".6"/><ellipse cx="127" cy="95" rx="6.5" ry="3.8" fill="' + BLUSH + '" opacity=".6"/>' +
      mouth
    );
  }
  function torso(h, c, wide) {
    const hem = wide ? 48 : 38;
    const body =
      h === 'nam'
        ? '<path d="M68,116 Q100,106 132,116 L' + (100 + hem) + ',180 Q100,192 ' + (100 - hem) + ',180Z" fill="' + c.robe + '"/>' +
          '<path d="M100,134 L100,184" stroke="' + c.robe2 + '" stroke-width="2.4"/>' +
          '<path d="M86,112 L100,138 L114,112" stroke="' + c.inner + '" stroke-width="7" fill="none" stroke-linejoin="round"/>' +
          '<path d="M86,112 L100,138 L114,112" stroke="' + c.trim + '" stroke-width="1.6" fill="none" stroke-linejoin="round" transform="translate(0 4)"/>' +
          '<rect x="68" y="148" width="64" height="11" rx="3" fill="' + c.sash + '"/><circle cx="100" cy="153.5" r="5.2" fill="' + c.trim + '"/>' +
          '<path d="M116,159 q3,12 -1,20" stroke="#7fd6b4" stroke-width="3" fill="none" stroke-linecap="round"/>'
        : '<path d="M70,116 Q100,108 130,116 L128,152 L72,152Z" fill="' + c.inner + '"/>' +
          '<path d="M72,150 Q100,142 128,150 L' + (100 + hem) + ',196 Q100,210 ' + (100 - hem) + ',196Z" fill="' + c.robe + '"/>' +
          '<path d="M86,112 L100,134 L114,112" stroke="' + c.robe2 + '" stroke-width="5" fill="none" stroke-linejoin="round"/>' +
          '<rect x="70" y="142" width="60" height="10" rx="4" fill="' + c.sash + '"/>' +
          '<path d="M100,147 C86,150 82,166 88,176 M100,147 C114,150 118,166 112,176" stroke="' + c.sash + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M72,196 Q100,206 128,196" stroke="' + c.trim + '" stroke-width="2.4" fill="none"/>';
    return body;
  }
  function arm(c, x, y, len, cls) {
    return (
      '<g transform="translate(' + x + ' ' + y + ')"><g class="' + cls + '">' +
      '<path d="M0,0 L0,' + len + '" stroke="' + c.robe2 + '" stroke-width="15" stroke-linecap="round"/>' +
      '<path d="M-7.5,' + (len - 7) + ' L7.5,' + (len - 7) + '" stroke="' + c.trim + '" stroke-width="3"/>' +
      '<circle cx="0" cy="' + (len + 3) + '" r="6.8" fill="' + SKIN + '"/></g></g>'
    );
  }
  function leg(c, x1, y1, x2, y2) {
    return (
      '<path d="M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2 + '" stroke="' + c.pants + '" stroke-width="15" stroke-linecap="round"/>' +
      '<ellipse cx="' + (x2 + (x2 < 100 ? -2 : 2)) + '" cy="' + (y2 + 5) + '" rx="12" ry="6.5" fill="' + c.shoe + '"/>'
    );
  }

  function svg(hero, pose) {
    const h = hero === 'nu' ? 'nu' : 'nam', c = PALETTE[h];
    const p = POSES.some((x) => x.id === pose) ? pose : 'talk';
    let aura = '', legs = '', arms = '', bodyCls = 'gr-body', wide = false, open = true, talk = false;
    if (p === 'talk') {
      legs = leg(c, 86, 176, 86, 198) + leg(c, 114, 176, 114, 198);
      arms = arm(c, 78, 122, 34, 'gr-arm gr-arm-rest-l') + arm(c, 122, 122, 34, 'gr-arm gr-wave');
      talk = true;
    } else if (p === 'martial') {
      legs = leg(c, 80, 172, 56, 198) + leg(c, 120, 172, 144, 198);
      arms = arm(c, 78, 128, 34, 'gr-arm gr-punch-l') + arm(c, 122, 128, 34, 'gr-arm gr-punch-r');
      bodyCls += ' gr-lowered';
      wide = true;
    } else if (p === 'taichi') {
      legs = leg(c, 86, 176, 74, 198) + leg(c, 114, 176, 134, 196);
      arms = arm(c, 78, 122, 36, 'gr-arm gr-cloud-l') + arm(c, 122, 122, 36, 'gr-arm gr-cloud-r');
      bodyCls += ' gr-sway';
      wide = true;
    } else {
      aura =
        '<g class="gr-aura"><circle cx="100" cy="118" r="78" fill="' + c.glow + '" opacity=".14"/><circle cx="100" cy="118" r="62" fill="' + c.glow + '" opacity=".18"/><circle cx="100" cy="118" r="46" fill="' + c.glow + '" opacity=".2"/></g>' +
        [0, 1, 2, 3, 4].map((i) => '<ellipse class="gr-petal gr-petal-' + i + '" cx="' + (46 + i * 27) + '" cy="196" rx="4" ry="7" fill="#ff9fc4"/>').join('');
      legs = '<ellipse cx="100" cy="190" rx="54" ry="17" fill="' + c.robe2 + '"/><ellipse cx="78" cy="198" rx="13" ry="6.5" fill="' + SKIN + '"/><ellipse cx="122" cy="198" rx="13" ry="6.5" fill="' + SKIN + '"/>';
      arms = arm(c, 78, 122, 47, 'gr-arm gr-zen-l') + arm(c, 122, 122, 47, 'gr-arm gr-zen-r');
      bodyCls += ' gr-breathe';
      open = false;
    }
    const torsoShape = torso(h, c, wide || p === 'zen');
    return (
      '<svg class="gr-hero" data-pose="' + p + '" data-hero="' + h + '" viewBox="0 0 200 232" role="img" aria-label="' +
      (h === 'nu' ? 'Nhân vật nữ' : 'Nhân vật nam') + ' · ' + POSES.find((x) => x.id === p).label + '">' +
      aura + '<ellipse cx="100" cy="216" rx="58" ry="8" fill="#000" opacity=".12"/>' +
      '<g class="' + bodyCls + '">' + legs + torsoShape +
      '<g class="gr-head">' + hairBack(h, c) + face(open, talk) + hairFront(h, c) + '</g>' + arms + '</g></svg>'
    );
  }
  window.zenHero = { svg, POSES };
})();
