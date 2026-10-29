CREATE TABLE IF NOT EXISTS workspace_state(user_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,nonce TEXT NOT NULL,total_bytes INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS workspace_entities(user_id TEXT NOT NULL,entity_key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,entity_key));

CREATE TABLE IF NOT EXISTS workspace_transfers(user_id TEXT PRIMARY KEY,upload_id TEXT NOT NULL,revision INTEGER NOT NULL,expected INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS workspace_pending(user_id TEXT NOT NULL,upload_id TEXT NOT NULL,entity_key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,upload_id,entity_key));
