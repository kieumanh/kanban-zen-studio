'use strict';
// v1.78.0: "Điểm tích lũy" — 8 chỉ số quan trọng của một đời người, cộng dần khi hoàn thành việc.
// Dữ liệu: data.growth = {v:1, hero:'nam'|'nu', name?, since, log:[{id,d,s,k?,n?,p:[8 số nguyên]}]} (cùng quy tắc với server/growth.mjs).
// p tính theo nửa điểm; điểm từng chỉ số = tổng p của sổ cái / 2. Sổ cái chỉ-thêm nên hai thiết bị cùng cộng điểm vẫn gộp được theo id.
// Chưa chọn nhân vật (chưa có data.growth) thì mọi thứ ở đây im lặng: không hỏi điểm khi xong việc.
(function () {
  const STEP = 0.5; // mỗi lần bấm + cộng 0,5 điểm
  const TASK_STEPS = 2; // mỗi việc hoàn thành được 2 lần cộng (1 điểm) để phân bổ
  const HABIT_STEPS = 6; // một việc hằng ngày đủ 7 ngày liền được 6 lần cộng (3 điểm)
  const LOG_MAX = 3000;
  const TIERS = [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
  // Thứ tự các chỉ số là cố định (chỉ số p[i] trong sổ cái); không đổi thứ tự sau khi đã phát hành.
  const AXES = [
    { id: 'nghiep', name: 'Nghiệp quả', sub: 'Phước đức · thiện hạnh', color: '#b0892a', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9',
      means: 'Việc thiện, lời nói đúng, giúp người không đòi đáp, hóa giải điều chưa tròn.',
      ideas: ['Giúp ai đó một việc nhỏ', 'Giữ đúng lời đã hứa', 'Cho đi, quyên góp, làm từ thiện', 'Xin lỗi hoặc hóa giải một hiềm khích'] },
    { id: 'tai', name: 'Tài lộc', sub: 'Tiền bạc · của cải', color: '#2e7d5b', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M14.6 9.3c-.6-.8-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2 0 2.7 5.2 1.4 5.2 4.1 0 1.2-1.1 2-2.6 2-1.1 0-2.1-.5-2.7-1.4 M12 6.5V8 M12 16v1.5',
      means: 'Thu nhập, tiết kiệm, đầu tư, nợ nần và kỷ luật chi tiêu.',
      ideas: ['Ghi chép thu chi', 'Hoàn thành việc tạo ra thu nhập', 'Tiết kiệm hoặc trả bớt nợ', 'Học một kiến thức tài chính'] },
    { id: 'tam', name: 'Tâm cảnh', sub: 'Tinh thần · bình an', color: '#7950c8', icon: 'M12 21c-5-2-8-6-8-11 3 0 6 1 8 4 2-3 5-4 8-4 0 5-3 9-8 11z M12 14V6',
      means: 'Sự an định trong tâm, thiền, cảm xúc ổn, ngủ nghỉ và buông bỏ lo âu.',
      ideas: ['Ngồi thiền hoặc thở có ý thức', 'Viết nhật ký, gọi tên cảm xúc', 'Dành thời gian yên tĩnh', 'Buông một việc không cần ôm'] },
    { id: 'duyen', name: 'Nhân duyên', sub: 'Mối quan hệ', color: '#d65380', icon: 'M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z',
      means: 'Gia đình, bạn bè, đồng nghiệp, cộng đồng và sự kết nối chân thành.',
      ideas: ['Gọi hoặc nhắn hỏi thăm người thân', 'Dành thời gian trọn vẹn cho gia đình', 'Cảm ơn hoặc động viên ai đó', 'Tham gia một hoạt động cộng đồng'] },
    { id: 'than', name: 'Thể lực', sub: 'Sức khỏe · thân thể', color: '#c8553d', icon: 'M13 3 6 13h5l-1 8 8-11h-5z',
      means: 'Vận động, ăn uống, giấc ngủ và chăm sóc cơ thể.',
      ideas: ['Đi bộ, tập võ, vận động', 'Ngủ đủ và đúng giờ', 'Ăn uống lành mạnh', 'Khám sức khỏe định kỳ'] },
    { id: 'tri', name: 'Trí tuệ', sub: 'Học hỏi · hiểu biết', color: '#3a6fb0', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M9 7h6',
      means: 'Học hỏi, đọc sách, kỹ năng mới và khả năng nhìn lại chính mình.',
      ideas: ['Đọc một chương sách', 'Học một khóa hoặc bài mới', 'Luyện một kỹ năng', 'Viết lại điều đã học được'] },
    { id: 'nghe', name: 'Sự nghiệp', sub: 'Công việc · sứ mệnh', color: '#2f7f9d', icon: 'M4 21V4 M4 5h12l-2 4 2 4H4',
      means: 'Tiến độ công việc chính, dự án, đóng góp chuyên môn và sứ mệnh nghề nghiệp.',
      ideas: ['Hoàn thành việc quan trọng của dự án', 'Giải quyết việc tồn đọng', 'Hoàn thiện một sản phẩm', 'Chia sẻ chuyên môn cho người khác'] },
    { id: 'vui', name: 'An vui', sub: 'Niềm vui · sáng tạo · nghỉ ngơi', color: '#e07a2e', icon: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      means: 'Niềm vui sống, sở thích, sáng tạo, nghỉ ngơi và nếp sống gọn gàng.',
      ideas: ['Làm một việc mình yêu thích', 'Sáng tạo hoặc thử điều mới', 'Dọn dẹp, sắp xếp chỗ ở', 'Nghỉ ngơi trọn vẹn, đi chơi'] },
  ];
  const HEROES = { nam: { label: 'Nam', title: 'Thiếu hiệp' }, nu: { label: 'Nữ', title: 'Tiên tử' } };
  const REALMS = [
    { at: 0, name: 'Phàm nhân' }, { at: 10, name: 'Luyện khí' }, { at: 30, name: 'Trúc cơ' },
    { at: 80, name: 'Kết đan' }, { at: 160, name: 'Nguyên anh' }, { at: 300, name: 'Hóa thần' },
  ];
  const SOURCE_LABEL = { task: 'Hoàn thành việc', habit: 'Đủ 7 ngày tích lũy', archive: 'Tổng hợp điểm cũ' };
  Object.assign(iconPaths, { growth: 'M8 3h8l5 5v8l-5 5H8l-5-5V8z M12 8l3 4-3 4-3-4z' });
  AXES.forEach((a) => (iconPaths['gr-' + a.id] = a.icon));

  // ---- Kiểm tra dữ liệu (cùng quy tắc với server/growth.mjs validGrowth) -------------------------------------------------
  const isDate = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  function validGrowth(g) {
    if (g === undefined) return true;
    if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
    if (!Object.keys(g).every((k) => ['v', 'hero', 'name', 'since', 'log', 'notify', 'tips'].includes(k))) return false;
    if (g.v !== 1 || !['nam', 'nu'].includes(g.hero) || !isDate(g.since)) return false;
    if (g.name !== undefined && (typeof g.name !== 'string' || g.name.length > 30)) return false;
    if (g.notify !== undefined && typeof g.notify !== 'boolean') return false;
    if (g.tips !== undefined && typeof g.tips !== 'boolean') return false;
    if (!Array.isArray(g.log) || g.log.length > LOG_MAX) return false;
    const seen = new Set();
    return g.log.every(
      (e) =>
        !!e && typeof e === 'object' && !Array.isArray(e) && Object.keys(e).every((k) => ['id', 'd', 's', 'k', 'n', 'p'].includes(k)) && typeof e.id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(e.id) &&
        !seen.has(e.id) && !!seen.add(e.id) && isDate(e.d) && ['task', 'habit', 'archive'].includes(e.s) &&
        (e.k === undefined || (typeof e.k === 'string' && e.k.length <= 120)) && (e.n === undefined || (typeof e.n === 'string' && e.n.length <= 120)) &&
        Array.isArray(e.p) && e.p.length === 8 && e.p.every((x) => Number.isInteger(x) && x >= 0 && x <= 1000000) && e.p.some((x) => x > 0),
    );
  }
  const validBeforeGrowth = valid;
  valid = function (d) {
    return validBeforeGrowth(d) && validGrowth(d.growth);
  };

  // ---- Mô hình ------------------------------------------------------------------------------------------------------------
  const growth = () => (data.growth && validGrowth(data.growth) ? data.growth : null);
  const started = () => !!growth();
  const fmt = (n) => String(Math.round(n * 2) / 2).replace('.', ',');
  const tierOf = (mx) => TIERS.find((t) => mx <= t) || Math.ceil(mx / 1000) * 1000;
  function scores() {
    const s = Array(8).fill(0), g = growth();
    if (g) for (const e of g.log) for (let i = 0; i < 8; i++) s[i] += e.p[i];
    return s.map((v) => v * STEP);
  }
  const total = (s) => s.reduce((a, b) => a + b, 0);
  function realmOf(t) {
    let i = 0;
    REALMS.forEach((r, k) => { if (t >= r.at) i = k; });
    const next = REALMS[i + 1];
    return { name: REALMS[i].name, next: next ? next.name : '', need: next ? next.at - t : 0, pct: next ? Math.round(((t - REALMS[i].at) / (next.at - REALMS[i].at)) * 100) : 100 };
  }
  function extremes(s) {
    const mx = Math.max(...s), mn = Math.min(...s);
    return { top: AXES[s.indexOf(mx)], low: AXES[s.indexOf(mn)], mx, mn };
  }
  const heroName = () => growth()?.name || HEROES[growth()?.hero || 'nam'].title;

  // ---- Biểu đồ mạng nhện (SVG) --------------------------------------------------------------------------------------------
  function radar(s, pending) {
    const CX = 200, CY = 192, R = 104, add = pending || Array(8).fill(0);
    const vals = s.map((v, i) => v + add[i] * STEP);
    const tier = tierOf(Math.max(...vals));
    const pt = (i, r) => {
      const a = ((-90 + i * 45) * Math.PI) / 180;
      return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    };
    const poly = (r) => AXES.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');
    const rings = [1, 2, 3, 4, 5].map((k) => '<polygon class="gr-ring' + (k === 5 ? ' gr-ring-outer' : '') + '" points="' + poly((R * k) / 5) + '"/>').join('');
    const spokes = AXES.map((_, i) => { const [x, y] = pt(i, R); return '<line class="gr-spoke" x1="' + CX + '" y1="' + CY + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>'; }).join('');
    const area = AXES.map((_, i) => pt(i, (R * Math.min(1, vals[i] / tier))).map((n) => n.toFixed(1)).join(',')).join(' ');
    const dots = AXES.map((a, i) => { const [x, y] = pt(i, R * Math.min(1, vals[i] / tier)); return '<circle class="gr-dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" style="fill:' + a.color + '"/>'; }).join('');
    const labels = AXES.map((a, i) => {
      const [x, y] = pt(i, R + 22), c = Math.cos(((-90 + i * 45) * Math.PI) / 180), sn = Math.sin(((-90 + i * 45) * Math.PI) / 180);
      const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
      const dy = sn < -0.5 ? -14 : sn > 0.5 ? 6 : -6;
      return '<text class="gr-label" x="' + x.toFixed(1) + '" y="' + (y + dy).toFixed(1) + '" text-anchor="' + anchor + '">' + esc(a.name) + '</text><text class="gr-value" x="' + x.toFixed(1) + '" y="' + (y + dy + 16).toFixed(1) + '" text-anchor="' + anchor + '">' + fmt(vals[i]) + '</text>';
    }).join('');
    const label = 'Biểu đồ mạng nhện 8 chỉ số: ' + AXES.map((a, i) => a.name + ' ' + fmt(vals[i])).join(', ') + '. Thang đo tối đa ' + tier + ' điểm.';
    return '<svg class="gr-radar" viewBox="0 0 400 384" role="img" aria-label="' + esc(label) + '">' + rings + spokes + '<polygon class="gr-area" points="' + area + '"/>' + dots + labels + '<text class="gr-scale" x="' + (CX + 7) + '" y="' + (CY - R - 5) + '">' + tier + '</text></svg>';
  }

  // ---- Trang Điểm tích lũy ------------------------------------------------------------------------------------------------
  let pickHero = 'nam';
  let changing = false;
  let reporting = false; // đang xem báo cáo tiến độ
  let poseMode = 'auto'; // 'auto' hoặc một tư thế cố định
  let poseNow = 'talk';
  let poseTimer = 0;
  let msgIndex = 0;

  const iconSvg = (name, size) => '<svg class="gr-ico" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + iconPaths[name] + '"/></svg>';

  function pickPanel() {
    const cur = growth();
    const cards = Object.entries(HEROES).map(([id, h]) =>
      '<label class="gr-card' + (pickHero === id ? ' is-on' : '') + '"><input type="radio" name="gr-hero" value="' + id + '"' + (pickHero === id ? ' checked' : '') + ' aria-label="Nhân vật ' + h.label.toLowerCase() + ': ' + h.title + '"><span class="gr-card-art">' + zenHero.svg(id, 'talk') + '</span><strong>' + h.title + '</strong><small>Nhân vật ' + h.label.toLowerCase() + '</small></label>').join('');
    return '<section class="panel gr-start" aria-labelledby="gr-pick-title"><h2 id="gr-pick-title">' + (cur ? 'Đổi nhân vật đồng hành' : 'Chọn nhân vật đồng hành') + '</h2>' +
      '<p class="help-copy">Nhân vật sẽ đồng hành cùng bạn và cho thấy nội lực của bạn qua từng việc hoàn thành. Điểm đã tích lũy được giữ nguyên khi đổi nhân vật.</p>' +
      '<div class="gr-pick" role="radiogroup" aria-label="Chọn nhân vật">' + cards + '</div>' +
      '<label class="field gr-name">Tên gọi của nhân vật (không bắt buộc)<input type="text" maxlength="30" data-gr-name placeholder="' + HEROES[pickHero].title + '" value="' + esc(cur?.name || '') + '"></label>' +
      '<div class="gr-start-actions"><button type="button" class="btn primary" data-gr-confirm>' + (cur ? 'Lưu nhân vật' : 'Bắt đầu hành trình') + '</button>' + (cur ? '<button type="button" class="btn" data-gr-cancel>Hủy</button>' : '') + '</div></section>' + axesGuide();
  }
  function axesGuide() {
    return '<section class="panel gr-guide"><h2>8 chỉ số của một đời người</h2><p class="help-copy">Mỗi chỉ số bắt đầu từ 0. Hoàn thành việc để cộng điểm cho chỉ số bạn vừa bồi bổ. Biểu đồ nối 8 điểm lại sẽ cho thấy bạn đang mạnh ở đâu và cần chăm thêm ở đâu.</p><ul class="gr-guide-list">' +
      AXES.map((a) => '<li style="--c:' + a.color + '"><span class="gr-guide-ico">' + iconSvg('gr-' + a.id, 20) + '</span><div><strong>' + a.name + '</strong> <small>' + a.sub + '</small><p>' + a.means + '</p></div></li>').join('') + '</ul></section>';
  }
  function bubbleText(pose, s) {
    const t = total(s), ex = extremes(s);
    const lines = {
      talk: [t === 0 ? 'Hoàn thành một việc để cộng điểm đầu tiên nhé!' : ex.low.name + ' đang thấp nhất, một việc nhỏ cũng đủ bồi bổ.', t === 0 ? 'Chào bạn! Mình sẽ đồng hành cùng bạn.' : ex.top.name + ' là thế mạnh của bạn lúc này!', 'Mỗi việc xong là một viên gạch cho cảnh giới mới.'],
      martial: ['Hà! Hà! Rèn thân, luyện ý!', 'Một đấm một việc, xong là có điểm!'],
      taichi: ['Nhu thắng cương, chậm mà chắc.', 'Thở đều, tay mềm, tâm vững.'],
      zen: ['Hít vào… thở ra… tâm yên.', 'Ngồi yên một chút cũng là tích lũy.'],
    };
    const list = lines[pose] || lines.talk;
    return list[msgIndex % list.length];
  }
  function stage(s) {
    const g = growth(), r = realmOf(total(s));
    const chips = [{ id: 'auto', label: 'Tự động' }, ...zenHero.POSES].map((p) => '<button type="button" class="gr-chip' + (poseMode === p.id ? ' is-on' : '') + '" data-gr-pose="' + p.id + '" aria-pressed="' + (poseMode === p.id) + '">' + p.label + '</button>').join('');
    return '<section class="panel gr-stage" aria-label="Nhân vật đồng hành"><div class="gr-stage-bg"><p class="gr-bubble" id="gr-bubble" role="status">' + esc(bubbleText(poseNow, s)) + '</p><div class="gr-figure" id="gr-figure">' + zenHero.svg(g.hero, poseNow) + '</div></div>' +
      '<div class="gr-poses" role="group" aria-label="Tư thế nhân vật">' + chips + '</div>' +
      '<div class="gr-realm"><div><span class="gr-realm-name">' + r.name + '</span><small>' + fmt(total(s)) + ' điểm' + (r.next ? ' · còn ' + fmt(r.need) + ' điểm tới ' + r.next : ' · cảnh giới cao nhất') + '</small></div><div class="progress" role="progressbar" aria-label="Tiến tới cảnh giới kế tiếp" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + r.pct + '"><span style="width:' + r.pct + '%"></span></div></div></section>';
  }
  function axisRows(s) {
    const tier = tierOf(Math.max(...s));
    return '<section class="panel gr-axes"><h2>Điểm từng chỉ số <small>Thang đo 0–' + tier + '</small></h2><ul class="gr-axis-list">' +
      AXES.map((a, i) => '<li style="--c:' + a.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + a.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + a.name + '</strong><b>' + fmt(s[i]) + '</b></div><div class="progress" aria-hidden="true"><span style="width:' + Math.min(100, (s[i] / tier) * 100).toFixed(1) + '%"></span></div><small>' + a.sub + '</small></div></li>').join('') + '</ul></section>';
  }
  function history() {
    const g = growth(), rows = [...g.log].reverse().slice(0, 12);
    const short = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
    if (!rows.length) return '<section class="panel gr-history"><h2>Lịch sử cộng điểm</h2><p class="help-copy">Chưa có lần cộng nào. Hoàn thành một việc, bảng cộng điểm sẽ hiện ra trước lời chúc mừng.</p></section>';
    return '<section class="panel gr-history"><h2>Lịch sử cộng điểm <small>12 lần gần nhất</small></h2><ul class="gr-history-list">' + rows.map((e) =>
      '<li><div><strong>' + esc(e.n || SOURCE_LABEL[e.s]) + '</strong><small>' + short(e.d) + ' · ' + SOURCE_LABEL[e.s] + '</small></div><span class="gr-chips">' + e.p.map((v, i) => (v ? '<i style="--c:' + AXES[i].color + '">' + AXES[i].name + ' +' + fmt(v * STEP) + '</i>' : '')).join('') + '</span></li>').join('') + '</ul></section>';
  }
  function page() {
    const g = growth();
    const intro = 'Hoàn thành việc để bồi bổ 8 chỉ số quan trọng của đời người. Mỗi lần cộng 0,5 điểm.';
    if (!g) return '<div class="gr-page">' + heading('ĐIỂM TÍCH LŨY', 'Hành trình nội lực', intro) + pickPanel() + '</div>';
    if (changing) return '<div class="gr-page">' + heading('ĐIỂM TÍCH LŨY', 'Hành trình nội lực', intro) + pickPanel() + '</div>';
    if (reporting) return reportPage();
    const s = scores(), r = realmOf(total(s)), ex = extremes(s);
    const sub = 'Cảnh giới ' + r.name + ' · ' + fmt(total(s)) + ' điểm';
    const summary = total(s) === 0
      ? 'Tất cả chỉ số đang ở 0. Hoàn thành một việc để bắt đầu.'
      : 'Mạnh nhất: <strong>' + ex.top.name + '</strong> (' + fmt(ex.mx) + ') · Cần bồi bổ nhất: <strong>' + ex.low.name + '</strong> (' + fmt(ex.mn) + ')';
    return '<div class="gr-page">' + heading('ĐIỂM TÍCH LŨY', 'Nội lực của ' + esc(heroName()), sub, '<div class="gr-head-actions"><button type="button" class="btn primary" data-gr-report>Xem báo cáo tiến độ</button><button type="button" class="btn" data-gr-change>Đổi nhân vật</button></div>') +
      '<div class="gr-grid">' + stage(s) + '<section class="panel gr-radar-panel" aria-label="Biểu đồ nội lực"><h2>Biểu đồ nội lực</h2><div class="gr-radar-wrap" id="gr-radar">' + radar(s) + '</div><p class="gr-summary">' + summary + '</p></section></div>' +
      axisRows(s) + history() + '<section class="panel gr-how"><h2>Cách tích điểm</h2><ul class="gr-how-list"><li>Mỗi việc hoàn thành cho bạn <strong>2 lần cộng</strong> (1 điểm). Bảng cộng điểm hiện ra trước lời chúc mừng.</li><li>Mỗi lần bấm nút <strong>+</strong> thêm 0,5 điểm vào chỉ số bạn chọn; dồn cả hai lần vào một chỉ số cũng được.</li><li>Mỗi việc chỉ được cộng điểm một lần.</li></ul></section></div>';
  }

  // ---- Hoạt họa nhân vật --------------------------------------------------------------------------------------------------
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function paintFigure() {
    const g = growth(), fig = document.querySelector('#gr-figure');
    if (!g || !fig || view !== 'growth') return;
    fig.innerHTML = zenHero.svg(g.hero, poseNow);
    const bubble = document.querySelector('#gr-bubble');
    if (bubble) bubble.textContent = bubbleText(poseNow, scores());
  }
  function stopTimer() {
    clearTimeout(poseTimer);
    poseTimer = 0;
  }
  function tick() {
    poseTimer = 0;
    if (view !== 'growth' || !growth() || changing || reporting) return;
    if (!document.hidden && !document.querySelector('dialog[open]')) {
      msgIndex++;
      if (poseMode === 'auto' && !reduced()) {
        const ids = zenHero.POSES.map((p) => p.id);
        if (msgIndex % 2 === 0) poseNow = ids[(ids.indexOf(poseNow) + 1) % ids.length];
      }
      paintFigure();
    }
    poseTimer = setTimeout(tick, 4500);
  }
  function startTimer() {
    if (poseTimer || !growth() || changing || reporting) return;
    poseTimer = setTimeout(tick, 4500);
  }

  // ---- Điều hướng ---------------------------------------------------------------------------------------------------------
  function addNav() {
    const anchor = document.querySelector('.sidebar [data-view="budget"]');
    let b = document.querySelector('.sidebar [data-view="growth"]');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav';
      b.dataset.view = 'growth';
      b.innerHTML = '<span>' + svgIcon('growth') + '</span>Điểm tích lũy';
    }
    if (anchor && anchor.previousElementSibling !== b) anchor.before(b);
    b.classList.toggle('active', view === 'growth');
  }
  const baseRender = render;
  render = function () {
    baseRender();
    addNav();
    if (view !== 'growth') {
      stopTimer();
      changing = false;
      reporting = false;
      return;
    }
    if (reporting) stopTimer();
    if (growth() && !document.querySelector('#gr-figure')) poseNow = poseMode === 'auto' ? 'talk' : poseMode;
    $('#crumb').textContent = 'Điểm tích lũy';
    $('#main').innerHTML = page();
    startTimer();
  };

  // ---- Bảng cộng điểm khi hoàn thành việc ---------------------------------------------------------------------------------
  let award = null;
  function awardColumns() {
    const s = scores();
    const tier = tierOf(Math.max(...s.map((v, i) => v + award.add[i] * STEP), 1));
    return AXES.map((a, i) => {
      const cur = s[i], extra = award.add[i] * STEP;
      return '<div class="gr-col" style="--c:' + a.color + '"><span class="gr-col-val">' + fmt(cur + extra) + (extra ? '<em>+' + fmt(extra) + '</em>' : '') + '</span>' +
        '<div class="gr-bar" aria-hidden="true"><i class="gr-bar-now" style="height:' + ((cur / tier) * 100).toFixed(1) + '%"></i><i class="gr-bar-add" style="height:' + ((extra / tier) * 100).toFixed(1) + '%;bottom:' + ((cur / tier) * 100).toFixed(1) + '%"></i></div>' +
        '<button type="button" class="gr-plus" data-gr-plus="' + i + '" aria-label="Cộng 0,5 điểm cho ' + a.name + '"' + (award.spent >= award.steps ? ' disabled' : '') + '>' + iconSvg('gr-' + a.id, 18) + '<b aria-hidden="true">+</b></button>' +
        '<span class="gr-col-name">' + a.name + '</span></div>';
    }).join('');
  }
  function paintAward() {
    if (!award) return;
    const left = award.steps - award.spent;
    award.el.querySelector('.gr-cols').innerHTML = awardColumns();
    award.el.querySelector('.gr-budget').innerHTML = left ? 'Còn <b>' + left + '</b> lần cộng · mỗi lần +' + fmt(STEP) + ' điểm' : 'Đã chia đủ <b>' + fmt(award.steps * STEP) + '</b> điểm. Bấm Lưu lại để ghi nhận.';
    award.el.querySelector('[data-gr-save]').disabled = award.spent === 0;
    award.el.querySelector('[data-gr-undo]').disabled = award.spent === 0;
    const live = award.el.querySelector('.gr-live');
    live.textContent = award.last == null ? '' : AXES[award.last].name + ': ' + fmt(scores()[award.last] + award.add[award.last] * STEP) + ' điểm';
  }
  function closeAward(commit) {
    const a = award;
    if (!a) return;
    let toastText = '';
    if (commit && a.spent > 0) {
      const entry = { id: uid(), d: today(), s: a.source, k: a.key, n: String(a.title || '').slice(0, 120), p: a.add.slice() };
      if (!a.key) delete entry.k;
      if (!entry.n) delete entry.n;
      const realmBefore = realmOf(total(scores())).name;
      if (!wfSave(() => { data.growth.log.push(entry); compact(); })) return notify('Chưa lưu được điểm. Hãy thử lại.');
      const realmAfter = realmOf(total(scores())).name;
      // Thông báo điểm nghiệp (bật mặc định, tắt ở Cài đặt → Thông báo): lên cảnh giới mới; với việc hằng ngày còn báo số điểm vừa cộng.
      if (growth()?.notify !== false) toastText = realmAfter !== realmBefore ? 'Chúc mừng! ' + heroName() + ' đã lên cảnh giới ' + realmAfter + '.' : a.source !== 'task' ? 'Đã cộng ' + fmt(a.spent * STEP) + ' điểm vào Điểm tích lũy.' : '';
    }
    award = null;
    a.el.close();
    a.el.remove();
    if (view === 'growth') render();
    if (typeof a.then === 'function') a.then();
    if (toastText) notify(toastText);
  }
  // Giữ sổ cái trong giới hạn: gộp các dòng cũ nhất thành một dòng "tổng hợp".
  function compact() {
    const g = data.growth;
    if (g.log.length <= LOG_MAX - 100) return;
    const old = g.log.splice(0, 500), p = Array(8).fill(0);
    old.forEach((e) => e.p.forEach((v, i) => (p[i] += v)));
    g.log.unshift({ id: 'a' + uid().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24), d: old.at(-1).d, s: 'archive', n: 'Tổng hợp ' + old.length + ' lần cộng đầu tiên', p });
  }
  function openAward(opt) {
    if (award) closeAward(false);
    const d = document.createElement('dialog');
    d.id = 'growth-award';
    d.className = 'gr-award';
    d.setAttribute('aria-labelledby', 'gr-award-title');
    d.innerHTML = '<form method="dialog" class="gr-award-form"><header><span class="eyebrow">ĐIỂM TÍCH LŨY</span><h2 id="gr-award-title">Bồi bổ nội lực</h2><p class="help-copy">' + (opt.lead ? esc(opt.lead) + ' ' : opt.title ? 'Bạn vừa hoàn thành “' + esc(opt.title) + '”. ' : '') + (opt.intro || 'Chọn chỉ số bạn muốn cộng điểm.') + '</p></header>' +
      '<p class="gr-budget" aria-live="polite"></p><div class="gr-cols" role="group" aria-label="Biểu đồ 8 chỉ số"></div><p class="gr-live sr-only" role="status" aria-live="polite"></p>' +
      '<footer class="gr-award-foot"><button type="button" class="btn ghost" data-gr-undo>Hoàn tác</button><span class="gr-grow"></span><button type="button" class="btn" data-gr-skip>Bỏ qua</button><button type="button" class="btn primary" data-gr-save>Lưu lại</button></footer></form>';
    document.body.append(d);
    award = { source: opt.source, key: opt.key, title: opt.title, steps: opt.steps, spent: 0, add: Array(8).fill(0), stack: [], last: null, el: d, then: opt.then };
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeAward(false);
    });
    paintAward();
    d.showModal();
    d.querySelector('.gr-plus')?.focus();
  }

  // Việc vừa hoàn thành: completionKindFor() luôn được gọi ngay trước celebrateCompletion() nên dùng nó để biết đó là việc nào.
  let lastDone = null;
  const baseKind = completionKindFor;
  completionKindFor = function (p, t) {
    lastDone = t ? { id: t.id, title: t.title, at: Date.now() } : null;
    return baseKind.apply(this, arguments);
  };
  const baseCelebrate = celebrateCompletion;
  celebrateCompletion = function (kind = 'check') {
    const ctx = lastDone;
    lastDone = null;
    const args = arguments;
    const task = ctx && kind !== 'check' ? data.projects.flatMap((p) => p.tasks).find((t) => t.id === ctx.id) : null;
    const g = growth();
    if (!g || contentReadOnly || !task || task.col !== 'Done' || Date.now() - ctx.at > 3000 || g.log.some((e) => e.k === 'task:' + task.id)) return baseCelebrate.apply(this, args);
    openAward({ source: 'task', key: 'task:' + task.id, title: task.title, steps: TASK_STEPS, then: () => baseCelebrate.apply(window, args) });
  };
  // Việc hằng ngày vừa đủ chuỗi 7, 14, 21… ngày liền (habits.js gọi sau khi tích): hỏi điểm một lần cho mỗi việc mỗi ngày.
  function habitStreak(h, n) {
    const g = growth(), key = ('habit:' + h.id + ':' + today()).slice(0, 120);
    if (!g || contentReadOnly || g.log.some((e) => e.k === key)) return;
    setTimeout(() => {
      if (award || !growth() || growth().log.some((e) => e.k === key)) return;
      openAward({ source: 'habit', key, title: h.name + ' · ' + n + ' ngày liền', lead: 'Tuyệt vời! “' + h.name + '” đã đủ ' + n + ' ngày tích lũy liền.', steps: HABIT_STEPS });
    }, 600);
  }

  // ---- Báo cáo tiến độ ----------------------------------------------------------------------------------------------------
  const DAY_MS = 864e5;
  const dayShift = (d, n) => new Date(new Date(d + 'T12:00:00Z').getTime() + n * DAY_MS).toISOString().slice(0, 10);
  const daysAgo = (t, d) => Math.round((new Date(t + 'T12:00:00Z') - new Date(d + 'T12:00:00Z')) / DAY_MS);
  const fmt1 = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const realLog = (g) => g.log.filter((e) => e.s !== 'archive');
  function windowSums(g, t) {
    const last = Array(8).fill(0), prev = Array(8).fill(0);
    for (const e of realLog(g)) {
      const ago = daysAgo(t, e.d), bucket = ago >= 0 && ago < 7 ? last : ago >= 7 && ago < 14 ? prev : null;
      if (bucket) e.p.forEach((v, i) => (bucket[i] += v * STEP));
    }
    return { last, prev };
  }
  // Số ngày liên tiếp (tính tới hôm nay, hoặc hôm qua nếu hôm nay chưa có) có ít nhất một lần cộng điểm.
  function activeStreak(g, t) {
    const days = new Set(realLog(g).map((e) => e.d));
    let d = days.has(t) ? t : dayShift(t, -1), n = 0;
    while (days.has(d)) {
      n++;
      d = dayShift(d, -1);
    }
    return n;
  }
  function levelOf(v, mean) {
    if (v <= 0) return { id: 'none', label: 'Chưa bắt đầu' };
    if (v >= mean * 1.25) return { id: 'high', label: 'Mạnh' };
    if (v >= mean * 0.75) return { id: 'mid', label: 'Vững' };
    return { id: 'low', label: 'Cần chăm' };
  }
  // Độ cân bằng 0–100: 100 khi 8 chỉ số bằng nhau; càng lệch càng thấp (độ lệch chuẩn so với trung bình).
  function balanceOf(s) {
    const mean = total(s) / 8;
    if (!mean) return { pct: 0, label: '' };
    const sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / 8), pct = Math.max(0, Math.round((1 - sd / mean) * 100));
    return { pct, label: pct >= 75 ? 'Cân bằng tốt' : pct >= 45 ? 'Hơi lệch' : 'Lệch rõ' };
  }
  function buildReport(t) {
    t = t || today();
    const g = growth(), s = scores(), tot = total(s), mean = tot / 8, w = windowSums(g, t);
    return {
      t, scores: s, total: tot, mean, realm: realmOf(tot), extremes: extremes(s), balance: balanceOf(s), entries: realLog(g).length,
      week: { last: total(w.last), prev: total(w.prev), byAxis: w.last }, streak: activeStreak(g, t),
      rows: AXES.map((a, i) => ({ axis: a, score: s[i], level: levelOf(s[i], mean) })),
      weak: AXES.map((_, i) => i).sort((x, y) => s[x] - s[y] || x - y).slice(0, 3),
    };
  }
  function tipsOf(rep) {
    const tips = [];
    if (rep.total === 0) {
      tips.push({ kind: 'start', title: 'Bắt đầu từ một việc nhỏ', text: 'Hoàn thành một việc bất kỳ rồi chia 1 điểm cho chỉ số bạn vừa bồi bổ. Chỉ cần vài việc là biểu đồ bắt đầu có hình dạng.', ideas: ['Ghi lại một khoản chi hôm nay (Tài lộc)', 'Nhắn hỏi thăm một người thân (Nhân duyên)', 'Đi bộ 10 phút (Thể lực)'] });
      return tips;
    }
    const { last, prev } = rep.week;
    if (last === 0) tips.push({ kind: 'trend', title: 'Tuần này chưa cộng điểm', text: '7 ngày qua chưa có lần cộng nào' + (prev ? ' (7 ngày trước: ' + fmt(prev) + ' điểm)' : '') + '. Chọn việc nhỏ nhất và hoàn thành nó để giữ đà.' });
    else if (last > prev) tips.push({ kind: 'trend', title: 'Đà đang tốt', text: '7 ngày qua bạn cộng ' + fmt(last) + ' điểm, nhiều hơn 7 ngày trước (' + fmt(prev) + ' điểm). Hãy giữ nhịp này.' });
    else if (last < prev) tips.push({ kind: 'trend', title: 'Đà chậm lại', text: '7 ngày qua bạn cộng ' + fmt(last) + ' điểm, ít hơn 7 ngày trước (' + fmt(prev) + ' điểm). Một việc nhỏ mỗi ngày là đủ để lấy lại nhịp.' });
    else tips.push({ kind: 'trend', title: 'Nhịp đều', text: '7 ngày qua bạn cộng ' + fmt(last) + ' điểm, bằng 7 ngày trước.' });
    const ex = rep.extremes;
    if (rep.balance.pct < 45) tips.push({ kind: 'balance', title: 'Cân bằng lại', text: 'Điểm đang dồn vào ' + ex.top.name + ' (' + fmt(ex.mx) + ') trong khi ' + ex.low.name + ' mới ' + fmt(ex.mn) + '. Trong 3 việc kế tiếp, thử dành ít nhất 1 lần cộng cho ' + ex.low.name + '.' });
    if (rep.realm.next && rep.realm.need <= 5) tips.push({ kind: 'realm', title: 'Sắp lên cảnh giới', text: 'Còn ' + fmt(rep.realm.need) + ' điểm nữa là tới ' + rep.realm.next + '.' });
    rep.weak.forEach((i) => {
      const a = AXES[i], v = rep.scores[i];
      tips.push({ kind: 'weak', axis: a.id, color: a.color, title: 'Bồi bổ ' + a.name, text: a.means + ' Hiện ' + fmt(v) + ' điểm' + (v < rep.mean ? ', thấp hơn mức trung bình ' + fmt1(rep.mean) + '.' : '.'), ideas: a.ideas.slice(0, 3) });
    });
    return tips;
  }
  function tipCard(t) {
    return '<article class="gr-tip" data-tip="' + t.kind + '"' + (t.axis ? ' data-axis="' + t.axis + '" style="--c:' + t.color + '"' : '') + '><h3>' + esc(t.title) + '</h3><p>' + esc(t.text) + '</p>' +
      (t.ideas ? '<ul>' + t.ideas.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') + '</article>';
  }
  function reportPage() {
    const rep = buildReport(), r = rep.realm, s = rep.scores, t = rep.t;
    const head = heading('ĐIỂM TÍCH LŨY', 'Báo cáo tiến độ', 'Cập nhật ' + t.slice(8, 10) + '/' + t.slice(5, 7) + ' · ' + esc(heroName()), '<div class="gr-head-actions"><button type="button" class="btn" data-gr-back>← Quay lại</button></div>');
    const tips = tipsOf(rep);
    if (rep.total === 0) return '<div class="gr-page gr-report">' + head + '<section class="panel gr-empty"><h2>Chưa có điểm để đánh giá</h2><p class="help-copy">Báo cáo sẽ có đánh giá từng chỉ số và đề xuất cải thiện sau lần cộng điểm đầu tiên.</p></section><section class="panel gr-tips"><h2>Gợi ý bắt đầu</h2><div class="gr-tip-list">' + tips.map(tipCard).join('') + '</div></section></div>';
    const tile = (id, label, value, sub) => '<div class="gr-tile" data-tile="' + id + '"><small>' + label + '</small><strong>' + value + '</strong><span>' + sub + '</span></div>';
    const tiles = '<div class="gr-tiles">' +
      tile('total', 'Tổng điểm', fmt(rep.total) + ' điểm', rep.entries + ' lần cộng') +
      tile('realm', 'Cảnh giới', r.name, r.next ? 'Còn ' + fmt(r.need) + ' điểm tới ' + r.next : 'Cảnh giới cao nhất') +
      tile('week', '7 ngày qua', '+' + fmt(rep.week.last) + ' điểm', '7 ngày trước đó: ' + fmt(rep.week.prev) + ' điểm') +
      tile('streak', 'Chuỗi ngày', rep.streak + ' ngày', 'liên tiếp có cộng điểm') + '</div>';
    const tier = tierOf(Math.max(...s));
    const rows = rep.rows.map((x, i) => '<li class="gr-eval-row" data-axis="' + x.axis.id + '" style="--c:' + x.axis.color + '"><span class="gr-axis-ico">' + iconSvg('gr-' + x.axis.id, 18) + '</span><div class="gr-axis-main"><div class="gr-axis-head"><strong>' + x.axis.name + '</strong><span class="gr-level is-' + x.level.id + '">' + x.level.label + '</span><b class="gr-eval-score">' + fmt(x.score) + '</b></div><div class="progress" aria-hidden="true"><span style="width:' + Math.min(100, (x.score / tier) * 100).toFixed(1) + '%"></span></div><small>' + (rep.week.byAxis[i] ? '+' + fmt(rep.week.byAxis[i]) + ' điểm trong 7 ngày qua' : 'Chưa có điểm trong 7 ngày qua') + '</small></div></li>').join('');
    const bal = '<p class="gr-balance">Độ cân bằng: <strong>' + rep.balance.label + '</strong> (' + rep.balance.pct + '%). ' + (rep.balance.pct >= 75 ? '8 chỉ số đang khá đều nhau.' : rep.balance.pct >= 45 ? 'Có vài chỉ số nhỉnh hơn hẳn các chỉ số còn lại.' : 'Điểm đang dồn vào vài chỉ số; hình nhện còn lệch.') + '</p>';
    const notes = tips.filter((x) => x.kind !== 'weak'), weak = tips.filter((x) => x.kind === 'weak');
    return '<div class="gr-page gr-report">' + head + tiles +
      '<div class="gr-rep-grid"><section class="panel gr-radar-panel" aria-label="Hình dạng nội lực"><h2>Hình dạng nội lực</h2><div class="gr-radar-wrap">' + radar(s) + '</div><p class="gr-summary">Mạnh nhất: <strong>' + rep.extremes.top.name + '</strong> (' + fmt(rep.extremes.mx) + ') · Cần bồi bổ nhất: <strong>' + rep.extremes.low.name + '</strong> (' + fmt(rep.extremes.mn) + ')</p></section>' +
      '<section class="panel gr-eval"><h2>Đánh giá từng chỉ số</h2>' + bal + '<ul class="gr-eval-list">' + rows + '</ul></section></div>' +
      '<section class="panel gr-tips"><h2>Đề xuất cải thiện</h2><div class="gr-tip-list">' + notes.map(tipCard).join('') + '</div><h3 class="gr-tips-sub">Việc nên bồi bổ trước</h3><div class="gr-tip-list">' + weak.map(tipCard).join('') + '</div><p class="help-copy">Đề xuất dựa trên điểm bạn tự cộng nên chỉ mang tính gợi ý.</p></section></div>';
  }
  // Cho các phần sau (đủ 7 ngày tích lũy, báo cáo) dùng chung.
  function openReport() {
    changing = false;
    reporting = true;
    go('growth');
  }
  window.zenGrowth = { AXES, started, scores, total, realmOf, extremes, fmt, openAward, growth, STEP, iconSvg, habitStreak, buildReport, tipsOf, openReport, heroName };

  // ---- Thao tác -----------------------------------------------------------------------------------------------------------
  document.addEventListener('change', (e) => {
    const r = e.target.closest?.('[name="gr-hero"]');
    if (!r) return;
    pickHero = r.value;
    document.querySelectorAll('.gr-card').forEach((c) => c.classList.toggle('is-on', c.querySelector('input').checked));
    const n = document.querySelector('[data-gr-name]');
    if (n) n.placeholder = HEROES[pickHero].title;
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-gr-plus],[data-gr-undo],[data-gr-skip],[data-gr-save],[data-gr-confirm],[data-gr-cancel],[data-gr-change],[data-gr-pose],[data-gr-report],[data-gr-back]');
    if (!t) return;
    if (t.dataset.grPlus !== undefined) {
      if (!award || award.spent >= award.steps) return;
      const i = Number(t.dataset.grPlus);
      award.add[i]++;
      award.spent++;
      award.stack.push(i);
      award.last = i;
      paintAward();
      const next = award.el.querySelector('[data-gr-plus="' + i + '"]');
      if (next && !next.disabled) next.focus();
      else award.el.querySelector('[data-gr-save]')?.focus();
      return;
    }
    if (t.hasAttribute('data-gr-undo')) {
      if (!award || !award.stack.length) return;
      award.add[award.stack.pop()]--;
      award.spent--;
      award.last = award.stack.length ? award.stack.at(-1) : null;
      return paintAward();
    }
    if (t.hasAttribute('data-gr-skip')) return closeAward(false);
    if (t.hasAttribute('data-gr-save')) return closeAward(true);
    if (t.hasAttribute('data-gr-report') || t.hasAttribute('data-gr-back')) {
      reporting = t.hasAttribute('data-gr-report');
      stopTimer();
      render();
      return window.scrollTo({ top: 0, left: 0 });
    }
    if (t.hasAttribute('data-gr-change')) {
      pickHero = growth()?.hero || 'nam';
      changing = true;
      stopTimer();
      return render();
    }
    if (t.hasAttribute('data-gr-cancel')) {
      changing = false;
      return render();
    }
    if (t.hasAttribute('data-gr-confirm')) {
      if (contentReadOnly) return notify('Bản chia sẻ chỉ có quyền xem.');
      const name = (document.querySelector('[data-gr-name]')?.value || '').trim().slice(0, 30);
      const ok = wfSave(() => {
        const cur = data.growth;
        data.growth = { v: 1, hero: pickHero, since: cur?.since || today(), log: cur?.log || [] };
        if (name) data.growth.name = name;
        if (cur?.notify !== undefined) data.growth.notify = cur.notify;
        if (cur?.tips !== undefined) data.growth.tips = cur.tips;
      });
      if (!ok) return notify('Chưa lưu được. Hãy thử lại.');
      changing = false;
      poseNow = 'talk';
      render();
      return;
    }
    if (t.dataset.grPose) {
      poseMode = t.dataset.grPose;
      if (poseMode !== 'auto') poseNow = poseMode;
      msgIndex++;
      render();
    }
  });
})();
