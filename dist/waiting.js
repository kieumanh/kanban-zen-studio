'use strict';
// v2.52.0 (Việc Chờ Người Khác): đánh dấu một việc đang chờ ai đó (tên người + ngày nhắc hỏi lại).
// Dữ liệu: hai trường tùy chọn ngay trên việc — waitFor (tên người, ≤ 60 ký tự) và waitUntil (YYYY-MM-DD, có thể trống). Không có waitFor là không chờ ai.
// Bản cũ bỏ qua hai trường này nên không mất gì; không đổi lược đồ.
// Hiện ở: trình sửa việc (nhập), thẻ việc (dòng “Đang chờ …”), Tổng quan (khối “Đang chờ” với nút “Đã có phản hồi” / “Nhắc lại sau 3 ngày”), chuông thông báo (đến ngày hẹn).
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

  // ---- Trình sửa việc ---------------------------------------------------------------------------------------------------------
  const base = taskForm;
  taskForm = function (p, t, col) {
    base.apply(this, arguments);
    const form = document.querySelector('#editor-form');
    if (!t || !form || !form.querySelector('[name=title]') || form.querySelector('[name=waitFor]')) return;
    const section = document.createElement('section');
    section.className = 'zen-task-section zen-wait';
    section.innerHTML =
      '<h3>Đang chờ người khác</h3>' +
      '<label class="field">Đang chờ ai<input name="waitFor" maxlength="' + WHO_MAX + '" autocomplete="off" placeholder="Ví dụ: anh Sơn, bên nhà in"></label>' +
      '<label class="field">Nhắc hỏi lại vào ngày<input name="waitUntil" type="date"></label>' +
      '<div class="zen-wait-presets" role="group" aria-label="Chọn nhanh ngày nhắc"><button type="button" class="btn" data-wait-preset="1">Ngày mai</button><button type="button" class="btn" data-wait-preset="3">3 ngày nữa</button><button type="button" class="btn" data-wait-preset="7">Tuần sau</button></div>' +
      '<p class="help-copy">Để trống tên nếu không chờ ai. Đến ngày hẹn, việc hiện ở chuông và Tổng quan để bạn hỏi lại.</p>';
    section.querySelector('[name=waitFor]').value = typeof t.waitFor === 'string' ? t.waitFor : '';
    section.querySelector('[name=waitUntil]').value = isDay(t.waitUntil) ? t.waitUntil : '';
    const anchor = form.querySelector('[name=end]')?.closest('.zen-task-section');
    if (anchor) anchor.after(section);
    else (form.querySelector('.modal-foot') || form).before(section);
    // Mốc “chưa đổi gì” của hộp sửa việc phải tính cả hai ô mới, nếu không mở rồi đóng sẽ báo sai là có thay đổi.
    if (typeof refreshTaskFormSnapshot === 'function') refreshTaskFormSnapshot();
  };
  // Hộp sửa việc được sắp lại thành các khối sau khi taskForm chạy xong (taskDetail làm việc đó), nên đặt khối này đúng chỗ — ngay dưới “Lịch & thời hạn” — ở bước cuối.
  const baseDetail = taskDetail;
  taskDetail = function () {
    const out = baseDetail.apply(this, arguments);
    const section = document.querySelector('#editor-form .zen-wait'),
      anchor = document.querySelector('#editor-form [name=end]')?.closest('.zen-task-section');
    if (section && anchor && anchor.nextElementSibling !== section) {
      anchor.after(section);
      // Thứ tự ô trong biểu mẫu đã đổi nên mốc “chưa đổi gì” phải chốt lại (không thì vừa mở đã bị coi là có thay đổi).
      if (typeof refreshTaskFormSnapshot === 'function') refreshTaskFormSnapshot();
    }
    return out;
  };
  document.addEventListener('click', (e) => {
    const preset = e.target.closest('[data-wait-preset]');
    if (!preset) return;
    const input = preset.closest('.zen-wait')?.querySelector('[name=waitUntil]');
    if (!input) return;
    input.value = plusDays(today(), Number(preset.dataset.waitPreset));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

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
