CREATE TABLE IF NOT EXISTS note_versions(user_id TEXT NOT NULL,note_id TEXT NOT NULL,revision INTEGER NOT NULL,saved INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,note_id,revision));
CREATE INDEX IF NOT EXISTS note_versions_saved ON note_versions(saved);
