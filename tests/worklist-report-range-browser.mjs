// v2.65.0 (Chiến Báo Hoàn Thiện): sửa hai hạn chế của báo cáo Liên hoàn lệnh (dist/worklist-report.js).
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ ở 1440:
//  1. Khoảng ngày: có 7 / 14 / 30 / 60 / 90 và ô nhập số ngày (1–180); chọn xong số liệu đúng; giá trị sai (trống, 0, 181, chữ) thì giữ khoảng cũ; làm tròn số lẻ.
//  2. Khoảng dài hơn 30 ngày thì biểu đồ gộp theo tuần (tiêu đề cột, bảng, tổng khớp ô số liệu); từ 30 ngày trở xuống vẫn theo ngày.
//  3. Lựa chọn được nhớ giữa các lần mở; kho trình duyệt hỏng, giá trị rác hoặc ném lỗi thì về mặc định 14 ngày và không vỡ.
//  4. Việc xong chưa rõ ngày: có khung “Bổ sung ngày xong”; chọn ngày rồi Lưu thì chỉ ghi doneAt của đúng việc đó, số liệu cập nhật; ngày tương lai hoặc trống thì không ghi; không có việc nào khác bị đổi.
//  5. Hàm số liệu: chuỗi cột theo ngày / theo tuần, giới hạn khoảng.
//  6. Bố cục: không tràn ngang, ô nhập và nút ≥ 44 px, chữ mới đủ tương phản, Giang hồ có đủ chữ mới.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await wait(100);
  }
  assert.fail('quá hạn chờ: ' + label);
}

// Dữ liệu giống tests/worklist-report-browser.mjs. Hôm nay 12/11. Đã xong có ngày: F (p1t3, xong 11/11), G (p2t3, xong 25/10), H (p3t3, xong 12/11);
// I (p2t7, “Việc số 8”) xong nhưng không có doneAt. Đã gỡ: J (gỡ 09/11), K (gỡ 18/10). Dòng của việc đã xóa / đã lưu trữ vẫn tính vào “ghi vào”.
const seed = (opts = {}) => () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6);
  const p2 = makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 8);
  const p3 = makeProject('p3', 'Sổ nợ An Tâm', '#e78c56', 4);
  p1.tasks[3].doneAt = '2026-11-11';
  p2.tasks[3].doneAt = '2026-10-25';
  p3.tasks[3].doneAt = '2026-11-12';
  p3.tasks[2].archived = true;
  delete p1.tasks[4].priority;
  if (opts.twoUndated) delete p1.tasks[3].doneAt;
  const items = [
    { t: 'p2t0', a: '2026-11-10' },
    { t: 'p1t1', a: '2026-11-10' },
    { t: 'p3t1', a: '2026-11-11' },
    { t: 'p2t2', a: '2026-11-02' },
    { t: 'p1t4', a: '2026-10-20' },
    { t: 'p1t3', a: '2026-11-09' },
    { t: 'p2t3', a: '2026-10-21' },
    { t: 'p3t3', a: '2026-11-12' },
    { t: 'p2t7', a: '2026-11-01' },
    { t: 'p1t5', a: '2026-11-06', x: '2026-11-09' },
    { t: 'p2t1', a: '2026-10-15', x: '2026-10-18' },
    { t: 'khong-con-viec-nay', a: '2026-11-11' },
    { t: 'p3t2', a: '2026-11-11' },
    { t: 'p2t0', a: '2026-11-12' },
  ];
  return { schema: 1, projects: [p1, p2, p3], notes: [], worklist: { v: 1, items } };
};
const setup =
  (theme, style) =>
  ({ context }) =>
    context.addInitScript(
      ([t, s]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
      },
      [theme, style],
    );
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const kpis = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('#wl-report .wlr-kpis li')].map((li) => [li.querySelector('.wlr-label').textContent, li.querySelector('b').textContent]),
    ),
  );
const kpiSub = (page, label) =>
  page.evaluate(
    (l) => [...document.querySelectorAll('#wl-report .wlr-kpis li')].find((li) => li.querySelector('.wlr-label').textContent === l)?.querySelector('small').textContent,
    label,
  );
const cols = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#wl-report .wlr-day')].map((d) => {
      const m = /^(.+) · Ghi vào (\d+) · Đã xong (\d+)$/.exec(d.getAttribute('title')) || [];
      return { when: m[1], added: Number(m[2]), done: Number(m[3]) };
    }),
  );
const chips = (page) =>
  page.evaluate(() => ({
    all: [...document.querySelectorAll('#wl-report .wlr-chip')].map((c) => c.textContent),
    on: [...document.querySelectorAll('#wl-report .wlr-chip.is-on')].map((c) => c.textContent),
    input: document.querySelector('#wl-report [data-wlr-custom]')?.value,
  }));
const setDays = async (page, value) => {
  const input = page.locator('#wl-report [data-wlr-custom]');
  await input.fill(String(value));
  await input.press('Enter');
};
const stored = (page) => page.evaluate(() => localStorage.getItem('zen-wlr-period'));
const contrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), {
      width: 1,
      height: 1,
    }).getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const mix = (c, under) =>
      [0, 1, 2].map((i) => c[i] * c[3] + under[i] * (1 - c[3]));
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) =>
          (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const chain = [];
    for (let n = el; n; n = n.parentElement)
      chain.push(getComputedStyle(n).backgroundColor);
    let bg = [255, 255, 255];
    for (const css of chain.reverse()) {
      const c = rgba(css);
      if (c[3] > 0) bg = mix(c, bg);
    }
    const fg = mix(rgba(getComputedStyle(el).color), bg),
      [a, b] = [lum(fg), lum(bg)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);

const SUMS = (list) => ({ added: list.reduce((a, c) => a + c.added, 0), done: list.reduce((a, c) => a + c.done, 0) });
const KPI = {
  d14: { 'Ghi vào chuỗi': '10', 'Đã xong': '2', 'Tỉ lệ xong': '67%', 'Từ ghi đến xong': '1 ngày' },
  d30: { 'Ghi vào chuỗi': '13', 'Đã xong': '3', 'Tỉ lệ xong': '60%', 'Từ ghi đến xong': '2 ngày' },
  d5: { 'Ghi vào chuỗi': '7', 'Đã xong': '2', 'Tỉ lệ xong': '67%', 'Từ ghi đến xong': '1 ngày' },
  d7: { 'Ghi vào chuỗi': '8', 'Đã xong': '2', 'Tỉ lệ xong': '67%', 'Từ ghi đến xong': '1 ngày' },
};

const h = await startHarness({ seed: seed() });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page, server } = await h.open(width, { touch, now: NOW, setup: setup(theme), workspace: seed()() });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'worklist');
      await page.waitForSelector('#wl-report .wlr-kpis');
      const before = JSON.stringify(server.workspace);

      // 1. Các lựa chọn khoảng ngày và mặc định.
      assert.deepEqual(
        await chips(page),
        { all: ['7 ngày', '14 ngày', '30 ngày', '60 ngày', '90 ngày'], on: ['14 ngày'], input: '14' },
        'năm nút khoảng ngày + ô số ngày, mặc định 14' + at,
      );
      assert.equal(await stored(page), null, 'chưa chọn gì thì chưa ghi gì vào kho trình duyệt' + at);
      assert.deepEqual(await kpis(page), KPI.d14, 'số liệu 14 ngày' + at);
      assert.equal((await cols(page)).length, 14, '14 cột theo ngày' + at);

      // 2. 60 ngày: gộp theo tuần; tổng khớp ô số liệu.
      await page.locator('#wl-report [data-wlr-period="60"]').click();
      await until(async () => (await chips(page)).on[0] === '60 ngày', '60 ngày được chọn');
      assert.deepEqual(await kpis(page), KPI.d30, 'số liệu 60 ngày' + at);
      let c = await cols(page);
      assert.equal(c.length, 9, '60 ngày = 9 cột tuần (8 tuần đủ + 4 ngày đầu)' + at);
      assert.deepEqual(SUMS(c), { added: 13, done: 3 }, 'tổng cột tuần khớp ô số liệu' + at);
      assert.deepEqual(
        c.slice(-5),
        [
          { when: '09/10–15/10', added: 1, done: 0 },
          { when: '16/10–22/10', added: 2, done: 0 },
          { when: '23/10–29/10', added: 0, done: 1 },
          { when: '30/10–05/11', added: 2, done: 0 },
          { when: '06/11–12/11', added: 8, done: 2 },
        ],
        'năm tuần gần nhất đúng từng số' + at,
      );
      assert.equal(c[0].when, '14/09–17/09', 'cột đầu ngắn hơn bảy ngày' + at);
      assert.equal(await page.locator('#wl-report .wlr-card').first().locator('h3').textContent(), 'Ghi vào và hoàn thành theo tuần', 'tiêu đề theo tuần' + at);
      assert.equal(await stored(page), '60', 'đã nhớ lựa chọn 60' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-wlr-period')), '60', 'tiêu điểm ở lại nút vừa bấm' + at);
      await page.locator('#wl-report details.wlr-tables summary').click();
      const tb = await page.evaluate(() => {
        const t = document.querySelector('#wl-report details.wlr-tables table');
        return { caption: t.querySelector('caption').textContent, head: t.querySelector('thead th').textContent, rows: t.querySelectorAll('tbody tr').length, first: t.querySelector('tbody th').textContent };
      });
      assert.deepEqual(tb, { caption: 'Theo tuần (60 ngày gần nhất)', head: 'Tuần', rows: 9, first: '14/09–17/09' }, 'bảng theo tuần' + at);

      // 90 và 180 ngày.
      await page.locator('#wl-report [data-wlr-period="90"]').click();
      await until(async () => (await chips(page)).on[0] === '90 ngày', '90 ngày được chọn');
      c = await cols(page);
      assert.equal(c.length, 13, '90 ngày = 13 cột tuần' + at);
      assert.equal(c[0].when, '15/08–20/08', 'cột đầu của 90 ngày' + at);
      assert.deepEqual(SUMS(c), { added: 13, done: 3 }, 'tổng 90 ngày' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang ở 90 ngày' + at);
      await setDays(page, 180);
      await until(async () => (await cols(page)).length === 26, '180 ngày = 26 cột tuần');
      assert.ok(await noOverflow(page), 'không tràn ngang ở 180 ngày' + at);
      assert.equal(await stored(page), '180', 'nhớ 180' + at);

      // 30 ngày vẫn theo ngày.
      await page.locator('#wl-report [data-wlr-period="30"]').click();
      await until(async () => (await cols(page)).length === 30, '30 ngày = 30 cột ngày');
      assert.deepEqual(await kpis(page), KPI.d30, 'số liệu 30 ngày' + at);
      assert.equal(await page.locator('#wl-report .wlr-card').first().locator('h3').textContent(), 'Ghi vào và hoàn thành theo ngày', 'tiêu đề theo ngày' + at);
      assert.equal((await cols(page))[29].when, '12/11', 'cột cuối là hôm nay, nhãn một ngày' + at);

      // 3. Ô nhập số ngày: 5 ngày, giá trị sai giữ khoảng cũ, số lẻ làm tròn.
      await setDays(page, 5);
      await until(async () => (await cols(page)).length === 5, '5 ngày = 5 cột');
      assert.deepEqual(await kpis(page), KPI.d5, 'số liệu 5 ngày' + at);
      assert.deepEqual(await chips(page), { all: ['7 ngày', '14 ngày', '30 ngày', '60 ngày', '90 ngày'], on: [], input: '5' }, 'số ngày tùy ý thì không nút nào sáng' + at);
      assert.equal(await stored(page), '5', 'nhớ 5' + at);
      for (const bad of ['0', '181', '-3', '']) {
        await setDays(page, bad);
        await wait(150);
        assert.equal((await chips(page)).input, '5', 'giá trị sai "' + bad + '" thì trả về khoảng cũ' + at);
        assert.deepEqual(await kpis(page), KPI.d5, 'số liệu không đổi sau "' + bad + '"' + at);
        assert.equal(await stored(page), '5', 'giá trị sai không được nhớ' + at);
      }
      await setDays(page, '7.4');
      await until(async () => (await chips(page)).on[0] === '7 ngày', '7.4 làm tròn thành 7');
      assert.deepEqual(await kpis(page), KPI.d7, 'số liệu 7 ngày' + at);
      assert.equal(await stored(page), '7', 'nhớ 7' + at);
      await page.locator('#wl-report [data-wlr-period="14"]').click();
      await until(async () => (await cols(page)).length === 14, 'về 14 ngày');

      // 4. Việc xong chưa rõ ngày: ghi chú, khung bổ sung ngày, ghi đúng một việc.
      assert.match(await page.locator('#wl-report .help-copy').first().textContent(), /Có 1 việc đã xong nhưng không rõ ngày xong/, 'ghi chú' + at);
      assert.equal(await kpiSub(page, 'Đã xong'), 'trong 14 ngày qua · chưa tính 1 việc chưa rõ ngày xong', 'ô “Đã xong” nói rõ việc chưa tính' + at);
      assert.equal(await page.locator('#wl-report details.wlr-fix').count(), 1, 'có khung bổ sung ngày' + at);
      assert.equal(await page.locator('#wl-report details.wlr-fix').evaluate((d) => d.open), false, 'khung gập sẵn' + at);
      await page.locator('#wl-report details.wlr-fix summary').click();
      const row = await page.evaluate(() => {
        const r = document.querySelector('#wl-report .wlr-fixrow');
        const i = r.querySelector('input[type=date]');
        return { name: r.querySelector('.wlr-fixtitle').textContent, project: r.querySelector('small').textContent, value: i.value, max: i.max, btn: r.querySelector('button').textContent };
      });
      assert.deepEqual(row, { name: 'Việc số 8', project: 'Hương Thiền Nature — Website', value: '2026-11-12', max: '2026-11-12', btn: 'Lưu ngày' }, 'dòng bổ sung ngày' + at);
      assert.equal(JSON.stringify(server.workspace), before, 'đến đây vẫn chưa ghi gì lên máy chủ' + at);

      // Ngày bị từ chối: tương lai, trống.
      const date = page.locator('#wl-report [data-wlr-fix-date="p2t7"]');
      for (const bad of ['2026-11-13', '']) {
        await date.fill(bad);
        await page.locator('#wl-report [data-wlr-fix="p2t7"]').click();
        await wait(300);
        assert.equal(JSON.stringify(server.workspace), before, 'ngày "' + bad + '" không được ghi' + at);
        assert.equal(await page.locator('#wl-report [data-wlr-fix="p2t7"]').count(), 1, 'dòng vẫn còn' + at);
      }

      // Bố cục + chữ mới (khung đang mở, đang ở 14 ngày).
      assert.ok(await noOverflow(page), 'không tràn ngang khi mở khung bổ sung' + at);
      const box = await page.evaluate(() => {
        const hgt = (s) => Math.round(document.querySelector(s).getBoundingClientRect().height);
        return { custom: hgt('#wl-report [data-wlr-custom]'), date: hgt('#wl-report [data-wlr-fix-date]'), btn: hgt('#wl-report .wlr-fixbtn'), sum: hgt('#wl-report .wlr-fix summary'), chip: hgt('#wl-report .wlr-chip') };
      });
      for (const [k, v] of Object.entries(box)) assert.ok(v >= 44, k + ' cao ≥ 44 px (' + v + ')' + at);
      for (const sel of ['#wl-report .wlr-custom span', '#wl-report .wlr-hint', '#wl-report .wlr-fixname small', '#wl-report .wlr-fixhint', '#wl-report .wlr-fix summary']) {
        const ratio = await contrast(page, sel);
        assert.ok(ratio >= 4.5, sel + ' tương phản ' + ratio + ' ≥ 4.5' + at);
      }
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#wl-report .wlr-fixrow')).borderRadius), '12px', 'dòng bo tròn' + at);

      // Lưu ngày hợp lệ: chỉ doneAt của việc này đổi.
      await date.fill('2026-11-10');
      await page.locator('#wl-report [data-wlr-fix="p2t7"]').click();
      await until(() => server.workspace.projects[1].tasks[7].doneAt === '2026-11-10', 'doneAt được ghi lên máy chủ');
      const after = JSON.parse(JSON.stringify(server.workspace));
      delete after.projects[1].tasks[7].doneAt;
      // Máy chủ thêm vài khóa mặc định rỗng khi lưu (dailyHabits, taskTemplates, trash): chỉ so phần dữ liệu người dùng.
      const was = JSON.parse(before);
      assert.deepEqual(after.projects, was.projects, 'chỉ doneAt của đúng một việc đổi, không gì khác trong các dự án' + at);
      assert.deepEqual(after.worklist, was.worklist, 'chuỗi không đổi' + at);
      assert.deepEqual(after.notes, was.notes, 'ghi chú không đổi' + at);
      assert.deepEqual(
        await kpis(page),
        { 'Ghi vào chuỗi': '10', 'Đã xong': '3', 'Tỉ lệ xong': '75%', 'Từ ghi đến xong': '3,7 ngày' },
        'việc vừa bổ sung ngày vào số liệu: 3 xong, 1 gỡ, chờ (2 + 0 + 9) / 3' + at,
      );
      assert.equal(await page.locator('#wl-report details.wlr-fix').count(), 0, 'hết việc chưa rõ ngày thì khung biến mất' + at);
      assert.equal(await page.locator('#wl-report .help-copy').count(), 0, 'ghi chú biến mất' + at);
      assert.equal(await kpiSub(page, 'Đã xong'), 'trong 14 ngày qua', 'ô “Đã xong” không còn nhắc việc chưa tính' + at);
      assert.equal((await cols(page)).find((x) => x.when === '10/11').done, 1, 'cột 10/11 có một việc xong' + at);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName + ':' + !!document.activeElement?.closest('#wl-report')), 'H2:true', 'tiêu điểm về tiêu đề báo cáo' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await page.context().close();
    }
  }

  // 5. Hai việc chưa rõ ngày: lưu một việc thì khung vẫn mở, việc còn lại ở nguyên.
  {
    const { page, server } = await h.open(1440, { now: NOW, setup: setup('light'), workspace: seed({ twoUndated: true })() });
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    assert.match(await page.locator('#wl-report .help-copy').first().textContent(), /Có 2 việc đã xong nhưng không rõ ngày xong/, 'hai việc chưa rõ ngày');
    assert.equal(await page.locator('#wl-report .wlr-fixrow').count(), 2, 'hai dòng bổ sung');
    await page.locator('#wl-report details.wlr-fix summary').click();
    await page.locator('#wl-report [data-wlr-fix-date="p1t3"]').fill('2026-11-11');
    await page.locator('#wl-report [data-wlr-fix="p1t3"]').click();
    await until(() => server.workspace.projects[0].tasks[3].doneAt === '2026-11-11', 'doneAt của việc thứ nhất');
    assert.equal(server.workspace.projects[1].tasks[7].doneAt, undefined, 'việc kia chưa bị đụng');
    assert.equal(await page.locator('#wl-report .wlr-fixrow').count(), 1, 'còn một dòng');
    assert.equal(await page.locator('#wl-report details.wlr-fix').evaluate((d) => d.open), true, 'khung vẫn mở');
    assert.equal(await page.evaluate(() => document.activeElement?.tagName + ':' + !!document.activeElement?.closest('.wlr-fix')), 'SUMMARY:true', 'tiêu điểm về tiêu đề khung');
    assert.deepEqual(await kpis(page), { 'Ghi vào chuỗi': '10', 'Đã xong': '2', 'Tỉ lệ xong': '67%', 'Từ ghi đến xong': '1 ngày' }, 'xong 11/11 và 12/11, một việc vẫn chưa tính');
    assert.equal(await kpiSub(page, 'Đã xong'), 'trong 14 ngày qua · chưa tính 1 việc chưa rõ ngày xong', 'còn một việc chưa tính');
    await page.context().close();
  }

  // 6. Nhớ giữa các lần mở.
  {
    const { page } = await h.open(390, { touch: true, now: NOW, setup: setup('light'), workspace: seed()() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    await page.locator('#wl-report [data-wlr-period="30"]').click();
    await until(async () => (await chips(page)).on[0] === '30 ngày', 'chọn 30');
    await page.reload();
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    assert.deepEqual((await chips(page)).on, ['30 ngày'], 'mở lại vẫn 30 ngày');
    assert.deepEqual(await kpis(page), KPI.d30, 'mở lại: số liệu 30 ngày');
    await setDays(page, 45);
    await until(async () => (await cols(page)).length === 7, '45 ngày = 7 cột tuần');
    await page.reload();
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    assert.deepEqual(await chips(page), { all: ['7 ngày', '14 ngày', '30 ngày', '60 ngày', '90 ngày'], on: [], input: '45' }, 'mở lại vẫn 45 ngày');
    assert.equal((await cols(page)).length, 7, 'mở lại: 7 cột tuần');
    for (const junk of ['abc', '999', '0', '-5', '']) {
      await page.evaluate((v) => localStorage.setItem('zen-wlr-period', v), junk);
      await page.reload();
      await h.show(page, 'worklist');
      await page.waitForSelector('#wl-report .wlr-kpis');
      assert.deepEqual((await chips(page)).on, ['14 ngày'], 'giá trị rác "' + junk + '" thì về 14 ngày');
    }
    assert.deepEqual(errors, [], 'không lỗi trang khi kho có giá trị rác');
    await page.context().close();
  }
  // Kho trình duyệt ném lỗi: vẫn dùng được, chỉ không nhớ.
  {
    const blocked = ({ context }) =>
      context.addInitScript(() => {
        for (const m of ['getItem', 'setItem']) {
          const orig = Storage.prototype[m];
          Storage.prototype[m] = function (k) {
            if (k === 'zen-wlr-period') throw new Error('blocked');
            return orig.apply(this, arguments);
          };
        }
      });
    const { page } = await h.open(1440, { now: NOW, setup: blocked, workspace: seed()() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    assert.deepEqual((await chips(page)).on, ['14 ngày'], 'kho lỗi: mặc định 14 ngày');
    await page.locator('#wl-report [data-wlr-period="7"]').click();
    await until(async () => (await chips(page)).on[0] === '7 ngày', 'kho lỗi: vẫn chọn được');
    assert.deepEqual(await kpis(page), KPI.d7, 'kho lỗi: số liệu 7 ngày');
    assert.deepEqual(errors, [], 'kho lỗi không làm vỡ trang');
    await page.context().close();
  }

  // 7. Hàm số liệu thuần.
  {
    const { page } = await h.open(1440, { now: NOW, setup: setup('light'), workspace: seed()() });
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    const r = await page.evaluate(() => {
      const z = window.zenWorklistReport;
      const p = { id: 'x', name: 'X', color: '#123456' };
      const rows = [
        { e: { t: 'a', a: '2026-11-12' }, t: { id: 'a', col: 'Done', title: 'A' }, p },
        { e: { t: 'b', a: '2026-11-10' }, t: { id: 'b', col: 'Done', doneAt: '2026-11-11', title: 'B' }, p },
      ];
      const sum = (s) => [s.series.reduce((a, c) => a + c.added, 0), s.series.reduce((a, c) => a + c.done, 0)];
      const out = {};
      for (const n of [1, 7, 30, 31, 90, 180]) {
        const s = z.stats(n, rows, '2026-11-12');
        out[n] = { weekly: s.weekly, cols: s.series.length, sums: sum(s), first: s.series[0].from + '/' + s.series[0].to, undated: s.undated, rows: s.undatedRows.map((x) => x.t.id) };
      }
      return { periods: z.periods, limits: z.limits, out };
    });
    assert.deepEqual(r.periods, [7, 14, 30, 60, 90], 'các khoảng có sẵn');
    assert.deepEqual(r.limits, { min: 1, max: 180, weeklyOver: 30 }, 'giới hạn khoảng');
    assert.deepEqual(r.out['1'], { weekly: false, cols: 1, sums: [1, 0], first: '2026-11-12/2026-11-12', undated: 1, rows: ['a'] }, '1 ngày');
    assert.deepEqual(r.out['7'], { weekly: false, cols: 7, sums: [2, 1], first: '2026-11-06/2026-11-06', undated: 1, rows: ['a'] }, '7 ngày');
    assert.deepEqual(r.out['30'], { weekly: false, cols: 30, sums: [2, 1], first: '2026-10-14/2026-10-14', undated: 1, rows: ['a'] }, '30 ngày vẫn theo ngày');
    assert.deepEqual(r.out['31'], { weekly: true, cols: 5, sums: [2, 1], first: '2026-10-13/2026-10-15', undated: 1, rows: ['a'] }, '31 ngày: 4 tuần đủ + 3 ngày đầu');
    assert.deepEqual(r.out['90'], { weekly: true, cols: 13, sums: [2, 1], first: '2026-08-15/2026-08-20', undated: 1, rows: ['a'] }, '90 ngày');
    assert.deepEqual(r.out['180'], { weekly: true, cols: 26, sums: [2, 1], first: '2026-05-17/2026-05-21', undated: 1, rows: ['a'] }, '180 ngày');
    await page.context().close();
  }

  // 8. Giang hồ ở 1440 px.
  {
    const { page } = await h.open(1440, { now: NOW, setup: setup('light', 'giangho'), workspace: seed()() });
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    await page.locator('#wl-report [data-wlr-period="60"]').click();
    await until(
      async () => /theo tuần/.test(await page.locator('#wl-report .wlr-card').first().locator('h3').textContent()),
      'biểu đồ theo tuần',
    );
    const gh = () =>
      page.evaluate(() => ({
        h3: document.querySelector('#wl-report .wlr-card h3').textContent,
        title: document.querySelector('#wl-report .wlr-day:last-child').getAttribute('title'),
        sub: [...document.querySelectorAll('#wl-report .wlr-kpis li')].find((li) => li.querySelector('.wlr-label').textContent === 'Công thành')?.querySelector('small').textContent,
      }));
    await until(async () => (await gh()).h3 === 'Ghi vào và công thành theo tuần', 'tiêu đề Giang hồ');
    const g = await gh();
    assert.equal(g.title, '06/11–12/11 · Ghi vào 8 · Công thành 2', 'cột tuần Giang hồ');
    assert.equal(g.sub, 'trong 60 ngày qua · chưa tính 1 nhiệm vụ chưa rõ ngày công thành', 'ô công thành Giang hồ');
    await page.locator('#wl-report details.wlr-fix summary').click();
    await until(async () => (await page.locator('#wl-report .wlr-fix summary').textContent()) === 'Bổ sung ngày công thành', 'tên khung Giang hồ');
    const t = await page.evaluate(() => ({
      hint: document.querySelector('#wl-report .wlr-fixhint').textContent,
      label: document.querySelector('#wl-report .wlr-fixrow .wlr-custom span').textContent,
      btn: document.querySelector('#wl-report .wlr-fixbtn').textContent,
      th: document.querySelector('#wl-report details.wlr-tables thead th').textContent,
    }));
    assert.deepEqual(
      t,
      { hint: 'Chọn ngày công thành thật sự rồi bấm Ghi ngày cho từng nhiệm vụ. Hệ thống không tự đoán ngày.', label: 'Ngày công thành', btn: 'Ghi ngày', th: 'Tuần' },
      'chữ Giang hồ của khung bổ sung ngày',
    );
    await page.context().close();
  }
} finally {
  await h.close();
}
console.log('worklist report range browser ok');
