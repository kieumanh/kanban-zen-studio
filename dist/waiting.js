'use strict';
// v2.52.0 (Việc Chờ Người Khác): đánh dấu một việc đang chờ ai đó (tên người + ngày nhắc hỏi lại).
// Dữ liệu: hai trường tùy chọn ngay trên việc — waitFor (tên người, ≤ 60 ký tự) và waitUntil (YYYY-MM-DD, có thể trống). Không có waitFor là không chờ ai.
// Bản cũ bỏ qua hai trường này nên không mất gì; không đổi lược đồ.
// Hiện ở: thẻ việc (dòng “Đang chờ …”), Tổng quan (khối “Đang chờ” với nút “Đã có phản hồi” / “Nhắc lại sau 3 ngày”), chuông thông báo (đến ngày hẹn).
// v2.85.0: không còn ô nhập trong hộp sửa việc (đã gỡ theo yêu cầu); việc có dấu chờ cũ vẫn xử lý được qua Tổng quan.
(() => {
  const WHO_MAX = 60;
  const SNOOZE_DAYS = 3;
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const plusDays = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
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

  // Đổi dữ liệu trên việc gốc (allTasks trả về bản sao); lưu không được thì trả lại như cũ.
  function mutate(pid, tid, change) {
    if (typeof contentReadOnly !== 'undefined' && contentReadOnly) return false;
    const task = project(pid)?.tasks.find((x) => x.id === tid);
    if (!task) return false;
    const before = { had: ['waitFor', 'waitUntil'].map((k) => [k, Object.hasOwn(task, k), task[k]]) };
    change(task);
    if (save() === false) {
      for (const [k, had, v] of before.had) had ? (task[k] = v) : delete task[k];
      return false;
    }
    return true;
  }

  // ---- Trình sửa việc: v2.85.0 đã gỡ khối “Đang chờ người khác” khỏi hộp sửa việc. Dữ liệu waitFor / waitUntil trên việc được giữ nguyên
  // (lưu việc không đụng hai trường này), nên thẻ, Tổng quan và chuông vẫn hiện đúng cho các việc đã có dấu chờ.
  // Mốc “chưa đổi gì” của hộp sửa việc được chốt lại sau khi ứng dụng sắp xếp xong hộp (như bản trước v2.85.0),
  // không thì mở việc rồi bấm Esc sẽ báo là có thay đổi chưa lưu. Việc từ chuông mở hộp khi hộp đang hiện danh sách nhắc nên không thể chỉ chốt khi hộp đóng.
  const baseDetail = taskDetail;
  taskDetail = function () {
    const out = baseDetail.apply(this, arguments);
    if (typeof refreshTaskFormSnapshot === 'function') refreshTaskFormSnapshot();
    return out;
  };

  // ---- Thẻ việc -----------------------------------------------------------------------------------------------------------------
  const chipHTML = (info) =>
    '<div class="task-card-wait' + (isDue(info) ? ' is-due' : '') + '"><span class="wait-label">Đang chờ</span> <b class="wait-who">' + esc(info.who) + '</b>' +
    (info.until ? ' · <span class="wait-when">' + esc(whenLabel(info)) + '</span>' : '') + '</div>';
  const baseCard = taskCard;
  taskCard = function (t, p) {
    const html = baseCard.apply(this, arguments),
      info = waitInfo(t);
    if (!info || !html) return html;
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const card = template.content.firstElementChild;
    if (!card) return html;
    const anchor = card.querySelector('.task-card-decision') || card.querySelector('h3');
    if (anchor) anchor.insertAdjacentHTML('beforebegin', chipHTML(info));
    else card.insertAdjacentHTML('beforeend', chipHTML(info));
    return card.outerHTML;
  };

  // ---- Tổng quan: khối “Đang chờ” --------------------------------------------------------------------------------------------
  const SHOWN = 6;
  function panelHTML(list) {
    const ro = typeof contentReadOnly !== 'undefined' && contentReadOnly;
    return (
      '<h2>Đang chờ <small>' + list.length + ' việc</small></h2>' +
      list
        .slice(0, SHOWN)
        .map(({ t, info }) => {
          const key = esc(t.project.id) + '|' + esc(t.id);
          return (
            '<div class="wait-row' + (isDue(info) ? ' is-due' : '') + '">' +
            '<button type="button" class="work-task-row" data-task="' + esc(t.id) + '" data-pid="' + esc(t.project.id) + '"><strong>' + esc(t.title) + '</strong>' +
            '<small><span class="wait-label">Đang chờ</span> <b class="wait-who">' + esc(info.who) + '</b>' + (info.until ? ' · <span class="wait-when">' + esc(whenLabel(info)) + '</span>' : '') + '</small></button>' +
            (ro ? '' : '<div class="wait-actions"><button type="button" class="text-btn" data-wait-got="' + key + '">Đã có phản hồi</button><button type="button" class="text-btn" data-wait-snooze="' + key + '">Nhắc lại sau ' + SNOOZE_DAYS + ' ngày</button></div>') +
            '</div>'
          );
        })
        .join('') +
      (list.length > SHOWN ? '<p class="subtext">Còn ' + (list.length - SHOWN) + ' việc đang chờ nữa; mở từng việc trong dự án để xem.</p>' : '')
    );
  }
  function paintPanel() {
    document.querySelector('#main .wf-wait-panel')?.remove();
    if (view !== 'dashboard') return;
    const list = waiting();
    if (!list.length) return;
    const panel = document.createElement('section');
    panel.className = 'panel wf-wait-panel';
    panel.setAttribute('aria-label', 'Đang chờ người khác');
    panel.innerHTML = panelHTML(list);
    const plan = document.querySelector('#main .wf-today-plan');
    if (plan) plan.after(panel);
    else document.querySelector('#main')?.append(panel);
  }
  const baseRender = render;
  render = function () {
    const out = baseRender.apply(this, arguments);
    try {
      paintPanel();
    } catch {
      /* khối này không được làm hỏng việc vẽ lại trang */
    }
    return out;
  };

  document.addEventListener('click', (e) => {
    const got = e.target.closest('[data-wait-got]'),
      snooze = e.target.closest('[data-wait-snooze]');
    const hit = got || snooze;
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    const [pid, tid] = (got ? got.dataset.waitGot : snooze.dataset.waitSnooze).split('|');
    const ok = got
      ? mutate(pid, tid, (task) => {
          delete task.waitFor;
          delete task.waitUntil;
        })
      : mutate(pid, tid, (task) => {
          task.waitUntil = plusDays(today(), SNOOZE_DAYS);
        });
    if (!ok) return notify('Chưa cập nhật được. Hãy thử lại.');
    render();
    notify(got ? 'Đã ghi nhận phản hồi, việc không còn ở mục Đang chờ.' : 'Sẽ nhắc lại sau ' + SNOOZE_DAYS + ' ngày.');
  });

  // ---- Chuông thông báo: đến ngày hẹn hỏi lại ----------------------------------------------------------------------------------
  const dueWaits = () => waiting().filter((x) => isDue(x.info));
  const seenKey = ({ t, info }) => 'zen-wait-seen:' + currentUser?.id + ':' + t.id + ':' + info.until;
  const unseen = () => dueWaits().filter((x) => !localRead(seenKey(x)));
  const baseBell = refreshBell;
  refreshBell = function () {
    baseBell.apply(this, arguments);
    if (!currentUser) return;
    const waits = unseen();
    if (!waits.length) return;
    const base = Number(bell.querySelector('.notification-count')?.textContent.replace('+', '') || 0),
      count = base + waits.length;
    bell.innerHTML = svgIcon('bell') + '<span class="notification-count">' + (count > 99 ? '99+' : count) + '</span>';
    bell.setAttribute('aria-label', 'Thông báo · ' + count + ' chưa xem');
  };
  const baseBellClick = bell.onclick;
  bell.onclick = function () {
    baseBellClick.apply(this, arguments);
    const list = document.querySelector('#editor-body .notice-list');
    if (!list) return;
    list.insertAdjacentHTML(
      'afterbegin',
      dueWaits()
        .map(
          ({ t, info }) =>
            '<button type="button" class="notice-item" data-wait-open="' + esc(t.project.id) + '|' + esc(t.id) + '"><strong>' + svgIcon('bell') + ' Đến lúc hỏi lại</strong><span>' + esc(t.title) +
            '</span><small><span class="wait-label">Đang chờ</span> <b class="wait-who">' + esc(info.who) + '</b> · <span class="wait-when">' + esc(whenLabel(info)) + '</span></small><span class="notice-detail-link">Xem chi tiết →</span></button>',
        )
        .join(''),
    );
    const all = document.querySelector('#clear-file-alerts');
    if (all) {
      const prior = all.onclick;
      all.onclick = function () {
        dueWaits().forEach((x) => localWrite(seenKey(x), '1'));
        prior?.apply(this, arguments);
        refreshBell();
      };
    }
  };
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-wait-open]');
    if (!open) return;
    const [pid, tid] = open.dataset.waitOpen.split('|'),
      p = project(pid),
      t = p?.tasks.find((x) => x.id === tid);
    if (!t) return;
    const info = waitInfo(t);
    if (info) localWrite(seenKey({ t, info }), '1');
    refreshBell();
    taskDetail(p, t);
  });

  window.zenWaiting = { info: waitInfo, due: dueWaits, label: whenLabel, list: waiting };
})();
