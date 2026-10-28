
CREATE TABLE IF NOT EXISTS notification_receipts (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, receipt_key TEXT NOT NULL, read_at INTEGER NOT NULL, PRIMARY KEY(user_id,receipt_key));
