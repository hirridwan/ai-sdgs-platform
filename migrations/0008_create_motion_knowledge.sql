-- Migration number: 0008
-- Motion Knowledge Base

-- =========================================================
-- 1. SDG MASTER DATA
-- =========================================================

CREATE TABLE IF NOT EXISTS sdgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sdgs_number
ON sdgs(number);


-- =========================================================
-- 2. RELATION: MOTION <-> SDG
-- Satu mosi dapat terkait dengan beberapa SDG
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_sdgs (
  motion_id INTEGER NOT NULL
    REFERENCES motions(id) ON DELETE CASCADE,

  sdg_id INTEGER NOT NULL
    REFERENCES sdgs(id) ON DELETE CASCADE,

  is_primary INTEGER NOT NULL DEFAULT 0
    CHECK (is_primary IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (motion_id, sdg_id)
);

CREATE INDEX IF NOT EXISTS idx_motion_sdgs_motion
ON motion_sdgs(motion_id);

CREATE INDEX IF NOT EXISTS idx_motion_sdgs_sdg
ON motion_sdgs(sdg_id);


-- =========================================================
-- 3. MOTION CONTEXT
-- Satu mosi memiliki satu konteks utama
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_context (
  motion_id INTEGER PRIMARY KEY
    REFERENCES motions(id) ON DELETE CASCADE,

  background TEXT,
  focus_issue TEXT,
  sdg_context TEXT,
  key_considerations TEXT,
  analysis_framework TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);


-- =========================================================
-- 4. MOTION QUESTIONS
-- Pertanyaan dasar, analitis, dan kritis
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  motion_id INTEGER NOT NULL
    REFERENCES motions(id) ON DELETE CASCADE,

  category TEXT NOT NULL
    CHECK (
      category IN (
        'dasar',
        'analitis',
        'kritis',
        'pendalaman',
        'posisi_debat'
      )
    ),

  question TEXT NOT NULL,

  position INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_motion_questions_motion
ON motion_questions(motion_id);

CREATE INDEX IF NOT EXISTS idx_motion_questions_category
ON motion_questions(motion_id, category);


-- =========================================================
-- 5. MOTION ARGUMENTS
-- Argumen utama PRO / KONTRA
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_arguments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  motion_id INTEGER NOT NULL
    REFERENCES motions(id) ON DELETE CASCADE,

  side TEXT NOT NULL
    CHECK (side IN ('PRO', 'KONTRA')),

  title TEXT NOT NULL,

  explanation TEXT,
  reasoning TEXT,
  evidence_to_find TEXT,

  position INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_motion_arguments_motion
ON motion_arguments(motion_id);

CREATE INDEX IF NOT EXISTS idx_motion_arguments_side
ON motion_arguments(motion_id, side);


-- =========================================================
-- 6. MOTION REBUTTALS
-- Counterargument + rebuttal yang berkaitan dengan argumen
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_rebuttals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  motion_id INTEGER NOT NULL
    REFERENCES motions(id) ON DELETE CASCADE,

  argument_id INTEGER
    REFERENCES motion_arguments(id) ON DELETE SET NULL,

  side TEXT NOT NULL
    CHECK (side IN ('PRO', 'KONTRA')),

  counterargument TEXT NOT NULL,
  rebuttal TEXT NOT NULL,

  position INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_motion_rebuttals_motion
ON motion_rebuttals(motion_id);

CREATE INDEX IF NOT EXISTS idx_motion_rebuttals_argument
ON motion_rebuttals(argument_id);


-- =========================================================
-- 7. MOTION SOURCES
-- Sumber yang direkomendasikan untuk eksplorasi
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  motion_id INTEGER NOT NULL
    REFERENCES motions(id) ON DELETE CASCADE,

  organization TEXT,
  title TEXT,
  url TEXT,
  description TEXT,

  position INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_motion_sources_motion
ON motion_sources(motion_id);


-- =========================================================
-- 8. MOTION KEYWORDS
-- Kata kunci pencarian / eksplorasi
-- =========================================================

CREATE TABLE IF NOT EXISTS motion_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  motion_id INTEGER NOT NULL
    REFERENCES motions(id) ON DELETE CASCADE,

  language TEXT NOT NULL
    CHECK (language IN ('id', 'en')),

  keyword TEXT NOT NULL,

  position INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_motion_keywords_motion
ON motion_keywords(motion_id);

CREATE INDEX IF NOT EXISTS idx_motion_keywords_language
ON motion_keywords(motion_id, language);


-- =========================================================
-- 9. HUBUNGKAN TEAM KE MOTION
-- Tetap mempertahankan kolom motion lama untuk kompatibilitas
-- =========================================================

ALTER TABLE teams
ADD COLUMN motion_id INTEGER
REFERENCES motions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_motion
ON teams(motion_id);