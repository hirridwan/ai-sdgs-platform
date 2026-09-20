-- Migration 0004: sessions
-- Menyimpan token sesi login tim, supaya logout & audit login mudah dilakukan
-- (dibanding JWT stateless yang tidak bisa langsung dicabut).

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                -- token acak (dikirim ke client sebagai cookie httpOnly)
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_team ON sessions(team_id);
