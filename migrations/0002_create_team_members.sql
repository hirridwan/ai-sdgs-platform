-- Migration 0002: team_members
-- Anggota tim, relasi many-to-one ke teams. Dipisah dari teams supaya
-- jumlah anggota bebas ditambah/dihapus tanpa mengubah struktur kolom teams.

CREATE TABLE IF NOT EXISTS team_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,      -- urutan tampil di UI
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
