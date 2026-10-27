ALTER TABLE notification_preferences ADD COLUMN weekly_day INTEGER NOT NULL DEFAULT 0 CHECK(weekly_day BETWEEN 0 AND 6);
