// Hồi quy v2.23.0 (Liên Mạch): Bát phương đồ là mạng lưới liên kết năng lực, không còn là tám chấm rời co cụm giữa tâm.
//  1. Tám chấm nối thành vòng kín bằng tám dải nối (gr-link), mỗi dải đi đúng từ chấm này sang chấm kề bên, tô chuyển màu giữa hai mạch.
//  2. Bên trong có đường nối chéo (gr-web) cho mọi cặp mạch không kề nhau mà cả hai đều có điểm; cặp có mạch 0 điểm thì không nối;
//     đường nối đậm và dày hơn khi mạch yếu hơn của cặp mạnh hơn.
//  3. Thang tự co giãn cho góc nhìn toàn cảnh: chấm cao nhất luôn ở ít nhất 70% bán kính; vòng ngoài ghi số tròn ≥ điểm cao nhất;
//     mạch 0 điểm nằm ở lõi (tách khỏi tâm), chấm xa tâm hơn khi điểm cao hơn.
//  4. Nhãn đọc vẫn đủ tám mạch, có thang và nói rõ là mạng lưới; mã gradient không trùng dù trang có nhiều Bát phương đồ.
//  5. Ở 390 (chạm), 820, 1440 px, Thiền và Giang hồ, sáng và tối: hình nằm gọn trong khung, chữ không bị cắt, không tràn ngang, không lỗi trang.
import assert from 'node:assert/strict';
import { startHarness } from './lib/browser-harness.mjs';

const day = (n) =>
  new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
// p là số nửa điểm của tám mạch (0,5 điểm mỗi đơn vị).
const ws = (p) => ({
  schema: 1,
  projects: [],
  notes: [],
  growth: {
    v: 1,
    hero: 'nu',
    name: 'Lam Y',
    since: day(-40),
    log: [{ id: 'e1', d: day(-1), s: 'task', k: 'task:e1', n: 'Việc cũ', p }],
  },
});
const CASES = {
  'lệch hẳn một mạch': [60, 3, 1, 0, 8, 2, 1, 4],
  'đều tay': [10, 14, 8, 12, 9, 11, 7, 13],
  'mới khởi đầu': [1, 0, 2, 1, 0, 1, 3, 1],
};

const read = (page) =>
  page.evaluate(() => {
    const svg = document.querySelector('#gr-radar svg.gr-radar');
    const num = (n, a) => parseFloat(n.getAttribute(a));
    const dots = [...svg.querySelectorAll('.gr-dot')].map((c) => [
      num(c, 'cx'),
      num(c, 'cy'),
    ]);
    const line = (l) => ({
      pair: l.dataset.pair,
      a: [num(l, 'x1'), num(l, 'y1')],
      b: [num(l, 'x2'), num(l, 'y2')],
      stroke: l.getAttribute('stroke'),
      cs: getComputedStyle(l),
      op: parseFloat(getComputedStyle(l).strokeOpacity),
      w: parseFloat(getComputedStyle(l).strokeWidth),
    });
    const links = [...svg.querySelectorAll('.gr-link')]
      .map(line)
      .map(({ cs, ...x }) => ({ ...x, paint: cs.stroke }));
    const webs = [...svg.querySelectorAll('.gr-web')]
      .map(line)
      .map(({ cs, ...x }) => ({ ...x, paint: cs.stroke }));
    const outer = svg
      .querySelector('.gr-ring-outer')
      .getAttribute('points')
      .split(' ')[0]
      .split(',')
      .map(Number);
    const ids = [...document.querySelectorAll('[id]')].map((n) => n.id);
    const panel = document
      .querySelector('.gr-radar-panel')
      .getBoundingClientRect();
    const texts = [...svg.querySelectorAll('text')].map((t) => {
      const r = t.getBoundingClientRect();
      return {
        t: t.textContent,
        inside:
          r.left >= panel.left - 0.5 &&
          r.right <= panel.right + 0.5 &&
          r.top >= panel.top - 0.5 &&
          r.bottom <= panel.bottom + 0.5,
      };
    });
    return {
      dots,
      links,
      webs,
      center: [200, 192],
      R: Math.hypot(outer[0] - 200, outer[1] - 192),
      ringVals: [...svg.querySelectorAll('.gr-ring-val')].map(
        (t) => t.textContent,
      ),
      values: [...svg.querySelectorAll('.gr-value')].map((t) => t.textContent),
      label: svg.getAttribute('aria-label'),
      dupIds: ids.filter((v, i) => ids.indexOf(v) !== i),
      gradients: [...svg.querySelectorAll('linearGradient')].length,
      texts,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });

const vn = (v) => String(v).replace('.', ',');
const h = await startHarness({ seed: () => ws(CASES['đều tay']) });
try {
  for (const [name, p] of Object.entries(CASES)) {
    const vals = p.map((x) => x / 2);
    const max = Math.max(...vals);
    const { context, page } = await h.open(1440, { workspace: ws(p) });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await h.show(page, 'growth');
    await page.waitForSelector('#gr-radar svg.gr-radar');
    const m = await read(page);
    const t = `[${name}]`;
    const dist = m.dots.map(([x, y]) =>
      Math.hypot(x - m.center[0], y - m.center[1]),
    );
    const same = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]) <= 0.15;

    assert.equal(m.dots.length, 8, `${t} đủ tám chấm`);
    assert.deepEqual(
      m.values,
      vals.map(vn),
      `${t} giá trị tám mạch giữ nguyên`,
    );
    // 1. Vòng kín.
    assert.equal(m.links.length, 8, `${t} tám dải nối vòng quanh`);
    m.links.forEach((l, i) => {
      const j = (i + 1) % 8;
      assert.equal(
        l.pair,
        `${i}-${j}`,
        `${t} dải ${i} nối mạch ${i} với mạch kề ${j}`,
      );
      assert.ok(
        same(l.a, m.dots[i]) && same(l.b, m.dots[j]),
        `${t} dải ${i} đi đúng từ chấm ${i} tới chấm ${j}`,
      );
      assert.match(
        l.stroke,
        /^url\(#.+\)$/,
        `${t} dải ${i} tô chuyển màu giữa hai mạch`,
      );
      assert.match(
        l.paint,
        /url\(/,
        `${t} dải ${i} hiện màu chuyển, không bị giao diện xóa nét`,
      );
    });
    assert.equal(m.gradients, 8, `${t} tám dải chuyển màu`);
    // 2. Đường nối chéo.
    const want = [];
    for (let i = 0; i < 8; i++)
      for (let j = i + 2; j < 8; j++)
        if (!(i === 0 && j === 7) && Math.min(vals[i], vals[j]) > 0)
          want.push(`${i}-${j}`);
    assert.deepEqual(
      m.webs.map((w) => w.pair).sort(),
      want.sort(),
      `${t} đường nối chéo đúng các cặp không kề nhau mà cả hai đều có điểm`,
    );
    for (const w of m.webs) {
      const [i, j] = w.pair.split('-').map(Number);
      assert.ok(
        same(w.a, m.dots[i]) && same(w.b, m.dots[j]),
        `${t} đường nối ${w.pair} đi đúng giữa hai chấm`,
      );
      assert.notEqual(w.paint, 'none', `${t} đường nối ${w.pair} có màu`);
    }
    const strength = (w) => Math.min(...w.pair.split('-').map((k) => vals[+k]));
    for (const a of m.webs)
      for (const b of m.webs)
        if (strength(a) > strength(b))
          assert.ok(
            a.op > b.op && a.w > b.w,
            `${t} cặp ${a.pair} mạnh hơn cặp ${b.pair} nên đậm và dày hơn`,
          );
    // 3. Thang toàn cảnh.
    const top = dist[vals.indexOf(max)];
    assert.ok(
      top >= 0.7 * m.R - 0.5,
      `${t} chấm cao nhất ở ít nhất 70% bán kính (${(top / m.R).toFixed(2)})`,
    );
    assert.ok(top <= m.R + 0.5, `${t} chấm cao nhất không vượt vòng ngoài`);
    const outer = Number(
      m.ringVals[m.ringVals.length - 1].replace(/\./g, '').replace(',', '.'),
    );
    assert.ok(
      outer >= max && outer <= Math.max(2, max * 2),
      `${t} vòng ngoài là số tròn ≥ điểm cao nhất và không quá gấp đôi (${outer} cho ${max})`,
    );
    assert.equal(m.ringVals.length, 2, `${t} ghi số ở vòng giữa và vòng ngoài`);
    for (let i = 0; i < 8; i++) {
      if (vals[i] === 0)
        assert.ok(
          dist[i] >= 12,
          `${t} mạch ${i} có 0 điểm nằm ở lõi, tách khỏi tâm (${dist[i].toFixed(1)})`,
        );
      for (let j = 0; j < 8; j++)
        if (vals[i] > vals[j])
          assert.ok(
            dist[i] > dist[j],
            `${t} mạch ${i} nhiều điểm hơn mạch ${j} nên xa tâm hơn`,
          );
    }
    // Mạch yếu không còn dồn cục ở tâm: ở trường hợp lệch hẳn một mạch, mạch có điểm nhỏ nhất vẫn cách tâm ≥ 20% bán kính.
    const minPos = Math.min(...vals.filter((v) => v > 0));
    assert.ok(
      dist[vals.indexOf(minPos)] >= 0.2 * m.R,
      `${t} mạch yếu nhất có điểm vẫn tách xa tâm (${(dist[vals.indexOf(minPos)] / m.R).toFixed(2)} bán kính)`,
    );
    // 4. Nhãn đọc và mã không trùng.
    assert.match(
      m.label,
      /^Bát phương đồ 8 mạch: /,
      `${t} nhãn đọc mở đầu đúng`,
    );
    for (const v of vals)
      assert.ok(m.label.includes(vn(v)), `${t} nhãn đọc có giá trị ${v}`);
    assert.match(m.label, /Thang tối đa .+ điểm/, `${t} nhãn đọc nêu thang`);
    assert.match(m.label, /mạng lưới/, `${t} nhãn đọc nói rõ là mạng lưới`);
    assert.deepEqual(m.dupIds, [], `${t} không trùng mã id trên trang`);
    // Báo cáo tiến độ cũng vẽ Bát phương đồ: mã gradient vẫn không trùng.
    await page.click('[data-gr-report]').catch(() => {});
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const ids = [
        ...document.querySelectorAll('.gr-radar linearGradient'),
      ].map((g) => g.id);
      return {
        n: document.querySelectorAll('.gr-radar').length,
        dup: ids.filter((v, i) => ids.indexOf(v) !== i),
      };
    });
    assert.deepEqual(
      after.dup,
      [],
      `${t} xem báo cáo: mã gradient không trùng (${after.n} hình)`,
    );
    assert.deepEqual(errors, [], `${t} không lỗi trang`);
    await context.close();
  }

  // 5. Ba khổ, hai phong cách, sáng và tối.
  for (const style of ['zen', 'giangho']) {
    for (const scheme of ['light', 'dark']) {
      for (const [width, touch] of [
        [390, true],
        [820, false],
        [1440, false],
      ]) {
        const tag = `[${style} ${scheme} ${width}px]`;
        const { context, page } = await h.open(width, {
          touch,
          colorScheme: scheme,
          workspace: ws(CASES['lệch hẳn một mạch']),
          setup: async ({ context }) =>
            context.addInitScript(
              (s) => localStorage.setItem('zen-style', s),
              style,
            ),
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await h.show(page, 'growth');
        await page.waitForSelector('#gr-radar svg.gr-radar');
        const m = await read(page);
        assert.deepEqual(
          m.texts.filter((x) => !x.inside).map((x) => x.t),
          [],
          `${tag} chữ của Bát phương đồ không bị cắt khỏi khung`,
        );
        assert.ok(m.overflow <= 0, `${tag} không tràn ngang`);
        assert.ok(
          m.links.every((l) => /url\(/.test(l.paint)) &&
            m.webs.every((w) => w.paint !== 'none'),
          `${tag} dải nối và đường nối hiện màu`,
        );
        assert.deepEqual(errors, [], `${tag} không lỗi trang`);
        await context.close();
      }
    }
  }
  console.log('growth-network-browser: ok');
} finally {
  await h.close();
}
