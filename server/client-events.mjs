// v1.73.0: quan sát vận hành không cần bảng mới. Trình duyệt gửi (1) lỗi script chưa bắt và (2) dấu "tính năng này được mở hôm nay"
// tới đây; máy chủ làm sạch rồi ghi MỘT dòng nhật ký JSON (xem được trong Cloudflare Workers Logs, lọc theo trường `event`).
// Không ghi vào D1, không lưu mã người dùng, không lưu IP (IP chỉ được băm để giới hạn tốc độ, dùng bảng rate_limits sẵn có).
const EVENT_TYPES = ['error', 'rejection', 'usage'];

// Bỏ thứ có thể là dữ liệu cá nhân hoặc bí mật khỏi chuỗi do trình duyệt gửi lên.
export function scrubClientText(value, max = 300) {
  return String(value ?? '')
    .replace(/[?#][^\s)'"]*/g, '') // chuỗi truy vấn/phần sau # của URL (có thể chứa mã chia sẻ)
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\b[a-f0-9]{24,}\b/gi, '[token]')
    .replace(/\d{9,}/g, '[số]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .slice(0, max);
}

const ident = (value, fallback = '') =>
  /^[a-z0-9-]{1,30}$/.test(String(value ?? '')) ? String(value) : fallback;
const semver = (value) =>
  /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(String(value ?? '')) ? String(value) : '';
const int = (value) =>
  Number.isInteger(value) && value >= 0 && value < 10 ** 7 ? value : 0;

// Trả về bản ghi đã làm sạch (để ghi nhật ký), hoặc null nếu dữ liệu gửi lên không hợp lệ.
export function cleanClientEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (!EVENT_TYPES.includes(body.type)) return null;
  const version = semver(body.version);
  if (body.type === 'usage') {
    const feature = ident(body.feature);
    return feature ? { event: 'client_usage', feature, version } : null;
  }
  const message = scrubClientText(body.message, 300);
  if (!message) return null;
  return {
    event: 'client_error',
    kind: body.type,
    message,
    source: scrubClientText(body.source, 120),
    line: int(body.line),
    col: int(body.col),
    stack: scrubClientText(body.stack, 1200),
    view: ident(body.view),
    version,
  };
}

export async function clientEvent(request, env, ip, limiter, hasher) {
  await limiter(env.DB, 'cev:' + (await hasher(ip)), 60);
  let body;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  const record = cleanClientEvent(body);
  if (record) console.log(JSON.stringify(record));
  return record;
}
