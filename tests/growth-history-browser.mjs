// v2.60.0 (Lịch Sử Bát Phương): trang Báo cáo tu luyện có mục “Lịch sử biến chuyển Bát phương đồ”. Chọn mốc so sánh: hôm nay (so với hết hôm qua), 1 tháng
// trước (30 ngày), 3 tháng trước (90 ngày). Hiện Bát phương đồ nay với nét đứt của mốc, mỗi phương từ bao nhiêu lên bao nhiêu, tăng hay giảm, nhờ các lần vận công
// nào và giảm vì lần đổi bảo vật nào (lần đã hủy không tính). Chỉ đọc sổ cái, không ghi gì. Kiểm ở 390 / 820 / 1440 px, sáng và tối.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00'; // hôm nay 2026-11-12; mốc 1 tháng = 2026-10-13; mốc 3 tháng = 2026-08-14; hôm qua = 2026-11-11
//        p: [Đạo tâm, Tài lộc, Tâm cảnh, Nhân duyên, Thân thể, Trí tuệ, Sự nghiệp, Gia đạo] (nửa điểm)
const LOG = [
  {
    id: 'l1',
    d: '2026-07-20',
    s: 'task',
    k: 'task:a',
    n: 'Việc tháng bảy',
    p: [2, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'l2',
    d: '2026-08-30',
    s: 'task',
    k: 'task:b',
    n: 'Lập sổ chi tiêu',
    p: [0, 2, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'l3',
    d: '2026-10-20',
    s: 'task',
    k: 'task:c',
    n: 'Thiền sáng',
    p: [0, 0, 2, 0, 0, 0, 1, 0],
  },
  {
    id: 'l4',
    d: '2026-10-25',
    s: 'task',
    k: 'task:d',
    n: 'Ghi thu chi',
    p: [0, 1, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'l5',
    d: '2026-10-28',
    s: 'task',
    k: 'task:e',
    n: 'Trả bớt nợ',
    p: [0, 1, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'l6',
    d: '2026-11-02',
    s: 'task',
    k: 'task:f',
    n: 'Quyết toán quý',
    p: [0, 2, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'l7',
    d: '2026-11-12',
    s: 'task',
    k: 'task:g',
    n: 'Đi bộ tối',
    p: [0, 0, 0, 0, 1, 0, 0, 0],
  },
];
const SPEND = [
  {
    id: 's1',
    d: '2026-10-30',
    n: 'Sách Kinh Kim Cương',
    p: [1, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 's2',
    d: '2026-10-30',
    n: 'Bộ cờ đã hủy',
    p: [0, 0, 0, 0, 0, 2, 0, 0],
    x: true,
  },
];
const seed = (growth) => () => ({
  schema: 1,
  projects: [],
  notes: [],
  ...(growth ? { growth } : {}),
});
const GROWTH = {
  v: 1,
  hero: 'nam',
  name: 'Mạnh',
  since: '2026-07-01',
  log: LOG,
  spend: SPEND,
};
const setup =
  (theme) =>
  ({ context }) =>
    context.addInitScript((t) => localStorage.setItem('zen-theme', t), theme);
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Điểm nay (nửa điểm → điểm): Đạo tâm 2 − 1 (đổi sách) = 1 → 0,5; Tài lộc 2+1+1+2 = 6 → 3; Tâm cảnh 2 → 1; Thân thể 1 → 0,5; Sự nghiệp 1 → 0,5.
const NOW_VALUES = ['0,5', '3', '1', '0', '0,5', '0', '0,5', '0'];

async function openReport(h, width, touch, theme, growth) {
  const { context, page, server } = await h.open(width, {
    touch,
    now: NOW,
    setup: setup(theme),
    workspace: seed(growth)(),
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await h.show(page, 'growth');
  await page.click('[data-gr-report]');
  await page.waitForSelector('.gr-hist');
  return { context, page, server, errors };
}
const rowsOf = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.gr-hist-row')].map((r) => [
        r.dataset.axis,
        {
          then: r.querySelector('.gr-hist-then').textContent.trim(),
          now: r.querySelector('.gr-hist-nums b').textContent.trim(),
          delta: r
            .querySelector('.gr-delta')
            .textContent.replace(/\s+/g, ' ')
            .trim(),
          cls: r.className.replace('gr-hist-row ', ''),
          why: r.querySelector('small').textContent.replace(/\s+/g, ' ').trim(),
        },
      ]),
    ),
  );

const h = await startHarness({ seed: seed(GROWTH) });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { context, page, server, errors } = await openReport(
        h,
        width,
        touch,
        theme,
        GROWTH,
      );

      // 1. Mặc định mốc 1 tháng trước (2026-10-13).
      assert.equal(
        await page.locator('.gr-hist h2').innerText(),
        'Lịch sử biến chuyển Bát phương đồ',
        'tiêu đề mục' + at,
      );
      assert.deepEqual(
        await page.evaluate(() =>
          [...document.querySelectorAll('[data-gr-hist]')].map((b) => [
            b.textContent,
            b.getAttribute('aria-pressed'),
          ]),
        ),
        [
          ['Hôm nay', 'false'],
          ['1 tháng trước', 'true'],
          ['3 tháng trước', 'false'],
        ],
        'ba mốc, mặc định 1 tháng trước' + at,
      );
      let r = await rowsOf(page);
      assert.equal(Object.keys(r).length, 8, 'đủ tám phương' + at);
      assert.deepEqual(
        Object.keys(r),
        ['dao', 'tai', 'tam', 'duyen', 'than', 'tri', 'nghe', 'gia'],
        'đúng thứ tự ô sổ cái' + at,
      );
      // Mốc 13/10: Đạo tâm 1 (l1) ; Tài lộc 1 (l2).
      assert.deepEqual(
        [r.dao.then, r.dao.now, r.dao.delta, r.dao.cls],
        ['1', '0,5', '▼ −0,5', 'is-down'],
        'Đạo tâm giảm vì đổi sách' + at,
      );
      assert.match(
        r.dao.why,
        /Giảm vì đổi: Sách Kinh Kim Cương −0,5/,
        'nêu lần đổi bảo vật' + at,
      );
      assert.deepEqual(
        [r.tai.then, r.tai.now, r.tai.delta, r.tai.cls],
        ['1', '3', '▲ +2', 'is-up'],
        'Tài lộc tăng' + at,
      );
      assert.match(
        r.tai.why,
        /Tăng nhờ: Quyết toán quý \+1; Trả bớt nợ \+0,5; và 1 việc khác/,
        'hai việc nhiều điểm nhất (đồng điểm: ngày mới hơn lên trước), còn lại gộp' +
          at,
      );
      assert.deepEqual(
        [r.tam.then, r.tam.now, r.tam.delta],
        ['0', '1', '▲ +1'],
        'Tâm cảnh tăng' + at,
      );
      assert.match(
        r.tam.why,
        /Tăng nhờ: Thiền sáng \+1/,
        'Tâm cảnh nhờ Thiền sáng' + at,
      );
      assert.deepEqual(
        [r.than.then, r.than.now, r.than.delta],
        ['0', '0,5', '▲ +0,5'],
        'Thân thể tăng hôm nay' + at,
      );
      assert.deepEqual(
        [r.duyen.then, r.duyen.now, r.duyen.delta, r.duyen.cls, r.duyen.why],
        ['0', '0', '■ 0', 'is-flat', 'Không có biến động'],
        'Nhân duyên đứng yên' + at,
      );
      assert.equal(
        r.tri.delta,
        '■ 0',
        'lần đổi đã hủy không làm Trí tuệ giảm' + at,
      );
      assert.deepEqual(
        NOW_VALUES,
        await page.evaluate(() =>
          [...document.querySelectorAll('.gr-hist-row .gr-hist-nums b')].map(
            (n) => n.textContent,
          ),
        ),
        'điểm nay khớp Bát phương đồ' + at,
      );
      const sum = await page.locator('.gr-hist-sum').innerText();
      assert.match(
        sum,
        /Từ 13\/10 đến nay, tu vi hiện có \+3,5 điểm: 4 phương tăng, 1 phương giảm\. Tiến nhiều nhất: Tài lộc \(\+2\)\. Đứng yên: Nhân duyên, Trí tuệ, Gia đạo\./,
        'tóm tắt biến chuyển' + at,
      );

      // 2. Bát phương đồ có nét đứt của mốc; thang gồm cả mốc.
      const rd = await page.evaluate(() => {
        const svg = document.querySelector('.gr-hist .gr-radar');
        return {
          ghost: svg.querySelectorAll('polygon.gr-ghost').length,
          pts: svg
            .querySelector('polygon.gr-ghost')
            .getAttribute('points')
            .split(' ').length,
          area: svg.querySelectorAll('polygon.gr-area').length,
          label: svg.getAttribute('aria-label'),
          dash: getComputedStyle(svg.querySelector('polygon.gr-ghost'))
            .strokeDasharray,
          legend: document
            .querySelector('.gr-legend')
            .textContent.replace(/\s+/g, ' ')
            .trim(),
          main: document.querySelectorAll(
            '.gr-rep-grid .gr-radar polygon.gr-ghost',
          ).length,
        };
      });
      assert.equal(rd.ghost, 1, 'một đường nét đứt cho mốc' + at);
      assert.equal(rd.pts, 8, 'nét đứt đủ 8 đỉnh' + at);
      assert.equal(rd.area, 1);
      assert.match(
        rd.label,
        /Nét đứt là mốc so sánh: Đạo tâm 1, Tài lộc 1, Tâm cảnh 0/,
        'chú thích cho trình đọc màn hình có điểm mốc' + at,
      );
      assert.notEqual(rd.dash, 'none', 'nét đứt thật sự đứt' + at);
      assert.equal(rd.legend, 'Hôm nay Ngày 13/10', 'chú giải' + at);
      assert.equal(rd.main, 0, 'Bát phương đồ chính không có nét đứt' + at);

      // 3. Đổi mốc: Hôm nay (so với hết hôm qua 11/11).
      await page.click('[data-gr-hist="0"]');
      assert.equal(
        await page.locator('[data-gr-hist="0"]').getAttribute('aria-pressed'),
        'true',
        'nút được chọn' + at,
      );
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.grHist),
        '0',
        'giữ tiêu điểm trên nút vừa bấm' + at,
      );
      r = await rowsOf(page);
      assert.deepEqual(
        [r.than.then, r.than.now, r.than.delta],
        ['0', '0,5', '▲ +0,5'],
        'chỉ Thân thể đổi trong hôm nay' + at,
      );
      assert.match(
        r.than.why,
        /Tăng nhờ: Đi bộ tối \+0,5/,
        'nhờ việc hôm nay' + at,
      );
      assert.equal(r.tai.delta, '■ 0', 'Tài lộc đứng yên so với hôm qua' + at);
      assert.deepEqual([r.tai.then, r.tai.now], ['3', '3']);
      assert.match(
        await page.locator('.gr-hist-sum').innerText(),
        /Từ 11\/11 đến nay, tu vi hiện có \+0,5 điểm: 1 phương tăng, 0 phương giảm\. Tiến nhiều nhất: Thân thể \(\+0,5\)/,
        'tóm tắt hôm nay' + at,
      );

      // 4. 3 tháng trước (14/08): Đạo tâm 1, Tài lộc 1.
      await page.click('[data-gr-hist="3"]');
      r = await rowsOf(page);
      assert.deepEqual(
        [r.dao.then, r.dao.now, r.dao.delta],
        ['1', '0,5', '▼ −0,5'],
        'Đạo tâm sau 3 tháng' + at,
      );
      assert.deepEqual(
        [r.tai.then, r.tai.now, r.tai.delta],
        ['0', '3', '▲ +3'],
        'Tài lộc sau 3 tháng: lần 30/08 nằm sau mốc 14/08 nên mốc còn 0' + at,
      );
      assert.match(
        r.tai.why,
        /Tăng nhờ: Quyết toán quý \+1; Lập sổ chi tiêu \+1; và 2 việc khác/,
        'bốn lần vận công, nêu hai lần đầu (đồng điểm xếp theo ngày mới hơn)' +
          at,
      );
      assert.match(
        await page.locator('.gr-legend').innerText(),
        /Ngày 14\/08/,
        'chú giải theo mốc 3 tháng' + at,
      );
      assert.ok(
        (await page.locator('.gr-hist-note').count()) === 0,
        'mốc có điểm nên không báo trống' + at,
      );

      // 5. Giao diện: không tràn ngang, hàng bo tròn, tăng/giảm có dấu (không chỉ dựa vào màu), vùng chạm đủ lớn.
      const ui = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('.gr-hist-row')];
        const list = document
          .querySelector('.gr-hist-list')
          .getBoundingClientRect();
        const btn = document
          .querySelector('[data-gr-hist]')
          .getBoundingClientRect();
        return {
          radius: rows.map((x) =>
            parseFloat(getComputedStyle(x).borderTopRightRadius),
          ),
          fits: rows.every(
            (x) =>
              x.getBoundingClientRect().right <= list.right + 1 &&
              x.scrollWidth <= x.clientWidth + 1,
          ),
          sign: rows.every((x) =>
            /^(▲ \+|▼ −|■ 0)/.test(
              x.querySelector('.gr-delta').textContent.trim(),
            ),
          ),
          btnH: Math.round(btn.height),
          stacked:
            document.querySelector('.gr-hist-radar').getBoundingClientRect()
              .bottom <=
            document.querySelector('.gr-hist-body').getBoundingClientRect()
              .top +
              1,
        };
      });
      assert.ok(
        ui.radius.every((x) => x >= 12),
        'hàng bo tròn' + at,
      );
      assert.ok(ui.fits, 'hàng nằm gọn' + at);
      assert.ok(ui.sign, 'tăng giảm có ký hiệu và dấu' + at);
      assert.ok(ui.btnH >= (touch ? 40 : 32), 'nút mốc đủ lớn ' + ui.btnH + at);
      assert.equal(
        ui.stacked,
        width <= 900,
        (width <= 900 ? 'xếp một cột' : 'hai cột') + ' ở ' + width + 'px' + at,
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);

      // 6. Chỉ đọc: sổ cái ở máy chủ không đổi.
      assert.deepEqual(
        server.workspace.growth.log,
        LOG,
        'sổ cái không đổi' + at,
      );
      assert.deepEqual(
        server.workspace.growth.spend,
        SPEND,
        'sổ quy đổi không đổi' + at,
      );
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // 7. Chưa có biến động và mốc trước khi có điểm.
  {
    const quiet = {
      v: 1,
      hero: 'nam',
      since: '2026-11-01',
      log: [
        {
          id: 'q1',
          d: '2026-11-12',
          s: 'task',
          k: 'task:q',
          n: 'Việc đầu tiên',
          p: [0, 2, 0, 0, 0, 0, 0, 0],
        },
      ],
      spend: [],
    };
    const { context, page } = await openReport(h, 390, true, 'light', quiet);
    assert.match(
      await page.locator('.gr-hist-note').innerText(),
      /Ở mốc này chưa có điểm nào/,
      'mốc chưa có điểm' + 'quiet',
    );
    await context.close();
    const still = {
      v: 1,
      hero: 'nam',
      since: '2026-07-01',
      log: [LOG[0]],
      spend: [],
    };
    const o = await openReport(h, 390, true, 'light', still);
    assert.match(
      await o.page.locator('.gr-hist-sum').innerText(),
      /chưa có lần vận công hay đổi bảo vật nào, Bát phương đồ đứng yên/,
      'không biến động' + 'still',
    );
    assert.equal(
      await o.page.locator('.gr-hist-row.is-flat').count(),
      8,
      'cả tám phương đứng yên',
    );
    await o.context.close();
  }
} finally {
  await h.close();
}
console.log('growth history browser ok');
