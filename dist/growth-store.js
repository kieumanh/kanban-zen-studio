/* Tàng Bảo Các (v2.34.0): kho vật phẩm của Điểm tích lũy, theo yêu cầu của chủ dự án: "Thiết kế hình ảnh kho chứa vật phẩm, có cả bà chủ
 * xinh đẹp bán hàng tư vấn quy đổi theo điểm tích lũy hiện có. Mọi vật phẩm đều có thể quy đổi bằng 8 loại điểm tích lũy. Sau khi bấm quy đổi,
 * sẽ xuất hiện bảng quy đổi tự nhập thủ công bằng tay. Cho dù có bao nhiêu điểm, vẫn có thể tự quy đổi bằng nhập thủ công. Nhân vật sẽ tự trừ
 * điểm quy đổi theo cảm nhận của riêng họ, không phải theo số điểm định trước."
 *  - Quầy hàng vẽ bằng SVG: kho gỗ ấm đèn lồng, cửa sổ trăng tròn, giá hàng, hàng tồn dưới sàn; bà chủ Liễu Linh Lung đứng sau quầy.
 *  - Sáu món: Nhà trọ · Sơn trang · Bí kíp tu luyện (đổi lẻ, 1 quyển; tinh thần hoặc vật chất) · Rương bí kíp (đổi sỉ, 100 quyển) ·
 *    Thiên Lý Nhãn (camera, mắt thần truyền thông) · Quân sư và tướng lĩnh AI (Gemini Pro, ChatGPT Plus, Claude Pro).
 *  - Không có giá định sẵn. Bà chủ chỉ nhìn tu vi hiện có ở tám mạch và gợi ý mạch hợp món; bấm Quy đổi thì mở bảng quy đổi sẵn có của Tu vi
 *    (growth.js, openSpend) với tên món điền sẵn, hiệp khách tự nhập số điểm trừ ở từng mạch. Ghi vào sổ bảo vật (data.growth.spend) như mọi lần
 *    quy đổi khác nên không đổi lược đồ dữ liệu.
 *  - Chỉ vẽ bằng thuộc tính SVG (không style nội tuyến trong hình) nên chạy dưới CSP chặt.
 *  - v2.57.0: tranh chia lớp (nền tĩnh + lớp đèn, tóc, thân, đầu, quạt, khói) để chuyển động chạy trên bộ ghép lớp; xem khối “Tranh quầy theo lớp”.
 *  API: zenStore.ITEMS, .OWNER, .scene(), .portrait(), .pic(mã, cỡ, màu), .advise(món, số dư), .hintOf, .panel(), .strip(món), .ask(mã), .buy(mã). */
(() => {
  'use strict';
  const G = () => window.zenGrowth;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  // Đèn lồng: chỉ vẽ hình (tâm ở x); hộp cắt và điểm treo do lamp() tính để đặt thành một lớp riêng.
  function lantern(x, y, s) {
    const rx = 14 * s, ry = 16 * s, top = y - ry - 4 * s;
    return (
      '<g transform="translate(' + x + ' 0)">' +
      '<circle cx="0" cy="' + f1(y) + '" r="' + f1(34 * s) + '" fill="url(#gst-glow)"/>' +
      '<line x1="0" y1="12" x2="0" y2="' + f1(top) + '" stroke="#2a190e" stroke-width="1.4"/>' +
      '<rect x="' + f1(-6 * s) + '" y="' + f1(top) + '" width="' + f1(12 * s) + '" height="' + f1(4.5 * s) + '" rx="1.2" fill="#d4a84a"/>' +
      '<ellipse cx="0" cy="' + f1(y) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="url(#gst-lantern)"/>' +
      '<path d="M' + f1(-rx * 0.5) + ',' + f1(y - ry * 0.9) + ' Q' + f1(-rx * 0.18) + ',' + f1(y) + ' ' + f1(-rx * 0.5) + ',' + f1(y + ry * 0.9) + ' M' + f1(rx * 0.5) + ',' + f1(y - ry * 0.9) + ' Q' + f1(rx * 0.18) + ',' + f1(y) + ' ' + f1(rx * 0.5) + ',' + f1(y + ry * 0.9) + '" fill="none" stroke="#8f2616" stroke-width="' + f1(1.1 * s) + '" opacity=".7"/>' +
      '<rect x="' + f1(-5.5 * s) + '" y="' + f1(y + ry - 1) + '" width="' + f1(11 * s) + '" height="' + f1(4 * s) + '" rx="1.2" fill="#d4a84a"/>' +
      '<line x1="0" y1="' + f1(y + ry + 3 * s) + '" x2="0" y2="' + f1(y + ry + 12 * s) + '" stroke="#d4a84a" stroke-width="1.2"/>' +
      '<path d="M' + f1(-3.5 * s) + ',' + f1(y + ry + 17 * s) + ' L0,' + f1(y + ry + 9 * s) + ' L' + f1(3.5 * s) + ',' + f1(y + ry + 17 * s) + '" fill="none" stroke="#c9382a" stroke-width="' + f1(1.6 * s) + '" stroke-linecap="round"/>' +
      '</g>'
    );
  }
  function books(x, base, specs) {
    let out = '', cx = x;
    for (const [w, h, c] of specs) {
      out += '<rect x="' + cx + '" y="' + (base - h) + '" width="' + w + '" height="' + h + '" rx="1" fill="' + c + '"/><rect x="' + cx + '" y="' + (base - h + 4) + '" width="' + w + '" height="1.4" fill="#f1dca0" opacity=".85"/><rect x="' + cx + '" y="' + (base - 6) + '" width="' + w + '" height="1.4" fill="#f1dca0" opacity=".6"/>';
      cx += w + 0.8;
    }
    return out;
  }
  function jar(x, base, c) {
    return '<g><ellipse cx="' + x + '" cy="' + (base - 9) + '" rx="8" ry="9.5" fill="' + c + '"/><rect x="' + (x - 4.5) + '" y="' + (base - 22) + '" width="9" height="5" rx="1.5" fill="' + c + '"/><ellipse cx="' + x + '" cy="' + (base - 22) + '" rx="6.5" ry="2.6" fill="#b3402f"/><path d="M' + (x - 5) + ',' + (base - 15) + ' Q' + x + ',' + (base - 11) + ' ' + (x + 5) + ',' + (base - 15) + '" fill="none" stroke="#fff7e6" stroke-width="1.2" opacity=".7"/></g>';
  }
  function shelf(x, w) {
    let s = '<rect x="' + (x + 4) + '" y="60" width="' + (w - 8) + '" height="146" fill="#2c1a10" opacity=".55"/>';
    for (const y of [60, 96, 134, 172]) s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="6" rx="1.5" fill="url(#gst-wood)"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="1.4" fill="#c79a6a" opacity=".7"/>';
    s += '<rect x="' + x + '" y="60" width="5" height="146" fill="#7a5236"/><rect x="' + (x + w - 5) + '" y="60" width="5" height="146" fill="#7a5236"/>';
    return s;
  }
  function leftShelf() {
    const bk = [[7, 27, '#b3402f'], [6, 31, '#2f6d8f'], [8, 24, '#d4a84a'], [6, 33, '#4f8a5b'], [7, 28, '#7a4a8f'], [8, 25, '#c47a3a'], [6, 30, '#2f6d8f']];
    let s = shelf(8, 98);
    s += books(18, 96, bk);
    // giỏ cuộn giấy
    s += '<path d="M70,96 L74,78 L98,78 L102,96Z" fill="#a8794a"/><path d="M72,86 H100 M71,91 H101" stroke="#7a5230" stroke-width="1" opacity=".7"/>';
    s += '<g><rect x="76" y="62" width="6" height="22" rx="3" fill="#f4e8cc" transform="rotate(-8 79 73)"/><rect x="84" y="60" width="6" height="24" rx="3" fill="#efdfba"/><rect x="92" y="64" width="6" height="20" rx="3" fill="#f4e8cc" transform="rotate(9 95 74)"/><path d="M76,70 h6 M84,69 h6 M92,70 h6" stroke="#c9382a" stroke-width="1.6"/></g>';
    // chồng sách nằm + hũ
    s += '<rect x="18" y="124" width="46" height="10" rx="1.5" fill="#2f6d8f"/><rect x="22" y="115" width="42" height="9" rx="1.5" fill="#b3402f"/><rect x="16" y="106" width="44" height="9" rx="1.5" fill="#4f8a5b"/>';
    s += '<path d="M19,129 h43 M23,119.5 h39 M17,110.5 h41" stroke="#f4e8cc" stroke-width="1.6" opacity=".85"/>';
    s += jar(84, 134, '#efe2c8') + jar(98, 134, '#d9c9a8');
    // rương bí kíp
    s += '<rect x="14" y="152" width="52" height="20" rx="2" fill="#8a5a36"/><path d="M14,152 Q40,138 66,152Z" fill="#9a6a44"/><rect x="14" y="152" width="52" height="3" fill="#d4a84a"/><rect x="26" y="146" width="3.5" height="26" fill="#d4a84a" opacity=".9"/><rect x="50" y="146" width="3.5" height="26" fill="#d4a84a" opacity=".9"/><rect x="36" y="156" width="8" height="8" rx="1.5" fill="#f1dca0"/><circle cx="40" cy="160" r="1.5" fill="#6b3a1a"/>';
    s += books(72, 172, [[7, 22, '#c47a3a'], [7, 26, '#7a4a8f'], [6, 20, '#b3402f'], [8, 24, '#2f6d8f']]);
    return s;
  }
  function rightShelf() {
    let s = shelf(314, 98);
    // nhà trọ
    s += '<g><rect x="322" y="82" width="34" height="14" fill="#ead8b6"/><path d="M318,82 Q339,72 360,82 L355,76 Q339,66 323,76Z" fill="#4a5a6a"/><path d="M316,84 Q339,70 362,84" fill="none" stroke="#5b6a7a" stroke-width="3" stroke-linecap="round"/><rect x="334" y="86" width="9" height="10" rx="1" fill="#6b3a1a"/><rect x="325" y="85" width="6" height="6" fill="#f6c96a"/><rect x="347" y="85" width="6" height="6" fill="#f6c96a"/><line x1="358" y1="76" x2="358" y2="84" stroke="#2a190e" stroke-width="1"/><circle cx="358" cy="86" r="3" fill="#d9452f"/></g>';
    // sơn trang
    s += '<g><ellipse cx="388" cy="94" rx="19" ry="4.5" fill="#6f747b"/><path d="M371,94 Q378,76 389,74 Q400,76 405,94Z" fill="#848a92"/><rect x="380" y="64" width="18" height="10" fill="#ead8b6"/><path d="M376,64 L389,54 L402,64Z" fill="#8f3a2a"/><rect x="382" y="66" width="3" height="8" fill="#c9382a"/><rect x="393" y="66" width="3" height="8" fill="#c9382a"/><path d="M368,94 L372,80 L376,94Z" fill="#3f6a4a"/><path d="M366,89 L372,74 L378,89Z" fill="#4f8a5b"/></g>';
    // Thiên Lý Nhãn
    s += '<g><path d="M338,134 L334,118 M338,134 L342,118 M338,134 L338,116" stroke="#4a3a2a" stroke-width="1.6" stroke-linecap="round"/><rect x="322" y="100" width="34" height="20" rx="5" fill="#2f2a33"/><rect x="322" y="100" width="34" height="5" rx="2.5" fill="#4a4350"/><circle cx="337" cy="111" r="9.5" fill="#d4a84a"/><circle cx="337" cy="111" r="7.2" fill="#1b2442"/><ellipse cx="337" cy="111" rx="5.2" ry="3.6" fill="#f6e7c0"/><circle cx="337" cy="111" r="2.2" fill="#2d5aa8"/><circle cx="335.8" cy="109.8" r=".8" fill="#fff"/><circle cx="351" cy="104" r="1.8" fill="#ff5a4a"/></g>';
    // ba cuộn quân sư
    const sc = [['#6a7ae8', 366], ['#2fa58a', 380], ['#d9714a', 394]];
    for (const [c, x] of sc) s += '<g><rect x="' + x + '" y="104" width="9" height="30" rx="4.5" fill="#f4e8cc"/><rect x="' + x + '" y="104" width="9" height="5" rx="2.5" fill="#c79a6a"/><rect x="' + x + '" y="129" width="9" height="5" rx="2.5" fill="#c79a6a"/><rect x="' + x + '" y="116" width="9" height="3" fill="' + c + '"/><circle cx="' + (x + 4.5) + '" cy="124" r="2.6" fill="' + c + '"/></g>';
    // hũ
    s += jar(334, 172, '#efe2c8') + jar(352, 172, '#c9b48c') + '<rect x="368" y="154" width="38" height="18" rx="2" fill="#7a4a2a"/><rect x="368" y="154" width="38" height="3" fill="#d4a84a"/><rect x="384" y="160" width="6" height="6" rx="1" fill="#f1dca0"/>';
    return s;
  }
  function counter() {
    let s = '<rect x="102" y="178" width="216" height="48" fill="#58351f"/><rect x="102" y="178" width="216" height="48" fill="url(#gst-lat)"/><rect x="102" y="178" width="216" height="3" fill="#2d1a0f" opacity=".6"/>';
    s += '<rect x="94" y="166" width="232" height="12" rx="3" fill="url(#gst-wood)"/><rect x="94" y="166" width="232" height="2.2" rx="1" fill="#e0b878"/><rect x="94" y="176" width="232" height="2" fill="#d4a84a"/>';
    s += '<rect x="102" y="178" width="7" height="48" fill="#3a2316"/><rect x="311" y="178" width="7" height="48" fill="#3a2316"/>';
    // bàn tính
    s += '<g><rect x="112" y="152" width="50" height="14" rx="1.5" fill="#8a5a36"/><rect x="114.5" y="154.5" width="45" height="9" fill="#5a3622"/>';
    for (let i = 0; i < 6; i++) {
      const x = 119 + i * 7.6;
      s += '<line x1="' + x + '" y1="154.5" x2="' + x + '" y2="163.5" stroke="#d4a84a" stroke-width=".8"/><circle cx="' + x + '" cy="156.5" r="1.9" fill="#d4a84a"/><circle cx="' + x + '" cy="161" r="1.9" fill="' + (i % 2 ? '#b3402f' : '#d4a84a') + '"/>';
    }
    s += '<line x1="114.5" y1="158.2" x2="159.5" y2="158.2" stroke="#8a5a36" stroke-width="1.2"/></g>';
    // sổ và bút
    s += '<g><path d="M250,166 L250,152 Q266,148 276,152 L276,166Z" fill="#f4e8cc"/><path d="M276,166 L276,152 Q286,148 302,152 L302,166Z" fill="#efe0bc"/><path d="M254,156 h16 M254,160 h16 M280,156 h18 M280,160 h14" stroke="#9a7a52" stroke-width="1" opacity=".7"/><path d="M276,152 L276,166" stroke="#b9996a" stroke-width="1"/><path d="M262,170 L296,140" stroke="#3a2316" stroke-width="2.2" stroke-linecap="round"/><path d="M296,140 L300,136" stroke="#f1dca0" stroke-width="2.6" stroke-linecap="round"/></g>';
    // chén trà
    s += '<g><ellipse cx="311" cy="165" rx="9" ry="2.4" fill="#cdbba0"/><path d="M303,156 Q303,166 311,166 Q319,166 319,156Z" fill="#f7eedb"/><ellipse cx="311" cy="156" rx="8" ry="2.2" fill="#c98a4a"/></g>';
    return s;
  }

  const SKIN = '#ffe3cf', SKIN2 = '#f4c9b0', INK = '#231a2b', HAIR = '#1d1822', HAIR_HI = '#403552', GOLD = '#d4a84a', PINK = '#f08aa2';
  function hairBack() {
    let s = '';
    s += '<path d="M172,112 C168,78 188,60 210,60 C232,60 252,78 248,112 C251,134 246,152 238,166 L182,166 C174,152 169,134 172,112Z" fill="' + HAIR + '"/>';
    s += '<ellipse cx="195" cy="56" rx="14" ry="10" fill="' + HAIR + '" transform="rotate(-22 195 56)"/><ellipse cx="225" cy="56" rx="14" ry="10" fill="' + HAIR + '" transform="rotate(22 225 56)"/><circle cx="210" cy="55" r="9" fill="' + HAIR + '"/>';
    s += '<path d="M186,54 q8,-7 18,-4 M216,50 q10,-3 18,4" stroke="' + HAIR_HI + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>';
  
    return s;
  }

  function torso() {
    let s = '';
    s += '<path d="M160,170 C160,152 178,143 198,141 L222,141 C242,143 260,152 260,170Z" fill="url(#gst-robe)"/>';
    s += '<path d="M198,141 L210,166 L222,141 L228,142 L210,172 L192,142Z" fill="#fff3dc"/><path d="M192,142 L210,172 M228,142 L210,172" stroke="' + GOLD + '" stroke-width="1.4" fill="none"/>';
    s += '<path d="M172,158 q6,-6 12,0 q-6,3 -12,0 M236,158 q6,-6 12,0 q-6,3 -12,0" fill="none" stroke="#ffe49a" stroke-width="1.4" opacity=".8"/><circle cx="178" cy="162" r="1.6" fill="#ffe49a" opacity=".9"/><circle cx="242" cy="162" r="1.6" fill="#ffe49a" opacity=".9"/>';
  
    return s;
  }

  function neck() {
    let s = '';
    s += '<path d="M203,132 L203,146 Q210,152 217,146 L217,132Z" fill="' + SKIN2 + '"/>';
  
    return s;
  }

  function leftArm() {
    let s = '';
    s += '<g><path d="M170,148 C158,150 146,158 140,170 L158,174 C164,166 172,160 180,156Z" fill="url(#gst-robe)"/><path d="M140,170 L158,174 L156,180 L136,176Z" fill="' + PINK + '"/><ellipse cx="136" cy="166" rx="5.5" ry="4" fill="' + SKIN + '"/><path d="M131,164 q-3,1 -3,4 M133,162 q-3,0 -4,3" stroke="' + SKIN2 + '" stroke-width="1" fill="none" stroke-linecap="round"/></g>';
  
    return s;
  }

  function face() {
    let s = '';
    s += '<path d="M178,104 C178,86 193,77 210,77 C227,77 242,86 242,104 C242,127 227,141 210,143 C193,141 178,127 178,104Z" fill="' + SKIN + '"/>';
    s += '<path d="M180,116 C184,134 196,142 210,143 C224,142 236,134 240,116 C234,132 224,138 210,138 C196,138 186,132 180,116Z" fill="' + SKIN2 + '" opacity=".55"/>';
    s += '<ellipse cx="190" cy="121" rx="6.5" ry="3.8" fill="#ff9fb2" opacity=".55"/><ellipse cx="230" cy="121" rx="6.5" ry="3.8" fill="#ff9fb2" opacity=".55"/>';
  
    const eye = (cx, dir) =>
      '<g><ellipse cx="' + cx + '" cy="109" rx="7" ry="8" fill="#fffaf5"/><ellipse cx="' + (cx + dir * 0.6) + '" cy="110" rx="5.2" ry="6.8" fill="#3a2540"/><ellipse cx="' + (cx + dir * 0.6) + '" cy="112" rx="3.2" ry="3.8" fill="#6a4a78" opacity=".7"/><circle cx="' + (cx + dir * 2.2) + '" cy="106.6" r="2.1" fill="#fff"/><circle cx="' + (cx - dir * 1.6) + '" cy="113.2" r="1" fill="#fff" opacity=".85"/></g>' +
      '<path d="M' + (cx - dir * 7.8) + ',108 Q' + cx + ',99.5 ' + (cx + dir * 7.8) + ',107.5" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/><path d="M' + (cx + dir * 7.8) + ',107.5 L' + (cx + dir * 11) + ',104.6" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/><path d="M' + (cx + dir * 5) + ',103.6 L' + (cx + dir * 7.4) + ',100.2 M' + (cx + dir * 1.5) + ',101.6 L' + (cx + dir * 2.4) + ',98" stroke="' + INK + '" stroke-width="1.1" stroke-linecap="round"/>';
    s += eye(197, -1) + eye(223, 1);
    s += '<path d="M188,96 Q197,90.5 206,94.5 M214,94.5 Q223,90.5 232,96" fill="none" stroke="#2a2030" stroke-width="1.7" stroke-linecap="round"/>';
  
    return s;
  }

  function charm() {
    let s = '';
    s += '<g transform="translate(210 91)"><circle r="1.4" fill="#e0506a"/><circle cx="0" cy="-2.4" r="1.4" fill="#e0506a"/><circle cx="2.3" cy="-.8" r="1.4" fill="#e0506a"/><circle cx="1.4" cy="1.9" r="1.4" fill="#e0506a"/><circle cx="-1.4" cy="1.9" r="1.4" fill="#e0506a"/><circle cx="-2.3" cy="-.8" r="1.4" fill="#e0506a"/><circle r=".8" fill="#ffe49a"/></g>';
    s += '<circle cx="231" cy="117" r="1" fill="#6a3a3a"/>';
    s += '<path d="M209,118 q1.2,2 0,3.2" stroke="#e0a890" stroke-width="1" fill="none" stroke-linecap="round"/>';
    s += '<path d="M203.5,127 Q210,133.4 216.5,127 Q210,129.4 203.5,127Z" fill="#d84a68"/><path d="M203.5,127 Q210,131 216.5,127" stroke="#b83552" stroke-width=".9" fill="none" stroke-linecap="round"/>';
  
    return s;
  }

  function hairFront() {
    let s = '';
    s += '<path d="M177,106 C176,84 192,69 210,69 C228,69 244,84 243,106 C240,93 231,84 220,83 L210,95 L200,83 C189,84 180,93 177,106Z" fill="' + HAIR + '"/>';
    s += '<path d="M186,80 q10,-8 22,-6 M214,74 q12,-2 22,8" stroke="' + HAIR_HI + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>';
    s += '<path d="M177,104 C172,122 174,142 184,158 C187,140 184,122 187,106Z" fill="' + HAIR + '"/><path d="M243,104 C248,122 246,142 236,158 C233,140 236,122 233,106Z" fill="' + HAIR + '"/>';
  
    return s;
  }

  function jewelry() {
    let s = '';
    s += '<g transform="translate(183 62)"><circle r="10" fill="' + PINK + '"/><circle cx="-5" cy="-3" r="6.4" fill="#f6a9ba"/><circle cx="5" cy="-3" r="6.4" fill="#f6a9ba"/><circle cx="0" cy="4.4" r="6.6" fill="#f6a9ba"/><circle r="4.4" fill="#ffd0da"/><circle r="1.9" fill="#ffd45a"/><path d="M-9,-5 q4,-4 9,-4 M-7,6 q7,4 14,-1" stroke="#d96a88" stroke-width="1" fill="none" opacity=".7"/></g>';
    s += '<path d="M196,52 L252,72" stroke="' + GOLD + '" stroke-width="2.6" stroke-linecap="round"/><circle cx="252" cy="72" r="2.8" fill="' + GOLD + '"/>';
    s += '<path d="M181,128 L181,134" stroke="' + GOLD + '" stroke-width=".9"/><ellipse cx="181" cy="137" rx="2.2" ry="3.4" fill="#7fd0b0"/><path d="M239,128 L239,134" stroke="' + GOLD + '" stroke-width=".9"/><ellipse cx="239" cy="137" rx="2.2" ry="3.4" fill="#7fd0b0"/>';
  
    return s;
  }

  // Chuỗi hạt ngọc treo ở trâm: lớp riêng để đung đưa độc lập với đầu.
  function beads() {
    return '<path d="M246,70 Q248,88 244,98 M252,72 Q256,92 252,104 M257,74 Q262,92 259,102" stroke="' + GOLD + '" stroke-width=".9" fill="none"/><circle cx="244" cy="99" r="2.2" fill="#fff4e6"/><circle cx="252" cy="105" r="2.4" fill="#7fd0b0"/><circle cx="259" cy="103" r="2.2" fill="#fff4e6"/>';
  }
  // Mí mắt khép: hai nửa elip da phủ mắt rồi vẽ nét mắt nhắm; chỉ đổi độ mờ nên chạy trên bộ ghép lớp.
  function lids() {
    let s = '';
    for (const [cx, dir] of [[197, -1], [223, 1]]) s += '<ellipse cx="' + cx + '" cy="106.8" rx="12" ry="10.6" fill="' + SKIN + '"/><path d="M' + (cx - 7.4) + ',109.2 Q' + cx + ',113.6 ' + (cx + 7.4) + ',109.2" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/><path d="M' + (cx + dir * 7.4) + ',109.2 L' + (cx + dir * 10.4) + ',107" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>';
    return s;
  }

  function fanArm() {
    let s = '';
    s += '<g><path d="M252,150 C268,148 282,136 288,120 L302,128 C296,148 276,166 256,172Z" fill="url(#gst-robe)"/><path d="M288,120 L302,128 L299,134 L284,126Z" fill="' + PINK + '"/>';
    s += '<path d="M296,128 L262,100 A44,44 0 0 1 322,98Z" fill="#fff0d8" stroke="' + GOLD + '" stroke-width="1.6" stroke-linejoin="round"/>';
    for (const a of [-142, -126, -110, -94, -78]) {
      const r = 44, ax = 296 + r * Math.cos((a * Math.PI) / 180), ay = 128 + r * Math.sin((a * Math.PI) / 180);
      s += '<line x1="296" y1="128" x2="' + f1(ax) + '" y2="' + f1(ay) + '" stroke="' + GOLD + '" stroke-width=".9" opacity=".8"/>';
    }
    s += '<g fill="' + PINK + '" opacity=".85"><circle cx="278" cy="110" r="3.2"/><circle cx="298" cy="100" r="3.6"/><circle cx="312" cy="112" r="3"/><circle cx="288" cy="120" r="2.4"/></g><g fill="#ffd45a"><circle cx="278" cy="110" r="1"/><circle cx="298" cy="100" r="1.1"/><circle cx="312" cy="112" r=".9"/></g>';
    s += '<ellipse cx="296" cy="130" rx="5.5" ry="4.2" fill="' + SKIN + '"/></g>';
    return s;
  }

  // Biển hiệu treo trên cửa sổ trăng và hàng tồn dưới sàn (rương, sọt cuộn, hũ lớn, hộp sơn mài) cho ra dáng một cái kho.
  function plaque() {
    return (
      '<g class="gr-st-plaque"><line x1="176" y1="12" x2="176" y2="17" stroke="#2a190e" stroke-width="1.2"/><line x1="244" y1="12" x2="244" y2="17" stroke="#2a190e" stroke-width="1.2"/>' +
      '<rect x="158" y="16" width="104" height="21" rx="2.5" fill="#8f2a1e" stroke="#d4a84a" stroke-width="1.4"/><rect x="161.5" y="19.5" width="97" height="14" rx="1.5" fill="none" stroke="#d4a84a" stroke-width=".6" opacity=".7"/>' +
      '<text x="210" y="30.2" text-anchor="middle" font-family="Georgia, serif" font-size="11.5" font-weight="700" fill="#ffe49a" letter-spacing=".6">Tàng Bảo Các</text></g>'
    );
  }
  function floorStock() {
    let s = '';
    // hai rương chồng bên trái
    s += '<g><rect x="10" y="214" width="36" height="26" rx="1.5" fill="#9a6a44"/><path d="M10,222 H46 M10,231 H46" stroke="#6a4226" stroke-width="1.1" opacity=".7"/><rect x="10" y="214" width="4" height="26" fill="#7a4a2a"/><rect x="42" y="214" width="4" height="26" fill="#7a4a2a"/><path d="M14,216 L42,238 M42,216 L14,238" stroke="#7a4a2a" stroke-width="1.4" opacity=".55"/><rect x="10" y="225" width="36" height="3" fill="#d8c08a" opacity=".85"/></g>';
    s += '<g><rect x="16" y="198" width="25" height="16" rx="1.5" fill="#8a5a36"/><rect x="16" y="198" width="25" height="3" fill="#a8794a"/><rect x="26" y="202" width="5" height="7" rx="1" fill="#f1dca0"/><circle cx="28.5" cy="205" r="1" fill="#5a3622"/><rect x="16" y="198" width="3" height="16" fill="#d4a84a" opacity=".85"/><rect x="38" y="198" width="3" height="16" fill="#d4a84a" opacity=".85"/></g>';
    // sọt cuộn giấy
    s += '<g><path d="M54,218 L58,238 L82,238 L86,218Z" fill="#a8794a"/><path d="M55.5,225 H84.5 M57,232 H83" stroke="#7a5230" stroke-width="1.1" opacity=".75"/><path d="M62,218 L64,238 M70,218 V238 M78,218 L76,238" stroke="#7a5230" stroke-width=".8" opacity=".5"/>' +
      '<rect x="58" y="205" width="7" height="22" rx="3.5" fill="#f4e8cc" transform="rotate(-9 61.5 216)"/><rect x="67" y="202" width="7" height="25" rx="3.5" fill="#efdfba"/><rect x="76" y="206" width="7" height="21" rx="3.5" fill="#f4e8cc" transform="rotate(10 79.5 216)"/><path d="M58,214 h7 M67,212 h7 M76,215 h7" stroke="#c9382a" stroke-width="1.5" opacity=".85"/></g>';
    // hũ lớn bên phải
    s += '<g><ellipse cx="346" cy="226" rx="17" ry="19" fill="#c9b48c"/><path d="M329.5,222 Q346,228 362.5,222 M330,232 Q346,238 362,232" stroke="#8a7452" stroke-width="1.6" fill="none"/><rect x="338" y="203" width="16" height="7" rx="2.4" fill="#c9b48c"/><ellipse cx="346" cy="203" rx="9.5" ry="3.4" fill="#a8946c"/><path d="M337,205 Q346,211 355,205 L353,209 Q346,214 339,209Z" fill="#b3402f"/><path d="M335,215 Q330,226 334,238" stroke="#fff" stroke-width="2" fill="none" opacity=".25" stroke-linecap="round"/></g>';
    // hộp sơn mài chồng
    s += '<g><rect x="372" y="222" width="38" height="18" rx="2" fill="#5a2f22"/><rect x="372" y="222" width="38" height="3" fill="#7a4232"/><rect x="388" y="228" width="6" height="7" rx="1" fill="#d4a84a"/><rect x="372" y="236" width="38" height="2" fill="#d4a84a" opacity=".8"/></g>';
    s += '<g><rect x="376" y="206" width="30" height="16" rx="2" fill="#7a3a2a"/><rect x="376" y="206" width="30" height="3" fill="#9a5240"/><rect x="388" y="211" width="6" height="6" rx="1" fill="#f1dca0"/><circle cx="391" cy="214" r="1" fill="#5a2f22"/></g>';
    return s;
  }
  // ---- Tranh quầy theo lớp -------------------------------------------------------------------------------------------------------
  // Mọi phần chuyển động là một lớp SVG nhỏ (cắt theo hộp riêng) đặt chồng lên nền tĩnh và chỉ đổi transform/opacity bằng CSS, nên trình duyệt vẽ mỗi
  // lớp một lần rồi ghép bằng bộ ghép lớp thay vì vẽ lại cả cảnh ở từng khung hình. Hộp viết theo tọa độ cảnh 420×260; vị trí tính ra phần trăm.
  const SW = 420, SH = 260;
  const pct = (v) => Math.round(v * 10000) / 100 + '%';
  // Vị trí tuyệt đối của hộp `box` trong hộp cha `ref`, kèm điểm xoay `pivot` (tọa độ cảnh) nếu có.
  function place(box, ref, pivot) {
    const [x, y, w, h] = box, r = ref || [0, 0, SW, SH];
    return 'left:' + pct((x - r[0]) / r[2]) + ';top:' + pct((y - r[1]) / r[3]) + ';width:' + pct(w / r[2]) + ';height:' + pct(h / r[3]) + (pivot ? ';transform-origin:' + pct((pivot[0] - x) / w) + ' ' + pct((pivot[1] - y) / h) : '');
  }
  function layer(cls, box, inner, pivot, ref) {
    return '<svg class="gr-st-layer ' + cls + '" viewBox="' + box.join(' ') + '" preserveAspectRatio="none" style="' + place(box, ref, pivot) + '" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  // Khung bọc tuyệt đối (div) để gắn một chuyển động lên cả nhóm lớp; mặc định phủ cả cảnh.
  function wrap(cls, inner, box, pivot, ref) {
    return '<div class="' + cls + '" style="' + place(box || [0, 0, SW, SH], ref, pivot) + '">' + inner + '</div>';
  }
  const BOX = {
    hair: [164, 38, 92, 132],
    body: [124, 128, 140, 56],
    head: [166, 40, 104, 122],
    beads: [240, 66, 26, 44],
    lids: [184, 96, 52, 24],
    fan: [244, 66, 92, 112],
    front: [90, 132, 240, 98],
    steam: [300, 128, 22, 24],
  };
  const PIVOT = { hair: [210, 132], body: [210, 184], head: [210, 146], beads: [252, 72], fan: [255, 160] };
  // Đèn lồng treo từ xà ngang (y = 12): hộp ôm quầng sáng và tua, dư hai bên cho biên độ lắc.
  function lamp(x, y, s, cls) {
    const half = 34 * s + 4, top = Math.floor(y - 34 * s - 1), bottom = Math.ceil(Math.max(y + 34 * s, y + 33 * s) + 3);
    return layer('gr-st-lamp ' + cls, [x - half, top, 2 * half, bottom - top], lantern(x, y, s), [x, 12]);
  }
  function owner() {
    const head = BOX.head;
    const headParts = layer('gr-st-part', head, face() + charm() + hairFront() + jewelry(), null, head) +
      layer('gr-st-beads', BOX.beads, beads(), PIVOT.beads, head) +
      layer('gr-st-lids', BOX.lids, lids(), null, head);
    return wrap('gr-st-owner',
      layer('gr-st-hair', BOX.hair, hairBack(), PIVOT.hair) +
      layer('gr-st-body', BOX.body, torso() + neck() + leftArm(), PIVOT.body) +
      wrap('gr-st-head', wrap('gr-st-nod', headParts, head, PIVOT.head, head), head, PIVOT.head) +
      wrap('gr-st-fanw', layer('gr-st-fan', BOX.fan, fanArm(), PIVOT.fan), null, PIVOT.fan));
  }
  function front() {
    return layer('gr-st-front', BOX.front, counter());
  }
  function steam() {
    return layer('gr-st-steam', BOX.steam, '<path d="M308,150 q-3,-5 0,-9 q3,-4 0,-8" fill="none" stroke="#fff" stroke-width="1.4" opacity=".55" stroke-linecap="round"/>') +
      layer('gr-st-steam gr-st-steam-b', BOX.steam, '<path d="M314,150 q3,-5 0,-9 q-3,-4 0,-8" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45" stroke-linecap="round"/>');
  }
  // Chân dung tròn của bà chủ cho khung lời tư vấn (chỉ đầu và cổ áo, không dùng gradient nên đặt ở đâu cũng được).
  function portrait() {
    const collar = '<path d="M166,162 L170,152 Q188,143 204,141 L216,141 Q232,143 250,152 L254,162Z" fill="#2f9a8c"/><path d="M198,141 L210,160 L222,141 L228,142 L210,166 L192,142Z" fill="#fff3dc"/><path d="M192,142 L210,166 M228,142 L210,166" stroke="#d4a84a" stroke-width="1.4" fill="none"/>';
    return '<svg class="gr-st-face" viewBox="160 40 112 120" role="img" aria-label="Chân dung bà chủ Liễu Linh Lung" focusable="false"><rect x="160" y="40" width="112" height="120" fill="#4a2c1c"/><circle cx="216" cy="98" r="52" fill="#6a432d"/>' + hairBack() + neck() + collar + face() + charm() + hairFront() + jewelry() + beads() + '</svg>';
  }

  function scene() {
    const win =
      '<g><circle cx="210" cy="98" r="60" fill="#2a190e"/><circle cx="210" cy="98" r="56" fill="url(#gst-sky)" /><g clip-path="url(#gst-win)"><circle cx="236" cy="70" r="20" fill="url(#gst-glow)"/><circle cx="236" cy="70" r="10.5" fill="#fff4d6"/><circle cx="240" cy="67" r="9" fill="#ffffff" opacity=".35"/><g fill="#fff" opacity=".8"><circle cx="170" cy="62" r="1"/><circle cx="188" cy="52" r="1.2"/><circle cx="262" cy="86" r="1"/><circle cx="176" cy="84" r=".8"/></g>' +
      '<path d="M150,122 L176,98 L194,112 L222,86 L248,110 L270,98 L270,160 L150,160Z" fill="#2c3556"/><path d="M150,138 L186,120 L226,134 L270,122 L270,160 L150,160Z" fill="#1d2440"/><ellipse cx="208" cy="132" rx="70" ry="7" fill="#fff" opacity=".12"/>' +
      '<path d="M150,76 C172,74 190,86 212,80" stroke="#1a1622" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/><g fill="#27392f" opacity=".9"><ellipse cx="170" cy="76" rx="9" ry="3.6"/><ellipse cx="196" cy="82" rx="8" ry="3.2"/></g></g>' +
      '<circle cx="210" cy="98" r="57" fill="none" stroke="#d4a84a" stroke-width="2"/><path d="M210,41 V155 M153,98 H267" stroke="#2a190e" stroke-width="3" opacity=".9"/></g>';
    let planks = '';
    for (let x = 0; x <= 420; x += 35) planks += '<line x1="' + x + '" y1="12" x2="' + x + '" y2="206" stroke="#2a190e" stroke-width="1" opacity=".22"/>';
    let floor = '';
    for (let x = -40; x <= 460; x += 46) floor += '<line x1="' + (210 + (x - 210) * 0.62) + '" y1="206" x2="' + x + '" y2="260" stroke="#2a190e" stroke-width="1" opacity=".3"/>';
    floor += '<line x1="0" y1="226" x2="420" y2="226" stroke="#2a190e" stroke-width="1" opacity=".25"/><line x1="0" y1="244" x2="420" y2="244" stroke="#2a190e" stroke-width="1" opacity=".25"/>';
    const label = 'Tàng Bảo Các: quầy hàng gỗ ấm đèn lồng, giá sách bí kíp và rương ở bên trái, nhà trọ, sơn trang, mắt thần và ba cuộn quân sư ở bên phải; bà chủ Liễu Linh Lung đứng sau quầy, tay cầm quạt, mỉm cười';
    // Nền tĩnh (một SVG, chứa toàn bộ defs); phần chuyển động nằm ở các lớp chồng lên, theo đúng thứ tự vẽ cũ: đèn < bà chủ < quầy < khói trà.
    return (
      '<div class="gr-st-scene" role="img" aria-label="' + label + '">' +
      '<svg class="gr-st-base" viewBox="0 0 420 260" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="gst-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a432d"/><stop offset="1" stop-color="#46291b"/></linearGradient>' +
      '<linearGradient id="gst-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b5033"/><stop offset="1" stop-color="#4e301f"/></linearGradient>' +
      '<linearGradient id="gst-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2748"/><stop offset=".62" stop-color="#4a4f7e"/><stop offset="1" stop-color="#e2a98a"/></linearGradient>' +
      '<radialGradient id="gst-glow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gst-lantern" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ff8a6a"/><stop offset=".6" stop-color="#d9452f"/><stop offset="1" stop-color="#9c2a1c"/></radialGradient>' +
      '<linearGradient id="gst-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a87850"/><stop offset="1" stop-color="#7a5236"/></linearGradient>' +
      '<linearGradient id="gst-robe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fb0a0"/><stop offset="1" stop-color="#1f7a70"/></linearGradient>' +
      '<pattern id="gst-lat" width="22" height="24" patternUnits="userSpaceOnUse"><rect x="2" y="3" width="18" height="18" rx="2" fill="none" stroke="#2d1a0f" stroke-width="1.6" opacity=".7"/><path d="M2,12 H20 M11,3 V21" stroke="#2d1a0f" stroke-width=".8" opacity=".5"/></pattern>' +
      '<clipPath id="gst-win"><circle cx="210" cy="98" r="55"/></clipPath></defs>' +
      '<rect width="420" height="206" fill="url(#gst-wall)"/>' + planks +
      '<rect y="206" width="420" height="54" fill="url(#gst-floor)"/>' + floor +
      '<rect y="164" width="420" height="42" fill="#2a190e" opacity=".28"/>' +
      '<rect width="420" height="12" fill="#2a190e"/><rect y="12" width="420" height="2" fill="#7a5236"/>' +
      win + leftShelf() + rightShelf() + plaque() + floorStock() +
      '</svg>' +
      lamp(56, 33, .84, '') + lamp(364, 33, .84, 'gr-st-sway-b') + lamp(124, 31, .6, 'gr-st-sway-c') + lamp(296, 31, .6, '') +
      owner() + front() + steam() +
      '</div>'
    );
  }

  // ---- Hình từng món (khung 64×64, màu viết thẳng vào thuộc tính) --------------------------------------------------------------
  const PIC = {
    inn: () =>
      '<ellipse cx="32" cy="56" rx="26" ry="3.2" fill="#000" opacity=".16"/><rect x="10" y="35" width="44" height="20" fill="#ead8b6"/><rect x="10" y="35" width="44" height="3" fill="#cdb78d"/>' +
      '<rect x="28" y="41" width="8" height="14" rx="1" fill="#7a4a2a"/><circle cx="34" cy="48.5" r=".9" fill="#ffd98a"/><g fill="#ffd98a"><rect x="14" y="40" width="9" height="8" rx="1"/><rect x="41" y="40" width="9" height="8" rx="1"/></g>' +
      '<path d="M18.5,40 V48 M14,44 H23 M45.5,40 V48 M41,44 H50" stroke="#8a5a36" stroke-width=".9" fill="none"/><rect x="18" y="22" width="28" height="13" fill="#f2e4c4"/><rect x="28" y="25" width="8" height="7" rx="1" fill="#ffd98a"/><path d="M32,25 V32 M28,28.5 H36" stroke="#8a5a36" stroke-width=".8"/>' +
      '<path d="M2,38 C10,37.5 13,33 18,31 L46,31 C51,33 54,37.5 62,38 L57,40 L7,40Z" fill="#4a5a6a"/><path d="M18,31 H46" stroke="#6d7e90" stroke-width="1.2"/><path d="M13,24 C19,23 21,19 26,17 L38,17 C43,19 45,23 51,24 L46,26 L18,26Z" fill="#3b4856"/>' +
      '<circle cx="32" cy="14.6" r="2.4" fill="#d4a84a"/><path d="M32,12 V17" stroke="#d4a84a" stroke-width="1"/><line x1="9" y1="40" x2="9" y2="44" stroke="#d4a84a" stroke-width="1"/><ellipse cx="9" cy="47" rx="3.2" ry="4" fill="#d9452f"/><rect x="7" y="43.5" width="4" height="1.6" fill="#d4a84a"/>',
    villa: () =>
      '<ellipse cx="32" cy="57" rx="27" ry="3" fill="#000" opacity=".14"/><path d="M0,56 L16,26 L25,38 L38,16 L64,56Z" fill="#aab4c2"/><path d="M6,56 L24,30 L34,42 L46,26 L64,56Z" fill="#7c8794"/><path d="M38,16 L33,26 L38,24 L42,28Z" fill="#fff" opacity=".8"/>' +
      '<path d="M24,40 Q30,44 26,50 Q22,54 30,57" stroke="#f2e4c4" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="2.4 2.2"/>' +
      '<rect x="18" y="26" width="12" height="6" fill="#ead8b6"/><rect x="22.5" y="27.6" width="3" height="4.4" fill="#7a4a2a"/><path d="M14,27.4 C18,26.4 20,23.4 24,21 C28,23.4 30,26.4 34,27.4 L31,29 L17,29Z" fill="#8f3a2a"/><circle cx="24" cy="19.8" r="1.5" fill="#d4a84a"/>' +
      '<ellipse cx="34" cy="50" rx="30" ry="3.6" fill="#fff" opacity=".42"/><rect x="47.2" y="48" width="1.7" height="8" fill="#5a3622"/><path d="M48,35 L42,46 L54,46Z M48,41 L40,52 L56,52Z" fill="#3f7a52"/><path d="M48,41 L44,47 L52,47Z" fill="#2f6040" opacity=".6"/>',
    'book-tt': () =>
      '<circle cx="32" cy="34" r="27" fill="#ffe8a3" opacity=".28"/><circle cx="32" cy="34" r="20" fill="#ffe8a3" opacity=".34"/><path d="M32,26 Q21,21 8,25 L8,48 Q21,44 32,49Z" fill="#f7edd2"/><path d="M32,26 Q43,21 56,25 L56,48 Q43,44 32,49Z" fill="#efe2bf"/><path d="M32,26 V49" stroke="#b59a68" stroke-width="1.2"/>' +
      '<path d="M12,30 Q21,27 28,30 M12,35 Q21,32 28,35 M12,40 Q21,37 28,40 M36,30 Q43,27 52,30 M36,35 Q43,32 52,35 M36,40 Q43,37 52,40" stroke="#b59a68" stroke-width="1" fill="none" opacity=".8"/>' +
      '<path d="M32,5 C36,11 38,13 38,17 C38,21 35,23 32,23 C29,23 26,21 26,17 C26,13 30,11 32,5Z" fill="#ff9a4a"/><path d="M32,12 C34,15 35,16 35,18.5 C35,20.6 33.6,21.6 32,21.6 C30.4,21.6 29,20.6 29,18.5 C29,16 31,15 32,12Z" fill="#ffd45a"/>' +
      '<g fill="#ffd45a"><path d="M12,14 l1.4,3 3,1.4 -3,1.4 -1.4,3 -1.4,-3 -3,-1.4 3,-1.4z"/><path d="M52,12 l1.1,2.4 2.4,1.1 -2.4,1.1 -1.1,2.4 -1.1,-2.4 -2.4,-1.1 2.4,-1.1z"/></g>',
    'book-vc': () =>
      '<ellipse cx="32" cy="56" rx="26" ry="3" fill="#000" opacity=".16"/><rect x="8" y="42" width="48" height="12" rx="1.6" fill="#2f6d8f"/><rect x="8" y="42" width="48" height="2.6" fill="#4a8cb0"/><rect x="12" y="47" width="42" height="5" fill="#f4e8cc"/>' +
      '<rect x="12" y="30" width="44" height="12" rx="1.6" fill="#b3402f"/><rect x="12" y="30" width="44" height="2.6" fill="#d3604a"/><rect x="15" y="35.4" width="39" height="5" fill="#f4e8cc"/><rect x="10" y="18" width="42" height="12" rx="1.6" fill="#4f8a5b"/><rect x="10" y="18" width="42" height="2.6" fill="#6caa78"/><rect x="13" y="23.4" width="37" height="5" fill="#f4e8cc"/>' +
      '<path d="M20,18 V54" stroke="#d4a84a" stroke-width="1.4"/><rect x="18.6" y="30" width="2.8" height="5" fill="#d4a84a"/><rect x="31" y="19.8" width="14" height="6" rx="1" fill="#f4e8cc"/><path d="M34,22.8 h8" stroke="#c9382a" stroke-width="1.6" stroke-linecap="round"/>',
    chest: () =>
      '<ellipse cx="32" cy="57" rx="27" ry="3" fill="#000" opacity=".16"/><circle cx="32" cy="30" r="24" fill="#ffe8a3" opacity=".24"/><path d="M13,5 L51,5 L56,24 L8,24Z" fill="#7a4a2a"/><path d="M13,5 H51" stroke="#d4a84a" stroke-width="2"/><path d="M15,10 H49 M13,16 H51" stroke="#5a3622" stroke-width="1" opacity=".6"/>' +
      '<rect x="13" y="20" width="7" height="22" rx="3.5" fill="#f4e8cc" transform="rotate(-10 16.5 31)"/><rect x="21" y="15" width="7" height="27" rx="3.5" fill="#efdfba"/><rect x="29.5" y="18" width="7" height="24" rx="1.2" fill="#b3402f"/><rect x="37" y="21" width="7" height="21" rx="1.2" fill="#2f6d8f"/><rect x="44" y="24" width="6" height="18" rx="1.2" fill="#4f8a5b"/>' +
      '<path d="M21,22 h7 M29.5,24 h7" stroke="#c9382a" stroke-width="1.4" opacity=".85"/><rect x="8" y="34" width="48" height="21" rx="2" fill="#8a5a36"/><rect x="8" y="34" width="48" height="4" fill="#a8794a"/><rect x="15" y="34" width="4" height="21" fill="#d4a84a"/><rect x="45" y="34" width="4" height="21" fill="#d4a84a"/>' +
      '<rect x="28" y="38" width="8" height="9" rx="1.5" fill="#f1dca0"/><circle cx="32" cy="42" r="1.4" fill="#5a3622"/>',
    eye: () =>
      '<path d="M32,44 L24,59 M32,44 L40,59 M32,44 V59" stroke="#4a3a2a" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="8" y="16" width="48" height="30" rx="7" fill="#2f2a33"/><rect x="8" y="16" width="48" height="8" rx="4" fill="#443c4a"/><rect x="14" y="10" width="14" height="7" rx="2" fill="#2f2a33"/>' +
      '<circle cx="48" cy="22" r="4.6" fill="#e0443a" opacity=".24"/><circle cx="48" cy="22" r="2.4" fill="#e0443a"/><circle cx="32" cy="31" r="12.5" fill="#d4a84a"/><circle cx="32" cy="31" r="10.5" fill="#1e1a22"/>' +
      '<path d="M21.5,31 Q32,22 42.5,31 Q32,40 21.5,31Z" fill="#fffaf0"/><circle cx="32" cy="31" r="5" fill="#2e5fa8"/><circle cx="32" cy="31" r="2.4" fill="#12121c"/><circle cx="30.4" cy="29.4" r="1.4" fill="#fff"/>' +
      '<path d="M55,8 Q61,12 61,18 M52,11 Q56,14 56,18" stroke="#ffd45a" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    ai: (c) =>
      '<line x1="16" y1="6" x2="16" y2="60" stroke="#5a3622" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="6" r="3" fill="#d4a84a"/><path d="M18,9 H52 L45,18.5 L52,28 H18Z" fill="' + c + '" stroke="#d4a84a" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M25,21 L32,13.5 L39,19 L33,23.5Z" fill="none" stroke="#fff3dc" stroke-width="1.2" stroke-linejoin="round" opacity=".85"/><g fill="#fff3dc"><circle cx="25" cy="21" r="2"/><circle cx="32" cy="13.5" r="2"/><circle cx="39" cy="19" r="2"/><circle cx="33" cy="23.5" r="2"/></g>' +
      '<path d="M20,28 V34 M24,28 V32 M28,28 V35" stroke="#d4a84a" stroke-width="1.1" fill="none"/>' +
      '<g transform="translate(42 59)">' + [-44, -22, 0, 22, 44].map((a) => '<path d="M0,-1 C-5,-8 -5,-21 0,-29 C5,-21 5,-8 0,-1Z" fill="#f7f2e6" stroke="#cdbfa0" stroke-width=".8" stroke-linejoin="round" transform="rotate(' + a + ')"/><path d="M0,-3 V-24" stroke="#d9cdb0" stroke-width=".7" transform="rotate(' + a + ')"/>').join('') + '<rect x="-2" y="-2" width="4" height="8" rx="1.4" fill="#d4a84a"/></g>',
  };
  function pic(key, size, color) {
    const f = PIC[key];
    return '<svg class="gr-st-pic" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' + (f ? f(color) : '') + '</svg>';
  }

  // ---- Vật phẩm ----------------------------------------------------------------------------------------------------------------
  // fit = các mạch (chỉ số 0–7 của Bát phương đồ) hợp với món; chỉ để gợi ý, món nào cũng trả được bằng cả tám mạch.
  // Phương: 0 Đạo tâm · 1 Tài lộc · 2 Tâm cảnh · 3 Nhân duyên · 4 Thân thể · 5 Trí tuệ · 6 Sự nghiệp · 7 Gia đạo (v2.59.0; trước: 0 Nghiệp quả, 4 Thể lực, 7 Tinh thần).
  const KIP_PICK = (n) => [
    { id: 'tt', label: 'Tinh thần', pic: 'book-tt', fit: [5, 0], name: 'tinh thần (' + n + ' quyển)', say: 'Bí kíp tinh thần nuôi trí và nuôi thần: sách điện tử, khóa học, âm thanh, đọc xong còn mang theo được.' },
    { id: 'vc', label: 'Vật chất', pic: 'book-vc', fit: [5, 1], name: 'vật chất (' + n + ' quyển)', say: 'Bí kíp vật chất là sách giấy cầm trên tay: nặng túi hơn, nhưng để được lâu trên giá.' },
  ];
  const ITEMS = [
    { id: 'tro', name: 'Nhà trọ', tag: 'Nghỉ chân', base: 'Nhà trọ', pic: 'inn', fit: [4, 2], blurb: 'Một đêm ngủ yên giữa đường, hoặc vài đêm dưỡng sức cho lại gân cốt.', say: 'Nhà trọ lo chỗ nằm yên cho thân và chỗ nghỉ cho tâm, hợp lúc các hạ đã chạy dài.', pre: () => 'Nhà trọ' },
    { id: 'son', name: 'Sơn trang', tag: 'Ẩn cư', base: 'Sơn trang', pic: 'villa', fit: [2, 7, 3], blurb: 'Lên núi ở lại sơn trang vài ngày, xa tiếng ồn, để lòng lắng xuống.', say: 'Sơn trang hợp lúc các hạ cần tĩnh tâm, hoặc muốn rủ người thân cùng nghỉ.', pre: () => 'Sơn trang' },
    { id: 'kip', name: 'Bí kíp tu luyện', tag: 'Đổi lẻ · 1 quyển', base: 'Bí kíp tu luyện', pick: KIP_PICK(1), blurb: 'Mỗi lần một quyển. Loại tinh thần là sách điện tử, khóa học, âm thanh; loại vật chất là sách giấy.', pre: (p) => 'Bí kíp tu luyện · ' + p.name },
    { id: 'ruong', name: 'Rương bí kíp', tag: 'Đổi sỉ · 100 quyển', base: 'Rương bí kíp', pick: KIP_PICK(100), blurb: 'Cả rương một trăm bí kíp, đổi sỉ một lần. Cũng chia hai loại tinh thần và vật chất.', sayExtra: ' Đổi sỉ thì lấy cả rương trăm quyển: lâu mới lấy một lần, nhưng đủ dùng cho cả mùa luyện.', pic: 'chest', pre: (p) => 'Rương bí kíp · ' + p.name },
    { id: 'nhan', name: 'Thiên Lý Nhãn', tag: 'Mắt thần truyền thông', base: 'Thiên Lý Nhãn', pic: 'eye', fit: [6, 1, 3], blurb: 'Camera: con mắt thần ghi lại hình ảnh và truyền đi xa, cho việc làm lẫn kỷ niệm.', say: 'Thiên Lý Nhãn nhìn xa ngàn dặm: ghi hình cho công việc, cho kỷ niệm, cho người ở xa.', pre: () => 'Thiên Lý Nhãn (camera)' },
    { id: 'ai', name: 'Quân sư & tướng lĩnh AI', tag: 'Trợ thủ AI', base: 'Quân sư AI', pic: 'ai', fit: [5, 6], blurb: 'Quân sư bày mưu, tướng lĩnh xông pha việc học và việc làm. Chọn một trong ba: Gemini Pro, ChatGPT Plus hoặc Claude Pro.', say: 'Quân sư AI bày mưu, tướng lĩnh AI xông pha: tùy các hạ chọn vị nào hợp tay.',
      pick: [{ id: 'gemini', label: 'Gemini Pro', color: '#4f7cf0' }, { id: 'chatgpt', label: 'ChatGPT Plus', color: '#2fa58a' }, { id: 'claude', label: 'Claude Pro', color: '#d9714a' }], pre: (p) => 'Quân sư AI · ' + p.label },
  ];
  const sel = { item: '', pick: {} };
  const itemById = (id) => ITEMS.find((x) => x.id === id);
  const pickOf = (it) => (it.pick ? it.pick.find((p) => p.id === sel.pick[it.id]) || it.pick[0] : null);
  const fitOf = (it) => (pickOf(it)?.fit || it.fit || []).slice();
  const nameOf = (it) => it.pre(pickOf(it));
  const sayOf = (it) => (pickOf(it)?.say || it.say || '') + (it.sayExtra || '');
  const picOf = (it) => {
    const p = pickOf(it);
    return pic(p?.pic || it.pic, 64, p?.color);
  };
  const norm = (s) => String(s).trim().toLocaleLowerCase('vi');
  // Số lần đã đổi món này (các lần chưa hủy, tên bắt đầu bằng tên gốc của món) và tổng điểm đã trừ.
  function usedOf(it) {
    const g = G().growth(), list = (g && g.spend ? g.spend : []).filter((e) => !e.x && norm(e.n).startsWith(norm(it.base)));
    return { n: list.length, points: list.reduce((a, e) => a + e.p.reduce((x, y) => x + y, 0), 0) * G().STEP };
  }

  // ---- Lời tư vấn của bà chủ --------------------------------------------------------------------------------------------------
  // Không niêm yết giá: bà chủ chỉ nhìn tu vi hiện có ở từng mạch và nói mạch nào dồi dào, mạch nào hợp món; số điểm trừ do hiệp khách tự định.
  const OWNER = { name: 'Liễu Linh Lung', title: 'Chưởng quỹ Tàng Bảo Các' };
  const CLOSE = 'Giá do các hạ tự định theo cảm nhận của mình; tám mạch nào cũng trả được, nhiều hay ít đều tùy tâm.';
  function advise(it, bal) {
    const A = G().AXES, num = G().fmt, sum = bal.reduce((a, b) => a + b, 0);
    const order = bal.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
    const out = { hello: '', item: '', fit: '', close: CLOSE, fitAxes: [], rich: order.filter((x) => x[0] > 0).slice(0, 2).map((x) => x[1]) };
    if (sum <= 0) out.hello = 'Các hạ chưa có tu vi để quy đổi. Hoàn thành vài việc rồi ghé lại, tiểu nữ giữ sẵn món này.';
    else if (sum < 5) out.hello = 'Tu vi các hạ còn mỏng, mới ' + num(sum) + ' điểm. Mỏng cũng không sao: đổi ít vẫn được, tiệm không niêm yết giá.';
    else out.hello = 'Tu vi các hạ đang có ' + num(sum) + ' điểm; dồi dào nhất là ' + A[order[0][1]].name + ' (' + num(order[0][0]) + ')' + (order[1][0] > 0 ? ', kế đó ' + A[order[1][1]].name + ' (' + num(order[1][0]) + ')' : '') + '.';
    if (!it) {
      out.item = 'Chọn một món rồi bấm “Hỏi bà chủ” để nghe tiểu nữ tư vấn, hoặc bấm “Quy đổi” nếu đã ưng ý.';
      return out;
    }
    out.item = sayOf(it);
    const fit = fitOf(it), have = fit.filter((i) => bal[i] > 0);
    out.fitAxes = fit;
    const list = (a) => a.map((i) => A[i].name + ' (' + num(bal[i]) + ')').join(', ');
    if (sum <= 0) out.fit = 'Món này hợp mạch ' + fit.map((i) => A[i].name).join(', ') + '.';
    else if (have.length) out.fit = 'Món này hợp mạch ' + fit.map((i) => A[i].name).join(', ') + '. Đang có ' + list(have) + ': lấy từ đó thì thuận nhất.';
    else out.fit = 'Món này hợp mạch ' + fit.map((i) => A[i].name).join(', ') + ', nhưng các mạch ấy đang trống. Lấy từ ' + A[order[0][1]].name + ' cũng được.';
    return out;
  }
  // Một dòng gợi ý ngắn dưới mỗi món: mạch hợp nào đang có điểm.
  function hintOf(it, bal) {
    const A = G().AXES, num = G().fmt, fit = fitOf(it), have = fit.filter((i) => bal[i] > 0);
    if (!bal.some((v) => v > 0)) return 'Chưa có tu vi để quy đổi.';
    if (!have.length) return 'Mạch hợp (' + fit.map((i) => A[i].name).join(', ') + ') đang trống; lấy từ mạch khác cũng được.';
    return 'Nên lấy từ ' + have.map((i) => A[i].name + ' ' + num(bal[i])).join(', ') + '.';
  }

  // ---- Khung trên trang Tu vi ---------------------------------------------------------------------------------------------------
  const reduce = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function bars(bal, mark) {
    const A = G().AXES, max = Math.max(0, ...bal);
    return '<ul class="gr-store-bars" aria-label="Tu vi hiện có ở tám mạch">' + A.map((a, i) => '<li class="' + (mark.includes(i) ? 'is-fit' : '') + '" style="--c:' + a.color + '"><span>' + a.name + '</span><i aria-hidden="true"><b style="width:' + (max ? Math.round((bal[i] / max) * 100) : 0) + '%"></b></i><em>' + G().fmt(bal[i]) + '</em></li>').join('') + '</ul>';
  }
  function talk() {
    const it = itemById(sel.item), bal = G().scores(), a = advise(it, bal);
    const lines = [a.hello, a.item, a.fit].filter(Boolean).map((t) => '<p>' + esc(t) + '</p>').join('');
    return '<div class="gr-store-owner"><span class="gr-store-face">' + portrait() + '</span><div><strong>' + OWNER.name + '</strong><small>' + OWNER.title + '</small></div></div>' +
      '<div class="gr-store-say" role="status" aria-live="polite">' + lines + '<p class="gr-store-close">' + esc(a.close) + '</p></div>' + bars(bal, a.fitAxes);
  }
  function card(it) {
    const bal = G().scores(), u = usedOf(it), p = pickOf(it), A = G().AXES, fit = fitOf(it);
    const chips = it.pick
      ? '<fieldset class="gr-store-pick"><legend>' + (it.id === 'ai' ? 'Chọn quân sư' : 'Chọn loại') + '</legend>' +
        it.pick.map((x) => '<label class="gr-store-chip"' + (x.color ? ' style="--dot:' + x.color + '"' : '') + '><input type="radio" name="gr-st-' + it.id + '" value="' + x.id + '"' + (p.id === x.id ? ' checked' : '') + '><span>' + esc(x.label) + '</span></label>').join('') + '</fieldset>'
      : '';
    const pay = '<span class="gr-store-pay" role="img" aria-label="Trả được bằng cả tám mạch: ' + A.map((a) => a.name).join(', ') + '">' + A.map((a, i) => '<i class="' + (fit.includes(i) ? 'is-fit' : '') + '" style="--c:' + a.color + '"></i>').join('') + '</span>';
    return '<li class="gr-store-item' + (sel.item === it.id ? ' is-asked' : '') + '" data-item="' + it.id + '"><div class="gr-store-pic">' + picOf(it) + '</div>' +
      '<div class="gr-store-info"><div class="gr-store-name"><h3>' + esc(it.name) + '</h3><em class="gr-store-tag">' + esc(it.tag) + '</em></div><p class="gr-store-blurb">' + esc(it.blurb) + '</p>' + chips +
      '<div class="gr-store-meta">' + pay + '<span class="gr-store-hint">' + esc(hintOf(it, bal)) + '</span></div>' + (u.n ? '<small class="gr-store-used">Đã đổi ' + u.n + ' lần · ' + G().fmt(u.points) + ' điểm</small>' : '') + '</div>' +
      '<div class="gr-store-act"><button type="button" class="btn" data-gr-shop-ask="' + it.id + '" aria-label="Hỏi bà chủ về ' + esc(it.name) + '">Hỏi bà chủ</button><button type="button" class="btn primary" data-gr-shop-buy="' + it.id + '" aria-label="Quy đổi ' + esc(it.name) + '">Quy đổi</button></div></li>';
  }
  function panel() {
    if (!G() || !G().growth()) return '';
    return '<section class="panel gr-store" id="gr-store" aria-labelledby="gr-store-title"><h2 id="gr-store-title" tabindex="-1">Tàng Bảo Các <small>kho vật phẩm</small></h2>' +
      '<p class="help-copy">Tiệm không niêm yết giá. Bấm Quy đổi ở món các hạ ưng, rồi tự nhập số điểm muốn trừ ở từng mạch theo cảm nhận của mình: tám mạch đều trả được, có bao nhiêu điểm cũng đổi được, nhiều hay ít tùy tâm.</p>' +
      '<div class="gr-store-hero"><div class="gr-store-art">' + scene() + '</div><div class="gr-store-talk">' + talk() + '</div></div><ul class="gr-store-items">' + ITEMS.map(card).join('') + '</ul></section>';
  }
  // Lời bà chủ trong bảng quy đổi (growth.js đặt dưới tiêu đề của hộp thoại).
  function strip(it) {
    const a = advise(it, G().scores());
    return '<aside class="gr-store-strip" aria-label="Lời tư vấn của bà chủ"><span class="gr-store-face">' + portrait() + '</span><div><strong>' + OWNER.name + '</strong>' +
      [a.item, a.fit].filter(Boolean).map((t) => '<p>' + esc(t) + '</p>').join('') + '<p class="gr-store-close">' + esc(a.close) + '</p></div></aside>';
  }

  // ---- Thao tác -------------------------------------------------------------------------------------------------------------------
  function refreshTalk() {
    const box = document.querySelector('.gr-store-talk');
    if (box) box.innerHTML = talk();
  }
  function refreshCard(id) {
    const li = document.querySelector('.gr-store-item[data-item="' + id + '"]'), it = itemById(id);
    if (!li || !it) return;
    const t = document.createElement('template');
    t.innerHTML = card(it);
    li.replaceWith(t.content.firstElementChild);
    document.querySelector('.gr-store-item[data-item="' + id + '"] input:checked')?.focus();
  }
  function mark(id) {
    sel.item = id;
    refreshTalk();
    document.querySelectorAll('.gr-store-item').forEach((li) => li.classList.toggle('is-asked', li.dataset.item === id));
  }
  // Bà chủ gật đầu, phe phẩy quạt khi được hỏi; lớp is-talk tự gỡ sau khi cử động xong (không có chuyển động khi tắt hiệu ứng).
  let talkTimer = 0;
  function reactTalk() {
    const sc = document.querySelector('.gr-st-scene');
    if (!sc) return;
    sc.classList.remove('is-talk');
    void sc.offsetWidth;
    sc.classList.add('is-talk');
    clearTimeout(talkTimer);
    talkTimer = setTimeout(() => sc.classList.remove('is-talk'), 1500);
  }
  function ask(id) {
    if (!itemById(id)) return;
    mark(id);
    reactTalk();
    const hero = document.querySelector('.gr-store-hero');
    if (hero) {
      const r = hero.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) hero.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
    }
  }
  function buy(id) {
    const it = itemById(id);
    if (!it) return;
    mark(id);
    G().openSpend(undefined, { name: nameOf(it), fit: fitOf(it), strip: strip(it), eyebrow: 'TÀNG BẢO CÁC', title: 'Bảng quy đổi · ' + it.name, owner: OWNER.name });
  }
  function go() {
    if (!document.getElementById('gr-store')) window.zenTabs?.go('store', { focus: false }); // v2.68.0: Tàng Bảo Các nằm ở tab riêng
    const box = document.getElementById('gr-store');
    if (!box) return;
    box.scrollIntoView({ block: 'start', behavior: reduce() ? 'auto' : 'smooth' });
    document.getElementById('gr-store-title')?.focus({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-gr-shop-ask],[data-gr-shop-buy],[data-gr-store-go]');
    if (!t) return;
    if (t.dataset.grShopAsk) ask(t.dataset.grShopAsk);
    else if (t.dataset.grShopBuy) buy(t.dataset.grShopBuy);
    else go();
  });
  document.addEventListener('change', (e) => {
    const r = e.target.closest?.('.gr-store-pick input');
    if (!r) return;
    const id = r.closest('.gr-store-item').dataset.item;
    sel.pick[id] = r.value;
    refreshCard(id);
    if (sel.item === id) refreshTalk();
  });

  window.zenStore = { OWNER, ITEMS, scene, portrait, pic, advise, hintOf, panel, strip, ask, buy, nameOf, fitOf, usedOf, sel };
})();
