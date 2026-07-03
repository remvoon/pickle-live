-- Migration 0004: Add location and courts to events
ALTER TABLE events ADD COLUMN location TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN courts TEXT DEFAULT '[]';
