-- Seed akun tim pertama.
-- Cara pakai:
--   1. Ganti nilai username, password_hash, dan team_name di bawah.
--      password_hash didapat dari: node scripts/hash-password.mjs "passwordAsli"
--   2. Jalankan:
--      npx wrangler d1 execute ai-sdgs-db --remote --config wrangler-workers.jsonc --file=./scripts/seed-team.sql
--   3. File ini boleh dipakai berkali-kali untuk tim lain: ganti isinya, jalankan lagi.

INSERT INTO teams (username, password_hash, team_name)
VALUES (
  'tim1',
  '41ca2facd604898a761e2758da632a5c:fd2fbaa219743405be5b84ecd6eae6ac2078112f90432188dee0c781bb774b7c',
  'Tim Satu'
);
