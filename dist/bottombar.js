'use strict';
// v2.39.0 (Thanh Dưới Điện Thoại): thanh điều hướng dưới đáy màn hình trên điện thoại (≤700px), 5 ô: Tổng quan · Bảng · [+] · Hằng ngày · Ghi chú.
// Ô giữa là nút “+” mở hộp Thêm nhanh (zenQuick.open, v2.35.0). Máy tính bảng / máy tính dùng thanh bên nên thanh này luôn ẩn ở đó (CSS).
// Dùng thuộc tính riêng data-bottom-go (không dùng data-view) để không lẫn với các nút menu bên khi tìm [data-view].
(() => {
  const CELLS = [
    { go: 'dashboard', label: 'Tổng quan', icon: 'dashboard', views: ['dashboard'] },
    { go: 'projects', label: 'Bảng', icon: 'projects', views: ['projects', 'calendar', 'gantt'] },
    { go: 'quick', label: 'Thêm', icon: 'plus', views: [] },
    { go: 'habits', label: 'Hằng ngày', icon: 'habits', views: ['habits'] },
    { go: 'notes', label: 'Ghi chú', icon: 'notes', views: ['notes'] },
  ];
  const PLUS = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const icon = (name) => (name === 'plus' ? PLUS : typeof svgIcon === 'function' ? svgIcon(name) : '');

  const bar = document.createElement('nav');
  bar.className = 'zen-bottom-bar';
  bar.setAttribute('aria-label', 'Điều hướng nhanh');
  bar.innerHTML = CELLS.map((c) =>
    c.go === 'quick'
      ? `<button type="button" class="zbb-cell zbb-add" data-bottom-go="quick" aria-label="Thêm nhanh một việc bằng câu tự nhiên"><span class="zbb-icon">${icon(c.icon)}</span><span class="zbb-label">${c.label}</span></button>`
      : `<button type="button" class="zbb-cell" data-bottom-go="${c.go}"><span class="zbb-icon">${icon(c.icon)}</span><span class="zbb-label">${c.label}</span></button>`,
  ).join('');
  document.body.append(bar);

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bottom-go]');
    if (!b) return;
    const target = b.dataset.bottomGo;
    if (target === 'quick') return window.zenQuick?.open();
    // Đang ở đúng trang của ô này thì cuộn lên đầu thay vì vẽ lại.
    const cell = CELLS.find((c) => c.go === target);
    if (cell.views.includes(view) && (target !== 'projects' || view === 'projects')) return window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    go(target);
  });

  const mark = () => {
    for (const b of bar.querySelectorAll('.zbb-cell[data-bottom-go]')) {
      const cell = CELLS.find((c) => c.go === b.dataset.bottomGo);
      if (cell.views.includes(view)) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
  };
  const before = render;
  render = function (...args) {
    const result = before.apply(this, args);
    mark();
    return result;
  };
  mark();
})();
