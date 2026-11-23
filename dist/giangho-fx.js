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
  // Ấn triện kiểu kiếm hiệp (v2.58.0; v2.78.0 đổi sang ấn tròn): khối son tròn sứt mẻ; viền lõm kép, vòng hạt châu (bốn thoi ở bốn phương), đường gươm
  // và chữ khắc lõm (khoét bằng mặt nạ nên nền thấu qua, sáng hay tối đều đẹp), vết mực mòn. Mọi chi tiết cố định (một con dấu thật chỉ có
  // một khuôn), chỉ vẽ bằng thuộc tính SVG nên chạy dưới CSP chặt. Chữ nằm trong mặt nạ nên textContent vẫn là “Công”“thành” (CSS viết hoa).
  const SEAL_BODY = 'M97.4,50.0L97.0,52.7L96.7,55.5L96.7,58.2L96.5,61.0L95.9,63.7L93.9,66.0L91.7,68.0L90.9,70.6L91.1,73.7L89.5,76.0L87.9,78.2L85.9,80.2L84.1,82.1L82.3,84.2L80.3,86.1L77.9,87.4L76.2,89.9L74.0,91.5L71.2,92.1L68.5,93.0L66.0,93.9L63.5,95.2L60.9,95.8L58.2,96.5L55.5,96.6L52.7,97.0L50.0,97.7L47.2,97.9L44.5,97.2L41.9,96.0L39.1,95.8L36.5,95.0L34.3,93.2L32.2,91.4L28.8,92.2L26.1,91.3L24.2,89.2L21.5,88.2L19.2,86.7L17.7,84.2L15.9,82.1L13.7,80.5L12.0,78.3L10.1,76.3L9.5,73.4L7.5,71.4L6.9,68.6L5.6,66.2L4.6,63.6L4.0,60.9L3.4,58.2L2.6,55.5L2.2,52.8L2.3,50.0L2.3,47.2L2.7,44.5L3.9,41.9L4.4,39.2L4.5,36.4L6.7,34.2L9.1,32.3L8.8,29.3L8.5,26.1L10.1,23.8L11.9,21.7L13.8,19.7L15.6,17.6L17.3,15.3L19.8,14.0L21.9,12.3L23.9,10.2L26.5,9.3L28.9,7.9L31.4,6.9L33.7,5.1L36.6,5.3L39.2,4.4L41.9,3.9L44.6,3.6L47.2,2.7L50.0,3.2L52.7,2.9L55.5,2.5L58.2,3.5L61.0,3.5L63.6,4.7L66.2,5.5L68.6,6.8L70.8,8.7L72.9,10.4L75.4,11.4L78.6,11.5L80.7,13.4L82.8,15.2L84.7,17.3L86.3,19.6L88.2,21.5L89.8,23.9L91.1,26.3L92.6,28.6L93.3,31.3L94.2,33.9L95.0,36.5L95.6,39.2L97.2,41.7L97.7,44.4L97.3,47.2Z';
  const SEAL_CUT =
    // viền ngoài lõm, vòng hạt châu (bốn thoi ở bốn phương), gươm ngang giữa hai hàng chữ (thân thon, chuôi ở trái, mũi ở phải), chữ, mực mòn
    '<circle cx="50" cy="50" r="42.4" fill="none" stroke="#000" stroke-width="1.5"/><circle cx="50" cy="50" r="34.4" fill="none" stroke="#000" stroke-width="0.8"/>' +
    '<g fill="#000"><circle cx="58.5" cy="12.7" r="1.05"/><circle cx="66.6" cy="15.5" r="1.05"/><circle cx="73.9" cy="20.1" r="1.05"/><circle cx="79.9" cy="26.1" r="1.05"/><circle cx="84.5" cy="33.4" r="1.05"/><circle cx="87.3" cy="41.5" r="1.05"/><circle cx="87.3" cy="58.5" r="1.05"/><circle cx="84.5" cy="66.6" r="1.05"/><circle cx="79.9" cy="73.9" r="1.05"/><circle cx="73.9" cy="79.9" r="1.05"/><circle cx="66.6" cy="84.5" r="1.05"/><circle cx="58.5" cy="87.3" r="1.05"/><circle cx="41.5" cy="87.3" r="1.05"/><circle cx="33.4" cy="84.5" r="1.05"/><circle cx="26.1" cy="79.9" r="1.05"/><circle cx="20.1" cy="73.9" r="1.05"/><circle cx="15.5" cy="66.6" r="1.05"/><circle cx="12.7" cy="58.5" r="1.05"/><circle cx="12.7" cy="41.5" r="1.05"/><circle cx="15.5" cy="33.4" r="1.05"/><circle cx="20.1" cy="26.1" r="1.05"/><circle cx="26.1" cy="20.1" r="1.05"/><circle cx="33.4" cy="15.5" r="1.05"/><circle cx="41.5" cy="12.7" r="1.05"/></g>' +
    '<path d="M50.0,9.3L51.5,11.7L50.0,14.1L48.5,11.7ZM90.7,50.0L88.3,51.5L85.9,50.0L88.3,48.5ZM50.0,90.7L48.5,88.3L50.0,85.9L51.5,88.3ZM9.3,50.0L11.7,48.5L14.1,50.0L11.7,51.5Z" fill="#000"/>' +
    '<path d="M25,50.6 L28,49.9 L78,52 L28,54.1 L25,53.4 Z" fill="#000"/>' +
    '<path d="M25.6,47.6 L25.6,56.4" stroke="#000" stroke-width="1.5" stroke-linecap="round"/><circle cx="21.8" cy="52" r="1.7" fill="#000"/>' +
    '<text class="gh-seal-txt" x="50" y="45" text-anchor="middle" font-size="24" textLength="52" lengthAdjust="spacingAndGlyphs" fill="#000">Công</text>' +
    '<text class="gh-seal-txt" x="50" y="73" text-anchor="middle" font-size="17.5" textLength="47" lengthAdjust="spacingAndGlyphs" fill="#000">thành</text>' +
    '<g fill="#000"><circle cx="84.3" cy="78.9" r="0.9"/><circle cx="26.2" cy="82.7" r="0.6"/><circle cx="17.0" cy="18.7" r="1.0"/><circle cx="76.4" cy="28.5" r="0.7"/><circle cx="53.8" cy="6.2" r="0.6"/><circle cx="61.8" cy="80.3" r="0.6"/><circle cx="6.3" cy="60.8" r="0.7"/><circle cx="14.5" cy="44.3" r="0.5"/></g>' +
    '<path d="M64,22 L71,26.5 M31.5,79 L37,76.2" stroke="#000" stroke-width="0.7" stroke-linecap="round" fill="none"/>';
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
      box.innerHTML = '<span class="gh-rank-seal"><span class="gh-rank-emblem" aria-hidden="true"></span><b></b></span><span class="gh-rank-text"><strong></strong><small><span class="gh-rank-title"></span><i class="gh-rank-sep"> · </i><span class="gh-rank-next"></span></small></span>';
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
    box.querySelector('.gh-rank-title').textContent = r.title || 'Chưa nhập cảnh giới'; // v2.77.0: mỗi thứ một dòng, dấu "·" chỉ còn trong chữ đọc
    box.querySelector('.gh-rank-next').textContent = next;
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
    window.zenCelebrate?.fireworks?.(d); // v2.79.0: pháo hoa dùng chung với form lên cấp (giảm chuyển động thì không có)
    d.querySelector('button').focus();
  }

  window.zenFx = { breakthrough, rank, incense, stampCard, sealOverlay, sealSvg };
})();
