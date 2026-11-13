import { workspaceRow } from './workspace-store.mjs';
import {
  json,
  fail,
  body,
  limited,
  passwordHash,
  passwordMatches,
} from './api.mjs';
import { weeklyReport, reportDate } from './reports.mjs';
import { financeReport } from './finance-report.mjs';
const SHARE_DAYS = [1, 3, 5, 7, 10, 15, 30];
async function reportTokenHash(token) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
    (v) => v.toString(16).padStart(2, '0'),
  ).join('');
}
export async function reportSharePublic(request, env, token) {
  if (!/^[a-f0-9]{64}$/.test(token)) fail('Liên kết không hợp lệ.', 404);
  if (!['GET', 'POST'].includes(request.method))
    fail('Phương thức không hợp lệ.', 405);
  const ip = await reportTokenHash(
    request.headers.get('CF-Connecting-IP') || 'unknown',
  );
  await limited(env.DB, 'report-view:' + ip, 120);
  const row = await env.DB.prepare(
    'SELECT html,title,password_hash,expires FROM report_shares WHERE token_hash=?',
  )
    .bind(await reportTokenHash(token))
    .first();
  if (!row) fail('Liên kết không tồn tại hoặc đã được thu hồi.', 404);
  if (row.expires <= Date.now()) fail('Liên kết đã hết hạn.', 410);
  if (row.password_hash) {
    if (request.method === 'GET')
      return json({ locked: true, expires: row.expires });
    await limited(env.DB, 'report-unlock:' + ip, 40);
    await limited(env.DB, 'report-unlock:' + ip + ':' + token, 8);
    const values = await body(request),
      password = values.password;
    if (
      typeof password !== 'string' ||
      password.length > 128 ||
      !(await passwordMatches(password, row.password_hash))
    )
      fail('Mật khẩu chưa đúng.', 401);
  }
  if (row.expires <= Date.now()) fail('Liên kết đã hết hạn.', 410);
  return json({
    locked: false,
    html: row.html,
    title: row.title,
    expires: row.expires,
  });
}
export async function reportShareOwner(request, env, u) {
  const db = env.DB;
  if (request.method === 'GET') {
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const row = await db
        .prepare(
          'SELECT html,title,expires FROM report_shares WHERE id=? AND user_id=? AND expires>?',
        )
        .bind(id, u.id, Date.now())
        .first();
      if (!row) fail('Báo cáo không tồn tại hoặc đã hết hạn.', 404);
      return json({ ...row, locked: false });
    }
    const shares = await db
      .prepare(
        "SELECT id,title,created,expires,CASE WHEN password_hash<>'' THEN 'password' ELSE 'public' END AS mode FROM report_shares WHERE user_id=? AND expires>? ORDER BY created DESC LIMIT 30",
      )
      .bind(u.id, Date.now())
      .all();
    return json({ shares: shares.results });
  }
  if (request.method === 'DELETE') {
    const values = await body(request);
    if (typeof values.id !== 'string' || !/^[a-f0-9-]{36}$/.test(values.id))
      fail('Liên kết không hợp lệ.');
    const result = await db
      .prepare('DELETE FROM report_shares WHERE id=? AND user_id=?')
      .bind(values.id, u.id)
      .run();
    if (!result.meta.changes) fail('Không tìm thấy liên kết.', 404);
    return json({ ok: true });
  }
  if (request.method !== 'POST') fail('Phương thức không hợp lệ.', 405);
  const values = await body(request);
  if (
    !SHARE_DAYS.includes(values.days) ||
    !['public', 'password'].includes(values.mode)
  )
    fail('Chọn thời hạn và chế độ chia sẻ hợp lệ.');
  if (values.kind !== undefined && !['tasks', 'finance'].includes(values.kind))
    fail('Loại báo cáo không hợp lệ.');
  if (
    values.mode === 'password' &&
    (typeof values.password !== 'string' ||
      values.password.length < 8 ||
      values.password.length > 128)
  )
    fail('Mật khẩu chia sẻ cần từ 8 đến 128 ký tự.');
  await limited(db, 'report-create:' + u.id, 10);
  const active = await db
    .prepare(
      'SELECT COUNT(*) AS total FROM report_shares WHERE user_id=? AND expires>?',
    )
    .bind(u.id, Date.now())
    .first();
  if (active.total >= 30)
    fail('Tối đa 30 link đang hoạt động. Thu hồi link cũ để tạo thêm.');
  const w = await workspaceRow(db, u.id),
    workspace = w ? JSON.parse(w.data) : { projects: [] };
  let report;
  if (values.kind === 'finance') {
    // Báo cáo thu chi dùng lại bảng report_shares: chỉ lưu bản chụp HTML, không cần lược đồ mới.
    report = financeReport(workspace, reportDate(), { shared: true });
    if (!report.hasData)
      fail(
        'Chưa có khoản thu chi nào để chia sẻ. Hãy ghi khoản thu hoặc chi trong Phân bổ tài nguyên trước.',
      );
  } else {
    const previous = await db
      .prepare(
        'SELECT data FROM report_snapshots WHERE user_id=? ORDER BY day DESC LIMIT 1',
      )
      .bind(u.id)
      .first();
    // v2.3.0: trang chia sẻ công khai (người ngoài xem, report.js đọc nhãn thường) luôn dùng giọng thường.
    report = weeklyReport(
      { ...workspace, style: undefined },
      reportDate(),
      previous ? JSON.parse(previous.data) : null,
    );
  }
  if (new TextEncoder().encode(report.html).length > 1000000)
    fail('Báo cáo vượt giới hạn chia sẻ. Hãy xuất PDF.', 413);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
      v.toString(16).padStart(2, '0'),
    ).join(''),
    id = crypto.randomUUID(),
    created = Date.now(),
    expires = created + values.days * 86400000,
    secret =
      values.mode === 'password' ? await passwordHash(values.password) : '';
  await db
    .prepare(
      'INSERT INTO report_shares(id,token_hash,user_id,title,html,password_hash,created,expires) VALUES(?,?,?,?,?,?,?,?)',
    )
    .bind(
      id,
      await reportTokenHash(token),
      u.id,
      report.subject,
      report.html,
      secret,
      created,
      expires,
    )
    .run();
  return json({
    id,
    url: 'https://kanban.huongthiennature.com/report.html#' + token,
    mode: values.mode,
    created,
    expires,
  });
}
