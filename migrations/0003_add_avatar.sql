-- Migration 0003: Add avatar column to participants for profile pictures
ALTER TABLE participants ADD COLUMN avatar TEXT DEFAULT '';
