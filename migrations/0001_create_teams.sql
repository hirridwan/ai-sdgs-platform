-- Migration 0001: teams
-- Satu baris = satu tim debat = satu akun login.
-- Menyimpan identitas tim: username/password login, nama tim, mosi, dan SDG pilihan.

CREATE TABLE IF NOT EXISTS teams (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,               -- hash PBKDF2 (lihat worker/lib/password.ts), format: "<salt_hex>:<hash_hex>"
  team_name     TEXT NOT NULL,
  motion        TEXT,                        -- mosi debat tim (boleh kosong saat awal dibuat)
  sdg_number    INTEGER,                     -- 1..17, boleh kosong saat awal dibuat
  sdg_title     TEXT,                        -- judul SDG yang dipilih, boleh kosong saat awal dibuat
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
