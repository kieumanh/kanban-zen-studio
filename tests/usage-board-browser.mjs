// v2.76.0 (Bảng Thám Báo): chủ triển khai xem số liệu dùng ẩn danh ngay trong Cài đặt → Tài khoản & bảo mật; người khác không thấy gì.
//  1. Người không phải chủ (máy chủ trả 404): không có khối nào; không hỏi lại máy chủ ở các lần mở Cài đặt sau. Trả lời lạ (rỗng, lỗi 500, mất mạng): cũng không hiện gì.
//  2. Chủ: khối “Bảng Thám Báo” có tổng, ba bảng (theo tính năng, phiên bản, ngày; tên tính năng đọc được, số có dấu chấm ngăn nghìn, ngày mới nhất trên cùng);
//     bấm “30 ngày” thì hỏi lại với days=30, nút đổi trạng thái và bảng vẽ lại; Cài đặt đóng trước khi trả lời thì không chèn gì.
//  3. Bố cục ở 390 (chạm) / 820 (chạm) / 1440 px × sáng, tối: không tràn ngang, nút ≥ 44 px, chữ đủ tương phản, bảng nằm trong khung.
//  4. Giang hồ: lời mô tả đã đổi giọng.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const NOW = '2026-11-23T05:00:00Z';
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Alpha', '#7950c8', 3)],
  notes: [],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (days) => ({
  days,
  from: days === 7 ? '2026-11-17' : '2026-10-25',
  to: '2026-11-23',
  total: days === 7 ? 1234 : 45678,
  features: [
    { feature: 'growth-octa', count: days === 7 ? 700 : 20000 },
    { feature: 'dashboard', count: 400 },
    { feature: 'quickadd', count: 100 },
    { feature: 'tinh-nang-moi', count: 34 },
  ],
  versions: [
    { version: '2.76.0', count: 1000 },
    { version: '2.75.0', count: 234 },
  ],
  daily: Array.from({ length: days === 7 ? 7 : 30 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 23) - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return { day: d, count: i + 1 };
  }),
});
// mode: 404 | 'ok' | 'empty' | 500 | 'abort'
const setup =
  (mode, { theme = 'light', style, log } = {}) =>
  async ({ context, page }) => {
    await context.addInitScript(
      ([t, s]) => {
        localStorage.setItem('zen-theme', t);
        if (s) localStorage.setItem('zen-style', s);
      },
      [theme, style],
    );
    await page.route('**/api/usage-stats**', async (route) => {
      const url = new URL(route.request().url());
      log?.push(Number(url.searchParams.get('days')));
      if (mode === 'abort') return route.abort();
      if (mode === 404)
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: '{"error":"Không tìm thấy."}',
        });
      if (mode === 500)
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"error":"x"}',
        });
      if (mode === 'empty')
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{}',
        });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          stats(Number(url.searchParams.get('days')) === 30 ? 30 : 7),
        ),
      });
    });
  };
const openSettings = async (page) => {
  await page.evaluate(() => accountPanel());
  await page.waitForSelector('[data-usage-block]', { state: 'attached' });
  await page.evaluate(() => {
    const g = document.querySelector(
      'details.wf-settings-group[data-group=account]',
    );
    if (g) g.open = true;
  });
};
const closeSettings = (page) =>
  page.evaluate(() => document.querySelector('#editor').close());
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
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
const rows = (page, n) =>
  page.evaluate(
    (n) =>
      [
        ...document
          .querySelectorAll('[data-usage-board] .ub-table')
          [n].querySelectorAll('tbody tr'),
      ].map((tr) => [
        tr.querySelector('th').textContent.trim(),
        tr.querySelector('td').textContent.trim(),
      ]),
    n,
  );

const h = await startHarness({ seed });
try {
  // 1. Không phải chủ / trả lời lạ.
  for (const mode of [404, 'empty', 500, 'abort']) {
    const log = [];
    const { page } = await h.open(1440, {
      now: NOW,
      setup: setup(mode, { log }),
      workspace: seed(),
    });
    await openSettings(page);
    await wait(700);
    assert.equal(
      await page.locator('[data-usage-board]').count(),
      0,
      'không hiện bảng với kiểu trả lời ' + mode,
    );
    assert.equal(
      await page.locator('[data-usage-block]').count(),
      1,
      'khối Chỉ số ẩn danh vẫn như cũ ' + mode,
    );
    if (mode === 404) {
      await closeSettings(page);
      await openSettings(page);
      await wait(400);
      assert.equal(log.length, 1, 'đã biết không phải chủ thì không hỏi lại');
    }
    await page.context().close();
  }

  // 2. Chủ.
  {
    const log = [];
    const { page } = await h.open(1440, {
      now: NOW,
      setup: setup('ok', { log }),
      workspace: seed(),
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openSettings(page);
    await page.waitForSelector('[data-usage-board] .ub-table');
    assert.equal(
      await page.locator('[data-usage-board] h4').textContent(),
      'Bảng Thám Báo',
    );
    assert.match(
      await page.locator('[data-ub-sum]').textContent(),
      /Tổng 1\.234 lượt từ 17\/11 đến 23\/11/,
      'dòng tổng có dấu chấm ngăn nghìn',
    );
    assert.deepEqual(
      await rows(page, 0),
      [
        ['Điểm tích lũy · Bát phương', '700'],
        ['Tổng quan', '400'],
        ['Thêm nhanh', '100'],
        ['tinh-nang-moi', '34'],
      ],
      'tên tính năng đọc được; tên chưa biết giữ nguyên',
    );
    assert.deepEqual(
      await rows(page, 1),
      [
        ['2.76.0', '1.000'],
        ['2.75.0', '234'],
      ],
      'theo phiên bản',
    );
    const days = await rows(page, 2);
    assert.equal(days.length, 7, 'bảy ngày');
    assert.deepEqual(days[0], ['23/11', '7'], 'ngày mới nhất trên cùng');
    assert.deepEqual(days[6], ['17/11', '1']);
    assert.equal(
      await page
        .locator('[data-usage-board] .ub-bar[aria-hidden=true]')
        .count(),
      4 + 2 + 7,
      'thanh chỉ để trang trí',
    );
    assert.equal(
      await page.locator('[data-ub-days="7"]').getAttribute('aria-pressed'),
      'true',
    );
    await page.click('[data-ub-days="30"]');
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-ub-days="30"]')
          .getAttribute('aria-pressed') === 'true',
    );
    assert.deepEqual(log, [7, 30], 'bấm 30 ngày thì hỏi lại với days=30');
    assert.match(
      await page.locator('[data-ub-sum]').textContent(),
      /Tổng 45\.678 lượt từ 25\/10 đến 23\/11/,
    );
    assert.equal((await rows(page, 2)).length, 30, 'ba mươi ngày');
    assert.equal(
      await page.locator('[data-ub-days="7"]').getAttribute('aria-pressed'),
      'false',
    );
    assert.equal(
      await page.locator('[data-usage-board]').count(),
      1,
      'chỉ một khối',
    );
    assert.deepEqual(errors, [], 'không lỗi trang');
    await page.context().close();
  }

  // Cài đặt đóng trước khi trả lời: không chèn gì.
  {
    const { page } = await h.open(1440, {
      now: NOW,
      setup: async (ctx) => {
        await setup('ok')(ctx);
        await ctx.page.route('**/api/usage-stats**', async (route) => {
          await wait(500);
          await route.fallback();
        });
      },
      workspace: seed(),
    });
    await openSettings(page);
    await closeSettings(page);
    await page.evaluate(() => {
      document.querySelector('#editor-body').innerHTML = '';
    });
    await wait(900);
    assert.equal(
      await page.locator('[data-usage-board]').count(),
      0,
      'Cài đặt đã đóng thì không chèn bảng',
    );
    await page.context().close();
  }

  // 3. Bố cục.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';
      const { page } = await h.open(width, {
        touch,
        now: NOW,
        setup: setup('ok', { theme }),
        workspace: seed(),
      });
      await openSettings(page);
      await page.waitForSelector('[data-usage-board] .ub-table');
      await page.click('[data-ub-days="30"]');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-ub-days="30"]')
            .getAttribute('aria-pressed') === 'true',
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);
      const m = await page.evaluate(() => ({
        buttons: [...document.querySelectorAll('[data-ub-days]')].map((b) =>
          Math.round(b.getBoundingClientRect().height),
        ),
        tables: [
          ...document.querySelectorAll('[data-usage-board] .ub-table'),
        ].map(
          (t) =>
            t.getBoundingClientRect().right <=
            document.querySelector('#editor').getBoundingClientRect().right +
              0.5,
        ),
      }));
      for (const v of m.buttons)
        assert.ok(v >= 44, 'nút ≥ 44 px (' + v + ')' + at);
      assert.ok(m.tables.every(Boolean), 'bảng nằm trong khung' + at);
      for (const sel of [
        '[data-usage-board] .ub-table tbody th',
        '[data-usage-board] .ub-table tbody td',
        '[data-ub-sum]',
        '[data-usage-board] .ub-table thead th',
      ])
        assert.ok(
          (await contrast(page, sel)) >= 4.5,
          'chữ đủ tương phản ' + sel + at,
        );
      assert.ok(
        (await contrast(page, '[data-ub-days="30"]')) >= 4.5,
        'nút đang chọn đủ tương phản' + at,
      );
      await page.context().close();
    }
  }

  // 4. Giang hồ.
  {
    const { page } = await h.open(1440, {
      now: NOW,
      setup: setup('ok', { style: 'giangho' }),
      workspace: seed(),
    });
    await openSettings(page);
    await page.waitForSelector('[data-usage-board] .ub-table');
    await wait(500);
    const t = await page
      .locator('[data-usage-board] .help-copy')
      .first()
      .textContent();
    assert.match(
      t,
      /chủ phái thấy bảng này/,
      'lời mô tả đã đổi giọng Giang hồ',
    );
    await page.context().close();
  }
  console.log('usage-board-browser: OK');
} finally {
  await h.close();
}
