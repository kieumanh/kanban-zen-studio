import { flatten, inflate, changesBetween } from '../dist/modules/delta.mjs';
import { json, fail, body, validWorkspace, limited } from './api.mjs';
const MAX_ENTITY = 1500000,
  MAX_TOTAL = 20000000;
const dataBytes = (value) =>
  new TextEncoder().encode(JSON.stringify(value)).length;
export async function workspaceStage(request, env, u) {
  if (request.method !== 'POST') fail('Method not allowed', 405);
  const db = env.DB,
    b = await body(request);
  if (
    typeof b.uploadId !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(b.uploadId) ||
    !Number.isSafeInteger(b.revision) ||
    b.revision < 0 ||
    !Array.isArray(b.changes) ||
    !b.changes.length ||
    b.changes.length > 5000
  )
    fail('Gói thay đổi không hợp lệ.');
  await limited(db, 'workspace-stage:' + u.id, 200);
  await initialize(db, u.id);
  const state = await db
    .prepare('SELECT revision FROM workspace_state WHERE user_id=?')
    .bind(u.id)
    .first();
  if (state.revision !== b.revision)
    return json({ error: 'Dữ liệu đã thay đổi.' }, 409);
  if (b.begin) {
    if (!Number.isInteger(b.expected) || b.expected < 1 || b.expected > 5000)
      fail('Số bản ghi không hợp lệ.');
    await db.batch([
      db.prepare('DELETE FROM workspace_pending WHERE user_id=?').bind(u.id),
      db
        .prepare(
          'INSERT INTO workspace_transfers(user_id,upload_id,revision,expected,expires) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET upload_id=excluded.upload_id,revision=excluded.revision,expected=excluded.expected,expires=excluded.expires',
        )
        .bind(u.id, b.uploadId, b.revision, b.expected, Date.now() + 900000),
    ]);
  }
  const transfer = await db
    .prepare(
      'SELECT * FROM workspace_transfers WHERE user_id=? AND upload_id=? AND expires>?',
    )
    .bind(u.id, b.uploadId, Date.now())
    .first();
  if (!transfer || transfer.revision !== b.revision)
    fail('Phiên gửi dữ liệu đã hết hạn.', 409);
  for (const c of b.changes)
    if (
      !c ||
      typeof c.key !== 'string' ||
      !/^(root:root|(?:project|task|note|trash|template):[A-Za-z0-9_-]{1,100})$/.test(
        c.key,
      ) ||
      c.value === undefined ||
      dataBytes(c.value) > MAX_ENTITY
    )
      fail('Bản ghi không hợp lệ.');
  const usage = await db
    .prepare(
      'SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) AS bytes,COUNT(*) AS count FROM workspace_pending WHERE user_id=? AND upload_id=?',
    )
    .bind(u.id, b.uploadId)
    .first();
  if (
    usage.bytes + b.changes.reduce((n, c) => n + dataBytes(c.value), 0) >
      MAX_TOTAL + 200000 ||
    usage.count + b.changes.length > 5000
  )
    fail('Gói dữ liệu vượt giới hạn.', 413);
  await db.batch(
    b.changes.map((c) =>
      db
        .prepare(
          'INSERT INTO workspace_pending(user_id,upload_id,entity_key,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_transfers WHERE user_id=? AND upload_id=?) ON CONFLICT(user_id,upload_id,entity_key) DO UPDATE SET data=excluded.data',
        )
        .bind(
          u.id,
          b.uploadId,
          c.key,
          JSON.stringify(c.value),
          u.id,
          b.uploadId,
        ),
    ),
  );
  return json({ ok: true });
}
function destructiveChange(before, next) {
  const present = (w, kind, id) =>
    kind === 'note'
      ? w.notes?.some((n) => n.id === id)
      : kind === 'project'
        ? w.projects.some((p) => p.id === id)
        : w.projects.some((p) => p.tasks.some((t) => t.id === id));
  for (const old of before.trash || [])
    if (!(next.trash || []).some((n) => n.id === old.id)) {
      let value;
      try {
        value = JSON.parse(old.payload);
      } catch {
        return true;
      }
      if (
        ['note', 'project', 'task'].includes(old.kind) &&
        !present(next, old.kind, value?.id)
      )
        return true;
    }
  for (const [kind, items] of [
    ['note', before.notes || []],
    ['project', before.projects],
    ['task', before.projects.flatMap((p) => p.tasks)],
  ])
    for (const item of items)
      if (
        !present(next, kind, item.id) &&
        !(next.trash || []).some((t) => {
          try {
            const value = JSON.parse(t.payload);
            return (
              (t.kind === kind && value?.id === item.id) ||
              (t.kind === 'project' &&
                kind === 'task' &&
                value?.tasks?.some((x) => x.id === item.id))
            );
          } catch {
            return false;
          }
        })
      )
        return true;
  return false;
}
function scheduleStatements(db, userId, id, n, guard, nonce) {
  if (
    n?.remindEmail &&
    n.remindAt &&
    !(n.type === 'todo' && n.items?.length && n.items.every((i) => i.done))
  ) {
    const due = Date.parse(n.remindAt + '+07:00');
    return [
      db
        .prepare(
          'INSERT INTO note_reminder_schedule(user_id,note_id,fire_at,expires,schedule_key,payload,queued) SELECT ?,?,?,?,?,?,0 WHERE ' +
            guard +
            ' ON CONFLICT(user_id,note_id) DO UPDATE SET fire_at=excluded.fire_at,expires=excluded.expires,payload=excluded.payload,queued=CASE WHEN note_reminder_schedule.schedule_key=excluded.schedule_key THEN note_reminder_schedule.queued ELSE 0 END,schedule_key=excluded.schedule_key',
        )
        .bind(
          userId,
          id,
          due - (n.remindBefore ?? 60) * 60000,
          due + 86400000,
          n.remindAt + '|' + (n.remindBefore ?? 60),
          JSON.stringify(n),
          userId,
          nonce,
        ),
    ];
  }
  return [
    db
      .prepare(
        'DELETE FROM note_reminder_schedule WHERE user_id=? AND note_id=? AND ' +
          guard,
      )
      .bind(userId, id, userId, nonce),
  ];
}
async function saveNoteDelta(db, u, b) {
  if (
    !b.changes.length ||
    b.changes.length > 50 ||
    !b.changes.every(
      (c) =>
        c &&
        typeof c.key === 'string' &&
        c.key.startsWith('note:') &&
        c.value &&
        c.value.id === c.key.slice(5),
    )
  )
    return null;
  const keys = b.changes.map((c) => c.key);
  if (new Set(keys).size !== keys.length) return null;
  const state = await db
    .prepare('SELECT revision,total_bytes FROM workspace_state WHERE user_id=?')
    .bind(u.id)
    .first();
  if (state.revision !== b.revision)
    return json({ error: 'Xung đột phiên bản.' }, 409);
  const rows = (
    await db
      .prepare(
        'SELECT entity_key,data FROM workspace_entities WHERE user_id=? AND entity_key IN (' +
          keys.map(() => '?').join(',') +
          ')',
      )
      .bind(u.id, ...keys)
      .all()
  ).results;
  if (rows.length !== keys.length) return null;
  const prior = new Map(rows.map((r) => [r.entity_key, JSON.parse(r.data)]));
  for (const c of b.changes) {
    const old = prior.get(c.key);
    if (['boardId', 'from', 'to'].some((k) => old[k] !== c.value[k]))
      return null;
    if (!validWorkspace({ schema: 1, projects: [], notes: [c.value] }))
      fail('Ghi chú không hợp lệ.');
    if (dataBytes(c.value) > MAX_ENTITY) fail('Bản ghi vượt giới hạn.', 413);
  }
  const changed = b.changes.filter(
    (c) => JSON.stringify(prior.get(c.key)) !== JSON.stringify(c.value),
  );
  const total =
    state.total_bytes +
    changed.reduce(
      (sum, c) => sum + dataBytes(c.value) - dataBytes(prior.get(c.key)),
      0,
    );
  if (total > MAX_TOTAL) fail('Dữ liệu vượt 20 MB.', 413);
  if (!changed.length) return json({ revision: b.revision });
  const nonce = crypto.randomUUID(),
    revision = b.revision + 1,
    guard = 'EXISTS(SELECT 1 FROM workspace_state WHERE user_id=? AND nonce=?)';
  const statements = [
    db
      .prepare(
        'UPDATE workspace_state SET revision=?,nonce=?,total_bytes=? WHERE user_id=? AND revision=? RETURNING revision',
      )
      .bind(revision, nonce, total, u.id, b.revision),
  ];
  for (const c of changed) {
    const id = c.key.slice(5);
    statements.push(
      db
        .prepare(
          'INSERT OR IGNORE INTO note_versions(user_id,note_id,revision,saved,data) SELECT ?,?,?,?,? WHERE ' +
            guard,
        )
        .bind(
          u.id,
          id,
          b.revision,
          Date.now(),
          JSON.stringify(prior.get(c.key)),
          u.id,
          nonce,
        ),
      db
        .prepare(
          'UPDATE workspace_entities SET data=? WHERE user_id=? AND entity_key=? AND ' +
            guard,
        )
        .bind(JSON.stringify(c.value), u.id, c.key, u.id, nonce),
      ...scheduleStatements(db, u.id, id, c.value, guard, nonce),
    );
  }
  const result = await db.batch(statements);
  return result[0].results?.length
    ? json({ revision })
    : json({ error: 'Xung đột phiên bản.' }, 409);
}
export async function readWorkspace(db, userId) {
  const rows = await db
    .prepare(
      'SELECT e.entity_key,e.data,s.revision FROM workspace_state s JOIN workspace_entities e ON e.user_id=s.user_id WHERE s.user_id=?',
    )
    .bind(userId)
    .all();
  if (!rows.results.length) return null;
  return {
    data: inflate(
      Object.fromEntries(
        rows.results.map((r) => [r.entity_key, JSON.parse(r.data)]),
      ),
    ),
    revision: rows.results[0].revision,
  };
}
export async function workspaceRow(db, userId) {
  const value = await readWorkspace(db, userId);
  return value
    ? { data: JSON.stringify(value.data), revision: value.revision }
    : await db
        .prepare('SELECT data,revision FROM workspaces WHERE user_id=?')
        .bind(userId)
        .first();
}
export async function purgeWorkspaceV2(env) {
  const db = env.DB,
    cutoff = Date.now() - 30 * 86400000;
  const owners = (
    await db
      .prepare(
        "SELECT DISTINCT user_id FROM workspace_entities WHERE entity_key LIKE 'trash:%' AND json_extract(data,'$.at')<=? LIMIT 20",
      )
      .bind(cutoff)
      .all()
  ).results;
  for (const owner of owners) {
    const before = await readWorkspace(db, owner.user_id);
    if (!before) continue;
    const next = structuredClone(before.data),
      expired = (next.trash || []).filter((t) => t.at <= cutoff);
    next.trash = (next.trash || []).filter((t) => t.at > cutoff);
    const response = await workspaceV2(
      new Request('https://kanban.huongthiennature.com/api/workspace-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: before.revision,
          changes: changesBetween(before.data, next),
        }),
      }),
      env,
      { id: owner.user_id },
    );
    if (!response.ok) continue;
    const { revision } = await response.json();
    for (const item of expired) {
      let value, parent;
      try {
        value = JSON.parse(item.payload);
        parent = item.parent ? JSON.parse(item.parent) : null;
      } catch {
        continue;
      }
      if (!value?.id) continue;
      let scopes = [];
      if (item.kind === 'note' && !next.notes?.some((n) => n.id === value.id))
        scopes = ['note:' + value.id];
      if (
        item.kind === 'project' &&
        !next.projects.some((p) => p.id === value.id)
      )
        scopes = [
          'project:' + value.id,
          ...(value.tasks || []).map(
            (t) => 'project:' + value.id + ':task:' + t.id,
          ),
        ];
      if (
        item.kind === 'task' &&
        parent?.id &&
        !next.projects.some((p) => p.tasks.some((t) => t.id === value.id))
      )
        scopes = ['project:' + parent.id + ':task:' + value.id];
      for (const scope of scopes) {
        await db
          .prepare(
            'UPDATE object_files SET deleted=? WHERE user_id=? AND scope=? AND deleted=0 AND EXISTS(SELECT 1 FROM workspace_state WHERE user_id=? AND revision=?)',
          )
          .bind(item.at, owner.user_id, scope, owner.user_id, revision)
          .run();
        if (scope.startsWith('project:')) {
          const parts = scope.split(':');
          await db
            .prepare(
              'UPDATE attachments SET deleted=? WHERE user_id=? AND project_id=? AND task_id=? AND deleted=0 AND EXISTS(SELECT 1 FROM workspace_state WHERE user_id=? AND revision=?)',
            )
            .bind(
              item.at,
              owner.user_id,
              parts[1],
              parts[3] || '',
              owner.user_id,
              revision,
            )
            .run();
        }
      }
    }
  }
}
async function initialize(db, userId) {
  const existing = await db
    .prepare('SELECT revision FROM workspace_state WHERE user_id=?')
    .bind(userId)
    .first();
  if (existing) return;
  const old = await db
    .prepare('SELECT data,revision FROM workspaces WHERE user_id=?')
    .bind(userId)
    .first();
  const entries = flatten(
      old ? JSON.parse(old.data) : { schema: 1, projects: [], notes: [] },
    ),
    nonce = crypto.randomUUID();
  await db
    .prepare(
      'INSERT OR IGNORE INTO workspaces(user_id,data,revision) VALUES(?,?,0)',
    )
    .bind(userId, JSON.stringify({ schema: 1, projects: [], notes: [] }))
    .run();
  await db.batch([
    db
      .prepare(
        'INSERT OR IGNORE INTO workspace_state(user_id,revision,nonce,total_bytes) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspaces WHERE user_id=? AND revision=?)',
      )
      .bind(
        userId,
        old?.revision || 0,
        nonce,
        Object.values(entries).reduce((sum, v) => sum + dataBytes(v), 0),
        userId,
        old?.revision || 0,
      ),
    ...Object.entries(entries).map(([key, value]) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO workspace_entities(user_id,entity_key,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM workspace_state WHERE user_id=? AND nonce=?)',
        )
        .bind(userId, key, JSON.stringify(value), userId, nonce),
    ),
  ]);
}
export async function workspaceV2(request, env, u) {
  const db = env.DB;
  await initialize(db, u.id);
  if (request.method === 'GET') {
    const rev = new URL(request.url).searchParams.get('revision');
    const state = await db
      .prepare('SELECT revision FROM workspace_state WHERE user_id=?')
      .bind(u.id)
      .first();
    if (rev !== null && String(state.revision) === rev)
      return json({ unchanged: true, revision: state.revision });
    return json(await readWorkspace(db, u.id));
  }
  if (request.method !== 'POST') fail('Method not allowed', 405);
  await limited(db, 'workspace-delta:' + u.id, 180);
  const b = await body(request);
  if (
    !Number.isSafeInteger(b.revision) ||
    b.revision < 0 ||
    !Array.isArray(b.changes) ||
    b.changes.length > 5000
  )
    fail('Thay đổi đồng bộ không hợp lệ.');
  if (b.uploadId) {
    const transfer = await db
      .prepare(
        'SELECT expected FROM workspace_transfers WHERE user_id=? AND upload_id=? AND revision=? AND expires>?',
      )
      .bind(u.id, b.uploadId, b.revision, Date.now())
      .first();
    if (!transfer) fail('Phiên gửi dữ liệu không hợp lệ.', 409);
    const rows = (
      await db
        .prepare(
          'SELECT entity_key,data FROM workspace_pending WHERE user_id=? AND upload_id=?',
        )
        .bind(u.id, b.uploadId)
        .all()
    ).results;
    if (rows.length !== transfer.expected) fail('Chưa nhận đủ bản ghi.');
    b.changes = rows.map((row) => ({
      key: row.entity_key,
      value: JSON.parse(row.data),
    }));
  }
  const fast = await saveNoteDelta(db, u, b);
  if (fast) return fast;
  const before = await readWorkspace(db, u.id);
  if (before.revision !== b.revision)
    return json({ error: 'Dữ liệu đã đổi trên thiết bị khác.' }, 409);
  const entities = flatten(before.data),
    seen = new Set();
  for (const change of b.changes) {
    if (
      !change ||
      typeof change.key !== 'string' ||
      !/^(root:root|(?:project|task|note|trash|template):[A-Za-z0-9_-]{1,100})$/.test(
        change.key,
      ) ||
      seen.has(change.key)
    )
      fail('Bản ghi không hợp lệ.');
    seen.add(change.key);
    if (change.value === null) delete entities[change.key];
    else entities[change.key] = change.value;
  }
  let next;
  try {
    next = inflate(entities);
  } catch {
    fail('Thiếu dữ liệu liên kết.');
  }
  if (!validWorkspace(next)) fail('Dữ liệu dự án không hợp lệ.');
  if (
    u.remembered &&
    u.reauth_at < Date.now() - 600000 &&
    destructiveChange(before.data, next)
  )
    return json(
      {
        error: 'Nhập lại mật khẩu để xóa vĩnh viễn dữ liệu.',
        code: 'REAUTH_REQUIRED',
      },
      403,
    );
  const canonical = flatten(next);
  if (new TextEncoder().encode(JSON.stringify(next)).length > MAX_TOTAL)
    fail('Dữ liệu vượt giới hạn 20 MB.', 413);
  for (const value of Object.values(canonical))
    if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_ENTITY)
      fail('Một bản ghi vượt 1,5 MB.', 413);
  const changed = changesBetween(before.data, next);
  const nonce = crypto.randomUUID(),
    revision = b.revision + 1,
    guard = 'EXISTS(SELECT 1 FROM workspace_state WHERE user_id=? AND nonce=?)';
  const statements = [
    db
      .prepare(
        'UPDATE workspace_state SET revision=?,nonce=?,total_bytes=? WHERE user_id=? AND revision=? RETURNING revision',
      )
      .bind(
        revision,
        nonce,
        Object.values(canonical).reduce((sum, v) => sum + dataBytes(v), 0),
        u.id,
        b.revision,
      ),
  ];
  for (const change of changed) {
    if (change.key.startsWith('note:')) {
      const id = change.key.slice(5),
        prior = before.data.notes?.find((n) => n.id === id);
      if (prior)
        statements.push(
          db
            .prepare(
              'INSERT OR IGNORE INTO note_versions(user_id,note_id,revision,saved,data) SELECT ?,?,?,?,? WHERE ' +
                guard,
            )
            .bind(
              u.id,
              id,
              b.revision,
              Date.now(),
              JSON.stringify(prior),
              u.id,
              nonce,
            ),
        );
      statements.push(
        ...scheduleStatements(db, u.id, id, change.value, guard, nonce),
      );
    }

    if (change.value === null)
      statements.push(
        db
          .prepare(
            'DELETE FROM workspace_entities WHERE user_id=? AND entity_key=? AND ' +
              guard,
          )
          .bind(u.id, change.key, u.id, nonce),
      );
    else
      statements.push(
        db
          .prepare(
            'INSERT INTO workspace_entities(user_id,entity_key,data) SELECT ?,?,? WHERE ' +
              guard +
              ' ON CONFLICT(user_id,entity_key) DO UPDATE SET data=excluded.data',
          )
          .bind(u.id, change.key, JSON.stringify(change.value), u.id, nonce),
      );
  }
  for (const p of next.projects)
    for (const t of p.tasks) {
      const prior = before.data.projects.find((p) =>
        p.tasks.some((x) => x.id === t.id),
      );
      if (prior && prior.id !== p.id) {
        statements.push(
          db
            .prepare(
              'UPDATE object_files SET scope=? WHERE user_id=? AND scope=? AND ' +
                guard,
            )
            .bind(
              'project:' + p.id + ':task:' + t.id,
              u.id,
              'project:' + prior.id + ':task:' + t.id,
              u.id,
              nonce,
            ),
          db
            .prepare(
              'UPDATE attachments SET project_id=? WHERE user_id=? AND task_id=? AND ' +
                guard,
            )
            .bind(p.id, u.id, t.id, u.id, nonce),
        );
      }
    }
  const result = await db.batch(statements);
  if (!result[0].results?.length)
    return json({ error: 'Xung đột phiên bản.' }, 409);
  return json({ revision });
}
