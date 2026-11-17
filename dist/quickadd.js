'use strict';
// v2.35.0 (Thêm Nhanh): gõ một câu tự nhiên như “Gọi anh Sơn mai 9h #farm” → việc có tên, hạn (ngày, giờ) và dự án.
// Bộ phân tích là hàm thuần (zenQuick.parse): nhận câu + ngữ cảnh {today, minutes, projects, activeId} và trả về kết quả; không đụng dữ liệu.
// Chỉ chạy trên thiết bị: không gửi câu gõ đi đâu, không dùng AI. Việc tạo ra có đúng hình dạng như việc tạo từ biểu mẫu “Thêm một bước tiến mới”.
(() => {
  const DAY = 86400000;
  const WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const pad = (n) => String(n).padStart(2, '0');
  const utc = (y, m, d) => Date.UTC(y, m - 1, d);
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const isoMs = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return utc(y, m, d);
  };
  const dow = (ms) => new Date(ms).getUTCDay();
  const mondayOf = (ms) => ms - ((dow(ms) + 6) % 7) * DAY;
  const validYMD = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
  const nowVN = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0) % 24;
    return get('hour') * 60 + get('minute');
  };

  // ---- Chuẩn hóa: lower giữ dấu (để phân biệt “mốt” / “một”, “thứ” / “thư”), fold bỏ dấu (để người gõ không dấu vẫn được). Cả hai cùng độ dài với câu gốc.
  const lowerChar = (c) => {
    const l = c.toLowerCase();
    return l.length === 1 ? l : c;
  };
  const foldChar = (c) => {
    if (c === 'đ') return 'd';
    const n = c.normalize('NFD');
    return n.length ? n[0] : c;
  };
  function prep(text) {
    const src = String(text).normalize('NFC');
    let lower = '',
      fold = '';
    for (let i = 0; i < src.length; i++) {
      const c = lowerChar(src[i]);
      lower += c;
      fold += foldChar(c);
    }
    return { src, lower, fold };
  }
  const B0 = '(?<![a-z0-9])';
  const B1 = '(?![a-z0-9])';
  const PERIODS = { sang: 'sáng', trua: 'trưa', chieu: 'chiều', toi: 'tối', dem: 'đêm' };
  const PERIOD_RE = '(sang|trua|chieu|toi|dem)';
  // Từ nối đứng ngay trước ngày/giờ (“trước thứ 6”, “vào lúc 9h”, “hạn 20/11”) cũng được gỡ khỏi tên việc. Dùng bản có dấu để “đèn” không bị nhầm với “đến”.
  const CONNECTOR_RE = /(?<![\p{L}\p{N}])(?:trước lúc|truoc luc|trước ngày|truoc ngay|trước|truoc|vào lúc|vao luc|vào ngày|vao ngay|vào|vao|lúc|luc|đến)\s*$/u;
  // “hạn”, “deadline” chỉ là từ nối khi đứng đầu câu hoặc sau dấu câu (“Nộp báo cáo, hạn 20/11”); “gia hạn 20/11” thì “hạn” là một phần tên việc.
  const DEADLINE_RE = /(?:^|[,;:(–—-])\s*(?:hạn chót|han chot|hạn|han|deadline)\s*:?\s*$/u;
  // Tên người/vật hay đứng trước “mai” (hoa mai, chị Mai…): không coi là “ngày mai”.
  const MEAL_WORDS = new Set(['an', 'bua', 'uong', 'dung', 'nau', 'soan']);
  const NOT_BEFORE_MAI =new Set(['hoa', 'cay', 'bong', 'vuon', 'chi', 'co', 'ba', 'ong', 'anh', 'em', 'thay', 'ban', 'ten', 'be', 'cu', 'di', 'bac']);

  function matchProject(tag, projects, activeId) {
    const t = prep(tag.replace(/[_-]+/g, ' ')).fold.trim();
    if (!t) return null;
    let best = null,
      score = 0;
    for (const p of projects) {
      const n = prep(p.name).fold.replace(/[^a-z0-9]+/g, ' ').trim();
      const words = n.split(' ');
      const flat = n.replace(/ /g, '');
      let s = 0;
      if (n === t || flat === t.replace(/ /g, '')) s = 100;
      else if (words.includes(t)) s = 80;
      else if (n.startsWith(t)) s = 70;
      else if (words.some((w) => w.startsWith(t))) s = 60;
      else if (t.length >= 3 && n.includes(t)) s = 40;
      if (s && p.id === activeId) s += 1;
      if (s > score) {
        score = s;
        best = p;
      }
    }
    return best;
  }

  // ---- Ngày -----------------------------------------------------------------------------------------------------------------
  const WD_WORD = { hai: ['hai'], ba: ['ba'], tu: ['tư', 'tu'], nam: ['năm', 'nam'], sau: ['sáu', 'sau'], bay: ['bảy', 'bay'] };
  const WD_NUM = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, hai: 1, ba: 2, tu: 3, nam: 4, sau: 5, bay: 6 };

  function* all(re, text) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      yield m;
      if (m[0] === '') re.lastIndex++;
    }
  }

  // Trả về danh sách ứng viên ngày theo thứ tự ưu tiên; mỗi ứng viên: {s, e, ms, keep?} với keep = giữ nguyên cụm trong tên việc.
  function dateCandidates(P, todayMs, taken) {
    const { src, lower, fold } = P;
    const free = (s, e) => {
      for (let i = s; i < e; i++) if (taken[i]) return false;
      return true;
    };
    const out = [];
    const push = (m, ms, extra = {}) => {
      if ((ms == null && extra.w == null) || !free(m.index, m.index + m[0].length)) return;
      out.push({ s: m.index, e: m.index + m[0].length, ms, ...extra });
    };
    const [ty, tm, td] = iso(todayMs).split('-').map(Number);

    // 1. dd/mm/yyyy, dd-mm-yyyy
    for (const m of all(new RegExp(`(?<![0-9/-])(?:ngay\\s+)?(\\d{1,2})\\s*([/-])\\s*(\\d{1,2})\\s*\\2\\s*(\\d{4}|\\d{2})(?![0-9/-])`, 'g'), fold)) {
      const [d, mo] = [Number(m[1]), Number(m[3])];
      const y = m[4].length === 2 ? 2000 + Number(m[4]) : Number(m[4]);
      if (validYMD(y, mo, d)) push(m, utc(y, mo, d));
    }
    // 2. dd/mm
    // “1/2 ngày”, “3/4 phần” là phân số, không phải ngày.
    for (const m of all(new RegExp(`(?<![0-9/-])(?:ngay\\s+)?(\\d{1,2})\\s*/\\s*(\\d{1,2})(?![0-9/])(?!\\s*(?:ngay|gio|tieng|kg|lit|cai|phan|trang|buoi|tuan|thang|chuong|bai|muc|nguoi|viec|lan|so|ban|cuon|quyen|tap|dong|nam))`, 'g'), fold)) {
      const [d, mo] = [Number(m[1]), Number(m[2])];
      if (!validYMD(ty, mo, d) && !(mo === 2 && d === 29)) continue;
      let y = ty;
      if (!validYMD(y, mo, d) || utc(y, mo, d) < todayMs) y++;
      while (!validYMD(y, mo, d) && y < ty + 8) y++;
      if (validYMD(y, mo, d)) push(m, utc(y, mo, d));
    }
    // 3. ngày D tháng M  /  D tháng M
    for (const m of all(new RegExp(`${B0}(?:ngay\\s*)?(\\d{1,2})\\s*thang\\s*(\\d{1,2})(?![0-9/])`, 'g'), fold)) {
      const [d, mo] = [Number(m[1]), Number(m[2])];
      let y = ty;
      if (!validYMD(y, mo, d) || utc(y, mo, d) < todayMs) y++;
      while (!validYMD(y, mo, d) && y < ty + 8) y++;
      if (validYMD(y, mo, d)) push(m, utc(y, mo, d));
    }
    // 4. ngày D (ngày D tiếp theo, kể cả hôm nay)
    for (const m of all(new RegExp(`${B0}ngay\\s+(\\d{1,2})(?![0-9/]|\\s*thang)`, 'g'), fold)) {
      const d = Number(m[1]);
      let ms = null;
      for (let i = 0; i < 14 && ms == null; i++) {
        const idx = tm - 1 + i,
          mo = (idx % 12) + 1,
          y = ty + Math.floor(idx / 12);
        if (validYMD(y, mo, d) && utc(y, mo, d) >= todayMs) ms = utc(y, mo, d);
      }
      push(m, ms);
    }
    // 5. N ngày nữa / sau N ngày / N tuần nữa / sau N tuần
    for (const m of all(new RegExp(`${B0}(?:sau\\s*(\\d{1,3})\\s*(ngay|tuan)|(\\d{1,3})\\s*(ngay|tuan)\\s*nua)${B1}`, 'g'), fold)) {
      const n = Number(m[1] ?? m[3]),
        unit = m[2] ?? m[4];
      if (n >= 1 && n <= 365) push(m, todayMs + n * (unit === 'tuan' ? 7 : 1) * DAY);
    }
    // 6. thứ N / chủ nhật / t2–t7 / cn, kèm “tuần sau|tới|này”
    const wdRe = new RegExp(`${B0}(?:(thu)\\s*(2|3|4|5|6|7|hai|ba|tu|nam|sau|bay)|(chu\\s*nhat)|(t)([2-7])|(cn))(?:\\s+tuan\\s+(sau|toi|nay))?${B1}`, 'g');
    for (const m of all(wdRe, fold)) {
      let w = null; // 0 = Chủ nhật, 1 = Thứ hai … 6 = Thứ bảy
      if (m[1]) {
        const word = lower.slice(m.index, m.index + 3);
        if (word !== 'thứ' && word !== 'thu') continue;
        const num = m[2];
        if (!/^\d$/.test(num)) {
          // Từ chỉ số phải đúng dấu (“thứ tự” không phải “thứ tư”).
          const first = lower.slice(m.index + 3, m.index + m[0].length).trim().split(/\s+/)[0];
          if (!WD_WORD[num].includes(first)) continue;
        }
        w = WD_NUM[num];
      } else if (m[3]) w = 0;
      else if (m[4]) {
        if (src[m.index] !== 't') continue; // “T5” viết hoa có thể là mã
        w = Number(m[5]) - 1;
      } else if (m[6]) {
        if (src.slice(m.index, m.index + 2) !== 'cn') continue;
        w = 0;
      }
      push(m, null, { w, week: m[7] || '' });
    }
    // 7. tuần sau / tuần tới (đứng riêng) → +7 ngày;  cuối tuần → thứ bảy sắp tới;  cuối tháng
    for (const m of all(new RegExp(`${B0}tuan\\s+(sau|toi)${B1}`, 'g'), fold)) push(m, todayMs + 7 * DAY);
    for (const m of all(new RegExp(`${B0}cuoi\\s+tuan${B1}`, 'g'), fold)) push(m, todayMs + ((6 - dow(todayMs) + 7) % 7) * DAY);
    for (const m of all(new RegExp(`${B0}cuoi\\s+thang${B1}`, 'g'), fold)) push(m, Date.UTC(ty, tm, 0));
    // 8. hôm nay / ngày mai / mốt / ngày kia
    for (const m of all(new RegExp(`${B0}(?:ngay\\s+)?hom\\s+nay${B1}`, 'g'), fold)) push(m, todayMs);
    for (const m of all(new RegExp(`${B0}(?:(ngay)\\s+)?(mai)${B1}`, 'g'), fold)) {
      const at = m.index + m[0].length - 3;
      if (lower.slice(at, at + 3) !== 'mai') continue; // mái, mãi, mại…
      const hasNgay = Boolean(m[1]);
      // “Mai” viết hoa giữa câu là tên người; đầu câu (điện thoại tự viết hoa) chỉ nhận khi theo sau là giờ hoặc buổi.
      if (src[at] === 'M' && !hasNgay && !(fold.slice(0, at).trim() === '' && /^\s*(\d{1,2}\s*(h|gio|:)|sang|trua|chieu|toi)/.test(fold.slice(at + 3)))) continue;
      if (!hasNgay) {
        const before = fold.slice(0, m.index).match(/([a-z0-9]+)\s*$/);
        if (before && NOT_BEFORE_MAI.has(before[1])) continue;
      }
      push(m, todayMs + DAY);
    }
    for (const m of all(new RegExp(`${B0}(?:ngay\\s+)?(?:mot|kia)${B1}`, 'g'), fold)) {
      const text = lower.slice(m.index, m.index + m[0].length);
      const hasNgay = /^ng[àa]y\s/.test(text);
      const word = text.split(/\s+/).pop();
      // “một” (số 1) không phải “mốt”; “kia” đứng một mình là đại từ.
      if (word === 'mốt' || (hasNgay && (word === 'mot' || word === 'kia'))) push(m, todayMs + 2 * DAY);
    }
    // 9. “<buổi> nay|mai|mốt” giữ nguyên cụm trong tên việc (để không mất chữ “chiều”, “tối”), nhưng vẫn đặt ngày.
    for (const m of all(new RegExp(`${B0}${PERIOD_RE}\\s+(nay)${B1}`, 'g'), fold)) push(m, todayMs, { keep: true, period: m[1] });
    return out;
  }

  // ---- Giờ ------------------------------------------------------------------------------------------------------------------
  function timeCandidate(P, taken) {
    const { fold } = P;
    const free = (s, e) => {
      for (let i = s; i < e; i++) if (taken[i]) return false;
      return true;
    };
    const tries = [
      // 9h, 9h30, 9 giờ, 9 giờ 30, 9 giờ rưỡi (sau “h” không cách: “9h 5 người” vẫn là 9h)
      new RegExp(`(?<![a-z0-9:/.])(\\d{1,2})\\s*(?:h(?:(\\d{1,2})|\\s*(ruoi))?|gio(?:\\s*(\\d{1,2})(?:\\s*phut)?|\\s*(ruoi))?)${B1}`, 'g'),
      // 9:30
      new RegExp(`(?<![a-z0-9:/.])(\\d{1,2}):(\\d{2})(?![a-z0-9:])`, 'g'),
      // 9am, 9 pm
      new RegExp(`(?<![a-z0-9:/.])(\\d{1,2})\\s*(am|pm)(?![a-z])`, 'g'),
    ];
    let best = null;
    tries.forEach((re, kind) => {
      for (const m of all(re, fold)) {
        let h = Number(m[1]),
          min = 0,
          ap = '';
        if (kind === 0) min = m[3] || m[5] ? 30 : Number(m[2] ?? m[4] ?? 0);
        else if (kind === 1) min = Number(m[2]);
        else ap = m[2];
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
        if (h > 23 || min > 59 || (ap && Number(m[1]) > 12)) continue;
        if (!free(m.index, m.index + m[0].length)) continue;
        if (!best || m.index < best.s) best = { s: m.index, e: m.index + m[0].length, h, min, ap };
        break;
      }
    });
    return best;
  }
  const adjustHour = (h, period) => {
    if ((period === 'chieu' || period === 'toi') && h < 12) return h + 12;
    if (period === 'trua' && h <= 5) return h + 12;
    if (period === 'dem' && h >= 6 && h < 12) return h + 12;
    return h;
  };

  function periodAround(P, s, e, taken) {
    const { fold } = P;
    const before = fold.slice(0, s).match(new RegExp(`${PERIOD_RE}\\s+$`));
    if (before) {
      const at = s - before[0].length;
      if (!taken.slice(at, s).some(Boolean) && (at === 0 || !/[a-z0-9]/.test(fold[at - 1]))) {
        // “Ăn tối 7h”: “tối” là một phần tên việc (bữa tối) nên chỉ dùng để suy ra giờ, không gỡ khỏi tên.
        const word = fold.slice(0, at).trim().split(/\s+/).pop();
        return { p: before[1], s: at, e: at + before[1].length, keep: MEAL_WORDS.has(word) };
      }
    }
    const after = fold.slice(e).match(new RegExp(`^\\s+${PERIOD_RE}${B1}`));
    if (after) {
      const at = e + after[0].length - after[1].length;
      if (!taken.slice(at, at + after[1].length).some(Boolean)) return { p: after[1], s: at, e: at + after[1].length };
    }
    return null;
  }

  // ---- Phân tích chính ----------------------------------------------------------------------------------------------------
  function parse(text, ctx = {}) {
    const P = prep(text);
    const { src, lower } = P;
    const todayIso = ctx.today || (typeof today === 'function' ? today() : iso(Date.now()));
    const todayMs = isoMs(todayIso);
    const minutes = ctx.minutes ?? nowVN();
    const projects = ctx.projects || [];
    const taken = new Array(src.length).fill(false);
    const cuts = [];
    const mark = (s, e) => {
      for (let i = s; i < e; i++) taken[i] = true;
    };
    const cut = (s, e) => {
      cuts.push([s, e]);
      mark(s, e);
    };
    const extendLeft = (s) => {
      const head = lower.slice(0, s);
      let m = head.match(CONNECTOR_RE);
      if (m && !taken.slice(s - m[0].length, s).some(Boolean)) return s - m[0].length;
      m = head.match(DEADLINE_RE);
      if (m && !taken.slice(s - m[0].length, s).some(Boolean)) return s - m[0].length + (m[0].match(/^[,;:(–—-]/) ? 1 : 0);
      return s;
    };

    // 1. Thẻ #…: dự án đầu tiên khớp; các thẻ sau khớp từ khóa của dự án đó thì thành nhãn. Thẻ không khớp giữ nguyên trong tên việc.
    const tags = [...all(/#([\p{L}\p{N}_-]+)/gu, src)].map((m) => ({ s: m.index, e: m.index + m[0].length, tag: m[1] }));
    tags.forEach((t) => mark(t.s, t.e));
    let proj = null,
      projTag = null;
    for (const t of tags) {
      const p = matchProject(t.tag, projects, ctx.activeId);
      if (p) {
        proj = p;
        projTag = t;
        break;
      }
    }
    const labels = [];
    const unknown = [];
    for (const t of tags) {
      if (t === projTag) {
        cut(t.s, t.e);
        continue;
      }
      const key = prep(t.tag.replace(/[_-]+/g, ' ')).fold.trim();
      const kw = proj?.keywords?.find((k) => prep(k.name).fold.trim() === key);
      if (kw && !labels.some((l) => l.name === kw.name)) {
        labels.push({ name: kw.name, color: kw.color });
        cut(t.s, t.e);
      } else unknown.push(t.tag);
    }

    // 2. Giờ trước, vì “9h” không được bị coi là ngày.
    const time = timeCandidate(P, taken);
    if (time) mark(time.s, time.e);
    let periodUsed = null;
    // 3. Ngày: ứng viên đầu tiên theo thứ tự ưu tiên.
    const cands = dateCandidates(P, todayMs, taken);
    let chosen = cands[0] || null;
    if (chosen && chosen.ms == null) {
      // thứ trong tuần → ngày
      const off = (chosen.w + 6) % 7; // Thứ hai = 0 … Chủ nhật = 6
      if (chosen.week === 'sau' || chosen.week === 'toi') chosen.ms = mondayOf(todayMs) + 7 * DAY + off * DAY;
      else if (chosen.week === 'nay') chosen.ms = mondayOf(todayMs) + off * DAY;
      else chosen.ms = todayMs + (((chosen.w - dow(todayMs) + 7) % 7) || 7) * DAY;
    }

    let hh = null,
      mm = null;
    if (time) {
      // Buổi (sáng/trưa/chiều/tối/đêm) đứng sát giờ hoặc sát cụm ngày quyết định giờ 12 hay 24 (“3h chiều mai” = 15:00) và được gỡ khỏi tên việc.
      periodUsed = periodAround(P, time.s, time.e, taken) || (chosen && !chosen.keep ? periodAround(P, chosen.s, chosen.e, taken) : null) || (chosen?.keep ? { p: chosen.period, s: chosen.s, e: chosen.s } : null);
      hh = time.ap ? time.h : adjustHour(time.h, periodUsed?.p);
      mm = time.min;
      cut(extendLeft(time.s), time.e);
      if (periodUsed && periodUsed.e > periodUsed.s && !periodUsed.keep) cut(periodUsed.s, periodUsed.e);
    }
    let dateMs = chosen?.ms ?? null;
    if (chosen) {
      // Có giờ: cụm ngày được gỡ hẳn. Không có giờ: cụm đi kèm buổi (“chiều mai”, “tối nay”) giữ nguyên trong tên việc để khỏi mất chữ.
      const per = !time && !chosen.keep ? periodAround(P, chosen.s, chosen.e, taken) : null;
      if ((time && chosen.keep) || (!chosen.keep && !per)) cut(extendLeft(chosen.s), chosen.e);
      else mark(chosen.s, chosen.e);
    }
    if (time && dateMs == null) dateMs = hh * 60 + mm > minutes ? todayMs : todayMs + DAY; // chỉ có giờ: hôm nay nếu còn kịp, không thì ngày mai

    // 4. Tên việc = câu gốc đã gỡ các phần đã dùng.
    cuts.sort((a, b) => a[0] - b[0]);
    let title = '',
      at = 0;
    for (const [s, e] of cuts) {
      if (s >= at) {
        title += src.slice(at, s) + ' ';
        at = e;
      }
    }
    title += src.slice(at);
    title = title.replace(/\s+/g, ' ').replace(/^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g, '').slice(0, 200).trim();

    const date = dateMs == null ? '' : iso(dateMs);
    const clock = time ? pad(hh) + ':' + pad(mm) : '';
    return {
      title,
      date,
      time: clock,
      project: proj,
      projectTag: projTag?.tag || '',
      unknownTags: unknown,
      labels,
    };
  }

  // Nhãn ngày giờ để xem trước và thông báo, ví dụ “Thứ tư 18/11 · 09:00”.
  function describe(r, todayIso = today()) {
    if (!r.date) return 'Chưa đặt hạn';
    const ms = isoMs(r.date);
    const diff = Math.round((ms - isoMs(todayIso)) / DAY);
    const rel = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Ngày mai' : WEEKDAY[dow(ms)];
    const [y, m, d] = r.date.split('-');
    return `${rel} ${d}/${m}${y !== todayIso.slice(0, 4) ? '/' + y : ''}${r.time ? ' · ' + r.time : ''}`;
  }

  function context() {
    const list = typeof visibleProjects === 'function' ? visibleProjects() : data.projects.filter((p) => !p.archived);
    return { today: today(), minutes: nowVN(), projects: list, activeId: typeof active === 'string' ? active : null };
  }
  function targetProject(r, ctx) {
    if (r.project) return r.project;
    const a = ctx.projects.find((p) => p.id === ctx.activeId);
    return a || ctx.projects[0] || null;
  }

  // Tạo việc đúng hình dạng của biểu mẫu “Thêm một bước tiến mới” (xem taskForm trong app.js).
  function create(line) {
    if (typeof contentReadOnly !== 'undefined' && contentReadOnly) return { ok: false, message: 'Bản chỉ xem không thêm được việc.' };
    const ctx = context();
    const r = parse(line, ctx);
    if (!r.title) return { ok: false, message: 'Hãy gõ tên việc, ví dụ: Gọi anh Sơn mai 9h #farm' };
    const p = targetProject(r, ctx);
    if (!p) return { ok: false, message: 'Chưa có dự án nào. Hãy tạo một dự án trước rồi thêm việc.' };
    if (p.tasks.length >= 2000) return { ok: false, message: 'Dự án này đã đủ 2.000 việc.' };
    const col = p.columns.includes('List') ? 'List' : p.columns[0];
    const end = r.date && r.time ? r.date + 'T' + r.time : '';
    const motif = typeof NOTE_MOTIFS === 'undefined' ? 'none' : Object.hasOwn(NOTE_MOTIFS, p.motif) ? p.motif : 'none';
    const task = {
      id: uid(),
      start: '',
      end,
      priority: '',
      labels: r.labels.map((l) => ({ ...l })),
      title: r.title,
      description: '',
      col,
      due: r.date,
      tag: '',
      motif,
      checks: [],
    };
    p.tasks.push(task);
    if (save() === false) {
      p.tasks.pop();
      return { ok: false, message: 'Chưa lưu được việc mới.' };
    }
    const bits = [`Đã thêm “${r.title}”`];
    if (r.date) bits.push('Hạn ' + describe(r, ctx.today));
    bits.push(p.name);
    return { ok: true, message: bits.join(' · '), task, project: p };
  }

  // ---- Hộp “Thêm nhanh” ----------------------------------------------------------------------------------------------------
  function previewHtml(line) {
    if (!line.trim()) return '<p class="qa-empty">Gõ tên việc, thêm ngày giờ và #tên dự án. Mình sẽ tách giúp.</p>';
    const ctx = context();
    const r = parse(line, ctx);
    const p = targetProject(r, ctx);
    const rows = [];
    rows.push(['Việc', r.title ? esc(r.title) : '<span class="qa-warn">Chưa có tên việc</span>']);
    rows.push(['Hạn', r.date ? esc(describe(r, ctx.today)) : '<span class="qa-muted">Chưa đặt hạn</span>']);
    let proj = p ? `<span class="qa-dot" style="background:${esc(p.color)}"></span>${esc(p.name)}` : '<span class="qa-warn">Chưa có dự án</span>';
    if (!r.project && r.unknownTags.length) proj += `<small class="qa-warn">Không có dự án “${esc(r.unknownTags[0])}”, dùng dự án đang mở.</small>`;
    rows.push(['Dự án', proj]);
    if (r.labels.length) rows.push(['Từ khóa', r.labels.map((l) => esc(l.name)).join(', ')]);
    return rows.map(([k, v]) => `<div class="qa-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  function open(prefill = '') {
    if (document.body.classList.contains('signed-out')) return;
    if (typeof contentReadOnly !== 'undefined' && contentReadOnly) return notify('Bản chỉ xem không thêm được việc.');
    if (document.querySelector('dialog.studio-palette[open]')) document.querySelector('dialog.studio-palette').close();
    modal(
      '<h2>Thêm nhanh</h2><label class="field">Gõ một câu<input id="qa-line" name="line" maxlength="300" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" placeholder="Gọi anh Sơn mai 9h #farm" required></label><dl class="qa-preview" id="qa-preview" aria-live="polite"></dl><p class="help-copy qa-hint">Hiểu: hôm nay · mai · mốt · thứ 6 · thứ 6 tuần sau · 20/11 · ngày 20 · 9h · 9h30 · 3 giờ chiều · #tên dự án</p>',
      (fd) => {
        const r = create(String(fd.get('line') || ''));
        if (!r.ok) return notify(r.message);
        $('#editor').close();
        render();
        notify(r.message);
      },
    );
    const label = $('#editor-form [type=submit] span');
    if (label) label.textContent = 'Thêm việc';
    const input = $('#qa-line'),
      box = $('#qa-preview');
    const paint = () => (box.innerHTML = previewHtml(input.value));
    input.addEventListener('input', paint);
    input.value = prefill;
    paint();
    input.focus();
  }

  window.zenQuick = { parse, describe, create, open, matchProject };

  // Nút “+” trên thanh trên (mọi trang, mọi độ rộng).
  const actions = document.querySelector('.topbar .top-actions');
  if (actions && !document.getElementById('quick-add-btn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'quick-add-btn';
    btn.className = 'icon-btn quick-add-btn';
    btn.setAttribute('aria-label', 'Thêm nhanh một việc bằng câu tự nhiên');
    btn.title = 'Thêm nhanh: gõ “Gọi anh Sơn mai 9h #farm”';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    btn.addEventListener('click', () => open());
    actions.prepend(btn);
  }
})();
