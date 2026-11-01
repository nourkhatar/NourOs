CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS files (
 id TEXT PRIMARY KEY,
 entry_id TEXT NOT NULL,
 collection TEXT NOT NULL CHECK(collection IN ('projects','experience','achievements','documents')),
 original_name TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL,
 byte_size INTEGER NOT NULL,
 visibility TEXT NOT NULL CHECK(visibility IN ('public','private')) DEFAULT 'private',
 allow_download INTEGER NOT NULL CHECK(allow_download IN (0,1)) DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'ready',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS files_by_entry ON files(collection,entry_id,visibility);
