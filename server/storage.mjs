import { workspaceRow } from './workspace-store.mjs';
import { json, fail, body, limited } from './api.mjs';
const FILE_CHUNK = 8 * 1024 * 1024,
  FILE_MAX = 25000000,
  STORE_MAX = 1000000000;
export async function assetAPI(request, env, u) {
  const db = env.DB,
    url = new URL(request.url),
    path = url.pathname,
    method = request.method;
  const budget = await db
    .prepare(
      'INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<100000 RETURNING count',
    )
    .bind(
      'r2-month:' + new Date().toISOString().slice(0, 7),
      Date.now() + 35 * 86400000,
    )
    .first();
  if (!budget)
    fail(
      'Đã đạt giới hạn thao tác kho tệp tháng này. Vui lòng thử lại tháng sau.',
      429,
    );

  if (path === '/api/assets' && method === 'GET') {
    const rows = await db
      .prepare(
        "SELECT id,name,size,mime,scope,deleted FROM object_files WHERE user_id=? AND state='ready' AND deleted=0 AND scope=? ORDER BY created DESC",
      )
      .bind(u.id, url.searchParams.get('scope') || '')
      .all();
    const usage = await db
      .prepare(
        'SELECT (SELECT COALESCE(SUM(size),0) FROM object_files)+(SELECT COALESCE(SUM(size),0) FROM attachments) AS used',
      )
      .first();
    return json({
      files: rows.results,
      max: FILE_MAX,
      chunk: FILE_CHUNK,
      used: usage.used,
      quota: STORE_MAX,
    });
  }
  if (path === '/api/assets/purge' && method === 'POST') {
    const b = await body(request);
    if (
      !Array.isArray(b.items) ||
      !b.items.length ||
      b.items.length > 20 ||
      b.items.some(
        (i) =>
          !i ||
          !['r2', 'legacy'].includes(i.source) ||
          typeof i.id !== 'string' ||
          !/^[a-f0-9-]+$/.test(i.id),
      )
    )
      fail('Danh sách tệp không hợp lệ.');
    let removed = 0;
    for (const item of b.items) {
      if (item.source === 'legacy') {
        const result = await db
          .prepare(
            'DELETE FROM attachments WHERE id=? AND user_id=? AND deleted>0',
          )
          .bind(item.id, u.id)
          .run();
        removed += result.meta.changes;
        continue;
      }
      if (!env.FILES) fail('Kho tệp chưa sẵn sàng.', 503);
      const f = await db
        .prepare(
          "UPDATE object_files SET state='deleting' WHERE id=? AND user_id=? AND deleted>0 AND state IN('ready','deleting') RETURNING *",
        )
        .bind(item.id, u.id)
        .first();
      if (!f) continue;
      await env.FILES.delete(f.object_key);
      await db.batch([
        db.prepare('DELETE FROM object_parts WHERE file_id=?').bind(f.id),
        db
          .prepare(
            "DELETE FROM object_files WHERE id=? AND user_id=? AND deleted>0 AND state='deleting'",
          )
          .bind(f.id, u.id),
      ]);
      removed++;
    }
    return json({ ok: true, removed });
  }
  if (path === '/api/assets/trash' && method === 'GET') {
    return json({
      files: (
        await db
          .prepare(
            'SELECT id,name,size,mime,scope,deleted FROM object_files WHERE user_id=? AND deleted>0 ORDER BY deleted DESC',
          )
          .bind(u.id)
          .all()
      ).results,
      legacy: (
        await db
          .prepare(
            'SELECT id,name,size,deleted FROM attachments WHERE user_id=? AND deleted>0',
          )
          .bind(u.id)
          .all()
      ).results,
    });
  }
  if (path === '/api/assets/start' && method === 'POST') {
    const b = await body(request);
    if (!env.FILES) fail('Kho tệp chưa sẵn sàng.', 503);
    if (
      !Number.isSafeInteger(b.size) ||
      b.size <= 0 ||
      b.size > FILE_MAX ||
      typeof b.name !== 'string' ||
      !b.name.trim() ||
      b.name.length > 200 ||
      typeof b.scope !== 'string' ||
      b.scope.length > 200
    )
      fail('Thông tin tệp không hợp lệ.');
    const workspace = await workspaceRow(db, u.id),
      workspaceData = workspace ? JSON.parse(workspace.data) : null;
    const scope = b.scope.split(':');
    if (scope[0] === 'note') {
      if (
        scope.length !== 2 ||
        !workspaceData?.notes?.some((n) => n.id === scope[1])
      )
        fail('Ghi chú chưa đồng bộ.');
    } else if (scope[0] === 'project') {
      const p = workspaceData?.projects.find((p) => p.id === scope[1]);
      if (
        !p ||
        !(
          scope.length === 2 ||
          (scope.length === 4 &&
            scope[2] === 'task' &&
            p.tasks.some((t) => t.id === scope[3]))
        )
      )
        fail('Dự án hoặc task chưa đồng bộ.');
    } else fail('Nơi lưu tệp không hợp lệ.');
    await limited(db, 'upload:' + u.id, 50);
    const id = crypto.randomUUID(),
      key = u.id + '/' + id,
      mime =
        /^(image\/(png|jpeg|gif|webp)|audio\/(mpeg|mp4|ogg|wav|webm)|video\/(mp4|webm|ogg))$/.test(
          b.mime,
        )
          ? b.mime
          : 'application/octet-stream',
      reserved = await db
        .prepare(
          "INSERT INTO object_files(id,user_id,object_key,upload_id,name,mime,size,scope,state,created) SELECT ?,?,?,'',?,?,?,?,'uploading',? WHERE (SELECT COALESCE(SUM(size),0) FROM object_files)+(SELECT COALESCE(SUM(size),0) FROM attachments)+?<=?",
        )
        .bind(
          id,
          u.id,
          key,
          b.name,
          mime,
          b.size,
          b.scope,
          Date.now(),
          b.size,
          STORE_MAX,
        )
        .run();
    if (!reserved.meta.changes)
      fail(
        'Kho Kanban đã đầy (1 GB, gồm Thùng rác và tệp đang tải). Hãy dùng liên kết cho tệp lớn.',
        413,
      );
    try {
      const upload = await env.FILES.createMultipartUpload(key, {
        httpMetadata: { contentType: mime },
        storageClass: 'Standard',
      });
      await db
        .prepare('UPDATE object_files SET upload_id=? WHERE id=?')
        .bind(upload.uploadId, id)
        .run();
    } catch (error) {
      await db.prepare('DELETE FROM object_files WHERE id=?').bind(id).run();
      throw error;
    }
    return json({ id, chunk: FILE_CHUNK });
  }
  const match = path.match(
    /^\/api\/assets\/([a-f0-9-]+)(?:\/(part|complete|abort|trash|restore))?$/,
  );
  if (!match) return null;
  const f = await db
    .prepare('SELECT * FROM object_files WHERE id=? AND user_id=?')
    .bind(match[1], u.id)
    .first();
  if (!f) fail('Không tìm thấy tệp.', 404);
  const action = match[2];
  if (action === 'part' && method === 'PUT') {
    if (f.state !== 'uploading' || f.deleted) fail('Phiên tải đã đóng.');
    const part = Number(url.searchParams.get('n')),
      total = Math.ceil(f.size / FILE_CHUNK),
      expected = part === total ? f.size - (part - 1) * FILE_CHUNK : FILE_CHUNK;
    if (!Number.isInteger(part) || part < 1 || part > total)
      fail('Phần tải không hợp lệ.');
    if (Number(request.headers.get('Content-Length')) !== expected)
      fail('Kích thước phần tải chưa đúng.');
    const uploaded = await env.FILES.resumeMultipartUpload(
      f.object_key,
      f.upload_id,
    ).uploadPart(part, request.body);
    await db
      .prepare(
        'INSERT INTO object_parts(file_id,part,etag) VALUES(?,?,?) ON CONFLICT(file_id,part) DO UPDATE SET etag=excluded.etag',
      )
      .bind(f.id, part, uploaded.etag)
      .run();
    return json({ ok: true });
  }
  if (action === 'complete' && method === 'POST') {
    if (f.state === 'ready') return json({ id: f.id });
    if (f.state !== 'uploading') fail('Phiên tải đã đóng.');
    const parts = (
      await db
        .prepare(
          'SELECT part AS partNumber,etag FROM object_parts WHERE file_id=? ORDER BY part',
        )
        .bind(f.id)
        .all()
    ).results;
    if (parts.length !== Math.ceil(f.size / FILE_CHUNK))
      fail('Tệp chưa tải đủ.');
    await env.FILES.resumeMultipartUpload(f.object_key, f.upload_id).complete(
      parts,
    );
    await db.batch([
      db
        .prepare(
          "UPDATE object_files SET state='ready',created=? WHERE id=? AND user_id=?",
        )
        .bind(Date.now(), f.id, u.id),
      db.prepare('DELETE FROM object_parts WHERE file_id=?').bind(f.id),
    ]);
    return json({ id: f.id });
  }
  if (action === 'abort' && method === 'POST') {
    if (f.state === 'uploading') {
      await env.FILES.resumeMultipartUpload(f.object_key, f.upload_id).abort();
      await db.batch([
        db
          .prepare('DELETE FROM object_files WHERE id=? AND user_id=?')
          .bind(f.id, u.id),
        db.prepare('DELETE FROM object_parts WHERE file_id=?').bind(f.id),
      ]);
    }
    return json({ ok: true });
  }
  if ((action === 'trash' || action === 'restore') && method === 'POST') {
    if (f.state !== 'ready') fail('Tệp chưa hoàn thành.');
    await db
      .prepare('UPDATE object_files SET deleted=? WHERE id=? AND user_id=?')
      .bind(action === 'trash' ? Date.now() : 0, f.id, u.id)
      .run();
    return json({ ok: true });
  }
  if (!action && method === 'GET') {
    if (f.deleted || f.state !== 'ready') fail('Tệp đã vào Thùng rác.', 404);
    const range = request.headers.get('Range'),
      object = await env.FILES.get(
        f.object_key,
        range ? { range: request.headers } : undefined,
      );
    if (!object) fail('Không tìm thấy tệp.', 404);
    const previewMime =
        f.mime === 'application/octet-stream' && /\.pdf$/i.test(f.name)
          ? 'application/pdf'
          : f.mime,
      inline =
        url.searchParams.get('preview') === '1' &&
        previewMime !== 'application/octet-stream',
      headers = {
        'Content-Type': inline ? previewMime : 'application/octet-stream',
        'Content-Disposition':
          (inline ? 'inline' : 'attachment') +
          "; filename*=UTF-8''" +
          encodeURIComponent(f.name),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Accept-Ranges': 'bytes',
        'Content-Length': String(object.range?.length ?? object.size),
      };
    if (object.range)
      headers['Content-Range'] =
        `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`;
    return new Response(object.body, {
      status: object.range ? 206 : 200,
      headers,
    });
  }
  return null;
}
export async function purgeStorage(env) {
  const cutoff = Date.now() - 30 * 86400000,
    db = env.DB;
  const files = (
    await db
      .prepare(
        "SELECT * FROM object_files WHERE (deleted>0 AND deleted<?) OR (state='uploading' AND created<?) LIMIT 50",
      )
      .bind(cutoff, Date.now() - 86400000)
      .all()
  ).results;
  for (const f of files) {
    if (!env.FILES) continue;
    try {
      if (f.state === 'uploading' && f.upload_id)
        await env.FILES.resumeMultipartUpload(
          f.object_key,
          f.upload_id,
        ).abort();
      else await env.FILES.delete(f.object_key);
      await db.batch([
        db.prepare('DELETE FROM object_files WHERE id=?').bind(f.id),
        db.prepare('DELETE FROM object_parts WHERE file_id=?').bind(f.id),
      ]);
    } catch {
      console.log('storage_cleanup_retry');
    }
  }
  await db
    .prepare('DELETE FROM attachments WHERE deleted>0 AND deleted<?')
    .bind(cutoff)
    .run();
  const rows = (
    await db
      .prepare(
        "SELECT user_id,data,revision FROM workspaces WHERE json_array_length(json_extract(data,'$.trash'))>0 AND NOT EXISTS(SELECT 1 FROM workspace_state WHERE workspace_state.user_id=workspaces.user_id)",
      )
      .all()
  ).results;
  for (const row of rows) {
    const d = JSON.parse(row.data),
      trash = d.trash.filter((x) => x.at > cutoff);
    for (const item of d.trash.filter((x) => x.at <= cutoff)) {
      let v, parent;
      try {
        v = JSON.parse(item.payload);
        parent = item.parent ? JSON.parse(item.parent) : null;
      } catch {
        continue;
      }
      if (!v || typeof v !== 'object' || typeof v.id !== 'string') continue;
      if (item.kind === 'task' && (!parent || typeof parent.id !== 'string'))
        continue;
      let scopes = [];
      if (item.kind === 'note' && !(d.notes || []).some((n) => n.id === v.id))
        scopes = ['note:' + v.id];
      if (item.kind === 'project' && !d.projects.some((p) => p.id === v.id))
        scopes = [
          'project:' + v.id,
          ...(Array.isArray(v.tasks) ? v.tasks : [])
            .filter((t) => t && typeof t.id === 'string')
            .map((t) => 'project:' + v.id + ':task:' + t.id),
        ];
      if (
        item.kind === 'task' &&
        !d.projects
          .find((p) => p.id === parent?.id)
          ?.tasks.some((t) => t.id === v.id)
      )
        scopes = ['project:' + parent.id + ':task:' + v.id];
      for (const scope of scopes) {
        await db
          .prepare(
            'UPDATE object_files SET deleted=? WHERE user_id=? AND scope=? AND deleted=0',
          )
          .bind(item.at, row.user_id, scope)
          .run();
        if (scope.startsWith('project:')) {
          const bits = scope.split(':');
          await db
            .prepare(
              'UPDATE attachments SET deleted=? WHERE user_id=? AND project_id=? AND task_id=? AND deleted=0',
            )
            .bind(item.at, row.user_id, bits[1], bits[3] || '')
            .run();
        }
      }
    }
    if (trash.length !== d.trash.length) {
      d.trash = trash;
      await db
        .prepare(
          'UPDATE workspaces SET data=?,revision=revision+1 WHERE user_id=? AND revision=?',
        )
        .bind(JSON.stringify(d), row.user_id, row.revision)
        .run();
    }
  }
}
