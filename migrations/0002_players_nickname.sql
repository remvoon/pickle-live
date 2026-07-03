-- Migration 0002: Add nickname to participants, create global player index

-- Add nickname column (defaults to name)
ALTER TABLE participants ADD COLUMN nickname TEXT DEFAULT '';

-- Create index for global player search (finding players across events)
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);

-- View for deduplicated global player list
-- Shows unique players by name across all events
CREATE VIEW IF NOT EXISTS global_players AS
SELECT 
  MIN(id) AS id,
  name,
  COALESCE(NULLIF(nickname, ''), name) AS display_nickname,
  gender,
  paddle,
  handedness,
  email,
  COUNT(*) AS event_count,
  GROUP_CONCAT(DISTINCT event_id) AS event_ids
FROM participants
GROUP BY name
ORDER BY name ASC;
