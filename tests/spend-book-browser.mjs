// v2.89.0 (Bảo vật): Sổ bảo vật có hình minh họa đúng món ở ô bên trái mỗi dòng (món được nhận ra từ tên đã ghi; không nhận ra thì dùng rương chung);
// tên và chi tiết xếp một cột, nút thao tác nằm dưới ở màn hẹp và bên phải ở màn rộng từ 701 px. Tàng Bảo Các có thêm
// “Vạn Thư Ngọc Hạp (USB chứa dữ liệu)”. Kiểm tra ở 390 (chạm), 820, 1440 px, cả Thiền lẫn Giang hồ: không tràn ngang, hình đúng món, nút đủ vùng chạm.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';
import { openGrowthTab } from './lib/growth-tab.mjs';

const day = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const GROWTH = {
  v: 1,
  hero: 'nam',
  since: day(-40),
  log: [
    { id: 'e1', d: day(-3), s: 'task', k: 'task:e1', n: 'Việc một', p: [20, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'e2', d: day(-2), s: 'task', k: 'task:e2', n: 'Việc hai', p: [0, 12, 8, 0, 0, 0, 0, 0] },
    { id: 'e3', d: day(-1), s: 'task', k: 'task:e3', n: 'Việc ba', p: [0, 0, 0, 0, 0, 0, 16, 4] },
  ],
  spend: [
    { id: 's1', d: day(-1), n: 'Vạn Thư Ngọc Hạp (USB)', p: [0, 0, 0, 0, 0, 1, 1, 0], note: 'Kho tài liệu' },
    { id: 's2', d: day(-2), n: 'Bí kíp tu luyện · vật chất (1 quyển)', p: [0, 0, 0, 0, 0, 1, 0, 0] },
    { id: 's3', d: day(-3), n: 'Quân sư AI · ChatGPT Plus', p: [0, 0, 0, 0, 0, 0, 2, 0] },
    { id: 's4', d: day(-4), n: 'Mua sách giấy lạ', p: [0, 0, 0, 0, 2, 0, 0, 0] },
    { id: 's5', d: day(-5), n: 'Thiên Lý Nhãn (camera)', p: [0, 0, 0, 0, 0, 0, 2, 0], x: true },
  ],
};
const seed = () => ({ schema: 1, projects: [], notes: [], growth: GROWTH });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const giangho = ({ context }) => context.addInitScript(() => localStorage.setItem('zen-style', 'giangho'));

// Hình minh họa mỗi dòng: loại hình, cỡ hình, vị trí (ô hình, tên, nút thao tác), kích thước nút, bộ lọc của dòng đã hủy.
const rows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.gr-spend-item')].map((li) => {
      const th = li.querySelector('.gr-spend-thumb');
      const t = th.getBoundingClientRect();
      const m = li.querySelector('.gr-spend-main').getBoundingClientRect();
      const a = li.querySelector('.gr-spend-act').getBoundingClientRect();
      const svg = th.querySelector('svg')?.getBoundingClientRect();
      const btns = [...li.querySelectorAll('.gr-spend-act .btn')].map((b) => Math.round(b.getBoundingClientRect().height));
      return {
        pic: th.dataset.pic,
        svgW: svg ? Math.round(svg.width) : 0,
        thumbLeftOfMain: t.right <= m.left + 1,
        actBelow: a.top >= m.bottom - 1,
        actRight: a.left >= m.right - 1,
        btnH: btns.length ? Math.min(...btns) : 0,
        filter: getComputedStyle(th).filter,
        void: li.classList.contains('is-void'),
      };
    }),
  );

const h = await startHarness({ seed });
try {
  // A. Danh mục kho: có thêm USB, tên Hán Việt, tag và hình riêng.
  {
    const { context, page } = await h.open(390, { touch: true, workspace: seed() });
    await h.show(page, 'growth');
    const info = await page.evaluate(() => ({
      ids: zenStore.ITEMS.map((i) => i.id),
      usb: (({ name, tag, base }) => ({ name, tag, base }))(zenStore.ITEMS.find((i) => i.id === 'usb')),
    }));
    assert.deepEqual(info.ids, ['tro', 'son', 'kip', 'ruong', 'nhan', 'ai', 'usb'], 'bảy món, USB ở cuối');
    assert.deepEqual(info.usb, { name: 'Vạn Thư Ngọc Hạp', tag: 'USB chứa dữ liệu', base: 'Vạn Thư Ngọc Hạp' }, 'tên và tag của USB');
    await context.close();
  }

  // B. Nhận ra món từ tên đã ghi (hình đúng món; mạch đi kèm; mặc định là rương).
  {
    const { context, page } = await h.open(820, { touch: false, workspace: seed() });
    await h.show(page, 'growth');
    const keys = await page.evaluate(() => ({
      usb: zenStore.keyFor('Vạn Thư Ngọc Hạp (USB)'),
      vatChat: zenStore.keyFor('Bí kíp tu luyện · vật chất (1 quyển)'),
      tinhThan: zenStore.keyFor('Rương bí kíp · tinh thần (100 quyển)'),
      gemini: zenStore.keyFor('Quân sư AI · ChatGPT Plus'),
      camera: zenStore.keyFor('Thiên Lý Nhãn (camera)'),
      la: zenStore.keyFor('Mua sách giấy lạ'),
    }));
    assert.deepEqual(keys, { usb: 'usb', vatChat: 'book-vc', tinhThan: 'book-tt', gemini: 'ai', camera: 'eye', la: 'chest' }, 'hình đúng món, mặc định là rương');
    await context.close();
  }

  for (const [width, touch] of [
    [390, true],
    [820, false],
    [1440, false],
  ]) {
    for (const giang of [false, true]) {
      const at = ' (' + width + 'px, ' + (giang ? 'Giang hồ' : 'Thiền') + ')';
      const { context, page } = await h.open(width, { touch, workspace: seed(), setup: giang ? giangho : undefined });
      await h.show(page, 'growth');
      await openGrowthTab(page, 'store');

      // C. Kho: thẻ USB có hình minh họa.
      const card = await page.evaluate(() => {
        const c = document.querySelector('.gr-store-item[data-item="usb"]');
        const svg = c?.querySelector('svg.gr-st-pic')?.getBoundingClientRect();
        return { found: !!c, svgW: svg ? Math.round(svg.width) : 0 };
      });
      assert.equal(card.found, true, 'thẻ USB có trong kho' + at);
      assert.ok(card.svgW >= 56, 'thẻ USB có hình minh họa' + at);

      // D. Sổ bảo vật: mỗi dòng có hình đúng món, bố cục theo chiều rộng, nút đủ vùng chạm.
      const list = await rows(page);
      assert.equal(list.length, 5, 'năm dòng trong Sổ bảo vật' + at);
      assert.deepEqual(list.map((r) => r.pic).sort(), ['ai', 'book-vc', 'chest', 'eye', 'usb'], 'mỗi dòng có hình đúng món' + at);
      for (const r of list) {
        assert.ok(r.svgW >= 40, 'hình dòng đủ lớn để nhận ra' + at);
        assert.equal(r.thumbLeftOfMain, true, 'hình nằm bên trái tên món' + at);
        if (width >= 701) assert.equal(r.actRight, true, 'nút thao tác nằm bên phải từ 701 px' + at);
        else assert.equal(r.actBelow, true, 'nút thao tác nằm dưới tên món ở màn hẹp' + at);
        assert.ok(r.btnH >= (touch ? 40 : 32), 'nút thao tác đủ vùng chạm' + at);
        if (r.void) assert.match(r.filter, /grayscale/, 'dòng đã hủy có hình xám' + at);
      }
      assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
      await context.close();
    }
  }
  console.log('spend-book-browser ok');
} finally {
  await h.close();
}
