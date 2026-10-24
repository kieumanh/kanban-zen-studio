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

CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id TEXT NOT NULL,task_id TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,content TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS attachments_owner ON attachments(user_id,project_id,task_id);
