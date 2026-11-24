'use strict';
// v2.52.0 (Việc Chờ Người Khác): đánh dấu một việc đang chờ ai đó (tên người + ngày nhắc hỏi lại).
// Dữ liệu: hai trường tùy chọn ngay trên việc — waitFor (tên người, ≤ 60 ký tự) và waitUntil (YYYY-MM-DD, có thể trống). Không có waitFor là không chờ ai.
// v2.86.0 (Lặng Chờ): không còn hiện ở đâu (thẻ việc, Tổng quan, chuông) và không còn ô sửa. Dữ liệu waitFor / waitUntil trên việc được giữ nguyên;
// file này chỉ còn đọc dữ liệu cho zenWaiting (kiểm thử) và chốt mốc “chưa đổi gì” của hộp sửa việc.
(() => {
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const daysBetween = (from, to) => Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);

  // Việc đang chờ (chưa xong, có tên người). Trả về { who, until }.
  function waitInfo(t) {
    const who = typeof t?.waitFor === 'string' ? t.waitFor.trim() : '';
    if (!who || t.col === 'Done') return null;
    return { who, until: isDay(t.waitUntil) ? t.waitUntil : '' };
  }
  const isDue = (info) => Boolean(info && info.until && info.until <= today());
  // Câu ngắn nói về ngày hẹn.
  function whenLabel(info) {
    if (!info.until) return '';
    const gap = daysBetween(info.until, today());
    if (gap > 0) return 'Quá hẹn hỏi lại ' + gap + ' ngày';
    if (gap === 0) return 'Hỏi lại hôm nay';
    return 'Nhắc lại ' + dateLabel(info.until);
  }
  const waiting = () =>
    allTasks()
      .map((t) => ({ t, info: waitInfo(t) }))
      .filter((x) => x.info)
      .sort((a, b) => {
        const da = isDue(a.info) ? 0 : a.info.until ? 1 : 2,
          db = isDue(b.info) ? 0 : b.info.until ? 1 : 2;
        return da - db || (a.info.until || '9999').localeCompare(b.info.until || '9999') || a.t.title.localeCompare(b.t.title, 'vi');
      });
  const dueWaits = () => waiting().filter((x) => isDue(x.info));

  // Trình sửa việc: mốc “chưa đổi gì” được chốt lại sau khi ứng dụng dựng xong hộp, kể cả khi mở từ nơi khác (không thì Esc báo nhầm là có thay đổi).
  const baseDetail = taskDetail;
  taskDetail = function () {
    const out = baseDetail.apply(this, arguments);
    if (typeof refreshTaskFormSnapshot === 'function') refreshTaskFormSnapshot();
    return out;
  };

  window.zenWaiting = { info: waitInfo, due: dueWaits, label: whenLabel, list: waiting };
})();
