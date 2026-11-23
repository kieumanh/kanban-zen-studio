'use strict';
// v2.79.0 (Lên Cấp): form chúc mừng lên cấp + hàng đợi thông báo mừng. Không đổi dữ liệu.
//  1. Hàng đợi: nhiều thông báo mừng cùng lúc (form lên cấp, nghi thức Đột phá, chương truyện ký …) hiện LẦN LƯỢT; thông báo kế tiếp chỉ
//     hiện sau khi người dùng đóng thông báo trước (bấm ×, nút, hoặc Esc). Lời chúc hoàn thành (thẻ có ×, tự tắt sau 7–9 giây) và hộp thoại
//     đang mở cũng được chờ, nên không bao giờ có hai thông báo chồng nhau.
//  2. Form lên cấp: huy hiệu của cấp mới, danh xưng, cảnh giới, điểm còn thiếu tới cấp kế tiếp và cảnh giới kế tiếp, kèm pháo hoa.
//     Giảm chuyển động thì không có pháo hoa và các vòng sáng đứng yên.
//  3. fireworks(host): pháo hoa dùng chung (form lên cấp và nghi thức Đột phá).
// Mọi chữ nằm trong DOM do JS tạo bằng textContent / esc, không chèn HTML từ dữ liệu người dùng (tên hiệp khách đi qua esc).
(() => {
  const root = document.documentElement;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (v) => String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const GAP = 250; // nghỉ một nhịp giữa hai thông báo
  const POLL = 400;
  const MAX_TRIES = 60; // ~24 giây chờ hộp thoại khác; quá thì vẫn hiện (không bao giờ kẹt hàng đợi)

  // ---- 1. Hàng đợi ---------------------------------------------------------------------------------------------------------------
  const waiting = [];
  let current = null;
  let timer = 0;
  // Thứ khác đang chiếm màn hình: lời chúc hoàn thành (tự tắt) hoặc hộp thoại đang mở (chi tiết nhiệm vụ, cài đặt …).
  const busy = () => !!document.querySelector('.completion-overlay, dialog[open]');
  function pump(tries = 0) {
    clearTimeout(timer);
    if (current || !waiting.length) return;
    if (tries < MAX_TRIES && busy()) {
      timer = setTimeout(() => pump(tries + 1), POLL);
      return;
    }
    const item = waiting.shift();
    current = item;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (current === item) current = null;
      timer = setTimeout(() => pump(), GAP);
    };
    try {
      item.open(done);
    } catch (e) {
      done();
    }
  }
  // item = { id, open(done) }: open() hiện thông báo và gọi done() khi người dùng đóng nó (một lần).
  function enqueue(item) {
    if (!item || typeof item.open !== 'function') return;
    waiting.push(item);
    pump();
  }
  const pending = () => waiting.length + (current ? 1 : 0);
  const ids = () => (current ? [current.id] : []).concat(waiting.map((w) => w.id));

  // ---- 3. Pháo hoa -----------------------------------------------------------------------------------------------------------------
  // Ba đợt, mỗi đợt vài quả nổ rải trên màn hình; mỗi quả là một vòng hạt bay ra rồi tắt dần (CSS, không dùng canvas nên chạy dưới CSP chặt).
  const PALETTE = {
    zen: ['#8c5bd6', '#ee83b5', '#f2a063', '#c4a3ed', '#ffc99e'],
    giangho: ['#b8344a', '#c9a24a', '#e8c46a', '#d9606f', '#f3d9a0'],
  };
  function fireworks(host, opt = {}) {
    if (!host || reduce()) return 0;
    const colors = PALETTE[root.dataset.style === 'giangho' ? 'giangho' : 'zen'];
    const layer = document.createElement('div');
    layer.className = 'gr-fw';
    layer.setAttribute('aria-hidden', 'true');
    const waves = opt.waves || 3, bursts = opt.bursts || 3, sparks = opt.sparks || 16;
    let n = 0;
    for (let w = 0; w < waves; w++) {
      for (let b = 0; b < bursts; b++) {
        const x = 10 + Math.random() * 80, y = 10 + Math.random() * 50, reach = 70 + Math.random() * 90;
        const delay = w * 900 + b * 140;
        for (let i = 0; i < sparks; i++) {
          const a = (i / sparks) * Math.PI * 2, p = document.createElement('i');
          p.className = 'gr-fw-spark';
          p.style.cssText = 'left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%;--dx:' + (Math.cos(a) * reach).toFixed(0) + 'px;--dy:' + (Math.sin(a) * reach).toFixed(0) + 'px;--delay:' + delay + 'ms;--c:' + colors[(i + b + w) % colors.length];
          layer.append(p);
          n++;
        }
      }
    }
    host.prepend(layer);
    setTimeout(() => layer.remove(), (waves - 1) * 900 + bursts * 140 + 2200);
    return n;
  }

  // ---- 2. Form lên cấp -------------------------------------------------------------------------------------------------------------
  // info = { name, level, from, title, realm, nextTitle, need, pct, next, needRealm, top, held }: số liệu đã được growth.js tính sẵn
  // (need / needRealm đã định dạng). Trả về hộp thoại; done() chạy sau khi đóng.
  function levelUp(info, done) {
    const finish = () => typeof done === 'function' && done();
    if (!info || !info.level) return finish();
    const jumped = info.from && info.level - info.from > 1 ? info.level - info.from : 0;
    const Z = window.zenEmblem;
    const medal = Z && Z.html ? '<div class="gr-lu-emblem" data-level="' + info.level + '">' + Z.html(info.level) + '</div>' : '<div class="gr-lu-emblem is-plain" data-level="' + info.level + '"><b>' + info.level + '</b></div>';
    const facts = [['Cảnh giới', info.realm]];
    if (info.title) facts.push(['Danh xưng', info.title]);
    if (info.top) facts.push(['Chặng đường', 'Đã tới đỉnh, cấp tối cao']);
    else if (info.held) facts.push(['Cấp kế tiếp', 'Đủ điểm, còn thiếu chiến tích ở Thần giới']);
    else {
      facts.push(['Cấp kế tiếp', 'Cấp ' + (info.level + 1) + (info.nextTitle ? ' · ' + info.nextTitle : '') + ' · còn ' + info.need + ' điểm']);
      if (info.next) facts.push(['Cảnh giới kế tiếp', info.next + ' · còn ' + info.needRealm + ' điểm']);
    }
    const bar = info.top || info.held ? '' : '<div class="gr-lu-bar" role="progressbar" aria-label="Tiến tới cấp ' + (info.level + 1) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + info.pct + '"><i style="width:' + info.pct + '%"></i></div><p class="gr-lu-pct">' + info.pct + '% tới cấp ' + (info.level + 1) + '</p>';
    const d = document.createElement('dialog');
    d.className = 'gr-levelup' + (reduce() ? ' is-still' : '');
    d.setAttribute('aria-labelledby', 'gr-lu-title');
    d.setAttribute('aria-describedby', 'gr-lu-text');
    d.dataset.level = String(info.level);
    d.innerHTML =
      '<div class="gr-lu-card"><button type="button" class="icon-btn gr-lu-x" data-lu-close aria-label="Đóng thông báo lên cấp">×</button>' +
      '<div class="gr-lu-stage" aria-hidden="true"><i class="gr-lu-ring"></i><i class="gr-lu-ring is-2"></i><i class="gr-lu-ring is-3"></i>' + medal + '</div>' +
      '<p class="eyebrow">' + (jumped ? 'VƯỢT ' + jumped + ' CẤP' : 'LÊN CẤP') + '</p>' +
      '<h2 id="gr-lu-title">Cấp ' + info.level + (info.title ? ' · ' + esc(info.title) : '') + '</h2>' +
      '<p id="gr-lu-text" class="gr-lu-text">Chúc mừng! ' + esc(info.name) + ' đã ' + (jumped ? 'vượt ' + jumped + ' cấp, từ cấp ' + info.from + ' lên cấp ' + info.level : 'lên cấp ' + info.level) + '.</p>' +
      '<dl class="gr-lu-facts">' + facts.map((f) => '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>').join('') + '</dl>' +
      bar +
      '<button type="button" class="btn primary gr-lu-go" data-lu-close>Tiếp tục tu luyện</button></div>';
    document.body.append(d);
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-lu-close]')) d.close();
    });
    d.addEventListener(
      'close',
      () => {
        d.remove();
        finish();
      },
      { once: true },
    );
    d.showModal();
    fireworks(d);
    d.querySelector('.gr-lu-go').focus();
    return d;
  }

  window.zenCelebrate = { enqueue, pending, ids, fireworks, levelUp, busy };
})();
