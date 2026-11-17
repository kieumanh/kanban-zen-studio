'use strict';
// v2.44.0 (Trang Trống Có Hồn): trang trống nào cũng có một hình nhỏ và đúng một nút hành động chính (nếu có việc để làm), thay cho một dòng chữ mờ.
// Chỉ bổ sung hình và nút vào khối ".empty" sẵn có; câu chữ gốc giữ nguyên (và vẫn được đổi giọng Giang hồ như cũ).
// Nhận ra khối trống theo vị trí / trang chứ không theo chữ, nên phong cách Giang hồ không làm lệch.
(() => {
  // Hình đơn giản, tự vẽ, một nét, màu theo giao diện (CSS tô .zen-empty-art). Không có chữ trong hình.
  const svg = (inner) => `<svg viewBox="0 0 72 72" width="72" height="72" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">${inner}</svg>`;
  const ART = {
    project: svg('<rect class="tint" x="9" y="14" width="16" height="44" rx="5"/><rect class="tint" x="28" y="14" width="16" height="30" rx="5"/><rect class="tint" x="47" y="14" width="16" height="38" rx="5"/><path d="M14 24h6M33 24h6M52 24h6"/>'),
    note: svg('<path class="tint" d="M18 10h28l10 10v40a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="M46 10v10h10M24 32h24M24 41h24M24 50h14"/>'),
    archive: svg('<rect class="tint" x="10" y="16" width="52" height="14" rx="4"/><path class="tint" d="M14 30h44v26a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/><path d="M29 41h14"/>'),
    files: svg('<path class="tint" d="M9 20a4 4 0 0 1 4-4h14l6 7h26a4 4 0 0 1 4 4v27a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z"/><path d="M36 51V34M29 41l7-7 7 7"/>'),
    trash: svg('<path class="tint" d="M20 24h32l-2.5 33a4 4 0 0 1-4 3.7H26.5a4 4 0 0 1-4-3.7z"/><path d="M14 24h44M29 24v-6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6M31 34v16M41 34v16"/>'),
  };
  // Việc chính của từng loại trang trống. Nhãn do mình đặt (Giang hồ có bản dịch riêng trong giangho-lex.js, vùng .zen-empty-action).
  const ACTIONS = {
    project: { label: 'Tạo dự án', attrs: 'data-action="new-project"', icon: '+' },
    note: { label: 'Ghi chú mới', attrs: 'data-note-new', icon: '+' },
    archive: { label: 'Xem dự án', attrs: 'data-view="projects"', icon: '' },
    files: { label: 'Tải tệp lên', attrs: 'data-resource-upload', icon: '↑' },
    trash: null,
  };
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;

  // Khối trống nào thuộc loại nào, theo trang đang mở. Trả về null nếu đó không phải trang trống "thật" (đang tải, lỗi, hay chỉ là kết quả lọc).
  function kindOf(el) {
    if (el.closest('dialog, .modal')) return null;
    if (el.matches('.project-grid > .empty')) return 'project';
    if (el.matches('.archive-projects > .empty')) return 'archive';
    if (view === 'notes') return Array.isArray(data?.notes) && data.notes.length === 0 ? 'note' : null;
    if (view === 'resources') return typeof resourceState !== 'undefined' && !resourceState.loading && !resourceState.error ? 'files' : null;
    if (view === 'trash') return 'trash';
    return null;
  }

  function upgrade() {
    const main = document.querySelector('#main');
    if (!main) return;
    for (const el of main.querySelectorAll('.empty:not([data-zen-empty])')) {
      const kind = kindOf(el);
      if (!kind) continue;
      el.dataset.zenEmpty = kind;
      el.classList.add('zen-empty');
      const art = document.createElement('span');
      art.className = 'zen-empty-art';
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = ART[kind];
      el.prepend(art);
      // Tệp phải thuộc một dự án hoặc ghi chú: chưa có nơi nào để cất thì việc chính là tạo dự án trước.
      const homeless = kind === 'files' && !(data?.projects?.length || data?.notes?.length);
      const action = ACTIONS[homeless ? 'project' : kind];
      if (action && !readOnly()) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn primary zen-empty-action';
        button.innerHTML = (action.icon ? '<span class="btn-icon" aria-hidden="true">' + action.icon + '</span> ' : '') + action.label;
        for (const m of action.attrs.matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) button.setAttribute(m[1], m[2] ?? '');
        el.append(button);
      }
    }
  }

  const before = render;
  render = function (...args) {
    const result = before.apply(this, args);
    upgrade();
    return result;
  };
  // Trang tải sau (Tài nguyên, Thùng rác) tự vẽ lại phần thân mà không gọi render(): theo dõi #main để bổ sung hình và nút cho cả các lần đó.
  const main = document.querySelector('#main');
  if (main) new MutationObserver(() => upgrade()).observe(main, { childList: true, subtree: true });
  upgrade();
})();
