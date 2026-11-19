// Hồi quy v2.28.0 (Quyển Một · Tiếng Gánh Nước): làm sâu cốt truyện cấp 0–25, mở rộng ngay trong sáu chương đầu
// (khai cuộc, 5, 10, 15, 20, 25), mỗi trang mới có tranh riêng; không thêm chương, không đổi cấp mở chương.
//  1. Dữ liệu: sáu chương dài ra đúng số trang, mỗi trang có một dòng tranh; các tình tiết mới có mặt đúng chương
//     (lũ trẻ trêu "đứa nhặt ngoài cửa" và lời tiễn của Tô Bà Bà; bảng tre, tấm bia không tên, con quạ, bát cháo thứ ba;
//     lá thư "ba ngày"; cô bé Tiểu Nha trên cầu mục; mảng vá chỉ trắng của Hàn Phong; đứa trẻ chào đời dưới tiếng sáo).
//  2. Mạch truyện: các hạt giống gieo ở cấp thấp có chỗ trả ở chương sau (ba ngày muộn → cấp 88; bia không tên và đòn gánh →
//     Thủy Nương; tấm bảng tre và việc đếm → Thiên Diện mạo danh Tiểu Mộc; họa hình năm khuôn mặt → cấp 91).
//  3. Mỗi trang vẽ được (người nói có mặt trong tranh, chú thích đủ dài), không dòng tranh nào lặp trong chương.
//  4. Khung đọc ở 390, 820, 1440 px: lật hết từng chương, đúng số trang, đúng người nói ở trang mới, bảng vừa màn hình,
//     không chỗ thay chưa điền, không tràn ngang, không lỗi trang.
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
// 80 nửa điểm = 40 điểm: qua cấp 26, mở đủ sáu chương của Quyển Một.
const seed = () => ({
  schema: 1,
  projects: [structuredClone(project)],
  notes: [],
  growth: {
    v: 1,
    hero: 'nu',
    name: 'Lam Y',
    since: day(-40),
    log: [
      {
        id: 'e1',
        d: day(-1),
        s: 'task',
        k: 'task:e1',
        n: 'Việc cũ',
        p: [80, 0, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
});
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// Số trang mới của từng chương (trước v2.28.0: 10, 10, 12, 10, 10, 9).
const PAGES = { 0: 15, 5: 16, 10: 19, 15: 15, 20: 14, 25: 14 };
// Tình tiết mới: [cấp, mẫu chữ phải có trong đúng chương ấy].
const BEATS = [
  [0, /đứa nhặt ngoài cửa/],
  [0, /Trên đó có mùa đông không/],
  [0, /lò nhà này vẫn nhóm sẵn/],
  [0, /Con sẽ về ạ/],
  [0, /chiếc giỏ tre cũ/],
  [5, /tấm bảng tre nhỏ/],
  [5, /tấm bia gỗ không khắc tên/],
  [5, /con quạ đen/],
  [5, /bánh bao thiu/],
  [5, /ba chiếc bát cháo loãng/],
  [10, /ba ngày lại nặng với lão/],
  [10, /hang thuốc ấy tới muộn nửa ngày/],
  [10, /một bát cháo nóng/],
  [10, /có ai chờ tại hạ ở cuối đường/],
  [15, /cô bé Tiểu Nha/],
  [15, /túi quỹ vẫn nguyên trong tay/],
  [15, /họa hình năm khuôn mặt/],
  [20, /làng Thạch Bàn/],
  [20, /chỉ trắng/],
  [20, /đá văng một viên sỏi/],
  [25, /hai mươi người chạy nạn/],
  [25, /không biết đỡ đẻ/],
  [25, /Đứa bé đầu tiên ra đời dưới tiếng sáo ma/],
];
// Trang mới có người nói riêng: [cấp, khóa người nói, tên hiển thị, mẫu chữ].
const SPEAKERS = [
  [0, 'batu', 'Tô Bà Bà', /lò nhà này vẫn nhóm sẵn/],
  [5, 'moc', 'Tiểu Mộc', /bánh bao thiu/],
  [10, 'mien', 'Thụy Nguyệt Sứ Miên Hồ', /hang thuốc ấy tới muộn/],
  [10, 'dan', 'Trấn dân Thanh Khê', /một bát cháo nóng/],
  [25, 'hero', 'Lam Y', /không biết đỡ đẻ/],
];

const h = await startHarness({ seed: seed() });
try {
  // 1–3. Dữ liệu và tranh.
  {
    const { context, page } = await h.open(1440, { workspace: seed() });
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    const d = await page.evaluate(
      ([PAGES]) => {
        const C = window.zenTale.CHAPTERS;
        const Z = window.zenScene;
        const out = {
          count: C.length,
          pages: {},
          lines: {},
          text: {},
          bad: [],
          late: {},
          lv: C.map((c) => c.lv),
        };
        for (const lv of Object.keys(PAGES)) {
          const c = C.find((x) => x.lv === +lv);
          const lines = window.zenPlates.LINES['t' + lv];
          out.pages[lv] = c.pages.length;
          out.lines[lv] = lines.length;
          out.text[lv] = c.pages.map((p) => p[2]).join('\n');
          const seen = new Set();
          c.pages.forEach((p, i) => {
            const shot = Z.shotFor('t' + lv, i, null);
            try {
              if (!Z.build(shot))
                out.bad.push(lv + '.' + i + ': không dựng được');
            } catch (e) {
              out.bad.push(lv + '.' + i + ': ' + e.message);
            }
            const who = shot.f.map((q) => q.who);
            if (p[0] !== 'ke' && !who.includes(p[0]))
              out.bad.push(
                lv + '.' + i + ': người nói ' + p[0] + ' vắng trong tranh',
              );
            if (!shot.alt || shot.alt.length < 20)
              out.bad.push(lv + '.' + i + ': chú thích tranh quá ngắn');
            if (seen.has(lines[i]))
              out.bad.push(lv + '.' + i + ': dòng tranh lặp');
            seen.add(lines[i]);
          });
        }
        const all = (from) =>
          C.filter((c) => c.lv >= from)
            .map((c) => c.pages.map((p) => p[2]).join('\n'))
            .join('\n');
        out.late = {
          from88: all(88),
          from91: all(91),
          from86: all(86),
        };
        out.lateWho = [
          ...new Set(
            C.filter((c) => c.lv >= 88).flatMap((c) =>
              c.pages.map((p) => p[0]),
            ),
          ),
        ];
        return out;
      },
      [PAGES],
    );
    assert.equal(d.count, 39, 'vẫn khai cuộc + 38 chương, không thêm chương');
    for (const [lv, n] of Object.entries(PAGES)) {
      assert.equal(d.pages[lv], n, `chương cấp ${lv} có ${n} trang`);
      assert.equal(
        d.lines[lv],
        n,
        `chương cấp ${lv}: mỗi trang một dòng tranh`,
      );
    }
    for (const [lv, re] of BEATS)
      assert.match(d.text[lv], re, `chương cấp ${lv} có tình tiết ${re}`);
    assert.ok(
      (d.text[15].match(/Tiểu Nha/g) || []).length >= 3,
      'Tiểu Nha có mặt suốt chương cấp 15',
    );
    // 2. Chỗ trả của các hạt giống.
    assert.match(
      d.late.from88,
      /muộn ba ngày|ba ngày/,
      'ba ngày muộn được trả ở cấp 88 trở đi',
    );
    assert.match(
      d.late.from88,
      /đòn gánh ấy là của bà/,
      'chiếc đòn gánh và tấm bia không tên: chủ cũ hiện ra ở cấp 88 trở đi',
    );
    assert.ok(d.lateWho.includes('me'), 'Thủy Nương cất lời ở các chương cuối');
    assert.match(
      d.late.from91,
      /tấm bảng/,
      'tấm bảng tre được nhắc lại ở cấp 91 trở đi',
    );
    assert.match(
      d.late.from91,
      /Thiên Diện/,
      'Thiên Diện mạo danh Tiểu Mộc lộ ở cấp 91 trở đi',
    );
    assert.match(
      d.late.from86,
      /Hàn Phong/,
      'Hàn Phong còn xuất hiện ở các chương sau',
    );
    // 3. Mọi trang vẽ được.
    assert.deepEqual(
      d.bad,
      [],
      'mọi trang mới dựng được, người nói có mặt, chú thích đủ dài, dòng tranh không lặp',
    );
    await context.close();
  }
  // 4. Khung đọc.
  for (const [width, touch] of [
    [390, true],
    [820, true],
    [1440, false],
  ]) {
    const at = ' (' + width + 'px)';
    const { context, page } = await h.open(width, { touch, workspace: seed() });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await openGrowthTab(page, 'all');
    for (const [lvText, n] of Object.entries(PAGES)) {
      await page.click('[data-gr-story="' + lvText + '"]');
      await page.waitForSelector('dialog.gr-story[open]');
      const seen = [];
      for (let i = 0; i < 40; i++) {
        const r = await page.evaluate(() => {
          const dlg = document.querySelector('dialog.gr-story[open]');
          const b = dlg.getBoundingClientRect();
          return {
            who: dlg.querySelector('.gr-story-who')?.textContent || '',
            text: dlg.querySelector('.gr-story-text')?.textContent || '',
            cast: (dlg.querySelector('.gr-story-art .sc')?.dataset.who || '')
              .split(',')
              .filter(Boolean),
            lesson: !!dlg.querySelector('.gr-story-lesson'),
            fits:
              b.left >= 0 &&
              b.right <= innerWidth &&
              b.top >= 0 &&
              b.bottom <= innerHeight,
          };
        });
        if (r.lesson) break;
        seen.push(r);
        await page.keyboard.press('ArrowRight');
      }
      assert.equal(seen.length, n, `cấp ${lvText}: lật đủ ${n} trang` + at);
      assert.ok(
        seen.every((x) => x.fits),
        `cấp ${lvText}: mọi trang vừa màn hình` + at,
      );
      assert.deepEqual(
        seen.flatMap((x, i) =>
          x.who !== 'Truyện ký' && !x.cast.length
            ? [i + 1 + ': ' + x.text.slice(0, 40)]
            : [],
        ),
        [],
        `cấp ${lvText}: trang có người nói thì tranh có người` + at,
      );
      assert.ok(
        seen.every((x) => !/\{\w+\}/.test(x.text)),
        `cấp ${lvText}: không còn chỗ thay chưa điền` + at,
      );
      for (const [lv, id, name, re] of SPEAKERS)
        if (String(lv) === lvText) {
          const p = seen.find((x) => re.test(x.text));
          assert.ok(p, `cấp ${lv}: có trang ${re}` + at);
          assert.equal(p.who, name, `cấp ${lv}: trang ấy do ${name} nói` + at);
          assert.ok(p.cast.includes(id), `cấp ${lv}: tranh có ${id}` + at);
        }
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => !document.querySelector('dialog.gr-story'),
      );
    }
    assert.equal(await noOverflow(page), true, 'không tràn ngang' + at);
    assert.deepEqual(errors, [], 'không lỗi trang' + at);
    await context.close();
  }
  console.log('growth-quyen1-browser: ok');
} finally {
  await h.close();
}
