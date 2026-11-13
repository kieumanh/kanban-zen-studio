// Deterministic summaries from account data; no paid inference or external data.
export const reportDate = (now = new Date()) =>
  now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
export const shiftDay = (day, n) =>
  new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const taskDeadline = (t) => t.due || t.end?.slice(0, 10) || '';
export function reportCategory(t, day) {
  return t.col === 'Done'
    ? 'done'
    : taskDeadline(t) && taskDeadline(t) < day
      ? 'overdue'
      : t.col === 'Doing'
        ? 'doing'
        : 'todo';
}
const oneLine = (s) =>
  String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
function reportProgress(tasks) {
  tasks = tasks.filter((t) => !t.archived);
  let done = 0,
    total = 0;
  for (const t of tasks) {
    total += 1 + (t.checks || []).length;
    done +=
      (t.col === 'Done' ? 1 : 0) +
      (t.checks || []).filter((c) => c.done).length;
  }
  return total ? Math.round((done / total) * 100) : 0;
}
export function reportTasks(workspace, day) {
  return (workspace.projects || [])
    .filter((p) => !p.archived)
    .flatMap((p) =>
      (p.tasks || [])
        .filter((t) => !t.archived)
        .map((t) => ({
          ...t,
          projectName: p.name,
          projectId: p.id,
          category: reportCategory(t, day),
        })),
    );
}
export function reminderReport(workspace, day) {
  const tasks = reportTasks(workspace, day)
    .filter(
      (t) =>
        t.col !== 'Done' &&
        taskDeadline(t) &&
        taskDeadline(t) <= shiftDay(day, 3),
    )
    .sort((a, b) => taskDeadline(a).localeCompare(taskDeadline(b)));
  if (!tasks.length) return null;
  const overdue = tasks.filter((t) => t.category === 'overdue').length,
    v = voiceOf(workspace);
  return {
    html: reminderReportHTML(tasks, day, v),
    subject: v.subject + day,
    text:
      v.intro(overdue, tasks.length - overdue) +
      '\n\n' +
      tasks
        .slice(0, 80)
        .map(
          (t) =>
            `• ${t.category === 'overdue' ? v.tags[0] : taskDeadline(t) === day ? v.tags[1] : v.tags[2]} · ${oneLine(t.title)}\n  ${oneLine(t.projectName)} · ${v.due} ${taskDeadline(t)}`,
        )
        .join('\n') +
      (tasks.length > 80 ? '\n' + v.more(tasks.length - 80) : ''),
  };
}
// v2.0.0 (Truyền Âm): giọng của email theo phong cách người dùng chọn (workspace.style). Chỉ đổi chữ khung; tên việc, tên dự án giữ
// nguyên. 'giangho-nhe' (Giang hồ nhẹ) và người dùng chưa chọn giữ giọng thường.
const VOICES = {
  zen: {
    subject: 'Nhắc hạn công việc · ',
    title: 'Nhắc hạn công việc',
    brand: 'KANBAN ZEN STUDIO',
    h1: 'Một nhịp nhìn lại công việc',
    intro: (late, soon) =>
      `Bạn có ${late} việc quá hạn và ${soon} việc đến hạn hôm nay hoặc trong 3 ngày tới.`,
    introHTML: (late, soon) =>
      `Bạn có <strong>${late} việc quá hạn</strong> và <strong>${soon} việc đến hạn hôm nay hoặc trong 3 ngày tới</strong>.`,
    tags: ['QUÁ HẠN', 'HÔM NAY', 'SẮP HẠN'],
    groups: ['Quá hạn', 'Hôm nay', 'Sắp đến hạn'],
    due: 'Hạn',
    more: (n) => `Còn ${n} việc khác trong ứng dụng.`,
    foot: 'Điều chỉnh giờ gửi hoặc tắt email trong Cài đặt → Thông báo.',
    weeklySubject: 'Tổng kết tuần · Bức tranh công việc · ',
    weeklyEyebrow: 'ZEN STUDIO · NHÌN LẠI MỖI TUẦN',
    weeklyTitle: 'Bức tranh công việc',
    weeklyLine: 'BỨC TRANH CÔNG VIỆC',
    w: {
      head: (projects, tasks, pct) =>
        `${projects} dự án hoạt động · ${tasks} công việc · ${pct}% tiến độ`,
      counts: (c) =>
        `Hoàn thành: ${c.done} · Đang xây dựng: ${c.doing} · Chưa làm: ${c.todo} · Quá hạn: ${c.overdue}`,
      compare:
        'So sánh trạng thái với lần tổng kết trước; các task đã xóa hoặc lưu trữ không tính vào thay đổi.',
      first:
        'Đây là mốc tổng kết đầu tiên. Các lần sau sẽ có thay đổi so với bản trước.',
      project: (done, total, late, soon) =>
        `${done}/${total} việc hoàn thành · ${late} quá hạn · ${soon} đến hạn trong 7 ngày tới.`,
      projectRe: /^\d+\/\d+ việc hoàn thành/,
      delta: (added, diff) =>
        `So với bản trước: ${added} việc chuyển sang hoàn thành; tiến độ ${diff >= 0 ? '+' : ''}${diff} điểm phần trăm.`,
      deltaMark: 'So với bản trước:',
      empty:
        'Gợi ý: tạo một việc nhỏ, xác định kết quả cần đạt và ngày thực hiện.',
      finished:
        'Gợi ý: rà soát kết quả, ghi lại bài học và cân nhắc lưu trữ dự án.',
      priority: [
        'Ưu tiên: kiểm tra nguyên nhân trễ, chia nhỏ việc hoặc đặt lại hạn thực tế.',
        'Ưu tiên: thu hẹp số việc đang làm, hoàn tất trước khi mở thêm.',
        'Ưu tiên: dành thời gian cho việc sắp đến hạn; kiểm tra checklist còn thiếu.',
        'Ưu tiên: chọn việc quan trọng nhất, đặt lịch cụ thể và chia thành bước nhỏ.',
      ],
      priorityMark: 'Ưu tiên:',
      lead: 'Đề xuất tuần tới:',
      step: 'Bước tiếp: ',
      noStep:
        'Xác định đầu ra và thêm một checklist có thể hoàn thành trong một buổi.',
      due: ' · hạn ',
      noDue: ' · chưa đặt hạn',
      rhythm: 'NHỊP LÀM VIỆC TUẦN TỚI',
      rhythmSteps: [
        'Thứ 2: chốt tối đa 3 kết quả quan trọng; xử lý việc quá hạn trước.',
        'Thứ 3–5: dành khung tập trung cho việc quan trọng, cập nhật checklist cuối ngày.',
        'Thứ 6–7: kiểm tra kết quả, tệp bàn giao và hạn còn lại.',
        'Chủ nhật: nghỉ, nhìn lại tiến độ và điều chỉnh kế hoạch.',
      ],
      footnote: 'Gợi ý được tạo theo trạng thái, hạn và ưu tiên bạn đã nhập.',
      footnoteMark: 'Gợi ý được tạo theo',
      labels: ['Hoàn thành', 'Đang xây dựng', 'Chưa làm', 'Quá hạn'],
      unit: 'việc',
      unitTasks: 'công việc',
      unitProjects: 'dự án',
      overall: 'Tiến độ tổng thể',
      distribution: 'Phân bố công việc',
      projectProgress: 'Tiến độ dự án',
      footer:
        'để cập nhật công việc. Đổi giờ hoặc tắt email trong Settings → Tổng kết tuần.',
    },
  },
  giangho: {
    subject: 'Truyền thư kỳ hạn · ',
    title: 'Truyền thư kỳ hạn',
    brand: 'KANBAN ZEN STUDIO · GIANG HỒ',
    h1: 'Một nhịp soát lại nhiệm vụ',
    intro: (late, soon) =>
      `Các hạ có ${late} nhiệm vụ lỡ hẹn và ${soon} nhiệm vụ tới kỳ hôm nay hoặc trong 3 ngày tới.`,
    introHTML: (late, soon) =>
      `Các hạ có <strong>${late} nhiệm vụ lỡ hẹn</strong> và <strong>${soon} nhiệm vụ tới kỳ hôm nay hoặc trong 3 ngày tới</strong>.`,
    tags: ['LỠ HẸN', 'HÔM NAY', 'SẮP TỚI KỲ'],
    groups: ['Lỡ hẹn', 'Hôm nay', 'Sắp tới kỳ'],
    due: 'Kỳ hạn',
    more: (n) => `Còn ${n} nhiệm vụ khác trong ứng dụng.`,
    foot: 'Đổi giờ gửi hoặc tắt thư trong Cơ quan → Thông báo.',
    weeklySubject: 'Chiến báo tuần · Bức tranh đại sự · ',
    weeklyEyebrow: 'ZEN STUDIO · CHIẾN BÁO MỖI TUẦN',
    weeklyTitle: 'Chiến báo đại sự',
    weeklyLine: 'CHIẾN BÁO ĐẠI SỰ',
    // v2.3.0 (Chiến Báo): thân chiến báo tuần giọng giang hồ.
    w: {
      head: (projects, tasks, pct) =>
        `${projects} đại sự đang vận hành · ${tasks} nhiệm vụ · ${pct}% tiến cảnh`,
      counts: (c) =>
        `Công thành: ${c.done} · Đang hành sự: ${c.doing} · Chưa xuất chiêu: ${c.todo} · Lỡ hẹn: ${c.overdue}`,
      compare:
        'So với chiến báo trước; nhiệm vụ đã xóa hoặc phong ấn không tính vào thay đổi.',
      first:
        'Đây là chiến báo đầu tiên. Từ lần sau sẽ có so sánh với bản trước.',
      project: (done, total, late, soon) =>
        `${done}/${total} nhiệm vụ công thành · ${late} lỡ hẹn · ${soon} tới kỳ trong 7 ngày tới.`,
      projectRe: /^\d+\/\d+ nhiệm vụ công thành/,
      delta: (added, diff) =>
        `So với chiến báo trước: thêm ${added} nhiệm vụ công thành; tiến cảnh ${diff >= 0 ? '+' : ''}${diff} điểm phần trăm.`,
      deltaMark: 'So với chiến báo trước:',
      empty:
        'Kế sách: khởi một nhiệm vụ nhỏ, định rõ thành quả và ngày xuất chiêu.',
      finished:
        'Kế sách: soát lại thành quả, chép bài học vào Tàng thư và cân nhắc phong ấn đại sự.',
      priority: [
        'Tiên quyết: truy nguyên nhân lỡ hẹn, chia nhỏ nhiệm vụ hoặc định lại kỳ hạn cho sát thực.',
        'Tiên quyết: bớt số nhiệm vụ đang hành sự, hoàn tất rồi mới khởi thêm.',
        'Tiên quyết: dồn sức cho nhiệm vụ sắp tới kỳ; soát lại chiêu thức còn thiếu.',
        'Tiên quyết: chọn nhiệm vụ trọng yếu nhất, định ngày cụ thể và chia thành chiêu nhỏ.',
      ],
      priorityMark: 'Tiên quyết:',
      lead: 'Kế sách tuần tới:',
      step: 'Chiêu kế tiếp: ',
      noStep:
        'Định rõ thành quả và thêm một chiêu thức có thể xong trong một buổi.',
      due: ' · kỳ hạn ',
      noDue: ' · chưa định kỳ hạn',
      rhythm: 'NHỊP HÀNH SỰ TUẦN TỚI',
      rhythmSteps: [
        'Thứ 2: chốt tối đa 3 thành quả trọng yếu; xử lý nhiệm vụ lỡ hẹn trước.',
        'Thứ 3–5: dành canh giờ bế quan cho nhiệm vụ trọng yếu, soát chiêu thức cuối ngày.',
        'Thứ 6–7: kiểm thành quả, bảo vật bàn giao và kỳ hạn còn lại.',
        'Chủ nhật: nghỉ ngơi dưỡng sức, nhìn lại tiến cảnh và điều chỉnh kế sách.',
      ],
      footnote:
        'Kế sách được bày theo trạng thái, kỳ hạn và mức cấp bách các hạ đã ghi.',
      footnoteMark: 'Kế sách được bày theo',
      labels: ['Công thành', 'Đang hành sự', 'Chưa xuất chiêu', 'Lỡ hẹn'],
      unit: 'nhiệm vụ',
      unitTasks: 'nhiệm vụ',
      unitProjects: 'đại sự',
      overall: 'Tiến cảnh tổng thể',
      distribution: 'Phân bố nhiệm vụ',
      projectProgress: 'Tiến cảnh đại sự',
      footer:
        'để cập nhật nhiệm vụ. Đổi giờ hoặc tắt thư trong Cơ quan → Chiến báo tuần.',
    },
  },
};
export const voiceOf = (workspace) =>
  workspace?.style === 'giangho' ? VOICES.giangho : VOICES.zen;
export function reminderReportHTML(tasks, day, v = VOICES.zen) {
  const shown = tasks.slice(0, 80),
    groups = [
      [v.groups[0], '#b63850', (t) => taskDeadline(t) < day],
      [v.groups[1], '#9c5919', (t) => taskDeadline(t) === day],
      [v.groups[2], '#67439b', (t) => taskDeadline(t) > day],
    ];
  const sections = groups
    .map(([label, color, match]) => {
      const items = shown.filter(match);
      if (!items.length) return '';
      return `<tr><td style="padding:22px 0 0"><h2 style="margin:0 0 10px;font-size:17px;line-height:1.4;color:${color}">${label} · ${items.length}</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${items.map((t) => `<tr><td style="padding:12px 14px;border:1px solid #e9e1ef;border-left:3px solid ${color};background:#fcfafd"><strong style="display:block;font-size:15px;line-height:1.5;color:#30243e;overflow-wrap:anywhere">${reportEscape(oneLine(t.title))}</strong><span style="display:block;margin-top:4px;color:#695b72;font-size:13px;line-height:1.5">${reportEscape(oneLine(t.projectName))} · ${v.due} ${reportEscape(taskDeadline(t).split('-').reverse().join('/'))}</span></td></tr><tr><td style="height:6px;font-size:1px;line-height:6px">&nbsp;</td></tr>`).join('')}</table></td></tr>`;
    })
    .join('');
  const late = tasks.filter((t) => taskDeadline(t) < day).length;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${v.title}</title></head><body style="margin:0;padding:0;background:#f5f2f9;color:#30243e;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2f9"><tr><td align="center" style="padding:20px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e9e1ef;border-radius:16px"><tr><td style="padding:25px 22px"><p style="margin:0 0 10px;color:#70469b;font-size:12px;font-weight:bold;letter-spacing:1px">${v.brand}</p><h1 style="margin:0;font-size:25px;line-height:1.3">${v.h1}</h1><p style="margin:12px 0 0;color:#695b72;font-size:15px;line-height:1.6">${v.introHTML(late, tasks.length - late)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sections}</table>${tasks.length > 80 ? `<p style="font-size:13px;color:#695b72">${v.more(tasks.length - 80)}</p>` : ''}<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px"><tr><td bgcolor="#7950c8" style="border-radius:9px"><a href="https://kanban.huongthiennature.com/" style="display:inline-block;padding:13px 20px;color:#fff;text-decoration:none;font-weight:bold;font-size:14px">Mở Kanban Zen Studio →</a></td></tr></table><p style="margin:25px 0 0;padding-top:16px;border-top:1px solid #e9e1ef;color:#695b72;font-size:12px;line-height:1.6">${v.foot}</p></td></tr></table></td></tr></table></body></html>`;
}
export function weeklyReport(workspace, day, previous = null) {
  const projects = (workspace.projects || []).filter((p) => !p.archived),
    tasks = reportTasks(workspace, day),
    counts = { done: 0, doing: 0, todo: 0, overdue: 0 };
  tasks.forEach((t) => counts[t.category]++);
  const snapshot = {
    projects: projects.map((p) => ({
      id: p.id,
      pct: reportProgress(p.tasks || []),
      doneIds: (p.tasks || [])
        .filter((t) => !t.archived && t.col === 'Done')
        .map((t) => t.id),
    })),
  };
  const next = shiftDay(day, 7),
    voice = voiceOf(workspace),
    lines = [
      `${voice.weeklyLine} · ${shiftDay(day, -6)} → ${day}`,
      voice.w.head(projects.length, tasks.length, reportProgress(tasks)),
      voice.w.counts(counts),
      previous ? voice.w.compare : voice.w.first,
      '',
    ];
  for (const p of projects) {
    const list = tasks.filter((t) => t.projectId === p.id),
      old = previous?.projects?.find((x) => x.id === p.id),
      current = snapshot.projects.find((x) => x.id === p.id),
      late = list.filter((t) => t.category === 'overdue'),
      doing = list.filter((t) => t.col === 'Doing'),
      upcoming = list.filter(
        (t) =>
          t.col !== 'Done' &&
          taskDeadline(t) &&
          taskDeadline(t) >= day &&
          taskDeadline(t) <= next,
      );
    lines.push(
      `◆ ${oneLine(p.name)} · ${current.pct}%`,
      voice.w.project(
        list.filter((t) => t.col === 'Done').length,
        list.length,
        late.length,
        upcoming.length,
      ),
    );
    if (old) {
      const added = current.doneIds.filter(
        (id) => !old.doneIds.includes(id),
      ).length;
      lines.push(voice.w.delta(added, current.pct - old.pct));
    }
    const candidates = list
      .filter((t) => t.col !== 'Done')
      .sort((a, b) => {
        const score = (t) =>
          (t.category === 'overdue' ? 100 : 0) +
          (['q1', 'q2'].includes(t.priority) ? 30 : 0) +
          (taskDeadline(t) && taskDeadline(t) <= next ? 20 : 0) +
          (t.col === 'Doing' ? 10 : 0);
        return (
          score(b) - score(a) ||
          (taskDeadline(a) || '9999').localeCompare(taskDeadline(b) || '9999')
        );
      })
      .slice(0, 3);
    if (!list.length) lines.push(voice.w.empty);
    else if (!candidates.length) lines.push(voice.w.finished);
    else {
      lines.push(
        voice.w.priority[
          late.length ? 0 : doing.length > 3 ? 1 : upcoming.length ? 2 : 3
        ],
      );
      lines.push(voice.w.lead);
      for (const t of candidates) {
        const unchecked = (t.checks || []).filter((c) => !c.done),
          hint = unchecked.length
            ? voice.w.step + oneLine(unchecked[0].text)
            : voice.w.noStep;
        lines.push(
          `• ${oneLine(t.title)}${taskDeadline(t) ? voice.w.due + taskDeadline(t) : voice.w.noDue}\n  ${hint}`,
        );
      }
    }
    lines.push('');
  }
  lines.push(
    `${voice.w.rhythm} · ${shiftDay(day, 1)} → ${next}`,
    ...voice.w.rhythmSteps,
    voice.w.footnote,
  );
  const summary = {
    tasks: tasks.map((t) => ({
      title: t.title,
      description: t.description || '',
      projectName: t.projectName,
      category: t.category,
      due: taskDeadline(t),
      checks: (t.checks || []).map((c) => ({ text: c.text, done: c.done })),
    })),
    counts,
    total: tasks.length,
    progress: reportProgress(tasks),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      pct: reportProgress(p.tasks || []),
    })),
  };
  const report = {
    subject: voice.weeklySubject + day,
    voice: voice === VOICES.giangho ? 'giangho' : 'zen',
    text: lines.join('\n'),
    snapshot,
    summary,
  };
  report.html = weeklyReportHTML(report);
  return report;
}
export const reportEscape = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function reportBar(pct, color, compact = false) {
  const cells =
    (pct
      ? `<td width="${pct}%" bgcolor="${color}" style="height:10px;border-radius:999px;background:${color};font-size:1px;line-height:10px">&nbsp;</td>`
      : '') +
    (pct < 100
      ? `<td width="${100 - pct}%" bgcolor="#eeeaf2" style="height:10px;border-radius:999px;background:#eeeaf2;font-size:1px;line-height:10px">&nbsp;</td>`
      : '');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:separate;border-spacing:0;border-radius:999px;overflow:hidden;margin:${compact ? '4px 0 2px' : '8px 0 12px'}"><tr>${cells}</tr></table>`;
}
// Kiểu dùng chung cho email / bản in của báo cáo tuần (công việc) và báo cáo thu chi.
export const REPORT_STYLE = `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');@page{size:A4;margin:14mm 13mm}*{box-sizing:border-box}body{margin:0;background:#f5f2f8;color:#352d40;font-family:'Nunito','Segoe UI',Arial,sans-serif}table{color:inherit;font-family:inherit}a{color:#7549a8}.report-sheet{overflow-wrap:anywhere}.report-sheet h1,.report-sheet h2{line-height:1.35}.report-sheet>p{max-width:100%;overflow-wrap:anywhere}.report-donut svg{max-width:100%;height:auto}.report-distribution{width:100%;border-collapse:separate;border-spacing:0 5px;margin:14px 0 24px}.report-status-main,.report-status-bar{break-inside:avoid;page-break-inside:avoid}.report-project-title{margin:24px 0 8px!important;padding:11px 14px!important;border-top:0!important;border-radius:0 10px 10px 0;background:#faf7fc;font-size:17px!important;line-height:1.4!important}.report-project-progress{margin:0 0 2px}.report-project-summary,.report-project-delta,.report-priority-note,.report-suggestion-lead,.report-suggestion-item,.report-suggestion-next,.report-rhythm-step,.report-rhythm-footnote{max-width:100%;overflow-wrap:anywhere}.report-project-summary{margin:8px 0 10px!important;padding:10px 13px;border:1px solid #eee7f2;border-radius:10px;background:#fbf9fc;color:#564763;font-size:13px!important;line-height:1.65!important}.report-project-delta{margin:7px 0 12px!important;padding:9px 13px;border-left:3px solid #8b67ad;border-radius:0 9px 9px 0;background:#f8f4fb;color:#665675;font-size:12px!important}.report-priority-note{margin:12px 0 9px!important;padding:10px 13px;border-left:3px solid #df9a48;border-radius:0 10px 10px 0;background:#fff8eb;color:#725120;font-size:13px!important;line-height:1.6!important}.report-suggestion-lead{margin:11px 0 5px!important;color:#62447c;font-size:13px!important;font-weight:800}.report-suggestion-item{display:block;box-sizing:border-box;width:100%;min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:normal;margin:7px 0 0!important;padding:10px 13px 7px;border:1px solid #e9e0ef;border-radius:10px 10px 0 0;background:#fcfaff;font-size:13px!important;line-height:1.6!important}.report-suggestion-next{display:block;box-sizing:border-box;width:100%;min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:normal;margin:0 0 8px!important;padding:0 13px 10px;border:1px solid #e9e0ef;border-top:0;border-radius:0 0 10px 10px;background:#fcfaff;color:#756580;font-size:12px!important;line-height:1.55!important}.report-rhythm-title{margin:22px 0 10px!important;padding:12px 14px;border-left:3px solid #7950c8;border-radius:0 11px 11px 0;background:#f5f0fa;font-size:16px!important;line-height:1.45!important}.report-rhythm-step{margin:6px 0!important;padding:9px 12px;border:1px solid #eee7f2;border-radius:9px;background:#fcfbfd;font-size:13px!important;line-height:1.6!important}.report-rhythm-footnote{margin:9px 0 14px!important;color:#82748d;font-size:11px!important;line-height:1.55!important}.report-section-gap{height:12px}.report-body-copy{margin:6px 0;font-size:14px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}@media print{html,body{width:100%;min-width:0;background:#fff!important}body{font-size:10.5pt;line-height:1.55}.report-sheet{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}.report-sheet h1{font-size:22pt!important;margin-bottom:5pt!important}.report-sheet h2{break-after:avoid;page-break-after:avoid}.report-sheet>p{font-size:10pt!important;line-height:1.55!important;orphans:3;widows:3}.report-donut{break-inside:avoid;page-break-inside:avoid;margin:8pt auto 12pt!important}.report-donut svg{width:150px!important;height:150px!important}.report-distribution{break-inside:auto;page-break-inside:auto;margin:10pt 0 16pt!important}.report-distribution td{font-size:9.5pt!important}.report-sheet>table[role=presentation]{break-inside:avoid;page-break-inside:avoid}.report-project-title,.report-project-summary,.report-project-delta,.report-priority-note,.report-suggestion-item,.report-suggestion-next,.report-rhythm-title,.report-rhythm-step{break-inside:avoid;page-break-inside:avoid}.report-suggestion-item{display:block;width:100%;min-width:0;max-width:100%;margin-top:5pt!important;white-space:normal!important;overflow-wrap:anywhere;word-break:normal;break-inside:avoid;page-break-inside:avoid}.report-suggestion-next{display:block;width:100%;min-width:0;max-width:100%;margin-bottom:6pt!important;white-space:normal!important;overflow-wrap:anywhere;word-break:normal;break-inside:avoid;page-break-inside:avoid}.report-rhythm-title{font-size:13pt!important;margin-top:16pt!important}.report-rhythm-step{font-size:9.5pt!important;padding:6pt 8pt!important}.report-rhythm-footnote{font-size:8.5pt!important}.report-sheet>p:last-child{margin-top:18pt!important;padding-top:10pt!important;font-size:8.5pt!important}h2,table,tr,.report-donut{break-inside:avoid;page-break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@media(max-width:520px){.report-sheet{padding:20px!important}.report-distribution td{font-size:11px!important;padding:8px 10px!important}.report-rhythm-title{font-size:15px!important}.report-suggestion-item,.report-rhythm-step{font-size:12px!important}}`;
export function weeklyReportHTML(report) {
  const s = report.summary || {
    counts: { done: 0, doing: 0, todo: 0, overdue: 0 },
    total: 0,
    progress: 0,
    projects: [],
  };
  const voice = VOICES[report.voice] || VOICES.zen,
    W = voice.w;
  const groups = [
    ['done', W.labels[0], '#3b8b61'],
    ['doing', W.labels[1], '#8054bf'],
    ['todo', W.labels[2], '#df8c40'],
    ['overdue', W.labels[3], '#cd4c58'],
  ];
  const percent = (n) => (s.total ? Math.round((n / s.total) * 1000) / 10 : 0);
  let offset = 0;
  const rings = groups
    .map(([key, label, color]) => {
      const fraction = s.total ? (s.counts[key] || 0) / s.total : 0;
      const circle = `<circle cx="110" cy="110" r="80" fill="none" stroke="${color}" stroke-width="24" pathLength="100" stroke-dasharray="${fraction * 100} ${100 - fraction * 100}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`;
      offset += fraction * 100;
      return fraction ? circle : '';
    })
    .join('');
  const donut = `<div class="report-donut" style="text-align:center;break-inside:avoid"><svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Phân bố ${s.total} ${W.unitTasks}"><circle cx="110" cy="110" r="80" fill="none" stroke="#eeeaf2" stroke-width="24"/>${rings}<text x="110" y="108" text-anchor="middle" fill="#352d40" font-size="30" font-weight="700">${s.total}</text><text x="110" y="132" text-anchor="middle" fill="#74677e" font-size="13">${W.unitTasks}</text></svg></div>`;
  const distribution = groups
    .map(([key, label, color]) => {
      const count = s.counts[key] || 0,
        pct = percent(count);
      return `<tr class="report-status-main"><td width="58%" style="font-size:13px;padding:9px 14px 4px;border-radius:10px 0 0 0;background:#faf8fc;border-top:1px solid #eee8f3;border-left:1px solid #eee8f3"><span style="color:${color}">●</span> <strong>${label}</strong></td><td align="right" style="font-size:13px;padding:9px 14px 4px;border-radius:0 10px 0 0;background:#faf8fc;border-top:1px solid #eee8f3;border-right:1px solid #eee8f3"><strong>${count}</strong> ${W.unit} <span style="color:#756580">·</span> <strong>${pct}%</strong></td></tr><tr class="report-status-bar"><td colspan="2" style="padding:0 14px 8px;border-radius:0 0 10px 10px;background:#faf8fc;border:1px solid #eee8f3;border-top:0">${reportBar(pct, color, true)}</td></tr>`;
    })
    .join('');
  let projectIndex = 0;
  const lines = String(report.text || '').split('\n'),
    content = lines
      .slice(4)
      .map((line) => {
        if (line.startsWith('◆ ')) {
          const p = s.projects[projectIndex++];
          if (!p) return '';
          const color = /^#[a-f\d]{6}$/i.test(p.color) ? p.color : '#8054bf';
          return `<h2 class="report-project-title" style="--report-accent:${color};font-size:18px;margin:26px 0 6px;padding:12px 14px;border-left:3px solid ${color};break-after:avoid">${reportEscape(p.name)}</h2><table role="presentation" width="100%" class="report-project-progress"><tr><td style="font-size:13px;color:#6a6073">${W.projectProgress}</td><td align="right" style="font-size:18px;font-weight:bold;color:${color}">${p.pct}%</td></tr></table>${reportBar(p.pct, color)}`;
        }
        if (!line)
          return '<div class="report-section-gap" aria-hidden="true"></div>';
        if (line.startsWith(W.rhythm))
          return `<h2 class="report-rhythm-title" style="font-size:18px;margin:24px 0 10px;break-after:avoid">${reportEscape(line)}</h2>`;
        if (line.startsWith(W.priorityMark))
          return `<p class="report-priority-note">${reportEscape(line)}</p>`;
        if (line.startsWith(W.lead) || line.startsWith('Gợi ý tuần tới:'))
          return `<p class="report-suggestion-lead">${reportEscape(line)}</p>`;
        if (line.startsWith('• '))
          return `<p class="report-suggestion-item">${reportEscape(line)}</p>`;
        if (line.startsWith('  '))
          return `<p class="report-suggestion-next">${reportEscape(line.trim())}</p>`;
        if (W.projectRe.test(line))
          return `<p class="report-project-summary">${reportEscape(line)}</p>`;
        if (line.startsWith(W.deltaMark))
          return `<p class="report-project-delta">${reportEscape(line)}</p>`;
        if (/^(Thứ \d|Thứ \d–\d|Chủ nhật:)/.test(line))
          return `<p class="report-rhythm-step">${reportEscape(line)}</p>`;
        if (line.startsWith(W.footnoteMark))
          return `<p class="report-rhythm-footnote">${reportEscape(line)}</p>`;
        return `<p class="report-body-copy">${reportEscape(line)}</p>`;
      })
      .join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${reportEscape(report.subject)}</title><style>${REPORT_STYLE}</style></head><body><main class="report-sheet" style="max-width:680px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e7e1ec"><p style="font-size:11px;letter-spacing:2px;color:#887491;margin:0 0 10px">${voice.weeklyEyebrow}</p><h1 style="font-size:27px;line-height:1.35;margin:0 0 8px">${voice.weeklyTitle}</h1><p style="font-size:13px;color:#74677e;margin:0 0 24px">${reportEscape(lines[0].replace(voice.weeklyLine + ' · ', ''))}</p><table role="presentation" width="100%"><tr><td><strong style="font-size:30px">${s.progress}%</strong><br><span style="font-size:12px;color:#74677e">${W.overall}</span></td><td align="right" style="font-size:14px">${s.projects.length} ${W.unitProjects}<br>${s.total} ${W.unitTasks}</td></tr></table>${reportBar(s.progress, '#8054bf')}<h2 style="font-size:17px;margin:24px 0 10px">${W.distribution}</h2>${donut}<table class="report-distribution" cellpadding="0" cellspacing="0" aria-label="${W.distribution} theo trạng thái">${distribution}</table>${content}<div id="report-task-data" hidden>${reportEscape(JSON.stringify(s.tasks || []))}</div><p style="margin-top:28px;padding-top:16px;border-top:1px solid #e7e1ec;font-size:12px;color:#74677e">Mở <a href="https://kanban.huongthiennature.com/">Kanban Zen Studio</a> ${W.footer}</p></main></body></html>`;
}
