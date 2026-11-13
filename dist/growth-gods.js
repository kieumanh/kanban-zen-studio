// v2.13.0 (Thần Giới): thế giới của các vị thần phía sau Thiên Môn (cánh cửa cấp 99 → 100), theo yêu cầu của chủ dự án:
//  - 5 Thần Vương đứng đầu, quản mọi sự vụ của Thần giới;
//  - 12 Phương thần (thần cao đẳng) chủ quản 12 phương, mỗi phương mang tên một địa chi;
//  - 36 Thiên Cang tinh là chủ lực chiến đấu, bảo vệ Thần giới và các thế giới khác; mỗi phương có 3 vị;
//  - thần vị không mở thêm, chỉ kế thừa từ vị sắp gác ngôi hoặc đi ngao du vũ trụ.
// Nối với Truyện ký (dist/growth-tale.js, chương 97 và 100): hiệp khách kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang, thuộc
// phương Hợi; ngôi Phương thần phương Hợi bỏ trống từ khi Vô Yểm bị đày, tới khi nó đòi lại trong thân Lệ Vô Khuyết (Huyết Nguyệt).
// Tên các vị thần và phương là sáng tác riêng của ứng dụng. Tệp này chỉ có dữ liệu và khung "Thần giới" trong trang Tu vi.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const G = () => window.zenGrowth;

  // Năm Thần Vương: [mã, tên, chủ, việc coi sóc]. Trường Lưu sắp gác ngôi để đi ngao du vũ trụ.
  const KINGS = [
    ['so', 'Thái Sơ', 'Sinh', 'Khai sinh các cõi, định ngôi cho thần mới.'],
    ['luu', 'Trường Lưu', 'Thời', 'Giữ dòng thời gian của mọi thế giới.', 'Sắp gác ngôi để đi ngao du vũ trụ.'],
    ['tuong', 'Vạn Tượng', 'Giới', 'Coi ranh giới và những cánh cửa giữa các thế giới, kể cả Thiên Môn.'],
    ['luat', 'Minh Luật', 'Luật', 'Giữ thần luật, xét xử thần phạm lỗi.'],
    ['nguyen', 'Quy Nguyên', 'Tịch', 'Đưa những gì đã trọn vẹn trở về nguồn.'],
  ].map(([id, name, rule, duty, note]) => ({ id, name, title: name + ' Thần Vương', rule, duty, note: note || '' }));

  // Mười hai Phương thần: [địa chi, tên, điều chủ quản].
  const LORDS = [
    ['Tý', 'Huyền Minh', 'đêm sâu và nước lặng'],
    ['Sửu', 'Hậu Tải', 'đất dày chở muôn vật'],
    ['Dần', 'Khai Dương', 'rạng đông và mọi khởi đầu'],
    ['Mão', 'Thanh Mộc', 'mùa xuân và sự lớn lên'],
    ['Thìn', 'Vân Vũ', 'mây mưa điều hòa'],
    ['Tỵ', 'Xích Diễm', 'lửa và lòng nhiệt thành'],
    ['Ngọ', 'Chính Dương', 'giữa trưa và sự minh bạch'],
    ['Mùi', 'Phong Nhiêu', 'mùa màng no đủ'],
    ['Thân', 'Kim Cương', 'kỷ luật và sự bền vững'],
    ['Dậu', 'Thu Liễm', 'thu hoạch và biết đủ'],
    ['Tuất', 'Trấn Thủ', 'biên giới giữa các cõi'],
    ['Hợi', 'Huyết Nguyệt', 'đêm tàn trước rạng đông'],
  ].map(([chi, name, domain], i) => ({ i, chi, name, title: name + ' phương thần', domain }));
  const VACANT = 11; // phương Hợi: ngôi bỏ trống cho tới khi hiệp khách thành Thần (chương 100)

  // Ba mươi sáu Thiên Cang tinh, theo thứ tự ngôi; mỗi phương ba vị: [tên, việc trấn giữ].
  const STARS = [
    ['Minh Báo', 'Ghi sổ nhân quả của cõi người.'],
    ['Thông Bảo', 'Giữ cho của cải các cõi chảy mà không tràn.'],
    ['Tịch Chiếu', 'Canh cõi mộng, giữ giấc ngủ của muôn loài.'],
    ['Kết Duyên', 'Giữ những mối dây giữa người với người.'],
    ['Xuân Sinh', 'Chăm mầm sống ở cõi linh thú.'],
    ['Động Vi', 'Giữ thư khố của Thần giới.'],
    ['Tích Vi', 'Đắp trường thành biên giới, mỗi ngày một viên đá.'],
    ['Thái Hòa', 'Giữ nhịp ngày và đêm.'],
    ['Chính Quả', 'Hộ tống những linh hồn đã trọn hạnh.'],
    ['Lưu Kim', 'Canh những dòng sông sao.'],
    ['An Lan', 'Dẹp sóng ở biển giữa các cõi.'],
    ['Đồng Tâm', 'Dẫn đội tiên phong, chưa từng bỏ lại ai.'],
    ['Kiện Hành', 'Tuần tra không nghỉ quanh cõi băng.'],
    ['Cách Vật', 'Tìm nguyên do của mọi dị tượng.'],
    ['Khai Sơn', 'Mở đường qua những dãy núi giữa các thế giới.'],
    ['Trú Dạ', 'Canh ranh giới sáng tối ở cõi lửa.'],
    ['Hồi Hướng', 'Đem công đức trả về nơi đã gieo.'],
    ['Tán Tụ', 'Gom mây, thả mưa cho những cõi khô hạn.'],
    ['Chỉ Thủy', 'Giữ mặt hồ soi trời của Thần giới.'],
    ['Tri Âm', 'Nghe tiếng kêu cứu từ mọi cõi.'],
    ['Dưỡng Chính', 'Chữa lành cho thần và người sau mỗi trận chiến.'],
    ['Vấn Tân', 'Dẫn đường cho kẻ lạc giữa các thế giới.'],
    ['Trì Hằng', 'Giữ ngọn đèn chưa từng tắt ở cửa Thần giới.'],
    ['Trương Thỉ', 'Xạ thủ số một, biết lúc căng và lúc chùng dây cung.'],
    ['Thiện Căn', 'Canh những hạt giống lành ở cõi âm.'],
    ['Tiết Độ', 'Giữ kho lương của ba mươi sáu Thiên Cang.'],
    ['Định Phong', 'Đứng giữa bão mà vạt áo không lay.'],
    ['Hòa Quang', 'Sống lẫn giữa cõi người để che chở.'],
    ['Cố Bản', 'Giữ gốc rễ của cây nối các cõi.'],
    ['Minh Kính', 'Soi ra chân tướng sau mọi lớp mặt nạ.'],
    ['Đại Thành', 'Thống lĩnh trường thành ngăn hư không.'],
    ['Tiêu Dao', 'Kiếm khách lang thang, thắng trận rồi ngủ ba ngày.'],
    ['Thiên Hình', 'Giữ phép cho Thần giới, tay cầm thước ngọc.'],
    ['Phong Đăng', 'Coi mùa màng của những cõi vừa qua hạn.'],
    ['Vô Ba', 'Mạnh nhất Thiên Cang, tâm như mặt nước không gợn.'],
    ['Hằng Nguyệt', 'Giữ vầng trăng yên của cõi người.'],
  ].map(([name, duty], i) => ({ i, no: i + 1, name, title: name + ' tinh quân', duty, lord: Math.floor(i / 3) }));
  const SEAT = 35; // ngôi Hằng Nguyệt: ngôi hiệp khách kế thừa ở cấp 100

  // Thứ bậc thần vị theo cấp: 100 Thiên Cang tinh quân → 101 Thượng Thần → 102 Phương Thần → 103 Thần Vương.
  const RANKS = [
    { lv: 100, name: 'Thiên Cang tinh quân', note: 'Kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang.' },
    { lv: 101, name: 'Thượng Thần', note: 'Đứng đầu Thiên Cang, đủ tư cách thách đấu Phương thần.' },
    { lv: 102, name: 'Phương Thần', note: 'Kế thừa một trong mười hai phương.' },
    { lv: 103, name: 'Thần Vương', note: 'Kế thừa ngôi của một Thần Vương gác ngôi.' },
  ];

  const level = () => (G()?.started() ? G().realmOf(G().total(G().earnedScores())).level : -1);
  const isGod = () => level() >= (G()?.GOD || 100);

  // ---- Thiên đồ: 5 Thần Vương ở giữa, 12 Phương thần vòng trong, 36 Thiên Cang tinh vòng ngoài -----------------------------------
  // Phương Tý ở trên cùng (chính Bắc), đi theo chiều kim đồng hồ.
  function chart(god) {
    const C = 180, at = (r, deg) => [(C + r * Math.cos(((deg - 90) * Math.PI) / 180)).toFixed(1), (C + r * Math.sin(((deg - 90) * Math.PI) / 180)).toFixed(1)];
    const spokes = LORDS.map((_, p) => {
      const [x1, y1] = at(62, p * 30 + 15), [x2, y2] = at(160, p * 30 + 15);
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    }).join('');
    const stars = STARS.map((s) => {
      const [x, y] = at(148, s.lord * 30 + ((s.i % 3) - 1) * 9.5), me = s.i === SEAT;
      return '<circle class="gr-gods-star' + (me ? ' is-seat' + (god ? ' is-mine' : '') : '') + ' gr-gods-t' + (s.i % 4) + '" cx="' + x + '" cy="' + y + '" r="' + (me ? 6.5 : 4.2) + '"/>';
    }).join('');
    const lords = LORDS.map((l) => {
      const [x, y] = at(104, l.i * 30), blood = l.i === VACANT;
      return '<g class="gr-gods-lord' + (blood ? (god ? ' is-blood' : ' is-vacant') : '') + '"><circle cx="' + x + '" cy="' + y + '" r="15"/><text x="' + x + '" y="' + (Number(y) + 3.6) + '" text-anchor="middle">' + l.chi + '</text></g>';
    }).join('');
    const kings = KINGS.map((k, i) => {
      const [x, y] = at(34, i * 72);
      return '<circle class="gr-gods-king" cx="' + x + '" cy="' + y + '" r="9.5"/>';
    }).join('');
    const label = 'Thiên đồ Thần giới: 5 Thần Vương ở giữa, 12 Phương thần ở vòng trong theo mười hai địa chi, 36 Thiên Cang tinh ở vòng ngoài, mỗi phương ba vị.' +
      (god ? ' Ngôi Hằng Nguyệt ở phương Hợi đang sáng: ngôi của hiệp khách.' : ' Ngôi Hằng Nguyệt ở phương Hợi đang chờ người kế thừa.');
    return '<svg class="gr-gods-chart" viewBox="0 0 360 360" role="img" aria-label="' + label + '">' +
      '<circle class="gr-gods-ring" cx="180" cy="180" r="148"/><circle class="gr-gods-ring" cx="180" cy="180" r="104"/><circle class="gr-gods-ring is-core" cx="180" cy="180" r="56"/>' +
      '<g class="gr-gods-spokes">' + spokes + '</g>' + stars + lords +
      '<polygon class="gr-gods-penta" points="' + KINGS.map((_, i) => at(34, i * 72).join(',')).join(' ') + '"/>' + kings + '</svg>';
  }

  function panel() {
    const g = G();
    if (!g?.started()) return '';
    const lv = level(), god = lv >= g.GOD, name = esc(g.heroName());
    const state = god ? 'Ngôi Hằng Nguyệt · phương Hợi' : 'Mở ở cấp ' + g.GOD;
    const lead = god
      ? name + ' đã qua Thiên Môn và kế thừa ngôi Hằng Nguyệt, ngôi thứ 36 của Thiên Cang, thuộc phương Hợi. Phía trên là mười hai Phương thần và năm Thần Vương.'
      : 'Phía sau Thiên Môn, cánh cửa từ cấp 99 lên cấp 100, là Thần giới. Thành Thần ở cấp ' + g.GOD + ', ' + name + ' sẽ kế thừa một ngôi trong ba mươi sáu Thiên Cang.';
    const tiers = [
      ['5', 'Thần Vương', 'Đứng đầu Thần giới, cùng quyết mọi sự vụ.'],
      ['12', 'Phương thần', 'Thần cao đẳng, mỗi vị chủ quản một phương.'],
      ['36', 'Thiên Cang tinh', 'Chủ lực chiến đấu, bảo vệ Thần giới và các thế giới khác.'],
    ].map(([n, t, d]) => '<li><b>' + n + '</b><span><strong>' + t + '</strong><small>' + d + '</small></span></li>').join('');
    const ranks = RANKS.map((r) => {
      const cls = lv > r.lv ? ' is-done' : lv === r.lv ? ' is-now' : '';
      return '<li class="gr-gods-rank' + cls + '"' + (lv === r.lv ? ' aria-current="step"' : '') + '><b>Cấp ' + r.lv + '</b><span><strong>' + r.name + '</strong><small>' + r.note + '</small></span></li>';
    }).join('');
    const kings = KINGS.map((k) => '<li><strong>' + esc(k.title) + '</strong><em>Chủ ' + k.rule + '</em><small>' + esc(k.duty) + (k.note ? ' ' + esc(k.note) : '') + '</small></li>').join('');
    const regions = LORDS.map((l) => {
      const vacant = l.i === VACANT && !god;
      const head = vacant ? 'Ngôi bỏ trống' : esc(l.title);
      const sub = vacant ? 'Chủ cũ bị đày vì nuốt đồng liêu; chưa ai kế thừa.' : l.i === VACANT ? 'Vô Yểm đòi lại ngôi cũ trong thân Lệ Vô Khuyết.' : 'Chủ quản ' + esc(l.domain) + '.';
      const stars = STARS.filter((s) => s.lord === l.i).map((s) => {
        const mine = s.i === SEAT;
        const tag = mine ? '<em class="gr-gods-tag">' + (god ? 'Ngôi của ' + name : 'Chờ người kế thừa') + '</em>' : '';
        return '<li' + (mine ? ' class="is-seat"' : '') + '><b>' + s.no + '</b><span><strong>' + esc(s.title) + '</strong><small>' + esc(s.duty) + '</small></span>' + tag + '</li>';
      }).join('');
      return '<li class="gr-gods-region' + (l.i === VACANT ? (god ? ' is-blood' : ' is-vacant') : '') + '" data-chi="' + l.chi + '"><div class="gr-gods-region-head"><i aria-hidden="true">' + l.chi + '</i><span><strong>Phương ' + l.chi + ' · ' + head + '</strong><small>' + sub + '</small></span></div><ol class="gr-gods-stars" start="' + (l.i * 3 + 1) + '">' + stars + '</ol></li>';
    }).join('');
    return '<section class="panel gr-gods-panel" aria-labelledby="gr-gods-title"><h2 id="gr-gods-title">Thần giới <small>' + state + '</small></h2>' +
      '<p class="help-copy">' + lead + '</p>' +
      '<div class="gr-gods-top">' + chart(god) + '<ul class="gr-gods-tiers">' + tiers + '</ul></div>' +
      '<p class="gr-gods-law"><strong>Thần vị không mở thêm, chỉ kế thừa.</strong> Thần giới luôn có đúng 5 Thần Vương, 12 Phương thần và 36 Thiên Cang tinh. Muốn có ngôi, phải được một vị sắp gác ngôi hoặc sắp đi ngao du vũ trụ truyền lại.</p>' +
      '<ol class="gr-gods-ranks" aria-label="Thứ bậc thần vị theo cấp">' + ranks + '</ol>' +
      '<details class="gr-gods-more"><summary>Năm Thần Vương</summary><ul class="gr-gods-kings">' + kings + '</ul></details>' +
      '<details class="gr-gods-more"><summary>Mười hai phương và ba mươi sáu Thiên Cang tinh</summary><ol class="gr-gods-regions">' + regions + '</ol></details></section>';
  }

  window.zenGods = { KINGS, LORDS, STARS, RANKS, SEAT, VACANT, chart, panel };
})();
