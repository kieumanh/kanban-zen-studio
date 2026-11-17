'use strict';
// v2.46.0 (Bảng Phím Tắt): bấm “?” (khi không đang gõ chữ) hoặc chọn “Xem phím tắt” trong bảng lệnh (Ctrl/⌘ K) để xem mọi phím tắt của ứng dụng.
// Chỉ liệt kê phím tắt có thật: Ctrl/⌘ K (studio-zen.js), C (studio-zen.js), Alt + ←/→ trên tab dự án (polish.js), ←/→ trên điểm uốn đường nối Gantt (gantt.js).
(() => {
  const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  const kbd = (...keys) => keys.map((k) => '<kbd>' + k + '</kbd>').join(' ');
  const mod = mac ? '⌘' : 'Ctrl';
  const GROUPS = [
    {
      title: 'Chung',
      rows: [
        [kbd(mod, 'K'), 'Mở bảng lệnh: tìm dự án, việc, trang, cài đặt'],
        [kbd('?'), 'Mở bảng phím tắt này'],
        [kbd('Esc'), 'Đóng hộp thoại hoặc bảng chọn đang mở'],
      ],
    },
    { title: 'Tạo mới', rows: [[kbd('C'), 'Tạo việc mới (khi đang mở một dự án) hoặc tạo dự án (khi chưa mở dự án)']] },
    { title: 'Tab dự án', rows: [[kbd(mac ? '⌥' : 'Alt', '←') + ' ' + kbd(mac ? '⌥' : 'Alt', '→'), 'Dời tab dự án đang chọn sang trái hoặc phải (khi đã đặt tiêu điểm vào tab)']] },
    { title: 'Gantt', rows: [[kbd('←') + ' ' + kbd('→'), 'Uốn đường nối đang chọn sang trái hoặc phải (khi đã đặt tiêu điểm vào điểm uốn)']] },
  ];
  let dialog;
  let returnFocus;

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'zen-shortcuts';
    dialog.setAttribute('aria-labelledby', 'zen-shortcuts-title');
    dialog.innerHTML =
      '<header><h2 id="zen-shortcuts-title">Phím tắt</h2><button type="button" class="icon-btn exit-x" data-zen-shortcuts-close aria-label="Đóng bảng phím tắt" title="Đóng">×</button></header>' +
      '<p class="zen-shortcuts-lead">Bấm ' + kbd('?') + ' ở bất kỳ đâu (khi không đang gõ chữ) để mở lại bảng này.</p>' +
      GROUPS.map((g) => '<section><h3>' + g.title + '</h3><dl>' + g.rows.map(([keys, what]) => '<div><dt>' + keys + '</dt><dd>' + what + '</dd></div>').join('') + '</dl></section>').join('');
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-zen-shortcuts-close]') || e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      returnFocus?.focus?.();
      returnFocus = null;
    });
    document.body.append(dialog);
  }

  function open() {
    if (document.querySelector('dialog[open]')) return;
    if (!dialog) build();
    returnFocus = document.activeElement;
    dialog.showModal();
    dialog.querySelector('[data-zen-shortcuts-close]').focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing || e.defaultPrevented) return;
    if (document.querySelector('dialog[open]') || e.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable=false])')) return;
    e.preventDefault();
    open();
  });

  window.zenShortcuts = { open, close: () => dialog?.close(), isOpen: () => Boolean(dialog?.open) };
})();
