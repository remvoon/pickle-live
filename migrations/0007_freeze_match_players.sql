-- Migration 0007: Freeze player names in matches for historical accuracy
ALTER TABLE matches ADD COLUMN team1_player1_name TEXT DEFAULT '';
ALTER TABLE matches ADD COLUMN team1_player2_name TEXT DEFAULT '';
ALTER TABLE matches ADD COLUMN team2_player1_name TEXT DEFAULT '';
ALTER TABLE matches ADD COLUMN team2_player2_name TEXT DEFAULT '';
