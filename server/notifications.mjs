import {
  hash,
  pushHost,
  ORIGIN,
  enc,
  mail,
  noteChannel,
  activeNoteReminder,
} from './api.mjs';
import { purgeStorage } from './storage.mjs';
import { readWorkspace, purgeWorkspaceV2 } from './workspace-store.mjs';
import {
  reportDate,
  shiftDay,
  reminderReport,
  weeklyReport,
} from './reports.mjs';
const b64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
async function sendPush(env, endpoint) {
  if (!pushHost(endpoint)) return;
  const header = b64(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))),
    payload = b64(
      enc.encode(
        JSON.stringify({
          aud: new URL(endpoint).origin,
          exp: Math.floor(Date.now() / 1000) + 3600,
          sub: 'mailto:no-reply@huongthiennature.com',
        }),
      ),
    ),
    input = header + '.' + payload;
  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(input),
  );
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      Authorization:
        'vapid t=' + input + '.' + b64(signature) + ', k=' + env.VAPID_PUBLIC,
    },
    signal: AbortSignal.timeout(15000),
  });
  if ([404, 410].includes(response.status)) {
    await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?')
      .bind(endpoint)
      .run();
    return;
  }
  if (!response.ok) throw Error('Push rejected');
}
export async function notificationDaily(env, now = new Date()) {
  const db = env.DB,
    maintenance = now.getUTCMinutes() < 5;
  if (maintenance) {
    await purgeStorage(env);
    await purgeWorkspaceV2(env);
    await db.batch([
      db
        .prepare(
          'DELETE FROM workspace_pending WHERE NOT EXISTS(SELECT 1 FROM workspace_transfers t WHERE t.user_id=workspace_pending.user_id AND t.upload_id=workspace_pending.upload_id AND t.expires>?)',
        )
        .bind(now.getTime()),
      db
        .prepare('DELETE FROM workspace_transfers WHERE expires<?')
        .bind(now.getTime()),
    ]);
    await db
      .prepare('DELETE FROM note_versions WHERE saved<?')
      .bind(now.getTime() - 7 * 86400000)
      .run();
  }
  const day = reportDate(now),
    hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(now),
    ),
    weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  if (maintenance)
    await db.batch([
      db
        .prepare('DELETE FROM board_shares WHERE expires<?')
        .bind(now.getTime()),
      db
        .prepare('DELETE FROM report_shares WHERE expires<?')
        .bind(now.getTime()),
    ]);
  const dueNotes = (
    await db
      .prepare(
        'SELECT s.* FROM note_reminder_schedule s JOIN users u ON u.id=s.user_id WHERE s.queued=0 AND s.fire_at<=? AND s.expires>? AND u.verified=1 ORDER BY s.fire_at LIMIT 100',
      )
      .bind(now.getTime(), now.getTime())
      .all()
  ).results;
  for (const row of dueNotes) {
    const note = JSON.parse(row.payload);
    await queueNotification(
      db,
      row.user_id,
      note.remindAt.slice(0, 10),
      await noteChannel(note),
      {
        subject: 'Nhắc ghi chú · ' + note.title,
        text:
          'Ghi chú: ' +
          note.title +
          '\nThời gian: ' +
          note.remindAt.replace('T', ' ') +
          ' (giờ Việt Nam)\n' +
          (note.type === 'todo'
            ? (note.items || [])
                .filter((i) => !i.done)
                .map((i) => '□ ' + i.text)
                .join('\n')
            : note.text),
      },
    );
    await db
      .prepare(
        'UPDATE note_reminder_schedule SET queued=1 WHERE user_id=? AND note_id=? AND schedule_key=?',
      )
      .bind(row.user_id, row.note_id, row.schedule_key)
      .run();
  }
  const users = (
    await db
      .prepare(
        'SELECT u.id,u.email,u.email_reminders,COALESCE(r.hour,8) AS reminder_hour,COALESCE(n.weekly_reports,0) AS weekly_reports,COALESCE(n.weekly_hour,8) AS weekly_hour,COALESCE(n.weekly_day,0) AS weekly_day,w.data FROM users u LEFT JOIN reminder_settings r ON r.user_id=u.id LEFT JOIN notification_preferences n ON n.user_id=u.id JOIN workspaces w ON w.user_id=u.id WHERE u.verified=1 AND ((COALESCE(r.hour,8)=? AND (u.email_reminders=1 OR EXISTS(SELECT 1 FROM subscriptions s WHERE s.user_id=u.id))) OR (n.weekly_reports=1 AND n.weekly_hour=? AND COALESCE(n.weekly_day,0)=?))',
      )
      .bind(hour, hour, weekday)
      .all()
  ).results;
  for (const u of users) {
    try {
      const latest = await readWorkspace(db, u.id);
      const workspace = latest ? latest.data : JSON.parse(u.data);
      if (hour === u.reminder_hour) {
        const report = reminderReport(workspace, day);
        if (report) {
          if (u.email_reminders)
            await queueNotification(db, u.id, day, 'email', report);
          const previous = await db
            .prepare(
              'SELECT status FROM deliveries WHERE user_id=? AND day=? AND channel=?',
            )
            .bind(u.id, day, 'push')
            .first();
          if (previous?.status !== 'sent') {
            const subs = (
              await db
                .prepare('SELECT endpoint FROM subscriptions WHERE user_id=?')
                .bind(u.id)
                .all()
            ).results;
            for (const sub of subs) await sendPush(env, sub.endpoint);
            await db
              .prepare(
                "INSERT INTO deliveries(user_id,day,channel,status) VALUES(?,?,?,'sent') ON CONFLICT(user_id,day,channel) DO UPDATE SET status='sent'",
              )
              .bind(u.id, day, 'push')
              .run();
          }
        }
      }
      if (
        weekday === u.weekly_day &&
        u.weekly_reports &&
        hour === u.weekly_hour
      ) {
        const previous = await db
          .prepare(
            'SELECT data FROM report_snapshots WHERE user_id=? AND day<? ORDER BY day DESC LIMIT 1',
          )
          .bind(u.id, day)
          .first();
        await queueNotification(
          db,
          u.id,
          day,
          'weekly',
          weeklyReport(
            workspace,
            day,
            previous ? JSON.parse(previous.data) : null,
          ),
        );
      }
    } catch (e) {
      console.log(
        JSON.stringify({
          event: 'report_prepare_failed',
          message: String(e.message).slice(0, 150),
        }),
      );
    }
  }
  const jobs = (
    await db
      .prepare(
        "SELECT j.*,u.email FROM notification_jobs j JOIN users u ON u.id=j.user_id LEFT JOIN notification_preferences n ON n.user_id=u.id WHERE (j.day=? OR (j.channel LIKE 'note:%' AND j.day>=?)) AND j.status='pending' AND j.lease_until<? AND j.attempts<4 AND u.verified=1 AND ((j.channel='email' AND u.email_reminders=1) OR (j.channel='weekly' AND n.weekly_reports=1) OR j.channel LIKE 'note:%') LIMIT 20",
      )
      .bind(day, shiftDay(day, -2), now.getTime())
      .all()
  ).results;
  for (const job of jobs) {
    if (job.channel.startsWith('note:')) {
      const row = await db
        .prepare(
          'SELECT payload FROM note_reminder_schedule WHERE user_id=? AND note_id=? AND expires>?',
        )
        .bind(job.user_id, job.channel.split(':')[1], now.getTime())
        .first();
      const note = row ? JSON.parse(row.payload) : null;
      const enabled = !!note && (await noteChannel(note)) === job.channel;
      if (!enabled) {
        await db
          .prepare(
            "UPDATE notification_jobs SET status='cancelled' WHERE user_id=? AND day=? AND channel=?",
          )
          .bind(job.user_id, job.day, job.channel)
          .run();
        continue;
      }
    }
    const claimed = await db
      .prepare(
        "UPDATE notification_jobs SET lease_until=?,attempts=attempts+1 WHERE user_id=? AND day=? AND channel=? AND status='pending' AND lease_until<? RETURNING user_id",
      )
      .bind(
        now.getTime() + 10 * 60000,
        job.user_id,
        job.day,
        job.channel,
        now.getTime(),
      )
      .first();
    if (!claimed) continue;
    try {
      await mail(
        env,
        job.email,
        job.subject,
        job.body,
        'zen-' + job.channel + '-' + job.user_id + '-' + job.day,
        job.html || undefined,
      );
      const statements = [
        db
          .prepare(
            "UPDATE notification_jobs SET status='sent',last_error='' WHERE user_id=? AND day=? AND channel=?",
          )
          .bind(job.user_id, job.day, job.channel),
        db
          .prepare(
            "INSERT INTO deliveries(user_id,day,channel,status) VALUES(?,?,?,'sent') ON CONFLICT(user_id,day,channel) DO UPDATE SET status='sent'",
          )
          .bind(job.user_id, job.day, job.channel),
      ];
      if (job.channel === 'weekly')
        statements.push(
          db
            .prepare(
              'INSERT OR REPLACE INTO report_snapshots(user_id,day,data) VALUES(?,?,?)',
            )
            .bind(job.user_id, day, job.snapshot),
        );
      await db.batch(statements);
    } catch (e) {
      await db
        .prepare(
          'UPDATE notification_jobs SET last_error=? WHERE user_id=? AND day=? AND channel=?',
        )
        .bind(
          String(e.message).slice(0, 200),
          job.user_id,
          job.day,
          job.channel,
        )
        .run();
      console.log(
        JSON.stringify({ event: 'report_send_failed', channel: job.channel }),
      );
    }
  }
  if (maintenance)
    await db.batch([
      db.prepare('DELETE FROM sessions WHERE expires<?').bind(now.getTime()),
      db.prepare('DELETE FROM tokens WHERE expires<?').bind(now.getTime()),
      db.prepare('DELETE FROM rate_limits WHERE expires<?').bind(now.getTime()),
      db.prepare('DELETE FROM deliveries WHERE day<?').bind(shiftDay(day, -30)),
      db
        .prepare('DELETE FROM notification_jobs WHERE day<?')
        .bind(shiftDay(day, -30)),
      db
        .prepare('DELETE FROM report_snapshots WHERE day<?')
        .bind(shiftDay(day, -100)),
    ]);
}
async function queueNotification(db, userId, day, channel, report) {
  const text =
    report.text +
    '\n\nMở ' +
    ORIGIN +
    ' để xem và cập nhật.' +
    (channel.startsWith('note:')
      ? ''
      : '\nTắt hoặc đổi giờ gửi trong Settings → Thông báo.');
  await db
    .prepare(
      'INSERT OR IGNORE INTO notification_jobs(user_id,day,channel,subject,body,snapshot,html) VALUES(?,?,?,?,?,?,?)',
    )
    .bind(
      userId,
      day,
      channel,
      report.subject,
      text,
      report.snapshot ? JSON.stringify(report.snapshot) : '',
      report.html || '',
    )
    .run();
  if (channel.startsWith('note:'))
    await db
      .prepare(
        "UPDATE notification_jobs SET status='pending',lease_until=0,attempts=0,last_error='',subject=?,body=? WHERE user_id=? AND day=? AND channel=? AND status='cancelled'",
      )
      .bind(report.subject, text, userId, day, channel)
      .run();
}
