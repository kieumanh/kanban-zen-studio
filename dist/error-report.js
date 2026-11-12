'use strict';
// v1.73.0: báo lỗi script ẩn danh. Nạp SỚM (không defer) để bắt cả lỗi lúc khởi động.
// Gửi tối đa 5 lỗi khác nhau mỗi lần mở trang tới POST /api/client-event; máy chủ làm sạch rồi ghi một dòng nhật ký (không lưu D1,
// không kèm mã người dùng, không kèm IP). Không gửi khi: trình duyệt bật "Do Not Track"/Global Privacy Control, đang ngoại tuyến,
// là trình duyệt tự động (kiểm thử), hoặc lỗi không đến từ chính mã của ứng dụng (tiện ích trình duyệt, tập lệnh bên thứ ba).
(function () {
  if (window.zenDiagnosticsSend) return;
  const VERSION = '__APP_VERSION__';
  const IGNORE = /ResizeObserver loop|^Script error\.?$|Load failed|Failed to fetch|NetworkError|AbortError|(?:chrome|moz|safari)-extension/i;
  const seen = new Set();
  let reported = 0;
  const disabled = () =>
    navigator.webdriver === true ||
    navigator.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    navigator.globalPrivacyControl === true ||
    navigator.onLine === false;
  function send(payload) {
    if (disabled()) return;
    try {
      fetch('/api/client-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, version: VERSION }),
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {});
    } catch {
      /* không bao giờ làm hỏng ứng dụng vì báo cáo */
    }
  }
  function currentView() {
    try {
      return typeof view === 'string' ? view : '';
    } catch {
      return ''; // `view` chưa khởi tạo xong (lỗi xảy ra rất sớm)
    }
  }
  function report(kind, message, source, line, col, stack) {
    const text = String(message || '');
    if (!text || IGNORE.test(text) || reported >= 5) return;
    if (source && !String(source).startsWith(location.origin)) return;
    const signature = kind + '|' + text.slice(0, 120) + '|' + (source || '') + ':' + line + ':' + col;
    if (seen.has(signature)) return;
    seen.add(signature);
    reported++;
    let file = '';
    try {
      file = source ? new URL(source).pathname : '';
    } catch {
      file = '';
    }
    send({ type: kind, message: text, source: file, line: line | 0, col: col | 0, stack: String(stack || ''), view: currentView() });
  }
  window.addEventListener('error', (e) => report('error', e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report('rejection', r instanceof Error ? r.message : r, '', 0, 0, r && r.stack);
  });
  window.zenDiagnosticsSend = send;
})();
