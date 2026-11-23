'use strict';
// v2.75.0 (Theo Chân): vài lựa chọn nhỏ đi theo tài khoản thay vì chỉ nhớ theo từng thiết bị: tab đang xem ở trang Tu vi và công tắc “Chỉ số ẩn danh”.
// Dữ liệu: một khóa tùy chọn ở bản ghi gốc, data.prefs = { tab?, usage? } (máy chủ kiểm giá trị ở server/prefs.mjs; không bảng hay cột mới). Chỉ ghi khi
// người dùng tự đổi, nên người dùng cũ không bị thêm gì cho tới khi họ chọn. Không đăng nhập hoặc đang xem bản chia sẻ thì không ghi; mã gọi vẫn nhớ theo
// thiết bị (localStorage) như trước. Đổi tab có thể liên tục nên lưu dồn (1,5 giây sau lần đổi cuối, hoặc ngay khi rời trang); công tắc quyền riêng tư lưu ngay.
(() => {
  const DELAY = 1500;
  let timer = 0;
  const live = () => typeof data !== 'undefined' && !!data;
  const canWrite = () => live() && typeof currentUser !== 'undefined' && !!currentUser && !(typeof contentReadOnly !== 'undefined' && contentReadOnly) && typeof save === 'function';
  const get = (key) => {
    try {
      return live() && data.prefs && typeof data.prefs === 'object' ? data.prefs[key] : undefined;
    } catch {
      return undefined;
    }
  };
  function flush() {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    try {
      if (canWrite()) save();
    } catch {
      /* lưu tùy chọn chỉ là tiện ích: lỗi thì lần lưu sau sẽ mang theo */
    }
  }
  // Ghi một tùy chọn vào dữ liệu; now = lưu ngay. Trả về true nếu đã ghi (hoặc giá trị đã đúng sẵn).
  function set(key, value, now) {
    if (!canWrite()) return false;
    if (get(key) === value) return true;
    data.prefs = { ...(data.prefs && typeof data.prefs === 'object' ? data.prefs : {}), [key]: value };
    clearTimeout(timer);
    timer = setTimeout(flush, DELAY);
    if (now) flush();
    return true;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  window.zenPrefs = { get, set, flush };
})();
