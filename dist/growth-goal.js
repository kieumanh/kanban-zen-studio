'use strict';
// v2.69.0 (Tâm Nguyện): mỗi người một đường tu — đặt mức chú trọng riêng cho tám phương thay vì mặc định tám phương ngang nhau.
// Dữ liệu: một trường tùy chọn của Điểm tích lũy, `data.growth.goal` = mảng 8 số nguyên 1–5 theo đúng thứ tự AXES (1 Nhẹ · 2 Vừa · 3 Cân bằng · 4 Chú trọng · 5 Hết lòng).
// Thiếu trường (hoặc cả tám bằng nhau) = cân bằng như trước: gợi ý vẫn chọn phương có điểm thấp nhất. Có tâm nguyện thì “yếu” là lệch so với mục tiêu:
//   mục tiêu phương i = tổng điểm tu vi × trọng số i / tổng trọng số; độ hụt = mục tiêu − điểm hiện có; chọn phương hụt nhiều nhất. Hai phương hụt gần ngang (chênh dưới
//   0,5 điểm) thì chọn phương lâu chưa được bồi bổ hơn (chưa từng thì trước), còn ngang nữa thì theo thứ tự ô. Không đổi điểm đã có, không tự cộng điểm.
// Gợi ý Nhân xoay vòng bằng nút “Gợi ý khác” (hai cặp cho mỗi loại cho mình / cho người); cặp đầu chính là hai gợi ý có sẵn từ v2.62.0.
(() => {
  const NAMES = ['Nhẹ', 'Vừa', 'Cân bằng', 'Chú trọng', 'Hết lòng'];
  const DEFAULT = 3;
  const NEAR = 0.5;
  // Hai gợi ý thêm cho mỗi loại, mỗi phương (cặp thứ hai). Giọng mời gọi, không răn dạy.
  const EXTRA = {
    dao: { self: ['Đọc một trang kinh sách hoặc lời hay rồi ngẫm một lát', 'Nhìn lại một việc hôm nay mình đã làm chưa đúng ý, nhẹ nhàng sửa'], give: ['Nhường một chỗ, một lượt cho người đến sau', 'Khen thật lòng một người mà thường ngày ít ai nhắc tới'] },
    tai: { self: ['Xem lại một khoản chi định mua và hỏi mình có thật cần', 'Học một điều nhỏ giúp tăng thu nhập hoặc giảm chi tiêu'], give: ['Mua của người làm ăn nhỏ quen thay vì nơi lớn, nếu giá hợp lý', 'Chỉ cho người thân một cách quản lý tiền mình đã thấy hiệu quả'] },
    tam: { self: ['Ra chỗ thoáng, nhìn xa một phút trước khi làm việc kế tiếp', 'Gác điện thoại mười phút để chỉ làm một việc'], give: ['Hỏi thăm một người rồi chỉ lắng nghe, chưa vội khuyên', 'Nhắn một lời động viên cho người đang gặp lúc khó'] },
    duyen: { self: ['Mời một người bạn cũ uống nước hoặc trò chuyện ngắn', 'Viết vài dòng nhớ ơn một người đã giúp mình'], give: ['Nhớ ngày quan trọng của người thân và gửi lời chúc', 'Dành mười phút gặp một người đang lẻ loi'] },
    than: { self: ['Giãn người và vươn vai năm phút giữa buổi', 'Uống đủ nước và ăn một bữa có rau hôm nay'], give: ['Nhắc người thân đi khám hoặc nghỉ ngơi đúng lúc', 'Rủ một người lâu chưa vận động ra ngoài đi dạo'] },
    tri: { self: ['Nghe một bài giảng hoặc podcast bổ ích trên đường đi', 'Tập một kỹ năng mới trong mười lăm phút'], give: ['Giải đáp một thắc mắc cho người đang học', 'Giới thiệu một cuốn sách hay cho người bạn quan tâm'] },
    nghe: { self: ['Dọn lại danh sách việc, chọn ba việc quan trọng nhất cho ngày mai', 'Dành một khối giờ liền mạch cho việc khó nhất'], give: ['Ghi nhận công sức của đồng nghiệp bằng một lời cảm ơn cụ thể', 'Nhận hướng dẫn cho người mới vào nhóm một việc nhỏ'] },
    gia: { self: ['Cùng cả nhà ăn một bữa, tắt tivi và điện thoại', 'Sắp lại một ngăn đồ chung cho dễ tìm'], give: ['Hỏi người nhà hôm nay có việc gì mình có thể đỡ một tay', 'Nói một lời cảm ơn với người vẫn lặng lẽ lo việc nhà'] },
  };
  let rot = 0;
  const growthData = () => (window.zenGrowth && window.zenGrowth.growth ? window.zenGrowth.growth() : null);
  const readOnly = () => typeof contentReadOnly !== 'undefined' && contentReadOnly;
  const esc_ = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  const okWeights = (w) => Array.isArray(w) && w.length === 8 && w.every((x) => Number.isInteger(x) && x >= 1 && x <= 5);
  // Trọng số đang áp dụng hoặc null (cân bằng).
  function weights() {
    const w = growthData() && growthData().goal;
    return okWeights(w) && !w.every((x) => x === w[0]) ? w : null;
  }
  // Phương cần bồi bổ nhất theo tâm nguyện. s = điểm hiện có từng phương; last(i) = ngày gần nhất phương i được bồi bổ ('' nếu chưa).
  // Trả null khi cân bằng hoặc chưa có điểm (growth.js dùng cách chọn cũ).
  function focus(s, last) {
    const w = weights(), total = s.reduce((a, b) => a + b, 0);
    if (!w || !total) return null;
    const sum = w.reduce((a, b) => a + b, 0);
    const target = w.map((x) => (total * x) / sum);
    const gap = target.map((x, i) => x - s[i]);
    const top = Math.max(...gap);
    const near = gap.map((_, i) => i).filter((i) => top - gap[i] < NEAR);
    near.sort((x, y) => (last(x) || '').localeCompare(last(y) || '') || x - y);
    return { w: near[0], target, gap, near };
  }
  // Cặp gợi ý đang hiện (cặp đầu = gợi ý có sẵn; cặp hai = gợi ý thêm).
  function pick(axisId, kind, base) {
    const more = (EXTRA[axisId] && EXTRA[axisId][kind]) || [];
    return rot % 2 === 1 && more.length ? more : base;
  }
  const hasMore = (axisId) => !!EXTRA[axisId];
  const nextButton = () => '<p class="gr-cult-more"><button type="button" class="btn" data-goal-next>Gợi ý khác</button></p>';

  function panel(rep) {
    const G = window.zenGrowth;
    if (!G || !growthData()) return '';
    const s = rep.scores, total = s.reduce((a, b) => a + b, 0);
    const set = okWeights(growthData().goal) ? growthData().goal : null;
    const w = set || Array(8).fill(DEFAULT);
    const sum = w.reduce((a, b) => a + b, 0);
    const ro = readOnly();
    const rows = G.AXES.map((a, i) => {
      const opts = NAMES.map((n, k) => '<option value="' + (k + 1) + '"' + (w[i] === k + 1 ? ' selected' : '') + '>' + n + ' · ' + (k + 1) + '</option>').join('');
      const note = total ? 'hiện ' + G.fmt(s[i]) + ' điểm · ứng ' + G.fmt(Math.round(((total * w[i]) / sum) * 2) / 2) + ' điểm theo tâm nguyện' : 'chưa có điểm';
      return (
        '<li style="--c:' + esc_(a.color) + '"><label class="gr-goal-row"><span class="gr-goal-name"><strong>' + esc_(a.name) + '</strong><small>' + note + '</small></span>' +
        '<select data-goal-axis="' + i + '" aria-label="Mức chú trọng ' + esc_(a.name) + '"' + (ro ? ' disabled' : '') + '>' + opts + '</select></label></li>'
      );
    }).join('');
    return (
      '<section class="panel gr-goal" aria-labelledby="gr-goal-title"><h2 id="gr-goal-title" tabindex="-1">Tâm nguyện</h2>' +
      '<p class="help-copy">Mỗi người một đường tu. Đặt mức chú trọng cho từng phương: gợi ý tu luyện bên dưới sẽ theo tâm nguyện này, không còn mặc định tám phương ngang nhau. Điểm đã có không đổi.</p>' +
      '<ul class="gr-goal-list">' + rows + '</ul>' +
      '<p class="gr-goal-state" role="status">' + (weights() ? 'Đang theo tâm nguyện của các hạ.' : 'Đang cân bằng: tám phương ngang nhau.') + '</p>' +
      (ro ? '' : '<p><button type="button" class="btn" data-goal-reset' + (set ? '' : ' disabled') + '>Đặt lại cân bằng</button></p>') +
      '</section>'
    );
  }
  function save(change, label, focusSel) {
    if (readOnly()) return;
    const ok = wfSave(() => change(data.growth));
    if (!ok) return;
    notify(label);
    render();
    document.querySelector(focusSel)?.focus?.();
  }
  document.addEventListener('change', (e) => {
    const sel = e.target.closest && e.target.closest('[data-goal-axis]');
    if (!sel) return;
    const i = Number(sel.dataset.goalAxis), v = Number(sel.value), name = window.zenGrowth.AXES[i].name;
    if (!Number.isInteger(i) || i < 0 || i > 7 || !Number.isInteger(v) || v < 1 || v > 5) return;
    save(
      (g) => {
        const w = okWeights(g.goal) ? g.goal.slice() : Array(8).fill(DEFAULT);
        w[i] = v;
        if (w.every((x) => x === DEFAULT)) delete g.goal;
        else g.goal = w;
      },
      'Đã ghi tâm nguyện: ' + name + ' · ' + NAMES[v - 1] + '.',
      '[data-goal-axis="' + i + '"]',
    );
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-goal-reset]')) {
      return save((g) => { delete g.goal; }, 'Đã trở về cân bằng: tám phương ngang nhau.', '#gr-goal-title');
    }
    if (e.target.closest && e.target.closest('[data-goal-next]')) {
      rot++;
      render();
      document.querySelector('[data-goal-next]')?.focus?.();
    }
  });
  window.zenGoal = { weights, focus, pick, hasMore, nextButton, panel, NAMES, EXTRA };
})();
