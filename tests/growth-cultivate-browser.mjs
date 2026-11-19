// v2.62.0 (Nhân Quả Tu Luyện): trang Báo cáo tu luyện có mục “Gợi ý tu luyện theo phương yếu nhất”. Lấy phương thấp nhất (đồng điểm: ô đứng trước) rồi áp dụng Nghiệp quả:
// gieo ở phương nào, quả trổ về chính phương ấy. Ba bước: Nhân cho mình (hai việc), Nhân cho người (hai việc giúp người ở đúng phương ấy) và Quả trổ về mình.
// Có lời cho các trường hợp: phương yếu duy nhất, nhiều phương thấp ngang, tám phương đều nhau, phương từng được bồi bổ (nêu ngày gần nhất), tu vi hiện có bằng 0 (không hiện mục).
// Kiểm ở 390 / 820 / 1440 px, sáng và tối; chỉ đọc, không ghi gì.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
// Mỗi phương cho số điểm (nguyên) → các lần vận công mỗi lần 1 điểm (2 nửa điểm), p theo thứ tự ô: [Đạo tâm, Tài lộc, Tâm cảnh, Nhân duyên, Thân thể, Trí tuệ, Sự nghiệp, Gia đạo].
function growthOf(points, extra = {}) {
  const log = [];
  points.forEach((pts, axis) => {
    for (let k = 0; k < pts; k++) {
      const p = Array(8).fill(0);
      p[axis] = 2;
      log.push({
        id: 'a' + axis + 'k' + k,
        d: '2026-11-10',
        s: 'task',
        k: 'task:' + axis + '-' + k,
        n: 'Việc ' + axis + '-' + k,
        p,
      });
    }
  });
  return {
    v: 1,
    hero: 'nam',
    name: 'Mạnh',
    since: '2026-11-01',
    log,
    spend: [],
    ...extra,
  };
}
const CASES = {
  // Thân thể và Gia đạo cùng 0 điểm: yếu nhất là Thân thể (ô đứng trước), Gia đạo thấp ngang.
  tied: growthOf([1, 10, 2, 1, 0, 8, 4, 0]),
  // Gia đạo 1 điểm (từng bồi bổ ngày 10/11, cách hôm nay 2 ngày): yếu nhất duy nhất.
  single: growthOf([3, 3, 3, 3, 3, 3, 3, 1]),
  even: growthOf([2, 2, 2, 2, 2, 2, 2, 2]),
  // Tài lộc 1 điểm vừa cộng hôm nay (12/11); các phương khác 3 điểm.
  today: growthOf([3, 0, 3, 3, 3, 3, 3, 3], {
    log: [
      ...growthOf([3, 0, 3, 3, 3, 3, 3, 3]).log,
      {
        id: 'tdy',
        d: '2026-11-12',
        s: 'task',
        k: 'task:tdy',
        n: 'Ghi thu chi',
        p: [0, 2, 0, 0, 0, 0, 0, 0],
      },
    ],
  }),
  // Điểm đã quy đổi hết: tu vi hiện có 0.
  spentAll: {
    v: 1,
    hero: 'nam',
    since: '2026-11-01',
    log: [
      {
        id: 'z1',
        d: '2026-11-10',
        s: 'task',
        k: 'task:z',
        n: 'Việc',
        p: [0, 2, 0, 0, 0, 0, 0, 0],
      },
    ],
    spend: [
      { id: 'sp1', d: '2026-11-11', n: 'Sách', p: [0, 2, 0, 0, 0, 0, 0, 0] },
    ],
  },
};
const seed = (growth) => () => ({ schema: 1, projects: [], notes: [], growth });
const setup =
  (theme) =>
  ({ context }) =>
    context.addInitScript((t) => localStorage.setItem('zen-theme', t), theme);
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

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
  await page.waitForSelector('.gr-report');
  return { context, page, server, errors };
}
const read = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('.gr-cult');
    if (!el) return null;
    const q = (s) => el.querySelector(s);
    const step = (k) =>
      [
        ...el.querySelectorAll('.gr-cult-steps > li[data-step="' + k + '"] li'),
      ].map((x) => x.textContent);
    const clean = (s) => s.replace(/\s+/g, ' ').trim();
    return {
      axis: el.dataset.axis,
      lead: clean(q('.gr-cult-lead').textContent),
      when: clean(q('.gr-cult-when').textContent),
      karma: clean(q('.gr-cult-karma').textContent),
      tags: [...el.querySelectorAll('.gr-cult-steps > li > small')].map(
        (x) => x.textContent,
      ),
      heads: [...el.querySelectorAll('.gr-cult-steps > li > h3')].map(
        (x) => x.textContent,
      ),
      self: step('self'),
      give: step('give'),
      fruit: clean(q('li[data-step="fruit"] p').textContent),
      foot: clean(q(':scope > .help-copy').textContent),
    };
  });

const h = await startHarness({ seed: seed(CASES.tied) });
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
        CASES.tied,
      );

      // 1. Thân thể và Gia đạo cùng 0 điểm: Thân thể đứng trước.
      assert.equal(
        await page.locator('.gr-cult h2').innerText(),
        'Gợi ý tu luyện theo phương yếu nhất',
        'tiêu đề' + at,
      );
      const r = await read(page);
      assert.equal(
        r.axis,
        'than',
        'phương yếu nhất là Thân thể (đồng điểm: ô đứng trước)' + at,
      );
      assert.equal(
        r.lead,
        'Phương yếu nhất hiện nay là Thân thể (0 điểm, thấp nhất trong tám phương; mức trung bình 3,3). Gia đạo cũng thấp ngang.',
        'lời dẫn' + at,
      );
      assert.equal(
        r.when,
        'Phương này chưa từng được bồi bổ.',
        'chưa từng bồi bổ' + at,
      );
      assert.match(
        r.karma,
        /^Nghiệp quả Nhân quả · gieo gặt Mọi việc làm ở bất kỳ phương nào, kể cả việc giúp người, đều là hạt giống/,
        'nguyên lý Nghiệp quả' + at,
      );
      assert.deepEqual(
        r.tags,
        ['Nhân · cho mình', 'Nhân · cho người', 'Quả · về mình'],
        'ba bước nhân → quả' + at,
      );
      assert.deepEqual(
        r.heads,
        ['Gieo cho chính mình', 'Gieo cho người', 'Quả trổ về Thân thể'],
        'tiêu đề ba bước' + at,
      );
      assert.deepEqual(
        r.self,
        ['Đi bộ hoặc vận động mười lăm phút', 'Ngủ đúng giờ tối nay'],
        'hai việc gieo cho mình' + at,
      );
      assert.deepEqual(
        r.give,
        [
          'Rủ người thân hoặc bạn cùng đi bộ',
          'Nấu hoặc chia sẻ một món ăn lành mạnh cho người khác',
        ],
        'hai việc gieo cho người' + at,
      );
      assert.match(
        r.fruit,
        /^Rủ người cùng tập thì thói quen của mình bền hơn/,
        'quả quay về mình' + at,
      );
      assert.match(
        r.foot,
        /dồn điểm vào Thân thể ở bảng vận công.*gieo ở đâu, quả về đó\.$/,
        'nhắc cách ghi điểm' + at,
      );
      const order = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const f = (a, b) =>
          !!(
            q(a).compareDocumentPosition(q(b)) &
            Node.DOCUMENT_POSITION_FOLLOWING
          );
        return {
          afterSw: f('.gr-sw', '.gr-cult'),
          beforeTips: f('.gr-cult', '.gr-tips'),
        };
      });
      assert.ok(
        order.afterSw && order.beforeTips,
        'nằm sau Sở trường và khiếm khuyết, trước Bí kíp cải thiện' + at,
      );

      // 2. Giao diện.
      const ui = await page.evaluate(() => {
        const steps = [...document.querySelectorAll('.gr-cult-steps > li')];
        const tops = steps.map((x) =>
          Math.round(x.getBoundingClientRect().top),
        );
        return {
          radius: steps.map((x) =>
            parseFloat(getComputedStyle(x).borderTopRightRadius),
          ),
          fits: steps.every((x) => x.scrollWidth <= x.clientWidth + 1),
          oneRow: new Set(tops).size === 1,
          fruitDashed: getComputedStyle(steps[2]).borderTopStyle,
          topColor: getComputedStyle(document.querySelector('.gr-cult'))
            .borderTopWidth,
        };
      });
      assert.ok(
        ui.radius.every((x) => x >= 12),
        'thẻ bo tròn' + at,
      );
      assert.ok(ui.fits, 'thẻ nằm gọn' + at);
      assert.equal(
        ui.oneRow,
        width > 900,
        (width > 900 ? 'ba thẻ một hàng' : 'xếp một cột') +
          ' ở ' +
          width +
          'px' +
          at,
      );
      assert.equal(ui.topColor, '4px', 'viền trên theo màu phương yếu' + at);
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);

      // 3. Chỉ đọc.
      assert.deepEqual(
        server.workspace.growth,
        CASES.tied,
        'sổ điểm ở máy chủ không đổi' + at,
      );
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // 4. Phương yếu nhất duy nhất, từng được bồi bổ.
  {
    const { context, page } = await openReport(
      h,
      390,
      true,
      'light',
      CASES.single,
    );
    const r = await read(page);
    assert.equal(r.axis, 'gia');
    assert.equal(
      r.lead,
      'Phương yếu nhất hiện nay là Gia đạo (1 điểm, thấp nhất trong tám phương; mức trung bình 2,8).',
      'không có phương thấp ngang',
    );
    assert.equal(
      r.when,
      'Lần gần nhất bồi bổ phương này: 10/11 (2 ngày trước).',
      'nêu ngày bồi bổ gần nhất',
    );
    assert.deepEqual(r.self, [
      'Gọi hoặc về thăm cha mẹ, người thân',
      'Dọn dẹp một góc nhà cho gọn gàng',
    ]);
    assert.match(r.fruit, /^Gieo hiếu và sự chăm sóc trong nhà/);
    await context.close();
  }
  // 5. Vừa bồi bổ hôm nay.
  {
    const { context, page } = await openReport(
      h,
      390,
      true,
      'light',
      CASES.today,
    );
    const r = await read(page);
    assert.equal(r.axis, 'tai', 'Tài lộc yếu nhất');
    assert.equal(
      r.when,
      'Lần gần nhất bồi bổ phương này: 12/11 (hôm nay).',
      'bồi bổ hôm nay',
    );
    await context.close();
  }
  // 6. Tám phương đều nhau.
  {
    const { context, page } = await openReport(
      h,
      390,
      true,
      'light',
      CASES.even,
    );
    const r = await read(page);
    assert.equal(r.axis, 'dao', 'bắt đầu từ ô đầu');
    assert.equal(
      r.lead,
      'Tám phương đang ngang nhau (2 điểm mỗi phương). Gợi ý bắt đầu từ Đạo tâm; các hạ cũng có thể chọn phương khác tùy ý.',
    );
    await context.close();
  }
  // 7. Tu vi hiện có bằng 0 (đã quy đổi hết): không hiện mục.
  {
    const { context, page } = await openReport(
      h,
      390,
      true,
      'light',
      CASES.spentAll,
    );
    assert.equal(
      await page.locator('.gr-cult').count(),
      0,
      'không hiện mục khi tu vi hiện có bằng 0',
    );
    assert.equal(await page.locator('.gr-sw').count(), 0);
    await context.close();
  }
} finally {
  await h.close();
}
console.log('growth cultivate browser ok');
