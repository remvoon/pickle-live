-- Migration 0011: Allow players on multiple teams (for Royal Rumble format)
-- Drop old unique indexes that restrict players to 1 team per event
DROP INDEX IF EXISTS idx_teams_event_player1;
DROP INDEX IF EXISTS idx_teams_event_player2;
-- New composite index: only the same (player1, player2) pair is unique per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_event_pair ON teams(event_id, player1_id, player2_id);
