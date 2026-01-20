CREATE TABLE IF NOT EXISTS views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- starting count from analytics
INSERT INTO views (count, updated_at)
SELECT 3386, datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM views);
