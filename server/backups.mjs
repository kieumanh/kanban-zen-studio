// v2.55.0 (Sao Lưu Hằng Tuần): bản sao dữ liệu làm việc của từng tài khoản trong kho R2 (`FILES`), có thể khôi phục theo ngày.
// Không dùng bảng mới: bản sao là đối tượng R2 `backups/<mã người dùng>/<mã bản>.json.gz`; việc “tuần này đã sao lưu chưa” ghi vào bảng `deliveries`
// sẵn có (kênh `backup`, ngày = Chủ nhật hôm đó). Mọi cài đặt đều có mặc định an toàn khi thiếu biến môi trường.
//  - Tự động: mỗi Chủ nhật 02:00–05:59 giờ Việt Nam, mỗi nhịp cron (5 phút) làm một lô nhỏ; tài khoản chưa đổi gì từ bản tự động trước thì bỏ qua (không đẩy bản cũ ra khỏi danh sách).
//  - Thủ công / trước khi khôi phục: người dùng yêu cầu qua API; có giới hạn tần suất.
//  - Giữ: BACKUP_KEEP bản tự động (mặc định 8), BACKUP_KEEP_USER bản thủ công và BACKUP_KEEP_USER bản “trước khi khôi phục” (mặc định 5 mỗi loại).
//  - BACKUP_ENABLED=0 / false / off tắt riêng việc sao lưu tự động.
// Bản sao chỉ chứa dữ liệu làm việc (việc, ghi chú, việc hằng ngày, thu chi…), không chứa tệp đính kèm.
import { workspaceRow } from './workspace-store.mjs';
import { json, fail, body, limited } from './api.mjs';

export const BACKUP_HOURS = [2, 3, 4, 5];
const BATCH = 10;
const BYTE_BUDGET = 12000000;
const LIST_PAGES = 5;
const KINDS = ['auto', 'manual', 'restore'];
const ID = /^(\d{4}-\d{2}-\d{2})(?:T(\d{6}))?-(auto|manual|restore)$/;
export const backupPrefix = (userId) => 'backups/' + userId + '/';
const keyOf = (userId, id) => backupPrefix(userId) + id + '.json.gz';

export function backupConfig(env = {}) {
  const num = (value, fallback, low, high) => {
    const n = Number.parseInt(value, 10);
    return Number.isInteger(n) && n >= low && n <= high ? n : fallback;
  };
  return {
    enabled: !/^(0|false|off|no)$/i.test(
      String(env.BACKUP_ENABLED ?? '').trim(),
    ),
    keepAuto: num(env.BACKUP_KEEP, 8, 1, 52),
    keepOther: num(env.BACKUP_KEEP_USER, 5, 1, 20),
  };
}

async function gzip(text) {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gunzip(buffer) {
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}
const vnDate = (now) =>
  new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const vnClock = (now) =>
  new Date(now.getTime() + 7 * 3600000)
    .toISOString()
    .slice(11, 19)
    .replaceAll(':', '');

export async function listBackups(env, userId) {
  const out = [];
  let cursor;
  for (let page = 0; page < LIST_PAGES; page++) {
    const result = await env.FILES.list({
      prefix: backupPrefix(userId),
      limit: 200,
      cursor,
      include: ['customMetadata'],
    });
    for (const object of result.objects || []) {
      const id = object.key
        .slice(backupPrefix(userId).length)
        .replace(/\.json\.gz$/, '');
      const match = ID.exec(id);
      if (!match || object.key !== keyOf(userId, id)) continue;
      const meta = object.customMetadata || {};
      out.push({
        id,
        kind: match[3],
        createdAt:
          meta.createdAt ||
          (object.uploaded ? new Date(object.uploaded).toISOString() : ''),
        revision: Number(meta.revision) || 0,
        size: Number(object.size) || 0,
        projects: Number(meta.projects) || 0,
        tasks: Number(meta.tasks) || 0,
        notes: Number(meta.notes) || 0,
      });
    }
    if (!result.truncated) break;
    cursor = result.cursor;
  }
  return out.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
}

async function prune(env, userId, kind, config) {
  const keep = kind === 'auto' ? config.keepAuto : config.keepOther;
  const same = (await listBackups(env, userId)).filter(
    (item) => item.kind === kind,
  );
  for (const old of same.slice(keep))
    await env.FILES.delete(keyOf(userId, old.id));
}

// Ghi một bản sao của dữ liệu hiện tại. Trả về mô tả bản vừa ghi, hoặc null nếu tài khoản chưa có dữ liệu.
export async function writeBackup(
  env,
  userId,
  kind,
  now = new Date(),
  config = backupConfig(env),
) {
  if (!KINDS.includes(kind)) throw new Error('Loại bản sao không hợp lệ.');
  const row = await workspaceRow(env.DB, userId);
  if (!row?.data) return null;
  const parsed = JSON.parse(row.data);
  const createdAt = now.toISOString();
  const id =
    kind === 'auto'
      ? vnDate(now) + '-auto'
      : vnDate(now) + 'T' + vnClock(now) + '-' + kind;
  const text =
    '{"format":"zen-backup","v":1,"kind":' +
    JSON.stringify(kind) +
    ',"createdAt":' +
    JSON.stringify(createdAt) +
    ',"revision":' +
    (Number(row.revision) || 0) +
    ',"data":' +
    row.data +
    '}';
  const bytes = await gzip(text);
  const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const meta = {
    kind,
    createdAt,
    revision: String(Number(row.revision) || 0),
    projects: String(projects.length),
    tasks: String(
      projects.reduce(
        (n, p) => n + (Array.isArray(p?.tasks) ? p.tasks.length : 0),
        0,
      ),
    ),
    notes: String(Array.isArray(parsed.notes) ? parsed.notes.length : 0),
    raw: String(text.length),
  };
  await env.FILES.put(keyOf(userId, id), bytes, {
    httpMetadata: { contentType: 'application/gzip' },
    customMetadata: meta,
  });
  await prune(env, userId, kind, config);
  return {
    id,
    kind,
    createdAt,
    revision: Number(meta.revision),
    size: bytes.length,
    projects: Number(meta.projects),
    tasks: Number(meta.tasks),
    notes: Number(meta.notes),
    raw: text.length,
  };
}

export async function readBackup(env, userId, id) {
  if (!ID.test(id)) fail('Mã bản sao không hợp lệ.', 400);
  const object = await env.FILES.get(keyOf(userId, id));
  if (!object) fail('Không tìm thấy bản sao này.', 404);
  let parsed;
  try {
    parsed = JSON.parse(await gunzip(await object.arrayBuffer()));
  } catch {
    fail('Bản sao bị hỏng, không đọc được.', 422);
  }
  if (
    parsed?.format !== 'zen-backup' ||
    parsed.v !== 1 ||
    !parsed.data ||
    typeof parsed.data !== 'object'
  )
    fail('Bản sao không đúng định dạng.', 422);
  return {
    id,
    kind: ID.exec(id)[3],
    createdAt: String(parsed.createdAt || ''),
    revision: Number(parsed.revision) || 0,
    data: parsed.data,
  };
}

async function currentRevision(db, userId) {
  const v2 = await db
    .prepare('SELECT revision FROM workspace_state WHERE user_id=?')
    .bind(userId)
    .first();
  if (v2) return Number(v2.revision);
  const old = await db
    .prepare('SELECT revision FROM workspaces WHERE user_id=?')
    .bind(userId)
    .first();
  return old ? Number(old.revision) : null;
}
const markDelivery = (db, userId, day, status) =>
  db
    .prepare(
      "INSERT INTO deliveries(user_id,day,channel,status) VALUES(?,?,'backup',?) ON CONFLICT(user_id,day,channel) DO UPDATE SET status=excluded.status",
    )
    .bind(userId, day, status)
    .run();

// Gọi từ nhịp cron 5 phút. `window` = { day, hour, weekday } theo giờ Việt Nam. Ngoài khung Chủ nhật 02:00–05:59 thì không làm gì.
export async function weeklyBackup(env, now, window) {
  const config = backupConfig(env);
  if (!config.enabled || !env.FILES) return { skipped: 'off' };
  if (window.weekday !== 0 || !BACKUP_HOURS.includes(window.hour))
    return { skipped: 'window' };
  const db = env.DB;
  const users = (
    await db
      .prepare(
        "SELECT u.id FROM users u WHERE u.verified=1 AND (EXISTS(SELECT 1 FROM workspace_state s WHERE s.user_id=u.id) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.user_id=u.id)) AND NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.user_id=u.id AND d.day=? AND d.channel='backup' AND d.status='sent') ORDER BY EXISTS(SELECT 1 FROM deliveries f WHERE f.user_id=u.id AND f.day=? AND f.channel='backup' AND f.status='failed'),u.id LIMIT ?",
      )
      .bind(window.day, window.day, BATCH)
      .all()
  ).results;
  const result = { written: 0, unchanged: 0, failed: 0 };
  let bytes = 0;
  for (const user of users) {
    if (bytes > BYTE_BUDGET) break;
    try {
      const revision = await currentRevision(db, user.id);
      const latest = (await listBackups(env, user.id)).find(
        (item) => item.kind === 'auto',
      );
      if (revision !== null && latest && latest.revision === revision) {
        result.unchanged++;
      } else {
        const made = await writeBackup(env, user.id, 'auto', now, config);
        if (made) {
          result.written++;
          bytes += made.raw;
        }
      }
      await markDelivery(db, user.id, window.day, 'sent');
    } catch (e) {
      result.failed++;
      console.log(
        JSON.stringify({
          event: 'weekly_backup_failed',
          message: String(e?.message || e).slice(0, 150),
        }),
      );
      try {
        await markDelivery(db, user.id, window.day, 'failed');
      } catch {
        /* lần sau thử lại */
      }
    }
  }
  if (users.length)
    console.log(JSON.stringify({ event: 'weekly_backup', ...result }));
  return result;
}

// /api/backups: danh sách, tạo bản thủ công / trước khi khôi phục, đọc một bản, xóa một bản. Chỉ thao tác trên bản của chính người đang đăng nhập.
export async function backupAPI(request, env, u) {
  const path = new URL(request.url).pathname;
  const config = backupConfig(env);
  if (path === '/api/backups' && request.method === 'GET') {
    await limited(env.DB, 'backup-list:' + u.id, 60);
    if (!env.FILES)
      return json({
        available: false,
        auto: config.enabled,
        keep: { auto: config.keepAuto, other: config.keepOther },
        items: [],
      });
    return json({
      available: true,
      auto: config.enabled,
      keep: { auto: config.keepAuto, other: config.keepOther },
      items: await listBackups(env, u.id),
    });
  }
  if (path === '/api/backups' && request.method === 'POST') {
    if (!env.FILES) fail('Kho sao lưu chưa sẵn sàng.', 503);
    await limited(env.DB, 'backup-make:' + u.id, 6);
    const b = await body(request);
    if (b.kind !== 'manual' && b.kind !== 'restore')
      fail('Loại bản sao không hợp lệ.', 400);
    const made = await writeBackup(env, u.id, b.kind, new Date(), config);
    if (!made) fail('Chưa có dữ liệu để sao lưu.', 404);
    return json({ item: made });
  }
  const match = /^\/api\/backups\/([^/]+)$/.exec(path);
  if (match) {
    if (!env.FILES) fail('Kho sao lưu chưa sẵn sàng.', 503);
    const id = decodeURIComponent(match[1]);
    if (request.method === 'GET') {
      await limited(env.DB, 'backup-read:' + u.id, 20);
      return json(await readBackup(env, u.id, id));
    }
    if (request.method === 'DELETE') {
      await limited(env.DB, 'backup-delete:' + u.id, 30);
      if (!ID.test(id)) fail('Mã bản sao không hợp lệ.', 400);
      await env.FILES.delete(keyOf(u.id, id));
      return json({ ok: true });
    }
  }
  return null;
}
