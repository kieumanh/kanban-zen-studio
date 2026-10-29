# Offline shell and note history
Apply server/migration-note-versions.sql once before deploying the updated Worker to an existing database. Fresh databases use server/schema.sql. Production migration was applied on 29 October 2026.
No API request or cron creates tables. Cron alone removes note_versions older than seven days; GET filters expired history without deleting it.
Ordinary authenticated requests read sessions and users only. /api/me and /api/preferences load notification settings. Session token hashing is reused within authentication.

PWA manifest already exists. The build derives a shell cache version from asset contents and embeds an explicit same-origin asset list into sw.js. Install caches the full shell atomically; activation removes prior shell caches. Existing tabs finish before a new worker activates. APIs, health endpoints, report pages and navigation with query strings are never cached.
After one complete online visit, the app shell can open offline. A previously cached account and pending edits can reopen only while the existing ten-minute session window remains valid. Expired sessions require online sign-in. Logout clears the offline account pointer. Local data remains per-account in the existing localStorage store; this is not encrypted storage.
Uploads, server history and remote resources require a connection. Pending edits use the existing revision/conflict mechanism when reconnecting. External web fonts may fall back offline.
