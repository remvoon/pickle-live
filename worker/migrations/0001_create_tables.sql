-- Migration 0001: Create all tables for pickle-live tournament management

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT DEFAULT '',
  paddle TEXT DEFAULT '',
  handedness TEXT DEFAULT '' CHECK(handedness IN ('lefty','righty','')),
  email TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_event_player1 ON teams(event_id, player1_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_event_player2 ON teams(event_id, player2_id);

CREATE TABLE IF NOT EXISTS stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scoring_type TEXT NOT NULL DEFAULT 'rally' CHECK(scoring_type IN ('rally','sideout')),
  points_to_win INTEGER NOT NULL DEFAULT 21,
  deuce_allowed INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groups_t (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'round_robin' CHECK(stage_type IN ('round_robin','knockout')),
  round_number INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_teams (
  group_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  PRIMARY KEY (group_id, team_id),
  FOREIGN KEY (group_id) REFERENCES groups_t(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stage_groups (
  stage_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  PRIMARY KEY (stage_id, group_id),
  FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups_t(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  team1_id INTEGER NOT NULL,
  team2_id INTEGER NOT NULL,
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
  FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups_t(id) ON DELETE CASCADE,
  FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  point_number INTEGER NOT NULL,
  team1_score_before INTEGER NOT NULL,
  team2_score_before INTEGER NOT NULL,
  rally_winner_team INTEGER NOT NULL CHECK(rally_winner_team IN (1,2)),
  server_player_id INTEGER DEFAULT NULL,
  server_side TEXT DEFAULT '' CHECK(server_side IN ('left','right','')),
  scoring_type_at_time TEXT NOT NULL DEFAULT 'rally' CHECK(scoring_type_at_time IN ('rally','sideout')),
  side_out INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_points_match_id ON match_points(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(stage_id);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
