'use strict';
// v2.37.0 (Tải Theo Nhu Cầu): giangho.css (~500 KB chưa nén) chỉ tải khi phong cách Giang hồ đang bật.
// Thẻ <script src="/lazy-css.js" data-css="/giangho.css" data-need="giangho"> đứng đúng chỗ <link> cũ trong index.html, nên thứ tự áp
// CSS (cascade) giữ nguyên. Chạy ĐỒNG BỘ khi trình duyệt đọc tới đó:
//  - Phong cách Giang hồ đang bật (theme.js đã đặt data-style trên <html> từ đầu <head>): viết thẳng thẻ <link> tại chỗ. Thẻ do trình
//    đọc HTML chèn nên chặn vẽ cho tới khi nạp xong, không chớp giao diện Thiền rồi mới đổi.
//  - Chưa bật: không tải gì. Khi người dùng đổi sang Giang hồ, theme.js gọi zenCss.ensure(['giangho']) rồi mới đặt thuộc tính, và
//    thẻ <link> được chèn ngay sau thẻ script này (cùng vị trí).
(function () {
  var me = document.currentScript;
  if (!me) return;
  var root = document.documentElement;
  var key = me.getAttribute('data-need') || '';
  var href = me.getAttribute('data-css') || '';
  if (!key || !href) return;
  var reg = window.zenCss || (window.zenCss = { slots: {} });
  reg.slots[key] = { script: me, href: href };
  // Trả null nếu mọi bảng cần đã nạp xong; ngược lại trả Promise (kể cả khi lỗi mạng, để không kẹt đổi giao diện).
  reg.ensure = function (needs) {
    var waits = [];
    needs.forEach(function (k) {
      var slot = reg.slots[k];
      if (!slot) return;
      var link = document.querySelector('link[data-zen-css="' + k + '"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = slot.href;
        link.setAttribute('data-zen-css', k);
        slot.script.after(link);
      }
      if (link.sheet) return;
      waits.push(
        new Promise(function (resolve) {
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', resolve, { once: true });
        }),
      );
    });
    return waits.length ? Promise.all(waits) : null;
  };
  if (key === 'giangho' && root.getAttribute('data-style') === 'giangho') {
    document.write('<link rel="stylesheet" href="' + href + '" data-zen-css="' + key + '">');
  }
})();
