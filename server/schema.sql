-- Passwords use salted PBKDF2-SHA256; sessions and one-use email tokens store only SHA-256 digests.
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,verified INTEGER DEFAULT 0,email_reminders INTEGER DEFAULT 0,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL,remembered INTEGER NOT NULL DEFAULT 0,reauth_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY,data TEXT NOT NULL,revision INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS subscriptions(endpoint TEXT PRIMARY KEY,user_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS deliveries(user_id TEXT NOT NULL,day TEXT NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(user_id,day,channel));

CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS tokens_user_kind ON tokens(user_id,kind);
CREATE INDEX IF NOT EXISTS tokens_expires ON tokens(expires);
CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS rate_limits_expires ON rate_limits(expires);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL DEFAULT '',birthday TEXT NOT NULL DEFAULT '',avatar TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS reminder_settings(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,hour INTEGER NOT NULL DEFAULT 8,interval_days INTEGER NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id TEXT NOT NULL,task_id TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,content TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS attachments_owner ON attachments(user_id,project_id,task_id);
CREATE TABLE IF NOT EXISTS object_files(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,object_key TEXT NOT NULL,upload_id TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,scope TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS object_owner_scope ON object_files(user_id,scope,deleted);
CREATE TABLE IF NOT EXISTS object_parts(file_id TEXT NOT NULL,part INTEGER NOT NULL,etag TEXT NOT NULL,PRIMARY KEY(file_id,part));

CREATE TABLE IF NOT EXISTS board_shares(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,expires INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS notification_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,weekly_reports INTEGER NOT NULL DEFAULT 0,weekly_hour INTEGER NOT NULL DEFAULT 8,weekly_day INTEGER NOT NULL DEFAULT 0 CHECK(weekly_day BETWEEN 0 AND 6),repeat_alerts INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS report_snapshots(user_id TEXT NOT NULL,day TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,day));
CREATE TABLE IF NOT EXISTS notification_jobs(user_id TEXT NOT NULL,day TEXT NOT NULL,channel TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,snapshot TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',lease_until INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',html TEXT NOT NULL DEFAULT '',PRIMARY KEY(user_id,day,channel));
CREATE TABLE IF NOT EXISTS report_shares(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,html TEXT NOT NULL,password_hash TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS report_shares_owner ON report_shares(user_id,expires);
CREATE INDEX IF NOT EXISTS report_shares_expiry ON report_shares(expires);


CREATE TABLE IF NOT EXISTS notification_receipts (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, receipt_key TEXT NOT NULL, read_at INTEGER NOT NULL, PRIMARY KEY(user_id,receipt_key));

CREATE TABLE IF NOT EXISTS note_versions(user_id TEXT NOT NULL,note_id TEXT NOT NULL,revision INTEGER NOT NULL,saved INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,note_id,revision));
CREATE INDEX IF NOT EXISTS note_versions_saved ON note_versions(saved);

CREATE TABLE IF NOT EXISTS note_reminder_schedule(
 user_id TEXT NOT NULL,note_id TEXT NOT NULL,fire_at INTEGER NOT NULL,expires INTEGER NOT NULL,
 schedule_key TEXT NOT NULL,payload TEXT NOT NULL,queued INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,note_id));
CREATE INDEX IF NOT EXISTS note_reminder_due ON note_reminder_schedule(queued,fire_at,expires);
CREATE INDEX IF NOT EXISTS notification_jobs_pending ON notification_jobs(status,lease_until,day);
CREATE TRIGGER IF NOT EXISTS note_schedule_insert AFTER INSERT ON workspaces BEGIN DELETE FROM note_reminder_schedule WHERE user_id=NEW.user_id AND note_id NOT IN(SELECT json_extract(n.value,'$.id') FROM json_each(NEW.data,'$.notes') n WHERE json_extract(n.value,'$.remindEmail')=1 AND length(COALESCE(json_extract(n.value,'$.remindAt'),''))=16 AND NOT(COALESCE(json_extract(n.value,'$.type'),'note')='todo' AND json_array_length(n.value,'$.items')>0 AND NOT EXISTS(SELECT 1 FROM json_each(n.value,'$.items') i WHERE json_extract(i.value,'$.done')=0)));
INSERT INTO note_reminder_schedule SELECT NEW.user_id,json_extract(n.value,'$.id'),unixepoch(json_extract(n.value,'$.remindAt')||'+07:00')*1000-COALESCE(json_extract(n.value,'$.remindBefore'),60)*60000,unixepoch(json_extract(n.value,'$.remindAt')||'+07:00')*1000+86400000,json_extract(n.value,'$.remindAt')||'|'||COALESCE(json_extract(n.value,'$.remindBefore'),60),n.value,0 FROM json_each(NEW.data,'$.notes') n WHERE json_extract(n.value,'$.remindEmail')=1 AND length(COALESCE(json_extract(n.value,'$.remindAt'),''))=16 AND NOT(COALESCE(json_extract(n.value,'$.type'),'note')='todo' AND json_array_length(n.value,'$.items')>0 AND NOT EXISTS(SELECT 1 FROM json_each(n.value,'$.items') i WHERE json_extract(i.value,'$.done')=0)) ON CONFLICT(user_id,note_id) DO UPDATE SET fire_at=excluded.fire_at,expires=excluded.expires,payload=excluded.payload,queued=CASE WHEN note_reminder_schedule.schedule_key=excluded.schedule_key THEN note_reminder_schedule.queued ELSE 0 END,schedule_key=excluded.schedule_key; END;
CREATE TRIGGER IF NOT EXISTS note_schedule_update AFTER UPDATE OF data ON workspaces BEGIN DELETE FROM note_reminder_schedule WHERE user_id=NEW.user_id AND note_id NOT IN(SELECT json_extract(n.value,'$.id') FROM json_each(NEW.data,'$.notes') n WHERE json_extract(n.value,'$.remindEmail')=1 AND length(COALESCE(json_extract(n.value,'$.remindAt'),''))=16 AND NOT(COALESCE(json_extract(n.value,'$.type'),'note')='todo' AND json_array_length(n.value,'$.items')>0 AND NOT EXISTS(SELECT 1 FROM json_each(n.value,'$.items') i WHERE json_extract(i.value,'$.done')=0)));
INSERT INTO note_reminder_schedule SELECT NEW.user_id,json_extract(n.value,'$.id'),unixepoch(json_extract(n.value,'$.remindAt')||'+07:00')*1000-COALESCE(json_extract(n.value,'$.remindBefore'),60)*60000,unixepoch(json_extract(n.value,'$.remindAt')||'+07:00')*1000+86400000,json_extract(n.value,'$.remindAt')||'|'||COALESCE(json_extract(n.value,'$.remindBefore'),60),n.value,0 FROM json_each(NEW.data,'$.notes') n WHERE json_extract(n.value,'$.remindEmail')=1 AND length(COALESCE(json_extract(n.value,'$.remindAt'),''))=16 AND NOT(COALESCE(json_extract(n.value,'$.type'),'note')='todo' AND json_array_length(n.value,'$.items')>0 AND NOT EXISTS(SELECT 1 FROM json_each(n.value,'$.items') i WHERE json_extract(i.value,'$.done')=0)) ON CONFLICT(user_id,note_id) DO UPDATE SET fire_at=excluded.fire_at,expires=excluded.expires,payload=excluded.payload,queued=CASE WHEN note_reminder_schedule.schedule_key=excluded.schedule_key THEN note_reminder_schedule.queued ELSE 0 END,schedule_key=excluded.schedule_key; END;
CREATE TRIGGER IF NOT EXISTS note_schedule_delete AFTER DELETE ON workspaces BEGIN DELETE FROM note_reminder_schedule WHERE user_id=OLD.user_id; END;

CREATE TABLE IF NOT EXISTS workspace_state(user_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,nonce TEXT NOT NULL,total_bytes INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS workspace_entities(user_id TEXT NOT NULL,entity_key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,entity_key));

CREATE TABLE IF NOT EXISTS workspace_transfers(user_id TEXT PRIMARY KEY,upload_id TEXT NOT NULL,revision INTEGER NOT NULL,expected INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS workspace_pending(user_id TEXT NOT NULL,upload_id TEXT NOT NULL,entity_key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,upload_id,entity_key));
