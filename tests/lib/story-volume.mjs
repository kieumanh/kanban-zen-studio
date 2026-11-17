// Khung kiểm dùng chung cho các quyển làm sâu cốt truyện (v2.28.0 trở đi): mỗi quyển dài thêm trang ngay trong các chương hiện có.
//  1. Dữ liệu: đúng số trang mỗi chương, mỗi trang đúng một dòng tranh, tình tiết mới có mặt đúng chương, các hạt giống nối nhau
//     qua chương (echoes), vẫn khai cuộc + 38 chương.
//  2. Tranh: mọi trang dựng được, chú thích đủ dài, không dòng tranh nào lặp trong chương; người nói của các trang mới được kiểm
//     có mặt trong tranh ở bước đọc (speakers). Trang kể chuyện xưa có thể minh họa điều được kể nên không bắt buộc người nói có mặt.
//  3. Khung đọc ở 390, 820, 1440 px: lật hết từng chương, đúng số trang, đúng người nói ở trang mới, bảng vừa màn hình,
//     không chỗ thay chưa điền, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './browser-harness.mjs';

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
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// half: số nửa điểm của sổ cái mẫu (đủ để mở mọi chương của quyển).
export async function runVolume({
  name,
  half,
  pages: PAGES,
  beats = [],
  speakers = [],
  echoes = [],
}) {
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
          p: [half, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    },
  });
  const h = await startHarness({ seed: seed() });
  try {
    // 1–2. Dữ liệu và tranh.
    {
      const { context, page } = await h.open(1440, { workspace: seed() });
      await h.show(page, 'growth');
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
            level: window.zenGrowth.levelOf?.(0) ?? null,
          };
          for (const c of C)
            out.text[c.lv] = c.pages.map((p) => p[2]).join('\n');
          for (const lv of Object.keys(PAGES)) {
            const c = C.find((x) => x.lv === +lv);
            const lines = window.zenPlates.LINES['t' + lv];
            out.pages[lv] = c.pages.length;
            out.lines[lv] = lines.length;
            const seen = new Set();
            c.pages.forEach((p, i) => {
              const shot = Z.shotFor('t' + lv, i, null);
              try {
                if (!Z.build(shot))
                  out.bad.push(lv + '.' + i + ': không dựng được');
              } catch (e) {
                out.bad.push(lv + '.' + i + ': ' + e.message);
              }
              if (!shot.alt || shot.alt.length < 20)
                out.bad.push(lv + '.' + i + ': chú thích tranh quá ngắn');
              if (seen.has(lines[i]))
                out.bad.push(lv + '.' + i + ': dòng tranh lặp');
              seen.add(lines[i]);
            });
          }
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
      for (const [lv, re] of beats)
        assert.match(d.text[lv], re, `chương cấp ${lv} có tình tiết ${re}`);
      for (const [[fromLv, fromRe], [toLv, toRe], why] of echoes) {
        assert.match(
          d.text[fromLv],
          fromRe,
          `${why}: chỗ gieo ở cấp ${fromLv}`,
        );
        assert.match(d.text[toLv], toRe, `${why}: chỗ nối ở cấp ${toLv}`);
      }
      assert.deepEqual(
        d.bad,
        [],
        'mọi trang dựng được, chú thích đủ dài, dòng tranh không lặp',
      );
      await context.close();
    }
    // 3. Khung đọc.
    for (const [width, touch] of [
      [390, true],
      [820, true],
      [1440, false],
    ]) {
      const at = ' (' + width + 'px)';
      const { context, page } = await h.open(width, {
        touch,
        workspace: seed(),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await h.show(page, 'growth');
      for (const [lvText, n] of Object.entries(PAGES)) {
        await page.click('[data-gr-story="' + lvText + '"]');
        await page.waitForSelector('dialog.gr-story[open]');
        const seen = [];
        for (let i = 0; i < 60; i++) {
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
        for (const [lv, id, who, re] of speakers)
          if (String(lv) === lvText) {
            const p = seen.find((x) => re.test(x.text));
            assert.ok(p, `cấp ${lv}: có trang ${re}` + at);
            assert.equal(p.who, who, `cấp ${lv}: trang ấy do ${who} nói` + at);
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
    console.log(name + ': ok');
  } finally {
    await h.close();
  }
}
