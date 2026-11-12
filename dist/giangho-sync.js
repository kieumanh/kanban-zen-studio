'use strict';
// v2.0.0 (Truyền Âm): phong cách đi theo tài khoản.
//  - Người dùng tự đổi phong cách (Cài đặt, bảng lệnh, lời mời "Bật thử", công tắc Lời lẽ giang hồ) thì ghi lựa chọn vào bản ghi gốc
//    của dữ liệu: data.style = 'zen' | 'giangho' | 'giangho-nhe' (như cài đặt báo cáo thu chi v1.67.0, không cần bảng hay cột mới;
//    máy chủ kiểm giá trị). Chỉ ghi khi người dùng tự đổi, nên người dùng cũ không bị thêm gì cho tới khi họ chọn.
//  - Mở ứng dụng hoặc nhận dữ liệu từ thiết bị khác mà data.style khác phong cách đang dùng trên máy này thì áp theo tài khoản.
//  - Máy chủ dùng data.style để viết email nhắc hạn và chiến báo tuần bằng giọng giang hồ ('giangho'); Giang hồ nhẹ giữ giọng thường.
//  - Thông báo đẩy do service worker hiện (không mang nội dung): trang ghi phong cách của thiết bị vào bộ nhớ đệm 'zen-pref' để
//    service worker chọn lời phù hợp.
(() => {
  const T = window.zenTheme;
  if (!T?.setStyle || !T.setWords) return;
  const VALUES = ['zen', 'giangho', 'giangho-nhe'];
  const local = () => {
    const s = T.state();
    return s.style !== 'giangho' ? 'zen' : s.words === false ? 'giangho-nhe' : 'giangho';
  };
  const baseStyle = T.setStyle,
    baseWords = T.setWords;
  let applying = false,
    changing = false; // người dùng đang tự đổi: các lần dựng lại trang giữa chừng không được kéo về phong cách cũ của tài khoản
  const canWrite = () =>
    typeof data !== 'undefined' && data && typeof currentUser !== 'undefined' && currentUser && !(typeof contentReadOnly !== 'undefined' && contentReadOnly) && typeof save === 'function';
  function remember() {
    if (applying || !canWrite()) return;
    const v = local();
    if (data.style === v) return;
    data.style = v;
    save();
  }
  const wrap = (base) =>
    function () {
      changing = true;
      try {
        return base.apply(this, arguments);
      } finally {
        changing = false;
        remember();
      }
    };
  T.setStyle = wrap(baseStyle);
  T.setWords = wrap(baseWords);
  function applyAccount() {
    if (applying || changing || typeof data === 'undefined' || !data || !VALUES.includes(data.style) || data.style === local()) return;
    applying = true;
    try {
      if (data.style === 'zen') baseStyle('zen');
      else {
        baseWords(data.style === 'giangho');
        baseStyle('giangho');
      }
    } finally {
      applying = false;
    }
  }
  if (typeof render === 'function') {
    const before = render;
    render = function (...args) {
      const out = before.apply(this, args);
      applyAccount();
      return out;
    };
  }
  // Phong cách của thiết bị cho thông báo đẩy (service worker không đọc được localStorage).
  let lastCached = '';
  function cacheStyle() {
    const v = local();
    if (v === lastCached || typeof caches === 'undefined') return;
    lastCached = v;
    caches
      .open('zen-pref')
      .then((c) => c.put('/__zen-style', new Response(v, { headers: { 'Content-Type': 'text/plain' } })))
      .catch(() => {});
  }
  document.addEventListener('zen-theme', cacheStyle);
  cacheStyle();
  window.zenStyleSync = { local, applyAccount, remember };
})();
