-- Migration 0005: Add server number tracking for side-out scoring proper 2-server system
-- In traditional pickleball doubles:
--   The starting team at 0-0 gets only 1 server (server_number=1). Fault → side-out.
--   After first side-out, each team gets 2 servers (server_number=1 then 2).
--   Server 1 faults → switch to Server 2. Server 2 faults → side-out.

ALTER TABLE matches ADD COLUMN current_server_number INTEGER DEFAULT 1;
ALTER TABLE matches ADD COLUMN starting_team_done INTEGER DEFAULT 0;
