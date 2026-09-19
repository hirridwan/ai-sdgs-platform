# AI × SDGs Platform

> **AI × SDGs: Critical Debate for Sustainable Future**
>
> Platform pembelajaran yang mengintegrasikan **AI, isu Sustainable Development Goals (SDGs), fact-checking, argumentasi, debat, dan perumusan solusi** untuk membantu siswa menggunakan AI secara kritis, etis, dan bertanggung jawab.

## Overview

**AI × SDGs Platform** dikembangkan sebagai pendukung proses pembelajaran dalam proyek kepemimpinan **“AI × SDGs: Critical Debate for Sustainable Future”**.

Platform ini tidak menggantikan proses berpikir dan pengambilan keputusan siswa. AI digunakan sebagai alat bantu untuk:

- mengeksplorasi isu SDGs;
- meninjau klaim dan keterbatasan bukti;
- membantu menyusun dan meninjau argumen;
- menjadi sparring partner sebelum debat;
- mengevaluasi rancangan solusi.

Debat formal tetap dilakukan oleh **siswa PRO dan KONTRA**. AI berfungsi sebagai pendukung proses persiapan, bukan sebagai pihak yang menentukan pemenang debat.

## Tujuan Pembelajaran

Platform dirancang untuk mendukung:

- literasi AI;
- berpikir kritis;
- fact-checking dan evaluasi informasi;
- argumentasi berbasis bukti;
- komunikasi dan kolaborasi;
- pemahaman isu SDGs;
- penggunaan AI secara kritis, etis, dan bertanggung jawab.

## Alur Pembelajaran

```text
01 — SDGs Issue Bank
        ↓
02 — AI Exploration
        ↓
03 — Fact Check
        ↓
04 — Argument Builder
        ↓
05 — Debate Preparation
        ↓
06 — Solution Lab
        ↓
07 — Impact
```

### 01 — SDGs Issue Bank

Siswa memilih mosi/isu SDGs yang akan diteliti dan menentukan posisi **PRO** atau **KONTRA**.

### 02 — AI Exploration

AI membantu siswa memahami konteks isu, faktor yang berkaitan, kelompok terdampak, berbagai sudut pandang, serta pertanyaan pemantik.

AI tidak diarahkan untuk menulis naskah debat jadi.

### 03 — Fact Check

Siswa memeriksa klaim yang muncul dalam proses eksplorasi. Sistem membedakan fakta, opini, dan prediksi serta memberikan catatan mengenai keterbatasan verifikasi.

### 04 — Argument Builder

Siswa menyusun:

- **Claim**
- **Reason**
- **Evidence**

AI kemudian membantu meninjau relevansi bukti, lompatan logika, konteks yang belum dipertimbangkan, dan perbaikan prioritas.

### 05 — Debate Preparation

AI digunakan sebagai **sparring partner** sebelum debat formal. Sistem memberikan sanggahan atau pertanyaan penguji agar siswa menguji kekuatan argumennya.

Debat formal tetap berlangsung antara siswa **PRO vs KONTRA**.

### 06 — Solution Lab

Siswa merancang solusi berdasarkan masalah yang telah dianalisis. AI membantu mengevaluasi kesesuaian masalah, kelayakan, pihak yang terlibat, indikator keberhasilan, risiko, dan perbaikan prioritas.

### 07 — Impact

Platform menampilkan rangkuman perjalanan pembelajaran siswa dari isu, klaim, argumen, proses pengujian, sampai solusi.

## Mosi Debat

Platform saat ini memuat delapan mosi utama:

1. **SDG 8** — Perkembangan AI akan menciptakan lebih banyak lapangan pekerjaan daripada menghilangkannya.
2. **SDG 12 & 13** — Manfaat pengembangan AI lebih besar daripada dampaknya terhadap lingkungan.
3. **SDG 4** — Penggunaan AI dalam pembelajaran lebih banyak merugikan dibandingkan menguntungkan siswa.
4. **SDG 16** — Penyebaran informasi yang dibuat AI lebih berbahaya bagi masyarakat daripada informasi palsu yang dibuat manusia.
5. **SDG 9 & 16** — Penggunaan sosial media dalam kehidupan manusia perlu diawasi secara ketat oleh pemerintah.
6. **SDG 13** — Mobil listrik merupakan pilihan yang lebih tepat daripada mobil bensin untuk masa depan transportasi.
7. **SDG 2** — Bantuan sembako lebih menjamin kebutuhan gizi dibandingkan bantuan tunai.
8. **SDG 3** — Pembatasan penggunaan HP pada remaja diperlukan untuk kualitas hidup dan kesehatan.

## Dua Versi AI

Repository ini mempertahankan dua pendekatan AI untuk eksperimen dan pengembangan.

### Version 1 — AI + Source Pack

Version 1 menggunakan **Source Pack** yang telah disiapkan untuk setiap mosi. Pendekatan ini lebih terstruktur untuk kebutuhan fact-checking berbasis sumber yang sudah ditentukan.

### Version 2 — AI Knowledge

Version 2 menggunakan Gemini dengan **knowledge internal model** dan tidak melakukan web search pada implementasi saat ini.

Version 2 secara eksplisit memperlakukan hasil fact-check sebagai **penilaian awal**, bukan verifikasi web langsung. Fakta yang membutuhkan data terbaru atau bukti eksternal tetap ditandai untuk diverifikasi oleh siswa.

> **Catatan:** Web Search belum menjadi bagian dari implementasi Version 2 saat ini. Fitur tersebut masih menjadi opsi pengembangan berikutnya.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **AI:** Google Gemini API
- **Backend:** Cloudflare Pages Functions / Cloudflare Workers
- **Deployment:** Cloudflare Pages dan Cloudflare Workers
- **Database:** Cloudflare D1 (untuk pengembangan admin dan penyimpanan data)
- **Version control:** Git + GitHub

## Struktur Project Saat Ini

```text
ai-sdgs-platform/
├── src/
│   ├── App.tsx
│   └── AppAI.tsx
│
├── functions/
│   └── api/
│       ├── gemini.ts
│       └── gemini-ai.ts
│
├── worker/
│   ├── index.ts
│   └── gemini-ai.ts
│
├── public/
├── dist/
│
├── wrangler.toml
├── wrangler-workers.jsonc
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Pages

Deployment Pages mempertahankan struktur yang sudah stabil:

```text
functions/api/gemini.ts
functions/api/gemini-ai.ts
wrangler.toml
```

### Workers

Deployment Workers memiliki backend dan konfigurasi terpisah:

```text
worker/index.ts
worker/gemini-ai.ts
wrangler-workers.jsonc
```

Frontend React tetap menggunakan `src/App.tsx` dan `src/AppAI.tsx` yang sama.

## Environment Variables & Secrets

Worker membutuhkan secret:

```text
GEMINI_API_KEY
```

Secret harus disimpan di Cloudflare **Variables and Secrets**, bukan ditulis langsung di source code atau konfigurasi repository.

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

## Cloudflare Workers Deployment

Production deployment menggunakan konfigurasi Workers:

```bash
npx wrangler deploy -c wrangler-workers.jsonc
```

Untuk upload version dari non-production branch:

```bash
npx wrangler versions upload -c wrangler-workers.jsonc
```

Pastikan secret `GEMINI_API_KEY` sudah tersedia pada Worker.

## Git & Collaboration

Pengembangan dilakukan dengan branch agar perubahan tidak langsung mengganggu `main`.

Contoh workflow:

```text
main
  ↑
  │ Pull Request
  │
feature/admin
  ↑
  │ development
  │
Developer
```

Workflow yang digunakan:

1. Buat branch baru untuk perubahan.
2. Kerjakan fitur atau perbaikan di branch tersebut.
3. Commit dan push ke GitHub.
4. Buat Pull Request menuju `main`.
5. Review perubahan melalui tab **Files changed**.
6. Approve dan merge setelah perubahan dinilai siap.
7. Jika perubahan yang sudah di-merge ternyata bermasalah, gunakan mekanisme **Revert** melalui Pull Request/commit terkait.

## Development Guidelines

### Jangan membocorkan secret

Jangan commit API key, token, password, atau credential lain ke GitHub.

### Pertahankan pemisahan Pages dan Workers

Perubahan pada Workers sebaiknya tidak mengubah deployment Pages yang sudah stabil tanpa alasan yang jelas.

### AI bukan pengganti penilaian siswa

Output AI digunakan sebagai bahan eksplorasi, pengujian, dan umpan balik. Siswa tetap harus memahami, memeriksa, dan merumuskan kembali argumennya sendiri.

### Sumber tetap penting

Klaim faktual untuk kebutuhan debat formal tetap membutuhkan pemeriksaan terhadap sumber yang dapat dipercaya sesuai aturan proyek.

## Status Saat Ini

- Version 1: stabil.
- Version 2: stabil dan sudah berhasil melalui simulasi alur 01–07.
- Cloudflare Workers deployment: sudah tersedia sebagai deployment terpisah dari Pages.
- `GEMINI_API_KEY`: sudah dikonfigurasi pada Worker.
- D1: disiapkan untuk kebutuhan database dan halaman admin.
- Web Search pada Version 2: **belum diaktifkan** dan masih menunggu keputusan pengembangan.

## Rencana Pengembangan

Beberapa pengembangan yang dapat dilakukan berikutnya:

- halaman admin dan dashboard guru;
- penyimpanan progress siswa di D1;
- pengelolaan data mosi dan konten melalui admin;
- autentikasi dan role pengguna bila diperlukan;
- Web Search + referensi/sitasi pada Version 2;
- penyimpanan riwayat argumen dan solusi;
- monitoring penggunaan dan evaluasi pembelajaran.

## Project Context

Proyek ini dikembangkan untuk mendukung kegiatan pembelajaran **AI × SDGs: Critical Debate for Sustainable Future**, dengan peserta didik sebagai pihak yang tetap melakukan analisis, penyusunan argumen, debat, dan refleksi. AI ditempatkan sebagai alat bantu pembelajaran untuk mendukung eksplorasi, pemeriksaan informasi, review argumen, dan pengembangan solusi.

---

**AI × SDGs Platform**  
Critical thinking • AI literacy • Fact-checking • Debate • SDGs
