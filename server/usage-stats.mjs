// v2.76.0 (Bảng Thám Báo): số liệu dùng ẩn danh (v2.71.0) xem được ngay trong ứng dụng.
// Không thêm bảng hay migration: mỗi dấu dùng cộng một vào bảng rate_limits sẵn có (khóa 'usage:<ngày>:<tính năng>:<phiên bản>', count = số thiết bị-ngày,
// expires = 100 ngày; việc dọn hằng ngày của máy chủ đã xóa dòng hết hạn). Khóa không chứa mã người dùng, thiết bị hay địa chỉ IP.
// Chỉ chủ triển khai xem được: biến USAGE_VIEWER_EMAILS (danh sách email, cách nhau bằng dấu phẩy); không đặt thì chỉ người dùng tạo sớm nhất.
export const USAGE_KEEP_DAYS = 100;
export const USAGE_WINDOWS = [7, 30];
const DAY_MS = 86400000;
const PREFIX = 'usage:';
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

// Ghi một dấu dùng (đã làm sạch ở client-events.mjs). Lỗi ghi không bao giờ được làm hỏng việc nhận dấu.
export async function recordUsage(db, record, now = Date.now()) {
  if (!record || record.event !== 'client_usage' || !record.feature)
    return false;
  try {
    const key =
      PREFIX +
      dayOf(now) +
      ':' +
      record.feature +
      ':' +
      (record.version || 'x');
    await db
      .prepare(
        'INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1,expires=excluded.expires',
      )
      .bind(key, now + USAGE_KEEP_DAYS * DAY_MS)
      .run();
    return true;
  } catch {
    return false;
  }
}

// Tổng hợp các dấu trong `days` ngày gần nhất (kể cả hôm nay).
export async function usageSummary(db, days, now = Date.now()) {
  if (!USAGE_WINDOWS.includes(days)) days = USAGE_WINDOWS[0];
  const from = dayOf(now - (days - 1) * DAY_MS),
    to = dayOf(now);
  const { results } = await db
    .prepare('SELECT key,count FROM rate_limits WHERE key>=? AND key<?')
    .bind(PREFIX + from, PREFIX + to + '~')
    .all();
  const features = new Map(),
    versions = new Map(),
    perDay = new Map();
  let total = 0;
  for (const row of results) {
    const [, day, feature, version] = String(row.key).split(':');
    if (!day || !feature || day < from || day > to) continue;
    const n = Number(row.count) || 0;
    total += n;
    features.set(feature, (features.get(feature) || 0) + n);
    versions.set(version, (versions.get(version) || 0) + n);
    perDay.set(day, (perDay.get(day) || 0) + n);
  }
  const rank = (map, name) =>
    [...map]
      .map(([k, count]) => ({ [name]: k, count }))
      .sort(
        (a, b) =>
          b.count - a.count || String(a[name]).localeCompare(String(b[name])),
      );
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dayOf(now - i * DAY_MS);
    daily.push({ day: d, count: perDay.get(d) || 0 });
  }
  return {
    days,
    from,
    to,
    total,
    features: rank(features, 'feature'),
    versions: rank(versions, 'version'),
    daily,
  };
}

// Chủ triển khai: theo biến môi trường nếu có, không thì người dùng tạo sớm nhất. Mặc định an toàn: người khác nhận 404 như không có trang này.
export async function isUsageViewer(db, env, user) {
  if (!user || !user.id) return false;
  const listed = String((env && env.USAGE_VIEWER_EMAILS) || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (listed.length)
    return listed.includes(String(user.email || '').toLowerCase());
  const first = await db
    .prepare('SELECT id FROM users ORDER BY created ASC,id ASC LIMIT 1')
    .bind()
    .first();
  return !!first && first.id === user.id;
}
