'use strict';
// v2.15.0 (Thân Pháp): lõi dựng hình 3D nhỏ cho nhân vật — không ảnh ngoài, không thư viện, mọi hình đều là SVG sinh ra từ toán.
// Ý tưởng: nhân vật là một bộ khớp trong không gian 3 chiều (x phải, y lên, z hướng về người xem). Mỗi khung hình:
//   1. chọn tư thế từ chuỗi khung chính (nội suy Hermite, lặp vòng);
//   2. tính khớp xương: tay/chân tự uốn theo mục tiêu (IK hai đoạn), đầu xoay nên mặt trượt trên mặt cầu;
//   3. đặt các khối (cầu, chi, ống áo, dải vải) vào camera có xoay nhẹ theo con trỏ rồi chiếu xuống SVG;
//   4. sắp theo độ sâu (xa vẽ trước), đổ bóng ba tông theo hướng sáng thật (thân xoay thì dải sáng chạy theo).
// Vải, tóc, tua rua là dây Verlet nên đuôi chuyển động trễ pha so với thân. Giảm chuyển động thì chỉ dựng một khung đứng yên.
// API: window.zenRig = { V, rig3d, mat, Scene, Chain, solveIK, Clip, track, mount, reduced }.
(function () {
  const D = Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
  };
  // Ma trận 3×3 theo hàng. rotY dương: hướng nhìn [0,0,1] quay sang +x (phải người xem). rotX dương: thân ngả về phía trước.
  const rotX = (d) => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
  const rotY = (d) => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
  const rotZ = (d) => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  const mm = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mv = (M, v) => [V.dot(M[0], v), V.dot(M[1], v), V.dot(M[2], v)];
  const M = { rotX, rotY, rotZ, mm, mv, I: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };

  // ---- Màu: ba tông từ một màu gốc ----------------------------------------------------------------------------------------
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mixc = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const matCache = new Map();
  function mat(base) {
    let m = matCache.get(base);
    if (!m) {
      const c = hex(base), lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255, dk = lum < 0.25;
      m = { id: base.slice(1), base, light: mixc(base, '#ffffff', dk ? 0.2 : 0.34), hi: mixc(base, '#ffffff', dk ? 0.34 : 0.62), shade: mixc(base, '#2a1d3a', dk ? 0.2 : 0.3), deep: mixc(base, '#2a1d3a', 0.52) };
      matCache.set(base, m);
    }
    return m;
  }

  // ---- Camera ------------------------------------------------------------------------------------------------------------------
  // Xoay quanh tâm thân (0,100,0); chiếu phối cảnh nhẹ (gần thì to). Trả {x,y,z,k}: tọa độ SVG, độ sâu, tỉ lệ.
  const PIVOT = [0, 100, 0], SCALE = 1.1;
  function camera(yaw, pitch) {
    const R = mm(rotX(pitch), rotY(yaw));
    const L = V.norm(mv(R, [-0.5, 0.74, 0.46])); // hướng sáng trong không gian camera
    return {
      R, L, yaw, pitch,
      p(v) {
        const q = V.add(mv(R, V.sub(v, PIVOT)), PIVOT);
        const k = SCALE / (1 - q[2] / 1100);
        return { x: 100 + q[0] * k, y: 111 - (q[1] - 100) * k, z: q[2], k };
      },
      n: (v) => mv(R, v), // pháp tuyến → không gian camera (n[2] > 0: hướng về người xem)
    };
  }

  // Đặt một nhân vật vào cảnh: tỉ lệ s, tịnh tiến pos, xoay quanh trục đứng yaw (độ); dùng chung camera của cảnh.
  // Điểm vào là tọa độ nhân vật (gốc ở sàn, dưới chân), ra là tọa độ màn hình của cảnh; k nhân thêm s nên bán kính các khối co theo.
  function place(cam, o) {
    const s = o.s == null ? 1 : o.s, pos = o.pos || [0, 0, 0], Ry = rotY(o.yaw || 0), R = mm(cam.R, Ry);
    return {
      R, L: cam.L, yaw: cam.yaw, pitch: cam.pitch, fwd: R[2],
      p(v) {
        const P = cam.p(V.add(mv(Ry, V.mul(v, s)), pos));
        P.k *= s;
        return P;
      },
      n: (v) => mv(R, v), // pháp tuyến nhân vật → không gian camera; hàng R[0], R[1], R[2] là phải, lên, hướng về người xem theo tọa độ nhân vật
    };
  }

  // ---- Cảnh: danh sách khối đã chiếu --------------------------------------------------------------------------------------------
  const f1 = (v) => Math.round(v * 10) / 10;
  const pts = (a) => a.map((p) => f1(p.x) + ',' + f1(p.y)).join(' ');
  // Viền đa giác bao hai hình tròn (chi thon): tâm c0, c1 (màn hình), bán kính r0, r1.
  function hull(c0, r0, c1, r1) {
    const dx = c1.x - c0.x, dy = c1.y - c0.y, d = Math.hypot(dx, dy);
    if (d < Math.abs(r0 - r1) + 0.01) {
      const b = r0 >= r1 ? [c0, r0] : [c1, r1];
      return circlePts(b[0], b[1]);
    }
    const a = Math.atan2(dy, dx), be = Math.acos(clamp((r0 - r1) / d, -1, 1));
    const out = [];
    for (let i = 0; i <= 6; i++) { const t = a - be + (2 * be * i) / 6; out.push({ x: c1.x + r1 * Math.cos(t), y: c1.y + r1 * Math.sin(t) }); }
    for (let i = 0; i <= 6; i++) { const t = a + be + ((2 * Math.PI - 2 * be) * i) / 6; out.push({ x: c0.x + r0 * Math.cos(t), y: c0.y + r0 * Math.sin(t) }); }
    return out;
  }
  function circlePts(c, r) {
    const o = [];
    for (let i = 0; i < 14; i++) o.push({ x: c.x + r * Math.cos((i * Math.PI * 2) / 14), y: c.y + r * Math.sin((i * Math.PI * 2) / 14) });
    return o;
  }

  class Scene {
    constructor(cam) {
      this.cam = cam;
      this.ops = [];
      this.mats = new Set();
    }
    push(k, tag, z, a, inner) {
      this.ops.push({ k: this.pre ? this.pre + k : k, tag, z, a, inner });
    }
    // Cảnh con dùng chung danh sách khối và bảng màu với cảnh mẹ (nhân vật đặt vào một cảnh lớn); pre làm khóa không trùng nhau.
    child(cam, pre) {
      const c = new Scene(cam);
      c.ops = this.ops;
      c.mats = this.mats;
      c.pre = pre || '';
      return c;
    }
    // Khối cầu/elip: dùng dải màu xuyên tâm có điểm sáng ở phía nguồn sáng.
    sphere(k, c, r, m, zb = 0) {
      const P = this.cam.p(c);
      this.mats.add(m);
      this.push(k, 'ellipse', P.z + zb, { cx: f1(P.x), cy: f1(P.y), rx: f1((Array.isArray(r) ? r[0] : r) * P.k), ry: f1((Array.isArray(r) ? r[1] : r) * P.k), fill: 'url(#GID-' + m.id + ')' });
      return P;
    }
    // Chi thon (cánh tay, đùi, cổ): ba lớp — tối, giữa, sáng lệch về phía nguồn sáng.
    limb(k, p0, p1, r0, r1, m, zb = 0) {
      const A = this.cam.p(p0), B = this.cam.p(p1);
      const R0 = r0 * A.k, R1 = r1 * B.k;
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
      let nx = -dy / d, ny = dx / d; // pháp tuyến màn hình
      const sx = this.cam.L[0], sy = -this.cam.L[1];
      if (nx * sx + ny * sy < 0) { nx = -nx; ny = -ny; }
      const z = (A.z + B.z) / 2 + zb;
      this.push(k + 'd', 'polygon', z, { points: pts(hull(A, R0, B, R1)), fill: m.shade });
      this.push(k + 'm', 'polygon', z + 0.01, { points: pts(hull({ x: A.x + nx * R0 * 0.16, y: A.y + ny * R0 * 0.16 }, R0 * 0.8, { x: B.x + nx * R1 * 0.16, y: B.y + ny * R1 * 0.16 }, R1 * 0.8)), fill: m.base });
      this.push(k + 'l', 'polygon', z + 0.02, { points: pts(hull({ x: A.x + nx * R0 * 0.38, y: A.y + ny * R0 * 0.38 }, R0 * 0.34, { x: B.x + nx * R1 * 0.38, y: B.y + ny * R1 * 0.38 }, R1 * 0.34)), fill: m.light, opacity: 0.7 });
      return { A, B };
    }
    // Ống áo: mỗi vòng {c: tâm, u: bán trục x thế giới, w: bán trục z thế giới}; các vòng xếp từ trên xuống dưới.
    tube(k, rings, m, opt = {}) {
      const N = 22, cam = this.cam;
      const R = rings.map((g) => {
        const P = [];
        let zs = 0;
        for (let j = 0; j < N; j++) {
          const t = (j / N) * Math.PI * 2;
          const q = V.add(g.c, V.add(V.mul(g.u, Math.cos(t)), V.mul(g.w, Math.sin(t))));
          const s = cam.p(q);
          const nn = cam.n(V.add(V.mul(g.u, Math.cos(t) / (V.dot(g.u, g.u) || 1)), V.mul(g.w, Math.sin(t) / (V.dot(g.w, g.w) || 1))));
          s.nz = nn[2]; s.nx = nn[0]; s.ny = nn[1]; s.t = t;
          P.push(s); zs += s.z;
        }
        return { P, z: zs / N, C: cam.p(g.c) };
      });
      // Đường biên trái/phải của từng vòng.
      const side = R.map((r) => {
        let l = r.P[0], rr = r.P[0];
        r.P.forEach((p) => { if (p.x < l.x) l = p; if (p.x > rr.x) rr = p; });
        return { l, r: rr };
      });
      const arc = (ring, lo, hi, lower) => {
        const a = ring.P.filter((p) => (lower ? p.y >= (lo.y + (hi.y - lo.y) * ((p.x - lo.x) / ((hi.x - lo.x) || 1))) : p.y < (lo.y + (hi.y - lo.y) * ((p.x - lo.x) / ((hi.x - lo.x) || 1)))) && p.x >= lo.x - 0.01 && p.x <= hi.x + 0.01);
        a.sort((x, y) => x.x - y.x);
        return a;
      };
      const n = R.length, top = side[0], bot = side[n - 1];
      const outline = [].concat(
        [top.l], arc(R[0], top.l, top.r, false), [top.r],
        side.slice(1, n - 1).map((s) => s.r), [bot.r],
        arc(R[n - 1], bot.l, bot.r, true).reverse(), [bot.l],
        side.slice(1, n - 1).map((s) => s.l).reverse(),
      );
      const z = R.reduce((a, r) => a + r.z, 0) / n + (opt.zb || 0);
      // Dải sáng: trên mỗi vòng lấy các điểm quay về người xem và gần hướng sáng nhất.
      const band = (half, minDot) => {
        const left = [], right = [];
        R.forEach((r) => {
          let best = -9, bi = 0;
          r.P.forEach((p, i) => {
            const nl = Math.hypot(p.nx, p.nz) || 1;
            const dsc = (p.nx * cam.L[0] + p.nz * cam.L[2]) / nl;
            if (p.nz > 0 && dsc > best) { best = dsc; bi = i; }
          });
          const w = Math.round((half / 360) * N);
          const pick = (o) => r.P[(bi + o + N) % N];
          const a = pick(-w), b = pick(w);
          const vis = [];
          for (let o = -w; o <= w; o++) { const p = pick(o); if (p.nz > 0.02) vis.push(p); }
          if (vis.length < 2 || best < minDot) { left.push(null); right.push(null); return; }
          left.push(vis[0]); right.push(vis[vis.length - 1]);
          void a; void b;
        });
        const L = left.filter(Boolean), Rr = right.filter(Boolean);
        return L.length > 1 ? L.concat(Rr.reverse()) : null;
      };
      this.push(k + 'd', 'polygon', z, { points: pts(outline), fill: m.shade });
      const mid = band(150, -0.2), lit = band(70, 0.1);
      if (mid) this.push(k + 'm', 'polygon', z + 0.01, { points: pts(mid), fill: m.base });
      if (lit) this.push(k + 'l', 'polygon', z + 0.02, { points: pts(lit), fill: m.light, opacity: 0.8 });
      if (opt.edge) {
        const bt = arc(R[n - 1], bot.l, bot.r, true);
        this.push(k + 'e', 'polyline', z + 0.03, { points: pts([bot.l].concat(bt, [bot.r])), fill: 'none', stroke: opt.edge, 'stroke-width': f1(2.2 * bot.l.k), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      }
      return { z, rings: R };
    }
    // Dải vải: một dãy điểm 3D, rộng dần/thu nhỏ; vẽ như đa giác mềm với đường sáng giữa.
    ribbon(k, p3, w0, w1, m, zb = 0, opt = {}) {
      const P = p3.map((q) => this.cam.p(q));
      const L = [], Rr = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const w = lerp(w0, w1, i / (P.length - 1)) * p.k * (opt.flare ? 1 + Math.sin((i / (P.length - 1)) * Math.PI) * opt.flare : 1);
        L.push({ x: p.x - (dy / d) * w, y: p.y + (dx / d) * w });
        Rr.push({ x: p.x + (dy / d) * w, y: p.y - (dx / d) * w });
      });
      const z = P.reduce((s, p) => s + p.z, 0) / P.length + zb;
      this.push(k, 'polygon', z, { points: pts(L.concat(Rr.reverse())), fill: m.base, stroke: m.shade, 'stroke-width': 0.5, 'stroke-linejoin': 'round' });
      if (!opt.plain) this.push(k + 'l', 'polyline', z + 0.01, { points: pts(P), fill: 'none', stroke: m.light, 'stroke-width': f1(Math.max(0.8, w0 * 0.45 * P[0].k)), 'stroke-linecap': 'round', opacity: 0.55 });
    }
    // Đa giác phẳng trong không gian (lưỡi kiếm, quạt): tô theo góc của mặt phẳng với nguồn sáng.
    flat(k, p3, m, zb = 0, opt = {}) {
      const P = p3.map((q) => this.cam.p(q));
      const z = P.reduce((s, p) => s + p.z, 0) / P.length + zb;
      this.push(k, 'polygon', z, Object.assign({ points: pts(P), fill: m.base, stroke: opt.stroke || m.deep, 'stroke-width': opt.sw || 0.8, 'stroke-linejoin': 'round' }, opt.attrs || {}));
    }
    // Hình 2D đặt vào mặt phẳng 3D (gốc O, hai trục U lên phải, V lên): vòng âm dương, hoa văn trên ngực, mặt đá, pháp luân…
    // Tọa độ hình vẽ theo quy ước toán học (y hướng lên). facing: mờ dần khi quay lưng lại người xem.
    planar(k, O, U, Vv, inner, opt = {}) {
      const cam = this.cam, o = cam.p(O), u = cam.p(V.add(O, U)), v = cam.p(V.add(O, Vv));
      const nrm = cam.n(V.cross(U, Vv));
      const face = opt.twoSided ? 1 : clamp(nrm[2] * 4 + 0.15, 0, 1);
      if (face <= 0.01) return;
      const a = { transform: 'matrix(' + [u.x - o.x, u.y - o.y, v.x - o.x, v.y - o.y, o.x, o.y].map((x) => f1(x * 100) / 100).join(' ') + ')' };
      if (opt.opacity != null || face < 1) a.opacity = f1((opt.opacity != null ? opt.opacity : 1) * face * 100) / 100;
      this.push(k, 'g', o.z + (opt.zb || 0), a, inner);
    }
    // Gắn lớp tên gọi cho mọi khối dựng trong fn (kiếm sau lưng, dải lụa, quạt…): để CSS, kiểm thử và trình đọc màn hình tìm được bộ phận theo tên.
    group(cls, fn) {
      const n = this.ops.length;
      fn();
      for (let i = n; i < this.ops.length; i++) this.ops[i].a.class = this.ops[i].a.class ? this.ops[i].a.class + ' ' + cls : cls;
    }
    // Bọc khối vừa dựng vào một nhóm có lớp outer; chính khối ấy thành con mang lớp inner (cần quan hệ cha–con, ví dụ lưỡi kiếm trong cú chém).
    nestLast(outer, inner) {
      const o = this.ops[this.ops.length - 1];
      if (!o || o.inner != null) return;
      const attrs = Object.keys(o.a).map((n) => ' ' + n + '="' + String(o.a[n]) + '"').join('');
      o.inner = '<' + o.tag + ' class="' + inner + '"' + attrs + '/>';
      o.tag = 'g';
      o.a = { class: outer };
    }
    // Đường vết (kiếm khí, khí công theo bàn tay): dãy điểm 3D cũ→mới, thu nhỏ và mờ dần về phía cũ.
    trail(k, p3, color, w, zb = 0) {
      if (p3.length < 3) return;
      const P = p3.map((q) => this.cam.p(q));
      const z = P.reduce((s, p) => s + p.z, 0) / P.length + zb;
      const n = P.length, L = [], Rr = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ww = w * Math.pow(i / (n - 1), 1.3) * p.k;
        L.push({ x: p.x - (dy / d) * ww, y: p.y + (dx / d) * ww });
        Rr.push({ x: p.x + (dy / d) * ww, y: p.y - (dx / d) * ww });
      });
      this.push(k, 'polygon', z, { points: pts(L.concat(Rr.reverse())), fill: color, opacity: 0.55 });
    }
    // Hoa văn dán lên mặt cầu (tóc, mặt, mũ…): vòng [vĩ độ, kinh độ]° được nội suy rồi chiếu; điểm khuất đẩy ra đường viền.
    // frame: ma trận xoay của khối; r: [rx, ry, rz]; grow: phồng ra nhẹ để nằm trên da.
    decal(k, c, frame, r, loop, fill, opt = {}) {
      const cam = this.cam, grow = opt.grow || 1.02, C = cam.p(c), Rs = (r[0] + r[1]) / 2 * C.k * grow;
      const dense = [];
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i], b = loop[(i + 1) % loop.length];
        const dl = ((b[1] - a[1] + 540) % 360) - 180; // kinh độ đi theo đường ngắn nhất (vòng khép kín qua mặt sau)
        for (let s = 0; s < (opt.sub || 5); s++) dense.push([lerp(a[0], b[0], s / (opt.sub || 5)), a[1] + (dl * s) / (opt.sub || 5)]);
      }
      let any = false;
      const out = dense.map(([la, lo]) => {
        const cl = Math.cos(la * D), nl = [cl * Math.sin(lo * D), Math.sin(la * D), cl * Math.cos(lo * D)];
        const q = V.add(c, mv(frame, [nl[0] * r[0] * grow, nl[1] * r[1] * grow, nl[2] * r[2] * grow]));
        const pr = cam.p(q), nz = cam.n(mv(frame, nl))[2];
        if (nz > 0) { any = true; return pr; }
        const dx = pr.x - C.x, dy = pr.y - C.y, d = Math.hypot(dx, dy) || 1;
        return { x: C.x + (dx / d) * Rs, y: C.y + (dy / d) * Rs };
      });
      if (!any) return;
      this.push(k, 'polygon', C.z + (opt.zb || 0.5), Object.assign({ points: pts(out), fill }, opt.attrs || {}));
    }
    // Nét vẽ nhỏ dán lên mặt cầu (mắt, mày, miệng): đặt tại [vĩ độ, kinh độ]; thu hẹp theo góc nghiêng, xoay theo hướng "lên".
    mark(k, c, frame, r, lat, lon, inner, opt = {}) {
      const cam = this.cam, cl = Math.cos(lat * D), nl = [cl * Math.sin(lon * D), Math.sin(lat * D), cl * Math.cos(lon * D)];
      const q = V.add(c, mv(frame, [nl[0] * r[0] * 1.01, nl[1] * r[1] * 1.01, nl[2] * r[2] * 1.01]));
      const nz = cam.n(mv(frame, nl))[2];
      if (nz < 0.1) return;
      const pr = cam.p(q), up = cam.p(V.add(q, mv(frame, [0, 4, 0])));
      const rot = Math.atan2(up.x - pr.x, -(up.y - pr.y)) / D, sx = 0.22 + 0.78 * clamp(nz, 0, 1);
      this.push(k, 'g', C0(pr.z, opt.zb == null ? 1 : opt.zb), { transform: 'translate(' + f1(pr.x) + ' ' + f1(pr.y) + ') rotate(' + f1(rot) + ') scale(' + Math.round(sx * pr.k * 100) / 100 + ' ' + Math.round(pr.k * 100) / 100 + ')', opacity: clamp(nz * 3, 0, 1) }, inner);
    }
    // Thành chuỗi.
    toMarkup(gid) {
      return this.sorted().map((o) => opMarkup(o, gid)).join('');
    }
    sorted() {
      return this.ops.slice().sort((a, b) => a.z - b.z);
    }
    defs(gid) {
      let s = '';
      this.mats.forEach((m) => {
        s += '<radialGradient id="' + gid + '-' + m.id + '" cx=".42" cy=".4" r=".68" fx=".34" fy=".3"><stop offset="0" stop-color="' + m.hi + '"/><stop offset=".22" stop-color="' + m.light + '"/><stop offset=".62" stop-color="' + m.base + '"/><stop offset="1" stop-color="' + m.shade + '"/></radialGradient>';
      });
      return s;
    }
  }
  const C0 = (z, b) => z + b;
  const attrStr = (a, gid) => Object.keys(a).map((n) => ' ' + n + '="' + String(a[n]).replace('GID', gid) + '"').join('');
  const opMarkup = (o, gid) => '<' + o.tag + ' data-k="' + o.k + '"' + attrStr(o.a, gid) + (o.inner != null ? '>' + o.inner + '</' + o.tag + '>' : '/>');

  // ---- Dây vải/tóc (Verlet) -----------------------------------------------------------------------------------------------------
  class Chain {
    constructor(n, seg) {
      this.n = n; this.seg = seg; this.p = []; this.q = [];
      this.ready = false;
    }
    reset(a, dir) {
      this.p = []; this.q = [];
      for (let i = 0; i < this.n; i++) { const v = V.add(a, V.mul(dir, i * this.seg)); this.p.push(v); this.q.push(v); }
      this.ready = true;
    }
    // anchor: điểm gốc; rest: các điểm "mong muốn" (dáng tóc), stiff 0..1; g: trọng lực; drag: cản.
    step(anchor, rest, o = {}) {
      if (!this.ready) this.reset(anchor, [0, -1, 0]);
      const g = o.g == null ? 0.3 : o.g, drag = o.drag == null ? 0.92 : o.drag, st = o.stiff || 0;
      this.p[0] = anchor;
      for (let i = 1; i < this.n; i++) {
        const c = this.p[i], pr = this.q[i];
        let nx = c[0] + (c[0] - pr[0]) * drag, ny = c[1] + (c[1] - pr[1]) * drag - g, nz = c[2] + (c[2] - pr[2]) * drag;
        if (rest && st) { nx += (rest[i][0] - nx) * st; ny += (rest[i][1] - ny) * st; nz += (rest[i][2] - nz) * st; }
        this.q[i] = c; this.p[i] = [nx, ny, nz];
      }
      for (let it = 0; it < 3; it++) {
        for (let i = 0; i < this.n - 1; i++) {
          const a = this.p[i], b = this.p[i + 1], d = V.sub(b, a), l = V.len(d) || 0.001, e = (l - this.seg) / l;
          if (i === 0) this.p[i + 1] = V.sub(b, V.mul(d, e));
          else { this.p[i] = V.add(a, V.mul(d, e * 0.5)); this.p[i + 1] = V.sub(b, V.mul(d, e * 0.5)); }
        }
      }
    }
  }

  // ---- IK hai đoạn --------------------------------------------------------------------------------------------------------------
  // Trả điểm khuỷu/đầu gối. pole: hướng mà khuỷu/gối muốn chỉ về. Khoảng với tới bị kẹp nên không bao giờ gãy.
  function solveIK(S, T, l1, l2, pole) {
    let d = V.sub(T, S), dl = V.len(d);
    const maxL = l1 + l2 - 0.02, minL = Math.abs(l1 - l2) + 0.5;
    if (dl > maxL) { d = V.mul(d, maxL / dl); dl = maxL; }
    if (dl < minL) { d = V.mul(V.norm(d), minL); dl = minL; }
    const dn = V.norm(d), a = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    let pv = V.sub(pole, V.mul(dn, V.dot(pole, dn)));
    pv = V.len(pv) < 0.001 ? [0, 0, 1] : V.norm(pv);
    return { E: V.add(V.add(S, V.mul(dn, a)), V.mul(pv, h)), T: V.add(S, d) };
  }

  // ---- Chuỗi khung chính --------------------------------------------------------------------------------------------------------
  // keys: [[giây, {kênh: số | mảng}], …] — kênh thiếu lấy từ def. loop: cộng thêm khi vòng lặp (ví dụ yaw: 360 cho cú xoay trọn vòng).
  // Nội suy Hermite với tiếp tuyến Catmull-Rom theo khoảng thời gian thật, nên chuyển động liền mạch qua từng khung.
  class Clip {
    constructor(dur, keys, def, loop) {
      this.dur = dur; this.def = def; this.loop = loop || {};
      this.keys = keys.map(([t, v]) => ({ t, v: Object.assign({}, def, v) }));
    }
    at(time) {
      const K = this.keys, n = K.length, T = this.dur;
      const t = ((time % T) + T) % T;
      let i = n - 1;
      for (let j = 0; j < n; j++) if (K[j].t > t) { i = j - 1; break; }
      if (i < 0) i = n - 1;
      const get = (j) => {
        const w = Math.floor(j / n), k = ((j % n) + n) % n;
        return { t: K[k].t + w * T, v: K[k].v, w };
      };
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const t1 = p1.t, t2 = p2.t, dt = t2 - t1, u = clamp((t + (i === n - 1 && t < K[0].t ? T : 0) - t1) / dt, 0, 1);
      const out = {};
      const val = (key, p) => {
        const a = p.v[key];
        return Array.isArray(a) ? a : a + (this.loop[key] || 0) * p.w;
      };
      const h = (a, b, m0, m1) => {
        const u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * m0 * dt + (-2 * u3 + 3 * u2) * b + (u3 - u2) * m1 * dt;
      };
      Object.keys(this.def).forEach((key) => {
        const A = val(key, p0), B = val(key, p1), C = val(key, p2), Dd = val(key, p3);
        if (Array.isArray(B)) {
          out[key] = B.map((_, e) => h(B[e], C[e], (C[e] - A[e]) / (p2.t - p0.t), (Dd[e] - B[e]) / (p3.t - p1.t)));
        } else out[key] = h(B, C, (C - A) / (p2.t - p0.t), (Dd - B) / (p3.t - p1.t));
      });
      return out;
    }
  }

  // ---- Vòng lặp, quan sát DOM, con trỏ -----------------------------------------------------------------------------------------
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tracked = [];
  const live = new Set();
  let raf = 0, last = 0, ptr = { x: 0, y: 0 }, gidN = 0;
  const NS = 'http://www.w3.org/2000/svg';
  window.addEventListener('pointermove', (e) => {
    ptr = { x: clamp((e.clientX / (window.innerWidth || 1) - 0.5) * 2, -1, 1), y: clamp((e.clientY / (window.innerHeight || 1) - 0.5) * 2, -1, 1) };
  }, { passive: true });

  // Dựng một khung và đưa vào phần tử SVG (giữ nguyên phần tử cũ nếu cùng khóa để không nhấp nháy).
  function paint(inst) {
    const sc = inst.frame(), host = inst.host;
    const gid = inst.gid;
    if (inst.defsHost && inst.defsKey !== sc.mats.size) {
      inst.defsHost.innerHTML = sc.defs(gid);
      inst.defsKey = sc.mats.size;
    }
    if (!inst.els) {
      // Lần dựng đầu: nhận lại các phần tử đã có sẵn trong chuỗi SVG ban đầu (cùng khóa data-k) thay vì vẽ chồng một bản nữa lên trên.
      inst.els = new Map();
      [].slice.call(host.children).forEach((el) => { const k = el.getAttribute('data-k'); if (k && !inst.els.has(k)) inst.els.set(k, el); else el.remove(); });
    }
    const els = inst.els, seen = new Set(), order = sc.sorted();
    let prev = null;
    order.forEach((o) => {
      let el = els.get(o.k);
      if (!el || el.tagName.toLowerCase() !== o.tag) {
        if (el) el.remove();
        el = document.createElementNS(NS, o.tag);
        el.setAttribute('data-k', o.k);
        els.set(o.k, el);
      }
      seen.add(o.k);
      const cache = el.__a || (el.__a = {});
      Object.keys(o.a).forEach((n) => {
        const v = String(o.a[n]).replace('GID', gid);
        if (cache[n] !== v) { cache[n] = v; el.setAttribute(n, v); }
      });
      if (o.inner != null && el.__inner !== o.inner) { el.__inner = o.inner; el.innerHTML = o.inner; }
      const want = prev ? prev.nextSibling : host.firstChild;
      if (el !== want) host.insertBefore(el, want);
      prev = el;
    });
    els.forEach((el, k) => { if (!seen.has(k)) { el.remove(); els.delete(k); } });
  }
  function mount(svg, make) {
    if (svg.__inst) return svg.__inst;
    const inst = make(svg);
    if (!inst) return null;
    inst.host = svg.querySelector('.gr-world');
    inst.defsHost = svg.querySelector('defs');
    inst.gid = svg.getAttribute('data-gid') || 'zg' + ++gidN;
    svg.__inst = inst;
    inst.svg = svg;
    watchVisible(svg);
    if (inst.host && !reduced()) live.add(inst);
    kick();
    return inst;
  }
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    tracked.forEach(([sel, make]) => {
      if (root.matches && root.matches(sel)) mount(root, make);
      root.querySelectorAll && root.querySelectorAll(sel).forEach((n) => mount(n, make));
    });
  }
  function track(sel, make) {
    tracked.push([sel, make]);
    if (document.body) scan(document.body);
  }
  const observer = new MutationObserver((list) => {
    list.forEach((m) => {
      m.addedNodes.forEach(scan);
      m.removedNodes.forEach((n) => { if (n.nodeType === 1) { const dead = n.matches && n.matches('svg') ? [n] : [].slice.call(n.querySelectorAll ? n.querySelectorAll('svg') : []); dead.forEach((s) => s.__inst && live.delete(s.__inst)); } });
    });
  });
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => { if (e.target.__inst) e.target.__inst.visible = e.isIntersecting; })) : null;
  function kick() {
    if (raf || !live.size || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  function loop(ts) {
    raf = 0;
    if (document.hidden || !live.size) return;
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
    last = ts;
    live.forEach((inst) => {
      if (!inst.svg.isConnected) { live.delete(inst); return; }
      if (inst.visible === false) return;
      inst.advance(dt, ptr);
      // Hình nhỏ (danh sách, thẻ) chỉ cần vẽ nửa số khung; mô phỏng vẫn chạy đủ nhịp.
      if (inst.every > 1 && (inst.tick = (inst.tick || 0) + 1) % inst.every) return;
      paint(inst);
    });
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scan(document.body);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  function watchVisible(svg) {
    if (io && svg) io.observe(svg);
  }

  window.zenRig = { V, M, clamp, lerp, camera, place, mat, mixc, Scene, Chain, Clip, solveIK, track, mount, paint, reduced, watchVisible, live, nextGid: () => 'zg' + ++gidN, tick: (inst, dt) => { inst.advance(dt, ptr); paint(inst); } };
})();
