'use strict';
// v2.55.0 (Sao Lưu Hằng Tuần): danh sách bản sao lưu trên máy chủ + khôi phục theo ngày, ở Cài đặt → Dữ liệu & đồng bộ.
// Máy chủ tự lưu mỗi Chủ nhật (server/backups.mjs); ở đây người dùng thấy các bản, sao lưu thêm một bản thủ công, xóa bản không cần,
// hoặc khôi phục về một ngày. Khôi phục KHÔNG phá dữ liệu hiện tại:
//   1. đẩy hết thay đổi chưa đồng bộ lên máy chủ (không đẩy được thì dừng, chưa đổi gì);
//   2. đọc và kiểm bản định khôi phục (hỏng / sai cấu trúc thì dừng);
//   3. nhờ máy chủ lưu dữ liệu hiện tại thành bản “Trước khi khôi phục” (không lưu được thì dừng);
//   4. rồi mới thay dữ liệu, như thao tác nhập bản sao (có thể hoàn tác trong Cài đặt).
(() => {
  const KINDS = { auto: 'Tự động', manual: 'Thủ công', restore: 'Trước khi khôi phục' };
  let items = null,
    info = { available: true, auto: true, keep: { auto: 8, other: 5 } },
    loadError = '',
    loading = false,
    busy = false,
    confirming = null,
    message = '',
    tone = '';

  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const size = (bytes) => (bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB');
  // Ngày và giờ lấy thẳng từ mã bản (theo giờ Việt Nam) để không lệch múi giờ của thiết bị.
  function when(id) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})(\d{2})\d{2})?-/.exec(id);
    if (!m) return id;
    return m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
  }
  const label = (item) => (KINDS[item.kind] || 'Bản sao') + ' · ' + when(item.id);
  const counts = (item) => item.projects + ' dự án · ' + item.tasks + ' việc · ' + item.notes + ' ghi chú · ' + size(item.size);

  function block() {
    return document.querySelector('#zen-backups');
  }
  function say(text, kind = '') {
    message = text;
    tone = kind;
    const el = block()?.querySelector('.zen-backups-status');
    if (el) {
      el.textContent = text;
      el.dataset.tone = kind;
    }
  }
  function paint() {
    const root = block();
    if (!root) return;
    const lock = busy || readOnly();
    // Mỗi câu một đoạn riêng để bộ đổi chữ Giang hồ khớp từng câu.
    const lines = !info.available
      ? ['Kho sao lưu trên máy chủ chưa sẵn sàng nên chưa lưu hay khôi phục được lúc này.']
      : [
          info.auto
            ? 'Mỗi Chủ nhật, hệ thống tự lưu một bản dữ liệu của bạn lên máy chủ và bỏ qua tuần bạn không đổi gì.'
            : 'Sao lưu tự động đang tắt; bạn vẫn sao lưu và khôi phục thủ công được.',
          'Giữ ' + info.keep.auto + ' bản tự động gần nhất; bản thủ công và bản “Trước khi khôi phục” giữ ' + info.keep.other + ' bản mỗi loại.',
          'Có thể khôi phục về một ngày bất kỳ; dữ liệu hiện tại luôn được lưu thành bản “Trước khi khôi phục” nên vẫn quay lại được. Tệp đính kèm không nằm trong bản sao lưu.',
        ];
    root.querySelector('.zen-backups-intro').innerHTML = lines.map((line) => '<p class="help-copy">' + esc(line) + '</p>').join('');
    root.querySelector('[data-zen-backup=make]').disabled = lock || !info.available;
    root.querySelector('[data-zen-backup=refresh]').disabled = busy || loading;
    const list = root.querySelector('.zen-backups-list');
    if (loading && !items) list.innerHTML = '<li class="zen-backups-empty">Đang tải danh sách…</li>';
    else if (loadError) list.innerHTML = '<li class="zen-backups-empty">Chưa tải được danh sách: ' + esc(loadError) + '</li>';
    else if (!items?.length)
      list.innerHTML = '<li class="zen-backups-empty">Chưa có bản sao lưu nào. Bản đầu tiên sẽ được lưu vào Chủ nhật tới, hoặc bấm “Sao lưu ngay”.</li>';
    else
      list.innerHTML = items
        .map((item) => {
          const id = esc(item.id),
            ask = confirming && confirming.id === item.id ? confirming.action : '';
          return (
            '<li class="zen-backup-row" data-backup="' + id + '" data-kind="' + esc(item.kind) + '">' +
            '<div class="zen-backup-main"><strong>' + esc(label(item)) + '</strong><small>' + esc(counts(item)) + '</small></div>' +
            (ask
              ? '<div class="zen-backup-ask" role="group" aria-label="Xác nhận"><p>' +
                (ask === 'restore'
                  ? 'Khôi phục dữ liệu về bản ' + esc(when(item.id)) + '? Dữ liệu hiện tại sẽ được lưu thành bản “Trước khi khôi phục”.'
                  : 'Xóa bản sao ' + esc(when(item.id)) + '? Không hoàn lại được.') +
                '</p><div class="zen-backup-actions"><button type="button" class="btn' + (ask === 'restore' ? ' primary' : ' danger') + '" data-zen-backup="' +
                (ask === 'restore' ? 'restore-yes' : 'delete-yes') + '" data-id="' + id + '"' + (lock ? ' disabled' : '') + '>' +
                (ask === 'restore' ? 'Khôi phục bản này' : 'Xóa bản sao') +
                '</button><button type="button" class="btn" data-zen-backup="cancel">Giữ nguyên</button></div></div>'
              : '<div class="zen-backup-actions"><button type="button" class="btn" data-zen-backup="restore" data-id="' + id + '" aria-label="Khôi phục về ' + esc(label(item)) + '"' +
                (lock ? ' disabled' : '') + '>Khôi phục</button><button type="button" class="btn" data-zen-backup="delete" data-id="' + id + '" aria-label="Xóa ' + esc(label(item)) + '"' +
                (busy ? ' disabled' : '') + '>Xóa</button></div>') +
            '</li>'
          );
        })
        .join('');
    const status = root.querySelector('.zen-backups-status');
    status.textContent = message;
    status.dataset.tone = tone;
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    loadError = '';
    paint();
    try {
      const result = await requestAPI('backups');
      info = { available: result.available !== false, auto: result.auto !== false, keep: result.keep || info.keep };
      items = Array.isArray(result.items) ? result.items : [];
    } catch (e) {
      loadError = e?.message || 'Không kết nối được máy chủ.';
      items = null;
    } finally {
      loading = false;
      paint();
    }
  }

  async function make() {
    if (busy) return;
    busy = true;
    say('Đang sao lưu…');
    paint();
    try {
      if (!(await settle())) throw Error('Dữ liệu trên thiết bị chưa đồng bộ xong nên chưa sao lưu. Hãy đồng bộ rồi thử lại.');
      const result = await requestAPI('backups', 'POST', { kind: 'manual' });
      say('Đã sao lưu: ' + label(result.item) + '.', 'ok');
      busy = false;
      await refresh();
    } catch (e) {
      say('Chưa sao lưu được: ' + (e?.message || 'lỗi không rõ') , 'error');
    } finally {
      busy = false;
      paint();
    }
  }

  // Đợi thay đổi chưa đồng bộ lên máy chủ xong (tối đa ~10 giây). Không đồng bộ được (mất mạng, xung đột, bị từ chối) thì trả về false.
  async function settle() {
    for (let i = 0; i < 25; i++) {
      if (!dirty && !syncing) return true;
      if (syncConflict || syncBlocked || !navigator.onLine) return false;
      await flushCloud(true);
      if (!dirty && !syncing) return true;
      await sleep(400);
    }
    return !dirty && !syncing;
  }

  async function restore(id) {
    if (busy || readOnly()) return;
    busy = true;
    confirming = null;
    say('Đang kiểm tra bản sao…');
    paint();
    let done = false;
    try {
      if (!(await settle())) throw Error('Dữ liệu hiện tại chưa đồng bộ xong nên chưa khôi phục (chưa đổi gì). Hãy đồng bộ rồi thử lại.');
      const target = await requestAPI('backups/' + encodeURIComponent(id));
      if (!target?.data || typeof target.data !== 'object' || !valid(target.data)) throw Error('Bản sao này không hợp lệ nên chưa khôi phục (chưa đổi gì).');
      say('Đang lưu dữ liệu hiện tại thành bản “Trước khi khôi phục”…');
      try {
        await requestAPI('backups', 'POST', { kind: 'restore' });
      } catch (e) {
        throw Error('Chưa lưu được bản hiện tại nên chưa khôi phục (chưa đổi gì): ' + (e?.message || 'lỗi không rõ'));
      }
      const previous = data;
      undoData = JSON.stringify(data);
      data = target.data;
      filterProject = '';
      filterStatus = '';
      if (save() === false) {
        data = previous;
        throw Error('Không lưu được dữ liệu đã khôi phục nên đã giữ nguyên dữ liệu hiện tại.');
      }
      done = true;
      items = null;
      document.querySelector('#editor')?.close();
      go('dashboard');
      notify('Đã khôi phục dữ liệu về bản ' + when(id) + '. Dữ liệu trước đó nằm trong mục “Trước khi khôi phục”.');
    } catch (e) {
      say(e?.message || 'Chưa khôi phục được.', 'error');
    } finally {
      busy = false;
      if (!done) paint();
    }
  }

  async function remove(id) {
    if (busy) return;
    busy = true;
    confirming = null;
    paint();
    try {
      await requestAPI('backups/' + encodeURIComponent(id), 'DELETE', {});
      say('Đã xóa bản sao.', 'ok');
      busy = false;
      await refresh();
    } catch (e) {
      say('Chưa xóa được bản sao: ' + (e?.message || 'lỗi không rõ'), 'error');
    } finally {
      busy = false;
      paint();
    }
  }

  function addBlock() {
    const group = document.querySelector('#editor-body details.wf-settings-group[data-group=data]');
    const content = group?.querySelector(':scope > .wf-settings-content');
    if (!group || !content || content.querySelector('#zen-backups')) return;
    const section = document.createElement('section');
    section.id = 'zen-backups';
    section.className = 'zen-backups';
    section.setAttribute('aria-labelledby', 'zen-backups-title');
    section.innerHTML =
      '<h4 id="zen-backups-title">Sao lưu hằng tuần</h4><div class="zen-backups-intro"></div>' +
      '<div class="zen-backup-actions"><button type="button" class="btn" data-zen-backup="make">Sao lưu ngay</button><button type="button" class="btn" data-zen-backup="refresh">Tải lại danh sách</button></div>' +
      '<p class="zen-backups-status" role="status" aria-live="polite"></p><ul class="zen-backups-list"></ul>';
    content.append(section);
    items = null;
    loadError = '';
    confirming = null;
    message = '';
    tone = '';
    paint();
    if (group.open) refresh();
  }

  const baseAccount = accountPanel;
  accountPanel = function () {
    baseAccount.apply(this, arguments);
    try {
      addBlock();
    } catch {
      // Cài đặt vẫn dùng được nếu không thêm được khối sao lưu.
    }
  };
  // Mở nhóm “Dữ liệu & đồng bộ” thì mới hỏi máy chủ (sự kiện toggle không nổi bọt nên bắt ở pha capture).
  document.addEventListener(
    'toggle',
    (e) => {
      if (e.target?.matches?.('details.wf-settings-group[data-group=data]') && e.target.open && block() && items === null && !loading) refresh();
    },
    true,
  );
  document.addEventListener('click', (e) => {
    const button = e.target.closest?.('[data-zen-backup]');
    if (!button || !block()?.contains(button)) return;
    const action = button.dataset.zenBackup,
      id = button.dataset.id || '';
    if (action === 'make') make();
    else if (action === 'refresh') refresh();
    else if (action === 'restore' || action === 'delete') {
      confirming = { id, action };
      paint();
      block()?.querySelector('.zen-backup-ask .btn')?.focus();
    } else if (action === 'cancel') {
      const id = confirming?.id;
      confirming = null;
      paint();
      block()?.querySelector('[data-backup="' + id + '"] .zen-backup-actions .btn')?.focus();
    } else if (action === 'restore-yes') restore(id);
    else if (action === 'delete-yes') remove(id);
  });
  window.zenBackups = { refresh, when, label };
})();
