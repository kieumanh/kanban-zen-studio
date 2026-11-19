// v2.61.0 (Sở Trường Khiếm Khuyết): trang Báo cáo tu luyện có mục “Sở trường và khiếm khuyết”. Dựa trên mức trung bình của tám phương (cùng ngưỡng với “Luận từng mạch”):
// sở trường = từ 1,25 lần trung bình trở lên (tối đa 3 thẻ), khiếm khuyết = dưới 0,75 lần hoặc chưa khai mạch (tối đa 4 thẻ, còn lại nêu tên). Thẻ sở trường có cách phát huy;
// thẻ khiếm khuyết có mục tiêu gần (điểm và số việc để thoát vùng cần khổ luyện), hai việc gợi ý của phương ấy và cách mượn sức sở trường mạnh nhất.
// Các trường hợp: có cả hai, chỉ sở trường, chỉ khiếm khuyết, tám phương đều nhau. Kiểm ở 390 / 820 / 1440 px, sáng và tối; chỉ đọc, không ghi gì.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
// Mỗi phương cho số điểm (nguyên) → các lần vận công mỗi lần 1 điểm (2 nửa điểm), p theo thứ tự ô: [Đạo tâm, Tài lộc, Tâm cảnh, Nhân duyên, Thân thể, Trí tuệ, Sự nghiệp, Gia đạo].
function growthOf(points) {
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
  };
}
const CASES = {
  // tổng 26, trung bình 3,25: sở trường ≥ 4,0625 (Tài lộc 10, Trí tuệ 8); khiếm khuyết < 2,4375 (Thân thể 0, Gia đạo 0, Đạo tâm 1, Nhân duyên 1, Tâm cảnh 2).
  both: growthOf([1, 10, 2, 1, 0, 8, 4, 0]),
  // Tài lộc 10, bảy phương 3 điểm: trung bình 3,875; sở trường ≥ 4,84 (Tài lộc); 3 ≥ 2,906 nên không có khiếm khuyết.
  strongOnly: growthOf([3, 10, 3, 3, 3, 3, 3, 3]),
  // Gia đạo 0, bảy phương 3 điểm: trung bình 2,625; 3 < 3,28 nên không có sở trường; khiếm khuyết < 1,97 (Gia đạo).
  weakOnly: growthOf([3, 3, 3, 3, 3, 3, 3, 0]),
  even: growthOf([2, 2, 2, 2, 2, 2, 2, 2]),
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
  await page.waitForSelector('.gr-sw');
  return { context, page, server, errors };
}
const cardsOf = (page, col) =>
  page.evaluate(
    (c) =>
      [
        ...document.querySelectorAll(
          '.gr-sw-col[data-col="' + c + '"] .gr-sw-card',
        ),
      ].map((x) => ({
        axis: x.dataset.axis,
        title:
          x.querySelector('h4').childNodes[1].textContent.trim() +
          ' | ' +
          x.querySelector('h4 small').textContent.trim(),
        text: x.textContent.replace(/\s+/g, ' ').trim(),
        ideas: [...x.querySelectorAll('li')].map((l) => l.textContent),
        goal:
          x
            .querySelector('.gr-sw-goal')
            ?.textContent.replace(/\s+/g, ' ')
            .trim() || null,
        use:
          x
            .querySelector('.gr-sw-use')
            ?.textContent.replace(/\s+/g, ' ')
            .trim() || null,
      })),
    col,
  );

const h = await startHarness({ seed: seed(CASES.both) });
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
        CASES.both,
      );

      // 1. Có cả sở trường và khiếm khuyết.
      assert.equal(
        await page.locator('.gr-sw h2').innerText(),
        'Sở trường và khiếm khuyết',
        'tiêu đề' + at,
      );
      assert.match(
        await page.locator('.gr-sw > .help-copy').innerText(),
        /Mức trung bình hiện tại là 3,3 điểm mỗi phương\. Sở trường là phương từ 1,25 lần trung bình trở lên; khiếm khuyết là phương dưới 0,75 lần hoặc chưa khai mạch\./,
        'nêu ngưỡng' + at,
      );
      const order = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const f = (a, b) =>
          !!(
            q(a).compareDocumentPosition(q(b)) &
            Node.DOCUMENT_POSITION_FOLLOWING
          );
        return {
          afterHist: f('.gr-hist', '.gr-sw'),
          beforeTips: f('.gr-sw', '.gr-tips'),
        };
      });
      assert.ok(
        order.afterHist && order.beforeTips,
        'nằm sau Lịch sử biến chuyển, trước Bí kíp cải thiện' + at,
      );
      const strong = await cardsOf(page, 'strong');
      assert.deepEqual(
        strong.map((c) => c.axis),
        ['tai', 'tri'],
        'sở trường: Tài lộc rồi Trí tuệ' + at,
      );
      assert.equal(
        strong[0].title,
        'Tài lộc | 10 điểm · gấp 3,1 lần trung bình',
        'điểm và bội số Tài lộc' + at,
      );
      assert.equal(
        strong[1].title,
        'Trí tuệ | 8 điểm · gấp 2,5 lần trung bình',
      );
      assert.match(
        strong[0].use,
        /^Phát huy: Dùng nguồn lực dư/,
        'cách phát huy theo phương' + at,
      );
      assert.match(strong[1].use, /^Phát huy: Dùng khả năng học/);
      const weak = await cardsOf(page, 'weak');
      assert.deepEqual(
        weak.map((c) => c.axis),
        ['than', 'gia', 'dao', 'duyen'],
        'khiếm khuyết thấp nhất lên trước, đồng điểm theo thứ tự ô, tối đa 4' +
          at,
      );
      assert.equal(
        weak[0].title,
        'Thân thể | 0 điểm · chưa khai mạch',
        'phương 0 điểm là chưa khai mạch' + at,
      );
      assert.equal(
        weak[2].title,
        'Đạo tâm | 1 điểm · bằng 31% trung bình',
        'phần trăm so với trung bình' + at,
      );
      assert.match(
        weak[0].goal,
        /^Mục tiêu gần: thêm 2,5 điểm \(khoảng 3 việc\) để thoát vùng cần khổ luyện\.$/,
        'mục tiêu Thân thể' + at,
      );
      assert.match(
        weak[2].goal,
        /^Mục tiêu gần: thêm 1,5 điểm \(khoảng 2 việc\)/,
        'mục tiêu Đạo tâm' + at,
      );
      assert.equal(weak[0].ideas.length, 2, 'hai việc gợi ý' + at);
      assert.deepEqual(
        weak[0].ideas,
        ['Đi bộ, tập võ, vận động', 'Ngủ đủ và đúng giờ'],
        'việc gợi ý của chính phương Thân thể' + at,
      );
      for (const c of weak)
        assert.match(
          c.use,
          /^Mượn sức Tài lộc: Dùng nguồn lực dư/,
          'mượn sức sở trường mạnh nhất' + at,
        );
      assert.match(
        weak[0].use,
        /để nuôi Thân thể\.$/,
        'câu mượn sức nhắc đúng tên phương yếu' + at,
      );
      assert.match(weak[1].use, /để nuôi Gia đạo\.$/);
      assert.match(
        strong[0].use,
        /để nuôi các phương còn yếu\.$/,
        'thẻ sở trường nói chung về các phương còn yếu' + at,
      );
      assert.ok(
        !weak.concat(strong).some((c) => /phương yếu/.test(c.use)),
        'không còn chữ “phương yếu” chung chung' + at,
      );
      assert.match(
        await page
          .locator('.gr-sw-col[data-col="weak"] > .help-copy')
          .innerText(),
        /Còn 1 phương dưới mức nữa: Tâm cảnh\./,
        'nêu tên phương còn lại' + at,
      );
      assert.deepEqual(
        await page.evaluate(() =>
          [...document.querySelectorAll('.gr-sw-col > h3')].map((x) =>
            x.textContent.trim(),
          ),
        ),
        ['Sở trường 2 phương', 'Khiếm khuyết 5 phương'],
        'đếm phương mỗi nhóm' + at,
      );

      // 2. Giao diện.
      const ui = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.gr-sw-card')];
        const cols = [...document.querySelectorAll('.gr-sw-col')].map((x) =>
          x.getBoundingClientRect(),
        );
        return {
          radius: cards.map((x) =>
            parseFloat(getComputedStyle(x).borderTopRightRadius),
          ),
          fits: cards.every((x) => x.scrollWidth <= x.clientWidth + 1),
          icons: cards.every((x) => x.querySelectorAll('h4 svg').length === 1),
          sideBySide: Math.abs(cols[0].top - cols[1].top) < 2,
          border: cards.map((x) => getComputedStyle(x).borderLeftWidth),
        };
      });
      assert.ok(
        ui.radius.every((x) => x >= 12),
        'thẻ bo tròn' + at,
      );
      assert.ok(ui.fits, 'thẻ nằm gọn' + at);
      assert.ok(ui.icons, 'mỗi thẻ một biểu tượng' + at);
      assert.equal(
        ui.sideBySide,
        width > 900,
        (width > 900 ? 'hai cột' : 'một cột') + ' ở ' + width + 'px' + at,
      );
      assert.ok(
        ui.border.every((b) => b === '4px'),
        'viền trái theo màu phương' + at,
      );
      assert.ok(await noOverflow(page), 'không tràn ngang' + at);

      // 3. Chỉ đọc.
      assert.deepEqual(
        server.workspace.growth,
        CASES.both,
        'sổ điểm ở máy chủ không đổi' + at,
      );
      assert.deepEqual(errors, [], 'không lỗi trang' + at);
      await context.close();
    }
  }

  // 4. Chỉ có sở trường.
  {
    const { context, page } = await openReport(
      h,
      390,
      true,
      'light',
      CASES.strongOnly,
    );
    assert.deepEqual(
      (await cardsOf(page, 'strong')).map((c) => c.axis),
      ['tai'],
      'một sở trường',
    );
    assert.equal(
      (await cardsOf(page, 'weak')).length,
      0,
      'không có thẻ khiếm khuyết',
    );
    assert.match(
      await page.locator('.gr-sw-col[data-col="weak"]').innerText(),
      /Chưa có khiếm khuyết rõ: không phương nào dưới ba phần tư mức trung bình\./,
      'báo chưa có khiếm khuyết',
    );
    await context.close();
  }
  // 5. Chỉ có khiếm khuyết (Gia đạo 0 điểm; không sở trường nên không có “Mượn sức”).
  {
    const { context, page } = await openReport(
      h,
      390,
      true,
      'light',
      CASES.weakOnly,
    );
    assert.equal(
      (await cardsOf(page, 'strong')).length,
      0,
      'không có thẻ sở trường',
    );
    assert.match(
      await page.locator('.gr-sw-col[data-col="strong"]').innerText(),
      /Chưa phương nào vượt trội\./,
      'báo chưa có sở trường',
    );
    const weak = await cardsOf(page, 'weak');
    assert.deepEqual(
      weak.map((c) => c.axis),
      ['gia'],
    );
    assert.match(
      weak[0].goal,
      /thêm 2 điểm \(khoảng 2 việc\)/,
      'mục tiêu Gia đạo (ngưỡng 0,75 × 2,625 = 1,97, làm tròn lên bội 0,5 là 2)',
    );
    assert.equal(weak[0].use, null, 'không có sở trường để mượn sức');
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
    assert.match(
      await page.locator('.gr-sw-even').innerText(),
      /Tám phương đang khá đều: chưa có sở trường vượt trội hay khiếm khuyết rõ rệt\./,
      'đều nhau',
    );
    assert.equal(await page.locator('.gr-sw-card').count(), 0, 'không thẻ nào');
    await context.close();
  }
} finally {
  await h.close();
}
console.log('growth strengths browser ok');
