'use strict';
// v1.97.0 (Ấn Son): những khoảnh khắc giang hồ. Không đổi dữ liệu; mọi chuyển động tắt khi hệ thống bật giảm chuyển động.
//  1. Ấn son công thành (Giang hồ): hoàn thành nhiệm vụ thì lời chúc mang con dấu son "Công thành" thay pháo hoa tím hồng, và khi
//     về lại bảng, con dấu đóng lên thẻ vừa xong (chờ mọi hộp thoại đóng, ~3 giây rồi mờ dần).
//  2. Nén hương bế quan (Giang hồ): trong đồng hồ bế quan, một nén hương cháy dần theo thời gian còn lại; khói chỉ bay khi đang đếm.
//  3. Danh hiệu trên thanh bên (Giang hồ, đã có Tu vi): cảnh giới · danh xưng cấp (v2.5.0), cấp và vòng tiến cảnh tới cấp kế; bấm để mở Tu vi.
//  4. Nghi thức Đột phá (Tu vi, cả hai phong cách): lưu công lực mà bước sang cảnh giới mới thì hiện một bảng nghi thức; chương truyện
//     ký (nếu có) mở sau khi khép bảng. Tắt cùng "Thông báo điểm nghiệp" trong Cài đặt → Thông báo.
// Tắt 1 và 2 ở Cài đặt → Giao diện → "Hiệu ứng ấn son, nén hương" (zen-gh-fx, theme.js).
(() => {
  const root = document.documentElement;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gh = () => root.dataset.style === 'giangho';
  const fxOn = () => gh() && root.dataset.ghFx !== 'off';
  const SEAL = '<span>Công<br>thành</span>';

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
    s.innerHTML = SEAL;
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
    seal.innerHTML = SEAL;
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
    const r = G.realmOf(G.total(G.earnedScores()));
    const title = r.title ? ' · ' + r.title : '';
    const next = r.top ? 'Đã tới đỉnh: cấp ' + r.level : r.pct + '% tới cấp ' + (r.level + 1);
    if (!box) {
      box = document.createElement('button');
      box.type = 'button';
      box.className = 'gh-rank';
      box.innerHTML = '<span class="gh-rank-seal"><b></b></span><span class="gh-rank-text"><strong></strong><small></small></span>';
      box.addEventListener('click', () => {
        document.querySelector('.sidebar')?.classList.remove('open');
        if (typeof go === 'function') go('growth');
      });
      slot.prepend(box);
    }
    box.style.setProperty('--gh-rank-pct', r.pct);
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
    const d = document.createElement('dialog');
    d.className = 'gr-breakthrough' + (reduce() ? ' is-still' : '');
    d.setAttribute('aria-labelledby', 'gr-bt-title');
    d.setAttribute('aria-describedby', 'gr-bt-text');
    d.innerHTML =
      '<form method="dialog"><div class="gr-bt-stage" aria-hidden="true"><i class="gr-bt-ring"></i><i class="gr-bt-ring is-2"></i><i class="gr-bt-ring is-3"></i><div class="gr-bt-hero">' +
      art +
      '</div></div><p class="eyebrow">' +
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

  window.zenFx = { breakthrough, rank, incense, stampCard, sealOverlay };
})();
