'use strict';
// v1.96.0 (Chú Giải): giúp hiểu và chọn mức phong cách Giang hồ.
//  1. Bảng chú giải: tên giang hồ ↔ nghĩa thường, có ô tìm hai chiều (gõ "thùng rác" hay "phế tích" đều ra). Mở từ Cơ quan → Giao diện
//     và từ bảng lệnh ("Bảng chú giải Giang hồ"). Dùng hộp thoại chung #editor nên hợp sẵn sáng / tối / tương phản cao / Giang hồ.
//  2. Nhấn giữ (màn hình chạm) một chữ giang hồ có nghĩa thường (bộ chuyển ngữ gắn data-gh-tip + title, máy tính rê chuột là thấy)
//     thì hiện bong bóng "Nghĩa thường: …" trong ~2,6 giây; lần chạm đó không bấm nút.
//  3. Cơ quan → Giao diện: khi chọn Giang hồ có thêm công tắc "Lời lẽ giang hồ" (tắt = Giang hồ nhẹ: giữ họa tiết, chữ quen thuộc)
//     và nút mở Bảng chú giải. Lưu trên thiết bị như các lựa chọn giao diện khác (zen-gh-words, theme.js).
//  4. Lời mời một lần ở cuối Tổng quan cho người đang dùng Thiền: "Bật thử" hoặc "Ẩn". Đã ẩn / đã bật thì không hiện lại, kể cả trên
//     thiết bị khác (biên nhận đã đọc `notice:gh-intro`, cùng cơ chế với Biên niên). Không đổi dữ liệu làm việc.
(() => {
  const root = document.documentElement;
  const lex = () => window.zenGiangHo;
  const theme = () => window.zenTheme?.state?.() || {};
  const fold = (s) =>
    String(s || '')
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/đ/g, 'd');
  const escape = (s) => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';'));

  // ---- 1. Bảng chú giải ------------------------------------------------------------------------------------------------------
  // [tên giang hồ, nghĩa thường, lời giải thêm (tùy chọn)]. Nhóm "Điều hướng" lấy thẳng từ bảng tên mục của bộ chuyển ngữ (NAV)
  // để hai nơi không lệch nhau.
  const EXTRA_NAV = [
    ['Bí kíp nhập môn', 'Hướng dẫn sử dụng'],
    ['Truyền thư', 'Thông báo'],
    ['Khẩu quyết', 'Lệnh', 'bảng lệnh mở bằng Ctrl K / ⌘ K'],
  ];
  const GROUPS = [
    [
      'Đại sự & nhiệm vụ',
      [
        ['Đại sự', 'Dự án'],
        ['Khởi đại sự', 'Tạo dự án'],
        ['Nhiệm vụ', 'Công việc'],
        ['Chiêu thức · chiêu', 'Checklist · một bước trong checklist'],
        ['Kế sách', 'Ý tưởng'],
        ['Chưa xuất chiêu', 'Chưa làm'],
        ['Đang hành sự', 'Đang thực hiện'],
        ['Công thành', 'Hoàn thành'],
        ['Cấp bách', 'Mức độ'],
        ['Trọng yếu, hỏa tốc', 'Quan trọng, khẩn cấp'],
        ['Kỳ hạn', 'Hạn'],
        ['Lỡ hẹn', 'Quá hạn'],
        ['Sắp tới kỳ', 'Sắp đến hạn'],
        ['Tiến cảnh', 'Tiến độ'],
        ['Giải ấn', 'Khôi phục', 'đưa mục đã lưu trữ trở lại'],
        ['Phát lệnh bài', 'Xuất link chia sẻ'],
        ['Chiến báo', 'Báo cáo'],
      ],
    ],
    [
      'Tàng thư, Ngân khố, Tu vi',
      [
        ['Quyển', 'Một ghi chú'],
        ['Chép quyển mới', 'Ghi chú mới'],
        ['Ghi vào sổ', 'Lưu'],
        ['Ngân lượng', 'Tiền đầu tư'],
        ['Xuất ngân', 'Chi'],
        ['Thu ngân · hồi vốn', 'Thu · thu hồi'],
        ['Công phu', 'Thói quen trong Việc hằng ngày'],
        ['Cảnh giới', 'Bậc lớn của Điểm tích lũy', 'mỗi cảnh giới gồm 10 cấp'],
      ],
    ],
    [
      'Danh tính & thông mạch',
      [
        ['Các hạ', 'Bạn'],
        ['Nhập môn', 'Đăng nhập'],
        ['Ghi danh', 'Tạo tài khoản'],
        ['Ám hiệu', 'Mật khẩu'],
        ['Hạ sơn', 'Đăng xuất'],
        ['Danh tính', 'Tài khoản'],
        ['Thông mạch', 'Kết nối, đồng bộ được'],
        ['Ẩn cư', 'Ngoại tuyến (mất mạng)'],
      ],
    ],
  ];
  function groups() {
    const nav = Object.values(lex()?.NAV || {}).map(([gh, plain]) => [gh, plain]);
    return [['Điều hướng', nav.concat(EXTRA_NAV)], ...GROUPS];
  }
  function glossaryHtml() {
    const total = groups().reduce((n, [, rows]) => n + rows.length, 0);
    const body = groups()
      .map(
        ([title, rows]) =>
          '<section class="gh-glossary-group"><h3>' +
          escape(title) +
          '</h3><ul>' +
          rows
            .map(
              ([gh, plain, note]) =>
                '<li data-find="' +
                escape(fold(gh + ' ' + plain + ' ' + (note || ''))) +
                '"><b>' +
                escape(gh) +
                '</b><span>' +
                escape(plain) +
                (note ? '<small>' + escape(note) + '</small>' : '') +
                '</span></li>',
            )
            .join('') +
          '</ul></section>',
      )
      .join('');
    return (
      '<div class="gh-glossary"><h2>Bảng chú giải <small>Tên giang hồ và nghĩa thường</small></h2>' +
      '<p class="help-copy">Phong cách Giang hồ chỉ đổi chữ trên giao diện; dữ liệu và tên do ' +
      (lex()?.active() ? 'các hạ' : 'bạn') +
      ' đặt giữ nguyên. Máy tính: rê chuột lên chữ để xem nghĩa thường. Điện thoại: nhấn giữ chữ đó.</p>' +
      '<label class="gh-glossary-search"><span>Tìm chữ</span><input type="search" autocomplete="off" placeholder="Gõ tên giang hồ hoặc nghĩa thường" aria-describedby="gh-glossary-count"></label>' +
      '<p id="gh-glossary-count" class="subtext" role="status">' +
      total +
      ' mục</p>' +
      body +
      '<p class="gh-glossary-empty subtext" hidden>Không tìm thấy chữ phù hợp. Thử gõ ngắn hơn.</p></div>'
    );
  }
  function glossary(opts = {}) {
    if (typeof modal !== 'function') return;
    modal(glossaryHtml(), null, true);
    const body = document.querySelector('#editor-body');
    const box = body?.querySelector('.gh-glossary');
    if (!box) return;
    document.querySelector('#editor')?.classList.add('gh-glossary-dialog');
    document.querySelector('#editor')?.addEventListener('close', () => document.querySelector('#editor')?.classList.remove('gh-glossary-dialog'), { once: true });
    if (opts.back && typeof accountPanel === 'function') {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn gh-glossary-back';
      back.textContent = lex()?.active() ? '← Về Cơ quan' : '← Về Cài đặt';
      back.onclick = () => accountPanel();
      box.prepend(back);
    }
    const input = box.querySelector('input'),
      count = box.querySelector('#gh-glossary-count'),
      empty = box.querySelector('.gh-glossary-empty');
    input.addEventListener('input', () => {
      const q = fold(input.value.trim());
      let shown = 0;
      box.querySelectorAll('li[data-find]').forEach((li) => {
        const hit = !q || li.dataset.find.includes(q);
        li.hidden = !hit;
        if (hit) shown++;
      });
      box.querySelectorAll('.gh-glossary-group').forEach((g) => (g.hidden = !g.querySelector('li:not([hidden])')));
      count.textContent = shown + ' mục';
      empty.hidden = shown > 0;
    });
    if (!matchMedia('(pointer: coarse)').matches) input.focus({ preventScroll: true });
  }

  // ---- 2. Nhấn giữ để xem nghĩa thường (màn hình chạm) ------------------------------------------------------------------------
  let press = null,
    swallow = 0,
    bubbleTimer = 0;
  function hideBubble() {
    clearTimeout(bubbleTimer);
    document.querySelectorAll('.gh-tip-bubble').forEach((b) => b.remove());
  }
  function showBubble(el) {
    hideBubble();
    const plain = el.getAttribute('data-gh-tip');
    if (!plain) return;
    const tip = document.createElement('div');
    tip.className = 'gh-tip-bubble';
    tip.setAttribute('role', 'status');
    tip.innerHTML = 'Nghĩa thường: <b></b>';
    tip.querySelector('b').textContent = plain;
    (el.closest('dialog[open]') || document.body).append(tip);
    const r = el.getBoundingClientRect(),
      w = tip.offsetWidth,
      h = tip.offsetHeight;
    const left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : Math.min(innerHeight - h - 8, r.bottom + 8);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    bubbleTimer = setTimeout(hideBubble, 2600);
  }
  document.addEventListener(
    'pointerdown',
    (e) => {
      hideBubble();
      if (e.pointerType !== 'touch' || !lex()?.active()) return;
      const el = e.target.closest?.('[data-gh-tip]');
      if (!el) return;
      press = { x: e.clientX, y: e.clientY, timer: setTimeout(() => ((swallow = Date.now()), (press = null), showBubble(el)), 550) };
    },
    { passive: true, capture: true },
  );
  const cancel = () => {
    if (press) clearTimeout(press.timer);
    press = null;
  };
  document.addEventListener('pointermove', (e) => press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10 && cancel(), { passive: true, capture: true });
  document.addEventListener('pointerup', cancel, { passive: true, capture: true });
  document.addEventListener('pointercancel', cancel, { passive: true, capture: true });
  document.addEventListener('scroll', hideBubble, { passive: true, capture: true });
  // Lần chạm vừa mở bong bóng không bấm nút bên dưới (trong ~1 giây sau khi bong bóng hiện).
  document.addEventListener(
    'click',
    (e) => {
      if (swallow && Date.now() - swallow < 1000) {
        swallow = 0;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
  document.addEventListener('contextmenu', (e) => swallow && Date.now() - swallow < 1000 && e.target.closest?.('[data-gh-tip]') && e.preventDefault(), true);

  // ---- 3. Cơ quan → Giao diện: lời lẽ giang hồ + Bảng chú giải ---------------------------------------------------------------
  function paintExtra() {
    const box = document.querySelector('#editor-body .gh-style-extra');
    if (!box) return;
    const s = theme();
    box.hidden = s.style !== 'giangho';
    const input = box.querySelector('#gh-words');
    if (input) input.checked = s.words !== false;
  }
  if (typeof accountPanel === 'function') {
    const base = accountPanel;
    accountPanel = function () {
      const out = base.apply(this, arguments);
      const set = document.querySelector('#editor-body input[name=zen-style]')?.closest('fieldset');
      if (set && window.zenTheme?.setWords && !document.querySelector('#editor-body .gh-style-extra')) {
        const box = document.createElement('div');
        box.className = 'gh-style-extra';
        box.innerHTML =
          '<label class="check-row gh-words-row"><input type="checkbox" id="gh-words"><span><strong>Lời lẽ giang hồ</strong><small>Tắt để giữ họa tiết mà chữ vẫn quen thuộc (Giang hồ nhẹ).</small></span></label>' +
          '<button type="button" class="btn gh-glossary-open">Bảng chú giải</button>';
        set.after(box);
        box.querySelector('#gh-words').addEventListener('change', (e) => {
          window.zenTheme.setWords(e.target.checked);
          if (typeof notify === 'function') notify(e.target.checked ? 'Đã bật lời lẽ giang hồ.' : 'Đã chọn Giang hồ nhẹ: giữ họa tiết, chữ quen thuộc.');
        });
        box.querySelector('.gh-glossary-open').onclick = () => glossary({ back: true });
        paintExtra();
      }
      return out;
    };
  }
  document.addEventListener('zen-theme', paintExtra);

  // ---- 4. Lời mời thử phong cách (một lần) -----------------------------------------------------------------------------------
  const KEY = 'notice:gh-intro';
  const localKey = () => 'zen-gh-intro-' + (typeof currentUser !== 'undefined' && currentUser ? currentUser.id : '');
  const receiptsReady = () => typeof readReceiptLoaded !== 'undefined' && readReceiptLoaded && readReceiptOwner === currentUser?.id;
  function introSeen() {
    try {
      if (localStorage.getItem(localKey()) === '1') return true;
    } catch {}
    return receiptsReady() && readReceiptKeys.has(KEY);
  }
  function markIntro() {
    try {
      localStorage.setItem(localKey(), '1');
    } catch {}
    if (typeof saveReadReceipts === 'function' && typeof currentUser !== 'undefined' && currentUser) saveReadReceipts([KEY]).catch(() => {});
  }
  let introLoading = null;
  function intro() {
    const main = document.querySelector('#main');
    const old = main?.querySelector('.gh-intro');
    const want =
      main &&
      typeof view !== 'undefined' &&
      view === 'dashboard' &&
      typeof currentUser !== 'undefined' &&
      currentUser &&
      theme().style !== 'giangho' &&
      window.zenTheme?.setStyle &&
      (typeof data === 'undefined' || (data.projects || []).length > 0) &&
      !introSeen();
    if (!want) return old?.remove();
    // Chờ biết các thiết bị khác đã ẩn lời mời chưa, khỏi hiện rồi biến mất.
    if (!receiptsReady()) {
      const owner = currentUser.id;
      if (typeof loadReadReceipts === 'function' && introLoading !== owner) {
        introLoading = owner;
        loadReadReceipts().then(() => currentUser?.id === owner && intro());
      }
      return;
    }
    if (old) return main.lastElementChild !== old && main.append(old);
    const card = document.createElement('aside');
    card.className = 'gh-intro panel';
    card.setAttribute('aria-labelledby', 'gh-intro-title');
    card.innerHTML =
      '<span class="gh-intro-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 3.5 10 13 M19.5 3.5l-1 3.5-7 7 M19.5 3.5 16 4.5 M7.5 12.5l4 4 M9.5 14.5l-5 5 M5 17l2 2"/></svg></span>' +
      '<div class="gh-intro-copy"><strong id="gh-intro-title">Thử phong cách Giang hồ</strong><p>Son đỏ, giấy dó và lời lẽ kiếm hiệp cho cả ứng dụng. Dữ liệu giữ nguyên; đổi lại bất cứ lúc nào ở Cài đặt → Giao diện.</p></div>' +
      '<div class="gh-intro-actions"><button type="button" class="btn primary" data-gh-intro="on">Bật thử</button><button type="button" class="btn" data-gh-intro="hide">Ẩn</button></div>';
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-gh-intro]')?.dataset.ghIntro;
      if (!act) return;
      markIntro();
      card.remove();
      if (act === 'on') {
        window.zenTheme.setStyle('giangho');
        if (typeof notify === 'function') notify('Đã bật Giang hồ. Rê chuột hoặc nhấn giữ một chữ lạ để xem nghĩa thường; Bảng chú giải nằm ở Cài đặt → Giao diện.');
      } else if (typeof notify === 'function') notify('Đã ẩn lời mời. Phong cách Giang hồ vẫn ở Cài đặt → Giao diện.');
    });
    main.append(card);
  }
  if (typeof render === 'function') {
    const before = render;
    render = function (...args) {
      const out = before.apply(this, args);
      intro();
      return out;
    };
  }
  document.addEventListener('zen-theme', intro);

  window.zenGuide = { glossary, groups, showBubble, intro };
})();
