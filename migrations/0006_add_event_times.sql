-- Migration 0006: Add start_time and end_time to events table
ALTER TABLE events ADD COLUMN start_time TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN end_time TEXT DEFAULT '';
