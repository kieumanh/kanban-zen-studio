import {
  hash,
  random,
  ORIGIN,
  mail,
  json,
  fail,
  body,
  limited,
  passwordHash,
  passwordMatches,
} from './api.mjs';
export async function tokenMail(env, user, kind) {
  const token = random(),
    digest = await hash(token),
    now = Date.now();
  await env.DB.prepare(
    'INSERT INTO tokens(token_hash,user_id,kind,expires) VALUES(?,?,?,?)',
  )
    .bind(digest, user.id, kind, now + (kind === 'reset' ? 1800000 : 86400000))
    .run();
  const link = ORIGIN + '/#' + kind + '=' + token;
  await mail(
    env,
    user.email,
    kind === 'reset'
      ? 'Đặt lại mật khẩu Zen Studio'
      : 'Xác minh email Zen Studio',
    (kind === 'reset'
      ? 'Liên kết đặt lại mật khẩu có hiệu lực 30 phút: '
      : 'Xác minh email trong 24 giờ: ') +
      link +
      '\nNếu bạn không yêu cầu, hãy bỏ qua email này.',
    digest,
  );
}
export async function session(request, env) {
  const token = request.headers
    .get('Cookie')
    ?.match(/(?:^|; )zen_session=([a-f0-9]{64})/)?.[1];
  if (!token) fail('Vui lòng đăng nhập.', 401);
  const digest = await hash(token),
    detailed = ['/api/me', '/api/preferences'].includes(
      new URL(request.url).pathname,
    );
  const u = await env.DB.prepare(
    detailed
      ? 'SELECT u.id,u.email,s.expires AS session_expires,s.remembered,s.reauth_at,u.email_reminders,COALESCE(r.hour,8) AS reminder_hour,COALESCE(r.interval_days,1) AS reminder_days,COALESCE(n.weekly_reports,0) AS weekly_reports,COALESCE(n.weekly_hour,8) AS weekly_hour,COALESCE(n.weekly_day,0) AS weekly_day,COALESCE(n.repeat_alerts,1) AS repeat_alerts FROM users u LEFT JOIN reminder_settings r ON r.user_id=u.id LEFT JOIN notification_preferences n ON n.user_id=u.id JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?'
      : 'SELECT u.id,u.email,s.expires AS session_expires,s.remembered,s.reauth_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',
  )
    .bind(digest, Date.now())
    .first();
  if (!u) fail('Phiên đăng nhập đã hết hạn.', 401);
  if (!u.remembered && u.session_expires > Date.now() + 600000) {
    u.session_expires = Date.now() + 600000;
    await env.DB.prepare('UPDATE sessions SET expires=? WHERE token_hash=?')
      .bind(u.session_expires, digest)
      .run();
  }
  return u;
}

export async function authAPI(request, env, path, ip) {
  const db = env.DB;
  if (
    [
      '/api/register',
      '/api/login',
      '/api/forgot',
      '/api/reset',
      '/api/verify',
      '/api/resend',
    ].includes(path)
  ) {
    if (request.method !== 'POST') fail('Method not allowed', 405);
    await limited(db, 'auth:' + (await hash(ip)), 35);
    const b = await body(request),
      email = String(b.email || '')
        .trim()
        .toLowerCase(),
      password = String(b.password || '');
    if (
      ['register', 'login', 'forgot', 'resend'].some(
        (x) => path === '/api/' + x,
      ) &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    )
      fail('Email không hợp lệ.');
    if (path === '/api/register') {
      if (password.length < 10 || password.length > 128)
        fail('Mật khẩu cần từ 10 đến 128 ký tự.');
      await limited(db, 'mail:' + (await hash(email)), 4);
      let u = await db
        .prepare('SELECT id,email,verified FROM users WHERE email=?')
        .bind(email)
        .first();
      if (!u) {
        u = { id: crypto.randomUUID(), email };
        await db
          .prepare(
            'INSERT OR IGNORE INTO users(id,email,password_hash,created) VALUES(?,?,?,?)',
          )
          .bind(u.id, email, await passwordHash(password), Date.now())
          .run();
        u = await db
          .prepare('SELECT id,email,verified FROM users WHERE email=?')
          .bind(email)
          .first();
      }
      if (!u.verified) await tokenMail(env, u, 'verify');
      return json({
        message:
          'Yêu cầu đăng ký đã được tiếp nhận. Hãy kiểm tra hộp thư đến và Thư rác để tìm email “Xác minh email Zen Studio”, rồi mở liên kết và bấm “Xác minh email” để hoàn tất. Nếu email đã có tài khoản, hãy đăng nhập hoặc dùng Quên mật khẩu.',
      });
    }
    if (path === '/api/login') {
      if (password.length > 128) fail('Email hoặc mật khẩu chưa đúng.', 401);
      await limited(db, 'login:' + (await hash(email)), 10);
      const u = await db
        .prepare('SELECT * FROM users WHERE email=?')
        .bind(email)
        .first();
      if (!u) {
        await passwordHash(password);
        fail('Email hoặc mật khẩu chưa đúng.', 401);
      }
      if (!(await passwordMatches(password, u.password_hash)))
        fail('Email hoặc mật khẩu chưa đúng.', 401);
      if (!u.verified)
        fail(
          'Vui lòng xác minh email trước khi đăng nhập. Bạn có thể gửi lại email xác minh.',
          403,
        );
      const token = random(),
        remembered = b.rememberDevice === true,
        expires = Date.now() + (remembered ? 30 * 86400000 : 600000);
      await db
        .prepare(
          'INSERT INTO sessions(token_hash,user_id,expires,remembered,reauth_at) VALUES(?,?,?,?,?)',
        )
        .bind(await hash(token), u.id, expires, Number(remembered), Date.now())
        .run();
      return json({ ok: true }, 200, {
        'Set-Cookie':
          'zen_session=' +
          token +
          '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' +
          (remembered ? 2592000 : 604800),
      });
    }
    if (path === '/api/forgot' || path === '/api/resend') {
      await limited(db, 'mail:' + (await hash(email)), 4);
      const u = await db
        .prepare('SELECT id,email,verified FROM users WHERE email=?')
        .bind(email)
        .first();
      if (u && (path === '/api/forgot' || !u.verified))
        await tokenMail(env, u, path === '/api/forgot' ? 'reset' : 'verify');
      return json({
        message:
          'Nếu email phù hợp, liên kết đã được gửi. Hãy kiểm tra cả thư rác.',
      });
    }
    if (path === '/api/verify' || path === '/api/reset') {
      const digest = await hash(String(b.token || '')),
        kind = path === '/api/reset' ? 'reset' : 'verify';
      if (kind === 'reset' && (password.length < 10 || password.length > 128))
        fail('Mật khẩu cần từ 10 đến 128 ký tự.');
      const t = await db
        .prepare(
          'SELECT * FROM tokens WHERE token_hash=? AND kind=? AND expires>?',
        )
        .bind(digest, kind, Date.now())
        .first();
      if (!t) fail('Liên kết hết hạn hoặc đã được sử dụng.');
      const newHash = kind === 'reset' ? await passwordHash(password) : null;
      const mutation =
        kind === 'reset'
          ? db
              .prepare(
                'UPDATE users SET password_hash=? WHERE id=? AND EXISTS(SELECT 1 FROM tokens WHERE token_hash=?)',
              )
              .bind(newHash, t.user_id, digest)
          : db
              .prepare(
                'UPDATE users SET verified=1 WHERE id=? AND EXISTS(SELECT 1 FROM tokens WHERE token_hash=?)',
              )
              .bind(t.user_id, digest);
      await db.batch([
        mutation,
        db
          .prepare('DELETE FROM tokens WHERE user_id=? AND kind=?')
          .bind(t.user_id, kind),
        ...(kind === 'reset'
          ? [db.prepare('DELETE FROM sessions WHERE user_id=?').bind(t.user_id)]
          : []),
      ]);
      return json({
        message:
          kind === 'reset'
            ? 'Đã đặt lại mật khẩu. Vui lòng đăng nhập.'
            : 'Email đã được xác minh. Bạn có thể đăng nhập.',
      });
    }
  }
}
