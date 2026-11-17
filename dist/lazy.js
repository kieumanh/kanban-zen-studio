'use strict';
// v2.37.0 (Tải Theo Nhu Cầu): lần mở đầu chỉ tải phần cần để làm việc; ba khối lớn tải khi cần.
//   growth   — Điểm tích lũy (growth*.js, giangho-fx.js, giangho-ach.js, growth.css): ~260 KB nén.
//   giangho  — chữ và lịch âm của phong cách Giang hồ (giangho-lex.js, giangho-lunar.js; giangho.css do lazy-css.js lo): ~80 KB nén.
//   releases — nhật ký phát hành (releases.js): ~40 KB nén.
// Index.html giữ nguyên danh sách tệp nhưng đánh dấu <script type="zen/lazy" data-lazy="nhóm" src=…> (trình duyệt không tải thẻ có type lạ)
// và <link rel="zen-lazy" data-lazy="nhóm" href=…>. Bộ nạp chèn thẻ thật khi cần: script tải song song, chạy đúng thứ tự (async=false);
// CSS chèn ngay TRƯỚC thẻ đánh dấu nên thứ tự áp CSS giữ nguyên.
//
// Khi nào nạp:
//   growth   — mở trang Điểm tích lũy; hoàn thành việc / đủ chuỗi 7 ngày của người ĐÃ bắt đầu Điểm tích lũy (data.growth có dữ liệu: nạp
//              trước khi chúc mừng để không mất lần hỏi điểm); người đã bắt đầu thì nạp lúc rảnh sau khi mở; bật Giang hồ.
//   giangho  — phong cách Giang hồ đang bật (lúc mở hoặc lúc đổi), hoặc mở Bảng chú giải. Nạp kèm growth (giangho-fx.js nằm trong growth).
//   releases — mở trang Phiên bản, hoặc chuông có phiên bản mới chưa đọc.
// Người chưa bắt đầu Điểm tích lũy và dùng phong cách Thiền không tải gì trong số này, trừ khi tự mở trang Điểm tích lũy / Phiên bản.
//
// Giữ nguyên hành vi cũ: bộ kiểm dữ liệu data.growth (valid) đặt ngay từ đầu ở đây; các hàm hoàn thành việc / chuỗi thói quen có bản
// thay chờ nạp rồi phát lại; nút “Điểm tích lũy” trên thanh bên có sẵn từ đầu.
(() => {
  const GROUPS = {};
  const DEPS = { giangho: ['growth'] };
  const READY = {
    growth: () => !!window.zenGrowth && !window.zenGrowth.stub,
    giangho: () => !!window.zenGiangHo,
    releases: () => typeof RELEASES !== 'undefined' && RELEASES.length > 0,
  };
  const group = (name) => GROUPS[name] || (GROUPS[name] = { scripts: [], css: [], loaded: new Set(), promise: null, done: false });
  // Thẻ đánh dấu còn nguyên type="zen/lazy" / rel="zen-lazy" thì nạp khi cần. Thẻ đã được đổi về script/stylesheet thường (bộ dựng
  // kiểm thử giữ đúng thứ tự cũ) thì trình duyệt đã tải; nhóm vẫn được ghi nhận để READY cho biết đã sẵn sàng.
  for (const el of document.querySelectorAll('script[data-lazy]')) {
    const g = group(el.dataset.lazy);
    if (el.getAttribute('type') === 'zen/lazy') g.scripts.push(el.getAttribute('src'));
  }
  for (const el of document.querySelectorAll('link[data-lazy]')) {
    const g = group(el.dataset.lazy);
    if (el.getAttribute('rel') === 'zen-lazy') g.css.push(el);
  }

  const loadCss = (ph) =>
    new Promise((resolve, reject) => {
      if (ph.dataset.zenLoaded) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = ph.getAttribute('href');
      link.onload = () => resolve();
      link.onerror = () => {
        link.remove();
        delete ph.dataset.zenLoaded;
        reject(new Error('Không tải được ' + link.href));
      };
      ph.dataset.zenLoaded = '1';
      ph.before(link);
    });
  // Tải song song, chạy theo thứ tự chèn (async=false). Tệp đã chạy không chèn lại. Lấy HẾT các tệp về bộ nhớ đệm trước rồi mới chèn: mất mạng
  // giữa chừng thì chưa tệp nào chạy (không bao giờ chạy dở một nhóm), thử lại sau là chạy trọn nhóm.
  const loadScripts = (g) => {
    const todo = g.scripts.filter((src) => !g.loaded.has(src));
    const fetched = todo.map((src) =>
      fetch(src).then((r) => {
        if (!r.ok) throw new Error('Không tải được ' + src);
      }),
    );
    return Promise.all(fetched).then(() =>
      Promise.all(
        todo.map(
          (src) =>
            new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = src;
              s.async = false;
              s.onload = () => {
                g.loaded.add(src);
                resolve();
              };
              s.onerror = () => {
                s.remove();
                reject(new Error('Không tải được ' + src));
              };
              document.head.append(s);
            }),
        ),
      ),
    );
  };

  const ready = (name) => {
    const g = GROUPS[name];
    return !!g && (g.done || (!g.promise && !!READY[name]?.()));
  };
  function load(name) {
    const g = GROUPS[name];
    if (!g) return Promise.reject(new Error('Không có nhóm ' + name));
    if (g.done) return Promise.resolve();
    if (g.promise) return g.promise;
    if (READY[name]?.()) {
      g.done = true;
      return Promise.resolve();
    }
    g.promise = Promise.all((DEPS[name] || []).map(load))
      .then(() => Promise.all([...g.css.map(loadCss), loadScripts(g)]))
      .then(() => {
        g.done = true;
        document.dispatchEvent(new CustomEvent('zen-lazy', { detail: { group: name } }));
      })
      .catch((e) => {
        g.promise = null;
        throw e;
      });
    return g.promise;
  }
  // Vẽ lại sau khi nạp, nhưng không chen ngang người đang gõ hoặc đang mở hộp thoại.
  function safeRender(tries = 0) {
    const a = document.activeElement;
    const busy = document.querySelector('dialog[open]') || (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable));
    if (busy) return tries < 8 ? void setTimeout(() => safeRender(tries + 1), 1500) : undefined;
    render();
  }
  window.zenLazy = { load, ready, groups: () => Object.keys(GROUPS) };

  // ---- Bộ kiểm dữ liệu Điểm tích lũy (đặt sẵn từ đầu; growth.js dùng lại đúng hàm này) ---------------------------------------
  const LOG_MAX = 3000;
  const SPEND_MAX = 500;
  const isDate = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  function validGrowth(g) {
    if (g === undefined) return true;
    if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
    if (!Object.keys(g).every((k) => ['v', 'hero', 'name', 'since', 'log', 'notify', 'tips', 'spend'].includes(k))) return false;
    if (g.v !== 1 || !['nam', 'nu'].includes(g.hero) || !isDate(g.since)) return false;
    if (g.name !== undefined && (typeof g.name !== 'string' || g.name.length > 30)) return false;
    if (g.notify !== undefined && typeof g.notify !== 'boolean') return false;
    if (g.tips !== undefined && typeof g.tips !== 'boolean') return false;
    if (!Array.isArray(g.log) || g.log.length > LOG_MAX) return false;
    const points = (p) => Array.isArray(p) && p.length === 8 && p.every((x) => Number.isInteger(x) && x >= 0 && x <= 1000000) && p.some((x) => x > 0);
    const seen = new Set();
    const logOk = g.log.every(
      (e) =>
        !!e && typeof e === 'object' && !Array.isArray(e) && Object.keys(e).every((k) => ['id', 'd', 's', 'k', 'n', 'p'].includes(k)) && typeof e.id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
        !seen.has(e.id) && !!seen.add(e.id) && isDate(e.d) && ['task', 'habit', 'archive'].includes(e.s) &&
        (e.k === undefined || (typeof e.k === 'string' && e.k.length <= 120)) && (e.n === undefined || (typeof e.n === 'string' && e.n.length <= 120)) && points(e.p),
    );
    if (!logOk) return false;
    if (g.spend === undefined) return true;
    if (!Array.isArray(g.spend) || g.spend.length > SPEND_MAX) return false;
    const spent = new Set();
    return g.spend.every(
      (e) =>
        !!e && typeof e === 'object' && !Array.isArray(e) && Object.keys(e).every((k) => ['id', 'd', 'n', 'note', 'p', 'x'].includes(k)) && typeof e.id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
        !spent.has(e.id) && !!spent.add(e.id) && isDate(e.d) && typeof e.n === 'string' && e.n.length >= 1 && e.n.length <= 120 &&
        (e.note === undefined || (typeof e.note === 'string' && e.note.length <= 300)) && (e.x === undefined || e.x === true) && points(e.p),
    );
  }
  validGrowth.limits = { LOG_MAX, SPEND_MAX };
  window.zenGrowthValid = validGrowth;
  const validBeforeGrowth = valid;
  valid = function (d) {
    return validBeforeGrowth(d) && validGrowth(d.growth);
  };

  // Biểu tượng của nút trên thanh bên (growth.js cũng đặt đúng đường nét này).
  Object.assign(iconPaths, { growth: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z M12 8l3 4-3 4-3-4z' });
  // ---- Điểm tích lũy: nút trên thanh bên, trang, hoàn thành việc, chuỗi thói quen -----------------------------------------------
  const growthWanted = () => typeof data !== 'undefined' && !!data && !!data.growth;
  const needGrowth = () => growthWanted() && !ready('growth');
  // Bản thay tối thiểu cho tới khi growth.js nạp xong và ghi đè window.zenGrowth (habits.js, growth-notify.js, giangho-ach.js đọc đối tượng này).
  window.zenGrowth = window.zenGrowth || {
    stub: true,
    started: () => false,
    growth: () => null,
    habitStreak(h, n) {
      if (growthWanted()) load('growth').then(() => window.zenGrowth.habitStreak?.(h, n), () => {});
    },
  };
  function addNav() {
    const anchor = document.querySelector('.sidebar [data-view="budget"]');
    let b = document.querySelector('.sidebar [data-view="growth"]');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav';
      b.dataset.view = 'growth';
      b.innerHTML = '<span>' + svgIcon('growth') + '</span>Điểm tích lũy';
    }
    if (anchor && anchor.previousElementSibling !== b) anchor.before(b);
    b.classList.toggle('active', view === 'growth');
  }
  function paintGrowthLoading(failed) {
    $('#crumb').textContent = 'Điểm tích lũy';
    $('#main').innerHTML = failed
      ? '<div class="panel" role="alert" style="margin:24px 0"><p>Chưa tải được trang Điểm tích lũy. Kiểm tra kết nối rồi thử lại.</p><button type="button" class="btn primary" data-lazy-retry>Thử lại</button></div>'
      : '<div class="panel" role="status" aria-live="polite" style="margin:24px 0"><p>Đang mở Điểm tích lũy…</p></div>';
  }
  let idleQueued = false;
  function scheduleIdle() {
    if (idleQueued || !needGrowth()) return;
    idleQueued = true;
    const run = () => (window.requestIdleCallback ? requestIdleCallback(() => load('growth').then(() => safeRender(), () => {}), { timeout: 5000 }) : setTimeout(() => load('growth').then(() => safeRender(), () => {}), 0));
    if (document.readyState === 'complete') setTimeout(run, 1500);
    else window.addEventListener('load', () => setTimeout(run, 1500), { once: true });
  }
  const baseRender = render;
  let sawRender = false;
  render = function () {
    sawRender = true;
    baseRender.apply(this, arguments);
    addNav();
    if (view === 'growth' && !ready('growth')) {
      paintGrowthLoading(false);
      load('growth').then(() => view === 'growth' && render(), () => view === 'growth' && paintGrowthLoading(true));
      return;
    }
    scheduleIdle();
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('[data-lazy-retry]')) return;
    paintGrowthLoading(false);
    load('growth').then(() => view === 'growth' && render(), () => view === 'growth' && paintGrowthLoading(true));
  });
  // Hoàn thành việc: completionKindFor() luôn được gọi ngay trước celebrateCompletion(). Người đã bắt đầu Điểm tích lũy mà growth chưa nạp
  // thì chờ nạp, ghi lại việc vừa xong cho growth.js, rồi mới chúc mừng (growth.js sẽ hỏi điểm như thường).
  let lastKind = null;
  const baseKind = completionKindFor;
  completionKindFor = function (p, t) {
    lastKind = { p, t, at: Date.now() };
    return baseKind.apply(this, arguments);
  };
  const baseCelebrate = celebrateCompletion;
  celebrateCompletion = function (kind = 'check') {
    if (kind === 'check' || !needGrowth()) return baseCelebrate.apply(this, arguments);
    const args = arguments, ctx = lastKind;
    lastKind = null;
    load('growth').then(
      () => {
        if (ctx && Date.now() - ctx.at < 15000) completionKindFor(ctx.p, ctx.t);
        celebrateCompletion.apply(window, args);
      },
      () => baseCelebrate.apply(window, args),
    );
  };

  // ---- Giang hồ ------------------------------------------------------------------------------------------------------------------
  const ghOn = () => document.documentElement.dataset.style === 'giangho';
  const syncStyle = () => {
    if (ghOn()) load('giangho').then(() => safeRender(), () => {});
  };
  document.addEventListener('zen-theme', syncStyle);
  if (ghOn()) {
    // Tải trước (chưa chạy) để lúc chèn thẻ script đã có sẵn trong bộ nhớ đệm trình duyệt.
    for (const src of [...GROUPS.growth.scripts, ...GROUPS.giangho.scripts]) {
      const l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'script';
      l.href = src;
      document.head.append(l);
    }
  }
  // Các tệp khác của trang chạy xong (DOMContentLoaded) rồi mới chèn nhóm, để bộ bọc render/hàm của chúng đã có sẵn khi nhóm nạp.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncStyle, { once: true });
  else syncStyle();
  // Khởi động nguội (tệp tải chậm): tài khoản có thể đã vẽ xong lần đầu TRƯỚC khi tệp này chạy, nên bộ bọc render chưa thấy lần vẽ ấy
  // (chưa có nút Điểm tích lũy, chưa lên lịch nạp lúc rảnh). Chưa có lần vẽ nào qua bộ bọc thì vẽ lại một lần; đã có thì thôi (không vẽ đè lên thao tác của người dùng).
  if (typeof currentUser !== 'undefined' && currentUser && !document.body.classList.contains('signed-out')) setTimeout(() => sawRender || safeRender(), 0);
})();
