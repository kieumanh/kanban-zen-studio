'use strict';
// v1.66.0: gỡ trang "Tất cả công việc" (bộ lọc, sắp xếp, chọn nhiều việc, nút việc mới, chip thời hạn).
// Chỉ còn trang kết quả gọn khi (1) gõ vào ô tìm kiếm, (2) bấm từ khóa, (3) bấm số liệu thời hạn ở Tổng quan.
// Không có từ khóa và không có bộ lọc thời hạn thì không còn trang liệt kê mọi việc: quay về Tổng quan.
(() => {
  const FILTERS = {
    today: 'Cần làm hôm nay',
    overdue: 'Quá hạn',
    upcoming: 'Sắp đến hạn · 7 ngày',
    doing: 'Đang thực hiện',
    attention: 'Cần chú ý',
  };
  const text = (value) => String(value ?? '');

  // Công cụ chọn nhiều việc / lọc / sắp xếp của trang cũ không còn.
  wfTaskListTools = function () {};

  tasksPage = function () {
    const tasks = allTasks().filter(found);
    const key = text(dashboardDueFilter);
    const q = text(query).trim();
    const title = q ? 'Kết quả cho “' + esc(q) + '”' : esc(FILTERS[key] || 'Kết quả');
    const sub = tasks.length ? tasks.length + ' công việc phù hợp.' : 'Không có công việc phù hợp.';
    const chips = [];
    if (q) chips.push('<span class="sr-chip">Từ khóa: ' + esc(q) + '</span>');
    if (FILTERS[key]) chips.push('<span class="sr-chip">Thời hạn: ' + esc(FILTERS[key]) + '</span>');
    const clear = '<button type="button" class="btn sr-clear" data-sr-clear>Xóa kết quả</button>';
    const projects = q ? visibleProjects().filter((p) => projectMatches(p)) : [];
    return (
      '<div class="sr-page">' +
      heading('KẾT QUẢ', title, sub, clear) +
      (chips.length ? '<div class="sr-chips">' + chips.join('') + '</div>' : '') +
      (projects.length ? '<section class="project-search-results"><h2>Dự án phù hợp</h2><div class="project-grid">' + projects.map(projectCard).join('') + '</div></section>' : '') +
      (tasks.length ? '<div class="panel table-wrap">' + table(tasks) + '</div>' : '<div class="panel sr-empty"><p>Thử từ khóa khác, hoặc bấm “Xóa kết quả” để về Tổng quan.</p></div>') +
      '</div>'
    );
  };

  // Không còn trang liệt kê mọi việc: ô tìm kiếm trống và không có bộ lọc thì về Tổng quan.
  const baseRender = render;
  render = function () {
    if (view === 'tasks' && !text(query).trim() && !dashboardDueFilter) {
      view = 'dashboard';
      active = null;
    }
    if (view !== 'tasks' && dashboardDueFilter) dashboardDueFilter = '';
    baseRender();
    if (view !== 'tasks') return;
    // Việc đã xong xuống cuối, giữ nguyên thứ tự theo hạn trong mỗi nhóm.
    const body = document.querySelector('#main .task-table tbody');
    if (body) body.querySelectorAll('tr.zen-row-done').forEach((row) => body.append(row));
  };

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-sr-clear]')) return;
    event.preventDefault();
    dashboardDueFilter = '';
    query = '';
    const box = document.querySelector('#search');
    if (box) box.value = '';
    view = 'dashboard';
    active = null;
    render();
  });
})();
