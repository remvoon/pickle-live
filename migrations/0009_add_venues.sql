-- Migration 0009: Saved venues table for reusable venue/court presets
CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  courts TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
