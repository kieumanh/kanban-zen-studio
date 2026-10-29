/* Reparent task attachments within the same successful workspace CAS transaction. */
export function taskAssetStatements(db, userId, raw, revision) {
  const guard =
    'EXISTS(SELECT 1 FROM workspaces w WHERE w.user_id=? AND w.revision=? AND w.data=?)';
  return [
    db
      .prepare(
        "UPDATE object_files SET scope=(SELECT 'project:'||json_extract(p.value,'$.id')||':task:'||json_extract(t.value,'$.id') FROM workspaces w,json_each(w.data,'$.projects') p,json_each(p.value,'$.tasks') t WHERE w.user_id=object_files.user_id AND json_extract(t.value,'$.id')=substr(object_files.scope,instr(object_files.scope,':task:')+6) LIMIT 1) WHERE user_id=? AND instr(scope,':task:')>0 AND " +
          guard +
          " AND EXISTS(SELECT 1 FROM workspaces w,json_each(w.data,'$.projects') p,json_each(p.value,'$.tasks') t WHERE w.user_id=object_files.user_id AND json_extract(t.value,'$.id')=substr(object_files.scope,instr(object_files.scope,':task:')+6) AND object_files.scope<>'project:'||json_extract(p.value,'$.id')||':task:'||json_extract(t.value,'$.id'))",
      )
      .bind(userId, userId, revision, raw),
    db
      .prepare(
        "UPDATE attachments SET project_id=(SELECT json_extract(p.value,'$.id') FROM workspaces w,json_each(w.data,'$.projects') p,json_each(p.value,'$.tasks') t WHERE w.user_id=attachments.user_id AND json_extract(t.value,'$.id')=attachments.task_id LIMIT 1) WHERE user_id=? AND task_id<>'' AND " +
          guard +
          " AND EXISTS(SELECT 1 FROM workspaces w,json_each(w.data,'$.projects') p,json_each(p.value,'$.tasks') t WHERE w.user_id=attachments.user_id AND json_extract(t.value,'$.id')=attachments.task_id AND attachments.project_id<>json_extract(p.value,'$.id'))",
      )
      .bind(userId, userId, revision, raw),
  ];
}
