-- Sesi pembelajaran, terpisah dari sesi autentikasi.
CREATE TABLE IF NOT EXISTS debate_runs (
  id TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  backend TEXT NOT NULL,
  position TEXT,
  issue_json TEXT NOT NULL,
  impact_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, id)
);
CREATE INDEX IF NOT EXISTS idx_debate_runs_team ON debate_runs(team_id, created_at);
