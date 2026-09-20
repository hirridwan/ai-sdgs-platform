-- Migration 0003: ai_interactions
-- Inti data untuk dashboard: setiap kali tim mengirim request ke AI (explore,
-- factCheck, reviewArgument, debate, evaluateSolution) dan mendapat jawaban,
-- dicatat satu baris di sini. Tidak ada kolom penilaian/skor individu.

CREATE TABLE IF NOT EXISTS ai_interactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id        INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,               -- explore | factCheck | reviewArgument | debate | evaluateSolution
  position       TEXT,                        -- PRO | KONTRA (jika relevan untuk action tsb)
  request_text   TEXT NOT NULL,               -- isi request/argumen siswa (claim/reason/evidence/solution/msg digabung)
  request_meta   TEXT,                        -- JSON mentah payload asli, untuk audit/analisis lanjutan
  ai_response    TEXT NOT NULL,               -- teks jawaban akhir dari AI
  ai_meta        TEXT,                        -- JSON: sources, searchQueries, dll (opsional, tergantung action)
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_team ON ai_interactions(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_action ON ai_interactions(action);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(created_at);
