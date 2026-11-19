// v2.59.0 (Bát Phương Mới): tám phương diện vun bồi cuộc sống theo cấu trúc mới — 1 Tài lộc, 2 Tâm cảnh, 3 Nhân duyên, 4 Thân thể, 5 Trí tuệ,
// 6 Sự nghiệp, 7 Đạo tâm, 8 Gia đạo — mỗi phương một thẻ có số thứ tự, tên, nhãn phụ, lời mô tả; Nghiệp quả đứng trên cả tám phương như một nguyên lý
// (không phải một phương riêng). Sổ cái KHÔNG đổi: ô p[0] (trước là Nghiệp quả) thành Đạo tâm, ô p[7] (trước là Tinh thần) thành Gia đạo, Thể lực đổi
// tên Thân thể; điểm đã tích lũy giữ nguyên, không ghi lại gì lên máy chủ. Kiểm ở 390 / 820 / 1440 px, sáng và tối: không tràn ngang, thẻ bo tròn.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const NOW = '2026-11-12T09:00:00+07:00';
// Sổ cũ: nửa điểm ở ô 0 (trước là Nghiệp quả) và ô 7 (trước là Tinh thần), phát hành trước v2.59.0.
const LOG = [
  {
    id: 'l1',
    d: '2026-11-02',
    s: 'task',
    k: 'task:old1',
    n: 'Việc cũ một',
    p: [2, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'l2',
    d: '2026-11-03',
    s: 'task',
    k: 'task:old2',
    n: 'Việc cũ hai',
    p: [0, 0, 1, 0, 0, 0, 0, 3],
  },
];
const seed = (growth) => () => ({
  schema: 1,
  projects: [],
  notes: [],
  ...(growth ? { growth } : {}),
});
const setup =
  (theme) =>
  ({ context }) =>
    context.addInitScript((t) => localStorage.setItem('zen-theme', t), theme);
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

const ORDER = [
  'Tài lộc',
  'Tâm cảnh',
  'Nhân duyên',
  'Thân thể',
  'Trí tuệ',
  'Sự nghiệp',
  'Đạo tâm',
  'Gia đạo',
];
const SLOTS = [
  'Đạo tâm',
  'Tài lộc',
  'Tâm cảnh',
  'Nhân duyên',
  'Thân thể',
  'Trí tuệ',
  'Sự nghiệp',
  'Gia đạo',
];

const h = await startHarness({ seed: seed() });
try {
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    for (const theme of ['light', 'dark']) {
      const at = ' (' + width + 'px, ' + theme + ')';

      // 1. Trang chọn hiệp khách: hướng dẫn tám phương theo cấu trúc mới.
      {
        const { context, page } = await h.open(width, {
          touch,
          now: NOW,
          setup: setup(theme),
          workspace: seed()(),
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await h.show(page, 'growth');
        await page.waitForSelector('.gr-guide-list');
        const g = await page.evaluate(() => {
          const lis = [...document.querySelectorAll('.gr-guide-list li')];
          const karma = document.querySelector('.gr-guide .gr-karma');
          const list = document.querySelector('.gr-guide-list');
          const box = (el) => el.getBoundingClientRect();
          return {
            h2: document.querySelector('.gr-guide h2').textContent,
            names: lis.map((li) =>
              li
                .querySelector('strong')
                .textContent.replace(/^\s*\d+\.\s*/, '')
                .trim(),
            ),
            nos: lis.map((li) => li.querySelector('.gr-guide-no').textContent),
            noHidden: lis.every(
              (li) =>
                li.querySelector('.gr-guide-no').getAttribute('aria-hidden') ===
                'true',
            ),
            subs: lis.map((li) => li.querySelector('small').textContent),
            means: lis.map((li) => li.querySelector('p').textContent.length),
            icons: lis.map(
              (li) => li.querySelectorAll('.gr-guide-ico svg').length,
            ),
            colors: new Set(lis.map((li) => li.style.getPropertyValue('--c')))
              .size,
            radius: lis.map((li) =>
              parseFloat(getComputedStyle(li).borderTopLeftRadius),
            ),
            border: lis.map((li) =>
              parseFloat(getComputedStyle(li).borderTopWidth),
            ),
            tops: lis.map((li) => Math.round(box(li).top)),
            fits: lis.every(
              (li) =>
                box(li).left >= box(list).left - 1 &&
                box(li).right <= box(list).right + 1,
            ),
            karma: karma && {
              text: karma.textContent,
              name: karma.querySelector('strong').textContent,
              beforeList: !!(
                karma.compareDocumentPosition(list) &
                Node.DOCUMENT_POSITION_FOLLOWING
              ),
              isItem: !!karma.closest('li'),
              radius: parseFloat(getComputedStyle(karma).borderTopLeftRadius),
            },
          };
        });
        assert.equal(
          g.h2,
          'Tám phương diện vun bồi cuộc sống',
          'tiêu đề hướng dẫn' + at,
        );
        assert.deepEqual(
          g.names,
          ORDER,
          'tám thẻ theo đúng thứ tự cấu trúc mới' + at,
        );
        assert.deepEqual(
          g.nos,
          ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.'],
          'số thứ tự 1 đến 8' + at,
        );
        assert.ok(
          g.noHidden,
          'số thứ tự là trang trí, ẩn khỏi trình đọc màn hình' + at,
        );
        assert.deepEqual(
          g.subs,
          [
            'Tài chính · vật chất',
            'Cảm xúc · nội tâm',
            'Quan hệ · kết nối',
            'Sức khỏe · sinh lực',
            'Tri thức · nhận thức',
            'Công việc · cống hiến',
            'Tu tập · đạo hạnh',
            'Gia đình · hòa hợp',
          ],
          'nhãn phụ từng phương' + at,
        );
        assert.ok(
          g.means.every((n) => n >= 60),
          'mỗi phương có lời mô tả đủ ý' + at,
        );
        assert.deepEqual(
          g.icons,
          Array(8).fill(1),
          'mỗi phương một biểu tượng' + at,
        );
        assert.equal(g.colors, 8, 'tám màu riêng' + at);
        assert.ok(
          g.radius.every((r) => r >= 12),
          'thẻ bo tròn ' + g.radius + at,
        );
        assert.ok(
          g.border.every((b) => b >= 1),
          'thẻ có viền' + at,
        );
        assert.ok(g.fits, 'thẻ nằm gọn trong danh sách' + at);
        const cols = new Set(g.tops).size;
        assert.equal(
          cols,
          width >= 1000 ? 4 : 8,
          (width >= 1000 ? 'hai cột' : 'một cột') + ' ở ' + width + 'px' + at,
        );
        assert.ok(g.karma, 'có khối Nghiệp quả' + at);
        assert.equal(g.karma.name, 'Nghiệp quả', 'tên nguyên lý' + at);
        assert.match(
          g.karma.text,
          /Nhân quả · gieo gặt/,
          'nhãn phụ Nghiệp quả' + at,
        );
        assert.match(
          g.karma.text,
          /kể cả việc giúp người.*bồi đắp chính mình/,
          'giúp người cũng là gieo hạt cho chính mình' + at,
        );
        assert.ok(
          g.karma.beforeList,
          'Nghiệp quả đứng trên danh sách tám phương' + at,
        );
        assert.ok(!g.karma.isItem, 'Nghiệp quả không phải một phương' + at);
        assert.ok(g.karma.radius >= 12, 'khối Nghiệp quả bo tròn' + at);
        assert.equal(
          await page.locator('.gr-guide-list li').count(),
          8,
          'đúng tám phương' + at,
        );
        assert.ok(await noOverflow(page), 'không tràn ngang' + at);
        assert.deepEqual(errors, [], 'không lỗi trang' + at);
        await context.close();
      }

      // 2. Sổ cũ giữ nguyên: nhãn theo ô, điểm cũ không đổi, không ghi gì lên máy chủ.
      {
        const growth = {
          v: 1,
          hero: 'nam',
          name: 'Mạnh',
          since: '2026-11-01',
          log: LOG,
        };
        const { context, page, server } = await h.open(width, {
          touch,
          now: NOW,
          setup: setup(theme),
          workspace: seed(growth)(),
        });
        await h.show(page, 'growth');
        await page.waitForSelector('#gr-radar svg.gr-radar');
        const r = await page.evaluate(() => ({
          labels: [...document.querySelectorAll('.gr-radar .gr-label')].map(
            (n) => n.textContent,
          ),
          values: [...document.querySelectorAll('.gr-radar .gr-value')].map(
            (n) => n.textContent,
          ),
          text: document.querySelector('#gr-radar').textContent,
        }));
        assert.deepEqual(
          r.labels,
          SLOTS,
          'biểu đồ theo thứ tự ô sổ cái, tên mới' + at,
        );
        assert.deepEqual(
          r.values,
          ['1', '0', '0,5', '0', '0', '0', '0', '1,5'],
          'điểm cũ nằm đúng ô: Đạo tâm 1, Gia đạo 1,5' + at,
        );
        for (const old of ['Nghiệp quả', 'Thể lực', 'Tinh thần'])
          assert.ok(
            !r.text.includes(old),
            'biểu đồ không còn tên cũ ' + old + at,
          );
        assert.deepEqual(
          server.workspace.growth.log,
          LOG,
          'sổ cái ở máy chủ không bị đổi' + at,
        );
        assert.ok(await noOverflow(page), 'trang điểm không tràn ngang' + at);
        await context.close();
      }
    }
  }
} finally {
  await h.close();
}
console.log('growth axes browser ok');
