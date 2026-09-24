// Run once from the project root after copying src/team.
// Only patches the fetch call used by each AI endpoint; no prompts are changed.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const plans = [];
for (const [file, endpoint] of [['src/App.tsx', '/api/gemini'], ['src/AppAI.tsx', '/api/gemini-ai']]) {
  const original = readFileSync(file, 'utf8');
  const old = `await fetch('${endpoint}', {`;
  const replacement = `await fetchAI('${endpoint}', {`;
  if (original.includes(replacement) && original.includes("from './team/api'")) {
    console.log(`${file}: sudah terhubung.`);
    continue;
  }
  if (original.split(old).length !== 2) throw new Error(`${file}: pola fetch tidak cocok/lebih dari satu. Tidak ada file yang diubah. Gunakan langkah manual pada README.`);
  const updated = `import { fetchAI } from './team/api';\n` + original.replace(old, replacement);
  plans.push({ file, updated });
}
for (const { file } of plans) {
  const backup = `${file}.before-team-dashboard.bak`;
  if (existsSync(backup)) throw new Error(`Backup ${backup} sudah ada. Periksa sebelum menjalankan ulang.`);
}
for (const { file, updated } of plans) {
  copyFileSync(file, `${file}.before-team-dashboard.bak`);
  writeFileSync(file, updated);
  console.log(`${file}: terhubung, backup dibuat.`);
}
