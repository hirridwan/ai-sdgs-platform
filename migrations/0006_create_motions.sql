-- Migration 0006: motions
-- Bank Mosi untuk identitas tim (nama tim, mosi, SDG) — TERPISAH dari Bank
-- Mosi/Issue Bank di App.tsx & AppAI.tsx (SAMPLE_ISSUES), yang berisi konteks
-- lengkap (proFocus, contraFocus, sources, dll) untuk alur latihan AI.
--
-- Tabel ini sengaja ringan: cuma teks mosi + SDG opsional. Dikelola admin
-- lewat dashboard tanpa perlu deploy ulang kode.

CREATE TABLE IF NOT EXISTS motions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  sdg_number INTEGER,             -- 1-17, NULL kalau mosi terkait >1 SDG sekaligus
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_motions_sdg ON motions(sdg_number);

-- Seed: 8 mosi awal, disalin dari SAMPLE_ISSUES (App.tsx/AppAI.tsx) supaya
-- Bank Mosi identitas tim konsisten dengan mosi yang dipakai saat latihan AI.
-- Mosi yang terkait lebih dari satu SDG (mis. "SDG 12 & SDG 13") diberi
-- sdg_number NULL karena kolom teams.sdg_number cuma menampung satu SDG.
INSERT INTO motions (text, sdg_number) VALUES
  ('Perkembangan AI akan menciptakan lebih banyak lapangan pekerjaan daripada menghilangkannya.', 8),
  ('Manfaat pengembangan AI lebih besar daripada dampaknya terhadap lingkungan.', NULL),
  ('Penggunaan AI dalam pembelajaran lebih banyak merugikan dibandingkan menguntungkan siswa.', 4),
  ('Penyebaran informasi yang dibuat AI lebih berbahaya bagi masyarakat daripada informasi palsu yang dibuat manusia.', 16),
  ('Penggunaan sosial media dalam kehidupan manusia perlu diawasi secara ketat oleh pemerintah.', NULL),
  ('Mobil listrik merupakan pilihan yang lebih tepat daripada mobil bensin untuk masa depan transportasi.', 13),
  ('Bantuan sembako lebih menjamin kebutuhan gizi dibandingkan bantuan tunai.', 2),
  ('Pembatasan penggunaan HP pada remaja diperlukan untuk kualitas hidup dan kesehatan.', 3);
