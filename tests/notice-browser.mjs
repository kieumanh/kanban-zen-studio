// Hồi quy v1.15.43: một kênh nhắc việc đến hạn (thanh nhắc hạn + thông báo nổi + chuông). Ở 390px (cảm ứng) / 820px (cảm ứng) / 1440px:
//  1. mở app có việc quá hạn: thanh nhắc hạn hiện đủ số, KHÔNG có thông báo nổi "Nhắc tiến độ" lặp lại cùng tin (trước đây hiện ngay khi mở và lặp mỗi giờ);
//  2. số trên chuông bằng đúng số việc ở thanh nhắc (quá hạn + đến hạn trong 3 ngày) ở mọi thời điểm: sau khi đọc phiên bản mới, sau khi sửa việc, sau khi đồng bộ từ nơi khác, khi ẩn thanh nhắc 30 phút, khi tắt nhắc hạn;
//     mục khác (phiên bản mới) không cộng vào số mà báo bằng chấm; nhãn đọc-được nêu cả hai; "Xác nhận đã đọc tất cả" đưa chấm, thanh nhắc, số trên chuông và danh sách về không cùng lúc, việc mới sau đó lại hiện ở cả hai và báo nổi;
//  3. hộp thoại Thông báo mở đầu bằng dòng tóm tắt cộng ra đúng số trên chuông, nêu mục khác và số việc quan trọng chưa tới hạn (không tính vào số);
//  4. thông báo nổi chỉ khi có việc MỚI vào danh sách do thay đổi đến từ nơi khác (thiết bị khác đồng bộ về); việc do chính người dùng vừa sửa trên máy này không báo.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { flatten, inflate } from '../dist/modules/delta.mjs';
import worker from '../worker.mjs';
import { validWorkspace } from '../server/api.mjs';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const server = createServer(async (req, res) => {
  try {
    const r = await worker.fetch(new Request('http://localhost' + req.url));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.writeHead(500);
    res.end(e.message);
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const day = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
});
const shift = (n) =>
  new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
const task = (id, title, due, extra = {}) => ({
  id,
  title,
  col: 'List',
  description: '',
  due,
  tag: 'Công việc',
  priority: '',
  labels: [],
  checks: [],
  ...extra,
});
const makeSeed = () => ({
  schema: 1,
  projects: [
    {
      id: 'p1',
      name: 'Khóa tu mùa thu',
      description: 'Mô tả ngắn của dự án',
      color: '#7950c8',
      icon: '✺',
      columns: ['Idea', 'List', 'Doing', 'Done'],
      columnNames: {
        Idea: 'Ý tưởng',
        List: 'Việc cần làm',
        Doing: 'Đang thực hiện',
        Done: 'Hoàn thành',
      },
      keywords: [],
      tasks: [
        task('t1', 'Việc quá hạn một', shift(-4)),
        task('t2', 'Việc quá hạn hai', shift(-2)),
        task('t3', 'Việc quá hạn ba', shift(-1)),
        task('t4', 'Việc đến hạn một', shift(1)),
        task('t5', 'Việc đến hạn hai', shift(3)),
        task('t6', 'Việc còn xa', shift(5)),
        task('t7', 'Việc quan trọng chưa tới hạn', shift(30), {
          priority: 'q1',
        }),
        task('t8', 'Việc đã xong quá hạn', shift(-6), { col: 'Done' }),
      ],
    },
  ],
});
async function open(width, touch = false) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  const page = await context.newPage();
  let workspace = makeSeed(),
    revision = 1;
  await context.addInitScript(
    ({ day }) => {
      const prev = new Date(Date.parse(day + 'T00:00:00Z') - 86400000)
        .toISOString()
        .slice(0, 10);
      for (const d of [day, prev])
        for (let i = 0; i < 4; i++)
          localStorage.setItem('zen-welcome:qa:' + d + ':' + i, 'seen');
    },
    { day },
  );
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.slice(5);
    let result = {};
    if (path === 'me')
      result = {
        user: {
          id: 'qa',
          name: 'Kiểm tra',
          email: 'qa@example.test',
          session_expires: Date.now() + 600000,
        },
      };
    else if (path === 'workspace' || path === 'workspace-v2') {
      if (req.method() === 'PUT' || req.method() === 'POST') {
        const b = req.postDataJSON();
        if (b.changes) {
          const entries = flatten(workspace);
          for (const c of b.changes) {
            if (c.value === null) delete entries[c.key];
            else entries[c.key] = c.value;
          }
          b.data = inflate(entries);
        }
        if (!validWorkspace(b.data))
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid workspace' }),
          });
        workspace = b.data;
        result = { revision: ++revision };
      } else result = { data: workspace, revision };
    } else if (path === 'notification-receipts')
      result = req.method() === 'PUT' ? { ok: true } : { keys: [] };
    else if (path === 'activity') result = { expires: Date.now() + 600000 };
    else if (path === 'resources')
      result = { files: [], total: 0, used: 0, offset: 0 };
    else if (path === 'assets')
      result = { files: [], used: 0, quota: 1000000000 };
    else if (path === 'files') result = { files: [] };
    else if (path === 'report-shares') result = { shares: [] };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.waitForFunction(
    () => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1',
  );
  return { context, page };
}

async function show(page, name) {
  const ready = (name) => document.querySelector('#main h1') && view === name;
  await page.evaluate((name) => go(name, 'p1'), name);
  await page
    .waitForFunction(ready, name, { timeout: 10000 })
    .catch(async () => {
      await page.evaluate((name) => go(name, 'p1'), name);
      await page.waitForFunction(ready, name, { timeout: 10000 });
    });
  await page.waitForTimeout(250);
}

// Trạng thái các kênh tại một thời điểm.
const channels = (page) =>
  page.evaluate(() => {
    const strip =
      document.querySelector('#due-alert-strip strong')?.textContent.trim() ||
      '';
    const m = strip.match(
      /^(\d+) việc quá hạn · (\d+) việc đến hạn trong 3 ngày$/,
    );
    const toast =
      document.querySelector('#toast.show')?.textContent.trim() || '';
    const badge =
      document
        .querySelector('#notifications-button .notification-count')
        ?.textContent.trim() || '';
    return {
      strip,
      late: m ? +m[1] : null,
      soon: m ? +m[2] : null,
      toast,
      badge: badge === '' ? 0 : +badge,
      dot: !!document.querySelector(
        '#notifications-button .notification-extra',
      ),
      aria: document
        .querySelector('#notifications-button')
        .getAttribute('aria-label'),
    };
  });

const problems = [];
const fail = (cfg, step, msg) =>
  problems.push(`${cfg.w}px${cfg.touch ? ' cảm ứng' : ''} · ${step}: ${msg}`);
const bannerTotal = (c) => (c.late ?? 0) + (c.soon ?? 0);

for (const cfg of [
  { w: 390, touch: true },
  { w: 820, touch: true },
  { w: 1440, touch: false },
]) {
  const { context, page } = await open(cfg.w, cfg.touch);
  await show(page, 'dashboard');
  await page.waitForTimeout(1500);

  // 1. mở app
  let c = await channels(page);
  if (c.late !== 3 || c.soon !== 2)
    fail(
      cfg,
      'mở app',
      `thanh nhắc phải ghi 3 quá hạn · 2 đến hạn, được "${c.strip}"`,
    );
  if (c.toast)
    fail(
      cfg,
      'mở app',
      `không được có thông báo nổi nhắc lại tin của thanh nhắc, thấy "${c.toast}"`,
    );

  // 2. số trên chuông = số ở thanh nhắc; phiên bản mới báo bằng chấm
  if (c.badge !== bannerTotal(c))
    fail(
      cfg,
      'mở app',
      `số trên chuông ${c.badge} khác số ở thanh nhắc ${bannerTotal(c)}`,
    );
  if (!c.dot)
    fail(
      cfg,
      'mở app',
      'phiên bản mới chưa đọc phải báo bằng chấm cạnh chuông',
    );
  if (
    !/^Thông báo · 5 việc cần chú ý \(3 quá hạn, 2 đến hạn trong 3 ngày\); ngoài ra có phiên bản mới$/.test(
      c.aria,
    )
  )
    fail(cfg, 'mở app', `nhãn đọc-được của chuông sai: "${c.aria}"`);

  // 3. hộp thoại Thông báo
  await page.locator('#notifications-button').click();
  await page
    .waitForSelector('#editor[open] .notice-summary', { timeout: 5000 })
    .catch(() => {});
  const dlg = await page.evaluate(() => {
    const s = document.querySelector('#editor .notice-summary');
    return {
      text: s?.textContent.trim(),
      role: s?.getAttribute('role'),
      size: s && parseFloat(getComputedStyle(s).fontSize),
      items: document.querySelectorAll('#editor .notice-item').length,
      summaries: document.querySelectorAll('#editor .notice-summary').length,
    };
  });
  if (!dlg.text)
    fail(cfg, 'hộp thoại', 'thiếu dòng tóm tắt đầu hộp thoại Thông báo');
  else {
    if (
      !dlg.text.startsWith(
        '5 việc cần chú ý: 3 quá hạn · 2 đến hạn trong 3 ngày.',
      )
    )
      fail(
        cfg,
        'hộp thoại',
        `tóm tắt không cộng ra số trên chuông: "${dlg.text}"`,
      );
    if (!dlg.text.includes('Ngoài ra: có phiên bản mới'))
      fail(cfg, 'hộp thoại', 'tóm tắt không nêu phiên bản mới');
    if (
      !/Còn 1 việc quan trọng chưa tới hạn .*không tính vào số trên chuông/.test(
        dlg.text,
      )
    )
      fail(
        cfg,
        'hộp thoại',
        'tóm tắt không nêu việc quan trọng không tính vào số',
      );
    if (dlg.role !== 'status' || dlg.size < 12)
      fail(
        cfg,
        'hộp thoại',
        `tóm tắt cần role=status và cỡ chữ ≥12px (${dlg.role}, ${dlg.size}px)`,
      );
  }
  if (dlg.items !== 7)
    fail(
      cfg,
      'hộp thoại',
      `danh sách phải còn đủ 7 mục (5 việc + 1 phiên bản + 1 việc quan trọng), thấy ${dlg.items}`,
    );
  if (dlg.summaries !== 1)
    fail(cfg, 'hộp thoại', `chỉ một dòng tóm tắt, thấy ${dlg.summaries}`);
  await page.evaluate(() => document.querySelector('#editor').close());
  await page.waitForTimeout(200);
  c = await channels(page);
  if (c.badge !== 5)
    fail(
      cfg,
      'sau khi xem hộp thoại',
      `xem hộp thoại không được làm số trên chuông đổi (${c.badge}) khi việc vẫn còn quá hạn`,
    );

  // render nhiều lần (như mở lại màn hình, mỗi phút): không có thông báo nổi vì không có gì mới
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => render());
    await page.waitForTimeout(150);
  }
  c = await channels(page);
  if (c.toast)
    fail(
      cfg,
      'vẽ lại',
      `không có việc mới thì không được báo nổi, thấy "${c.toast}"`,
    );

  // 4a. người dùng tự sửa: thêm việc quá hạn → thanh nhắc và chuông tăng, không báo nổi
  await page.evaluate((due) => {
    project('p1').tasks.push({
      id: 'tnew',
      title: 'Việc tôi vừa thêm',
      col: 'List',
      description: '',
      due,
      tag: 'Công việc',
      priority: '',
      labels: [],
      checks: [],
    });
    save();
    render();
  }, shift(-3));
  await page.waitForTimeout(400);
  c = await channels(page);
  if (c.late !== 4 || c.badge !== 6 || c.badge !== bannerTotal(c))
    fail(
      cfg,
      'tự sửa',
      `sau khi thêm việc quá hạn, thanh nhắc 4 + 2 và chuông 6; thấy "${c.strip}" / ${c.badge}`,
    );
  if (c.toast)
    fail(
      cfg,
      'tự sửa',
      `việc do chính người dùng vừa thêm không được báo nổi, thấy "${c.toast}"`,
    );

  // 4b. thay đổi đến từ nơi khác (thiết bị khác đồng bộ về: dữ liệu đổi mà không qua save() trên máy này): việc còn xa thành đến hạn → báo nổi đúng tin mới
  await page.waitForTimeout(3200);
  await page.evaluate((due) => {
    project('p1').tasks.find((t) => t.id === 't6').due = due;
    render();
  }, shift(1));
  await page.waitForTimeout(400);
  c = await channels(page);
  if (!/^Có thêm 1 việc đến hạn: Việc còn xa\.$/.test(c.toast))
    fail(
      cfg,
      'từ nơi khác',
      `phải báo "Có thêm 1 việc đến hạn: Việc còn xa.", thấy "${c.toast}"`,
    );
  if (/Nhắc tiến độ/.test(c.toast))
    fail(cfg, 'từ nơi khác', 'còn dùng chữ "Nhắc tiến độ" lặp lại');
  if (c.badge !== bannerTotal(c) || c.badge !== 7)
    fail(
      cfg,
      'từ nơi khác',
      `chuông ${c.badge} phải bằng thanh nhắc ${bannerTotal(c)} (7: ${c.strip})`,
    );

  // 5. ẩn thanh nhắc 30 phút: chuông giữ số
  await page.evaluate(() =>
    document.querySelector('#toast').classList.remove('show'),
  );
  await page.locator('[data-snooze-due]').click();
  await page.waitForTimeout(200);
  c = await channels(page);
  if (c.strip) fail(cfg, 'ẩn 30 phút', 'thanh nhắc phải ẩn');
  if (c.badge !== 7)
    fail(
      cfg,
      'ẩn 30 phút',
      `chuông vẫn phải ghi 7 việc cần chú ý, thấy ${c.badge}`,
    );

  // 6. tắt nhắc hạn trong ứng dụng: không thanh nhắc, không báo nổi, chuông vẫn đếm
  await page.evaluate(() => {
    currentUser.repeat_alerts = 0;
    render();
  });
  await page.waitForTimeout(300);
  c = await channels(page);
  if (c.strip || c.toast)
    fail(
      cfg,
      'tắt nhắc hạn',
      `tắt thì không thanh nhắc, không báo nổi (thấy "${c.strip}" / "${c.toast}")`,
    );
  if (c.badge !== 7)
    fail(cfg, 'tắt nhắc hạn', `chuông vẫn đếm 7, thấy ${c.badge}`);

  // 7. bật lại nhắc hạn, bỏ mốc ẩn, rồi "Xác nhận đã đọc tất cả": chấm, thanh nhắc, số trên chuông và danh sách về không CÙNG LÚC (không để thanh nhắc mất mà chuông còn số hay ngược lại)
  await page.evaluate(() => {
    currentUser.repeat_alerts = 1;
    localWrite('zen-alert-snooze:' + currentUser.id, '0');
    render();
    refreshBell();
  });
  await page.waitForTimeout(300);
  c = await channels(page);
  if (c.badge !== 7 || bannerTotal(c) !== 7 || !c.dot)
    fail(
      cfg,
      'đã đọc tất cả',
      `trước khi xác nhận: thanh nhắc 7, chuông 7 và chấm phiên bản mới (thấy "${c.strip}" / ${c.badge} / chấm ${c.dot})`,
    );
  await page.locator('#notifications-button').click();
  await page
    .waitForSelector('#editor[open] #clear-file-alerts', { timeout: 5000 })
    .catch(() => {});
  await page.locator('#clear-file-alerts').click();
  await page.waitForTimeout(500);
  c = await channels(page);
  if (c.dot)
    fail(cfg, 'đã đọc tất cả', 'chấm phải mất sau khi xác nhận đã đọc');
  if (c.strip || c.badge !== 0)
    fail(
      cfg,
      'đã đọc tất cả',
      `thanh nhắc và chuông phải cùng về không (thấy "${c.strip}" / ${c.badge})`,
    );
  if (!/^Thông báo · không có việc quá hạn hay đến hạn$/.test(c.aria))
    fail(cfg, 'đã đọc tất cả', `nhãn đọc-được: "${c.aria}"`);
  await page.locator('#notifications-button').click();
  await page
    .waitForSelector('#editor[open] .notice-summary', { timeout: 5000 })
    .catch(() => {});
  const again = await page.evaluate(() => ({
    text: document.querySelector('#editor .notice-summary')?.textContent.trim(),
    due: document.querySelectorAll('#editor .notice-item[data-task]').length,
  }));
  if (again.due !== 0 || again.text !== 'Không có việc quá hạn hay đến hạn.')
    fail(
      cfg,
      'đã đọc tất cả',
      `hộp thoại sau khi đọc: ${again.due} việc, tóm tắt "${again.text}"`,
    );
  await page.evaluate(() => document.querySelector('#editor').close());
  await page.waitForTimeout(3200);
  // việc mới quá hạn đến từ nơi khác sau khi đã xác nhận: thanh nhắc, chuông và thông báo nổi cùng báo đúng 1 việc mới (không báo lại cả danh sách đã xác nhận)
  await page.evaluate((due) => {
    project('p1').tasks.push({
      id: 'tafter',
      title: 'Việc mới sau khi xác nhận',
      col: 'List',
      description: '',
      due,
      tag: 'Công việc',
      priority: '',
      labels: [],
      checks: [],
    });
    render();
  }, shift(-1));
  await page.waitForTimeout(400);
  c = await channels(page);
  if (c.late !== 1 || c.soon !== 0 || c.badge !== 1)
    fail(
      cfg,
      'việc mới sau khi đọc',
      `thanh nhắc "1 quá hạn · 0 đến hạn" và chuông 1, thấy "${c.strip}" / ${c.badge}`,
    );
  if (!/^Có thêm 1 việc quá hạn: Việc mới sau khi xác nhận\.$/.test(c.toast))
    fail(
      cfg,
      'việc mới sau khi đọc',
      `phải báo đúng 1 việc mới, thấy "${c.toast}"`,
    );

  // chuông không ngoại lệ khi hết việc đến hạn
  await page.evaluate(() => {
    currentUser.repeat_alerts = 1;
    project('p1').tasks.forEach((t) => (t.col = 'Done'));
    render();
    refreshBell();
  });
  await page.waitForTimeout(300);
  c = await channels(page);
  if (
    c.badge !== 0 ||
    !/^Thông báo · không có việc quá hạn hay đến hạn/.test(c.aria)
  )
    fail(
      cfg,
      'hết việc',
      `hết việc đến hạn thì chuông không có số, nhãn "${c.aria}", số ${c.badge}`,
    );

  console.log(
    `${problems.some((p) => p.startsWith(cfg.w + 'px')) ? 'FAIL' : 'PASS'} kênh nhắc việc ở ${cfg.w}px${cfg.touch ? ' cảm ứng' : ''}`,
  );
  await context.close();
}
await browser.close();
server.close();
if (problems.length) {
  console.error('\nKênh nhắc việc chưa đạt:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(
  '\nPASS một kênh nhắc việc: thanh nhắc là nguồn chính, chuông cùng số, thông báo nổi chỉ khi có việc mới',
);
