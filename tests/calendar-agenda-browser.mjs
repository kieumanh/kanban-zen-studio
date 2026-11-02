// Hồi quy v1.15.49: Lịch dạng danh sách (Agenda) ở màn hình vừa (701–1023px) thay cho lưới 7 cột ~80px mỗi ngày; nút "Danh sách | Lưới tháng" đổi
// qua lại và nhớ lựa chọn; màn hình rộng giữ lưới, điện thoại giữ bố cục riêng. Chỉ đổi cách hiển thị, không đổi dữ liệu.
import assert from 'node:assert/strict';
import { defaultSeed, makeProject, startHarness } from './lib/browser-harness.mjs';

const task = (id, title, extra = {}) => ({ id, title, col: 'List', description: '', due: '', tag: 'Công việc', priority: 'q2', checks: [], ...extra });
// Tháng 10/2026: 5/10 là thứ Hai. Tháng khác và việc không đủ điều kiện dùng để kiểm tra bộ lọc.
const seed = () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 0, {
    tasks: [
      task('a1', 'Hạn nộp hồ sơ', { due: '2026-10-05' }),
      task('a2', 'Họp đối tác', { start: '2026-10-05T14:00', end: '2026-10-05T15:30' }),
      task('a3', 'Khóa tu ba ngày', { start: '2026-10-07T09:00', end: '2026-10-09T17:00' }),
      task('a4', 'Việc đã xong', { col: 'Done', due: '2026-10-06' }),
      task('a5', 'Việc chưa đặt lịch'),
      task('a6', 'Việc tháng sau', { due: '2026-11-03' }),
      task('a7', 'Chuẩn bị', { checks: [{ id: 'c1', text: 'Dọn phòng', done: false, start: '2026-10-05T08:00', end: '2026-10-05T09:00' }] }),
    ],
  });
  return { ...defaultSeed(), projects: [p1, makeProject('p2', 'Dự án phụ', '#c764a2', 2)] };
};
const h = await startHarness({ seed });
const failures = [];
const fail = (cfg, step, msg) => failures.push(`[${cfg.label}] ${step}: ${msg}`);

const CONFIGS = [
  { label: '820px chuột', width: 820, touch: false, medium: true },
  { label: '820px cảm ứng', width: 820, touch: true, medium: true },
  { label: '1440px', width: 1440, touch: false, medium: false },
  { label: '390px cảm ứng', width: 390, touch: true, phone: true },
];

const gotoOctober = async (page) => {
  await h.show(page, 'calendar');
  await page.evaluate(() => {
    calendarMonth = 9;
    calendarYear = 2026;
    render();
  });
  await page.waitForTimeout(150);
};

const read = (page) =>
  page.evaluate(() => {
    const box = (e) => {
      const b = e.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    };
    const toggle = [...document.querySelectorAll('[data-zen-cal-mode]')].map((b) => ({ mode: b.dataset.zenCalMode, pressed: b.getAttribute('aria-pressed'), ...box(b) }));
    return {
      agenda: !!document.querySelector('.zen-month-agenda'),
      grid: !!document.querySelector('.month-grid'),
      phoneAgenda: !!document.querySelector('.zen-day-agenda'),
      toggle,
      scrollW: document.documentElement.scrollWidth,
      innerW: innerWidth,
      empty: document.querySelector('.zen-ma-empty')?.textContent.trim() || null,
      days: [...document.querySelectorAll('.zen-ma-day')].map((d) => ({
        date: d.querySelector('time')?.dateTime,
        head: d.querySelector('.zen-ma-date')?.textContent.trim(),
        today: d.classList.contains('today'),
        items: [...d.querySelectorAll('.zen-ma-item')].map((i) => ({
          title: i.querySelector('strong')?.textContent.trim(),
          when: i.querySelector('.zen-ma-when')?.textContent.trim(),
          note: i.querySelector('small')?.textContent.trim(),
          pct: i.querySelector('.zen-ma-pct')?.textContent.trim(),
          task: i.dataset.task,
          ...box(i),
          titleW: Math.round(i.querySelector('strong').getBoundingClientRect().width),
        })),
      })),
    };
  });

async function medium(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch });
  await gotoOctober(page);
  let s = await read(page);
  if (!s.agenda || s.grid) fail(cfg, 'mặc định', `phải là danh sách (agenda=${s.agenda}, lưới=${s.grid})`);
  const pressed = Object.fromEntries(s.toggle.map((t) => [t.mode, t.pressed]));
  if (pressed.list !== 'true' || pressed.grid !== 'false') fail(cfg, 'nút đổi kiểu', `trạng thái nút: ${JSON.stringify(pressed)}`);
  if (s.scrollW > s.innerW) fail(cfg, 'bố cục', `tràn ngang ${s.scrollW}px > ${s.innerW}px`);
  const min = cfg.touch ? 44 : 24;
  for (const t of s.toggle) if (t.h < min || t.w < min) fail(cfg, 'vùng chạm', `nút "${t.mode}" ${t.w}×${t.h}px, cần ≥${min}px`);

  // Nội dung: chỉ ngày có sự kiện thật; việc nhiều ngày chỉ ở ngày bắt đầu và kết thúc; không có việc đã xong, chưa đặt lịch hay của tháng khác.
  if (JSON.stringify(s.days.map((d) => d.date)) !== JSON.stringify(['2026-10-05', '2026-10-07', '2026-10-09'])) {
    fail(cfg, 'các ngày có công việc', JSON.stringify(s.days.map((d) => d.date)));
    await context.close();
    return;
  }
  const [d5, d7, d9] = s.days;
  if (d5.head !== 'Thứ 2, 5/10') fail(cfg, 'tiêu đề ngày', `"${d5.head}"`);
  if (JSON.stringify(d5.items.map((i) => i.title)) !== JSON.stringify(['Hạn nộp hồ sơ', 'Chuẩn bị / Dọn phòng', 'Họp đối tác'])) fail(cfg, 'thứ tự trong ngày', `việc cả ngày trước, rồi theo giờ: ${JSON.stringify(d5.items.map((i) => `${i.when} ${i.title}`))}`);
  const [hanh, check, hop] = d5.items;
  if (hanh?.when !== 'Cả ngày' || !/^Hạn/.test(hanh.note)) fail(cfg, 'hạn', JSON.stringify(hanh));
  if (check?.when !== '08:00' || !/Checklist/.test(check.note)) fail(cfg, 'checklist', JSON.stringify(check));
  if (hop?.when !== '14:00' || !/Bắt đầu/.test(hop.note)) fail(cfg, 'việc trong ngày', JSON.stringify(hop));
  if (d7.items[0]?.title !== 'Khóa tu ba ngày' || d7.items[0].when !== '09:00' || !/Bắt đầu · 7\/10 → 9\/10/.test(d7.items[0].note)) fail(cfg, 'việc nhiều ngày (bắt đầu)', JSON.stringify(d7.items));
  if (d9.items[0]?.title !== 'Khóa tu ba ngày' || d9.items[0].when !== '17:00' || !/Kết thúc/.test(d9.items[0].note)) fail(cfg, 'việc nhiều ngày (kết thúc)', JSON.stringify(d9.items));
  if (s.days.some((d) => d.items.some((i) => /đã xong|chưa đặt lịch|tháng sau/.test(i.title)))) fail(cfg, 'bộ lọc', 'còn việc đã xong, chưa đặt lịch hoặc của tháng khác');
  for (const d of s.days)
    for (const i of d.items) {
      if (i.h < min) fail(cfg, 'vùng chạm', `dòng "${i.title}" cao ${i.h}px, cần ≥${min}px`);
      if (i.titleW < 160) fail(cfg, 'chữ bị bóp', `tiêu đề "${i.title}" chỉ rộng ${i.titleW}px (lưới cũ ~80px/ngày làm chữ bị bẻ từng từ)`);
    }

  // Bấm vào một dòng mở đúng chi tiết việc.
  await page.locator('.zen-ma-item', { hasText: 'Họp đối tác' }).click();
  await page.waitForFunction(() => document.querySelector('#editor')?.open && document.querySelector('#editor [name=title]')?.value === 'Họp đối tác', null, { timeout: 5000 }).catch(() => fail(cfg, 'mở việc', 'bấm dòng không mở chi tiết việc'));
  await page.evaluate(() => document.querySelector('#editor').close()); // đóng thẳng hộp thoại: việc đã mở đúng là điều cần kiểm tra ở đây

  // Điều hướng tháng: tháng 11 có "Việc tháng sau"; tháng 12 trống thì có lời nhắn.
  await page.locator('[data-month="1"]').click();
  s = await read(page);
  if (!s.agenda || s.days.length !== 1 || s.days[0].items[0]?.title !== 'Việc tháng sau') fail(cfg, 'tháng sau', JSON.stringify(s.days.map((d) => [d.date, d.items.map((i) => i.title)])));
  await page.locator('[data-month="1"]').click();
  s = await read(page);
  if (!s.agenda || s.days.length || !/chưa có công việc/.test(s.empty || '')) fail(cfg, 'tháng trống', `lời nhắn: ${s.empty}`);
  await page.locator('[data-month="-1"]').click();
  await page.locator('[data-month="-1"]').click();

  // Đổi sang lưới bằng bàn phím: tiêu điểm ở lại trên nút đổi kiểu; lựa chọn nhớ sau khi tải lại.
  await page.locator('[data-zen-cal-mode=grid]').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('.month-grid', { timeout: 5000 }).catch(() => fail(cfg, 'đổi sang lưới', 'không thấy lưới tháng'));
  s = await read(page);
  if (s.agenda || !s.grid) fail(cfg, 'đổi sang lưới', `agenda=${s.agenda}, lưới=${s.grid}`);
  const focused = await page.evaluate(() => document.activeElement?.dataset.zenCalMode || document.activeElement?.tagName);
  if (focused !== 'grid') fail(cfg, 'tiêu điểm', `sau khi đổi kiểu tiêu điểm ở "${focused}", cần ở nút "grid"`);
  await page.reload();
  await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
  await gotoOctober(page);
  s = await read(page);
  if (!s.grid || s.agenda) fail(cfg, 'nhớ lựa chọn', `sau khi tải lại: agenda=${s.agenda}, lưới=${s.grid}`);
  await page.locator('[data-zen-cal-mode=list]').click();
  s = await read(page);
  if (!s.agenda || s.grid) fail(cfg, 'đổi lại danh sách', `agenda=${s.agenda}, lưới=${s.grid}`);
  await context.close();

  // Ngày hôm nay có nhãn và viền riêng (đúng một ngày).
  {
    const { context: ctx, page: pg } = await h.open(cfg.width, { touch: cfg.touch });
    await h.show(pg, 'calendar');
    await pg.evaluate(() => {
      project('p1').tasks.push({ id: 'tt', title: 'Việc hôm nay', col: 'List', description: '', due: today(), tag: 'Công việc', priority: 'q2', checks: [] });
      save();
      calendarMonth = Number(today().slice(5, 7)) - 1;
      calendarYear = Number(today().slice(0, 4));
      render();
    });
    const t = await read(pg);
    const todays = t.days.filter((d) => d.today);
    if (todays.length !== 1 || !/Hôm nay/.test(todays[0].head) || !todays[0].items.some((i) => i.title === 'Việc hôm nay')) fail(cfg, 'hôm nay', JSON.stringify(todays.map((d) => [d.date, d.head])));
    await ctx.close();
  }
}

async function wide(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch });
  await gotoOctober(page);
  let s = await read(page);
  if (s.agenda || !s.grid) fail(cfg, 'mặc định', `màn hình rộng giữ lưới tháng (agenda=${s.agenda}, lưới=${s.grid})`);
  if (s.toggle.length !== 2) {
    fail(cfg, 'nút đổi kiểu', `cần 2 nút, có ${s.toggle.length}`);
    await context.close();
    return;
  }
  await page.locator('[data-zen-cal-mode=list]').click();
  s = await read(page);
  if (!s.agenda || s.grid || s.days.length !== 3) fail(cfg, 'đổi sang danh sách', `agenda=${s.agenda}, lưới=${s.grid}, số ngày=${s.days.length}`);
  await context.close();
}

async function phone(cfg) {
  const { context, page } = await h.open(cfg.width, { touch: cfg.touch });
  await gotoOctober(page);
  const s = await read(page);
  if (s.agenda || !s.grid || !s.phoneAgenda || s.toggle.length) fail(cfg, 'điện thoại', `giữ bố cục riêng: agenda=${s.agenda}, lưới=${s.grid}, danh sách ngày=${s.phoneAgenda}, nút đổi kiểu=${s.toggle.length}`);
  if (s.scrollW > s.innerW) fail(cfg, 'bố cục', `tràn ngang ${s.scrollW}px > ${s.innerW}px`);
  await context.close();
}

// Đổi cỡ cửa sổ qua ngưỡng 1023px (xoay máy tính bảng) vẽ lại lịch mà không cần tải lại.
async function resize() {
  const cfg = { label: 'đổi cỡ 820 ↔ 1440' };
  const { context, page } = await h.open(820, {});
  await gotoOctober(page);
  let s = await read(page);
  if (!s.agenda) fail(cfg, 'bắt đầu', 'ở 820px phải là danh sách');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForSelector('.month-grid', { timeout: 5000 }).catch(() => fail(cfg, 'mở rộng', 'lưới không hiện khi cửa sổ rộng ra 1440px'));
  s = await read(page);
  if (s.agenda) fail(cfg, 'mở rộng', 'danh sách vẫn còn khi cửa sổ rộng ra');
  await page.setViewportSize({ width: 820, height: 900 });
  await page.waitForSelector('.zen-month-agenda', { timeout: 5000 }).catch(() => fail(cfg, 'thu hẹp', 'danh sách không hiện khi cửa sổ thu về 820px'));
  await context.close();
}

try {
  for (const cfg of CONFIGS) await (cfg.phone ? phone(cfg) : cfg.medium ? medium(cfg) : wide(cfg));
  await resize();
  assert.deepEqual(failures, [], '\n' + failures.join('\n'));
  console.log('PASS calendar-agenda: lịch dạng danh sách ở 701–1023px (đúng ngày, thứ tự, bộ lọc, mở việc, đổi tháng), nút đổi kiểu nhớ lựa chọn, màn hình rộng và điện thoại giữ bố cục cũ.');
} finally {
  await h.close();
}
