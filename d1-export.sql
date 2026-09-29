PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_create_teams.sql','2026-09-20 12:42:17');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_create_team_members.sql','2026-09-20 12:42:17');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0003_create_ai_interactions.sql','2026-09-20 12:42:18');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0004_create_sessions.sql','2026-09-20 12:42:18');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0005_create_admin_auth.sql','2026-09-22 08:09:34');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0006_create_motions.sql','2026-09-22 08:09:35');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0007_debate_runs.sql','2026-09-25 07:05:52');
CREATE TABLE teams (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,               
  team_name     TEXT NOT NULL,
  motion        TEXT,                        
  sdg_number    INTEGER,                     
  sdg_title     TEXT,                        
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "teams" ("id","username","password_hash","team_name","motion","sdg_number","sdg_title","created_at","updated_at") VALUES(1,'tim1','41ca2facd604898a761e2758da632a5c:fd2fbaa219743405be5b84ecd6eae6ac2078112f90432188dee0c781bb774b7c','Tim Satu','',NULL,NULL,'2026-09-20 13:04:42','2026-09-29 02:03:52');
INSERT INTO "teams" ("id","username","password_hash","team_name","motion","sdg_number","sdg_title","created_at","updated_at") VALUES(2,'tim2','24fe1b1e98f0835717af844ef3f62868:05d5979460aa0e4b2b4da741b6f206c32e3848b0386180121b717c08feca3970','Tim Dua',NULL,NULL,NULL,'2026-09-28 11:54:46','2026-09-28 11:54:46');
INSERT INTO "teams" ("id","username","password_hash","team_name","motion","sdg_number","sdg_title","created_at","updated_at") VALUES(3,'tim3','f0783988ad62fdb2c38ac205577e7f3d:d0aaf3c8df0820995a368462e81d1ce10be4d0ef56129a3534c54232a82d5b1a','Tim Tiga',NULL,NULL,NULL,'2026-09-28 11:54:46','2026-09-28 11:54:46');
INSERT INTO "teams" ("id","username","password_hash","team_name","motion","sdg_number","sdg_title","created_at","updated_at") VALUES(4,'tim4','3253d1776d1ce4f819e7be38ea361a35:0246429db9ca0f066a2ed7cde3c0383839a5d4dfb98699d98e1b04b7e97516d8','Tim Empat',NULL,NULL,NULL,'2026-09-28 11:54:46','2026-09-28 11:54:46');
INSERT INTO "teams" ("id","username","password_hash","team_name","motion","sdg_number","sdg_title","created_at","updated_at") VALUES(5,'tim5','96bfb36f8b03b446965af341190d7e95:c858c5049bdf659118bcc1e4d7c95ac0a8a393e9307e312f98dca094e003c8c6','Tim Lima',NULL,NULL,NULL,'2026-09-28 11:54:46','2026-09-28 11:54:46');
INSERT INTO "teams" ("id","username","password_hash","team_name","motion","sdg_number","sdg_title","created_at","updated_at") VALUES(6,'tim6','d4980342a7d029fa338081a8cb445e06:e5ad89e96dab266a205b10e41b4a4f9603afd37283a4efcea257d402a11d1938','Tim Enam',NULL,NULL,NULL,'2026-09-28 11:54:46','2026-09-28 11:54:46');
CREATE TABLE team_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,      
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE ai_interactions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id        INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,               
  position       TEXT,                        
  request_text   TEXT NOT NULL,               
  request_meta   TEXT,                        
  ai_response    TEXT NOT NULL,               
  ai_meta        TEXT,                        
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,                
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "sessions" ("id","team_id","expires_at","created_at") VALUES('100efa3cb744e2c0ad81116fe31152b5397838773601c82f118730b1a6b7d5e2',1,'2026-09-27T14:21:14.462Z','2026-09-20 14:21:14');
INSERT INTO "sessions" ("id","team_id","expires_at","created_at") VALUES('ec38fbc75c5c0f782e5bd19bda9cdf0f5fdd4075f59dd9c5a676fdeb0e2ff63e',1,'2026-09-27T14:50:21.490Z','2026-09-20 14:50:21');
INSERT INTO "sessions" ("id","team_id","expires_at","created_at") VALUES('756d51e083c0d7e9cee86004ad9f994bbea9f7e2bb4b1b4e641d1d305be88028',1,'2026-09-27T14:51:48.224Z','2026-09-20 14:51:48');
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "admins" ("id","username","password_hash","display_name","is_active","created_at","updated_at") VALUES(1,'admin','pbkdf2-sha256$100000$f630dc739ebc014397452a15e121388a$170d4692e80f654ff648e2c2bb75a420dec163e309ecb41f4b84b67c34317318','Admin Baik',1,'2026-09-28 12:09:50','2026-09-28 12:09:50');
CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "admin_sessions" ("id","admin_id","expires_at","created_at") VALUES('2cbc1e9e06788848995e589d54fcb331e5d5cc835b24922bb303374e123a0be2',1,'2026-09-29T09:50:43.446Z','2026-09-29 01:50:43');
INSERT INTO "admin_sessions" ("id","admin_id","expires_at","created_at") VALUES('037b0bf597edc0ebf4a521d4160002d9680e022858ab9f3d8ca7421391d101da',1,'2026-09-29T09:56:46.178Z','2026-09-29 01:56:46');
INSERT INTO "admin_sessions" ("id","admin_id","expires_at","created_at") VALUES('2f9ffbc4a9bea966cf50e1f4b96f45c746dda8a73036420f7d64c32b3d132e95',1,'2026-09-29T09:59:50.115Z','2026-09-29 01:59:50');
CREATE TABLE motions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  sdg_number INTEGER,             
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(1,'Perkembangan AI akan menciptakan lebih banyak lapangan pekerjaan daripada menghilangkannya.',8,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(2,'Manfaat pengembangan AI lebih besar daripada dampaknya terhadap lingkungan.',NULL,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(3,'Penggunaan AI dalam pembelajaran lebih banyak merugikan dibandingkan menguntungkan siswa.',4,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(4,'Penyebaran informasi yang dibuat AI lebih berbahaya bagi masyarakat daripada informasi palsu yang dibuat manusia.',16,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(5,'Penggunaan sosial media dalam kehidupan manusia perlu diawasi secara ketat oleh pemerintah.',NULL,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(6,'Mobil listrik merupakan pilihan yang lebih tepat daripada mobil bensin untuk masa depan transportasi.',13,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(7,'Bantuan sembako lebih menjamin kebutuhan gizi dibandingkan bantuan tunai.',2,'2026-09-22 08:09:35');
INSERT INTO "motions" ("id","text","sdg_number","created_at") VALUES(8,'Pembatasan penggunaan HP pada remaja diperlukan untuk kualitas hidup dan kesehatan.',3,'2026-09-22 08:09:35');
CREATE TABLE debate_runs (
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
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',7);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('teams',8);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('team_members',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('motions',8);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admins',1);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_ai_interactions_team ON ai_interactions(team_id);
CREATE INDEX idx_ai_interactions_action ON ai_interactions(action);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);
CREATE INDEX idx_sessions_team ON sessions(team_id);
CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_expiry ON admin_sessions(expires_at);
CREATE INDEX idx_motions_sdg ON motions(sdg_number);
CREATE INDEX idx_debate_runs_team ON debate_runs(team_id, created_at);
