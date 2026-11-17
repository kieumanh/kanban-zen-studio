/* Huy hiệu từng cấp (v2.32.0, "Huy Hiệu Bách Cấp"): mỗi cấp trong 103 cấp tu vi một biểu tượng riêng, vẽ bằng SVG ngay trong trình duyệt.
 *  - Khung đổi theo cảnh giới (11 cảnh giới: đồng mộc → đồng đỏ → thép → bạc lam → ngọc bích → lam bảo → tử ngọc → chu sa → hoàng kim
 *    → bạch kim → thần quang), càng lên cao càng nhiều lớp: vòng, đinh tán, hoa văn, tia sáng, nhành nguyệt quế, cánh và vương miện.
 *  - Hình giữa theo danh xưng của cấp (ví dụ cấp 12 "Khinh Thân Như Yến" là chim yến, cấp 36 "Nhất Kích Tất Trúng" là mũi tên trúng
 *    hồng tâm); các ngọc quanh vành sáng dần theo vị trí của cấp trong cảnh giới, cấp cuối thì sáng đủ và thêm vòng viên mãn.
 *  - Chỉ vẽ bằng thuộc tính SVG (không style nội tuyến) nên chạy dưới CSP chặt. Mỗi cấp là một <symbol> dùng chung, chỉ dựng khi cần.
 *  API: zenEmblem.spec(cấp), .markup(cấp), .html(cấp, lớp), .ensure(cấp), .detail(cấp), .label(cấp, tên), .pop(cấp, tên). */
(() => {
  'use strict';
  const COUNT = 103;
  const FROM = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 104]; // cấp đầu của từng cảnh giới (phần tử cuối: chặn trên)
  const RAD = Math.PI / 180;
  const f = (n) => Math.round(n * 100) / 100;
  const pol = (r, deg) => [f(Math.cos(deg * RAD) * r), f(Math.sin(deg * RAD) * r)];
  const poly = (n, r, rot = -90) => Array.from({ length: n }, (_, i) => pol(r, rot + (360 / n) * i).join(',')).join(' ');
  const starPts = (n, ro, ri, rot = -90) => Array.from({ length: n * 2 }, (_, i) => pol(i % 2 ? ri : ro, rot + (180 / n) * i).join(',')).join(' ');
  const realmOf = (lv) => FROM.findIndex((_, i) => lv < FROM[i + 1]) + 1; // 1..11

  // Bảng màu theo cảnh giới (chỉ số = cảnh giới): l sáng, m vừa, d tối, g gần trắng, a nhấn; fc/fe màu tâm/rìa ruộng, rim: dải màu vành.
  const PAL = [
    null,
    { l: '#ecd2ae', m: '#b98a58', d: '#6b4527', g: '#fff3df', a: '#d9a35f' },
    { l: '#f3c9a3', m: '#d08550', d: '#7e4120', g: '#fff1e2', a: '#ff9f68' },
    { l: '#dfe5ee', m: '#93a2b8', d: '#44536b', g: '#f6f9fe', a: '#9ec1ff' },
    { l: '#e8f3f3', m: '#8ec0c2', d: '#376a6e', g: '#ffffff', a: '#7fe3e0' },
    { l: '#d9f3df', m: '#5dbb8b', d: '#1f6a4a', g: '#f2fff6', a: '#8ff0b6' },
    { l: '#d8e6ff', m: '#5b8fe3', d: '#25448f', g: '#f1f6ff', a: '#8fb7ff' },
    { l: '#e8dcfb', m: '#9b70de', d: '#573795', g: '#f8f2ff', a: '#c9a8ff' },
    { l: '#ffd6d6', m: '#e0555d', d: '#8a2030', g: '#fff3f3', a: '#ff8f8f' },
    { l: '#fff0b8', m: '#e8b93c', d: '#8f5f0f', g: '#fffbe6', a: '#ffd966' },
    { l: '#fbf7ec', m: '#dccfae', d: '#7a6840', g: '#ffffff', a: '#ffd25a', fc: '#4a4f7a', fe: '#14172e' },
    { l: '#e6f6ff', m: '#a9c7ff', d: '#5a3fb8', g: '#ffffff', a: '#7ff4ff', fc: '#3d3190', fe: '#0b0720', rim: [[0, '#ffffff'], [0.22, '#c9f6ff'], [0.45, '#d3b9ff'], [0.7, '#ffc6ec'], [1, '#8f7bff']] },
  ];

  // ---- Hình vẽ cơ bản (hệ toạ độ −30…30, tâm ở giữa); mỗi hàm trả chuỗi SVG ---------------------------------------------------
  function prims(c) {
    const F = c.g, L = c.l, M = c.m, D = c.d, A = c.a;
    const S = (w = 0.9) => 'stroke="' + D + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"';
    const G = (x, y, r, s, body) => '<g transform="translate(' + f(x) + ' ' + f(y) + ')' + (r ? ' rotate(' + f(r) + ')' : '') + (s !== 1 ? ' scale(' + f(s) + ')' : '') + '">' + body + '</g>';
    const line = (d, col = F, w = 1.6) => '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
    const P = {};
    P.line = line;
    P.dot = (x, y, r = 1.6, col = F) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + r + '" fill="' + col + '" ' + S(0.5) + '/>';
    P.ring = (x, y, r, col = F, w = 1.4) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"/>';
    P.sword = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M0-10 2.2-1.5V3.2H-2.2V-1.5Z" fill="' + F + '" ' + S() + '/><path d="M0-8.5V2.5" stroke="' + M + '" stroke-width=".6"/><rect x="-4.6" y="3.2" width="9.2" height="1.8" rx=".7" fill="' + M + '" ' + S(0.6) + '/><rect x="-1" y="5" width="2" height="4.2" fill="' + L + '" ' + S(0.6) + '/><circle cy="10" r="1.4" fill="' + M + '" ' + S(0.6) + '/>');
    P.blade = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M0-12 1.8 0 0 4-1.8 0Z" fill="' + F + '" ' + S(0.7) + '/>');
    P.leaf = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M0 9Q7 0 0-9Q-7 0 0 9Z" fill="' + F + '" ' + S() + '/><path d="M0 8V-6" stroke="' + M + '" stroke-width=".7"/>');
    P.petal = (x, y, r = 0, s = 1, col = F) => G(x, y, r, s, '<path d="M0 9C8 4 8-5 0-9C-8-5-8 4 0 9Z" fill="' + col + '" ' + S() + '/>');
    P.flame = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M0 10C-6 9-8 3-4-2-3 2-1 3 0 2-1-3 1-6 2-11 7-6 9 0 8 4 7 8 4 10 0 10Z" fill="' + F + '" ' + S() + '/><path d="M0 10C-3 9-4 6-2 3 0 5 1 5 2 3 4 5 4 9 0 10Z" fill="' + A + '"/>');
    P.cloud = (x, y, s = 1, col = F) => G(x, y, 0, s, '<g fill="' + col + '"><circle cx="-6" cy="1" r="5"/><circle cx="0" cy="-3" r="6.4"/><circle cx="6.5" cy="1" r="4.8"/><rect x="-11" y="1" width="22" height="5.2" rx="2.6"/></g>');
    P.bolt = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M2-10-6 2H-1L-3 10 6-3H1Z" fill="' + F + '" ' + S() + '/>');
    P.star = (x, y, n, ro, ri, col = F, rot = -90) => '<polygon points="' + starPts(n, ro, ri, rot).split(' ').map((p) => p.split(',').map((v, i) => f(+v + (i ? y : x))).join(',')).join(' ') + '" fill="' + col + '" ' + S(0.5) + '/>';
    P.spark = (x, y, s = 1) => G(x, y, 0, s, '<path d="M0-4Q.6-.6 4 0 .6.6 0 4-.6.6-4 0-.6-.6 0-4Z" fill="' + F + '"/>');
    P.mountain = (x, y, r = 0, s = 1, snow = true) => G(x, y, r, s, '<path d="M-12 8-3-8 2 0 6-4 12 8Z" fill="' + L + '" ' + S() + '/>' + (snow ? '<path d="M-3-8-6-2-4-3-2-1 0-3 2 0Z" fill="' + F + '"/>' : ''));
    P.wave = (x, y, w = 10, amp = 2.6, n = 3, col = F, sw = 1.8) => {
      const seg = (w * 2) / (n * 2);
      let d = 'M' + f(x - w) + ' ' + f(y);
      for (let i = 0; i < n * 2; i++) d += 'Q' + f(x - w + seg * i + seg / 2) + ' ' + f(y + (i % 2 ? amp : -amp)) + ' ' + f(x - w + seg * (i + 1)) + ' ' + f(y);
      return line(d, col, sw);
    };
    P.eye = (x, y, s = 1, open = true) => G(x, y, 0, s, '<path d="M-10 0Q0-8 10 0 0 8-10 0Z" fill="' + F + '" ' + S() + '/>' + (open ? '<circle r="3.8" fill="' + M + '" ' + S(0.7) + '/><circle r="1.6" fill="' + D + '"/><circle cx="-1.2" cy="-1.2" r=".8" fill="' + F + '"/>' : '<path d="M-10 0Q0 6 10 0" fill="none" stroke="' + D + '" stroke-width="1.2"/>'));
    P.ear = (x, y, s = 1) => G(x, y, 0, s, '<path d="M-1-10C8-10 9 0 4 4 2 6 3 9-2 9-6 9-6 4-3 3-1 1-1-1-1-1" fill="' + F + '" ' + S() + '/><path d="M0-6C4-6 5-1 1 2" fill="none" stroke="' + M + '" stroke-width="1"/>');
    P.bird = (x, y, s = 1, flip = false) => G(x, y, 0, flip ? -s : s, '<path d="M0 1C3-5 9-7 12-4 8-4 5-2 2 3Z" fill="' + F + '" ' + S(0.8) + '/><path d="M0 1C-3-5-9-7-12-4-8-4-5-2-2 3Z" fill="' + L + '" ' + S(0.8) + '/><ellipse cy="3" rx="2.4" ry="5" fill="' + F + '" ' + S(0.8) + '/><path d="M-1 8 0 13 1 8" fill="' + L + '" ' + S(0.7) + '/><circle cy="-1.2" r="1.7" fill="' + F + '" ' + S(0.7) + '/>');
    P.fist = (x, y, r = 0, s = 1) => G(x, y, r, s, '<rect x="-6" y="-4" width="12" height="11" rx="3.4" fill="' + F + '" ' + S() + '/><g fill="' + L + '" ' + S(0.6) + '><circle cx="-4.2" cy="-4" r="2.2"/><circle cx="-1.4" cy="-4.6" r="2.2"/><circle cx="1.4" cy="-4.6" r="2.2"/><circle cx="4.2" cy="-4" r="2.2"/></g><path d="M-6 1Q-9 0-8 5L-5 6" fill="' + F + '" ' + S(0.7) + '/>');
    P.palm = (x, y, r = 0, s = 1) => G(x, y, r, s, '<rect x="-6" y="-1" width="12" height="11" rx="3.6" fill="' + F + '" ' + S() + '/><g fill="' + F + '" ' + S(0.7) + '><rect x="-6" y="-9" width="2.6" height="10" rx="1.3"/><rect x="-2.9" y="-12" width="2.6" height="13" rx="1.3"/><rect x=".3" y="-12.5" width="2.6" height="13.5" rx="1.3"/><rect x="3.4" y="-10" width="2.6" height="11" rx="1.3"/></g><path d="M-6 4-11-1-9-4-6 0" fill="' + F + '" ' + S(0.7) + '/>');
    P.foot = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M-3 -3C-5 -9 4 -9 4 -3 4 3 2 8 0 8-3 8-3 2-3-3Z" fill="' + F + '" ' + S(0.7) + '/><g fill="' + F + '"><circle cx="-4.2" cy="-9" r="1.1"/><circle cx="-1.5" cy="-11" r="1.2"/><circle cx="1.5" cy="-11.2" r="1.2"/><circle cx="4" cy="-9.4" r="1.1"/></g>');
    P.lotus = (x, y, s = 1, n = 8, col = F) => G(x, y, 0, s, Array.from({ length: n }, (_, i) => '<path transform="rotate(' + f((360 / n) * i) + ')" d="M0-1C4-4 4-10 0-13-4-10-4-4 0-1Z" fill="' + (i % 2 ? L : col) + '" ' + S(0.6) + '/>').join('') + '<circle r="2.6" fill="' + A + '" ' + S(0.6) + '/>');
    P.lantern = (x, y, s = 1) => G(x, y, 0, s, '<path d="M0-12V-9" stroke="' + F + '" stroke-width="1.2"/><rect x="-5" y="-9" width="10" height="2.6" rx="1" fill="' + M + '" ' + S(0.6) + '/><path d="M-6-6.4C-9 0-7 6-4 7.4H4C7 6 9 0 6-6.4Z" fill="' + F + '" ' + S(0.8) + '/><rect x="-4" y="7.4" width="8" height="2.2" rx="1" fill="' + M + '" ' + S(0.6) + '/><path d="M0 4C-3 3-2 0 0-2 2 0 3 3 0 4Z" fill="' + A + '"/>');
    P.bell = (x, y, s = 1, ghost = false) => G(x, y, 0, s, '<path d="M0-12V-9" stroke="' + F + '" stroke-width="1.2"/><path d="M-8 7C-6 5-5.4 0-5-5 -4-9 4-9 5-5 5.4 0 6 5 8 7Z" fill="' + (ghost ? 'none' : F) + '" stroke="' + (ghost ? F : D) + '" stroke-width="' + (ghost ? 1.1 : 0.9) + '"' + (ghost ? ' stroke-dasharray="2 1.6"' : '') + '/><circle cy="9" r="1.7" fill="' + M + '" ' + S(0.5) + '/>');
    P.pole = (x, y, s = 1) => G(x, y, 0, s, '<path d="M-13-6Q0-10 13-6" fill="none" stroke="' + F + '" stroke-width="1.8" stroke-linecap="round"/><path d="M-10-6.6 -10 0M-6 3 -10 0M-14 3-10 0M10-6.6V0M6 3 10 0M14 3 10 0" stroke="' + L + '" stroke-width=".8" fill="none"/><path d="M-15 3H-5L-6 9H-14Z" fill="' + F + '" ' + S(0.7) + '/><path d="M5 3H15L14 9H6Z" fill="' + F + '" ' + S(0.7) + '/>');
    P.gate = (x, y, s = 1, open = true) => G(x, y, 0, s, '<path d="M-11-6Q0-11 11-6" fill="none" stroke="' + F + '" stroke-width="2.4" stroke-linecap="round"/><rect x="-9" y="-6" width="2.6" height="15" fill="' + F + '" ' + S(0.6) + '/><rect x="6.4" y="-6" width="2.6" height="15" fill="' + F + '" ' + S(0.6) + '/>' + (open ? '<path d="M-6.4-4V9L-1 7V-2ZM6.4-4V9L1 7V-2Z" fill="' + L + '" ' + S(0.6) + '/><path d="M0-3V8" stroke="' + A + '" stroke-width="1.6"/>' : '<rect x="-6.4" y="-4" width="12.8" height="13" fill="' + L + '" ' + S(0.6) + '/>'));
    P.compass = (x, y, s = 1) => G(x, y, 0, s, '<circle r="11" fill="none" stroke="' + F + '" stroke-width="1.2"/><path d="M0-12 2.6-2.6 12 0 2.6 2.6 0 12-2.6 2.6-12 0-2.6-2.6Z" fill="' + F + '" ' + S(0.7) + '/><path d="M0-12 2.6-2.6 0 0-2.6-2.6Z" fill="' + A + '"/><circle r="1.7" fill="' + M + '"/>');
    P.heart = (x, y, s = 1, col = F) => G(x, y, 0, s, '<path d="M0 8C-12 0-9-8-4.6-8-2-8 0-6 0-4 0-6 2-8 4.6-8 9-8 12 0 0 8Z" fill="' + col + '" ' + S() + '/>');
    P.taiji = (x, y, r = 10, rot = 0) => G(x, y, rot, 1, '<circle r="' + r + '" fill="' + F + '" ' + S() + '/><path d="M0-' + r + 'A' + r / 2 + ' ' + r / 2 + ' 0 0 1 0 0 ' + r / 2 + ' ' + r / 2 + ' 0 0 0 0 ' + r + 'A' + r + ' ' + r + ' 0 0 1 0-' + r + 'Z" fill="' + D + '"/><circle cy="' + -r / 2 + '" r="' + r / 6 + '" fill="' + F + '"/><circle cy="' + r / 2 + '" r="' + r / 6 + '" fill="' + D + '"/>');
    P.sun = (x, y, r = 6, n = 12, col = F) => '<g>' + Array.from({ length: n }, (_, i) => { const [a, b] = pol(r + 2, (360 / n) * i), [c2, d2] = pol(r + 5.4, (360 / n) * i); return '<path d="M' + f(x + a) + ' ' + f(y + b) + 'L' + f(x + c2) + ' ' + f(y + d2) + '" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round"/>'; }).join('') + '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + r + '" fill="' + col + '" ' + S(0.7) + '/></g>';
    // Trăng khuyết (mở về bên phải khi rot = 0): hình tròn lớn trừ đi hình tròn lệch phải, tính theo giao điểm hai đường tròn.
    P.moon = (x, y, r = 9, rot = 0, col = F) => {
      const d = r * 0.42;
      const r2 = r * 0.82;
      const px = (d * d + r * r - r2 * r2) / (2 * d);
      const py = Math.sqrt(r * r - px * px);
      return G(x, y, rot, 1, '<path d="M' + f(px) + ' ' + f(-py) + 'A' + r + ' ' + r + ' 0 1 0 ' + f(px) + ' ' + f(py) + 'A' + f(r2) + ' ' + f(r2) + ' 0 ' + (px > d ? 1 : 0) + ' 1 ' + f(px) + ' ' + f(-py) + 'Z" fill="' + col + '" ' + S(0.6) + '/>');
    };
    P.arrow = (x1, y1, x2, y2, col = F, w = 1.8) => { const a = Math.atan2(y2 - y1, x2 - x1) / RAD; return '<path d="M' + f(x1) + ' ' + f(y1) + 'L' + f(x2) + ' ' + f(y2) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>' + G(x2, y2, a + 90, 1, '<path d="M0-3.4 3.6 3.4 0 1.6-3.6 3.4Z" fill="' + col + '" ' + S(0.5) + '/>'); };
    P.swirl = (x, y, s = 10, turns = 2.4, dir = 1, col = F, w = 1.8) => { let d = ''; const N = 36; for (let i = 0; i <= N; i++) { const t = (i / N) * turns * 360, r = (s * i) / N, [a, b] = pol(r, t * dir); d += (i ? 'L' : 'M') + f(x + a) + ' ' + f(y + b); } return line(d, col, w); };
    P.arc = (x, y, r, a0, a1, col = F, w = 1.6) => { const [p, q] = pol(r, a0), [u, v] = pol(r, a1); return line('M' + f(x + p) + ' ' + f(y + q) + 'A' + r + ' ' + r + ' 0 ' + (((a1 - a0 + 720) % 360) > 180 ? 1 : 0) + ' 1 ' + f(x + u) + ' ' + f(y + v), col, w); };
    P.tri = (x, y, s = 1, col = F) => G(x, y, 0, s, '<path d="M0-9 9 7H-9Z" fill="' + col + '" ' + S() + '/>');
    P.trigram = (x, y, rows, w = 14) => '<g stroke="' + F + '" stroke-width="2.2" stroke-linecap="round">' + rows.map((r, i) => { const yy = f(y + (i - (rows.length - 1) / 2) * 5); return r ? '<path d="M' + f(x - w / 2) + ' ' + yy + 'H' + f(x + w / 2) + '"/>' : '<path d="M' + f(x - w / 2) + ' ' + yy + 'H' + f(x - 1.6) + 'M' + f(x + 1.6) + ' ' + yy + 'H' + f(x + w / 2) + '"/>'; }).join('') + '</g>';
    P.person = (x, y, s = 1, pose = 'stand') => G(x, y, 0, s, '<circle cy="-9" r="3.2" fill="' + F + '" ' + S(0.7) + '/>' + (pose === 'sit' ? '<path d="M0-5V3M-8 8 0 3 8 8M-6 0 0-3 6 0" fill="none" stroke="' + F + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' : pose === 'stance' ? '<path d="M0-5V2M-8 10-3 2 3 2 8 10M-9-1 0-3 9-1" fill="none" stroke="' + F + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' : pose === 'arms' ? '<path d="M0-5V4M-3 12 0 4 3 12M-9-9 0-3 9-9" fill="none" stroke="' + F + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M0-5V4M-3 12 0 4 3 12M-7-1 0-3 7-1" fill="none" stroke="' + F + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'));
    P.crown = (x, y, s = 1, n = 5, col = F) =>
      G(
        x,
        y,
        0,
        s,
        '<path d="' + (n === 3 ? 'M-10 6V-3L-5 1 0-7 5 1 10-3V6Z' : 'M-10 6V-3L-6 1-3-6 0 0 3-6 6 1 10-3V6Z') + '" fill="' + col + '" ' + S(0.8) + '/>' +
          '<rect x="-10" y="6" width="20" height="2.6" rx="1" fill="' + M + '" ' + S(0.6) + '/><circle cx="0" cy="2" r="1.3" fill="' + A + '"/>',
      );
    P.gem = (x, y, s = 1, col = A) => G(x, y, 0, s, '<path d="M0-8 6-2 0 8-6-2Z" fill="' + col + '" ' + S(0.8) + '/><path d="M-6-2H6M0-8-2-2 0 8 2-2Z" fill="none" stroke="' + D + '" stroke-width=".5"/><path d="M-2-2 0-8 2-2Z" fill="' + F + '" opacity=".7"/>');
    P.snow = (x, y, s = 1) => G(x, y, 0, s, '<g stroke="' + F + '" stroke-width="1.4" stroke-linecap="round" fill="none">' + [0, 60, 120].map((a) => '<g transform="rotate(' + a + ')"><path d="M0-10V10M0-6-3-9M0-6 3-9M0 6-3 9M0 6 3 9"/></g>').join('') + '</g>');
    P.hammer = (x, y, r = 0, s = 1) => G(x, y, r, s, '<rect x="-1.4" y="-3" width="2.8" height="14" rx="1" fill="' + L + '" ' + S(0.6) + '/><rect x="-7" y="-9" width="14" height="7" rx="1.6" fill="' + F + '" ' + S(0.8) + '/>');
    P.rock = (x, y, s = 1) => G(x, y, 0, s, '<path d="M-11 8-9-1-4-7 3-8 9-3 11 8Z" fill="' + L + '" ' + S() + '/><path d="M-4-7-2-1-9-1M3-8 1-1 9-3M-2-1 1-1 2 8" fill="none" stroke="' + M + '" stroke-width=".8"/>');
    P.shield = (x, y, s = 1) => G(x, y, 0, s, '<path d="M-9-8H9V0C9 6 4 9 0 11-4 9-9 6-9 0Z" fill="' + F + '" ' + S() + '/><path d="M0-8V11M-9-1H9" stroke="' + M + '" stroke-width=".9"/>');
    P.vajra = (x, y, r = 0, s = 1) => G(x, y, r, s, '<path d="M-2.4-4h4.8L2 4H-2Z" fill="' + F + '" ' + S(0.7) + '/><g fill="none" stroke="' + F + '" stroke-width="1.8" stroke-linecap="round"><path d="M-2-4C-8-5-6-10 0-13 6-10 8-5 2-4"/><path d="M-2 4C-8 5-6 10 0 13 6 10 8 5 2 4"/><path d="M0-13V13" stroke-width="1"/></g><circle r="2.2" fill="' + A + '" ' + S(0.6) + '/>');
    P.pagoda = (x, y, s = 1) => G(x, y, 0, s, [8, 3, -2].map((yy, i) => '<path d="M' + (-10 + i * 2.4) + ' ' + yy + 'Q0 ' + (yy - 5) + ' ' + (10 - i * 2.4) + ' ' + yy + 'L' + (7.6 - i * 2.2) + ' ' + (yy + 4) + 'H' + (-7.6 + i * 2.2) + 'Z" fill="' + (i % 2 ? L : F) + '" ' + S(0.7) + '/>').join('') + '<path d="M0-6V-12" stroke="' + F + '" stroke-width="1.4"/><circle cy="-13" r="1.4" fill="' + A + '"/>');
    P.flag = (x, y, s = 1, col = F) => G(x, y, 0, s, '<path d="M-6 12V-12" stroke="' + F + '" stroke-width="1.6" stroke-linecap="round"/><path d="M-5-12H9L5-7.4 9-3H-5Z" fill="' + col + '" ' + S(0.8) + '/>');
    P.grass = (x, y, s = 1) => G(x, y, 0, s, '<g fill="none" stroke="' + F + '" stroke-width="1.7" stroke-linecap="round"><path d="M-6 9C-7 3-5-2-8-7M-2 9C-2 2 0-3-1-9M2 9C3 3 2-1 6-6M6 9C7 5 8 2 10-1"/></g>');
    P.diamond = (x, y, s = 1, col = F) => G(x, y, 0, s, '<path d="M0-11 8-3 0 11-8-3Z" fill="' + col + '" ' + S(0.8) + '/><path d="M-8-3H8M-3-3 0-11 3-3 0 11Z" fill="none" stroke="' + D + '" stroke-width=".5"/>');
    P.target = (x, y, s = 1) => G(x, y, 0, s, '<circle r="11" fill="' + L + '" ' + S(0.7) + '/><circle r="7.4" fill="' + D + '"/><circle r="4" fill="' + F + '"/><circle r="1.5" fill="' + A + '"/>');
    P.cauldron = (x, y, s = 1) => G(x, y, 0, s, '<path d="M-9-3C-9 8-5 10 0 10S9 8 9-3Z" fill="' + F + '" ' + S() + '/><rect x="-10.5" y="-5" width="21" height="3" rx="1.4" fill="' + L + '" ' + S(0.7) + '/><path d="M-12-2Q-14 2-11 3M12-2Q14 2 11 3" fill="none" stroke="' + F + '" stroke-width="1.4"/><path d="M-5 10-6 13M5 10 6 13M0 10V13" stroke="' + F + '" stroke-width="1.6" stroke-linecap="round"/>');
    P.hat = (x, y, s = 1) => G(x, y, 0, s, '<path d="M-9 3 0-6 9 3Z" fill="' + F + '" ' + S(0.8) + '/>');
    return P;
  }

  // ---- Hình giữa của từng cấp (1…103) -------------------------------------------------------------------------------------------------
  // Mỗi mục nhận bộ hình cơ bản P của cảnh giới và trả chuỗi SVG trong khung −30…30; ý nghĩa theo danh xưng trong dist/growth.js.
  const R = (n, _unused, r0 = 0) => Array.from({ length: n }, (_, i) => (360 / n) * i + r0);
  const MOTIF = [
    null,
    // —— Sơ nhập giang hồ (1–9)
    (P) => P.line('M0 14V-4', '#fff', 2) + P.leaf(-8, -6, -55, 0.95) + P.leaf(8, -9, 50, 1.05) + P.arc(0, 15, 12, 200, 340, '#fff', 2) + P.dot(0, -12, 1.4), // 1 Sơ Tâm Khởi Bước: mầm xanh
    (P) => P.swirl(-8, 0, 11, 2.2, 1) + P.swirl(8, 0, 11, 2.2, -1) + P.dot(0, -17, 1.5) + P.dot(0, 17, 1.5), // 2 Thổ Nạp Điều Tức: hai vòng hơi thở
    (P) => P.person(0, 0, 1.25, 'stance') + P.line('M-15 17H15', '#fff', 2) + P.line('M-9 21H9', '#fff', 1.4), // 3 Trát Mã Định Thân: tấn mã bộ
    (P) => P.wave(0, -9, 14, 3, 3, '#fff', 2.4) + P.wave(0, 0, 14, 3, 3, '#fff', 2.4) + P.wave(0, 9, 14, 3, 3, '#fff', 2.4) + P.dot(-18, 0, 1.4) + P.dot(18, 0, 1.4), // 4 Luyện Cân Thư Mạch: ba dây gân
    (P) => P.hammer(-3, -3, 38, 1.2) + P.line('M-14 15H14', '#fff', 3) + P.spark(10, -8, 1.5) + P.spark(15, 0, 1) + P.spark(7, -15, 0.9), // 5 Đoán Cốt Thành Hình: búa rèn
    (P) => P.line('M0 18V4M0 4L-9-6M0 4L9-6M-9-6L-12-15M-9-6L-4-15M9-6L4-15M9-6L12-15', '#fff', 2) + [[-12, -15], [-4, -15], [4, -15], [12, -15], [0, 18]].map(([a, b]) => P.dot(a, b, 2)).join(''), // 6 Khai Mạch Thông Lạc: cây kinh mạch
    (P) => P.swirl(0, 0, 15, 2.4, 1) + P.arrow(-20, -16, -8, -8, '#fff', 1.6) + P.arrow(20, -16, 8, -8, '#fff', 1.6) + P.arrow(0, 22, 0, 12, '#fff', 1.6), // 7 Dẫn Khí Nhập Thể: khí cuộn vào
    (P) => P.cauldron(0, 4, 1.35) + P.flame(0, -13, 0, 0.9), // 8 Tụ Khí Đan Điền: đỉnh luyện đan
    (P) => P.wave(0, 10, 18, 3.4, 3, '#fff', 2.2) + P.wave(0, 17, 14, 2.8, 3, '#fff', 1.6) + P.dot(0, -5, 6, '#fff') + P.ring(0, -5, 9, '#fff', 1) + P.spark(-12, -14, 1) + P.spark(13, -12, 1.2), // 9 Khí Hải Sơ Thành: ngọc trên biển
    // —— Tam lưu cao thủ (10–19)
    (P) => P.gate(0, 2, 1.8) + P.star(0, -20, 5, 4.4, 1.8), // 10 Phá Quan Nhập Lưu: cổng mở
    (P) => P.compass(0, 0, 1.8), // 11 Hành Cước Tứ Phương: la bàn
    (P) => P.bird(0, -2, 1.7) + P.wave(0, 18, 16, 2.4, 3, '#fff', 1.6) + P.line('M-20-10C-14-12-12-10-6-12M14-14C18-16 20-14 24-16', '#fff', 1.2), // 12 Khinh Thân Như Yến: chim yến
    (P) => '<rect x="3" y="-16" width="14" height="31" rx="5" fill="#fff" stroke="#000" stroke-opacity=".5"/>' + P.line('M10-12 8-4 12 0 9 8', '#9a7a5a', 1.2) + P.fist(-10, 0, 90, 1.4) + P.spark(-1, -10, 1.4), // 13 Thiết Thủ Khai Bia: nắm đấm phá bia
    (P) => P.fist(6, 0, 0, 1.6) + P.line('M-22-8C-16-12-10-6-4-10M-24 0C-18-3-12 3-6 0M-22 9C-16 6-10 12-4 9', '#fff', 1.6), // 14 Quyền Xuất Như Phong: nắm đấm và gió
    (P) => P.foot(-9, 8, -20, 1.2) + P.foot(8, -6, 20, 1.2) + P.dot(-14, -12, 1.4) + P.dot(14, 14, 1.4) + P.dot(-18, 0, 1.2) + P.dot(18, 4, 1.2), // 15 Bộ Pháp Sơ Thành: dấu chân
    (P) => P.arc(0, 0, 15, -60, 130, '#fff', 2.4) + P.arc(0, 0, 15, 120, 310, '#fff', 2.4) + P.arrow(11, -14, 15, -6, '#fff', 1.4) + P.arrow(-11, 14, -15, 6, '#fff', 1.4) + P.dot(0, 0, 3.4), // 16 Nội Tức Tuần Hoàn: vòng khí
    (P) => P.sword(0, 2, 0, 1.55) + P.leaf(-9, -7, -50, 0.7) + P.leaf(9, -9, 50, 0.8), // 17 Kiếm Ý Manh Nha: kiếm nảy mầm
    (P) => P.line('M-16 20C-4 16 10 12-4 4S12-6 6-14', '#fff', 2.2) + P.mountain(10, -14, 0, 0.8) + P.hat(-15, 14, 0.9) + P.dot(-15, 8, 1.6), // 18 Độc Hành Thiên Lý: đường dài một người
    (P) => P.wave(0, 3, 15, 3.2, 3, '#fff', 2.2) + P.wave(0, 11, 14, 3, 3, '#fff', 2.2) + P.wave(0, 18, 9, 2.4, 2, '#fff', 2) + P.dot(0, -9, 6.2, '#fff') + P.ring(0, -9, 9.4, '#fff', 1), // 19 Tam Lưu Viên Mãn: ba dòng nước, trăng tròn
    // —— Nhị lưu cao thủ (20–29)
    (P) => P.person(0, 0, 1.15, 'arms') + [[-14, -16], [14, -16], [-8, 17], [8, 17]].map(([a, b]) => P.dot(a, b, 2.4, '#fff') + P.ring(a, b, 4, '#fff', 0.8)).join(''), // 20 Khí Quán Tứ Chi: khí đến tứ chi
    (P) => P.grass(0, 8, 1.2) + P.foot(0, -12, 0, 0.9) + P.line('M-18-2Q-14-8-10-4M10-6Q14-12 18-6', '#fff', 1.3), // 21 Thảo Thượng Phi Hành: bay trên cỏ
    (P) => P.palm(-2, 2, 0, 1.45) + P.line('M10-14C16-14 18-8 24-8M12-6C18-4 20 2 26 2M10 4C15 8 17 12 23 12', '#fff', 1.5), // 22 Chưởng Phong Sơ Hiện: bàn tay có gió
    (P) => R(6).map((a) => P.sword(...pol(11, a - 90), a, 0.85)).join('') + P.dot(0, 0, 3.2, '#fff'), // 23 Kiếm Hoa Lục Đóa: sáu đóa kiếm hoa
    (P) => P.eye(0, 0, 1.75) + R(6, 0, -90).map((a) => P.line('M' + pol(14, a).join(' ') + 'L' + pol(20, a).join(' '), '#fff', 1.4)).join(''), // 24 Nhãn Quan Lục Lộ: mắt nhìn sáu hướng
    (P) => P.ear(-2, 0, 1.45) + [14, 19, 24].map((r, i) => P.arc(2, 0, r, -50 + i * 6, 50 - i * 6, '#fff', 1.4)).join(''), // 25 Nhĩ Thính Bát Phương: tai nghe tám phương
    (P) => P.swirl(-4, -2, 16, 2.6, 1) + P.foot(10, 12, 40, 0.9) + P.line('M-22 14H-8M-20 19H-4', '#fff', 1.4), // 26 Ngự Phong Hành Bộ: xoáy gió dưới chân
    (P) => '<path d="M0-16A16 16 0 0 1 0 16Z" fill="#fff" stroke="#000" stroke-opacity=".45"/><path d="M0-16-15-10-15 10 0 16Z" fill="#000" fill-opacity=".45" stroke="#fff" stroke-width="1.4"/>' + P.dot(8, 0, 2.4, '#7a5a3a') + P.dot(-8, 0, 2.4, '#fff'), // 27 Cương Nhu Tương Tế: nửa góc cạnh, nửa tròn
    (P) => [18, 13, 8].map((r) => P.ring(0, 0, r, '#fff', 1.6)).join('') + P.dot(0, 0, 3.4, '#fff') + P.arrow(-24, 0, -19, 0, '#fff', 1.4) + P.arrow(24, 0, 19, 0, '#fff', 1.4), // 28 Nội Lực Thâm Hậu: tầng tầng vòng lực
    (P) => P.ring(0, 0, 17, '#fff', 2.2) + P.ring(0, 0, 9, '#fff', 1.6) + R(8).map((a) => P.dot(...pol(13, a - 90), 1.4)).join('') + P.star(0, 0, 4, 4, 1.6), // 29 Nhị Lưu Viên Mãn: bích ngọc tròn đầy
    // —— Nhất lưu cao thủ (30–39)
    (P) => P.shield(0, 0, 1.75) + P.arc(0, 0, 21, 200, 340, '#fff', 1.4) + P.arc(0, 0, 21, 20, 160, '#fff', 1.4), // 30 Chân Khí Hộ Thể: khiên khí
    (P) => P.snow(2, -6, 1.3) + P.foot(-10, 14, 15, 0.7) + P.foot(0, 18, 15, 0.55) + '<g opacity=".55">' + P.foot(10, 21, 15, 0.4) + '</g>', // 31 Đạp Tuyết Vô Ngân: tuyết, dấu chân mờ dần
    (P) => P.petal(-3, -3, -40, 0.9) + P.petal(-3, -3, 32, 0.9) + P.petal(-3, -3, 104, 0.9) + P.petal(-3, -3, 176, 0.9) + P.petal(-3, -3, 248, 0.9) + P.dot(-3, -3, 3, '#f5d27a') + P.leaf(14, 12, 60, 0.9) + P.line('M6 4Q12 4 16 8', '#fff', 1), // 32 Phi Hoa Trích Diệp: hoa và lá bay
    (P) => P.line('M-18 14C-6 6-6-4 10-8', '#fff', 1.4).replace('<path', '<path stroke-dasharray="1.5 2.6"') + P.dot(-20, 14, 3, '#fff') + P.ring(14, -9, 6, '#fff', 1.4) + P.dot(14, -9, 2.2, '#fff') + P.spark(14, -9, 2.6), // 33 Cách Không Điểm Huyệt: chỉ lực từ xa
    (P) => P.sword(4, -3, 38, 1.55) + P.heart(-9, 10, 0.85, '#fff') + P.arc(-2, 6, 19, -160, -112, '#fff', 1.5) + P.arc(-2, 6, 14.5, -158, -118, '#fff', 1.1), // 34 Kiếm Tùy Tâm Chuyển: kiếm xoay theo tâm
    (P) => P.rock(0, 4, 2) + P.dot(-12, -6, 1.4) + P.dot(14, -10, 1.2), // 35 Thân Như Bàn Thạch: khối đá
    (P) => P.target(0, 0, 1.8) + P.arrow(-22, 20, -3, 3, '#fff', 2), // 36 Nhất Kích Tất Trúng: tên trúng hồng tâm
    (P) => P.wave(0, 6, 18, 3.2, 3, '#fff', 2) + P.wave(0, 13, 18, 3.2, 3, '#fff', 1.6) + P.wave(0, 20, 18, 3.2, 3, '#fff', 1.2) + P.arrow(0, -22, 0, 0, '#fff', 2.2), // 37 Khí Trầm Như Hải: khí chìm xuống biển
    (P) => P.flag(0, 0, 1.7) + P.mountain(-2, 18, 0, 1.15), // 38 Uy Chấn Nhất Phương: cờ trên đỉnh
    (P) => P.star(0, 0, 8, 18, 9, '#fff') + P.ring(0, 0, 21, '#fff', 1.2) + P.dot(0, 0, 4, '#f5d27a'), // 39 Nhất Lưu Viên Mãn: bát giác tinh
    // —— Tuyệt đỉnh cao thủ (40–49)
    (P) => P.arc(0, 0, 20, 120, 230, '#fff', 2.4) + P.arc(0, 0, 20, 250, 70, '#fff', 2.4) + P.mountain(0, 4, 0, 1.6), // 40 Phá Kính Đăng Phong: vòng vỡ, lên đỉnh
    (P) => P.cloud(-10, 14, 0.8) + P.cloud(4, 4, 0.9) + P.cloud(16, -7, 0.7) + P.foot(-6, -4, 40, 0.9), // 41 Lăng Không Hư Độ: bước trên mây
    (P) => P.blade(0, 0, 0, 2) + P.blade(0, 0, 60, 2) + P.blade(0, 0, -60, 2) + P.blade(0, 0, 120, 1.4) + P.blade(0, 0, -120, 1.4) + P.spark(0, 0, 3), // 42 Kiếm Khí Tung Hoành: kiếm khí tỏa
    (P) => P.mountain(0, 2, 0, 2) + P.line('M-2-14 3-6-3 0 2 8', '#2a1a10', 1.8) + P.palm(15, -14, 30, 0.8), // 43 Chưởng Lực Khai Sơn: núi nứt đôi
    (P) => P.arc(0, 0, 17, 40, 380, '#fff', 3.2) + P.dot(14, -12, 2.4, '#fff') + P.dot(0, 0, 1.6), // 44 Hóa Phồn Vi Giản: vòng bút giản lược
    (P) => P.ear(-4, 2, 1.4) + P.line('M8-10C14-12 18-6 24-8M10-2C16-2 20 4 26 2', '#fff', 1.5) + P.leaf(14, 14, 120, 0.7), // 45 Thính Phong Biện Khí: nghe gió biết khí
    (P) => '<path d="M-5-14H5L4-9C12-6 14 6 8 13 4 18-4 18-8 13-14 6-12-6-4-9Z" fill="#fff" stroke="#000" stroke-opacity=".5"/>' + P.leaf(0, 4, 0, 0.9) + P.spark(-14, -14, 1.2) + P.spark(15, -12, 1), // 46 Bách Độc Bất Xâm: hồ lô thuốc
    (P) => P.ring(0, 6, 5.5, '#fff', 1.8) + P.ring(0, 6, 10.5, '#fff', 1.3) + P.ring(0, 6, 15.5, '#fff', 0.9) + P.moon(-1, -14, 5.4, -10, '#fff') + P.dot(0, 6, 1.8), // 47 Tâm Như Chỉ Thủy: mặt nước lặng
    (P) => P.mountain(-6, 4, 0, 1.5) + P.mountain(11, 8, 0, 1) + P.sun(14, -14, 4, 10) + P.wave(0, 20, 18, 2.4, 3, '#fff', 1.6), // 48 Khí Tráng Sơn Hà: non sông
    (P) => P.mountain(0, 6, 0, 1.6) + P.crown(0, -17, 0.8, 3) + P.star(-15, -3, 5, 3.4, 1.5) + P.star(15, -3, 5, 3.4, 1.5), // 49 Tuyệt Đỉnh Viên Mãn: đỉnh đội mão
    // —— Tiên thiên cao thủ (50–59)
    (P) => P.swirl(0, 0, 18, 3, -1) + P.dot(0, 0, 2.4) + P.arrow(14, 16, 6, 8, '#fff', 1.6), // 50 Phản Bổn Hoàn Nguyên: xoáy về nguồn
    (P) => P.taiji(0, 0, 12) + R(8).map((a) => P.line('M' + pol(17, a).join(' ') + 'L' + pol(21, a).join(' '), '#fff', 1.4)).join(''), // 51 Tiên Thiên Chân Khí: thái cực
    (P) => '<ellipse rx="9" ry="17" fill="none" stroke="#fff" stroke-width="1.8"/>' + P.line('M0-17V17', '#fff', 1) + [-12, -4, 4, 12].map((y) => P.dot(-9 * Math.sqrt(1 - (y / 17) ** 2), y, 1.5) + P.dot(9 * Math.sqrt(1 - (y / 17) ** 2), y, 1.5)).join(''), // 52 Nhâm Đốc Quán Thông: hai mạch thông suốt
    (P) => P.gate(0, 0, 1.6, false) + P.taiji(0, 2, 5.5), // 53 Sinh Tử Huyền Quan: cửa sinh tử
    (P) => [0, 1, 2, 3, 4, 5].map((i) => { const w = 17 - i * 2.9; const y = -16 + i * 6.4; const o = Math.sin(i * 1.3) * 2.2; return P.line('M' + f(-w + o) + ' ' + f(y) + 'Q' + f(o) + ' ' + f(y + (i % 2 ? -2.6 : 2.6)) + ' ' + f(w + o) + ' ' + f(y), '#fff', 2.1); }).join('') + P.dot(-15, 14, 1.4) + P.dot(17, 8, 1.2) + P.dot(14, -17, 1.2), // 54 Khí Hóa Cương Phong: lốc xoáy
    (P) => P.ring(0, 0, 14, '#fff', 1.4) + P.eye(0, 0, 1.15, false) + P.line('M-5 5Q0 9 5 5', '#fff', 1) + P.ring(0, 0, 19, '#fff', 0.8), // 55 Thần Quang Nội Liễm: mắt khép thần quang
    (P) => P.swirl(0, 6, 18, 2, 1, '#fff', 1.2) + P.sword(0, 0, 0, 1.75), // 56 Ngự Khí Thành Kiếm: khí thành kiếm
    (P) => '<rect x="-16" y="14" width="32" height="5" rx="1.4" fill="#fff"/><rect x="-11" y="9" width="22" height="5" rx="1.4" fill="#fff"/>' + P.gem(0, -4, 1.7) + P.arc(0, -4, 17, 200, 340, '#fff', 1.2), // 57 Linh Đài Thanh Minh: đài sen sáng
    (P) => P.vajra(0, 0, 0, 1.9), // 58 Kim Cương Bất Hoại: chày kim cương
    (P) => P.lotus(0, 0, 1.7, 8) + P.ring(0, 0, 21, '#fff', 1.2) + P.star(0, -22, 4, 2.4, 1), // 59 Tiên Thiên Viên Mãn: sen tròn đầy
    // —— Tông sư (60–69)
    (P) => P.pagoda(0, 2, 1.6) + P.flag(18, 8, 0.8), // 60 Khai Tông Lập Phái: tháp môn phái
    (P) => '<g fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="1.8 1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M0-19 3.6-4V6H-3.6V-4Z"/><path d="M-9 6H9V9.4H-9Z"/><path d="M-1.8 9.4V16.5H1.8V9.4"/></g>' + P.spark(-13, -9, 1.3) + P.spark(13, 12, 1.1), // 61 Vô Chiêu Thắng Hữu Chiêu: kiếm vô hình (nét đứt)
    (P) => P.heart(-11, 10, 0.85, '#fff') + P.arrow(-5, 4, 6, -6, '#fff', 2) + P.swirl(9, -9, 6.5, 2.2, 1, '#fff', 1.6), // 62 Ý Đáo Khí Đáo: ý (tim) dẫn khí (xoáy)
    (P) => P.leaf(-8, 0, -30, 1.45) + P.leaf(8, 0, 30, 1.45) + P.leaf(0, -2, 0, 1.2) + P.line('M-14 20 0 12 14 20', '#fff', 1.6), // 63 Thảo Mộc Giai Binh: cỏ cây đều là binh khí
    (P) => [[-16, 0, 3.4], [-8, 0, 3], [0, 0, 2.4], [7, 0, 1.8], [13, 0, 1.2], [18, 0, 0.8]].map(([x, y, r], i) => P.dot(x, y + Math.sin(i) * 3, r, '#fff')).join('') + P.wave(0, -9, 16, 3, 3, '#fff', 1.4), // 64 Hóa Kình Vô Hình: lực tan thành hạt
    (P) => P.lantern(0, 0, 1.5) + P.flame(14, 14, 0, 0.55) + P.line('M6 12Q8 10 11 12', '#fff', 1.2), // 65 Truyền Đăng Tục Diệm: truyền đèn
    (P) => P.heart(0, 4, 2.1, '#fff') + P.sword(0, -2, 0, 1.55), // 66 Tâm Kiếm Hợp Nhất: tim và kiếm
    (P) => R(8).map((a) => P.line('M' + pol(21, a).join(' ') + 'L' + pol(6, a).join(' '), '#fff', 1.6)).join('') + P.dot(0, 0, 5, '#fff') + P.ring(0, 0, 9, '#fff', 1) + R(8).map((a) => P.dot(...pol(22, a), 1.5)).join(''), // 67 Vạn Pháp Quy Tông: muôn đường về một
    (P) => P.star(0, 0, 8, 20, 10, '#fff') + P.crown(0, 0, 0.9, 5, '#fff'), // 68 Uy Trấn Bát Hoang: tám phương, vương miện
    (P) => P.lotus(0, 4, 1.8, 10) + P.sun(0, -16, 4, 10), // 69 Tông Sư Viên Mãn: sen và mặt trời
    // —— Đại tông sư (70–79)
    (P) => '<path d="M-17-18H-2V18H-17ZM2-18H17V18H2Z" fill="#fff" fill-opacity=".9" stroke="#000" stroke-opacity=".4"/>' + P.line('M0-20V20', '#fff8c8', 3.4) + R(6, 0, -90).map((a) => P.line('M' + pol(4, a).join(' ') + 'L' + pol(14, a).join(' '), '#fff8c8', 1)).join(''), // 70 Đại Đạo Sơ Khuy: khe sáng của Đạo
    (P) => P.lotus(-9, 12, 0.9, 8) + P.lotus(4, 0, 0.9, 8) + P.lotus(16, -12, 0.9, 8) + P.foot(-2, 12, 30, 0.5) + P.foot(10, -2, 30, 0.5), // 71 Bộ Bộ Sinh Liên: mỗi bước một sen
    (P) => P.cloud(0, 14, 1.3) + P.sword(0, -2, 0, 1.9) + P.line('M-14-14 14-14', '#fff', 1), // 72 Kiếm Ý Thông Thiên: kiếm xuyên mây
    (P) => P.dot(0, 0, 4, '#fff') + R(6).map((a) => P.dot(...pol(11, a - 90), 2.6, '#fff') + P.line('M' + pol(4, a - 90).join(' ') + 'L' + pol(10, a - 90).join(' '), '#fff', 1)).join('') + R(12).map((a) => P.dot(...pol(19, a - 90), 1.2, '#fff')).join(''), // 73 Nhất Khí Hóa Vạn: một hóa muôn
    (P) => P.mountain(-8, 6, 0, 1.5) + P.wave(12, 14, 11, 2.4, 2, '#fff', 1.8) + P.arrow(-18, -16, 8, -6, '#fff', 1.6), // 74 Thôi Sơn Điền Hải: dời núi lấp biển
    (P) => P.bell(-6, 0, 1.4) + [10, 15, 20].map((r, i) => P.arc(-6, 0, r + 4, -40, 40, '#fff', 1.6 - i * 0.3)).join(''), // 75 Thiên Lý Truyền Âm: chuông vang ngàn dặm
    (P) => P.lotus(0, 4, 1.7, 8) + P.eye(0, -4, 0.9), // 76 Tâm Thông Vạn Vật: mắt trong hoa sen
    (P) => P.bell(0, 0, 1.7, true) + P.arc(0, 4, 20, -30, 30, '#fff', 0.8) + P.arc(0, 4, 24, -26, 26, '#fff', 0.6), // 77 Đại Âm Hi Thanh: tiếng lớn thì thưa
    (P) => P.pole(0, 0, 1.55) + P.spark(0, -14, 1.2), // 78 Đại Xảo Nhược Chuyết: đòn gánh vụng mà khéo
    (P) => P.sun(-5, -5, 6, 12) + P.moon(8, 8, 8.5, 25, '#fff') + P.star(-13, 12, 5, 3.4, 1.4) + P.star(13, -13, 5, 3.2, 1.3), // 79 Đại Tông Sư Viên Mãn: nhật nguyệt tinh
    // —— Thiên nhân hợp nhất (80–89)
    (P) => P.person(0, 8, 1.1, 'sit') + P.line('M0-6V-14', '#fff', 1) + P.star(0, -18, 5, 5, 2.2) + P.arc(0, 8, 21, 210, 330, '#fff', 1.2), // 80 Thiên Nhân Giao Cảm: người và sao
    (P) => P.sun(-5, -2, 8, 12) + P.moon(10, 5, 9, 180, '#fff'), // 81 Nhật Nguyệt Đồng Huy: mặt trời ôm vầng trăng
    (P) => P.cloud(-4, -6, 1.3) + P.bolt(10, 12, 20, 0.8) + P.swirl(-14, 14, 8, 1.8, 1, '#fff', 1.4), // 82 Phong Vân Biến Sắc: mây, gió, chớp
    (P) => [[-18, -6], [-10, -12], [-2, -8], [6, -12], [10, -2], [16, 8], [8, 16]].map(([x, y], i, a) => (i ? P.line('M' + a[i - 1].join(' ') + 'L' + x + ' ' + y, '#fff', 0.8) : '') + P.star(x, y, 5, 3.2, 1.4)).join(''), // 83 Tinh Di Đẩu Chuyển: chòm Bắc Đẩu
    (P) => P.line('M' + poly(5, 17, -90).split(' ').join('L') + 'Z', '#fff', 1.4) + poly(5, 17, -90).split(' ').map((p, i) => P.dot(...p.split(',').map(Number), 3.2, ['#7ad07a', '#ffe28a', '#e0954a', '#cfd8e6', '#6fb2ff'][i])).join('') + P.dot(0, 0, 3.4, '#fff'), // 84 Ngũ Khí Triều Nguyên: ngũ hành
    (P) => P.lotus(-12, 2, 0.8, 8) + P.lotus(12, 2, 0.8, 8) + P.lotus(0, -12, 0.8, 8) + P.crown(0, 16, 0.8, 3), // 85 Tam Hoa Tụ Đỉnh: ba hoa tụ đỉnh
    (P) => P.bird(0, 0, 1.5) + P.arc(0, 0, 20, 20, 340, '#fff', 1) + R(5).map((a) => P.star(...pol(20, a - 90), 4, 2.4, 1)).join(''), // 86 Thần Du Thái Hư: hạc bay trong thái hư
    (P) => R(8).map((a) => P.line('M' + pol(21, a).join(' ') + 'L' + pol(8, a).join(' '), '#fff', 1) + P.dot(...pol(21, a), 2.2, '#fff')).join('') + P.ring(0, 0, 8, '#fff', 1.4) + P.dot(0, 0, 4.4, '#ffe28a'), // 87 Vạn Tượng Quy Nhất: muôn hình về một
    (P) => P.heart(-6, 0, 1.4, '#fff') + P.heart(7, 3, 1.4, '#ffd0d6') + P.ring(0, 2, 20, '#fff', 1), // 88 Thiên Tâm Ngã Tâm: hai tim giao nhau
    (P) => P.sun(0, 0, 8, 16) + P.lotus(0, 0, 1, 8) + P.ring(0, 0, 22, '#fff', 1), // 89 Thiên Nhân Viên Mãn: mặt trời và sen
    // —— Võ lâm chí tôn (90–99)
    (P) => P.mountain(0, 8, 0, 1.9) + P.flag(2, -6, 0.9) + P.sun(-16, -14, 4, 10) + P.star(16, -16, 5, 3.4, 1.4), // 90 Đăng Phong Tạo Cực: lên tới đỉnh
    (P) => P.cloud(0, -12, 1.2) + P.bolt(-9, 10, 8, 1.1) + P.bolt(0, 12, 0, 1.4) + P.bolt(10, 10, -8, 1.1), // 91 Lôi Đình Vạn Quân: ba tia sét
    (P) => P.palm(0, 6, 0, 1.4) + P.taiji(0, -6, 6) + P.trigram(-17, -12, [1, 1, 1], 9) + P.trigram(17, -12, [0, 0, 0], 9), // 92 Càn Khôn Tại Thủ: càn khôn trong tay
    (P) => R(9, 0, 0).map((a) => P.sword(...pol(14, a - 90), a + 180, 0.78)).join('') + P.dot(0, 0, 4.4, '#fff'), // 93 Vạn Kiếm Triều Tông: kiếm chầu về
    (P) => P.mountain(0, 8, 0, 1.2) + P.person(0, -12, 0.7, 'stand') + P.star(0, -22, 5, 4, 1.6) + R(2).map((a) => P.dot(...pol(20, a - 90 + 70), 1.2)).join(''), // 94 Độc Bộ Thiên Hạ: một người trên đỉnh
    (P) => P.arc(0, 0, 20, 200, 340, '#fff', 1.6) + P.bird(0, 2, 1.1) + P.star(0, -14, 8, 5.4, 2.4) + P.cloud(0, 18, 0.9), // 95 Siêu Phàm Nhập Thánh: bay lên vượt cõi phàm
    (P) => P.diamond(0, 0, 2.1, '#fff') + P.spark(-16, -12, 1.6) + P.spark(16, -8, 1.2) + P.spark(10, 16, 1.4), // 96 Bất Diệt Kim Thân: kim cương
    (P) => P.ring(0, 0, 16, '#fff', 2) + R(8, 0, 22.5).map((a) => P.line('M' + pol(16, a).join(' ') + 'L' + pol(22, a).join(' '), '#fff', 1.2)).join('') + P.arrow(-12, 16, 6, -6, '#fff', 2.4), // 97 Xuyên Phá Hư Không: xuyên qua vòng
    (P) => '<g fill="#fff" stroke="#000" stroke-opacity=".35" stroke-width=".6"><rect x="-17" y="9" width="11" height="8" rx="1.2"/><rect x="-8" y="2" width="11" height="15" rx="1.2"/><rect x="1" y="-5" width="11" height="22" rx="1.2" opacity=".4"/></g>' + P.foot(-2.5, -6, 0, 0.8) + P.ring(11, -13, 7.5, '#fff', 1.1).replace('<circle', '<circle stroke-dasharray="1.8 1.8"') + P.spark(11, -13, 2), // 98 Bán Bộ Thành Thần: nửa bước lên bậc cuối, vầng sáng chờ
    (P) => P.mountain(0, 10, 0, 1.8) + P.crown(0, -10, 0.9, 5) + R(5, 0, -90).map((a) => P.star(...pol(21, a * 0.5 - 120 + a * 0.5), 5, 2.6, 1.1)).join(''), // 99 Nhân Gian Cực Cảnh: đỉnh cực của nhân gian
    // —— Thần cảnh (100–103)
    (P) => P.lotus(0, 4, 1.5, 8) + P.eye(0, -13, 0.8) + R(8).map((a) => P.dot(...pol(20, a - 90), 1, '#fff')).join(''), // 100 Thành Thần: sen và con mắt thần
    (P) => P.sun(0, 7, 7, 16) + P.crown(0, -12.5, 0.8, 5), // 101 Thượng Thần: mặt trời đội mão
    (P) => P.compass(0, 0, 1.5) + R(12).map((a) => P.dot(...pol(21, a - 90), 1.6, a % 90 === 0 ? '#ffe28a' : '#fff')).join(''), // 102 Phương Thần: la bàn mười hai phương
    (P) => P.crown(0, -3, 1.6, 5) + P.swirl(0, 12, 10, 2, 1, '#fff', 1.3) + R(7).map((a) => P.star(...pol(21, a - 90), 5, 2.8, 1.2)).join(''), // 103 Thần Vương: vương miện và tinh tú
  ];

  // ---- Khung huy hiệu theo cảnh giới ---------------------------------------------------------------------------------------------------
  // Hệ toạ độ −37…37, thân huy hiệu bán kính 26,5 (vành 20,5–26,5, ruộng 20,5); phần trang trí mọc ra ngoài thân và dày dần theo cảnh giới.
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const x = hex(a);
    const y = hex(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  const PALX = PAL.map((c) => (c ? Object.assign({ fc: mix(c.m, c.d, 0.5), fe: mix(c.d, '#050608', 0.45) }, c) : c));
  const PRIM = PAL.map((c) => (c ? prims(c) : c));
  const SIZE = FROM.slice(0, 11).map((from, i) => FROM[i + 1] - from); // số cấp của từng cảnh giới: 9, 10 … 10, 4

  const beads = (n, r, rr, c, rot = -90, col) =>
    Array.from({ length: n }, (_, i) => {
      const [x, y] = pol(r, rot + (360 / n) * i);
      return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="' + (col || c.l) + '" stroke="' + c.d + '" stroke-width=".5"/>';
    }).join('');
  const teeth = (n, r0, r1, hw, c, rot, fill) =>
    Array.from({ length: n }, (_, i) => {
      const a = rot + (360 / n) * i;
      const [x0, y0] = pol(r0, a - hw);
      const [x1, y1] = pol(r0, a + hw);
      const [tx, ty] = pol(r1, a);
      return '<path d="M' + x0 + ' ' + y0 + 'L' + tx + ' ' + ty + 'L' + x1 + ' ' + y1 + 'Z" fill="' + (fill || c.m) + '" stroke="' + c.d + '" stroke-width=".6" stroke-linejoin="round"/>';
    }).join('');
  const rays = (n, r0, r1, col, w, op, rot = -90) =>
    '<g stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" opacity="' + op + '">' +
    Array.from({ length: n }, (_, i) => {
      const a = rot + (360 / n) * i;
      const [x0, y0] = pol(r0, a);
      const [x1, y1] = pol(r1 - (i % 2 ? 2.4 : 0), a);
      return '<path d="M' + x0 + ' ' + y0 + 'L' + x1 + ' ' + y1 + '"/>';
    }).join('') +
    '</g>';
  // Một nhánh nguyệt quế bên phải (bên trái lấy đối xứng).
  const laurel = (c, n, from, to, rr) =>
    Array.from({ length: n }, (_, i) => {
      const t = n === 1 ? 0 : i / (n - 1);
      const th = from + (to - from) * t;
      const [x, y] = pol(rr, th);
      const k = 0.78 + 0.28 * Math.sin(Math.PI * t);
      return (
        '<path transform="translate(' + x + ' ' + y + ') rotate(' + f(th - 72) + ') scale(' + f(k) + ')" d="M0 0C3-3.4 8-3.4 11.5 0 8 3.4 3 3.4 0 0Z" fill="' + (i % 2 ? c.l : c.m) + '" stroke="' + c.d + '" stroke-width=".55"/>' +
        '<path transform="translate(' + x + ' ' + y + ') rotate(' + f(th - 110) + ') scale(' + f(k * 0.8) + ')" d="M0 0C3-3 7-3 10 0 7 3 3 3 0 0Z" fill="' + (i % 2 ? c.m : c.l) + '" stroke="' + c.d + '" stroke-width=".5"/>'
      );
    }).join('');
  // Cánh: mỗi hàng lông gồm n chiếc xoè từ góc a0 tới a1 quanh điểm gốc (px, py), lông ở mép trên ngắn hơn lông phía dưới;
  // side = 1 (phải) hoặc −1 (trái, lấy đối xứng).
  const wing = (c, side, rows) =>
    rows
      .map((row) =>
        Array.from({ length: row.n }, (_, i) => {
          const t = row.n === 1 ? 0.5 : i / (row.n - 1);
          const ang = row.a0 + (row.a1 - row.a0) * t;
          const L2 = row.len * (1 - (row.taper || 0) * (1 - t));
          const w = row.w;
          return (
            '<path transform="translate(' + side * row.px + ' ' + row.py + ') scale(' + side + ' 1) rotate(' + f(ang) + ')" d="M0 0C' + f(L2 * 0.25) + ' ' + -w + ' ' + f(L2 * 0.72) + ' ' + -w + ' ' + f(L2) + ' 0 ' + f(L2 * 0.72) + ' ' + f(w * 0.85) + ' ' + f(L2 * 0.25) + ' ' + f(w * 0.85) + ' 0 0Z" fill="' + row.fill + '" stroke="' + c.d + '" stroke-width=".55" stroke-linejoin="round"/>'
          );
        }).join(''),
      )
      .join('');
  const sparkle = (x, y, s, col) =>
    '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0-4Q.6-.6 4 0 .6.6 0 4-.6.6-4 0-.6-.6 0-4Z" fill="' + col + '"/>';

  // Mỗi khung trả { back: phần mọc ra sau thân, top: món đội trên đỉnh }.
  const FRAME = [
    null,
    // 1 đồng mộc: trơn, mộc mạc
    () => ({ back: '', top: '' }),
    // 2 đồng đỏ: viền hạt đồng, núm trên đỉnh
    (c, P) => ({ back: beads(12, 27.6, 2.2, c, -75, c.m), top: P.dot(0, -29.6, 1.9, c.l) }),
    // 3 thép: bát giác có đinh tán và gờ sáng tối, kim cương nhỏ trên đỉnh
    (c, P) => ({
      back:
        '<polygon points="' + poly(8, 31, -67.5) + '" fill="url(#zr3)" stroke="' + c.d + '" stroke-width=".8" stroke-linejoin="round"/>' +
        '<polygon points="' + poly(8, 27.6, -67.5) + '" fill="none" stroke="' + c.g + '" stroke-opacity=".5" stroke-width=".6"/>' +
        beads(8, 28.6, 1.1, c, -67.5, c.g) +
        (() => {
          const q = poly(8, 29.6, -67.5).split(' ').map((v) => v.split(',').join(' '));
          return (
            '<path d="M' + q[5] + 'L' + q[6] + 'L' + q[7] + 'L' + q[0] + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M' + q[1] + 'L' + q[2] + 'L' + q[3] + 'L' + q[4] + '" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
          );
        })(),
      top: P.diamond(0, -32.4, 0.42, c.a),
    }),
    // 4 bạc lam: răng cưa mười sáu cạnh, hai vòng mảnh, sao nhỏ trên đỉnh
    (c, P) => ({
      back: teeth(16, 25, 30.8, 6.2, c, -90, c.l) + '<circle r="26.4" fill="none" stroke="' + c.a + '" stroke-opacity=".55" stroke-width=".6"/><circle r="30.4" fill="none" stroke="' + c.g + '" stroke-opacity=".35" stroke-width=".5"/>',
      top: P.star(0, -32.6, 5, 3.3, 1.4, c.a) + P.dot(-6, -32.8, 0.9, c.l) + P.dot(6, -32.8, 0.9, c.l),
    }),
    // 5 ngọc bích: tám thuỳ như ý có điểm sáng, đôi lá trên đỉnh
    (c, P) => ({
      back:
        Array.from({ length: 8 }, (_, i) => {
          const a = -90 + 45 * i;
          const big = i % 2 === 0;
          const [x, y] = pol(big ? 27.2 : 26.4, a);
          return '<circle cx="' + x + '" cy="' + y + '" r="' + (big ? 4.2 : 2.9) + '" fill="' + (big ? c.l : c.m) + '" stroke="' + c.d + '" stroke-width=".6"/>';
        }).join('') +
        Array.from({ length: 8 }, (_, i) => {
          const [x, y] = pol(i % 2 === 0 ? 27.9 : 26.9, -90 + 45 * i - 18);
          return '<circle cx="' + x + '" cy="' + y + '" r=".8" fill="#fff" opacity=".85"/>';
        }).join('') +
        '<circle r="26.9" fill="none" stroke="' + c.g + '" stroke-opacity=".5" stroke-width=".5"/>',
      top: P.leaf(-4.4, -31.6, -52, 0.42) + P.leaf(4.4, -31.6, 52, 0.42),
    }),
    // 6 lam bảo: tia sao mười sáu cánh hai tầng, ngọc trên đỉnh
    (c, P) => ({
      back: teeth(16, 24, 34.4, 5.2, c, -90, c.a) + teeth(16, 24, 30.2, 6.4, c, -78.75, c.l) + '<circle r="26.6" fill="none" stroke="' + c.g + '" stroke-opacity=".6" stroke-width=".6"/>',
      top: P.gem(0, -33.2, 0.5, c.a),
    }),
    // 7 tử ngọc: tám cánh sen có gân, hạt trên vành, mão ba mũi
    (c, P) => ({
      back:
        Array.from({ length: 8 }, (_, i) => '<path transform="rotate(' + 45 * i + ')" d="M-5.6-22C-8.4-27-4.6-33.4 0-35.6 4.6-33.4 8.4-27 5.6-22Z" fill="' + (i % 2 ? c.l : c.m) + '" stroke="' + c.d + '" stroke-width=".6" stroke-linejoin="round"/>').join('') +
        Array.from({ length: 8 }, (_, i) => '<path transform="rotate(' + 45 * i + ')" d="M0-23.4V-33" stroke="' + c.g + '" stroke-opacity=".65" stroke-width=".6" stroke-linecap="round"/>').join('') +
        beads(24, 27.1, 0.85, c, -90, c.g),
      top: P.crown(0, -31.4, 0.58, 3),
    }),
    // 8 chu sa: hai tầng lửa có gân và ngọc đầu ngọn, vành đôi, mão ba ngọc
    (c, P) => ({
      back:
        Array.from({ length: 12 }, (_, i) => '<path transform="rotate(' + 30 * i + ')" d="M-3.4-23C-3.4-28.6-1-31.4 0.6-36 1.8-31 3.6-28 3.4-23Z" fill="' + c.m + '" stroke="' + c.d + '" stroke-width=".6" stroke-linejoin="round"/>').join('') +
        Array.from({ length: 12 }, (_, i) => '<path transform="rotate(' + (30 * i + 15) + ')" d="M-2.8-23C-2.6-26-1.2-28.2 0-31 1.2-28.2 2.6-26 2.8-23Z" fill="' + c.l + '" stroke="' + c.d + '" stroke-width=".5" stroke-linejoin="round"/>').join('') +
        Array.from({ length: 12 }, (_, i) => '<path transform="rotate(' + 30 * i + ')" d="M.4-24.4C.5-28 .6-31 .6-33.4" fill="none" stroke="' + c.g + '" stroke-opacity=".6" stroke-width=".6" stroke-linecap="round"/>').join('') +
        Array.from({ length: 12 }, (_, i) => '<circle transform="rotate(' + 30 * i + ')" cx=".6" cy="-34" r=".9" fill="' + c.g + '"/>').join('') +
        '<circle r="27.4" fill="none" stroke="' + c.g + '" stroke-opacity=".55" stroke-width=".7" stroke-dasharray="1 1.8"/>',
      top: P.crown(0, -32.6, 0.52, 3) + P.dot(-3.6, -35.4, 0.9, c.a) + P.dot(3.6, -35.4, 0.9, c.a),
    }),
    // 9 hoàng kim: vòng nguyệt quế hai bên, hạt trên vành, mão năm mũi
    (c, P) => ({
      back:
        '<circle r="28" fill="none" stroke="' + c.a + '" stroke-opacity=".4" stroke-width="1.2"/>' +
        laurel(c, 9, 78, -28, 28.6) + '<g transform="scale(-1 1)">' + laurel(c, 9, 78, -28, 28.6) + '</g>' + beads(24, 27.3, 0.8, c, -90, c.g),
      top: P.crown(0, -32.2, 0.62, 5),
    }),
    // 10 bạch kim: đôi cánh ba hàng, tia sáng mảnh, mão có hai sao
    (c, P) => {
      const rows = [
        { n: 7, len: 21, w: 3.6, a0: -74, a1: 34, px: 19, py: -9, fill: c.m, taper: 0.3 },
        { n: 6, len: 16.8, w: 3.2, a0: -66, a1: 26, px: 19, py: -8, fill: c.l, taper: 0.3 },
        { n: 5, len: 12.4, w: 2.8, a0: -56, a1: 18, px: 19, py: -7, fill: c.g, taper: 0.25 },
      ];
      return {
        back: rays(24, 27.4, 33.6, c.a, 0.8, 0.5) + wing(c, 1, rows) + wing(c, -1, rows) + beads(24, 27.1, 0.85, c, -90, c.g),
        top: P.crown(0, -32.2, 0.62, 5) + sparkle(-9.5, -31.6, 0.8, c.g) + sparkle(9.5, -31.6, 0.8, c.g),
      };
    },
    // 11 thần quang: hào quang ba mươi hai tia, đôi cánh ba hàng rộng, mão có ngọc, sao bay
    (c, P) => {
      const rows = [
        { n: 8, len: 22, w: 3.7, a0: -80, a1: 40, px: 19, py: -9, fill: c.m, taper: 0.32 },
        { n: 7, len: 18, w: 3.3, a0: -72, a1: 32, px: 19, py: -8, fill: c.l, taper: 0.32 },
        { n: 6, len: 13.4, w: 2.9, a0: -62, a1: 22, px: 19, py: -7, fill: c.g, taper: 0.26 },
      ];
      return {
        back:
          rays(32, 27, 36.6, c.a, 0.9, 0.7) +
          '<circle r="31.6" fill="none" stroke="' + c.g + '" stroke-opacity=".45" stroke-width=".6"/>' +
          wing(c, 1, rows) + wing(c, -1, rows) + beads(36, 27.1, 0.7, c, -90, c.g),
        top:
          P.crown(0, -32.6, 0.7, 5) + P.gem(0, -33.4, 0.34, c.a) + sparkle(-11.5, -32.4, 1, c.g) + sparkle(11.5, -32.4, 1, c.g) +
          sparkle(-31, 16, 0.8, c.a) + sparkle(31, 16, 0.8, c.a) + sparkle(-26, 27, 0.6, c.g) + sparkle(26, 27, 0.6, c.g),
      };
    },
  ];

  const spec = (level) => {
    const lv = Math.max(1, Math.min(COUNT, Math.floor(+level) || 1));
    const realm = realmOf(lv);
    const size = SIZE[realm - 1];
    const offset = lv - FROM[realm - 1];
    return { level: lv, realm, offset, size, lit: offset + 1, full: offset === size - 1 };
  };
  const countEls = (s) => (s.match(/<(?:path|circle|polygon|rect|ellipse|g)\b/g) || []).length;

  // Dựng một cấp: head (trang trí sau thân, vành, ruộng), mot (hình giữa), tail (ngọc, chi tiết thêm, món đội đỉnh); decor = số phần
  // tử của khung ngoài thân (back + top), thước đo "khung dày dần theo cảnh giới".
  function build(level) {
    const sp = spec(level);
    const c = PALX[sp.realm];
    const P = PRIM[sp.realm];
    const fr = FRAME[sp.realm](c, P);
    const r = sp.realm;
    const o = sp.offset;
    const n = sp.size;
    // vành, rãnh và các ngọc tiến độ: ngọc sáng = số cấp đã đi trong cảnh giới (cấp cuối thì sáng đủ)
    const gemR = n <= 4 ? 2.5 : 1.55;
    let gems = '<circle class="zem-groove" r="23.5" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="3.4"/>';
    for (let i = 0; i < n; i++) {
      const [x, y] = pol(23.5, -90 + (i + 0.5) * (360 / n));
      if (i < sp.lit) {
        gems +=
          '<circle class="zem-on" cx="' + x + '" cy="' + y + '" r="' + f(gemR * 2.2) + '" fill="' + c.a + '" opacity=".42"/>' +
          '<circle class="zem-on" cx="' + x + '" cy="' + y + '" r="' + gemR + '" fill="url(#zg' + r + ')" stroke="' + c.g + '" stroke-width=".4"/>' +
          '<circle class="zem-on" cx="' + f(x - gemR * 0.32) + '" cy="' + f(y - gemR * 0.32) + '" r="' + f(gemR * 0.36) + '" fill="#fff"/>';
      } else {
        gems += '<circle class="zem-off" cx="' + x + '" cy="' + y + '" r="' + gemR + '" fill="#05070b" stroke="' + c.d + '" stroke-width=".5" opacity=".85"/>';
      }
    }
    // chi tiết thêm dần theo vị trí của cấp trong cảnh giới: vệt bóng (từ cấp thứ ba), đường chạm mảnh (từ cấp thứ năm),
    // ánh kính (từ cấp thứ bảy), vòng viên mãn và tia sáng đỉnh (cấp cuối)
    let polish = '';
    if (o >= 2 || n <= 4) polish += '<path class="zem-gloss" d="M-17.6-10.8A20.6 20.6 0 0 1-2.4-20.4" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.6" stroke-linecap="round"/>';
    if (o >= 4 || (n <= 4 && o >= 1)) polish += '<circle class="zem-hair" r="19" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".5"/>';
    if (o >= 6 || (n <= 4 && o >= 2)) polish += '<ellipse class="zem-glass" cx="-6" cy="-9" rx="13" ry="9" transform="rotate(-28 -6 -9)" fill="url(#zhl)"/>';
    if (sp.full) polish += '<circle class="zem-full" r="20.6" fill="none" stroke="' + c.a + '" stroke-width="1.1" opacity=".95"/>' + sparkle(0, -20.3, 1.25, '#fff');
    const head =
      '<g class="zem-back">' + fr.back + '</g>' +
      '<circle class="zem-rim" r="23.5" fill="none" stroke="url(#zr' + r + ')" stroke-width="6.2"/>' +
      '<circle r="26.6" fill="none" stroke="' + c.d + '" stroke-opacity=".75" stroke-width=".7"/>' +
      '<circle class="zem-field" r="20.5" fill="url(#zf' + r + ')" stroke="' + c.d + '" stroke-width=".8"/>';
    const mot = '<g class="zem-motif" clip-path="url(#zclip)"><g transform="scale(.93)">' + MOTIF[sp.level](P) + '</g></g>';
    const tail = '<g class="zem-gems">' + gems + '</g>' + polish + '<g class="zem-top">' + fr.top + '</g>';
    return { head, mot, tail, body: head + mot + tail, decor: countEls(fr.back) + countEls(fr.top) };
  }
  // Phần ruột <symbol> của một cấp (không gồm <defs>; gradient dùng chung nằm trong bảng ký hiệu).
  const markup = (level) => build(level).body;
  // Số phần tử vẽ ngoài hình giữa (khung, ngọc, chi tiết thêm) và riêng phần trang trí ngoài thân: bài kiểm tra dùng để so sánh các cấp.
  const detail = (level) => {
    const b = build(level);
    return countEls(b.head) + countEls(b.tail);
  };
  const decor = (level) => build(level).decor;

  const defs = () =>
    PALX.slice(1)
      .map((c, i) => {
        const r = i + 1;
        const rim = c.rim || [[0, c.g], [0.3, c.l], [0.65, c.m], [1, c.d]];
        return (
          '<linearGradient id="zr' + r + '" x1="0" y1="0" x2="1" y2="1">' + rim.map(([o, col]) => '<stop offset="' + o + '" stop-color="' + col + '"/>').join('') + '</linearGradient>' +
          '<radialGradient id="zf' + r + '" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="' + c.fc + '"/><stop offset="1" stop-color="' + c.fe + '"/></radialGradient>' +
          '<radialGradient id="zg' + r + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + c.g + '"/><stop offset=".5" stop-color="' + c.a + '"/><stop offset="1" stop-color="' + c.m + '"/></radialGradient>'
        );
      })
      .join('') +
    '<radialGradient id="zhl"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<clipPath id="zclip"><circle r="20.3"/></clipPath>';

  // Bảng ký hiệu dùng chung trong trang: mỗi cấp chỉ dựng khi cần.
  let sprite = null;
  const made = new Set();
  function ensure(level) {
    const doc = window.document;
    if (!doc || !doc.body) return false;
    if (!sprite || !sprite.isConnected) {
      made.clear();
      sprite = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sprite.setAttribute('class', 'zem-sprite');
      sprite.setAttribute('width', '0');
      sprite.setAttribute('height', '0');
      sprite.setAttribute('aria-hidden', 'true');
      sprite.setAttribute('focusable', 'false');
      sprite.innerHTML = '<defs>' + defs() + '</defs>';
      doc.body.appendChild(sprite);
    }
    const lv = spec(level).level;
    if (!made.has(lv)) {
      made.add(lv);
      const sym = doc.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      sym.setAttribute('id', 'zem-' + lv);
      sym.setAttribute('viewBox', '-37 -37 74 74');
      sym.setAttribute('overflow', 'visible'); // cánh và tia sáng của cảnh giới cao nhô khỏi khung 74 một chút; không cắt cụt
      sym.innerHTML = markup(lv);
      sprite.appendChild(sym);
    }
    return true;
  }
  // Chuỗi <svg> của huy hiệu một cấp, kích thước do CSS của lớp chứa quyết định.
  function html(level, cls) {
    const lv = spec(level).level;
    ensure(lv);
    return '<svg class="zem' + (cls ? ' ' + cls : '') + '" viewBox="-37 -37 74 74" overflow="visible" aria-hidden="true" focusable="false" data-emblem="' + lv + '"><use href="#zem-' + lv + '" x="-37" y="-37" width="74" height="74"/></svg>';
  }
  const esc = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  // Nhãn đọc cho huy hiệu một cấp: "Huy hiệu cấp 37 · Nhất Kích Tất Trúng, 8/10 ngọc sáng".
  const label = (level, name) => {
    const sp = spec(level);
    return 'Huy hiệu cấp ' + sp.level + (name ? ' · ' + name : '') + ', ' + sp.lit + '/' + sp.size + ' ngọc sáng';
  };
  // Thẻ nhỏ báo huy hiệu mới khi lên cấp (không chặn thao tác, không đọc lại vì thông báo đã đọc): hiện ở đáy trang vài giây.
  let popTimer = 0;
  function pop(level, name, more) {
    const doc = window.document;
    if (!doc || !doc.body) return null;
    doc.querySelectorAll('.zem-pop').forEach((el) => el.remove());
    clearTimeout(popTimer);
    const sp = spec(level);
    const el = doc.createElement('div');
    el.className = 'zem-pop';
    el.setAttribute('aria-hidden', 'true');
    el.dataset.level = String(sp.level);
    el.innerHTML = '<span class="zem-pop-badge">' + html(sp.level) + '</span><span class="zem-pop-text"><small>Huy hiệu mới' + (more ? ' · ' + esc(more) : '') + '</small><strong>Cấp ' + sp.level + (name ? ' · ' + esc(name) : '') + '</strong></span>';
    doc.body.appendChild(el);
    popTimer = setTimeout(() => el.remove(), 4800);
    return el;
  }
  window.zenEmblem = { COUNT, FROM, SIZE, spec, markup, html, ensure, detail, decor, defs, label, pop, PAL: PALX, MOTIF, prims, realmOf };
})();
