// v1.82.0: rà soát giao diện ở 3 kích thước — điện thoại 390 px (chạm), máy tính bảng 820 px (chạm), máy tính để bàn 1440 px (chuột).
// A. Lịch: hàng tiêu đề thứ chỉ cao theo chữ; ô lịch trên điện thoại chỉ hiện tối đa 3 dòng tên việc (tên đầy đủ nằm ở "Lịch ngày");
//    ô ngày không còn cao 150 px khi trống.
// B. Thiết bị cảm ứng: mọi nút, liên kết, ô chọn bấm được đều có cạnh ngắn ≥ 38 px (ô tích nhỏ nằm trong nhãn đủ lớn thì được tính theo nhãn).
// C. Không tràn ngang ở các màn hình chính và hộp thoại chính, cả ba kích thước.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const LONG = 'Chuẩn bị tài liệu hướng dẫn cho toàn bộ người tham dự khóa tu và gửi email xác nhận lịch trình chi tiết';
const NOSPACE = 'Supercalifragilisticexpialidocious_khongkhoangtrang_rat_dai_de_thu_tran_giao_dien_1234567890';
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu — chương trình thiền định mười ngày tại Bảo Lộc', '#7950c8', 12);
  p1.tasks[0].title = LONG; // hạn 2026-11-01
  p1.tasks[1].title = NOSPACE; // hạn 2026-11-02
  return {
    schema: 1,
    projects: [p1, makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 5), makeProject('p3', 'Sổ nợ An Tâm', '#e78c56', 4)],
    notes: [
      { id: 'n1', type: 'note', title: 'Lịch thiền buổi sáng và các lưu ý quan trọng', text: 'Dòng đầu tiên\nDòng thứ hai khá dài để kiểm tra việc xuống dòng trong thẻ ghi chú trên màn hình hẹp', url: '', group: '', color: '#3f9a72' },
      { id: 'n2', type: 'note', title: 'Ý tưởng', text: 'Ngắn', url: '', group: 'Nhóm A', color: '#7950c8' },
    ],
    dailyHabits: [
      { id: 'h1', name: 'Thiền 10 phút mỗi sáng trước khi bắt đầu làm việc', icon: '🧘', color: '#7950c8', createdAt: '2026-10-01', goal: 7, done: ['2026-11-11', '2026-11-10'] },
      { id: 'h2', name: 'Đi bộ', icon: '🚶', color: '#2e7d5b', createdAt: '2026-10-20', goal: 5, done: ['2026-11-11'] },
    ],
    growth: {
      v: 1,
      hero: 'nu',
      name: 'Tiểu Liên',
      since: '2026-10-01',
      log: [{ id: 'g1', d: '2026-11-09', s: 'task', k: 'task:g1', n: 'Việc một', p: [20, 12, 8, 4, 0, 6, 0, 0] }],
      spend: [{ id: 's1', d: '2026-11-10', n: 'Tai nghe không dây Sony WH-1000XM5 màu bạc', note: 'Mua online', p: [8, 5, 3, 0, 0, 0, 0, 0] }],
    },
  };
};
const VIEWS = ['dashboard', 'projects', 'board', 'calendar', 'focus', 'habits', 'growth', 'notes', 'budget', 'resources'];
const DIALOGS = {
  'cài đặt': (page) => page.evaluate(() => { accountPanel(); document.querySelectorAll('details.wf-settings-group').forEach((d) => (d.open = true)); }),
  'thêm việc': (page) => page.evaluate(() => taskForm(project('p1'))),
  'sửa việc dài': (page) => page.evaluate(() => taskForm(project('p1'), project('p1').tasks[1])),
};
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
// Các điều khiển bấm được nhỏ hơn 38 px (không tính liên kết nằm giữa đoạn văn và thanh bên); ô tích/ô chọn nhỏ tính theo nhãn bao quanh.
const smallTargets = (page, min) =>
  page.evaluate((min) => {
    const out = [];
    const root = document.querySelector('dialog[open]') || document.body;
    for (const el of root.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab]')) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('p,.sidebar,[hidden]')) continue;
      let box = el;
      if (el.matches('input[type=checkbox],input[type=radio]')) box = el.closest('label') || el;
      const r = box.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < min || r.height < min) out.push((el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : el.tagName.toLowerCase()) + ' "' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    return [...new Set(out)];
  }, min);

const h = await startHarness({ seed });
try {
  // A. Lịch ở điện thoại 390 px.
  {
    const { context, page } = await h.open(390, { touch: true, workspace: seed(), now: NOW });
    await h.show(page, 'calendar');
    const m = await page.evaluate(() => {
      const head = document.querySelector('.month-weekday').getBoundingClientRect().height;
      const cells = [...document.querySelectorAll('.month-cell')].map((c) => c.getBoundingClientRect().height);
      const ev = [...document.querySelectorAll('.month-event')].map((e) => ({ title: e.title, h: e.getBoundingClientRect().height, clamp: getComputedStyle(e).webkitLineClamp }));
      return { head, minCell: Math.min(...cells), ev };
    });
    assert.ok(m.head < 60, 'hàng tiêu đề thứ chỉ cao theo chữ, không phải 150 px (390px): ' + m.head);
    assert.ok(m.minCell <= 100, 'ô ngày trống thấp lại (390px): ' + m.minCell);
    const long = m.ev.find((e) => e.title.startsWith(LONG));
    assert.ok(long, 'có thẻ việc tên rất dài trong ô lịch');
    assert.equal(long.clamp, '3', 'ô lịch trên điện thoại giới hạn 3 dòng tên việc');
    assert.ok(long.h <= 62, 'thẻ việc tên dài chỉ cao tối đa 3 dòng (không phải hàng trăm px): ' + long.h);
    const huge = m.ev.find((e) => e.title.startsWith(NOSPACE));
    assert.ok(huge && huge.h <= 62, 'tên dài không có khoảng trắng cũng không làm ô cao vọt: ' + (huge && huge.h));
    assert.equal(await noOverflow(page), 0, 'lịch không tràn ngang (390px)');
    // Tên đầy đủ vẫn đọc được ở "Lịch ngày" sau khi chạm vào ngày.
    await page.click('[data-zen-select-day="2026-11-01"]');
    await page.waitForFunction((t) => document.querySelector('.zen-day-agenda')?.textContent.includes(t), LONG, { timeout: 4000 });
    assert.equal(await page.locator('.zen-day-agenda .zen-agenda-task strong').first().innerText(), LONG, 'Lịch ngày hiện đủ tên việc');
    await context.close();
  }

  // A2. Máy tính để bàn 1440 px: hàng tiêu đề thứ gọn, tên việc vẫn hiện đầy đủ (không cắt).
  {
    const { context, page } = await h.open(1440, { workspace: seed(), now: NOW });
    await h.show(page, 'calendar');
    const m = await page.evaluate(() => ({ head: document.querySelector('.month-weekday').getBoundingClientRect().height, clamp: getComputedStyle(document.querySelector('.month-event')).webkitLineClamp }));
    assert.ok(m.head < 70, 'hàng tiêu đề thứ gọn ở máy tính để bàn: ' + m.head);
    assert.notEqual(m.clamp, '3', 'máy tính để bàn không cắt tên việc ở 3 dòng');
    await context.close();
  }

  // B + C. Vùng chạm và tràn ngang ở cả ba kích thước.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, workspace: seed(), now: NOW });
    for (const view of VIEWS) {
      await h.show(page, view);
      await page.waitForTimeout(250);
      assert.ok((await noOverflow(page)) <= 0, 'không tràn ngang ở màn hình ' + view + at);
      if (touch) assert.deepEqual(await smallTargets(page, 38), [], 'vùng chạm nhỏ ở màn hình ' + view + at);
    }
    await h.show(page, 'board');
    for (const [name, open] of Object.entries(DIALOGS)) {
      await open(page);
      await page.waitForSelector('dialog[open]', { timeout: 4000 });
      await page.waitForTimeout(250);
      assert.ok((await noOverflow(page)) <= 0, 'hộp thoại "' + name + '" không tràn ngang' + at);
      const box = await page.evaluate(() => { const r = document.querySelector('dialog[open]').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
      assert.ok(box.l >= -1 && box.r <= box.w + 1, 'hộp thoại "' + name + '" nằm trong màn hình' + at);
      if (touch) assert.deepEqual(await smallTargets(page, 38), [], 'vùng chạm nhỏ trong hộp thoại "' + name + '"' + at);
      await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
    }
    await context.close();
  }
  console.log('device-audit-browser: OK');
} finally {
  await h.close();
}
