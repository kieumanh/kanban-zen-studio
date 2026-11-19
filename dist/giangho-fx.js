'use strict';
// v1.97.0 (Ấn Son): những khoảnh khắc giang hồ. Không đổi dữ liệu; mọi chuyển động tắt khi hệ thống bật giảm chuyển động.
//  1. Ấn son công thành (Giang hồ): hoàn thành nhiệm vụ thì lời chúc mang con dấu son "Công thành" thay pháo hoa tím hồng, và khi
//     về lại bảng, con dấu đóng lên thẻ vừa xong (chờ mọi hộp thoại đóng, ~3 giây rồi mờ dần).
//  2. Nén hương bế quan (Giang hồ): trong đồng hồ bế quan, một nén hương cháy dần theo thời gian còn lại; khói chỉ bay khi đang đếm.
//  3. Danh hiệu trên thanh bên (Giang hồ, đã có Tu vi): cảnh giới · danh xưng cấp (v2.5.0), cấp và vòng tiến cảnh tới cấp kế; bấm để mở Tu vi.
//  4. Nghi thức Đột phá (Tu vi, cả hai phong cách): lưu công lực mà bước sang cảnh giới mới thì hiện một bảng nghi thức; chương truyện
//     ký (nếu có) mở sau khi khép bảng. Tắt cùng "Thông báo điểm nghiệp" trong Cài đặt → Thông báo.
// v2.32.0: danh hiệu trên thanh bên và nghi thức Đột phá mang huy hiệu của cấp hiện tại (dist/growth-emblem.js).
// Tắt 1 và 2 ở Cài đặt → Giao diện → "Hiệu ứng ấn son, nén hương" (zen-gh-fx, theme.js).
(() => {
  const root = document.documentElement;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gh = () => root.dataset.style === 'giangho';
  const fxOn = () => gh() && root.dataset.ghFx !== 'off';
  // Ấn triện kiểu kiếm hiệp (v2.58.0): khối son sứt mẻ, chữ và khung khắc lõm (khoét bằng mặt nạ nên nền thấu qua, sáng hay tối đều đẹp),
  // vết mực mòn, góc vân. Mọi chi tiết cố định (một con dấu thật chỉ có một khuôn), chỉ vẽ bằng thuộc tính SVG nên chạy dưới CSP chặt.
  // Chữ nằm trong mặt nạ nên textContent vẫn là “Công”“thành” (CSS viết hoa).
  const SEAL_BODY = 'M6.2,5.5L11.2,5.4L14.8,3.0L21.3,3.5L26.3,2.8L31.9,3.2L38.1,2.3L43.4,2.7L49.9,3.2L56.1,3.0L61.2,3.1L68.0,2.7L73.1,2.7L79.5,2.3L84.6,2.3L88.4,5.3L94.5,5.5L94.8,11.6L96.5,14.9L96.8,20.3L96.6,25.9L97.4,32.5L96.6,37.9L96.4,44.1L96.8,50.4L97.1,55.5L96.7,61.6L97.0,67.7L97.2,73.7L97.6,79.8L96.4,85.8L94.7,88.4L93.8,93.2L89.0,94.5L84.7,97.5L79.6,97.3L73.1,96.3L67.6,97.1L61.2,96.5L56.4,96.8L50.3,96.7L44.0,97.6L37.8,96.4L32.9,97.2L25.8,96.8L20.4,96.6L14.2,96.4L11.3,95.0L6.4,93.5L4.6,88.6L2.8,85.0L3.1,79.3L2.9,73.1L3.2,67.2L3.4,62.4L3.7,55.2L3.6,50.0L2.9,43.6L2.4,38.1L3.5,32.3L3.1,26.2L2.8,20.5L3.2,15.3L4.7,11.3Z';
  const SEAL_CUT =
    // khung trong, hai mảnh trang trí (kim cương) ở giữa cạnh trên và dưới, góc khoét tròn
    '<rect x="9" y="9" width="82" height="82" rx="2" fill="none" stroke="#000" stroke-width="1.7"/>' +
    '<path d="M50,5.6 L54.2,9 L50,12.4 L45.8,9 Z M50,87.6 L54.2,91 L50,94.4 L45.8,91 Z" fill="#000"/>' +
    '<g fill="#000"><circle cx="9" cy="9" r="3.4"/><circle cx="91" cy="9" r="3.4"/><circle cx="9" cy="91" r="3.4"/><circle cx="91" cy="91" r="3.4"/></g>' +
    // đường gươm ngang giữa hai hàng chữ: thân thon, chuôi ở trái, mũi ở phải
    '<path d="M17,50.5 L21,48.8 L83,50.5 L21,52.2 Z" fill="#000"/><path d="M17,47.2 L17,53.8" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' +
    // chữ
    '<text class="gh-seal-txt" x="50" y="43" text-anchor="middle" font-size="26" textLength="64" lengthAdjust="spacingAndGlyphs" fill="#000">Công</text>' +
    '<text class="gh-seal-txt" x="50" y="78" text-anchor="middle" font-size="22" textLength="64" lengthAdjust="spacingAndGlyphs" fill="#000">thành</text>' +
    // mực mòn: chấm li ti, vệt xước, vết sứt ở mép
    '<g fill="#000"><circle cx="91.1" cy="89.1" r="1.0"/><circle cx="43.1" cy="93.0" r="1.6"/><circle cx="36.9" cy="35.0" r="0.8"/><circle cx="72.1" cy="33.3" r="0.6"/><circle cx="66.5" cy="26.6" r="0.5"/><circle cx="39.3" cy="13.8" r="0.5"/><circle cx="73.2" cy="68.7" r="0.8"/><circle cx="65.6" cy="13.7" r="0.5"/><circle cx="77.6" cy="15.1" r="1.5"/><circle cx="91.3" cy="56.1" r="0.8"/><circle cx="25.1" cy="83.5" r="1.5"/><circle cx="77.3" cy="66.2" r="0.5"/><circle cx="28.7" cy="21.3" r="0.6"/><circle cx="30.0" cy="47.9" r="0.7"/><circle cx="12.5" cy="69.8" r="0.5"/><circle cx="65.3" cy="41.5" r="1.5"/><circle cx="54.3" cy="68.8" r="1.0"/><circle cx="36.7" cy="18.3" r="1.6"/><circle cx="49.5" cy="84.4" r="1.1"/><circle cx="46.4" cy="75.4" r="1.3"/><circle cx="76.9" cy="62.5" r="1.1"/><circle cx="43.2" cy="7.9" r="0.5"/><circle cx="71.2" cy="80.8" r="1.0"/><circle cx="93.4" cy="55.4" r="0.8"/><circle cx="76.4" cy="33.0" r="0.5"/><circle cx="28.2" cy="60.8" r="0.5"/><circle cx="25.6" cy="22.3" r="0.7"/><circle cx="53.1" cy="62.1" r="1.2"/><circle cx="70.5" cy="91.2" r="0.5"/><circle cx="49.9" cy="75.5" r="1.3"/><circle cx="8.2" cy="61.8" r="1.2"/><circle cx="75.4" cy="67.9" r="0.6"/><circle cx="57.1" cy="20.6" r="0.7"/><circle cx="18.3" cy="10.9" r="0.5"/><circle cx="86.0" cy="66.3" r="0.7"/><circle cx="79.8" cy="13.4" r="0.8"/><circle cx="15.6" cy="39.1" r="0.8"/><circle cx="23.9" cy="80.5" r="1.0"/><circle cx="6.4" cy="74.4" r="0.6"/><circle cx="85.9" cy="84.9" r="1.2"/><circle cx="88.1" cy="62.1" r="0.7"/><circle cx="41.8" cy="66.9" r="1.1"/><circle cx="66.7" cy="41.7" r="1.5"/><circle cx="16.5" cy="67.6" r="0.7"/><circle cx="24.9" cy="12.8" r="1.4"/><circle cx="46.4" cy="73.9" r="1.0"/><circle cx="4.5" cy="28" r="2.6"/><circle cx="97" cy="60" r="3.1"/><circle cx="51" cy="3" r="2.2"/><circle cx="71" cy="97" r="3.4"/><circle cx="21" cy="96.5" r="2.4"/><circle cx="96.5" cy="13" r="2.1"/><circle cx="3.5" cy="72" r="1.9"/><circle cx="36" cy="3.5" r="1.6"/><circle cx="88" cy="96" r="2.0"/></g><g stroke="#000" fill="none" stroke-linecap="round"><path d="M35.4,63.6l-5.4,5.5" stroke-width="0.6"/><path d="M72.9,81.5l0.2,5.3" stroke-width="0.6"/><path d="M37.9,70.8l2.0,2.5" stroke-width="0.8"/><path d="M17.5,46.5l-4.2,4.1" stroke-width="0.7"/><path d="M24.8,22.7l0.2,4.5" stroke-width="0.6"/><path d="M40.2,34.0l-3.3,4.2" stroke-width="1.0"/><path d="M54.6,37.0l-4.4,1.4" stroke-width="0.8"/></g>';
  let sealSeq = 0;
  function sealSvg() {
    const id = 'gh-sm' + ++sealSeq;
    return (
      '<svg class="gh-seal-svg" viewBox="0 0 100 100" focusable="false" aria-hidden="true"><defs><mask id="' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/>' + SEAL_CUT + '</mask></defs>' +
      '<path class="gh-seal-body" d="' + SEAL_BODY + '" stroke-width="1.4" stroke-linejoin="round" mask="url(#' + id + ')"/></svg>'
    );
  }

  // ---- 1. Ấn son công thành ----------------------------------------------------------------------------------------------------
  // completionKindFor(p, t) luôn được gọi ngay trước celebrateCompletion() (như growth.js) nên dùng nó để biết việc vừa xong.
  let lastTask = null;
  if (typeof completionKindFor === 'function') {
    const baseKind = completionKindFor;
    completionKindFor = function (p, t) {
      lastTask = t ? { id: t.id, at: Date.now() } : null;
      return baseKind.apply(this, arguments);
    };
  }
  if (typeof celebrateCompletion === 'function') {
    const baseCelebrate = celebrateCompletion;
    celebrateCompletion = function (kind = 'check') {
      const ctx = lastTask;
      lastTask = null;
      const out = baseCelebrate.apply(this, arguments);
      if (kind !== 'check' && ctx && Date.now() - ctx.at < 3000 && fxOn()) stampWhenFree(ctx.id);
      return out;
    };
  }
  // Đóng dấu khi người dùng thật sự nhìn thấy bảng: chờ hộp thoại (chi tiết nhiệm vụ, vận công) đóng, tối đa 2 phút.
  function stampWhenFree(id, tries = 0) {
    if (tries > 400) return;
    if (document.querySelector('dialog[open]')) return setTimeout(() => stampWhenFree(id, tries + 1), 300);
    requestAnimationFrame(() => stampCard(id));
  }
  function stampCard(id) {
    if (!fxOn()) return;
    const card = document.querySelector('.task-card[data-task="' + CSS.escape(id) + '"]');
    if (!card || card.querySelector('.gh-stamp')) return;
    const s = document.createElement('span');
    s.className = 'gh-stamp' + (reduce() ? ' is-still' : '');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = sealSvg();
    card.append(s);
    setTimeout(() => s.classList.add('is-fading'), 3000);
    setTimeout(() => s.remove(), 3700);
  }
  // Lời chúc (app.js tạo .completion-overlay trong body hoặc trong hộp thoại đang mở): thêm con dấu, ẩn pháo hoa.
  function sealOverlay(layer) {
    if (!fxOn() || layer.classList.contains('gh-sealed')) return;
    const card = layer.querySelector('.completion-card');
    if (!card) return;
    layer.classList.add('gh-sealed');
    if (reduce()) layer.classList.add('is-still');
    const seal = document.createElement('span');
    seal.className = 'gh-overlay-seal';
    seal.setAttribute('aria-hidden', 'true');
    seal.innerHTML = sealSvg();
    card.prepend(seal);
  }
  const watch = (host) =>
    host &&
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('completion-overlay')) sealOverlay(n);
    }).observe(host, { childList: true });
  watch(document.body);
  watch(document.querySelector('#editor'));

  // ---- 2. Nén hương bế quan --------------------------------------------------------------------------------------------------
  const FULL = 1500; // một phiên 25 phút (studio-zen.js)
  let lastSecs = null;
  function incense() {
    const box = document.querySelector('.studio-pomodoro');
    let stick = box?.querySelector('.gh-incense');
    if (!box || !fxOn()) {
      stick?.remove();
      lastSecs = null;
      return;
    }
    const m = /^(\d+):(\d\d)$/.exec(box.querySelector('output')?.textContent.trim() || '');
    if (!m) return;
    const secs = Number(m[1]) * 60 + Number(m[2]);
    if (!stick) {
      stick = document.createElement('span');
      stick.className = 'gh-incense';
      stick.setAttribute('aria-hidden', 'true');
      stick.innerHTML = '<i class="gh-incense-smoke"></i><i class="gh-incense-stick"><i class="gh-incense-ember"></i></i><i class="gh-incense-pot"></i>';
      box.querySelector('output').after(stick);
    }
    const burnt = Math.max(0, Math.min(1, 1 - secs / FULL));
    stick.style.setProperty('--burn', burnt.toFixed(4));
    const lit = lastSecs != null && secs < lastSecs && secs > 0;
    stick.classList.toggle('is-lit', lit);
    stick.classList.toggle('is-out', secs === 0);
    lastSecs = secs;
  }
  setInterval(incense, 1000);

  // ---- 3. Danh hiệu trên thanh bên -------------------------------------------------------------------------------------------
  function rank() {
    const slot = document.querySelector('.sidebar .side-bottom');
    let box = slot?.querySelector('.gh-rank');
    const G = window.zenGrowth;
    if (!slot || !gh() || !G?.started?.() || typeof G.realmOf !== 'function') return box?.remove();
    const r = G.myRealm ? G.myRealm() : G.realmOf(G.total(G.earnedScores())); // v2.14.0: có tính chiến tích Thần giới
    const title = r.title ? ' · ' + r.title : '';
    const next = r.top ? 'Đã tới đỉnh: cấp ' + r.level : r.pct + '% tới cấp ' + (r.level + 1);
    if (!box) {
      box = document.createElement('button');
      box.type = 'button';
      box.className = 'gh-rank';
      box.innerHTML = '<span class="gh-rank-seal"><span class="gh-rank-emblem" aria-hidden="true"></span><b></b></span><span class="gh-rank-text"><strong></strong><small></small></span>';
      box.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.remove('open');
        if (typeof go === 'function') go('growth');
      });
      slot.prepend(box);
    }
    box.style.setProperty('--gh-rank-pct', r.pct);
    // v2.32.0 (Huy Hiệu Bách Cấp): ấn tròn đổi thành huy hiệu của cấp hiện tại (số cấp thành chấm nhỏ ở góc); thanh tiến cấp nằm dưới thẻ.
    const Z = window.zenEmblem, em = box.querySelector('.gh-rank-emblem'), lv = Z && r.level ? String(r.level) : '';
    box.classList.toggle('has-emblem', !!lv);
    if (em && em.dataset.level !== lv) {
      em.dataset.level = lv;
      em.innerHTML = lv ? Z.html(r.level) : '';
    }
    box.querySelector('b').textContent = r.level;
    box.querySelector('strong').textContent = r.name;
    box.querySelector('small').textContent = (r.title || 'Chưa nhập cảnh giới') + ' · ' + next;
    box.setAttribute('aria-label', 'Tu vi: ' + r.name + title + ', cấp ' + r.level + ', ' + next + '. Mở Tu vi');
  }
  if (typeof render === 'function') {
    const before = render;
    render = function (...args) {
      const out = before.apply(this, args);
      rank();
      return out;
    };
  }
  document.addEventListener('zen-theme', () => (rank(), incense()));

  // ---- 4. Nghi thức Đột phá --------------------------------------------------------------------------------------------------
  function breakthrough(r, done) {
    const finish = () => typeof done === 'function' && done();
    const G = window.zenGrowth;
    if (!r || !G) return finish();
    const name = typeof esc === 'function' ? esc : (s) => String(s);
    const hero = G.growth?.()?.hero || 'nam';
    const art = window.zenHero?.svg ? window.zenHero.svg(hero, 'martial') : '';
    // v2.5.0: cấp 100 là đột phá thành Thần (Thần cảnh), lời nghi thức riêng.
    const god = r.god && r.level === (G.GOD || 100);
    const who = name(G.heroName ? G.heroName() : 'Hiệp khách');
    // v2.32.0: huy hiệu của cấp vừa đạt gắn bên hiệp khách như tấm huân chương.
    const emblem = window.zenEmblem && r.level ? '<div class="gr-bt-emblem" data-level="' + r.level + '">' + window.zenEmblem.html(r.level) + '</div>' : '';
    const d = document.createElement('dialog');
    d.className = 'gr-breakthrough' + (reduce() ? ' is-still' : '');
    d.setAttribute('aria-labelledby', 'gr-bt-title');
    d.setAttribute('aria-describedby', 'gr-bt-text');
    d.innerHTML =
      '<form method="dialog"><div class="gr-bt-stage" aria-hidden="true"><i class="gr-bt-ring"></i><i class="gr-bt-ring is-2"></i><i class="gr-bt-ring is-3"></i><div class="gr-bt-hero">' +
      art +
      '</div>' +
      emblem +
      '</div><p class="eyebrow">' +
      (god ? 'ĐỘT PHÁ THÀNH THẦN' : 'ĐỘT PHÁ CẢNH GIỚI') +
      '</p><h2 id="gr-bt-title">' +
      name(r.name) +
      '</h2><p id="gr-bt-text" class="gr-bt-text">' +
      (god
        ? who + ' đã phá vỡ cánh cửa cuối cùng của nhân gian, thành Thần · cấp ' + r.level + ' · ' + name(r.title) + '.'
        : who + ' đã phá vỡ bình cảnh, bước vào cảnh giới ' + name(r.name) + ' · cấp ' + r.level + (r.title ? ' · ' + name(r.title) : '') + '.') +
      '</p><p class="gr-bt-next">' +
      (god ? 'Trên Thần còn ba thần cấp, đỉnh cuối là Thần Vương.' : r.next ? 'Cảnh giới kế tiếp: ' + name(r.next) + '.' : 'Đây là cảnh giới cao nhất của giang hồ.') +
      '</p><button class="btn primary" value="ok">Tiếp tục tu luyện</button></form>';
    document.body.append(d);
    d.addEventListener(
      'close',
      () => {
        d.remove();
        finish();
      },
      { once: true },
    );
    d.showModal();
    d.querySelector('button').focus();
  }

  window.zenFx = { breakthrough, rank, incense, stampCard, sealOverlay, sealSvg };
})();
