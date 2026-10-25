-- Passwords use salted PBKDF2-SHA256; sessions and one-use email tokens store only SHA-256 digests.
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,verified INTEGER DEFAULT 0,email_reminders INTEGER DEFAULT 0,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);
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

CREATE TABLE IF NOT EXISTS notification_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,weekly_reports INTEGER NOT NULL DEFAULT 0,weekly_hour INTEGER NOT NULL DEFAULT 8,repeat_alerts INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS report_snapshots(user_id TEXT NOT NULL,day TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,day));
CREATE TABLE IF NOT EXISTS notification_jobs(user_id TEXT NOT NULL,day TEXT NOT NULL,channel TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,snapshot TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',lease_until INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',html TEXT NOT NULL DEFAULT '',PRIMARY KEY(user_id,day,channel));
CREATE TABLE IF NOT EXISTS report_shares(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,html TEXT NOT NULL,password_hash TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS report_shares_owner ON report_shares(user_id,expires);
CREATE INDEX IF NOT EXISTS report_shares_expiry ON report_shares(expires);
