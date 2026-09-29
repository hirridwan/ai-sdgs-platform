-- Migration number: 0010
-- Complete SDG master data and enrich source-backed knowledge for Themes 3 & 4.
--
-- IMPORTANT:
-- The supplied Buku Panduan SDGs does NOT provide a full Counterargument/Rebuttal
-- table for Themes 3 and 4 in the sections provided. This migration therefore
-- does not invent those rows. AI can generate debate-specific rebuttals later.

-- =========================================================
-- 1. COMPLETE SDG MASTER DATA
-- =========================================================

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(1, 'No Poverty', 'Tanpa Kemiskinan. Mengakhiri kemiskinan dalam segala bentuk di mana pun.'),
(2, 'Zero Hunger', 'Tanpa Kelaparan. Mengakhiri kelaparan, mencapai ketahanan pangan dan gizi yang baik, serta mendukung pertanian berkelanjutan.'),
(3, 'Good Health and Well-being', 'Kehidupan Sehat dan Sejahtera. Memastikan kehidupan yang sehat dan meningkatkan kesejahteraan bagi semua orang pada semua usia.'),
(5, 'Gender Equality', 'Kesetaraan Gender. Mencapai kesetaraan gender serta memberdayakan semua perempuan dan anak perempuan.'),
(6, 'Clean Water and Sanitation', 'Air Bersih dan Sanitasi Layak. Memastikan ketersediaan dan pengelolaan air bersih serta sanitasi yang berkelanjutan bagi semua.'),
(11, 'Sustainable Cities and Communities', 'Kota dan Permukiman yang Berkelanjutan. Menjadikan kota dan permukiman inklusif, aman, tangguh, dan berkelanjutan.'),
(14, 'Life Below Water', 'Ekosistem Lautan. Melestarikan dan memanfaatkan laut, samudra, dan sumber daya kelautan secara berkelanjutan.'),
(15, 'Life on Land', 'Ekosistem Daratan. Melindungi, memulihkan, dan mendukung penggunaan ekosistem daratan secara berkelanjutan serta menghentikan degradasi lahan dan kehilangan keanekaragaman hayati.'),
(17, 'Parterships for The Goals', 'Kemitraan untuk Mencapai Tujuan. Memperkuat sarana pelaksanaan dan merevitalisasi kemitraan global untuk pembangunan berkelanjutan.');


-- =========================================================
-- 2. THEME 3 SOURCES
-- The book explicitly recommends UN SDGs and UNESCO.
-- UNESCO was already seeded by 0009, so add only UN here.
-- =========================================================

INSERT INTO motion_sources
(motion_id, organization, title, url, description, position)
SELECT
  3,
  'United Nations SDGs',
  'Definisi dan target SDGs',
  'https://sdgs.un.org/goals',
  NULL,
  2
WHERE NOT EXISTS (
  SELECT 1
  FROM motion_sources
  WHERE motion_id = 3
    AND organization = 'United Nations SDGs'
    AND url = 'https://sdgs.un.org/goals'
);


-- =========================================================
-- 3. THEME 4 SOURCES
-- OECD rows already exist from 0009. Add UN + UNESCO only.
-- =========================================================

INSERT INTO motion_sources
(motion_id, organization, title, url, description, position)
SELECT
  4,
  'United Nations SDGs',
  'Definisi dan target SDGs',
  'https://sdgs.un.org/goals',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM motion_sources
  WHERE motion_id = 4
    AND organization = 'United Nations SDGs'
    AND url = 'https://sdgs.un.org/goals'
);

INSERT INTO motion_sources
(motion_id, organization, title, url, description, position)
SELECT
  4,
  'UNESCO',
  'AI, pendidikan, literasi, informasi, dan demokrasi',
  'https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research',
  NULL,
  2
WHERE NOT EXISTS (
  SELECT 1
  FROM motion_sources
  WHERE motion_id = 4
    AND organization = 'UNESCO'
    AND url = 'https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research'
);


-- =========================================================
-- 4. THEME 3 EXPLORATION TERMS
-- These are source-derived concepts that appear in the theme text.
-- The book does not label them as an official keyword list.
-- =========================================================

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 3, 'id', 'AI dalam pembelajaran', 1
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 3 AND language = 'id' AND keyword = 'AI dalam pembelajaran'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 3, 'id', 'AI sebagai alat belajar', 2
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 3 AND language = 'id' AND keyword = 'AI sebagai alat belajar'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 3, 'id', 'AI sebagai pengganti proses berpikir siswa', 3
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 3 AND language = 'id' AND keyword = 'AI sebagai pengganti proses berpikir siswa'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 3, 'id', 'ketergantungan pada AI', 4
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 3 AND language = 'id' AND keyword = 'ketergantungan pada AI'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 3, 'id', 'integritas akademik', 5
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 3 AND language = 'id' AND keyword = 'integritas akademik'
);


-- =========================================================
-- 5. THEME 4 EXPLORATION TERMS
-- These are source-derived concepts that appear in the theme text.
-- =========================================================

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'AI-generated information', 1
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'AI-generated information'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'false information', 2
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'false information'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'disinformation', 3
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'disinformation'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'informasi palsu', 4
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'informasi palsu'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'informasi menyesatkan', 5
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'informasi menyesatkan'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'konten sintetis', 6
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'konten sintetis'
);

INSERT INTO motion_keywords
(motion_id, language, keyword, position)
SELECT 4, 'id', 'integritas informasi', 7
WHERE NOT EXISTS (
  SELECT 1 FROM motion_keywords
  WHERE motion_id = 4 AND language = 'id' AND keyword = 'integritas informasi'
);


-- =========================================================
-- 6. THEME 4 EXPLICIT FOCUS QUESTIONS
-- These are directly stated in the supplied theme text.
-- =========================================================

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT 4, 'kritis', 'Apakah informasi tersebut benar atau salah?', 1
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 4 AND category = 'kritis'
    AND question = 'Apakah informasi tersebut benar atau salah?'
);

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT 4, 'kritis', 'Apakah pembuatnya sengaja menyesatkan?', 2
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 4 AND category = 'kritis'
    AND question = 'Apakah pembuatnya sengaja menyesatkan?'
);

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT 4, 'kritis', 'Seberapa luas informasi tersebut tersebar?', 3
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 4 AND category = 'kritis'
    AND question = 'Seberapa luas informasi tersebut tersebar?'
);

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT 4, 'kritis', 'Seberapa mudah informasi tersebut dibuat ulang?', 4
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 4 AND category = 'kritis'
    AND question = 'Seberapa mudah informasi tersebut dibuat ulang?'
);

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT 4, 'kritis', 'Seberapa sulit masyarakat mendeteksinya?', 5
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 4 AND category = 'kritis'
    AND question = 'Seberapa sulit masyarakat mendeteksinya?'
);

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT 4, 'kritis', 'Apa dampaknya terhadap individu dan masyarakat?', 6
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 4 AND category = 'kritis'
    AND question = 'Apa dampaknya terhadap individu dan masyarakat?'
);


-- =========================================================
-- 7. THEME 3 EXPLICIT FOCUS QUESTION
-- The supplied document provides this explicit debate-direction
-- question in the theme section.
-- =========================================================

INSERT INTO motion_questions
(motion_id, category, question, position)
SELECT
  3,
  'pendalaman',
  'Apakah keberadaan AI yang menentukan kualitas pembelajaran, atau cara siswa dan guru menggunakan AI yang lebih menentukan dampaknya?',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM motion_questions
  WHERE motion_id = 3 AND category = 'pendalaman'
    AND question = 'Apakah keberadaan AI yang menentukan kualitas pembelajaran, atau cara siswa dan guru menggunakan AI yang lebih menentukan dampaknya?'
);


-- =========================================================
-- 8. NORMALIZE POSITIONS WITHIN EACH MOTION
-- =========================================================

UPDATE motion_sources
SET position = (
  SELECT COUNT(*)
  FROM motion_sources s2
  WHERE s2.motion_id = motion_sources.motion_id
    AND (
      s2.position < motion_sources.position
      OR (s2.position = motion_sources.position AND s2.id <= motion_sources.id)
    )
);

UPDATE motion_keywords
SET position = (
  SELECT COUNT(*)
  FROM motion_keywords k2
  WHERE k2.motion_id = motion_keywords.motion_id
    AND k2.language = motion_keywords.language
    AND (
      k2.position < motion_keywords.position
      OR (k2.position = motion_keywords.position AND k2.id <= motion_keywords.id)
    )
);

-- End of migration 0010
