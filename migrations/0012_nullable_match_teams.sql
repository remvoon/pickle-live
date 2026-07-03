-- Migration 0012: Allow NULL team references in matches for knockout placeholder slots.
-- Knockout bracket matches are created with TBD teams (NULL) and filled in as teams advance.
-- SQLite doesn't support ALTER COLUMN, so we recreate the table.

CREATE TABLE matches_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  team1_id INTEGER,
  team2_id INTEGER,
  team1_score INTEGER NOT NULL DEFAULT 0,
  team2_score INTEGER NOT NULL DEFAULT 0,
  scheduled_time TEXT DEFAULT '',
  court TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','completed')),
  winner_team_id INTEGER DEFAULT NULL,
  walkover INTEGER NOT NULL DEFAULT 0,
  current_server_team INTEGER DEFAULT NULL,
  current_server_player_id INTEGER DEFAULT NULL,
  current_server_side TEXT DEFAULT '' CHECK(current_server_side IN ('left','right','')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  current_server_number INTEGER DEFAULT 1,
  starting_team_done INTEGER DEFAULT 0,
  team1_player1_name TEXT DEFAULT '',
  team1_player2_name TEXT DEFAULT '',
  team2_player1_name TEXT DEFAULT '',
  team2_player2_name TEXT DEFAULT '',
  FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups_t(id) ON DELETE CASCADE,
  FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE SET NULL
);

INSERT INTO matches_new SELECT * FROM matches;

DROP TABLE matches;

ALTER TABLE matches_new RENAME TO matches;
