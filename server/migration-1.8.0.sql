CREATE TABLE IF NOT EXISTS report_shares(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,html TEXT NOT NULL,password_hash TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS report_shares_owner ON report_shares(user_id,expires);
CREATE INDEX IF NOT EXISTS report_shares_expiry ON report_shares(expires);
