// Hồi quy v2.27.0 (Hán Danh): mọi nhân vật mang tên Hán Việt, không còn tiếng thuần Việt lẫn trong tên.
//  1. Bảng tên mới ở cả ba nơi dùng: bộ vai (nhãn dưới tranh), người nói trong truyện chính, thẻ "Giang hồ kỳ ngộ".
//  2. Tên cũ (Bà Tư, Cậu bé Vô Khuyết, Dân trấn, Dân làng, Thợ, Lính, Trẻ nhỏ, Thầy thuốc, Lục Lục, Đào / Lý) không còn ở
//     bất cứ chữ nào: lời truyện, kỳ ngộ, chú thích tranh, lời Thần giới.
//  3. Không đổi dữ liệu người dùng: mã nhân vật giữ nguyên; lịch kỳ ngộ của từng tài khoản y hệt trước khi đổi tên;
//     cặp song sinh vẫn vẽ đủ hai người.
//  4. Màn hình đọc và thẻ kỳ ngộ hiện đúng tên mới, ký hiệu chữ cái đầu của cặp "Đào Nhi · Lý Nhi" là ĐL;
//     kiểm ở 390, 820, 1440 px, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const day = (n) =>
  new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
const project = {
  id: 'p1',
  name: 'Dự án A',
  description: '',
  color: '#7950c8',
  icon: '✺',
  columns: ['Idea', 'List', 'Doing', 'Done'],
  columnNames: {
    Idea: 'Ý tưởng',
    List: 'Việc cần làm',
    Doing: 'Đang thực hiện',
    Done: 'Hoàn thành',
  },
  tasks: [
    {
      id: 'p1t0',
      title: 'Gửi báo cáo',
      col: 'Doing',
      description: '',
      due: day(3),
      tag: 'Công việc',
      priority: 'q2',
      checks: [],
    },
  ],
};
const growth = (half) => ({
  v: 1,
  hero: 'nam',
  since: day(-40),
  log: half
    ? [
        {
          id: 'e1',
          d: day(-1),
          s: 'task',
          k: 'task:e1',
          n: 'Việc cũ',
          p: [half, 0, 0, 0, 0, 0, 0, 0],
        },
      ]
    : [],
});
const seed = (half) => () => ({
  schema: 1,
  projects: [structuredClone(project)],
  notes: [],
  growth: growth(half),
});
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Tên hiển thị mới của các vai (mã giữ nguyên).
const LOOK_NAMES = {
  be: 'Tiểu Vô Khuyết',
  batu: 'Tô Bà Bà',
  dan: 'Trấn dân',
  dan2: 'Thôn dân',
  tho: 'Công tượng',
  quan: 'Quan binh',
  kid: 'Đồng tử',
  thay: 'Y sư',
  luc: 'Tiểu Lục Tử',
  dao: 'Đào Nhi',
  ly: 'Lý Nhi',
};
const WHO_NAMES = {
  be: 'Tiểu Vô Khuyết',
  batu: 'Tô Bà Bà',
  dan: 'Trấn dân Thanh Khê',
};
const CAST_NAMES = {
  batu: 'Tô Bà Bà',
  luc: 'Tiểu Lục Tử',
  daoly: 'Đào Nhi · Lý Nhi',
};
// Tên cũ không được còn ở bất cứ chữ nào.
const OLD = [
  /Bà Tư/,
  /Cậu bé (Lệ )?Vô Khuyết/,
  /Dân trấn/,
  /Dân làng/,
  /Người trấn Thanh Khê/,
  /Trẻ nhỏ/,
  /Thầy thuốc/,
  /Lục Lục/,
  /Đào Lý/,
  /Đào đây/,
  /Lý đây/,
  /Đào và Lý/,
  /giả làm (Đào|Lý)(?! Nhi)/,
  /Đào giả/,
  /Lý giả/,
].map((r) => r.source);
// Lịch kỳ ngộ của hai tài khoản mẫu, chụp trước khi đổi tên (mã nhân vật và cấp gặp).
const PLAN_A =
  'batu-1@11 yen-1@17 luc-1@18 diep-1@23 cuu-1@27 daoly-1@29 cokiem-1@31 nhan-1@32 kytien-1@33 nhuy-1@34 lamhat-1@38 bacham-1@41 yen-2@42 daoly-2@43 diep-2@46 trinhho-1@51 kytien-2@52 ngao-1@53 batu-2@54 vantam-1@56 luc-2@57 moclao-1@58 nhuy-2@59 thien-1@61 vongtinh-1@62 lamhat-2@63 cokiem-2@64 vantam-2@66 nhan-2@67 tuytang-1@68 cuu-2@69 ngao-2@71 hotam-1@72 hai-1@73 bacham-2@74 trinhho-2@76 hotam-2@77 tuytang-2@78 vongtinh-2@79 moclao-2@81 tieuhuyet-1@83 thien-2@85 hai-2@87 tieuhuyet-2@89';
const PLAN_B =
  'luc-1@7 batu-1@11 nhan-1@13 yen-1@19 diep-1@21 cuu-1@24 kytien-1@29 daoly-1@31 lamhat-1@36 ngao-1@38 nhuy-1@43 trinhho-1@44 tuytang-1@46 cuu-2@47 cokiem-1@48 batu-2@51 thien-1@52 bacham-1@53 kytien-2@54 yen-2@56 nhuy-2@57 vantam-1@58 luc-2@59 vongtinh-1@61 nhan-2@62 ngao-2@63 bacham-2@64 vantam-2@66 hotam-1@67 cokiem-2@68 hai-1@69 daoly-2@71 diep-2@72 trinhho-2@73 tuytang-2@74 tieuhuyet-1@76 moclao-1@77 vongtinh-2@78 lamhat-2@79 moclao-2@81 hotam-2@83 thien-2@85 hai-2@87 tieuhuyet-2@89';
const CAST_IDS =
  'batu luc cuu diep yen nhan lamhat kytien cokiem vantam nhuy ngao tuytang daoly vongtinh hotam trinhho moclao tieuhuyet bacham thien hai';

const h = await startHarness({ seed: seed(20) });
try {
  // 1 + 2 + 3. Dữ liệu (kiểm một lần).
  let plan, LEVEL_AT;
  {
    const { context, page } = await h.open(1440, { workspace: seed(20)() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    const d = await page.evaluate(
      ([LOOK_NAMES, OLD]) => {
        const Z = window.zenScene;
        const seen = new Set();
        const pool = [];
        const walk = (v, path) => {
          if (typeof v === 'string') pool.push([path, v]);
          else if (v && typeof v === 'object' && !seen.has(v)) {
            seen.add(v);
            for (const k of Object.keys(v)) walk(v[k], path + '.' + k);
          }
        };
        walk(window.zenTale, 'tale');
        walk(window.zenMeet, 'meet');
        walk(window.zenPlates.LINES, 'plates');
        walk(window.zenGods, 'gods');
        walk(
          Object.fromEntries(
            Object.entries(Z.CAST.LOOK).map(([k, v]) => [k, v.name]),
          ),
          'look',
        );
        const old = OLD.map((s) => new RegExp(s));
        const left = pool
          .filter(([, t]) => old.some((r) => r.test(t)))
          .map(([p, t]) => p + ': ' + t.slice(0, 60));
        const pair = Z.shotFor('m:daoly-1', 0, null);
        const pair2 = Z.shotFor('m:daoly-2', 1, null);
        return {
          look: Object.fromEntries(
            Object.keys(LOOK_NAMES).map((k) => [
              k,
              Z.CAST.has(k) ? Z.CAST.name(k) : null,
            ]),
          ),
          who: window.zenTale.WHO,
          cast: window.zenMeet.CAST.map((c) => ({ id: c.id, name: c.name })),
          left,
          poolSize: pool.length,
          pair: [pair.f.map((q) => q.who), pair2.f.map((q) => q.who)],
          plan: ['nguoi-khac', 'tai-khoan-mau'].map((u) =>
            window.zenStory
              .schedule(u)
              .map((m) => m.id.slice(2) + '@' + m.lv)
              .join(' '),
          ),
          mine: window.zenStory.schedule().map((m) => ({ id: m.id, lv: m.lv })),
          LEVEL_AT: window.zenGrowth.LEVEL_AT,
        };
      },
      [LOOK_NAMES, OLD],
    );
    ({ LEVEL_AT } = d);
    plan = d.mine;
    // 1.
    assert.deepEqual(d.look, LOOK_NAMES, 'tên mới của các vai trong bộ vai');
    for (const [k, v] of Object.entries(WHO_NAMES))
      assert.equal(d.who[k], v, `người nói ${k} mang tên ${v}`);
    for (const [k, v] of Object.entries(CAST_NAMES))
      assert.equal(
        d.cast.find((c) => c.id === k)?.name,
        v,
        `thẻ kỳ ngộ ${k} mang tên ${v}`,
      );
    // 2.
    assert.ok(d.poolSize > 2000, `quét đủ chữ trong truyện (${d.poolSize})`);
    assert.deepEqual(d.left, [], 'không còn tên cũ ở bất cứ chữ nào');
    // 3.
    assert.deepEqual(
      d.cast.map((c) => c.id),
      CAST_IDS.split(' '),
      'mã 22 nhân vật kỳ ngộ giữ nguyên, đúng thứ tự',
    );
    assert.deepEqual(
      d.plan,
      [PLAN_A, PLAN_B],
      'lịch kỳ ngộ của từng tài khoản y hệt trước khi đổi tên',
    );
    for (const w of d.pair)
      assert.ok(
        w.includes('dao') && w.includes('ly'),
        'cặp song sinh vẫn vẽ đủ hai người: ' + w,
      );
    assert.deepEqual(errors, [], 'không lỗi trang (dữ liệu)');
    await context.close();
  }
  // 4. Màn hình đọc và thẻ kỳ ngộ ở ba khổ.
  const first = (id) => plan.find((m) => m.id === 'm:' + id + '-1');
  const lvTop = Math.max(...['batu', 'luc', 'daoly'].map((id) => first(id).lv));
  const half = LEVEL_AT[lvTop] * 2;
  const FACE = { batu: 'BB', luc: 'LT', daoly: 'ĐL' };
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, {
      touch,
      workspace: seed(half)(),
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    await page.waitForSelector('.gr-meet-panel');
    const cards = await page.evaluate(() =>
      Object.fromEntries(
        ['batu', 'luc', 'daoly'].map((id) => {
          const li = document.querySelector('.gr-meet[data-cast="' + id + '"]');
          return [
            id,
            li && {
              met: li.classList.contains('is-met'),
              name: li.querySelector('strong')?.textContent,
              face: li.querySelector('.gr-meet-face')?.textContent,
              fits: (() => {
                const r = li.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth;
              })(),
            },
          ];
        }),
      ),
    );
    for (const id of ['batu', 'luc', 'daoly'])
      assert.deepEqual(
        cards[id],
        { met: true, name: CAST_NAMES[id], face: FACE[id], fits: true },
        `thẻ kỳ ngộ ${id}` + at,
      );
    // Người nói trên màn hình đọc: trang có lời của chính nhân vật ấy.
    for (const [id, pageAt] of [
      ['batu', 1],
      ['luc', 1],
      ['daoly', 0],
    ]) {
      await page.click('.gr-meet-panel [data-gr-story="m:' + id + '-1"]');
      await page.waitForSelector('dialog.gr-story[open]');
      for (let i = 0; i < pageAt; i++) await page.keyboard.press('ArrowRight');
      await page.waitForFunction(
        (n) =>
          document.querySelector('dialog.gr-story .gr-story-who')
            ?.textContent === n,
        CAST_NAMES[id],
        { timeout: 5000 },
      );
      assert.equal(
        await page.locator('dialog.gr-story .gr-story-who').textContent(),
        CAST_NAMES[id],
        `người nói ${id} trên màn hình đọc` + at,
      );
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => !document.querySelector('dialog.gr-story'),
      );
    }
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('growth-handanh-browser: ok');
} finally {
  await h.close();
}
