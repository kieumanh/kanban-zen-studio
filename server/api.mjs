import { authAPI, session } from './auth.mjs';
import {
  workspaceV2,
  workspaceStage,
  readWorkspace,
  workspaceRow,
} from './workspace-store.mjs';
import { sketchAPI } from './sketches.mjs';
import { notificationDaily } from './notifications.mjs';
import { taskAssetStatements } from './task-workflow.mjs';
function validDependencies(p) {
  if (!p) return false;
  if (p.dependencies === undefined) return true;
  if (
    !Array.isArray(p.tasks) ||
    !Array.isArray(p.dependencies) ||
    p.dependencies.length > 1000
  )
    return false;
  const ids = new Set(p.tasks.map((t) => t.id)),
    adj = new Map(),
    keys = new Set();
  for (const e of p.dependencies) {
    if (
      !e ||
      !ids.has(e.from) ||
      !ids.has(e.to) ||
      e.from === e.to ||
      keys.has(e.from + '|' + e.to)
    )
      return false;
    keys.add(e.from + '|' + e.to);
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const degrees = new Map([...ids].map((id) => [id, 0]));
  for (const targets of adj.values())
    for (const id of targets) degrees.set(id, degrees.get(id) + 1);
  const queue = [...ids].filter((id) => !degrees.get(id));
  let seen = 0;
  while (queue.length) {
    const id = queue.pop();
    seen++;
    for (const next of adj.get(id) || []) {
      degrees.set(next, degrees.get(next) - 1);
      if (!degrees.get(next)) queue.push(next);
    }
  }
  return seen === ids.size;
}
import { reportSharePublic, reportShareOwner } from './report-sharing.mjs';
import { resourceList } from './resources.mjs';
import { assetAPI, purgeStorage } from './storage.mjs';
import {
  reportDate,
  shiftDay,
  taskDeadline,
  reminderReport,
  weeklyReport,
} from './reports.mjs';
export const ORIGIN = 'https://kanban.huongthiennature.com',
  enc = new TextEncoder();
const hex = (b) =>
  Array.from(new Uint8Array(b), (v) => v.toString(16).padStart(2, '0')).join(
    '',
  );
const bytes = (h) =>
  Uint8Array.from(h.match(/../g) || [], (s) => parseInt(s, 16));
export const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const hash = async (s) =>
  hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export async function passwordHash(
  password,
  salt = hex(crypto.getRandomValues(new Uint8Array(16))),
) {
  const k = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return (
    salt +
    ':' +
    hex(
      await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: bytes(salt),
          iterations: 100000,
          hash: 'SHA-256',
        },
        k,
        256,
      ),
    )
  );
}
export async function passwordMatches(password, stored) {
  const candidate = await passwordHash(password, stored.split(':')[0]);
  let diff = candidate.length ^ stored.length;
  for (let i = 0; i < stored.length; i++)
    diff |= (candidate.charCodeAt(i) || 0) ^ stored.charCodeAt(i);
  return diff === 0;
}
export const json = (x, status = 200, headers = {}) =>
  Response.json(x, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
export async function limited(db, key, max = 12) {
  const now = Date.now(),
    r = await db
      .prepare(
        'INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count',
      )
      .bind(key, now + 900000, now, now)
      .first();
  if (r.count > max)
    fail('Bạn thao tác quá nhiều. Vui lòng thử lại sau 15 phút.', 429);
}
export async function mail(env, to, subject, text, key, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      from: 'Kanban Zen Studio <no-reply@huongthiennature.com>',
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });
  if (!response.ok)
    throw new Error('Không gửi được email. Vui lòng thử lại sau.');
}
function validDate(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function validContent(d) {
  const ids = new Set(),
    notes = d.notes ?? [];
  if (
    !Array.isArray(notes) ||
    notes.length > 500 ||
    notes.some((n) => !n || typeof n !== 'object' || Array.isArray(n))
  )
    return false;
  for (const n of notes) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(n.id) || ids.has(n.id)) return false;
    ids.add(n.id);
    if (
      n.keywords !== undefined &&
      (!Array.isArray(n.keywords) ||
        n.keywords.length > 20 ||
        !n.keywords.every(
          (k) => typeof k === 'string' && k.trim() && k.length <= 40,
        ))
    )
      return false;
    if (
      n.remindAt !== undefined &&
      n.remindAt !== '' &&
      !(
        typeof n.remindAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(n.remindAt) &&
        validDate(n.remindAt.slice(0, 10)) &&
        Number(n.remindAt.slice(11, 13)) < 24 &&
        Number(n.remindAt.slice(14)) < 60
      )
    )
      return false;
    if (
      n.remindBefore !== undefined &&
      ![15, 60, 1440].includes(n.remindBefore)
    )
      return false;
    if (n.remindEmail !== undefined && typeof n.remindEmail !== 'boolean')
      return false;
    if (
      n.type !== undefined &&
      ![
        'note',
        'heading',
        'link',
        'todo',
        'board',
        'image',
        'video',
        'audio',
        'document',
        'color',
        'table',
        'comment',
        'line',
        'sketch',
        'map',
      ].includes(n.type)
    )
      return false;
    if (
      n.motif !== undefined &&
      ![
        'none',
        'leaves',
        'forest',
        'lotus',
        'meditation',
        'awareness',
        'yoga',
        'awakening',
        'stream',
        'creative',
        'rest',
        'travel',
        'freelancer',
        'farm',
        'family',
        'finance',
      ].includes(n.motif)
    )
      return false;
    if (n.pinned !== undefined && typeof n.pinned !== 'boolean') return false;
    if (n.quickPinned !== undefined && typeof n.quickPinned !== 'boolean')
      return false;
    for (const k of ['boardId', 'from', 'to', 'fileId'])
      if (
        n[k] !== undefined &&
        n[k] !== '' &&
        !/^[a-zA-Z0-9_-]{1,100}$/.test(n[k])
      )
        return false;
    for (const k of ['x', 'y', 'width'])
      if (
        n[k] !== undefined &&
        (!Number.isFinite(n[k]) || n[k] < 0 || n[k] > 10000)
      )
        return false;
    if (n.locked !== undefined && typeof n.locked !== 'boolean') return false;
    if (
      n.items !== undefined &&
      (!Array.isArray(n.items) ||
        n.items.length > 200 ||
        !n.items.every(
          (i) =>
            i &&
            typeof i.text === 'string' &&
            i.text.length <= 300 &&
            typeof i.done === 'boolean',
        ))
    )
      return false;
    let parent = n.boardId,
      seen = new Set([n.id]);
    while (parent) {
      if (seen.has(parent)) return false;
      seen.add(parent);
      const node = notes.find((x) => x.id === parent);
      parent = node?.boardId;
    }
  }
  return (
    !d.trash ||
    (Array.isArray(d.trash) &&
      d.trash.length <= 1000 &&
      d.trash.every(
        (t) =>
          t &&
          typeof t.id === 'string' &&
          t.id.length <= 100 &&
          Number.isFinite(t.at) &&
          t.at > 0 &&
          ['project', 'task', 'check', 'note'].includes(t.kind) &&
          typeof t.name === 'string' &&
          t.name.length <= 300 &&
          typeof t.payload === 'string' &&
          t.payload.length <= 1500000 &&
          typeof t.parent === 'string' &&
          t.parent.length <= 10000,
      ))
  );
}

function validNoteLinks(x) {
  return (
    x === undefined ||
    (Array.isArray(x) &&
      x.length <= 100 &&
      new Set(x).size === x.length &&
      x.every(
        (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,99}$/.test(id),
      ))
  );
}
function validWipLimits(p) {
  const w = p.wipLimits;
  return (
    w === undefined ||
    (!!w &&
      typeof w === 'object' &&
      !Array.isArray(w) &&
      Object.keys(w).length <= 20 &&
      Object.entries(w).every(
        ([k, v]) =>
          p.columns?.includes(k) && Number.isInteger(v) && v >= 0 && v <= 2000,
      ))
  );
}
function validColumnNames(p) {
  const names = p.columnNames;
  if (names === undefined) return true;
  return (
    !!names &&
    typeof names === 'object' &&
    !Array.isArray(names) &&
    Object.keys(names).length <= 20 &&
    Object.entries(names).every(
      ([key, value]) =>
        p.columns?.includes(key) &&
        typeof value === 'string' &&
        value.trim() &&
        value.length <= 40,
    )
  );
}
function validExtras(d) {
  if (
    d.notes !== undefined &&
    (!Array.isArray(d.notes) ||
      d.notes.length > 500 ||
      d.notes.some((n) => !n || typeof n !== 'object' || Array.isArray(n)))
  )
    return false;
  const str = (s, n) => typeof s === 'string' && s.length <= n;
  const schedule = (o) => {
    if (!o || typeof o !== 'object') return false;
    const date = (x) =>
      x === undefined ||
      x === '' ||
      (typeof x === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(x) &&
        validDate(x.slice(0, 10)) &&
        Number(x.slice(11, 13)) < 24 &&
        Number(x.slice(14)) < 60);
    return (
      date(o.start) && date(o.end) && (!o.start || !o.end || o.start <= o.end)
    );
  };
  if (
    !d.projects.every(
      (p) =>
        p &&
        Array.isArray(p.tasks) &&
        p.tasks.every((t) => t && Array.isArray(t.checks)),
    )
  )
    return false;
  return (
    (d.taskTemplates === undefined ||
      (Array.isArray(d.taskTemplates) &&
        d.taskTemplates.length <= 100 &&
        d.taskTemplates.every(
          (x) =>
            x &&
            typeof x.id === 'string' &&
            x.id.length <= 100 &&
            typeof x.title === 'string' &&
            x.title.length <= 200 &&
            typeof x.description === 'string' &&
            x.description.length <= 5000 &&
            typeof x.tag === 'string' &&
            x.tag.length <= 40 &&
            Array.isArray(x.checks) &&
            x.checks.length <= 200 &&
            x.checks.every((c) => typeof c === 'string' && c.length <= 300),
        ))) &&
    d.projects.every(
      (p) =>
        validNoteLinks(p.noteIds) &&
        validColumnNames(p) &&
        validWipLimits(p) &&
        p.tasks.every(
          (t) =>
            validNoteLinks(t.noteIds) &&
            (t.comments === undefined ||
              (Array.isArray(t.comments) &&
                t.comments.length <= 200 &&
                t.comments.every(
                  (c) =>
                    c &&
                    typeof c.id === 'string' &&
                    c.id.length <= 100 &&
                    typeof c.text === 'string' &&
                    c.text.length > 0 &&
                    c.text.length <= 2000 &&
                    Number.isFinite(c.at),
                ))) &&
            (t.motif === undefined ||
              [
                'none',
                'leaves',
                'forest',
                'lotus',
                'meditation',
                'awareness',
                'yoga',
                'awakening',
                'stream',
                'creative',
                'rest',
                'travel',
                'freelancer',
                'farm',
                'family',
                'finance',
              ].includes(t.motif)) &&
            (t.archived === undefined || typeof t.archived === 'boolean') &&
            (t.pinned === undefined || typeof t.pinned === 'boolean') &&
            (t.sortOrder === undefined ||
              (Number.isFinite(t.sortOrder) &&
                t.sortOrder >= 0 &&
                t.sortOrder <= 2000)),
        ),
    ) &&
    (!d.notes ||
      (Array.isArray(d.notes) &&
        d.notes.every(
          (n) =>
            n.sortOrder === undefined ||
            (Number.isFinite(n.sortOrder) &&
              n.sortOrder >= 0 &&
              n.sortOrder <= 500),
        ))) &&
    validContent(d) &&
    (!d.notes ||
      (Array.isArray(d.notes) &&
        d.notes.length <= 500 &&
        d.notes.every(
          (n) =>
            n &&
            str(n.id, 100) &&
            str(n.title, 150) &&
            str(n.text, 10000) &&
            (!n.sketch ||
              (str(n.sketch, 150000) &&
                /^(?:data:image\/png;base64,[A-Za-z0-9+/=]+|\/api\/assets\/[a-f0-9-]{36}\?preview=1)$/.test(
                  n.sketch,
                ))) &&
            str(n.group, 80) &&
            str(n.url, 2000) &&
            (!n.url || /^https?:\/\//i.test(n.url)) &&
            /^#[a-f0-9]{6}$/i.test(n.color),
        ))) &&
    d.projects.every(
      (p) =>
        (p.start === undefined || validDate(p.start)) &&
        (p.end === undefined || validDate(p.end)) &&
        (!p.start || !p.end || p.start <= p.end) &&
        (p.motif === undefined ||
          [
            'none',
            'leaves',
            'forest',
            'lotus',
            'meditation',
            'awareness',
            'yoga',
            'awakening',
            'stream',
            'creative',
            'rest',
            'travel',
            'freelancer',
            'farm',
            'family',
            'finance',
          ].includes(p.motif)) &&
        validDependencies(p) &&
        (p.archived === undefined || typeof p.archived === 'boolean') &&
        (p.pinned === undefined || typeof p.pinned === 'boolean') &&
        p.tasks.every(
          (t) =>
            schedule(t) &&
            (!t.priority || ['q1', 'q2', 'q3', 'q4'].includes(t.priority)) &&
            t.checks.every(schedule),
        ),
    )
  );
}

export function validWorkspace(d) {
  if (
    !d ||
    d.schema !== 1 ||
    !Array.isArray(d.projects) ||
    d.projects.length > 100
  )
    return false;
  const ids = new Set(),
    id = (x) =>
      typeof x === 'string' &&
      /^[A-Za-z0-9_-]{1,99}$/.test(x) &&
      !ids.has(x) &&
      !!ids.add(x),
    str = (x, n) => typeof x === 'string' && x.length <= n;
  return (
    validExtras(d) &&
    d.projects.every(
      (p) =>
        id(p.id) &&
        str(p.name, 100) &&
        p.name.trim() &&
        str(p.description, 2000) &&
        /^#[a-f0-9]{6}$/i.test(p.color) &&
        str(p.icon, 8) &&
        Array.isArray(p.columns) &&
        p.columns.length >= 4 &&
        p.columns.length <= 20 &&
        ['Idea', 'List', 'Doing', 'Done'].every((c) => p.columns.includes(c)) &&
        new Set(p.columns).size === p.columns.length &&
        p.columns.every((c) => str(c, 40) && c.trim()) &&
        (!p.keywords ||
          (Array.isArray(p.keywords) &&
            p.keywords.length <= 50 &&
            p.keywords.every(
              (l) =>
                l &&
                str(l.name, 40) &&
                l.name.trim() &&
                /^#[a-f0-9]{6}$/i.test(l.color),
            ))) &&
        Array.isArray(p.tasks) &&
        p.tasks.length <= 2000 &&
        p.tasks.every(
          (t) =>
            id(t.id) &&
            str(t.title, 200) &&
            t.title.trim() &&
            str(t.description, 5000) &&
            str(t.tag, 40) &&
            str(t.due, 10) &&
            validDate(t.due) &&
            p.columns.includes(t.col) &&
            (!t.labels ||
              (Array.isArray(t.labels) &&
                t.labels.length <= 20 &&
                t.labels.every(
                  (l) =>
                    l &&
                    str(l.name, 40) &&
                    l.name.trim() &&
                    /^#[a-f0-9]{6}$/i.test(l.color),
                ))) &&
            Array.isArray(t.checks) &&
            t.checks.length <= 200 &&
            t.checks.every(
              (c) =>
                id(c.id) && str(c.text, 300) && typeof c.done === 'boolean',
            ) &&
            (t.col !== 'Done' || t.checks.every((c) => c.done)),
        ),
    )
  );
}
export async function body(request) {
  if (Number(request.headers.get('Content-Length') || 0) > 2000000)
    fail('Dữ liệu quá lớn.', 413);
  const reader = request.body?.getReader();
  if (!reader) return {};
  let length = 0,
    chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2000000) {
      await reader.cancel();
      fail('Dữ liệu quá lớn.', 413);
    }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    data.set(c, pos);
    pos += c.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(data));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      fail('Dữ liệu cần là một đối tượng JSON.');
    return parsed;
  } catch {
    fail('Dữ liệu không hợp lệ.');
  }
}
export function pushHost(endpoint) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      u.port === '' &&
      ([
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'web.push.apple.com',
      ].includes(u.hostname) ||
        u.hostname.endsWith('.notify.windows.com'))
    );
  } catch {
    return false;
  }
}
export async function api(request, env) {
  try {
    const path = new URL(request.url).pathname;
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method))
      return json({ error: 'Method not allowed' }, 405);
    if (
      request.method !== 'GET' &&
      (request.headers.get('Origin') !== ORIGIN ||
        !(
          request.headers.get('Content-Type')?.includes('application/json') ||
          (/^\/api\/assets\/[a-f0-9-]+\/part$/.test(path) &&
            request.method === 'PUT' &&
            request.headers.get('Content-Type') === 'application/octet-stream')
        ))
    )
      fail('Yêu cầu không hợp lệ.', 403);
    const db = env.DB,
      ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (path.startsWith('/api/report-share/'))
      return await reportSharePublic(
        request,
        env,
        path.slice('/api/report-share/'.length),
      );
    if (path.startsWith('/api/shared/') && request.method === 'GET') {
      const token = path.slice(12);
      if (!/^[a-f0-9]{64}$/.test(token)) fail('Liên kết không hợp lệ.', 404);
      const row = await db
        .prepare(
          'SELECT data FROM board_shares WHERE token_hash=? AND expires>?',
        )
        .bind(await hash(token), Date.now())
        .first();
      if (!row) fail('Liên kết hết hạn hoặc đã thu hồi.', 404);
      return json({ data: JSON.parse(row.data) });
    }
    if (path === '/api/me') {
      const u = await session(request, env);

      const profile = await db
        .prepare('SELECT name,birthday,avatar FROM profiles WHERE user_id=?')
        .bind(u.id)
        .first();
      return json({ user: { ...u, ...(profile || {}) } });
    }
    if (path === '/api/push-key') {
      await session(request, env);
      return json({ key: env.VAPID_PUBLIC });
    }
    if (
      [
        '/api/register',
        '/api/login',
        '/api/forgot',
        '/api/reset',
        '/api/verify',
        '/api/resend',
      ].includes(path)
    )
      return await authAPI(request, env, path, ip);
    const u = await session(request, env);
    if (path === '/api/reauth' && request.method === 'POST') {
      await limited(db, 'reauth:' + u.id, 8);
      const b = await body(request),
        row = await db
          .prepare('SELECT password_hash FROM users WHERE id=?')
          .bind(u.id)
          .first();
      if (
        typeof b.password !== 'string' ||
        b.password.length > 128 ||
        !(await passwordMatches(b.password, row.password_hash))
      )
        fail('Mật khẩu chưa đúng.', 401);
      const token = request.headers
        .get('Cookie')
        ?.match(/(?:^|; )zen_session=([a-f0-9]{64})/)?.[1];
      await db
        .prepare('UPDATE sessions SET reauth_at=? WHERE token_hash=?')
        .bind(Date.now(), await hash(token))
        .run();
      return json({ ok: true });
    }
    if (
      u.remembered &&
      u.reauth_at < Date.now() - 600000 &&
      ['/api/board-share', '/api/report-shares'].includes(path) &&
      request.method !== 'GET'
    )
      return json(
        {
          error: 'Nhập lại mật khẩu để xác nhận thao tác này.',
          code: 'REAUTH_REQUIRED',
        },
        403,
      );
    if (path === '/api/workspace-stage')
      return await workspaceStage(request, env, u);
    if (path === '/api/workspace-v2') return await workspaceV2(request, env, u);
    if (path === '/api/sketches' && request.method === 'POST')
      return await sketchAPI(request, env, u);

    if (path === '/api/notification-receipts') {
      if (request.method === 'GET') {
        const rows = await db
          .prepare(
            'SELECT receipt_key FROM notification_receipts WHERE user_id=? ORDER BY CASE WHEN receipt_key=? THEN 0 WHEN receipt_key LIKE ? THEN 1 ELSE 2 END,read_at DESC LIMIT 5000',
          )
          .bind(u.id, 'welcome', 'release:%')
          .all();
        return json({ keys: rows.results.map((row) => row.receipt_key) });
      }
      if (request.method !== 'PUT') fail('Method not allowed', 405);
      await limited(db, 'receipts:' + u.id, 120);
      const b = await body(request);
      if (
        !Array.isArray(b.keys) ||
        !b.keys.length ||
        b.keys.length > 200 ||
        !b.keys.every(
          (key) =>
            typeof key === 'string' &&
            key.length <= 2000 &&
            /^(welcome|release:[0-9.]+|notice:[A-Za-z0-9%_.!~*'():-]+)$/.test(
              key,
            ),
        )
      )
        fail('Thông báo không hợp lệ.');
      await db.batch(
        [...new Set(b.keys)].map((key) =>
          db
            .prepare(
              'INSERT INTO notification_receipts(user_id,receipt_key,read_at) VALUES(?,?,?) ON CONFLICT(user_id,receipt_key) DO UPDATE SET read_at=excluded.read_at',
            )
            .bind(u.id, key, Date.now()),
        ),
      );
      return json({ ok: true });
    }
    if (path === '/api/report-shares')
      return await reportShareOwner(request, env, u);
    if (path === '/api/activity' && request.method === 'POST') {
      const token = request.headers
        .get('Cookie')
        ?.match(/(?:^|; )zen_session=([a-f0-9]{64})/)?.[1];
      const expires = u.remembered ? u.session_expires : Date.now() + 600000;
      const updated = await db
        .prepare(
          'UPDATE sessions SET expires=? WHERE token_hash=? AND expires>?',
        )
        .bind(expires, await hash(token), Date.now())
        .run();
      if (!updated.meta.changes) fail('Phiên đăng nhập đã hết hạn.', 401);
      return json({ expires });
    }
    if (path === '/api/resources' && request.method === 'GET')
      return await resourceList(request, env, u);
    if (path === '/api/board-share' && request.method === 'POST') {
      const b = await body(request);
      if (b.revoke) {
        await db
          .prepare('DELETE FROM board_shares WHERE user_id=?')
          .bind(u.id)
          .run();
        return json({ ok: true });
      }
      const row = await workspaceRow(db, u.id);
      if (!row) fail('Bảng chưa đồng bộ.');
      const source = JSON.parse(row.data);
      if (
        typeof b.boardId !== 'string' ||
        (b.boardId !== '' &&
          (!/^[A-Za-z0-9_-]{1,100}$/.test(b.boardId) ||
            !(source.notes || []).some(
              (n) => n.id === b.boardId && n.type === 'board',
            )))
      )
        fail('Bảng chia sẻ không hợp lệ.');
      await limited(db, 'board-share:' + u.id, 20);
      const ids = new Set([b.boardId]);
      let change = true;
      while (change) {
        change = false;
        for (const n of source.notes || [])
          if (ids.has(n.boardId || '') && !ids.has(n.id)) {
            ids.add(n.id);
            change = true;
          }
      }
      const notes = (source.notes || [])
        .filter((n) => ids.has(n.id) && n.id !== b.boardId)
        .map((n) => ({
          ...n,
          boardId: n.boardId === b.boardId ? '' : n.boardId,
          fileId: '',
        }));
      if (new TextEncoder().encode(JSON.stringify(notes)).length > 1500000)
        fail('Bảng chia sẻ quá lớn. Hãy chia sẻ một bảng con.', 413);
      const token = random();
      await db
        .prepare(
          'INSERT INTO board_shares(token_hash,user_id,data,expires) VALUES(?,?,?,?)',
        )
        .bind(
          await hash(token),
          u.id,
          JSON.stringify({ schema: 1, projects: [], notes }),
          Date.now() + 7 * 86400000,
        )
        .run();
      return json({ url: ORIGIN + '/?boardshare=' + token });
    }
    if (path === '/api/file-updates' && request.method === 'GET') {
      const cursor = Date.now(),
        since = Number(new URL(request.url).searchParams.get('since'));
      if (!Number.isSafeInteger(since) || since < 0)
        fail('Mốc thời gian không hợp lệ.');
      const rows = await db
        .prepare(
          "SELECT id,name,created FROM object_files WHERE user_id=? AND state='ready' AND deleted=0 AND created>? AND created<=? ORDER BY created ASC LIMIT 100",
        )
        .bind(u.id, since, cursor)
        .all();
      return json({
        files: rows.results,
        cursor:
          rows.results.length === 100 ? rows.results.at(-1).created : cursor,
      });
    }
    if (path.startsWith('/api/assets')) {
      const result = await assetAPI(request, env, u);
      if (result) return result;
    }
    if (path === '/api/logout' && request.method === 'POST') {
      const token = request.headers
        .get('Cookie')
        ?.match(/zen_session=([a-f0-9]{64})/)?.[1];
      await db
        .prepare('DELETE FROM sessions WHERE token_hash=?')
        .bind(await hash(token))
        .run();
      return json({ ok: true }, 200, {
        'Set-Cookie':
          'zen_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
      });
    }
    if (path === '/api/files' && request.method === 'GET') {
      const url = new URL(request.url);
      const rows = await db
        .prepare(
          'SELECT id,name,size FROM attachments WHERE user_id=? AND project_id=? AND task_id=? AND deleted=0 ORDER BY created DESC',
        )
        .bind(
          u.id,
          url.searchParams.get('project') || '',
          url.searchParams.get('task') || '',
        )
        .all();
      return json({ files: rows.results });
    }
    if (path.startsWith('/api/files/') && request.method === 'GET') {
      const f = await db
        .prepare(
          'SELECT name,content FROM attachments WHERE id=? AND user_id=? AND deleted=0',
        )
        .bind(path.slice(11), u.id)
        .first();
      if (!f) fail('Không tìm thấy tệp.', 404);
      const bytes = Uint8Array.from(atob(f.content), (c) => c.charCodeAt(0)),
        head = Array.from(bytes.slice(0, 12)),
        type =
          head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71
            ? 'image/png'
            : head[0] === 255 && head[1] === 216 && head[2] === 255
              ? 'image/jpeg'
              : String.fromCharCode(...head.slice(0, 3)) === 'GIF'
                ? 'image/gif'
                : String.fromCharCode(...head.slice(0, 4)) === 'RIFF' &&
                    String.fromCharCode(...head.slice(8, 12)) === 'WEBP'
                  ? 'image/webp'
                  : String.fromCharCode(...head.slice(0, 5)) === '%PDF-'
                    ? 'application/pdf'
                    : 'application/octet-stream',
        inline =
          new URL(request.url).searchParams.get('preview') === '1' &&
          type !== 'application/octet-stream';
      return new Response(bytes, {
        headers: {
          'Content-Type': inline ? type : 'application/octet-stream',
          'Content-Disposition':
            (inline ? 'inline' : 'attachment') +
            "; filename*=UTF-8''" +
            encodeURIComponent(f.name),
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (
      /^\/api\/legacy-files\/[a-f0-9-]+\/(trash|restore)$/.test(path) &&
      request.method === 'POST'
    ) {
      await db
        .prepare('UPDATE attachments SET deleted=? WHERE id=? AND user_id=?')
        .bind(
          path.endsWith('/trash') ? Date.now() : 0,
          path.split('/')[3],
          u.id,
        )
        .run();
      return json({ ok: true });
    }
    if (path === '/api/files' && request.method === 'POST') {
      const b = await body(request);
      if (
        typeof b.name !== 'string' ||
        !b.name.trim() ||
        b.name.length > 200 ||
        typeof b.content !== 'string' ||
        b.content.length > 1398104 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          b.content,
        )
      )
        fail('Tệp không hợp lệ hoặc vượt 1 MB.');
      const size = atob(b.content).length;
      if (size > 1048576) fail('Tối đa 1 MB.');
      const w = await workspaceRow(db, u.id),
        p = w && JSON.parse(w.data).projects.find((p) => p.id === b.project);
      if (!p || (b.task && !p.tasks.some((t) => t.id === b.task)))
        fail('Hãy đồng bộ dự án trước khi tải tệp.');
      const id = crypto.randomUUID();
      const result = await db
        .prepare(
          'INSERT INTO attachments(id,user_id,project_id,task_id,name,content,size,created) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(size),0) FROM attachments WHERE user_id=?)+?<=20971520 AND (SELECT COALESCE(SUM(size),0) FROM object_files)+(SELECT COALESCE(SUM(size),0) FROM attachments)+?<=1000000000',
        )
        .bind(
          id,
          u.id,
          p.id,
          b.task || '',
          b.name,
          b.content,
          size,
          Date.now(),
          u.id,
          size,
          size,
        )
        .run();
      if (!result.meta.changes) fail('Kho tệp đã đầy (20 MB).');
      return json({ id });
    }
    if (path === '/api/note-history' && request.method === 'GET') {
      const id = new URL(request.url).searchParams.get('id');
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id || ''))
        fail('Ghi chú không hợp lệ.');
      return json({
        versions: (
          await db
            .prepare(
              'SELECT revision,saved,data FROM note_versions WHERE user_id=? AND note_id=? AND saved>=? ORDER BY revision DESC',
            )
            .bind(u.id, id, Date.now() - 7 * 86400000)
            .all()
        ).results.map((v) => ({ ...v, data: JSON.parse(v.data) })),
      });
    }
    if (path === '/api/workspace') {
      const normalized = await readWorkspace(db, u.id);
      if (normalized) {
        if (request.method !== 'GET')
          return json(
            {
              error: 'Hãy tải lại ứng dụng để dùng đồng bộ mới.',
              code: 'UPGRADE_REQUIRED',
            },
            409,
          );
        const rev = new URL(request.url).searchParams.get('revision');
        return json(
          rev !== null && String(normalized.revision) === rev
            ? { unchanged: true, revision: normalized.revision }
            : normalized,
        );
      }

      if (request.method === 'GET') {
        const since = new URL(request.url).searchParams.get('revision');
        if (since !== null && /^\d+$/.test(since)) {
          const meta = await db
            .prepare('SELECT revision FROM workspaces WHERE user_id=?')
            .bind(u.id)
            .first();
          if (Number(since) === (meta?.revision || 0))
            return json({ unchanged: true, revision: meta?.revision || 0 });
        }
        const row = await db
          .prepare('SELECT data,revision FROM workspaces WHERE user_id=?')
          .bind(u.id)
          .first();
        return json(
          row
            ? { data: JSON.parse(row.data), revision: row.revision }
            : { data: { schema: 1, projects: [] }, revision: 0 },
        );
      }
      if (request.method === 'PUT') {
        const b = await body(request);
        if (!Number.isSafeInteger(b.revision) || b.revision < 0)
          return json(
            {
              error:
                'Mốc phiên bản đồng bộ không hợp lệ. Bản nháp chưa bị ghi đè.',
              code: 'INVALID_REVISION',
            },
            400,
          );
        if (!validWorkspace(b.data))
          return json(
            { error: 'Dữ liệu dự án không hợp lệ.', code: 'INVALID_WORKSPACE' },
            400,
          );
        const raw = JSON.stringify(b.data);
        await db
          .prepare(
            'INSERT OR IGNORE INTO workspaces(user_id,data,revision) VALUES(?,?,0)',
          )
          .bind(u.id, '{"schema":1,"projects":[]}')
          .run();
        const results = await db.batch([
          db
            .prepare(
              "INSERT OR IGNORE INTO note_versions(user_id,note_id,revision,saved,data) SELECT w.user_id,json_extract(n.value,'$.id'),w.revision,?,n.value FROM workspaces w,json_each(w.data,'$.notes') n WHERE w.user_id=? AND w.revision=? AND NOT EXISTS(SELECT 1 FROM json_each(?,'$.notes') fresh WHERE json_extract(fresh.value,'$.id')=json_extract(n.value,'$.id') AND fresh.value=n.value)",
            )
            .bind(Date.now(), u.id, b.revision, raw),
          db
            .prepare(
              'UPDATE workspaces SET data=?,revision=revision+1 WHERE user_id=? AND revision=? AND NOT EXISTS(SELECT 1 FROM workspace_state WHERE user_id=workspaces.user_id) RETURNING revision',
            )
            .bind(raw, u.id, b.revision),
          ...taskAssetStatements(db, u.id, raw, b.revision + 1),
        ]);
        const result = results[1].results?.[0];
        if (!result)
          return json(
            {
              error:
                'Dữ liệu đã đổi trên thiết bị khác. Bản chỉnh sửa của bạn được giữ lại để xử lý xung đột.',
            },
            409,
          );
        return json({ revision: result.revision });
      }
    }
    if (path === '/api/profile' && request.method === 'PUT') {
      const b = await body(request),
        name = String(b.name || '').trim(),
        birthday = String(b.birthday || ''),
        avatar = String(b.avatar || '');
      if (
        name.length > 100 ||
        (birthday &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
            isNaN(Date.parse(birthday)) ||
            new Date(birthday).toISOString().slice(0, 10) !== birthday ||
            birthday > new Date().toISOString().slice(0, 10))) ||
        (avatar &&
          (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
            avatar,
          ) ||
            avatar.length > 180000))
      )
        fail('Thông tin hồ sơ không hợp lệ.');
      await db
        .prepare(
          'INSERT INTO profiles(user_id,name,birthday,avatar) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,birthday=excluded.birthday,avatar=excluded.avatar',
        )
        .bind(u.id, name, birthday, avatar)
        .run();
      return json({ name, birthday, avatar });
    }
    if (path === '/api/weekly-report' && request.method === 'GET') {
      const w = await workspaceRow(db, u.id),
        previous = await db
          .prepare(
            'SELECT data FROM report_snapshots WHERE user_id=? ORDER BY day DESC LIMIT 1',
          )
          .bind(u.id)
          .first();
      return json(
        weeklyReport(
          w ? JSON.parse(w.data) : { projects: [] },
          reportDate(),
          previous ? JSON.parse(previous.data) : null,
        ),
      );
    }
    if (path === '/api/preferences' && request.method === 'PUT') {
      const b = await body(request),
        hour = b.hour ?? u.reminder_hour,
        days = b.days ?? u.reminder_days,
        weeklyHour = b.weeklyHour ?? u.weekly_hour,
        weeklyDay = b.weeklyDay ?? u.weekly_day;
      for (const k of ['emailReminders', 'weeklyReports', 'repeatAlerts'])
        if (b[k] !== undefined && typeof b[k] !== 'boolean')
          fail('Cài đặt thông báo không hợp lệ.');
      if (
        !Number.isInteger(weeklyDay) ||
        weeklyDay < 0 ||
        weeklyDay > 6 ||
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour > 23 ||
        !Number.isInteger(weeklyHour) ||
        weeklyHour < 0 ||
        weeklyHour > 23 ||
        ![1, 2, 3, 7].includes(days)
      )
        fail('Giờ hoặc tần suất không hợp lệ.');
      const preferences = {
        email_reminders:
          b.emailReminders === undefined
            ? u.email_reminders
            : Number(b.emailReminders),
        reminder_hour: hour,
        reminder_days: days,
        weekly_reports:
          b.weeklyReports === undefined
            ? u.weekly_reports
            : Number(b.weeklyReports),
        weekly_hour: weeklyHour,
        weekly_day: weeklyDay,
        repeat_alerts:
          b.repeatAlerts === undefined
            ? u.repeat_alerts
            : Number(b.repeatAlerts),
      };
      await db.batch([
        db
          .prepare('UPDATE users SET email_reminders=? WHERE id=?')
          .bind(preferences.email_reminders, u.id),
        db
          .prepare(
            'INSERT INTO reminder_settings(user_id,hour,interval_days) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET hour=excluded.hour,interval_days=excluded.interval_days',
          )
          .bind(u.id, hour, days),
        db
          .prepare(
            'INSERT INTO notification_preferences(user_id,weekly_reports,weekly_hour,weekly_day,repeat_alerts) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET weekly_reports=excluded.weekly_reports,weekly_hour=excluded.weekly_hour,weekly_day=excluded.weekly_day,repeat_alerts=excluded.repeat_alerts',
          )
          .bind(
            u.id,
            preferences.weekly_reports,
            weeklyHour,
            weeklyDay,
            preferences.repeat_alerts,
          ),
      ]);
      return json({ ok: true, ...preferences });
    }

    if (path === '/api/push' && request.method === 'POST') {
      const b = await body(request);
      if (!pushHost(b.endpoint)) fail('Dịch vụ thông báo không được hỗ trợ.');
      await db
        .prepare(
          'INSERT INTO subscriptions(endpoint,user_id) VALUES(?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id',
        )
        .bind(b.endpoint, u.id)
        .run();
      return json({ ok: true });
    }
    if (path === '/api/push' && request.method === 'DELETE') {
      const b = await body(request);
      await db
        .prepare('DELETE FROM subscriptions WHERE user_id=? AND endpoint=?')
        .bind(u.id, String(b.endpoint || ''))
        .run();
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json(
      {
        error: e.status
          ? e.message
          : 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.',
      },
      e.status || 503,
    );
  }
}
export async function daily(...args) {
  return notificationDaily(...args);
}
export function activeNoteReminder(n) {
  return (
    !!n.remindAt &&
    !(n.type === 'todo' && n.items?.length && n.items.every((i) => i.done))
  );
}
export async function noteChannel(n) {
  return (
    'note:' +
    n.id +
    ':' +
    (await hash(n.remindAt + '|' + (n.remindBefore ?? 60))).slice(0, 20)
  );
}
