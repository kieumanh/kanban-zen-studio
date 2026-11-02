// Hồi quy v1.17.2: khu "Ghi chú ghim nhanh" ở thanh bên — hàng có ô màu, tên, dòng xem trước; nút bỏ ghim dạng biểu tượng đủ lớn;
// lối tắt "Tất cả ghi chú"; mở ghi chú, bỏ ghim vẫn đúng; không tràn ở 390/820/1440px.
import assert from 'node:assert/strict';
import { startHarness, makeProject } from './lib/browser-harness.mjs';

const note = (id, title, extra = {}) => ({
  id,
  type: 'note',
  title,
  text: 'Dòng đầu của ' + title + '\nDòng hai',
  url: '',
  group: '',
  color: '#7950c8',
  ...extra,
});
const seed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 4)],
  notes: [
    note(
      'n1',
      'Danh sách vật dụng chuẩn bị cho khóa tu mùa thu rất dài để thử cắt chữ',
      { quickPinned: true, color: '#d65380' },
    ),
    note('n2', 'Lịch thiền', { quickPinned: true, color: '#3f9a72' }),
    note('n3', 'Việc cần làm', {
      quickPinned: true,
      type: 'todo',
      text: '',
      items: [
        { id: 'a', text: 'Một', done: true },
        { id: 'b', text: 'Hai', done: false },
      ],
    }),
    note('n4', 'Ghi chú không ghim'),
  ],
});
const h = await startHarness({ seed });
try {
  for (const width of [390, 820, 1440]) {
    const { context, page } = await h.open(width, { touch: width < 1000 });
    const at = ` (${width}px)`;
    if (width < 1000)
      await page.evaluate(() =>
        document.querySelector('.sidebar').classList.add('open'),
      );
    await page.waitForSelector('#side-quick-notes .zen-quick-note-item');

    const info = await page.evaluate(() => {
      const section = document.querySelector('#side-quick-notes');
      const sr = section.getBoundingClientRect();
      return {
        label: section
          .querySelector('.navlabel')
          .textContent.replace(/\s+/g, ' ')
          .trim(),
        sideRight: document.querySelector('.sidebar').getBoundingClientRect()
          .right,
        sectionRight: sr.right,
        scrollOverflow: document.documentElement.scrollWidth > innerWidth,
        items: [...section.querySelectorAll('.zen-quick-note-item')].map(
          (item) => {
            const open = item
              .querySelector('[data-zen-quick-open]')
              .getBoundingClientRect();
            const rm = item.querySelector('[data-zen-quick-remove]');
            const rr = rm.getBoundingClientRect();
            const badge = item.querySelector('.zen-quick-note-badge');
            const title = item.querySelector('.zen-quick-note-title');
            return {
              title: title.textContent,
              preview: item.querySelector('small')?.textContent || '',
              badgeSvg: !!badge.querySelector('svg'),
              badgeW: Math.round(badge.getBoundingClientRect().width),
              color: item.style.getPropertyValue('--note-color'),
              openH: Math.round(open.height),
              rmW: Math.round(rr.width),
              rmH: Math.round(rr.height),
              rmSvg: !!rm.querySelector('svg'),
              rmText: rm.textContent.trim(),
              rmLabel: rm.getAttribute('aria-label'),
              inside:
                item.getBoundingClientRect().right <= sr.right + 0.5 &&
                rr.right <= sr.right + 0.5,
              ellipsis: title.scrollWidth > title.clientWidth,
            };
          },
        ),
        all: section
          .querySelector('.zen-quick-note-all')
          ?.getBoundingClientRect().height,
      };
    });
    assert.equal(
      info.label,
      'Ghi chú ghim nhanh3/3',
      'tiêu đề' + at + info.label,
    );
    assert.equal(info.items.length, 3, 'số hàng' + at);
    assert.deepEqual(
      info.items.map((i) => i.color),
      ['#d65380', '#3f9a72', '#7950c8'],
      'màu ghi chú' + at,
    );
    assert.deepEqual(
      info.items.map((i) => i.preview),
      [
        'Dòng đầu của Danh sách vật dụng chuẩn bị cho khóa tu mùa thu rất dài để thử cắt chữ',
        'Dòng đầu của Lịch thiền',
        '1/2 mục đã xong',
      ],
      'dòng xem trước' + at,
    );
    assert.ok(
      info.items.every(
        (i) =>
          i.badgeSvg &&
          i.badgeW === 32 &&
          i.rmSvg &&
          i.rmText === '' &&
          /^Bỏ ghim nhanh /.test(i.rmLabel),
      ),
      'ô màu / nút bỏ ghim' + at + JSON.stringify(info.items[0]),
    );
    assert.ok(
      info.items.every(
        (i) =>
          i.openH >= 44 && i.rmH >= 44 && i.rmW >= (width < 1000 ? 44 : 34),
      ),
      'vùng chạm quá nhỏ' +
        at +
        JSON.stringify(info.items.map((i) => [i.openH, i.rmW, i.rmH])),
    );
    assert.ok(
      info.items.every((i) => i.inside),
      'hàng tràn khỏi khung' + at,
    );
    assert.equal(
      info.items[0].ellipsis,
      true,
      'tên dài phải được cắt gọn bằng dấu …' + at,
    );
    assert.ok(info.all >= 44, 'lối tắt Tất cả ghi chú' + at);
    assert.ok(
      info.sectionRight <= info.sideRight + 0.5 && !info.scrollOverflow,
      'khung tràn' + at,
    );

    // Mở ghi chú.
    await page.locator('[data-zen-quick-open="n2"]').click();
    await page.waitForSelector('#editor[open]');
    assert.match(
      await page.evaluate(() => document.querySelector('#editor').textContent),
      /Lịch thiền/,
      'mở đúng ghi chú' + at,
    );
    await page.evaluate(() => document.querySelector('#editor').close());
    if (width < 1000)
      await page.evaluate(() =>
        document.querySelector('.sidebar').classList.add('open'),
      );

    // Bỏ ghim nhanh: ghi chú biến khỏi danh sách, vẫn còn trong dữ liệu.
    await page.locator('[data-zen-quick-remove="n2"]').click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('#side-quick-notes .zen-quick-note-item')
          .length === 2,
    );
    assert.deepEqual(
      await page.evaluate(() => [
        data.notes.find((n) => n.id === 'n2').quickPinned,
        !!data.notes.find((n) => n.id === 'n2'),
      ]),
      [false, true],
      'bỏ ghim' + at,
    );
    assert.equal(
      await page.locator('#side-quick-notes .navlabel small').innerText(),
      '2/3',
    );

    // Lối tắt tới trang Ghi chú.
    if (width < 1000)
      await page.evaluate(() =>
        document.querySelector('.sidebar').classList.add('open'),
      );
    await page.locator('#side-quick-notes .zen-quick-note-all').click();
    await page.waitForFunction(() => view === 'notes');
    await context.close();
  }
  console.log(
    'PASS: Ghi chú ghim nhanh — ô màu, tên, xem trước, bỏ ghim bằng biểu tượng, lối tắt Tất cả ghi chú (390/820/1440px).',
  );
} finally {
  await h.close();
}
