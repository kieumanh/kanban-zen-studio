// v2.64.0 (Báo Cáo Liên Hoàn): báo cáo đính kèm cuối trang Liên hoàn lệnh (dist/worklist-report.js).
// Kiểm ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối; Giang hồ ở 1440:
//  1. Số liệu đúng theo 7 / 14 / 30 ngày: ghi vào chuỗi, đã xong (theo doneAt), đã gỡ, tỉ lệ xong, số ngày trung bình từ ghi đến xong; việc đã xóa / lưu trữ / dòng trùng không làm sai số.
//  2. Biểu đồ cột theo ngày: đủ cột, chiều cao theo giá trị, hai chuỗi có chú thích, nhãn trục; thanh theo dự án đúng thứ hạng và đúng màu dự án; biểu đồ tuổi đủ bốn mốc.
//  3. Bảng số liệu (Xem dạng bảng) khớp biểu đồ; việc xong từ trước khi có doneAt có ghi chú riêng thay vì bị bỏ lặng lẽ.
//  4. Trạng thái trống: chưa có dòng nào; có dòng nhưng không có gì trong khoảng ngày đã chọn.
//  5. Nút khoảng ngày giữ tiêu điểm, nút “Xem báo cáo” nhảy tới báo cáo; chỉ đọc (không ghi gì lên máy chủ); việc xong thật (đổi cột) tự vào số liệu.
//  6. Bố cục: không tràn ngang, thẻ bo tròn, cột ≤ 24 px bo 4 px ở đầu dữ liệu, chữ đủ tương phản, nút ≥ 44 px, màu cột đủ tương phản với nền thẻ, không có chữ Anh.
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

// Hôm nay 12/11. Việc đang chờ: A (p2t0, 2 ngày), B (p1t1, 2), C (p3t1, 1), D (p2t2, 10), E (p1t4, 23).
// Đã xong: F (p1t3, ghi 09/11, xong 11/11), G (p2t3, ghi 21/10, xong 25/10), H (p3t3, ghi và xong 12/11), I (p2t7, xong nhưng không có doneAt).
// Đã gỡ: J (p1t5, gỡ 09/11), K (p2t1, gỡ 18/10). L là việc đã xóa, M là việc đã lưu trữ, N là dòng trùng của A: chỉ L, M tính vào “ghi vào”.
const seed = (items) => () => {
  const p1 = makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 6);
  const p2 = makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 8);
  const p3 = makeProject('p3', 'Sổ nợ An Tâm', '#e78c56', 4);
  p1.tasks[3].doneAt = '2026-11-11';
  p2.tasks[3].doneAt = '2026-10-25';
  p3.tasks[3].doneAt = '2026-11-12';
  p3.tasks[2].archived = true;
  delete p1.tasks[4].priority;
  const full = [
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
  return {
    schema: 1,
    projects: [p1, p2, p3],
    notes: [],
    ...(items === null ? {} : { worklist: { v: 1, items: items || full } }),
  };
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
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const kpis = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('#wl-report .wlr-kpis li')].map((li) => [
        li.querySelector('.wlr-label').textContent,
        li.querySelector('b').textContent,
      ]),
    ),
  );
const days = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#wl-report .wlr-day')].map((d) => ({
      title: d.getAttribute('title'),
      added: d.querySelector('.wlr-added')?.style.height || '',
      done: d.querySelector('.wlr-done')?.style.height || '',
    })),
  );
const rank = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#wl-report .wlr-rank li')].map((li) => ({
      name: li.querySelector('.wlr-name').textContent,
      n: li.querySelector('b').textContent,
      width: li.querySelector('.wlr-track i')?.style.width || '',
      color: li.querySelector('.wlr-track i')
        ? getComputedStyle(li.querySelector('.wlr-track i')).backgroundColor
        : '',
    })),
  );
const ages = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#wl-report .wlr-age')].map((a) => [
      a.querySelector('small').textContent,
      a.querySelector('b').textContent,
    ]),
  );
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
// Tương phản của màu nền một phần tử (cột, thanh) so với màu nền thẻ chứa nó.
const fillContrast = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cx = Object.assign(document.createElement('canvas'), {
      width: 1,
      height: 1,
    }).getContext('2d', { willReadFrequently: true });
    const rgb = (css) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = css;
      cx.fillRect(0, 0, 1, 1);
      return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map((v) =>
          (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
        )
        .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    const card = el.closest('.wlr-card');
    const [a, b] = [
      lum(rgb(getComputedStyle(el).backgroundColor)),
      lum(rgb(getComputedStyle(card).backgroundColor)),
    ];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);

const h = await startHarness({ seed: seed() });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { context, page, server } = await h.open(width, {
        touch,
        now: NOW,
        setup: setup(theme),
        workspace: seed()(),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'worklist');
      await page.waitForSelector('#wl-report .wlr-kpis');
      const before = JSON.stringify(server.workspace);

      // 1. Số liệu 14 ngày (mặc định).
      assert.deepEqual(
        await kpis(page),
        {
          'Ghi vào chuỗi': '10',
          'Đã xong': '2',
          'Tỉ lệ xong': '67%',
          'Từ ghi đến xong': '1 ngày',
        },
        'số liệu 14 ngày: dòng đã xóa và đã lưu trữ vẫn là lần ghi vào, dòng trùng thì không' +
          at,
      );
      assert.equal(
        await page.locator('#wl-report .wlr-chip.is-on').textContent(),
        '14 ngày',
        'mặc định 14 ngày' + at,
      );
      assert.match(
        await page.locator('#wl-report .wlr-oldest').textContent(),
        /Việc số 5 · 23 ngày \(Khóa tu mùa thu\)/,
        'việc nằm lâu nhất là E, 23 ngày' + at,
      );

      // 2. Biểu đồ theo ngày.
      const d14 = await days(page);
      assert.equal(d14.length, 14, '14 cột ngày' + at);
      const by = Object.fromEntries(d14.map((d) => [d.title.slice(0, 5), d]));
      assert.equal(d14[0].title.slice(0, 5), '30/10', 'cột đầu là 30/10' + at);
      assert.equal(
        d14[13].title,
        '12/11 · Ghi vào 1 · Đã xong 1',
        'cột cuối là hôm nay' + at,
      );
      assert.equal(
        by['11/11'].title,
        '11/11 · Ghi vào 3 · Đã xong 1',
        'ngày 11/11' + at,
      );
      assert.equal(by['11/11'].added, '75%', 'cột 3 trên mốc 4 cao 75%' + at);
      assert.equal(by['11/11'].done, '25%', 'cột 1 trên mốc 4 cao 25%' + at);
      assert.equal(
        by['10/11'].title,
        '10/11 · Ghi vào 2 · Đã xong 0',
        'ngày 10/11' + at,
      );
      assert.equal(by['10/11'].done, '', 'giá trị 0 không vẽ cột' + at);
      assert.equal(
        d14.reduce((a, d) => a + Number(d.title.match(/Ghi vào (\d+)/)[1]), 0),
        10,
        'tổng các cột ghi vào = 10' + at,
      );
      const labels = await page.evaluate(() => ({
        all: document.querySelectorAll('#wl-report .wlr-x span').length,
        shown: [
          ...document.querySelectorAll(
            '#wl-report .wlr-x span:not([aria-hidden])',
          ),
        ].map((s) => s.textContent),
        y: [...document.querySelectorAll('#wl-report .wlr-y span')].map(
          (s) => s.textContent,
        ),
        legend: document.querySelector('#wl-report .wlr-legend').textContent,
        keys: [
          ...document.querySelectorAll('#wl-report .wlr-legend .wlr-key'),
        ].map((k) => getComputedStyle(k).backgroundColor),
        role: document
          .querySelector('#wl-report .wlr-plot')
          .getAttribute('role'),
      }));
      assert.equal(labels.all, 14, 'nhãn trục ngang cho từng cột' + at);
      assert.equal(
        labels.shown.length,
        7,
        'hiện cách một ngày cho thoáng' + at,
      );
      assert.equal(labels.shown.at(-1), '12/11', 'nhãn cuối là hôm nay' + at);
      assert.deepEqual(labels.y, ['4', '2', '0'], 'trục dọc 0 / 2 / 4' + at);
      assert.match(
        labels.legend,
        /Ghi vào chuỗi\s*10/,
        'chú thích chuỗi một' + at,
      );
      assert.match(labels.legend, /Đã xong\s*2/, 'chú thích chuỗi hai' + at);
      assert.notEqual(labels.keys[0], labels.keys[1], 'hai chuỗi hai màu' + at);
      assert.equal(labels.role, 'img', 'biểu đồ có vai trò ảnh + mô tả' + at);

      // Thanh theo dự án: xếp theo số việc đang chờ giảm dần rồi theo tên, đúng màu dự án.
      const r = await rank(page);
      assert.deepEqual(
        r.map((x) => [x.name, x.n, x.width]),
        [
          ['Hương Thiền Nature — Website', '2', '100%'],
          ['Khóa tu mùa thu', '2', '100%'],
          ['Sổ nợ An Tâm', '1', '50%'],
        ],
        'thứ hạng dự án theo việc đang chờ' + at,
      );
      assert.deepEqual(
        r.map((x) => x.color),
        ['rgb(199, 100, 162)', 'rgb(121, 80, 200)', 'rgb(231, 140, 86)'],
        'thanh mang đúng màu dự án' + at,
      );
      assert.deepEqual(
        await ages(page),
        [
          ['0–2 ngày', '3'],
          ['3–7 ngày', '0'],
          ['8–14 ngày', '1'],
          ['15 ngày trở lên', '1'],
        ],
        'bốn mốc tuổi' + at,
      );

      // 3. Bảng số liệu + ghi chú việc không rõ ngày xong.
      const t = await page.evaluate(() => {
        const det = document.querySelector('#wl-report details.wlr-tables');
        const tables = [...det.querySelectorAll('table')];
        return {
          open: det.open,
          tables: tables.length,
          dayRows: tables[0].querySelectorAll('tbody tr').length,
          addedSum: [...tables[0].querySelectorAll('tbody tr')].reduce(
            (a, tr) => a + Number(tr.children[1].textContent),
            0,
          ),
          doneSum: [...tables[0].querySelectorAll('tbody tr')].reduce(
            (a, tr) => a + Number(tr.children[2].textContent),
            0,
          ),
          projects: [...tables[1].querySelectorAll('tbody tr')].map(
            (tr) => tr.textContent,
          ),
          captions: tables.map((x) => x.querySelector('caption').textContent),
          scoped: det.querySelectorAll('th[scope]').length > 8,
          note: document.querySelector('#wl-report .help-copy')?.textContent,
        };
      });
      assert.equal(t.open, false, 'bảng gập sẵn' + at);
      assert.equal(t.tables, 3, 'ba bảng' + at);
      assert.equal(t.dayRows, 14, 'bảng theo ngày đủ 14 dòng' + at);
      assert.equal(t.addedSum, 10, 'bảng khớp biểu đồ: ghi vào' + at);
      assert.equal(t.doneSum, 2, 'bảng khớp biểu đồ: đã xong' + at);
      assert.deepEqual(
        t.projects,
        ['Hương Thiền Nature — Website2', 'Khóa tu mùa thu2', 'Sổ nợ An Tâm1'],
        'bảng theo dự án' + at,
      );
      assert.ok(t.scoped, 'ô tiêu đề có scope' + at);
      assert.match(
        t.note,
        /Có 1 việc đã xong nhưng không rõ ngày xong/,
        'ghi chú việc xong không có doneAt' + at,
      );
      await page.locator('#wl-report details.wlr-tables summary').click();
      assert.ok(
        await page
          .locator('#wl-report details.wlr-tables table')
          .first()
          .isVisible(),
        'mở bảng thì thấy' + at,
      );
      await page.locator('#wl-report details.wlr-tables summary').click();

      // 5. Khoảng ngày: 7 và 30 ngày, tiêu điểm ở lại nút.
      await page.locator('#wl-report [data-wlr-period="7"]').click();
      assert.deepEqual(
        await kpis(page),
        {
          'Ghi vào chuỗi': '8',
          'Đã xong': '2',
          'Tỉ lệ xong': '67%',
          'Từ ghi đến xong': '1 ngày',
        },
        'số liệu 7 ngày' + at,
      );
      assert.equal((await days(page)).length, 7, '7 cột ngày' + at);
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.wlrPeriod),
        '7',
        'tiêu điểm ở lại nút 7 ngày' + at,
      );
      assert.equal(
        await page
          .locator('#wl-report [data-wlr-period="7"]')
          .getAttribute('aria-pressed'),
        'true',
        'nút 7 ngày đang chọn' + at,
      );
      assert.equal(
        await page
          .locator('#wl-report [data-wlr-period="14"]')
          .getAttribute('aria-pressed'),
        'false',
        'nút 14 ngày bỏ chọn' + at,
      );
      await page.locator('#wl-report [data-wlr-period="30"]').click();
      assert.deepEqual(
        await kpis(page),
        {
          'Ghi vào chuỗi': '13',
          'Đã xong': '3',
          'Tỉ lệ xong': '60%',
          'Từ ghi đến xong': '2 ngày',
        },
        'số liệu 30 ngày: có thêm việc G xong 25/10 và việc K gỡ 18/10' + at,
      );
      assert.equal((await days(page)).length, 30, '30 cột ngày' + at);
      assert.ok(await noOverflow(page), '30 ngày không tràn ngang' + at);
      await page.locator('#wl-report [data-wlr-period="14"]').click();

      // Báo cáo chỉ đọc: không ghi gì lên máy chủ.
      assert.equal(
        JSON.stringify(server.workspace),
        before,
        'xem báo cáo không đổi dữ liệu ở máy chủ' + at,
      );

      // Bố cục + màu sắc.
      const g = await page.evaluate(() => {
        const rep = document
          .querySelector('#wl-report')
          .getBoundingClientRect();
        const within = (el) => {
          const b = el.getBoundingClientRect();
          return b.left >= rep.left - 1 && b.right <= rep.right + 1;
        };
        const bars = [...document.querySelectorAll('#wl-report .wlr-bar')];
        const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]);
        return {
          cardsIn: [
            ...document.querySelectorAll(
              '#wl-report .wlr-card, #wl-report .wlr-kpis li, #wl-report .wlr-chart',
            ),
          ].every(within),
          radius: [
            ...document.querySelectorAll(
              '#wl-report .wlr-card, #wl-report .wlr-kpis li',
            ),
          ].map((e) => px(e, 'borderTopLeftRadius')),
          panelRadius: px(
            document.querySelector('#wl-report'),
            'borderTopLeftRadius',
          ),
          barMax: Math.max(...bars.map((b) => b.getBoundingClientRect().width)),
          barTop: [...new Set(bars.map((b) => px(b, 'borderTopLeftRadius')))],
          barBottom: [
            ...new Set(bars.map((b) => px(b, 'borderBottomLeftRadius'))),
          ],
          chip: [...document.querySelectorAll('#wl-report .wlr-chip')].map(
            (b) => b.getBoundingClientRect().height,
          ),
          summary: document
            .querySelector('#wl-report details.wlr-tables summary')
            .getBoundingClientRect().height,
          jump: document.querySelector('.wl-jump').getBoundingClientRect()
            .height,
          text: document.querySelector('#wl-report').textContent,
          cols: new Set(
            [...document.querySelectorAll('#wl-report .wlr-card')].map((c) =>
              Math.round(c.getBoundingClientRect().left),
            ),
          ).size,
        };
      });
      assert.ok(g.cardsIn, 'thẻ và biểu đồ nằm gọn trong báo cáo' + at);
      assert.ok(
        g.radius.every((x) => x >= 12) && g.panelRadius >= 12,
        'thẻ bo tròn ' + g.radius + at,
      );
      assert.ok(g.barMax <= 24, 'cột không quá 24 px: ' + g.barMax + at);
      assert.deepEqual(g.barTop, [4], 'đầu dữ liệu bo 4 px' + at);
      assert.deepEqual(g.barBottom, [0], 'chân cột vuông trên đường nền' + at);
      assert.ok(
        g.chip.every((x) => x >= 44),
        'nút khoảng ngày ≥ 44 px' + at,
      );
      assert.ok(g.summary >= 44, 'nút Xem dạng bảng ≥ 44 px' + at);
      assert.ok(g.jump >= 44, 'nút Xem báo cáo ≥ 44 px' + at);
      assert.equal(
        g.cols,
        width >= 1200 ? 2 : 1,
        (width >= 1200 ? 'hai thẻ cạnh nhau' : 'các thẻ xếp một cột') + at,
      );
      for (const en of [
        'Worklist',
        'worklist',
        'focus',
        'keyword',
        'Report',
        'report',
        'added',
        'done',
      ])
        assert.ok(!g.text.includes(en), 'báo cáo không có chữ ' + en + at);
      for (const sel of [
        '#wl-report h2',
        '#wl-report .wlr-label',
        '#wl-report .wlr-kpis b',
        '#wl-report .wlr-kpis small',
        '#wl-report .wlr-oldest',
        '#wl-report .wlr-card h3',
        '#wl-report .wlr-legend',
        '#wl-report .wlr-y span',
        '#wl-report .wlr-x span:not([aria-hidden])',
        '#wl-report .wlr-name',
        '#wl-report .wlr-age b',
        '#wl-report .wlr-age small',
        '#wl-report .wlr-chip',
        '#wl-report .wlr-chip.is-on',
        '#wl-report .help-copy',
        '#wl-report details.wlr-tables summary',
      ]) {
        const c = await contrast(page, sel);
        assert.ok(c !== null, 'có phần tử ' + sel + at);
        assert.ok(c >= 4.5, 'chữ ' + sel + ' tương phản ' + c.toFixed(2) + at);
      }
      for (const sel of ['.wlr-added', '.wlr-done'])
        assert.ok(
          (await fillContrast(page, '#wl-report ' + sel)) >= 3,
          'màu cột ' + sel + ' đủ tách khỏi nền thẻ' + at,
        );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // 4. Trạng thái trống.
  {
    for (const [label, items, text, hasCharts] of [
      ['không có chuỗi', null, /Chưa có số liệu/, false],
      ['chuỗi rỗng', [], /Chưa có số liệu/, false],
      [
        'chỉ có việc cũ hơn 30 ngày',
        [{ t: 'p2t0', a: '2026-09-01' }],
        /Chưa có việc nào ghi vào hay xong trong 14 ngày qua/,
        true,
      ],
    ]) {
      const { context, page } = await h.open(390, {
        touch: true,
        now: NOW,
        setup: setup('light'),
        workspace: seed(items)(),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await h.show(page, 'worklist');
      await page.waitForSelector('#wl-report');
      const e = await page.evaluate(() => ({
        text: document.querySelector('#wl-report').textContent,
        charts: document.querySelectorAll('#wl-report .wlr-chart').length,
        chips: document.querySelectorAll('#wl-report .wlr-chip').length,
        nan: /NaN|undefined|Infinity/.test(
          document.querySelector('#wl-report').textContent,
        ),
      }));
      assert.match(e.text, text, 'trạng thái trống: ' + label);
      assert.ok(!e.nan, 'không có NaN / undefined: ' + label);
      assert.equal(e.charts > 0, hasCharts, 'biểu đồ hiện hay ẩn: ' + label);
      if (hasCharts) {
        assert.deepEqual(
          await kpis(page),
          {
            'Ghi vào chuỗi': '0',
            'Đã xong': '0',
            'Tỉ lệ xong': '—',
            'Từ ghi đến xong': '—',
          },
          'ô số liệu khi không có gì trong khoảng: ' + label,
        );
        assert.deepEqual(
          await ages(page),
          [
            ['0–2 ngày', '0'],
            ['3–7 ngày', '0'],
            ['8–14 ngày', '0'],
            ['15 ngày trở lên', '1'],
          ],
          'việc cũ rơi vào mốc 15 ngày trở lên: ' + label,
        );
      }
      assert.ok(await noOverflow(page), 'không tràn ngang: ' + label);
      assert.deepEqual(errors, [], 'không lỗi trang: ' + label);
      await context.close();
    }
  }

  // 5. Nút “Xem báo cáo” nhảy tới báo cáo; việc xong thật (đổi cột) tự vào số liệu; đưa lại thì số liệu lùi theo.
  {
    const { context, page, server } = await h.open(390, {
      touch: true,
      now: NOW,
      setup: setup('light'),
      workspace: seed()(),
    });
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    const y0 = await page.evaluate(() => scrollY);
    await page.locator('.wl-jump').click();
    await until(
      () =>
        page.evaluate(
          () =>
            document.activeElement?.closest('#wl-report') &&
            document.activeElement.tagName === 'H2',
        ),
      'tiêu điểm chuyển tới báo cáo',
    );
    await until(
      () => page.evaluate((y) => scrollY > y, y0),
      'trang cuộn xuống báo cáo',
    );

    // Việc xong thật: B (p1t1) sang cột Hoàn thành qua đường lưu của ứng dụng → có doneAt hôm nay.
    await page.evaluate(() => {
      save();
      const t = project('p1').tasks.find((x) => x.id === 'p1t1');
      t.col = 'Done';
      save();
      render();
    });
    await until(
      async () => (await kpis(page))['Đã xong'] === '3',
      'việc vừa xong vào số liệu',
    );
    assert.deepEqual(
      await kpis(page),
      {
        'Ghi vào chuỗi': '10',
        'Đã xong': '3',
        'Tỉ lệ xong': '75%',
        'Từ ghi đến xong': '1,3 ngày',
      },
      'xong thêm một việc: 3 xong, 1 gỡ, tỉ lệ 75%, trung bình (2 + 0 + 2) / 3',
    );
    assert.deepEqual(
      (await ages(page)).map((a) => a[1]),
      ['2', '0', '1', '1'],
      'việc đã xong rời khỏi biểu đồ tuổi',
    );
    // Đưa lại cột cũ: doneAt bị gỡ, việc quay lại danh sách chờ.
    await page.evaluate(() => {
      const t = project('p1').tasks.find((x) => x.id === 'p1t1');
      t.col = 'List';
      save();
      render();
    });
    await until(
      async () => (await kpis(page))['Đã xong'] === '2',
      'việc đưa lại cột khác thì số liệu lùi theo',
    );
    assert.ok(
      server.workspace.worklist.items.length === 14,
      'chuỗi ở máy chủ vẫn đủ 14 dòng',
    );
    await context.close();
  }

  // Hàm số liệu thuần: các trường hợp biên.
  {
    const { context, page } = await h.open(1440, {
      now: NOW,
      setup: setup('light'),
      workspace: seed()(),
    });
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report');
    const s = await page.evaluate(() => {
      const p = { id: 'x', name: 'X', color: '#123456' };
      const rows = [
        // xong trước ngày ghi (doneAt cũ hơn a): tính vào “đã xong”, chờ 0 ngày (không âm)
        {
          e: { t: 'a', a: '2026-11-10' },
          t: { col: 'Done', doneAt: '2026-11-09' },
          p,
        },
        // ghi trong khoảng, gỡ sau hôm nay (ngoài khoảng): tính “ghi vào”, không tính “đã gỡ”
        {
          e: { t: 'b', a: '2026-11-11', x: '2026-11-20' },
          t: { col: 'List' },
          p,
        },
        // tuổi 0 (mới ghi hôm nay), đang chờ
        { e: { t: 'c', a: '2026-11-12' }, t: { col: 'Doing', title: 'C' }, p },
        // dự án đã lưu trữ → vẫn là một lần ghi vào, nhưng không còn là việc đang chờ
        {
          e: { t: 'd', a: '2026-11-12' },
          t: { col: 'List' },
          p: { ...p, archived: true },
        },
        // ngày ghi hỏng: không tính “ghi vào”, tuổi coi như 0, không làm vỡ báo cáo
        {
          e: { t: 'e', a: 'khong-phai-ngay' },
          t: { col: 'List', title: 'E' },
          p,
        },
      ];
      const r = window.zenWorklistReport.stats(7, rows, '2026-11-12');
      return {
        added: r.added,
        done: r.done,
        dropped: r.dropped,
        rate: r.rate,
        avgWait: r.avgWait,
        open: r.open,
        ages: r.ages,
        oldestAge: r.oldest && r.oldest.age,
        periods: window.zenWorklistReport.periods,
      };
    });
    assert.deepEqual(
      s,
      {
        added: 4,
        done: 1,
        dropped: 0,
        rate: 100,
        avgWait: 0,
        open: 2,
        ages: [2, 0, 0, 0],
        oldestAge: 0,
        periods: [7, 14, 30],
      },
      'hàm số liệu: xong trước ngày ghi tính chờ 0, gỡ ngoài khoảng không tính, dự án lưu trữ không còn là việc chờ, ngày hỏng không vỡ',
    );
    const s2 = await page.evaluate(() => {
      const p = { id: 'x', name: 'X', color: '#123456' };
      const r = window.zenWorklistReport.stats(
        7,
        [
          {
            e: { t: 'a', a: '2026-11-10' },
            t: { col: 'Done', doneAt: '2026-11-09' },
            p,
          },
          {
            e: { t: 'b', a: '2026-11-08' },
            t: { col: 'Done', doneAt: '2026-11-11' },
            p,
          },
        ],
        '2026-11-12',
      );
      return { done: r.done, avgWait: r.avgWait, rate: r.rate };
    });
    assert.deepEqual(
      s2,
      { done: 2, avgWait: 1.5, rate: 100 },
      'xong trước ngày ghi thì chờ 0 ngày, không âm; trung bình (0 + 3) / 2',
    );
    await context.close();
  }

  // Giang hồ (1440): báo cáo vẫn đủ, không lẫn chữ Anh, không tràn.
  {
    const { context, page } = await h.open(1440, {
      now: NOW,
      setup: setup('light', 'giangho'),
      workspace: seed()(),
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await h.show(page, 'worklist');
    await page.waitForSelector('#wl-report .wlr-kpis');
    await page.waitForFunction(
      () => document.documentElement.dataset.style === 'giangho',
    );
    const g = await page.evaluate(() => ({
      text: document.querySelector('#wl-report').textContent,
      h2: document.querySelector('#wl-report h2').textContent,
      days: document.querySelectorAll('#wl-report .wlr-day').length,
      labels: [...document.querySelectorAll('#wl-report .wlr-label')].map(
        (e) => e.textContent,
      ),
      cards: [...document.querySelectorAll('#wl-report .wlr-card h3')].map(
        (e) => e.textContent,
      ),
      names: [...document.querySelectorAll('#wl-report .wlr-name')].map(
        (e) => e.textContent,
      ),
      jump: document.querySelector('.wl-jump').textContent,
    }));
    assert.equal(
      g.h2,
      'Chiến báo Liên hoàn lệnh',
      'Giang hồ: tiêu đề báo cáo gọi là Chiến báo',
    );
    assert.equal(g.jump, 'Xem chiến báo', 'Giang hồ: nút nhảy tới chiến báo');
    assert.deepEqual(
      g.labels,
      [
        'Ghi vào chuỗi',
        'Công thành',
        'Tỉ lệ công thành',
        'Từ ghi đến công thành',
      ],
      'Giang hồ: nhãn bốn ô số liệu',
    );
    assert.deepEqual(
      g.cards,
      [
        'Ghi vào và công thành theo ngày',
        'Nhiệm vụ còn trong chuỗi theo đại sự',
        'Tuổi của nhiệm vụ còn trong chuỗi',
      ],
      'Giang hồ: tiêu đề ba thẻ biểu đồ',
    );
    assert.deepEqual(
      g.names,
      ['Hương Thiền Nature — Website', 'Khóa tu mùa thu', 'Sổ nợ An Tâm'],
      'Giang hồ: tên dự án của người dùng giữ nguyên',
    );
    assert.equal(g.days, 14, 'Giang hồ: đủ 14 cột');
    for (const en of ['Worklist', 'worklist', 'focus', 'keyword'])
      assert.ok(!g.text.includes(en), 'Giang hồ: không có chữ ' + en);
    for (const sel of ['#wl-report .wlr-label', '#wl-report .wlr-name'])
      assert.ok(
        (await contrast(page, sel)) >= 4.5,
        'Giang hồ: tương phản ' + sel,
      );
    assert.ok(await noOverflow(page), 'Giang hồ: không tràn ngang');
    assert.deepEqual(errors, [], 'Giang hồ: không lỗi trang');
    await context.close();
  }
} finally {
  await h.close();
}
console.log('worklist report browser ok');
