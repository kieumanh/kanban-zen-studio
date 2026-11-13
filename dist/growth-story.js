'use strict';
// v1.92.0 (Truyện Ký): cốt truyện giang hồ của hiệp khách đồng hành trong mục Tu vi (Điểm tích lũy).
// v2.6.0 (Song Nguyệt): thay bằng cốt truyện "Hằng Nguyệt và Huyết Nguyệt" (dist/growth-tale.js). Dấu đã đọc dùng khóa mới
// notice:tale-N, nên người đã đọc truyện cũ vẫn thấy chương mới là "Chưa đọc"; khóa cũ notice:story-N giữ nguyên, không xóa.
// v2.7.0 (Kỳ Ngộ): 22 nhân vật phụ (dist/growth-meet.js), mỗi người 2 lần kỳ ngộ ở các cấp không có chương. Cấp gặp chọn ngẫu nhiên
// nhưng cố định theo tài khoản (băm mã người dùng); mỗi lần vượt cấp tự mở tối đa một kỳ ngộ (sau các chương). Dấu đã đọc:
// notice:meet-<nhân vật>-<lần>. Khung "Giang hồ kỳ ngộ" trong trang Tu vi liệt kê người đã gặp, người chưa gặp và cấp sẽ gặp.
// v2.8.0 (Huyết Nguyệt Lộ): trang phe ác vẽ tranh động của Giáo chủ / Nguyệt Sứ (dist/growth-foes.js) trên cảnh Huyết Nguyệt đài;
// khung "Huyết Nguyệt lộ" trong trang Tu vi: lộ trình gặp gỡ, đối kháng và vượt cấp, cùng thanh tu luyện song hành với Giáo chủ.
// Khai cuộc (cấp 0, đọc trong danh sách chương) và 20 chương ở cấp 5, 10, 15 … 100 (v2.5.0: chương đánh số theo thứ tự). Mỗi khi vượt một mốc 5 cấp (ngay sau khi lưu công lực), bảng hội thoại tự hiện,
// kể một chặng vượt khó của nhân vật. Chương đã mở đọc lại được ở khung "Truyện ký giang hồ" trong trang Tu vi.
// Không đổi dữ liệu: dấu "đã đọc" lưu bằng dấu đã đọc của tài khoản (notification-receipts, khóa notice:story-N, dùng chung mọi thiết bị),
// kèm bản sao trên thiết bị. Chỉ tự mở khi vượt mốc ngay lúc lưu công lực: người đã ở cấp cao khi bản này ra mắt không bị dồn chương,
// các chương đã qua hiện trong danh sách với nhãn "Chưa đọc".
(function () {
  const G = () => window.zenGrowth;
  // v2.6.0 (Song Nguyệt): cốt truyện mới nằm trong dist/growth-tale.js (window.zenTale): nhân vật, Thập Nguyệt Sứ, 27 chương
  // + khai cuộc. Mỗi trang: [người nói, cảnh, lời]; cảnh 'moon' = Huyết Nguyệt đài (không vẽ hiệp khách, trăng nhuốm đỏ).
  const TALE = window.zenTale || { WHO: {}, CHAPTERS: [] };
  const WHO = TALE.WHO;
  const CHAPTERS = TALE.CHAPTERS;
  const byLv = (lv) => CHAPTERS.find((c) => c.lv === lv);
  const FOE_IDS = new Set(['giao', 'than', ...(TALE.FOES || []).map((f) => f.id)]);
  // v2.5.0: chương đánh số theo thứ tự (không còn theo bội 5), để chương có thể đặt ở bất kỳ cấp nào.
  const STORY = CHAPTERS.filter((c) => c.lv > 0);
  const STAGES = STORY.length;
  const indexOf = (c) => STORY.indexOf(c) + 1;
  const number = (c) => (c.lv ? 'Chương ' + indexOf(c) : 'Khai cuộc');

  // ---- Kỳ ngộ (v2.7.0) ------------------------------------------------------------------------------------------------------
  const MEET = window.zenMeet || { CAST: [], ROLES: {} };
  const CAST = MEET.CAST;
  const castOf = (id) => CAST.find((c) => c.id === id);
  const hashOf = (str) => {
    let x = 2166136261;
    for (const ch of str) {
      x ^= ch.codePointAt(0);
      x = Math.imul(x, 16777619);
    }
    return x >>> 0;
  };
  // Lịch gặp của một tài khoản: mỗi kỳ ngộ một cấp trong khoảng [from, to] của nó, không trùng cấp có chương, không trùng nhau.
  // Xếp theo hạn chót (to) tăng dần; mỗi lần chọn một cấp ngẫu nhiên (băm) mà vẫn đủ chỗ cho các kỳ ngộ còn lại.
  const plans = new Map();
  function schedule(uid) {
    uid = String(uid || (typeof currentUser !== 'undefined' && currentUser?.id) || 'guest');
    if (plans.has(uid)) return plans.get(uid);
    const taken = new Set(CHAPTERS.map((c) => c.lv));
    const all = CAST.flatMap((c) => c.meets.map((m, k) => ({ cast: c, k: k + 1, meet: m }))).sort((a, b) => a.meet.to - b.meet.to || a.meet.from - b.meet.from);
    const fits = (rest, used) => {
      const t = new Set(used);
      return rest.every((e) => {
        for (let lv = e.meet.from; lv <= e.meet.to; lv++)
          if (!t.has(lv)) {
            t.add(lv);
            return true;
          }
        return false;
      });
    };
    const list = [];
    all.forEach((e, i) => {
      const free = [];
      for (let lv = e.meet.from; lv <= e.meet.to; lv++) if (!taken.has(lv)) free.push(lv);
      const start = free.length ? hashOf(uid + ':' + e.cast.id + ':' + e.k) % free.length : 0;
      for (let j = 0; j < free.length; j++) {
        const lv = free[(start + j) % free.length];
        taken.add(lv);
        if (fits(all.slice(i + 1), taken)) {
          list.push({ ...e, lv, id: 'm:' + e.cast.id + '-' + e.k });
          return;
        }
        taken.delete(lv);
      }
    });
    list.sort((a, b) => a.lv - b.lv);
    plans.set(uid, list);
    return list;
  }
  const meetOf = (id) => schedule().find((x) => x.id === id);
  const isMeet = (id) => typeof id === 'string' && id.startsWith('m:');
  // Mục đọc chung cho chương và kỳ ngộ.
  function entryOf(id) {
    if (isMeet(id)) {
      const m = meetOf(id);
      if (!m) return null;
      return { id, lv: m.lv, title: m.meet.title, pages: m.meet.pages, lesson: m.meet.lesson, meet: m, eyebrow: 'KỲ NGỘ GIANG HỒ · ' + (MEET.ROLES[m.meet.kind] || '').toUpperCase(), sub: m.cast.name + ' · ' + m.cast.title + ' · cấp ' + m.lv };
    }
    const c = byLv(Number(id));
    if (!c) return null;
    return { ...c, id: c.lv, eyebrow: 'TRUYỆN KÝ GIANG HỒ · ' + number(c).toUpperCase() + (c.lv ? ' / ' + STAGES : ''), sub: c.lv ? 'Mở ở cấp ' + c.lv + ' · ' + realmName(c.lv) : 'Ngày bước vào giang hồ' };
  }
  const speakerOf = (who) => (who === 'hero' ? G().heroName() : WHO[who] || castOf(who)?.name || who);
  const isFoe = (who) => FOE_IDS.has(who) || castOf(who)?.side === 'ac';

  // ---- Dấu đã đọc -----------------------------------------------------------------------------------------------------------
  const KEY = (id) => (isMeet(id) ? 'notice:meet-' + id.slice(2) : 'notice:tale-' + id);
  const localKey = () => 'zen-tale:' + (currentUser?.id || '');
  function local() {
    try {
      const o = JSON.parse(localStorage.getItem(localKey()) || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
    }
  }
  function saveLocal(o) {
    try {
      localStorage.setItem(localKey(), JSON.stringify(o));
    } catch {}
  }
  const receipts = () => (typeof readReceiptKeys !== 'undefined' && readReceiptOwner === currentUser?.id ? readReceiptKeys : new Set());
  const seen = (lv) => receipts().has(KEY(lv)) || (local().seen || []).includes(lv);
  function markSeen(lv) {
    const o = local();
    o.seen = [...new Set([...(o.seen || []), lv])];
    saveLocal(o);
    if (typeof saveReadReceipts === 'function' && currentUser) saveReadReceipts([KEY(lv)]).catch(() => {});
  }

  // ---- Trạng thái hiện tại ----------------------------------------------------------------------------------------------------
  const started = () => !!G()?.started();
  const earned = () => G().total(G().earnedScores());
  const level = () => (started() ? G().realmOf(earned()).level : -1);
  const unlocked = (c) => c.lv <= level();
  const hero = () => G().growth()?.hero || 'nam';
  const fill = (s) => {
    const nu = hero() === 'nu';
    const name = G().heroName();
    const map = {
      name, Name: name, y: nu ? 'nàng' : 'chàng', Y: nu ? 'Nàng' : 'Chàng', sh: nu ? 'sư tỷ' : 'sư huynh', Sh: nu ? 'Sư tỷ' : 'Sư huynh',
      sd: nu ? 'sư muội' : 'sư đệ', Sd: nu ? 'Sư muội' : 'Sư đệ', tt: nu ? 'nha đầu' : 'tiểu tử', Tt: nu ? 'Nha đầu' : 'Tiểu tử',
    };
    return s.replace(/\{(name|Name|y|Y|sh|Sh|sd|Sd|tt|Tt)\}/g, (_, k) => map[k]);
  };
  // Cảnh giới của một cấp (v2.5.0: cảnh giới bắt đầu ở cấp 10, 20 …; cấp 100 là Thần cảnh).
  const realmAt = (lv) => (lv ? G().REALM_FROM.findIndex((_, i) => lv < G().REALM_FROM[i + 1]) + 1 : 0);
  const realmName = (lv) => (lv ? G().REALMS[realmAt(lv) - 1] : 'Vô danh tiểu tốt');

  // ---- Bảng hội thoại ---------------------------------------------------------------------------------------------------------
  let reader = null; // { el, queue: [lv…], at, page }
  // Cảnh 'moon' (v2.6.0): Huyết Nguyệt đài, phe ác đang nói hoặc lời kể về Giáo chủ; không vẽ hiệp khách, trăng nhuốm đỏ.
  // v2.8.0: cảnh 'moon' vẽ thêm tranh phe ác (foe = mã trong zenFoe) nếu có.
  function stageArt(pose, foe) {
    if (pose === 'moon') return '<div class="gr-stage-bg gr-story-stage is-moon">' + zenHero.scene() + (foe ? '<div class="gr-figure gr-story-figure gr-story-foe">' + window.zenFoe.svg(foe) + '</div>' : '') + '</div>';
    return '<div class="gr-stage-bg gr-story-stage">' + zenHero.scene() + '<div class="gr-figure gr-story-figure">' + zenHero.svg(hero(), pose) + '</div></div>';
  }
  function paint() {
    const r = reader;
    if (!r) return;
    const c = entryOf(r.queue[r.at]), last = r.page === c.pages.length, total = c.pages.length + 1;
    const head = r.el.querySelector('.gr-story-head');
    head.innerHTML = '<span class="eyebrow">' + esc(c.eyebrow) + '</span><h2 id="gr-story-title">' + esc(c.title) + '</h2><small>' + esc(c.sub) + '</small>';
    r.el.classList.toggle('is-meet', !!c.meet);
    const body = r.el.querySelector('.gr-story-body');
    if (last) {
      const g = G(), lvNow = level(), rr = g.realmOf(earned());
      body.innerHTML = '<div class="gr-story-lesson"><span class="gr-story-seal" aria-hidden="true">Ngộ</span><h3>Tâm đắc</h3><p>' + esc(c.lesson) + '</p><small>' + esc(g.heroName()) + ' hiện ở cấp ' + lvNow + ' · ' + esc(rr.name) + ' · ' + g.fmt(earned()) + ' điểm tu vi</small>' +
        (c.lead ? '<small class="gr-story-rival">Huyết Nguyệt Giáo chủ lúc ấy: cấp ' + c.lead + (c.lead >= 99 && c.lv < 99 ? ', kẹt trước cánh cửa thứ một trăm' : '') + '</small>' : '') + '</div>';
    } else {
      const [who, pose, text] = c.pages[r.page];
      const speaker = speakerOf(who);
      let art = body.querySelector(':scope > .gr-story-art');
      if (!art) {
        body.innerHTML = '<div class="gr-story-art"></div><div class="gr-story-say"></div>';
        art = body.firstChild;
      }
      // Tranh chỉ vẽ lại khi đổi cảnh / đổi thế, để hoạt họa không bị ngắt giữa các trang.
      // Trang phe ác: tranh của người đang nói; lời kể ở Huyết Nguyệt đài: tranh đối thủ của chương, không có thì Giáo chủ.
      const foeIds = window.zenFoe?.IDS || [];
      const foe = pose !== 'moon' ? '' : foeIds.includes(who) ? who : who === 'ke' && !c.meet ? (foeIds.includes(c.foe) ? c.foe : 'giao') : '';
      const scene = pose + ':' + foe;
      if (art.dataset.pose !== scene) {
        art.innerHTML = stageArt(pose, foe);
        art.dataset.pose = scene;
      }
      body.querySelector('.gr-story-say').innerHTML = '<p class="gr-story-who" data-who="' + who + '"' + (isFoe(who) ? ' data-side="ac"' : '') + '>' + esc(speaker) + '</p><p class="gr-story-text' + (who === 'ke' ? ' is-narration' : '') + '">' + esc(fill(text)) + '</p>';
    }
    const dots = r.el.querySelector('.gr-story-dots');
    dots.innerHTML = Array.from({ length: total }, (_, i) => '<i' + (i === r.page ? ' class="is-on"' : '') + '></i>').join('');
    dots.setAttribute('aria-label', 'Trang ' + (r.page + 1) + ' trên ' + total);
    const prev = r.el.querySelector('[data-story-prev]'), next = r.el.querySelector('[data-story-next]');
    prev.disabled = r.page === 0;
    const more = r.at < r.queue.length - 1;
    next.textContent = !last ? 'Tiếp →' : more ? (isMeet(r.queue[r.at + 1]) ? 'Kỳ ngộ kế →' : 'Chương kế →') : 'Khép sách';
    next.classList.toggle('primary', last);
  }
  function close() {
    const r = reader;
    if (!r) return;
    reader = null;
    r.el.close();
    r.el.remove();
    r.then?.();
    if (view === 'growth' && !document.querySelector('dialog[open]')) render();
  }
  // Mở một hoặc nhiều chương / kỳ ngộ liền nhau (khi vượt nhiều mốc cùng lúc). Chỉ mở mục đã tới cấp.
  // Chương: số cấp; kỳ ngộ: 'm:<nhân vật>-<lần>'.
  const norm = (id) => (isMeet(id) ? id : Number(id));
  function open(list, opt = {}) {
    const queue = [].concat(list).map(norm).filter((id) => {
      const c = entryOf(id);
      return c && c.lv <= level();
    });
    if (!queue.length || !started()) return false;
    if (reader) close();
    const d = document.createElement('dialog');
    d.className = 'gr-story';
    d.setAttribute('aria-labelledby', 'gr-story-title');
    d.innerHTML = '<div class="gr-story-card"><header class="gr-story-head"></header><button type="button" class="icon-btn gr-story-x" data-story-close aria-label="Đóng truyện ký">×</button><div class="gr-story-body" aria-live="polite"></div>' +
      '<footer class="gr-story-foot"><button type="button" class="btn" data-story-prev>← Trước</button><span class="gr-story-dots" role="img"></span><button type="button" class="btn" data-story-next>Tiếp →</button></footer></div>';
    document.body.append(d);
    reader = { el: d, queue, at: 0, page: 0, then: opt.then };
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
    markSeen(queue[0]);
    paint();
    d.showModal();
    d.querySelector('[data-story-next]').focus();
    return true;
  }
  function step(dir) {
    const r = reader;
    if (!r) return;
    const c = entryOf(r.queue[r.at]);
    if (dir < 0) {
      if (r.page > 0) r.page--;
    } else if (r.page < c.pages.length) r.page++;
    else if (r.at < r.queue.length - 1) {
      r.at++;
      r.page = 0;
      markSeen(r.queue[r.at]);
      r.el.querySelector('.gr-story-body').innerHTML = '';
    } else return close();
    paint();
    r.el.querySelector('[data-story-next]').focus();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-story-next],[data-story-prev],[data-story-close],[data-gr-story]');
    if (!b) return;
    if (b.hasAttribute('data-story-next')) return step(1);
    if (b.hasAttribute('data-story-prev')) return step(-1);
    if (b.hasAttribute('data-story-close')) return close();
    if (b.dataset.grStory !== undefined) open(b.dataset.grStory);
  });
  document.addEventListener('keydown', (e) => {
    if (!reader || e.target.closest?.('input,textarea,select')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  });

  // ---- Khi vượt mốc ---------------------------------------------------------------------------------------------------------
  // growth.js gọi sau khi lưu công lực: các mốc 5 cấp nằm trong (trước, sau] chưa đọc thì tự mở, sau lời chúc mừng một nhịp.
  function crossed(before, after) {
    if (typeof contentReadOnly !== 'undefined' && contentReadOnly) return;
    const list = CHAPTERS.filter((c) => c.lv > before && c.lv <= after && !seen(c.lv)).map((c) => c.lv);
    // v2.7.0: thêm kỳ ngộ cao nhất vừa vượt qua (tối đa một lần mỗi lần vượt cấp; các kỳ ngộ khác chờ trong khung Kỳ ngộ).
    const met = schedule().filter((m) => m.lv > before && m.lv <= after && !seen(m.id));
    if (met.length) list.push(met[met.length - 1].id);
    if (!list.length) return;
    setTimeout(() => {
      if (!reader) open(list);
    }, 900);
  }
  // ---- Lộ trình tu luyện (v1.93.0; v2.5.0 theo thang 11 cảnh giới) ------------------------------------------------------------
  // Trang Tu vi: dòng thời gian theo cảnh giới. Mỗi chương truyện ký kết thúc một chặng: chặng đi từ sau chương trước tới cấp của
  // chương; chương được xếp vào cảnh giới chứa cấp của nó. Khối "đang ở đây" cho biết hiệp khách ở chặng nào, đã qua mấy cấp của
  // chặng, còn bao nhiêu điểm tới chương kế. Mỗi chặng là một mục .gr-ch: chặng đã qua bấm để đọc chương; chặng hiện tại và chặng sau
  // hiện "Mở ở cấp N".
  const fromOf = (c) => (indexOf(c) > 1 ? STORY[indexOf(c) - 2].lv : 0); // cấp cuối của chặng trước
  const nextChapter = (lv) => STORY.find((c) => c.lv > lv); // chương của chặng đang đi (hết chương: đã trọn)
  const stageOf = (lv) => (nextChapter(lv) ? indexOf(nextChapter(lv)) : STAGES);
  function chapterItem(c, lv) {
    const isOpen = unlocked(c), fresh = isOpen && !seen(c.lv), k = indexOf(c), from = c.lv ? fromOf(c) : 0, span = c.lv - from;
    const tag = !isOpen ? 'Mở ở cấp ' + c.lv : fresh ? 'Chưa đọc' : 'Đã đọc';
    const here = c.lv && nextChapter(lv) === c;
    const filled = c.lv ? Math.max(0, Math.min(span, lv - from)) : 0;
    const segs = c.lv ? '<span class="gr-segs" aria-hidden="true">' + Array.from({ length: span }, (_, i) => '<i' + (i < filled ? ' class="on"' : '') + '></i>').join('') + '</span>' : '';
    const sub = c.lv ? 'Chặng ' + k + ' · cấp ' + (span > 1 ? from + 1 + '–' + c.lv : c.lv) : 'Khai cuộc · ngày bước vào giang hồ';
    const inner = '<span class="gr-ch-no">' + (c.lv ? k : '✦') + '</span><span class="gr-ch-main">' + (here ? '<b class="gr-here">Đang ở đây</b>' : '') + '<strong>' + esc(c.title) + '</strong><small>' + sub + '</small>' + segs + '</span>' +
      '<em class="gr-ch-tag">' + tag + '</em>';
    const state = c.lv && lv >= c.lv ? ' is-done' : '';
    return '<li class="gr-ch' + state + (isOpen ? '' : ' is-locked') + (fresh ? ' is-new' : '') + (here ? ' is-now' : '') + '"' + (here ? ' aria-current="step"' : '') + '>' +
      (isOpen ? '<button type="button" data-gr-story="' + c.lv + '" aria-label="Đọc ' + esc(number(c)) + ': ' + esc(c.title) + (fresh ? ' (chưa đọc)' : '') + '">' + inner + '</button>' : '<div aria-disabled="true">' + inner + '</div>') + '</li>';
  }
  // Dấu đã đọc của tài khoản tải không đồng bộ: khung có thể dựng trước khi tải xong, nên tải xong thì vẽ lại riêng khung này
  // (mỗi tài khoản thử một lần, không lặp lại khi máy chủ lỗi).
  let receiptsTried = null;
  function ensureReceipts() {
    const owner = currentUser?.id;
    if (!owner || typeof loadReadReceipts !== 'function' || receiptsTried === owner) return;
    if (typeof readReceiptLoaded !== 'undefined' && readReceiptLoaded && readReceiptOwner === owner) return;
    receiptsTried = owner;
    loadReadReceipts().then((ok) => {
      const box = document.querySelector('.gr-path-panel');
      if (ok && box && view === 'growth' && currentUser?.id === owner) {
        document.querySelector('.gr-meet-panel')?.remove();
        document.querySelector('.gr-route-panel')?.remove();
        box.outerHTML = panel();
      }
    });
  }
  function panel() {
    return started() ? pathPanel() + routePanel() + meetPanel() : '';
  }
  // ---- Khung Huyết Nguyệt lộ (v2.8.0) ----------------------------------------------------------------------------------------
  // Lộ trình gặp gỡ, đối kháng và vượt cấp: các ải đột phá (cấp 10, 20 … 100) và mười Nguyệt Sứ xếp theo cấp giao đấu, rồi Giáo chủ.
  // Thanh "tu luyện song hành": cấp của hiệp khách và cấp của Giáo chủ lúc ấy (theo chương mới nhất đã mở).
  function routePanel() {
    const g = G(), lv = level(), foes = TALE.FOES || [], draw = window.zenFoe?.svg || (() => '');
    const lastOpen = [...CHAPTERS].reverse().find((c) => c.lv <= lv);
    const lead = lastOpen?.lead || CHAPTERS[0]?.lead || 0;
    const items = [];
    for (let k = 1; k <= 10; k++) {
      const gate = k * 10, ri = realmAt(gate);
      items.push({ lv: gate, gate: true, html: '<li class="gr-route-gate' + (lv >= gate ? ' is-done' : '') + '"><span aria-hidden="true">' + (lv >= gate ? '✓' : '◆') + '</span><b>Ải cấp ' + gate + '</b> · ' + esc(gate === 100 ? 'Thành Thần' : g.REALMS[ri - 1]) + '</li>' });
    }
    let nextSet = false;
    const lieutenants = foes.filter((f) => f.id !== 'giao');
    lieutenants.forEach((f) => {
      const fights = f.lv.filter((x) => x < 80), first = fights[0], last = fights[fights.length - 1];
      const state = lv >= last ? 'done' : !nextSet ? ((nextSet = true), 'next') : 'todo';
      const label = { done: 'Đã vượt qua', next: lv >= first ? 'Đang đối đầu' : 'Sắp đối đầu', todo: 'Chưa lộ diện' }[state];
      const read = lv >= first ? ' data-gr-story="' + first + '"' : '';
      items.push({ lv: first + 0.5, html: foeItem(f, state, label, 'Giao đấu ở cấp ' + fights.join(', '), read, draw) });
    });
    const leader = foes.find((f) => f.id === 'giao');
    let met = 0;
    if (leader) {
      const fights = leader.lv.filter((x) => x >= 80);
      const state = lv >= 100 ? 'done' : lv >= fights[0] ? 'next' : 'todo';
      const label = state === 'done' ? 'Cùng thành Thần' : state === 'next' ? 'Đang giao thủ' : 'Chờ ở cấp ' + fights[0];
      items.push({ lv: 99.5, html: foeItem(leader, state, label, 'Giao thủ ở cấp ' + fights.join(', '), lv >= fights[0] ? ' data-gr-story="' + fights[0] + '"' : '', draw, true) });
    }
    met = lieutenants.filter((f) => lv >= f.lv.filter((x) => x < 80).slice(-1)[0]).length;
    items.sort((a, b) => a.lv - b.lv);
    const bar = (name, value, cls, short) =>
      '<div class="gr-rival ' + cls + '"><span title="' + name + '">' + (short || name) + '</span><div class="progress" role="progressbar" aria-label="' + name + ': cấp ' + value + ' trên 100" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, value) + '"><span style="width:' + Math.min(100, value) + '%"></span></div><b>Cấp ' + value + '</b></div>';
    return '<section class="panel gr-route-panel" aria-labelledby="gr-route-title"><h2 id="gr-route-title">Huyết Nguyệt lộ <small>Đã vượt ' + met + '/' + lieutenants.length + ' Nguyệt Sứ</small></h2>' +
      '<p class="help-copy">Lộ trình gặp gỡ, đối kháng và vượt cấp. Dưới cấp 80 là mười Nguyệt Sứ, mỗi kẻ một thói xấu; từ cấp 80, Huyết Nguyệt Giáo chủ đích thân ra tay. Hắn tu luyện song hành, luôn đi trước một bước.</p>' +
      '<div class="gr-rivals" aria-label="Tu luyện song hành">' + bar(esc(g.heroName()), Math.max(0, lv), 'is-hero') + bar('Huyết Nguyệt Giáo chủ', lead, 'is-foe', 'Giáo chủ') + '</div>' +
      '<ol class="gr-route">' + items.map((x) => x.html).join('') + '</ol></section>';
  }
  function foeItem(f, state, label, when, read, draw, boss) {
    const inner = '<span class="gr-route-art" aria-hidden="true">' + draw(f.id) + '</span><span class="gr-route-main"><strong>' + esc(f.title + ' ' + f.name) + '</strong>' +
      '<small>' + esc(boss ? f.vice : 'Thói xấu: ' + f.vice) + '</small><small>Tà công: ' + esc(f.art) + '</small><small>' + esc(when) + '</small></span><em class="gr-route-tag">' + label + '</em>';
    return '<li class="gr-route-foe is-' + state + (boss ? ' is-boss' : '') + '" data-foe="' + f.id + '" style="--fc:' + f.color + '"' + (state === 'next' ? ' aria-current="step"' : '') + '>' +
      (read ? '<button type="button"' + read + ' aria-label="Đọc chương gặp ' + esc(f.title + ' ' + f.name) + '">' + inner + '</button>' : '<div>' + inner + '</div>') + '</li>';
  }

  // ---- Khung Giang hồ kỳ ngộ (v2.7.0) ---------------------------------------------------------------------------------------
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
  function metCount() {
    if (!started()) return 0;
    const lv = level();
    return new Set(schedule().filter((m) => m.lv <= lv).map((m) => m.cast.id)).size;
  }
  function meetPanel() {
    const lv = level(), plan = schedule();
    const done = plan.filter((m) => m.lv <= lv), unread = done.filter((m) => !seen(m.id)), next = plan.find((m) => m.lv > lv);
    const order = [...new Set(plan.map((m) => m.cast.id))].map(castOf);
    const cards = order.map((c) => {
      const mine = plan.filter((m) => m.cast.id === c.id), first = mine[0];
      if (!first || first.lv > lv)
        return '<li class="gr-meet is-locked" data-cast="' + c.id + '"><span class="gr-meet-face" aria-hidden="true">?</span><div class="gr-meet-main"><strong>Kỳ nhân chưa lộ diện</strong><small>' + (first ? 'Xuất hiện ở cấp ' + first.lv : 'Chưa có duyên gặp') + '</small></div></li>';
      const acts = mine.map((m) => {
        const role = MEET.ROLES[m.meet.kind] || '';
        if (m.lv > lv) return '<span class="gr-meet-act is-later">Lần gặp sau: cấp ' + m.lv + '</span>';
        const fresh = !seen(m.id);
        return '<button type="button" class="gr-meet-act' + (fresh ? ' is-new' : '') + '" data-gr-story="' + m.id + '" data-kind="' + m.meet.kind + '" aria-label="Đọc kỳ ngộ ' + esc(m.meet.title) + ' (' + role + ', cấp ' + m.lv + ')' + (fresh ? ', chưa đọc' : '') + '"><b>Cấp ' + m.lv + '</b> ' + esc(m.meet.title) + ' <em>' + role + (fresh ? ' · Chưa đọc' : '') + '</em></button>';
      }).join('');
      return '<li class="gr-meet is-met" data-cast="' + c.id + '" data-kind="' + first.meet.kind + '"' + (c.side === 'ac' ? ' data-side="ac"' : '') + '><span class="gr-meet-face" aria-hidden="true">' + esc(initials(c.name)) + '</span><div class="gr-meet-main"><strong>' + esc(c.name) + '</strong><small>' + esc(c.title) + '</small><p>' + esc(c.bio) + '</p><div class="gr-meet-acts">' + acts + '</div></div></li>';
    }).join('');
    const people = new Set(done.map((m) => m.cast.id)).size;
    return '<section class="panel gr-meet-panel" aria-labelledby="gr-meet-title"><h2 id="gr-meet-title">Giang hồ kỳ ngộ <small>Đã gặp ' + people + '/' + CAST.length + ' nhân vật · ' + done.length + '/' + plan.length + ' kỳ ngộ</small></h2>' +
      '<p class="help-copy">' + CAST.length + ' nhân vật xuất hiện ngẫu nhiên ở những cấp không có chương truyện: người giúp đỡ, kẻ gây khó, sát thủ, người thử thách. Mỗi hiệp khách gặp họ ở những cấp khác nhau.' +
      (next ? ' Kỳ ngộ kế tiếp ở cấp ' + next.lv + '.' : ' Các hạ đã gặp đủ mọi người.') + (unread.length ? ' Còn ' + unread.length + ' kỳ ngộ chưa đọc.' : '') + '</p><ul class="gr-meet-list">' + cards + '</ul></section>';
  }
  function pathPanel() {
    queueMicrotask(ensureReceipts);
    const g = G(), t = earned(), lv = level(), r = g.realmOf(t), name = esc(g.heroName());
    const open_ = CHAPTERS.filter(unlocked), unread = open_.filter((c) => !seen(c.lv));
    const next = nextChapter(lv);
    const need = next ? Math.max(0, g.LEVEL_AT[next.lv] - t) : 0;
    const lead = next
      ? 'Chương kế: <strong>' + esc(number(next)) + ' · ' + esc(next.title) + '</strong> mở ở cấp ' + next.lv + ' (còn ' + g.fmt(need) + ' điểm tu vi).'
      : 'Các hạ đã mở trọn ' + STAGES + ' chương. Đọc lại bất cứ lúc nào.';
    // Khối "đang ở đây".
    const done = !next, k = stageOf(lv), from = next ? fromOf(next) : 0, to = next ? next.lv : 0;
    const pct = done ? 100 : Math.max(0, Math.min(99, Math.floor(((t - g.LEVEL_AT[from]) / (g.LEVEL_AT[to] - g.LEVEL_AT[from])) * 100)));
    const where = done ? name + ' đã đi trọn <strong>' + STAGES + ' chặng</strong>, cấp ' + lv + ' · ' + esc(r.name) : name + ' đang ở <strong>chặng ' + k + '/' + STAGES + '</strong> · tiến về “' + esc(next.title) + '”';
    const sub = done ? 'Hành trình trọn vẹn. Đỉnh núi chỉ là chỗ để thấy con đường tiếp theo.' : (lv ? 'Cấp ' + lv + ' · ' + esc(r.name) + ' · ' + esc(r.title) : 'Chưa nhập cấp') + ' · đã qua ' + (lv - from) + '/' + (to - from) + ' cấp của chặng · còn ' + g.fmt(Math.max(0, g.LEVEL_AT[to] - t)) + ' điểm tới chương ' + k;
    const nowBlock = '<div class="gr-path-now"><span class="gr-path-hero" aria-hidden="true">' + zenHero.svg(hero(), done ? 'zen' : 'martial') + '</span><div class="gr-path-now-text"><p>' + where + '</p><small>' + sub + '</small>' +
      '<div class="progress" role="progressbar" aria-label="' + (done ? 'Đã đi trọn lộ trình' : 'Tiến trình chặng ' + k + ' (cấp ' + (to - from > 1 ? from + 1 + '–' + to : to) + ')') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div></div></div>';
    // Các cảnh giới, mỗi cảnh giới gồm các chương có cấp nằm trong cảnh giới đó.
    const curRealm = r.top ? g.REALMS.length + 1 : Math.max(1, r.realm);
    const realms = g.REALMS.map((rn, i) => {
      const n = i + 1, x = g.realmInfo(n), state = n < curRealm ? 'is-done' : n === curRealm ? 'is-now' : 'is-todo';
      const label = state === 'is-done' ? 'Đã qua' : state === 'is-now' ? 'Đang tu luyện' : 'Chưa tới';
      const list = STORY.filter((c) => realmAt(c.lv) === n);
      const head = 'Cấp ' + x.from + '–' + x.to + (x.gate ? ' · ải đột phá ' + g.fmt(x.gate) : '') + ' · ' + (x.costTo ? 'mỗi cấp gấp đôi cấp trước, ' + g.fmt(x.cost) + ' → ' + g.fmt(x.costTo) + ' điểm' : g.fmt(x.cost) + ' điểm mỗi cấp') + ' · tu vi ' + g.fmt(x.at) + '–' + g.fmt(x.end);
      return '<li class="gr-path-realm ' + state + '"' + (state === 'is-now' ? ' aria-current="true"' : '') + '><span class="gr-path-node" aria-hidden="true">' + (state === 'is-done' ? '✓' : n) + '</span><div class="gr-path-body">' +
        '<div class="gr-path-head"><strong>' + esc(rn) + '</strong><small>' + head + '</small><em>' + label + '</em></div>' +
        (list.length ? '<ol class="gr-ch-list">' + list.map((c) => chapterItem(c, lv)).join('') + '</ol>' : '') + '</div></li>';
    }).join('');
    return '<section class="panel gr-story-panel gr-path-panel" aria-labelledby="gr-story-panel-title"><h2 id="gr-story-panel-title">Lộ trình tu luyện <small>' + (done ? 'Trọn ' + STAGES + ' chặng' : 'Chặng ' + k + '/' + STAGES) + ' · ' + open_.length + '/' + CHAPTERS.length + ' chương</small></h2>' + nowBlock +
      '<p class="help-copy">Lộ trình đi qua ' + g.REALMS.length + ' cảnh giới; cấp đầu mỗi cảnh giới là một ải đột phá. Cuối mỗi chặng, hiệp khách kể một chương truyện ký. ' + lead + (unread.length ? ' Còn ' + unread.length + ' chương chưa đọc.' : '') + '</p>' +
      '<ol class="gr-ch-list gr-path-start">' + chapterItem(byLv(0), lv) + '</ol><ol class="gr-path">' + realms + '</ol></section>';
  }

  window.zenStory = { CHAPTERS, WHO, CAST, schedule, metCount, open, crossed, panel, seen, fill, stageOf, isOpen: () => !!reader };
})();
