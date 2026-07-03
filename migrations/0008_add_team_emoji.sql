-- Migration 0008: Add emoji column to teams for customizable team animal icons
ALTER TABLE teams ADD COLUMN emoji TEXT DEFAULT '';
