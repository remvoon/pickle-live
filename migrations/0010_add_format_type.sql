-- Migration 0010: Add format_type to events table
ALTER TABLE events ADD COLUMN format_type TEXT DEFAULT '';
