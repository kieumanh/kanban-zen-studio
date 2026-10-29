import { body, fail, json, hash, limited } from './api.mjs';
export async function sketchAPI(request, env, u) {
  if (!env.FILES) fail('Kho R2 chưa sẵn sàng.', 503);
  await limited(env.DB, 'sketch:' + u.id, 100);
  const b = await body(request);
  if (
    typeof b.noteId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(b.noteId) ||
    typeof b.png !== 'string' ||
    b.png.length > 150000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(b.png)
  )
    fail('Phác thảo không hợp lệ.');
  let bytes;
  try {
    bytes = Uint8Array.from(atob(b.png.split(',')[1]), (c) => c.charCodeAt(0));
  } catch {
    fail('Ảnh PNG không hợp lệ.');
  }
  if ([137, 80, 78, 71, 13, 10, 26, 10].some((x, i) => bytes[i] !== x))
    fail('Ảnh PNG không hợp lệ.');
  const digest = await hash(u.id + '|' + b.noteId + '|' + b.png),
    id =
      digest.slice(0, 8) +
      '-' +
      digest.slice(8, 12) +
      '-' +
      digest.slice(12, 16) +
      '-' +
      digest.slice(16, 20) +
      '-' +
      digest.slice(20, 32),
    key = u.id + '/sketch/' + id,
    db = env.DB;
  const prior = await db
    .prepare('SELECT state,deleted FROM object_files WHERE id=? AND user_id=?')
    .bind(id, u.id)
    .first();
  if (prior?.state === 'deleting')
    fail('Tệp đang được dọn. Vui lòng thử lại.', 409);
  if (prior?.state === 'ready' && prior.deleted)
    await db
      .prepare('UPDATE object_files SET deleted=0 WHERE id=? AND user_id=?')
      .bind(id, u.id)
      .run();
  if (prior?.state === 'ready')
    return json({ url: '/api/assets/' + id + '?preview=1' });
  if (!prior) {
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO object_files(id,user_id,object_key,upload_id,name,mime,size,scope,state,created) SELECT ?,?,?,'',?,'image/png',?,?,'uploading',? WHERE (SELECT COALESCE(SUM(size),0) FROM object_files)+(SELECT COALESCE(SUM(size),0) FROM attachments)+?<=1000000000",
      )
      .bind(
        id,
        u.id,
        key,
        'Phác thảo ' + b.noteId + '.png',
        bytes.length,
        'note:' + b.noteId,
        Date.now(),
        bytes.length,
      )
      .run();
    if (!result.meta.changes) fail('Kho R2 đã đầy.', 413);
  }
  await env.FILES.put(key, bytes, {
    httpMetadata: { contentType: 'image/png' },
    storageClass: 'Standard',
  });
  await db
    .prepare("UPDATE object_files SET state='ready' WHERE id=? AND user_id=?")
    .bind(id, u.id)
    .run();
  return json({ url: '/api/assets/' + id + '?preview=1' });
}
