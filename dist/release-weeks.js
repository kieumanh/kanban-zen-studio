'use strict';
// v2.72.0 (Tuần Mới): nhật ký phát triển gộp theo tuần. Trang Phiên bản có hai cách xem: “Theo tuần” (mặc định; mỗi tuần một khung “Tuần này có gì mới”,
// “Tuần trước”, “Tuần 09/11 – 15/11” liệt kê các phiên bản của tuần và từ khóa) và “Từng phiên bản” (đúng như trước). Mỗi phiên bản trong releases.js có thêm trường
// `date` (YYYY-MM-DD, lấy từ “Ngày phát hành” của ghi chú kỹ thuật docs/release-notes/<phiên bản>.md); bản không có ngày (các bản đầu) gom vào khung “Trước đó”.
// Không đổi dữ liệu người dùng, không gọi máy chủ; ghi chú kỹ thuật từng phiên bản vẫn ở docs/release-notes. Lựa chọn cách xem nhớ ở thiết bị (localStorage).
(() => {
  const KEY = 'zen-versions-mode';
  const FIRST = 6;
  const STEP = 6;
  let shown = FIRST;
  const mode = () => {
    try {
      return localStorage.getItem(KEY) === 'each' ? 'each' : 'week';
    } catch {
      return 'week';
    }
  };
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T12:00:00Z'));
  const plus = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const mondayOf = (day) => plus(day, -((new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const short = (day) => day.slice(8, 10) + '/' + day.slice(5, 7);
  const e = (s) => esc(String(s));

  // Gom các phiên bản có ngày theo thứ Hai của tuần (mới nhất trước); phiên bản không có ngày hợp lệ vào `rest`.
  function weeks(list) {
    const map = new Map();
    const rest = [];
    for (const r of list) {
      if (!isDay(r.date)) {
        rest.push(r);
        continue;
      }
      const mon = mondayOf(r.date);
      if (!map.has(mon)) map.set(mon, []);
      map.get(mon).push(r);
    }
    const order = [...map.keys()].sort().reverse();
    return { order, map, rest };
  }
  function label(mon, now) {
    const cur = mondayOf(now);
    if (mon === cur) return 'Tuần này có gì mới';
    if (mon === plus(cur, -7)) return 'Tuần trước';
    return 'Tuần ' + short(mon) + ' – ' + short(plus(mon, 6));
  }
  function card(title, sub, items) {
    const tags = [...new Set(items.flatMap((r) => (Array.isArray(r.tags) ? r.tags : [])))].slice(0, 8);
    return (
      '<article class="release-card release-week"><header><span class="release-ver">' + e(title) + '</span><h4>' + e(sub) + '</h4></header>' +
      (tags.length ? '<div class="release-tags" aria-label="Từ khóa">' + tags.map((t) => '<span class="release-tag">' + e(t) + '</span>').join('') + '</div>' : '') +
      '<ul>' +
      items.map((r) => '<li><strong>v' + e(r.version === '__APP_VERSION__' ? APP_VERSION : r.version) + (r.name ? ' · ' + e(r.name) : '') + '</strong> — ' + e(r.title) + '</li>').join('') +
      '</ul></article>'
    );
  }
  function weekly() {
    const now = today();
    const { order, map, rest } = weeks(RELEASES);
    const cards = order.slice(0, shown).map((mon) => {
      const items = map.get(mon);
      return card(label(mon, now), items.length + ' phiên bản · ' + short(mon) + ' – ' + short(plus(mon, 6)), items);
    });
    if (order.length <= shown && rest.length) cards.push(card('Trước đó', rest.length + ' phiên bản chưa ghi ngày', rest));
    const more = order.length > shown ? '<button type="button" class="btn" data-rw-more>Xem thêm tuần cũ (' + (order.length - shown) + ' tuần nữa)</button>' : '';
    return '<section class="release-log" aria-label="Nhật ký theo tuần">' + cards.join('') + '</section>' + more;
  }
  const modes = (m) =>
    '<div class="rw-modes" role="group" aria-label="Cách xem nhật ký phát triển">' +
    [['week', 'Theo tuần'], ['each', 'Từng phiên bản']].map(([id, text]) => '<button type="button" class="btn' + (m === id ? ' active' : '') + '" data-rw-mode="' + id + '" aria-pressed="' + (m === id) + '">' + text + '</button>').join('') +
    '</div>';

  const baseVersions = versions;
  versions = function () {
    // Nhật ký chưa tải xong: để bản gốc hiện dòng “Đang tải” và tự nạp.
    if (!RELEASES.length) return baseVersions.apply(this, arguments);
    const m = mode();
    if (m === 'each') return baseVersions.apply(this, arguments).replace('<section class="release-log"', modes(m) + '<section class="release-log"');
    return heading('NHẬT KÝ PHÁT TRIỂN', 'Phiên bản ' + APP_VERSION, 'Mỗi tuần một khung: những gì mới trong tuần. Muốn xem từng phiên bản thì chọn “Từng phiên bản”.') + modes(m) + weekly();
  };
  document.addEventListener('click', (ev) => {
    const mb = ev.target.closest && ev.target.closest('[data-rw-mode]');
    if (mb) {
      try {
        if (mb.dataset.rwMode === 'each') localStorage.setItem(KEY, 'each');
        else localStorage.removeItem(KEY);
      } catch {
        /* chỉ là tiện ích: không nhớ được thì lần sau về mặc định */
      }
      shown = FIRST;
      render();
      document.querySelector('[data-rw-mode="' + mb.dataset.rwMode + '"]')?.focus();
      return;
    }
    if (ev.target.closest && ev.target.closest('[data-rw-more]')) {
      shown += STEP;
      render();
      document.querySelector('[data-rw-more]')?.focus();
    }
  });
  window.zenReleaseWeeks = { weeks, label, mondayOf };
})();
