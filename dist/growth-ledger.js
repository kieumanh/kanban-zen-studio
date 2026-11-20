'use strict';
// v2.70.0 (Hồi Quang): nối hộp “Đổi bảo vật” (growth.js) với Thu chi (budget.js). Bảo vật có giá tiền thật thì người dùng nhập số tiền và chọn đại sự;
// bấm Ghi vào sổ bảo vật sẽ ghi LUÔN một khoản chi vào đại sự ấy trong cùng một lần lưu (wfSave: lỗi thì cả hai cùng hoàn lại).
// Dữ liệu: không trường mới. Khoản chi là một dòng ledger đúng hình dạng của budget.js {id,type:'out',amount,category:'Bảo vật',note,date}.
// Tùy chọn: để trống số tiền thì không ghi gì (hành vi cũ). Chỉ cho lần quy đổi mới; sửa một lần quy đổi không đụng tới khoản chi đã ghi.
// v2.74.0 (Khoản Chi Liền): lần quy đổi nhớ khoản chi vừa ghi (trường tùy chọn lp + li trên dòng quy đổi); hủy lần quy đổi thì hỏi có xóa luôn khoản chi ấy không (xem voidSpend ở growth.js).
(() => {
  const MAX_ENTRIES = 5000;
  const MAX_AMOUNT = 1e12;
  const CATEGORY = 'Bảo vật';
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const money = (n) => Math.round(n).toLocaleString('vi-VN') + ' ₫';
  function projects() {
    const list = typeof visibleProjects === 'function' ? visibleProjects() : (data.projects || []).filter((p) => !p.archived);
    return list.filter((p) => !p.archived && (Array.isArray(p.ledger) ? p.ledger.length : 0) < MAX_ENTRIES);
  }
  // Khối nhập trong hộp quy đổi; trống nếu chưa có đại sự nào còn chỗ.
  function fieldset() {
    const list = projects();
    if (!list.length) return '';
    const pick = list.find((p) => p.id === (typeof active === 'string' ? active : '')) || list[0];
    return (
      '<section class="gr-spend-money" aria-labelledby="gr-spend-money-title"><h3 id="gr-spend-money-title">Ghi vào Thu chi <small>(không bắt buộc)</small></h3>' +
      '<p class="help-copy">Bảo vật có giá tiền thật thì nhập số tiền, ứng dụng ghi luôn một khoản chi vào đại sự đã chọn. Để trống thì không ghi gì.</p>' +
      '<div class="gr-spend-money-row"><label class="field">Số tiền (₫)<input name="money" inputmode="numeric" autocomplete="off" placeholder="0"></label>' +
      '<label class="field">Ghi vào đại sự<select name="mproj">' + list.map((p) => '<option value="' + esc_(p.id) + '"' + (p === pick ? ' selected' : '') + '>' + esc_(p.name) + '</option>').join('') + '</select></label></div></section>'
    );
  }
  // Đọc ô nhập: { amount: 0 nếu bỏ trống } hoặc { error, field }.
  function read(form) {
    const el = form.elements.money;
    if (!el) return { amount: 0 };
    const raw = String(el.value || '').trim();
    if (!raw) return { amount: 0 };
    const amount = parseInt(digits(raw) || '0', 10);
    if (!(amount > 0) || amount > MAX_AMOUNT) return { error: 'Số tiền chưa đúng. Hãy nhập số nguyên lớn hơn 0, hoặc để trống nếu không ghi Thu chi.', field: 'money' };
    const p = (data.projects || []).find((x) => x.id === form.elements.mproj?.value);
    if (!p || p.archived) return { error: 'Chưa tìm thấy đại sự này. Hãy chọn đại sự khác.', field: 'mproj' };
    if ((Array.isArray(p.ledger) ? p.ledger.length : 0) >= MAX_ENTRIES) return { error: 'Đại sự này đã đủ ' + MAX_ENTRIES + ' khoản thu chi.', field: 'mproj' };
    return { amount, pid: p.id };
  }
  // Gọi BÊN TRONG wfSave của lần quy đổi: ném lỗi (để hoàn lại cả hai) nếu đại sự không còn.
  function add(r, name, day) {
    if (!r || !(r.amount > 0)) return null;
    const p = (data.projects || []).find((x) => x.id === r.pid);
    if (!p || p.archived) throw Error('Đại sự không còn để ghi Thu chi.');
    const list = Array.isArray(p.ledger) ? p.ledger.slice() : [];
    if (list.length >= MAX_ENTRIES) throw Error('Đại sự đã đủ ' + MAX_ENTRIES + ' khoản thu chi.');
    const entry = { id: uid(), type: 'out', amount: r.amount, category: CATEGORY, note: ('Đổi bảo vật: ' + name).slice(0, 200), date: day };
    list.push(entry);
    p.ledger = list;
    r.entryId = entry.id;
    return p;
  }
  // v2.74.0 (Khoản Chi Liền): dấu nối giữa lần quy đổi và khoản chi vừa ghi ({ lp: mã đại sự, li: mã khoản chi }); mã lạ (không qua được kiểm của máy chủ) thì không nối.
  const ID_OK = /^[A-Za-z0-9_-]{1,99}$/;
  function link(p, r) {
    return p && r && r.entryId && ID_OK.test(p.id) && ID_OK.test(r.entryId) ? { lp: p.id, li: r.entryId } : null;
  }
  // Khoản chi còn nguyên của lần quy đổi (đại sự còn, khoản chi còn, vẫn là khoản chi): { p, entry } hoặc null. Khoản chi đã bị xóa tay thì coi như không còn.
  function linked(e) {
    if (!e || !e.lp || !e.li) return null;
    const p = (data.projects || []).find((x) => x.id === e.lp);
    const entry = p && Array.isArray(p.ledger) ? p.ledger.find((x) => x.id === e.li && x.type === 'out') : null;
    return entry ? { p, entry } : null;
  }
  // Gọi BÊN TRONG wfSave của lần hủy: xóa đúng khoản chi đã nối và gỡ dấu nối. Trả về true nếu đã xóa.
  function unlink(e) {
    const l = linked(e);
    delete e.lp;
    delete e.li;
    if (!l) return false;
    l.p.ledger = l.p.ledger.filter((x) => x.id !== l.entry.id);
    return true;
  }
  const note = (r, p) => (p ? ' Đã ghi khoản chi ' + money(r.amount) + ' vào ' + p.name + '.' : '');
  window.zenLedger = { fieldset, read, add, note, link, linked, unlink, money, CATEGORY };
})();
