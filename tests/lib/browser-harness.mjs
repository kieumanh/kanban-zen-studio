// Bộ dựng dùng chung cho các test trình duyệt mới (từ v1.15.45): máy chủ cục bộ chạy Worker thật, Chromium, API giả lập có trạng thái.
// Các test cũ giữ bản sao riêng của đoạn này và không đổi.
import { createServer } from 'node:http';
import { flatten, inflate } from '../../dist/modules/delta.mjs';
import worker from '../../worker.mjs';
import { validWorkspace } from '../../server/api.mjs';

export const COLUMNS = ['Idea', 'List', 'Doing', 'Done'];
export const COLUMN_NAMES = { Idea: 'Ý tưởng', List: 'Việc cần làm', Doing: 'Đang thực hiện', Done: 'Hoàn thành' };

// Dự án mẫu hợp lệ với valid(): việc ở cột Hoàn thành thì checklist phải xong hết.
export const makeProject = (id, name, color, count, extra = {}) => ({
  id,
  name,
  description: 'Mô tả ngắn của dự án',
  color,
  icon: '✺',
  columns: COLUMNS,
  columnNames: COLUMN_NAMES,
  tasks: Array.from({ length: count }, (_, i) => ({
    id: id + 't' + i,
    title: 'Việc số ' + (i + 1),
    col: COLUMNS[i % 4],
    description: '',
    due: '2026-11-0' + (1 + (i % 8)),
    tag: 'Công việc',
    priority: 'q2',
    checks: id === 'p1' && i === 4 ? [{ id: 'c1', text: 'Bước một', done: true }, { id: 'c2', text: 'Bước hai', done: false }] : [],
  })),
  ...extra,
});

export const defaultSeed = () => ({
  schema: 1,
  projects: [makeProject('p1', 'Khóa tu mùa thu', '#7950c8', 14), makeProject('p2', 'Hương Thiền Nature — Website', '#c764a2', 5), makeProject('p3', 'Sổ nợ An Tâm', '#e78c56', 4)],
  notes: [],
});

export async function startHarness({ seed = defaultSeed, executablePath = process.env.CHROMIUM_PATH } = {}) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
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
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  // open: trả về { context, page, server: { workspace, revision } }; đổi server.workspace rồi gọi page.reload() để mô phỏng dữ liệu từ nơi khác.
  // v1.19.1: welcome=true bỏ việc đánh dấu sẵn "đã thấy lời chào" (để thử đúng luồng vào trang); now = giờ giả (Date/ISO) cài trước khi tải trang;
  // meDelay = độ trễ (ms) của /api/me; receiptsMode = 'ok' | 'fail' | 'hang' cho GET notification-receipts; receiptsSeed = các dấu đã đọc máy chủ đã có;
  // setup = hàm chạy trước khi tải trang.
  async function open(width, { touch = false, height = width <= 700 ? 844 : 900, colorScheme, contrast, forcedColors, workspace, welcome = false, now = null, meDelay = 0, receiptsMode = 'ok', receiptsSeed = [], setup = null } = {}) {
    const context = await browser.newContext({
      viewport: { width, height },
      timezoneId: 'Asia/Ho_Chi_Minh',
      ...(touch ? { hasTouch: true, isMobile: true } : {}),
      ...(colorScheme ? { colorScheme } : {}),
      ...(contrast ? { contrast } : {}),
      ...(forcedColors ? { forcedColors } : {}),
    });
    const page = await context.newPage();
    if (now) await page.clock.install({ time: new Date(now) });
    // state.mode: 'ok' | 'server500' | 'reject400' | 'conflict409' (kết quả của PUT/POST lưu dữ liệu).
    const state = { workspace: structuredClone(workspace || seed()), revision: 1, mode: 'ok', meDelay, receiptsMode, receiptsSeed, receipts: [] };
    // v2.13.1 (Lịch Chuẩn): bài cố định đồng hồ (now) phải đánh dấu lời chào theo ngày của đồng hồ ấy, không chỉ theo ngày thật;
    // nếu không, từ hai ngày sau mốc cố định, hộp thoại chào sẽ hiện ra và chặn mọi thao tác.
    const pinned = now ? new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : day;
    if (!welcome)
      await context.addInitScript(({ days }) => {
        for (const day of days) {
          const prev = new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
          for (const d of [day, prev]) for (let i = 0; i < 4; i++) localStorage.setItem('zen-welcome:qa:' + d + ':' + i, 'seen');
        }
      }, { days: [...new Set([day, pinned])] });
    await page.route('**/api/**', async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname.slice(5);
      let result = {};
      if (path === 'me') {
        if (state.meDelay) await new Promise((r) => setTimeout(r, state.meDelay));
        // welcome=true dùng giờ giả nhảy xa: phiên phải sống đủ lâu để không bị đăng xuất giữa chừng.
        result = { user: { id: 'qa', name: 'Kiểm tra', email: 'qa@example.test', session_expires: Date.now() + (welcome ? 30 * 86400000 : 600000) } };
      }
      else if (path === 'workspace' || path === 'workspace-v2') {
        if (req.method() === 'PUT' || req.method() === 'POST') {
          const status = { server500: 500, reject400: 400, conflict409: 409 }[state.mode];
          if (status) return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: 'Mô phỏng ' + state.mode }) });
          const b = req.postDataJSON();
          if (b.changes) {
            const entries = flatten(state.workspace);
            for (const c of b.changes) {
              if (c.value === null) delete entries[c.key];
              else entries[c.key] = c.value;
            }
            b.data = inflate(entries);
          }
          if (!validWorkspace(b.data)) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid workspace' }) });
          state.workspace = b.data;
          result = { revision: ++state.revision };
        } else result = { data: state.workspace, revision: state.revision };
      } else if (path === 'notification-receipts') {
        if (req.method() === 'PUT') {
          state.receipts.push(...(req.postDataJSON().keys || []));
          result = { ok: true };
        } else if (state.receiptsMode === 'fail') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Mô phỏng receipts 500"}' });
        else if (state.receiptsMode === 'hang') return new Promise(() => {});
        else result = { keys: state.receiptsSeed };
      }
      else if (path === 'activity') result = { expires: Date.now() + 600000 };
      else if (path === 'resources') result = { files: [], total: 0, used: 0, offset: 0 };
      else if (path === 'assets') result = { files: [], used: 0, quota: 1000000000 };
      else if (path === 'files') result = { files: [] };
      else if (path === 'report-shares') result = { shares: [] };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    });
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    // setup({ context, page, state }): chạy ngay trước khi tải trang (thêm route, init script...).
    if (setup) await setup({ context, page, state });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => typeof _WF !== 'undefined' && currentUser?.id === 'qa' && document.documentElement.dataset.zenReady === '1');
    return { context, page, server: state };
  }

  // Chuyển view rồi đợi tới khi tiêu đề của view đó thật sự hiện ra (không dựa vào độ trễ cố định).
  async function show(page, name, projectId = 'p1') {
    const ready = (name) => document.querySelector('#main h1') && view === name;
    await page.evaluate(([name, id]) => go(name, id), [name, projectId]);
    await page.waitForFunction(ready, name, { timeout: 10000 }).catch(async () => {
      await page.evaluate(([name, id]) => go(name, id), [name, projectId]);
      await page.waitForFunction(ready, name, { timeout: 10000 });
    });
  }

  return {
    browser,
    open,
    show,
    close: async () => {
      await browser.close();
      server.close();
    },
  };
}
