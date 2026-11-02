-- Additive only: existing content and files remain untouched.
CREATE TABLE IF NOT EXISTS cv_versions (
 id TEXT PRIMARY KEY,
 file_id TEXT NOT NULL UNIQUE REFERENCES files(id),
 is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_cv ON cv_versions(is_active) WHERE is_active=1;
CREATE TABLE IF NOT EXISTS content_categories (
 id TEXT PRIMARY KEY,
 section TEXT NOT NULL CHECK(section IN ('projects','experience','achievements')),
 name TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(section,name)
);
CREATE INDEX IF NOT EXISTS category_by_section ON content_categories(section,position);
