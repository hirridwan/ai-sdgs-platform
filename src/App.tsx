import { useDebateRun } from './history/useDebateRun';
import { fetchAI } from './team/api';
/**
 * FRONTEND V1 — SOURCE PACK
 *
 * Fungsi:
 * - Menjadi antarmuka utama Version 1 AI × SDGs Platform.
 * - Menggunakan alur pembelajaran berbasis Source Pack.
 * - Menampilkan Issue Bank, AI Exploration, Fact Check,
 *   Argument Builder, Debate Preparation, Solution Lab, dan Impact.
 *
 * Backend:
 * - POST /api/gemini
 * - Backend: worker/gemini.ts
 *
 * Catatan:
 * - Versi ini menggunakan Source Pack sebagai basis evidence.
 * - Tidak menggunakan Google Search secara langsung.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

type Source = {
  title: string;
  url: string;
  domain: string;
  quality: 'tinggi' | 'sedang' | 'lainnya';
  year?: string;
  scope?: string;
  summary?: string;
};

type Issue = {
  id: number;
  sdg: string;
  title: string;
  blurb: string;
  motion: string;
  context: string;
  proFocus: string;
  contraFocus: string;
  starterQuestions: string[];
  sources: Source[];
};

type ClaimResult = {
  id: string;
  claim: string;
  normalizedClaim: string;
  type: 'factual' | 'opinion' | 'prediction';
  verdict: 'verified' | 'mostly_true' | 'misleading' | 'false' | 'unverifiable' | 'not_fact';
  confidence: number;
  explanation: string;
  caveat: string;
  sources: Source[];
  searchQueries: string[];
  checkedAt: string;
};

type ApiError = Error & { code?: string };
type StageId = 'home' | 'issue-bank' | 'ai-exploration' | 'fact-check' | 'argument-builder' | 'debate' | 'solution-lab' | 'impact';

type Argument = {
  claim: string;
  reason: string;
  evidence: string;
};

const STAGES: { id: StageId; label: string; short: string }[] = [
  { id: 'home', label: 'Home', short: 'H' },
  { id: 'issue-bank', label: 'SDGs Issue Bank', short: '01' },
  { id: 'ai-exploration', label: 'AI Exploration', short: '02' },
  { id: 'fact-check', label: 'Fact Check', short: '03' },
  { id: 'argument-builder', label: 'Argument Builder', short: '04' },
  { id: 'debate', label: 'Debate Preparation', short: '05' },
  { id: 'solution-lab', label: 'Solution Lab', short: '06' },
  { id: 'impact', label: 'Impact', short: '07' },
];

const FACT_CHECK_MODE = String((import.meta as any).env?.VITE_FACT_CHECK_MODE || 'source-pack') === 'source-pack'
  ? 'source-pack'
  : 'dummy';

const AI_STAGE_MODE = String((import.meta as any).env?.VITE_AI_STAGE_MODE || 'api') === 'api'
  ? 'api'
  : 'dummy';

const ARGUMENT_REVIEW_MODE = String((import.meta as any).env?.VITE_ARGUMENT_REVIEW_MODE || 'api') === 'api'
  ? 'api'
  : 'dummy';

const SOLUTION_EVALUATOR_MODE = String((import.meta as any).env?.VITE_SOLUTION_EVALUATOR_MODE || 'api') === 'api'
  ? 'api'
  : 'dummy';

const SAMPLE_ISSUES: Issue[] = [
  {
    id: 1,
    sdg: 'SDG 8',
    title: 'AI dan Dunia Kerja',
    blurb: 'AI dapat mengubah jenis pekerjaan, tugas, kebutuhan keterampilan, dan pola penciptaan lapangan kerja.',
    motion: 'Perkembangan AI akan menciptakan lebih banyak lapangan pekerjaan daripada menghilangkannya.',
    context: 'Perkembangan AI generatif dan otomatisasi dapat mengubah tugas dalam banyak pekerjaan. Perdebatan perlu membedakan pekerjaan yang benar-benar hilang, pekerjaan yang berubah, serta pekerjaan baru yang muncul. Dampaknya juga dapat berbeda menurut sektor, kelompok pekerja, keterampilan, dan negara.',
    proFocus: 'Telusuri bukti tentang penciptaan pekerjaan baru, peningkatan produktivitas, munculnya permintaan baru, serta transformasi pekerjaan daripada penghapusan total pekerjaan.',
    contraFocus: 'Telusuri bukti tentang otomatisasi dan job displacement, apakah pekerjaan baru cukup menggantikan pekerjaan yang hilang, serta risiko ketimpangan dan kebutuhan reskilling.',
    starterQuestions: [
      'Apa yang dimaksud dengan pekerjaan “tercipta” dan “hilang”?',
      'Apakah AI lebih banyak menggantikan pekerjaan atau hanya sebagian tugas dalam pekerjaan?',
      'Bagaimana dampaknya berbeda menurut sektor dan kelompok pekerja?',
      'Apakah keterampilan baru dan reskilling cukup untuk mengurangi dampak displacement?',
    ],
    sources: [
      {
        title: 'ILO — Generative AI and jobs: A 2025 update',
        url: 'https://www.ilo.org/publications/generative-ai-and-jobs-2025-update',
        domain: 'ilo.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Global',
        summary: 'Sekitar 1 dari 4 pekerja global berada dalam pekerjaan yang memiliki paparan terhadap GenAI; ILO menekankan bahwa sebagian besar pekerjaan kemungkinan lebih banyak berubah daripada sepenuhnya menjadi redundant.',
      },
      {
        title: 'WEF — Future of Jobs Report 2025',
        url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/2-jobs-outlook/',
        domain: 'weforum.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Global employer survey',
        summary: 'Survei perusahaan memproyeksikan 170 juta pekerjaan tercipta dan 92 juta terdampak displacement hingga 2030; angka ini mencerminkan berbagai tren struktural, bukan AI saja.',
      },
      {
        title: 'OECD — Using AI in the workplace',
        url: 'https://www.oecd.org/en/publications/using-ai-in-the-workplace_73d417f9-en.html',
        domain: 'oecd.org',
        quality: 'tinggi',
        year: '2024',
        scope: 'OECD countries',
        summary: 'Dalam survei OECD, sekitar 4 dari 5 pekerja yang menggunakan AI mengatakan AI meningkatkan performa; pada saat yang sama sekitar 27% pekerjaan di negara OECD berada pada risiko otomatisasi tertinggi.',
      },
    ],
  },
  {
    id: 2,
    sdg: 'SDG 12 & SDG 13',
    title: 'AI dan Lingkungan',
    blurb: 'AI membutuhkan listrik, air, perangkat keras, dan material, tetapi juga dapat digunakan untuk efisiensi energi dan lingkungan.',
    motion: 'Manfaat pengembangan AI lebih besar daripada dampaknya terhadap lingkungan.',
    context: 'Pengembangan dan penggunaan AI bergantung pada pusat data, listrik, sistem pendingin, perangkat keras, dan rantai pasok material. Di sisi lain, AI dapat digunakan untuk optimasi energi, pemantauan emisi, dan aplikasi lingkungan. Perbandingan perlu melihat seluruh siklus hidup dan konteks penggunaan, bukan satu dampak saja.',
    proFocus: 'Bandingkan manfaat lingkungan yang terukur dari aplikasi AI dengan jejak lingkungannya, termasuk efisiensi energi, pengurangan emisi, pemantauan lingkungan, serta peningkatan efisiensi pusat data.',
    contraFocus: 'Telusuri konsumsi listrik, air, material, limbah elektronik, serta keterbatasan dalam menggeneralisasi manfaat lingkungan AI ke semua use case.',
    starterQuestions: [
      'Bagaimana cara mengukur “manfaat” dan “dampak lingkungan” AI secara sebanding?',
      'Apa saja dampak AI sepanjang siklus hidupnya?',
      'Seberapa besar konsumsi listrik dan air pusat data?',
      'Dalam kondisi apa AI benar-benar membantu mengurangi dampak lingkungan?',
    ],
    sources: [
      {
        title: 'IEA — Energy and AI',
        url: 'https://www.iea.org/reports/energy-and-ai',
        domain: 'iea.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Global',
        summary: 'IEA memproyeksikan konsumsi listrik pusat data sekitar 945 TWh pada 2030 dalam skenario dasar, lebih dari dua kali lipat 2024; AI menjadi salah satu pendorong penting kenaikan kebutuhan listrik.',
      },
      {
        title: 'UNEP — Artificial Intelligence (AI) end-to-end',
        url: 'https://www.unep.org/resources/report/artificial-intelligence-ai-end-end-environmental-impact-full-ai-lifecycle-needs-be',
        domain: 'unep.org',
        quality: 'tinggi',
        year: '2024',
        scope: 'Global',
        summary: 'UNEP menekankan perlunya menilai dampak lingkungan sepanjang siklus hidup AI, termasuk penggunaan sumber daya dan dampak infrastruktur digital.',
      },
      {
        title: 'UNEP — How to make AI data centres more sustainable',
        url: 'https://www.unep.org/technical-highlight/how-make-ai-data-centres-more-sustainable',
        domain: 'unep.org',
        quality: 'tinggi',
        year: '2026',
        scope: 'Global',
        summary: 'Pusat data meningkatkan kebutuhan listrik dan dapat memengaruhi penggunaan air bergantung pada desain, teknologi pendinginan, dan lokasi; AI juga dapat membantu efisiensi energi dan pemantauan emisi.',
      },
    ],
  },
  {
    id: 3,
    sdg: 'SDG 4',
    title: 'AI dan Pendidikan',
    blurb: 'AI dapat membantu belajar, tetapi juga membawa risiko kesalahan, bias, privasi, dan ketergantungan.',
    motion: 'Penggunaan AI dalam pembelajaran lebih banyak merugikan dibandingkan menguntungkan siswa.',
    context: 'AI generatif semakin digunakan untuk mencari informasi, membuat ringkasan, mendapatkan umpan balik, dan membantu mengerjakan tugas. Dampaknya tidak otomatis sama untuk semua kegiatan belajar. Manfaat seperti personalisasi dan aksesibilitas perlu ditimbang dengan risiko kesalahan, bias, privasi, dan ketergantungan.',
    proFocus: 'Telusuri bukti tentang personalisasi, aksesibilitas, umpan balik, dan efisiensi belajar; perhatikan kondisi penggunaan yang membuat AI menjadi alat pendukung, bukan pengganti proses berpikir siswa.',
    contraFocus: 'Telusuri kesalahan dan bias AI, privasi, ketergantungan, serta potensi dampak pada berpikir kritis, problem solving, dan kemandirian belajar ketika AI digunakan tanpa pengawasan.',
    starterQuestions: [
      'Manfaat belajar apa yang benar-benar dapat diukur dari penggunaan AI?',
      'Risiko apa yang paling relevan untuk siswa dan pada tugas seperti apa?',
      'Bagaimana penggunaan AI memengaruhi kemandirian dan berpikir kritis?',
      'Apa peran guru dan aturan sekolah dalam membatasi risikonya?',
    ],
    sources: [
      {
        title: 'UNESCO — Guidance for generative AI in education and research',
        url: 'https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research',
        domain: 'unesco.org',
        quality: 'tinggi',
        year: '2023/2026 update',
        scope: 'Global',
        summary: 'UNESCO membahas penggunaan kreatif AI dalam pendidikan sekaligus kebutuhan perlindungan privasi, validasi etis, keamanan, dan pendekatan yang berpusat pada manusia.',
      },
      {
        title: 'UNICEF — Generative AI: Risks and opportunities for children',
        url: 'https://www.unicef.org/innocenti/generative-ai-risks-and-opportunities-children',
        domain: 'unicef.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Global',
        summary: 'UNICEF mengidentifikasi peluang seperti personalisasi dan aksesibilitas sekaligus risiko seperti kesalahan, disinformasi persuasif, privasi, serta kemungkinan ketergantungan pada AI.',
      },
      {
        title: 'OECD — PISA 2025 Results, Indonesia Country Note',
        url: 'https://www.oecd.org/en/publications/pisa-2025-results-volume-i-country-notes_2d4ff9ea-en/indonesia_9c880f8a-en.html',
        domain: 'oecd.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Indonesia',
        summary: 'Sebanyak 53% siswa di Indonesia melaporkan menggunakan chatbot setiap minggu untuk belajar; penggunaan juga dilaporkan untuk riset awal, membuat ringkasan, dan penyusunan draf.',
      },
    ],
  },
  {
    id: 4,
    sdg: 'SDG 16',
    title: 'AI dan Informasi',
    blurb: 'Konten sintetis dapat dibuat cepat dan dalam skala besar, tetapi dampak informasi palsu juga bergantung pada manusia dan konteks distribusinya.',
    motion: 'Penyebaran informasi yang dibuat AI lebih berbahaya bagi masyarakat daripada informasi palsu yang dibuat manusia.',
    context: 'Generative AI mempermudah pembuatan teks, gambar, audio, dan video sintetis. Tantangan utamanya mencakup skala, kecepatan, kredibilitas, kemampuan deteksi, dan dampak pada kepercayaan publik. Perbandingan dengan informasi palsu buatan manusia juga perlu mempertimbangkan niat dan ekosistem penyebarannya.',
    proFocus: 'Telusuri apakah AI meningkatkan skala, kecepatan, realisme, dan kemampuan otomatisasi kampanye informasi palsu sehingga dampaknya dapat meluas.',
    contraFocus: 'Bandingkan dengan informasi palsu buatan manusia, termasuk faktor niat, konteks sosial, saluran distribusi, dan kemungkinan AI hanya menjadi alat penguat.',
    starterQuestions: [
      'Apa arti “lebih berbahaya” dalam mosi ini: skala, kecepatan, kredibilitas, atau dampak sosial?',
      'Seberapa mudah masyarakat membedakan konten AI dan manusia?',
      'Apakah AI merupakan sumber utama atau amplifier dari masalah misinformasi?',
      'Bagaimana literasi digital, label, dan moderasi memengaruhi risiko?',
    ],
    sources: [
      {
        title: 'WEF — Global Risks Report 2025',
        url: 'https://www.weforum.org/publications/global-risks-report-2025/in-full/global-risks-2025-a-world-of-growing-divisions-c943fe3ba0/',
        domain: 'weforum.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Global',
        summary: 'WEF menyoroti makin sulitnya membedakan informasi menyesatkan yang dibuat AI dan manusia serta rendahnya hambatan untuk membuat dan mendistribusikan kampanye berskala besar dengan GenAI.',
      },
      {
        title: 'OECD — The OECD Truth Quest Survey',
        url: 'https://www.oecd.org/en/publications/the-oecd-truth-quest-survey_92a94c0f-en.html',
        domain: 'oecd.org',
        quality: 'tinggi',
        year: '2024',
        scope: '21 countries; 40,765 respondents',
        summary: 'Survei OECD menguji kemampuan membedakan konten benar dan palsu/menyesatkan, termasuk isu deteksi konten AI dan pengaruh label terhadap penilaian pengguna.',
      },
      {
        title: 'UNICEF — Generative AI: Risks and opportunities for children',
        url: 'https://www.unicef.org/innocenti/generative-ai-risks-and-opportunities-children',
        domain: 'unicef.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Global',
        summary: 'UNICEF mencatat GenAI dapat menghasilkan informasi palsu dengan cepat dan meyakinkan serta menambah tantangan moderasi; risiko juga muncul dari ekosistem aktor manusia yang memanfaatkan teknologi.',
      },
    ],
  },
  {
    id: 5,
    sdg: 'SDG 9 & SDG 16',
    title: 'Pengawasan Penggunaan Media Sosial',
    blurb: 'Media sosial memberi manfaat sosial dan ekonomi, tetapi juga menimbulkan risiko keselamatan, privasi, dan penyalahgunaan.',
    motion: 'Penggunaan sosial media dalam kehidupan manusia perlu diawasi secara ketat oleh pemerintah.',
    context: 'Media sosial digunakan untuk komunikasi, informasi, pendidikan, dan kegiatan ekonomi, tetapi juga berkaitan dengan cyberbullying, penipuan, pelanggaran privasi, serta risiko terhadap anak. “Diawasi secara ketat” perlu didefinisikan karena kebijakan dapat memengaruhi kebebasan berekspresi, privasi, dan pembagian tanggung jawab antara pemerintah, platform, keluarga, dan sekolah.',
    proFocus: 'Telusuri risiko yang membutuhkan perlindungan publik, efektivitas regulasi dan safety-by-design, serta perlindungan anak dan kelompok rentan.',
    contraFocus: 'Telusuri risiko overregulation terhadap privasi dan kebebasan berekspresi, serta argumen bahwa pengawasan harus berbasis risiko dan dibagi dengan platform, keluarga, dan sekolah.',
    starterQuestions: [
      'Apa yang dimaksud dengan “diawasi secara ketat”?',
      'Risiko apa yang memang membutuhkan intervensi pemerintah?',
      'Bagaimana batas antara perlindungan pengguna dan kebebasan berekspresi?',
      'Siapa yang paling bertanggung jawab: pemerintah, platform, keluarga, atau sekolah?',
    ],
    sources: [
      {
        title: 'UNICEF Indonesia — Online knowledge and practice of children in Indonesia: A baseline study 2023',
        url: 'https://www.unicef.org/indonesia/child-protection/reports/online-knowledge-and-practice-children-indonesia-baseline-study-2023',
        domain: 'unicef.org',
        quality: 'tinggi',
        year: '2025',
        scope: 'Indonesia',
        summary: 'Studi UNICEF Indonesia melaporkan tingginya penggunaan internet harian anak, sementara 37.5% menerima informasi keselamatan daring; 42% pernah merasa tidak nyaman atau takut akibat pengalaman online, dan 50.3% melihat gambar seksual di media sosial.',
      },
      {
        title: 'OECD — Towards digital safety by design for children',
        url: 'https://www.oecd.org/en/publications/towards-digital-safety-by-design-for-children_c167b650-en.html',
        domain: 'oecd.org',
        quality: 'tinggi',
        year: '2024',
        scope: 'International',
        summary: 'OECD membahas safety-by-design, mekanisme keselamatan, pengaduan, dan pendekatan yang sesuai usia sebagai bagian dari perlindungan anak di lingkungan digital.',
      },
      {
        title: 'UNICEF Indonesia — JagaBareng',
        url: 'https://www.unicef.org/indonesia/id/perlindungan-anak/jagabareng',
        domain: 'unicef.org',
        quality: 'tinggi',
        year: '2024',
        scope: 'Indonesia',
        summary: 'Materi UNICEF Indonesia mendorong pendampingan orang tua, batas penggunaan, layanan sesuai usia, kontrol orang tua, dan komunikasi sebagai bagian dari keselamatan anak di ruang digital.',
      },
    ],
  },
  {
    id: 6,
    sdg: 'SDG 13',
    title: 'Mobil Listrik dan Masa Depan Transportasi',
    blurb: 'Kendaraan listrik tidak memiliki emisi knalpot, tetapi dampak siklus hidupnya bergantung pada listrik, baterai, penggunaan, dan daur ulang.',
    motion: 'Mobil listrik merupakan pilihan yang lebih tepat daripada mobil bensin untuk masa depan transportasi.',
    context: 'Kendaraan listrik dapat mengurangi emisi dari penggunaan kendaraan karena tidak menghasilkan emisi knalpot. Namun, perbandingan dengan kendaraan bensin tetap perlu melihat siklus hidup, sumber listrik, produksi baterai, jarak tempuh, infrastruktur pengisian, biaya, dan akhir masa pakai baterai. Dampaknya dapat berbeda antar wilayah.',
    proFocus: 'Telusuri perbandingan emisi siklus hidup, pengurangan ketergantungan bahan bakar fosil, biaya operasional, dan perkembangan infrastruktur pengisian.',
    contraFocus: 'Telusuri batasan produksi baterai, campuran listrik, harga, infrastruktur, variasi regional, serta alternatif seperti transportasi publik, kendaraan kecil, atau hibrida.',
    starterQuestions: [
      'Bagaimana perbandingan emisi sepanjang siklus hidup EV dan mobil bensin?',
      'Seberapa besar sumber listrik memengaruhi hasil perbandingan?',
      'Bagaimana produksi dan daur ulang baterai diperhitungkan?',
      'Apakah EV cocok secara sama di semua daerah dan kondisi transportasi?',
    ],
    sources: [
      {
        title: 'IEA — Global EV Outlook 2026',
        url: 'https://www.iea.org/reports/global-ev-outlook-2026',
        domain: 'iea.org',
        quality: 'tinggi',
        year: '2026',
        scope: 'Global',
        summary: 'IEA melaporkan penjualan mobil listrik global melampaui 20 juta unit pada 2025, sekitar seperempat penjualan mobil baru, dengan implikasi terhadap listrik, minyak, dan emisi.',
      },
      {
        title: 'IEA — Global EV Outlook 2026: Outlook for electric mobility',
        url: 'https://www.iea.org/reports/global-ev-outlook-2026/outlook-for-electric-mobility-chap-9-11',
        domain: 'iea.org',
        quality: 'tinggi',
        year: '2026',
        scope: 'Global modelling',
        summary: 'Model IEA memperkirakan stok EV pada 2025 telah menghindari sekitar 190 Mt CO2-eq secara bersih; skenario kebijakan saat ini menunjukkan lebih dari 1.2 Gt pada 2035.',
      },
      {
        title: 'IEA — Global EV Outlook 2024: Outlook for emissions reductions',
        url: 'https://www.iea.org/reports/global-ev-outlook-2024/outlook-for-emissions-reductions',
        domain: 'iea.org',
        quality: 'tinggi',
        year: '2024',
        scope: 'Global',
        summary: 'IEA memperkirakan mobil listrik baterai ukuran menengah yang dijual pada 2023 menghasilkan emisi siklus hidup global sekitar setengah kendaraan ICE yang ekuivalen dalam skenario yang dianalisis.',
      },
    ],
  },
  {
    id: 7,
    sdg: 'SDG 2',
    title: 'Bantuan Sembako dan Bantuan Tunai',
    blurb: 'Bantuan pangan menyediakan komoditas secara langsung, sementara bantuan tunai memberi pilihan penggunaan; hasilnya bergantung pada konteks.',
    motion: 'Bantuan sembako lebih menjamin kebutuhan gizi dibandingkan bantuan tunai.',
    context: 'Bantuan sosial dapat diberikan dalam bentuk pangan, tunai, voucher, atau kombinasi. Sembako secara langsung menyediakan jenis pangan tertentu, sedangkan bantuan tunai memberi fleksibilitas memilih kebutuhan rumah tangga. Efek terhadap gizi dan ketahanan pangan bergantung pada harga, ketersediaan pasar, kebutuhan rumah tangga, desain program, dan tujuan intervensi.',
    proFocus: 'Telusuri kondisi ketika bantuan pangan lebih mampu memastikan konsumsi pangan tertentu, terutama saat pasar atau akses pangan terbatas, serta bukti terkait kualitas konsumsi dan ketahanan pangan.',
    contraFocus: 'Bandingkan fleksibilitas bantuan tunai, perubahan konsumsi dan ketahanan pangan, serta kondisi pasar dan variasi kebutuhan rumah tangga.',
    starterQuestions: [
      'Apa indikator yang dipakai untuk mendefinisikan kebutuhan gizi terpenuhi?',
      'Dalam kondisi apa pangan langsung lebih efektif daripada uang tunai?',
      'Bagaimana harga dan ketersediaan pasar memengaruhi hasil?',
      'Apakah rumah tangga memiliki kebutuhan yang sama?',
    ],
    sources: [
      {
        title: 'WFP — Food assistance: cash and in-kind',
        url: 'https://www.wfp.org/food-assistance',
        domain: 'wfp.org',
        quality: 'tinggi',
        year: '2026',
        scope: 'Global',
        summary: 'WFP menjelaskan bahwa bantuan pangan dapat diberikan dalam bentuk pangan langsung, uang tunai, atau voucher; bantuan tunai memberi pilihan dan fleksibilitas, sementara bentuk bantuan dipilih sesuai konteks.',
      },
      {
        title: 'WFP — Cash and In-Kind Transfers in Humanitarian Settings: A Review of Evidence and Knowledge Gaps',
        url: 'https://www.wfp.org/publications/cash-and-kind-transfers-humanitarian-settings-review-evidence-and-knowledge-gaps',
        domain: 'wfp.org',
        quality: 'tinggi',
        year: '2022',
        scope: 'Humanitarian settings / LMIC evidence',
        summary: 'Tinjauan sistematis membandingkan bantuan tunai dan in-kind terhadap kebutuhan dasar dan hasil pembangunan, dengan penekanan bahwa efektivitas sangat bergantung pada konteks program.',
      },
      {
        title: 'World Bank — What have we learned about cash transfers?',
        url: 'https://blogs.worldbank.org/en/impactevaluations/what-have-we-learned-about-cash-transfers',
        domain: 'worldbank.org',
        quality: 'tinggi',
        year: '2021',
        scope: 'International evidence summary',
        summary: 'Ringkasan bukti World Bank menunjukkan transfer tunai dapat meningkatkan pemanfaatan layanan kesehatan dan gizi, sementara dampak akhir terhadap status gizi bervariasi menurut desain dan konteks.',
      },
    ],
  },
  {
    id: 8,
    sdg: 'SDG 3',
    title: 'Pembatasan Penggunaan HP pada Remaja',
    blurb: 'HP dapat membantu komunikasi dan belajar, tetapi penggunaan bermasalah dapat berkaitan dengan tidur, aktivitas fisik, dan kesejahteraan.',
    motion: 'Pembatasan penggunaan HP pada remaja diperlukan untuk kualitas hidup dan kesehatan.',
    context: 'Ponsel digunakan remaja untuk komunikasi, belajar, hiburan, dan media sosial. Penggunaan berlebihan atau bermasalah dapat berkaitan dengan tidur, aktivitas fisik, dan kesejahteraan, tetapi hubungan tersebut kompleks dan dipengaruhi oleh jenis aktivitas serta konteks. Karena itu, “pembatasan” perlu dibedakan dari sekadar menghitung durasi layar.',
    proFocus: 'Telusuri hubungan penggunaan bermasalah dengan tidur, aktivitas fisik, kesejahteraan, serta bentuk batas penggunaan yang realistis dan tidak menghilangkan manfaat komunikasi atau belajar.',
    contraFocus: 'Telusuri bukti yang menunjukkan dampak screen time berbeda menurut aktivitas dan konteks, serta manfaat penggunaan HP untuk belajar, komunikasi, dan dukungan sosial.',
    starterQuestions: [
      'Apa arti “pembatasan” dalam mosi ini: durasi, jenis aplikasi, waktu tertentu, atau aturan tertentu?',
      'Apakah durasi layar saja cukup untuk mengukur dampak kesehatan?',
      'Bagaimana membedakan penggunaan untuk belajar dengan hiburan?',
      'Apakah aturan yang sama cocok untuk semua remaja?',
    ],
    sources: [
      {
        title: 'WHO Europe — Addressing the digital determinants of youth mental health and well-being',
        url: 'https://www.who.int/europe/publications/i/item/WHO-EURO-2025-12187-51959-79685',
        domain: 'who.int',
        quality: 'tinggi',
        year: '2025',
        scope: 'WHO European Region',
        summary: 'WHO Europe menekankan bahwa bukti mengenai teknologi dan kesejahteraan mental remaja bersifat campuran, dengan kemungkinan efek positif dan negatif serta hubungan dua arah antara penggunaan digital dan kesejahteraan.',
      },
      {
        title: 'WHO Europe — Teens, screens and mental health',
        url: 'https://www.who.int/europe/news/item/25-09-2024-teens--screens-and-mental-health',
        domain: 'who.int',
        quality: 'tinggi',
        year: '2024',
        scope: '44 countries/areas; HBSC 2022',
        summary: 'Analisis HBSC 2022 terhadap hampir 280 ribu remaja menunjukkan 11% melaporkan penggunaan media sosial yang bermasalah, naik dari 7% pada 2018.',
      },
      {
        title: 'WHO — WHO guidelines on physical activity and sedentary behaviour',
        url: 'https://www.who.int/publications/i/item/9789240015128',
        domain: 'who.int',
        quality: 'tinggi',
        year: '2020',
        scope: 'Global',
        summary: 'Pedoman WHO memberikan rekomendasi berbasis bukti untuk aktivitas fisik dan perilaku sedentari pada anak dan remaja, relevan saat membahas keseimbangan antara waktu layar dan aktivitas.',
      },
    ],
  },
]; 

// Bank Mosi resmi yang ditampilkan di V1. Data mosi lain tetap dipertahankan
// di SAMPLE_ISSUES agar dapat diaktifkan kembali tanpa menghapusnya.
const ENABLED_ISSUE_IDS = new Set([1, 2, 3, 4]);

const verdictMeta: Record<ClaimResult['verdict'], { label: string; color: string }> = {
  verified: { label: 'Terverifikasi', color: 'bg-[#0F766E]/20 text-[#0F766E]' },
  mostly_true: { label: 'Sebagian besar benar', color: 'bg-[#0F766E]/20 text-[#0F766E]' },
  misleading: { label: 'Menyesatkan', color: 'bg-[#FFF8EC]/20 text-[#B97819]' },
  false: { label: 'Bertentangan', color: 'bg-coral/20 text-coral' },
  unverifiable: { label: 'Belum terverifikasi', color: 'bg-[#FFF8EC]/20 text-[#B97819]' },
  not_fact: { label: 'Bukan klaim fakta', color: 'bg-slate/20 text-[#70758B]' },
};

const qualityLabel: Record<Source['quality'], string> = {
  tinggi: 'Sumber prioritas',
  sedang: 'Sumber pendukung',
  lainnya: 'Sumber referensi',
};

const fakeDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_FACT_CHECK_PROFILES: Record<number, {
  claims: string[];
  explanation: string;
  caveat: string;
  queries: string[];
}> = {
  1: {
    claims: [
      'Paparan terhadap AI tidak selalu berarti pekerjaan akan hilang karena banyak pekerjaan diperkirakan lebih banyak berubah daripada sepenuhnya digantikan.',
      'AI dapat menciptakan pekerjaan baru sekaligus menimbulkan displacement pada sebagian pekerjaan atau tugas.',
    ],
    explanation: 'Simulasi menilai klaim ini relevan dengan sumber ketenagakerjaan yang ada pada Source Pack. Untuk penggunaan nyata, definisi “pekerjaan tercipta” dan “pekerjaan hilang” harus dibatasi agar bukti dapat dibandingkan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: generative AI jobs transformation displacement', 'simulasi: AI job creation and displacement'],
  },
  2: {
    claims: [
      'Pengembangan AI dapat meningkatkan konsumsi listrik pusat data, sementara AI juga dapat dipakai untuk efisiensi energi dan pemantauan lingkungan.',
      'Dampak lingkungan AI perlu dinilai sepanjang siklus hidup, bukan hanya dari penggunaan listrik model.',
    ],
    explanation: 'Simulasi menilai kedua klaim sejalan dengan arah Source Pack. Perbandingan “manfaat lebih besar” tetap memerlukan indikator manfaat dan dampak yang jelas serta konteks penggunaan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: AI data centre electricity environmental impact', 'simulasi: AI environmental benefits lifecycle assessment'],
  },
  3: {
    claims: [
      'AI dapat memberi manfaat seperti personalisasi dan aksesibilitas, tetapi penggunaan tanpa pengawasan juga dapat menimbulkan kesalahan, bias, dan risiko privasi.',
      'Penggunaan chatbot untuk belajar cukup luas sehingga kemampuan siswa memeriksa dan menggunakan hasil AI secara kritis menjadi penting.',
    ],
    explanation: 'Simulasi menilai klaim konsisten dengan sumber UNESCO, UNICEF, dan OECD pada Source Pack. Dampak terhadap hasil belajar tetap perlu dilihat menurut tugas dan pola penggunaan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: generative AI education learning benefits risks', 'simulasi: Indonesia students chatbot learning PISA 2025'],
  },
  4: {
    claims: [
      'GenAI dapat menurunkan hambatan produksi dan distribusi informasi menyesatkan dalam skala besar.',
      'Kemampuan membedakan konten AI dan manusia menjadi tantangan penting dalam penilaian informasi digital.',
    ],
    explanation: 'Simulasi menilai klaim relevan dengan laporan WEF, survei OECD, dan materi UNICEF. Namun, “lebih berbahaya” membutuhkan indikator dampak yang lebih spesifik daripada sekadar asal konten.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: AI generated misinformation scale detection', 'simulasi: AI vs human generated misleading content'],
  },
  5: {
    claims: [
      'Anak dapat menghadapi berbagai risiko daring di media sosial, termasuk paparan konten yang tidak sesuai dan pengalaman online yang membuat tidak nyaman atau takut.',
      'Keselamatan digital anak tidak hanya bergantung pada pemerintah, tetapi juga pada desain platform, orang tua, dan sekolah.',
    ],
    explanation: 'Simulasi menilai kedua klaim sesuai dengan fokus sumber UNICEF dan OECD. Bentuk pengawasan pemerintah tetap perlu didefinisikan agar dapat diuji secara konkret.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: child online safety social media Indonesia', 'simulasi: digital safety by design children government platform'],
  },
  6: {
    claims: [
      'Kendaraan listrik dapat menghasilkan emisi siklus hidup yang lebih rendah daripada kendaraan bensin dalam banyak skenario yang dianalisis IEA.',
      'Dampak kendaraan listrik tetap dipengaruhi sumber listrik, produksi baterai, penggunaan, dan infrastruktur pengisian.',
    ],
    explanation: 'Simulasi menilai klaim relevan dengan analisis IEA pada Source Pack. Perbandingan perlu menyebut wilayah dan asumsi siklus hidup yang digunakan.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: lifecycle emissions electric vehicle vs ICE', 'simulasi: EV electricity mix battery lifecycle emissions'],
  },
  7: {
    claims: [
      'Bantuan pangan dan bantuan tunai dapat menghasilkan manfaat yang berbeda tergantung kondisi pasar, kebutuhan rumah tangga, dan desain program.',
      'Bantuan tunai memberi fleksibilitas penggunaan, sedangkan bantuan pangan dapat secara langsung menyediakan komoditas tertentu.',
    ],
    explanation: 'Simulasi menilai klaim sesuai dengan tinjauan WFP dan ringkasan bukti World Bank. Pernyataan bahwa salah satu bentuk bantuan selalu lebih menjamin gizi perlu dibatasi pada kondisi tertentu.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: cash transfers versus in-kind food assistance nutrition', 'simulasi: food assistance cash transfer context markets'],
  },
  8: {
    claims: [
      'Penggunaan media sosial yang bermasalah pada remaja dapat berkaitan dengan kesejahteraan dan kesehatan, tetapi hubungan tersebut tidak selalu sederhana.',
      'Pedoman kesehatan mendukung pengurangan perilaku sedentari dan keseimbangan dengan aktivitas fisik, tidur, dan kegiatan lain.',
    ],
    explanation: 'Simulasi menilai klaim konsisten dengan sumber WHO, dengan catatan bahwa durasi layar saja tidak cukup untuk menggambarkan dampak semua aktivitas digital.',
    caveat: 'Ini adalah hasil DUMMY. Sistem belum melakukan pemeriksaan web atau validasi bukti secara langsung.',
    queries: ['simulasi: adolescent screen time mental health problematic social media', 'simulasi: WHO sedentary behaviour adolescents screen time'],
  },
};

function makeMockSourcePack(issue: Issue): Source[] {
  return issue.sources.map((source) => ({ ...source }));
}

const MOCK_EVIDENCE_BY_ISSUE: Record<number, string[]> = {
  1: [
    'Temuan simulasi: ILO menekankan bahwa paparan GenAI pada pekerjaan tidak otomatis berarti penghapusan pekerjaan karena banyak pekerjaan diperkirakan mengalami transformasi tugas.',
    'Temuan simulasi: WEF 2025 memproyeksikan penciptaan dan displacement pekerjaan hingga 2030, tetapi proyeksi itu mencakup berbagai tren struktural, bukan AI saja.',
  ],
  2: [
    'Temuan simulasi: IEA memperkirakan kebutuhan listrik pusat data meningkat tajam hingga 2030 dan AI menjadi salah satu pendorong penting.',
    'Temuan simulasi: UNEP menekankan penilaian dampak lingkungan AI secara end-to-end, termasuk sumber daya dan infrastruktur digital.',
  ],
  3: [
    'Temuan simulasi: UNESCO dan UNICEF mengidentifikasi peluang AI untuk personalisasi dan aksesibilitas sekaligus risiko kesalahan, privasi, bias, dan ketergantungan.',
    'Temuan simulasi: OECD melaporkan 53% siswa di Indonesia menggunakan chatbot setiap minggu untuk belajar dalam PISA 2025.',
  ],
  4: [
    'Temuan simulasi: WEF menyoroti bahwa GenAI menurunkan hambatan produksi dan distribusi konten menyesatkan dalam skala besar.',
    'Temuan simulasi: OECD Truth Quest menguji kemampuan responden membedakan informasi benar dan palsu/menyesatkan, termasuk konten AI dan manusia.',
  ],
  5: [
    'Temuan simulasi: Studi UNICEF Indonesia menunjukkan anak menghadapi beragam risiko online dan pengetahuan keselamatan digital belum merata.',
    'Temuan simulasi: OECD menempatkan safety-by-design dan mekanisme keselamatan sesuai usia sebagai bagian penting dari perlindungan anak online.',
  ],
  6: [
    'Temuan simulasi: IEA 2024 memperkirakan emisi siklus hidup mobil listrik baterai ukuran menengah dalam skenario global tertentu sekitar setengah mobil ICE ekuivalen.',
    'Temuan simulasi: IEA 2026 memperkirakan penggunaan EV telah menghindari emisi CO2-eq secara bersih, dengan besarnya dampak bergantung pada lintasan kebijakan dan sistem energi.',
  ],
  7: [
    'Temuan simulasi: WFP menjelaskan bantuan dapat diberikan sebagai pangan, tunai, atau voucher dan bentuk bantuan dipilih sesuai konteks.',
    'Temuan simulasi: tinjauan WFP dan ringkasan World Bank menunjukkan hasil cash dan in-kind berbeda menurut kondisi pasar, desain, serta tujuan program.',
  ],
  8: [
    'Temuan simulasi: WHO Europe menyatakan bukti hubungan antara teknologi dan kesehatan mental remaja bersifat campuran dan dapat berlangsung dua arah.',
    'Temuan simulasi: WHO menyediakan rekomendasi aktivitas fisik dan sedentari untuk anak dan remaja, sehingga keseimbangan aktivitas penting saat membahas screen time.',
  ],
};

function mockEvidenceForClaim(issue: Issue | null, claim: string): string {
  const findings = MOCK_EVIDENCE_BY_ISSUE[issue?.id || 1] || [];
  const sources = makeMockSourcePack(issue || SAMPLE_ISSUES[0]);
  const sourceText = sources.slice(0, 2).map((source, index) =>
    `${source.title}\nTemuan: ${findings[index] || 'Temuan simulasi yang relevan dengan klaim.'}\nSumber: ${source.url}`
  ).join('\n\n');
  return `Klaim yang diperiksa: ${claim}\n\n${sourceText}`;
}

async function mockFactCheck(payload: { claim?: string; text?: string; issue?: Issue | null; maxClaims?: number }): Promise<ClaimResult[]> {
  await fakeDelay();
  const issueId = payload.issue?.id || 1;
  const profile = MOCK_FACT_CHECK_PROFILES[issueId] || MOCK_FACT_CHECK_PROFILES[1];
  const input = (payload.claim || payload.text || '').trim();
  const requestedClaims = payload.claim
    ? [payload.claim.trim()]
    : profile.claims.slice(0, Math.min(Number(payload.maxClaims || 2), 2));
  const sources = makeMockSourcePack(payload.issue || SAMPLE_ISSUES[0]);

  return requestedClaims.map((claim, index) => ({
    id: `mock-${Date.now()}-${index}`,
    claim: claim || input,
    normalizedClaim: claim || input,
    type: 'factual',
    verdict: index === 0 ? 'mostly_true' : 'verified',
    confidence: index === 0 ? 86 : 91,
    explanation: profile.explanation,
    caveat: profile.caveat,
    sources,
    searchQueries: profile.queries,
    checkedAt: new Date().toISOString(),
  }));
}

function cleanAiText(value: string): string {
  return String(value || '')
    .replace(/\\([*_#`>])/g, '$1')
    .replace(/\r/g, '')
    .replace(/^```(?:text|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\n)\s*[-*]\s+/g, '$1• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const DEBATE_PRINT_CSS = `
  @media print {
    @page { size: A4; margin: 14mm; }
    body { background: #fff !important; color: #111827 !important; }
    body * { visibility: hidden !important; }
    .debate-export-sheet, .debate-export-sheet * { visibility: visible !important; }
    .debate-export-sheet {
      display: block !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      background: #fff !important;
      color: #111827 !important;
      font-family: Arial, sans-serif !important;
      line-height: 1.55 !important;
      font-size: 10.5pt !important;
    }
    .debate-export-sheet h1 { font-size: 20pt !important; margin: 0 0 6pt !important; }
    .debate-export-sheet h2 { font-size: 14pt !important; margin: 16pt 0 7pt !important; page-break-after: avoid; }
    .debate-export-sheet h3 { font-size: 11.5pt !important; margin: 11pt 0 5pt !important; page-break-after: avoid; }
    .debate-export-sheet p, .debate-export-sheet li { margin: 0 0 5pt !important; }
    .debate-export-sheet .print-card {
      border: 1px solid #d7dbe5;
      border-radius: 8px;
      padding: 9pt;
      margin: 0 0 8pt;
      break-inside: avoid;
    }
    .debate-export-sheet .print-meta { color: #596174; font-size: 9pt; margin-bottom: 10pt; }
    .debate-export-sheet .print-source { color: #374151; font-size: 9pt; word-break: break-word; }
    .debate-export-sheet .print-muted { color: #667085; }
  }
  @media screen {
    .debate-export-sheet { display: none; }
  }
`;

function formatApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.';
  if (/quota|rate.?limit|429/i.test(message)) {
    return 'Layanan AI sedang mencapai batas penggunaan. Pemeriksaan belum menghasilkan verdict. Coba lagi setelah kuota tersedia.';
  }
  return message;
}

export default function App() {
  const [currentStage, setCurrentStage] = useState(0);
  const [furthestStage, setFurthestStage] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [debatePosition, setDebatePosition] = useState<'PRO' | 'KONTRA' | ''>('');

  const [exploration, setExploration] = useState('');
  const [explorerReply, setExplorerReply] = useState('');
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerIssueId, setExplorerIssueId] = useState<number | null>(null);

  const [claims, setClaims] = useState<ClaimResult[]>([]);
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [factCheckError, setFactCheckError] = useState<string | null>(null);
  const [draftClaim, setDraftClaim] = useState('');
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const [argument, setArgument] = useState<Argument>({ claim: '', reason: '', evidence: '' });
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const [debateLog, setDebateLog] = useState<{ who: 'ai' | 'user'; text: string }[]>([]);
  const [debateInput, setDebateInput] = useState('');
  const [debateLoading, setDebateLoading] = useState(false);
  const [sparringRound, setSparringRound] = useState(0);

  const [solution, setSolution] = useState('');
  const [evalReply, setEvalReply] = useState('');
  const [evalLoading, setEvalLoading] = useState(false);

  const debateRun = useDebateRun(
    selectedIssue,
    debatePosition,
    'v1',
    currentStage === 7 &&
    solution.trim() &&
    evalReply.trim()
      ? {
          ...argument,
          solution,
          evaluation: evalReply,
        }
      : null,
  );

  const verifiedClaims = useMemo(
    () => claims.filter((claim) => ['verified', 'mostly_true'].includes(claim.verdict)),
    [claims],
  );

  const blockingClaims = useMemo(
    () => claims.filter((claim) => !['verified', 'mostly_true', 'not_fact'].includes(claim.verdict)),
    [claims],
  );

  const canProceedFactCheck = verifiedClaims.length > 0;
  const canReviewArgument = Boolean(argument.claim.trim() && argument.reason.trim() && argument.evidence.trim());
  const canProceedToDebate = canReviewArgument && Boolean(review.trim()) && !reviewLoading;
  const canProceedToSolution = sparringRound >= 1;
  const canProceedToImpact = Boolean(solution.trim() && evalReply.trim()) && !evalLoading;

  useEffect(() => {
    if (!selectedIssue) return;
    setExploration('');
    setExplorerReply('');
    setExplorerIssueId(null);
    setClaims([]);
    setDraftClaim('');
    setFactCheckError(null);
    setArgument({ claim: '', reason: '', evidence: '' });
    setReview('');
    setDebateLog([]);
    setDebateInput('');
    setSparringRound(0);
    setSolution('');
    setEvalReply('');
  }, [selectedIssue?.id, debatePosition]);

  useEffect(() => {
    if (currentStage !== 2 || !selectedIssue || !debatePosition || explorerIssueId === selectedIssue.id) return;

    let cancelled = false;
    const loadExplorer = async () => {
      setExplorerLoading(true);
      const fallback = `${selectedIssue.context}\n\nMosi debat: ${selectedIssue.motion}\n\nArah PRO: ${selectedIssue.proFocus}\nArah KONTRA: ${selectedIssue.contraFocus}\n\nPertanyaan pemantik:\n${selectedIssue.starterQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
      try {
        const result = await callAPI('explore', { issue: selectedIssue, position: debatePosition, focus: debatePosition === 'PRO' ? selectedIssue.proFocus : selectedIssue.contraFocus, starterQuestions: selectedIssue.starterQuestions });
        if (!cancelled) {
          setExplorerReply(cleanAiText(String(result || fallback)));
          setExplorerIssueId(selectedIssue.id);
        }
      } catch (error) {
        if (!cancelled) setExplorerReply(fallback);
      } finally {
        if (!cancelled) setExplorerLoading(false);
      }
    };

    loadExplorer();
    return () => { cancelled = true; };
  }, [currentStage, selectedIssue, debatePosition, explorerIssueId]);

  useEffect(() => {
    if (currentStage !== 5 || debateLog.length > 0) return;
    setDebateLog([
      {
        who: 'ai',
        text: `Argumenmu: "${argument.claim || '(belum diisi)'}". Jelaskan bagaimana bukti yang kamu punya mendukung klaimmu dan bagaimana kamu menjawab bagian mosi yang belum sepenuhnya dibuktikan. Saya hanya sparring partner sebelum debat dengan siswa lain.`,
      },
    ]);
  }, [currentStage, debateLog.length, argument.claim]);

  function mockArgumentReview(issue: Issue | null, arg: Argument) {
    const evidence = arg.evidence.trim();
    const hasUrl = /https?:\/\//i.test(evidence);
    const hasReason = arg.reason.trim().length >= 30;
    const claim = arg.claim.trim();
    const findings = MOCK_EVIDENCE_BY_ISSUE[issue?.id || 1] || [];
    const sources = makeMockSourcePack(issue || SAMPLE_ISSUES[0]).slice(0, 2);

    if (claim && hasReason && hasUrl) {
      const evidenceLines = sources.map((source, index) =>
        `${source.title}: ${findings[index] || source.summary || 'Temuan simulasi yang relevan dengan klaim.'}`
      );

      return [
        'Review AI',
        '',
        '1. Relevansi bukti',
        'Bukti sudah memiliki sumber yang jelas dan dapat dihubungkan dengan klaim. Pada mode simulasi, temuan berikut digunakan sebagai bukti pendukung:',
        `• ${evidenceLines[0]}`,
        `• ${evidenceLines[1]}`,
        '',
        '2. Hubungan klaim dan alasan',
        'Alasan menjelaskan mekanisme yang membuat klaim masuk akal dan masih berada dalam ruang lingkup klaim.',
        '',
        '3. Catatan penting',
        'Jangan menarik kesimpulan yang lebih luas daripada temuan sumber. Pada versi produksi, temuan simulasi harus diganti dengan kutipan atau data nyata dari Source Pack.',
        '',
        '4. Kesimpulan',
        'Argumen sudah cukup koheren untuk lanjut ke Uji Argumen. Tetap pertahankan batas klaim sesuai bukti yang tersedia.',
      ].join('\n');
    }

    return [
      'Review AI',
      '',
      'Argumen belum siap direview penuh.',
      'Lengkapi klaim dan alasan, lalu masukkan minimal satu sumber dengan URL pada bagian bukti.',
    ].join('\n');
  }

  function mockDebateReply(round: number) {
    const replies = [
      'Sanggahan: bukti yang kamu sebutkan masih umum. Jelaskan bagian mana dari bukti tersebut yang paling langsung mendukung klaimmu dan hindari menyimpulkan lebih jauh dari data.',
      'Pertanyaan penguji: indikator apa yang dapat digunakan untuk membedakan pengaruh faktor yang kamu sebut dari faktor lain? Jelaskan batas bukti yang kamu miliki.',
      'Sanggahan terakhir: nyatakan dengan jelas apa yang dapat dibuktikan oleh sumbermu dan apa yang masih menjadi keterbatasan. Pertahankan hanya bagian argumen yang benar-benar didukung bukti.'
    ];
    return replies[Math.max(0, Math.min(replies.length - 1, round - 1))];
  }

  function mockSolutionEvaluation() {
    const issueContext = selectedIssue?.title || 'isu yang dipilih';
    return `1. Kesesuaian masalah\nSolusi relevan dengan masalah pada ${issueContext} dan perlu menunjukkan hubungan yang jelas antara masalah, tindakan, serta hasil yang diharapkan.\n\n2. Kelayakan pelaksanaan\nSolusi cukup realistis jika dilakukan bertahap dan disesuaikan dengan sumber daya, waktu, serta kondisi pihak yang terlibat.\n\n3. Pihak yang terlibat\nTentukan pihak yang memiliki kewenangan, pelaksana, penerima manfaat, serta pihak pendukung sesuai konteks mosi.\n\n4. Indikator keberhasilan\nGunakan ukuran yang dapat diamati, misalnya perubahan akses/partisipasi, penggunaan layanan, biaya, emisi, hasil belajar, keselamatan digital, kualitas konsumsi, atau indikator lain yang relevan dengan isu.\n\n5. Risiko utama\nPerhatikan keterbatasan anggaran, perubahan kebiasaan, infrastruktur, ketimpangan akses, dampak tidak langsung, atau partisipasi yang rendah.\n\n6. Kesimpulan dan satu perbaikan prioritas\nSolusi dapat dilanjutkan setelah indikator keberhasilan dan pembagian tanggung jawab dibuat lebih spesifik.`;
  }

  function buildLocalSolutionEvaluationFallback() {
    const title = selectedIssue?.title || 'isu yang dipilih';
    return [
      '1. Kesesuaian masalah',
      `Solusi sudah relevan dengan ${title} karena menghubungkan dampak AI, transisi pekerja, dan penciptaan peluang kerja baru.`,
      '',
      '2. Kelayakan pelaksanaan',
      'Pelaksanaannya membutuhkan pembagian peran yang jelas, sumber daya pelatihan, dan penerapan bertahap agar dapat disesuaikan dengan kebutuhan pekerja.',
      '',
      '3. Pihak yang terlibat',
      'Pemerintah, perusahaan, dan lembaga pendidikan memiliki peran yang saling melengkapi dalam pelatihan, dukungan transisi, dan penyiapan keterampilan.',
      '',
      '4. Indikator keberhasilan',
      'Gunakan ukuran seperti jumlah peserta yang menyelesaikan pelatihan, perpindahan ke pekerjaan baru, dan perubahan tingkat displacement yang relevan dengan program.',
      '',
      '5. Risiko utama',
      'Risiko utamanya adalah akses pelatihan yang tidak merata, keterbatasan sumber daya, dan keterampilan yang tidak sesuai dengan kebutuhan pekerjaan baru.',
      '',
      '6. Kesimpulan dan satu perbaikan prioritas',
      'Solusi dapat dilanjutkan dengan memperjelas target kelompok pekerja, jangka waktu pelaksanaan, dan indikator yang digunakan untuk mengukur hasil.'
    ].join('\n');
  }

  async function callAPI(action: string, payload: unknown) {
    const response = await fetchAI('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, debateSessionId: debateRun.id, }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `API gagal (${response.status})`) as ApiError;
      error.code = data?.code;
      throw error;
    }
    if (data?.result === undefined) throw new Error('Respons API tidak memiliki field result.');
    return data.result;
  }

  function goTo(index: number) {
    const safeIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    setCurrentStage(safeIndex);
    setFurthestStage((previous) => Math.max(previous, safeIndex));
  }

  async function runFactCheck() {
    if (!exploration.trim()) {
      setFactCheckError('Masukkan catatan eksplorasi terlebih dahulu.');
      return;
    }
    setFactCheckLoading(true);
    setFactCheckError(null);
    try {
      const result = FACT_CHECK_MODE === 'dummy'
        ? await mockFactCheck({ text: exploration, issue: selectedIssue, maxClaims: 2 })
        : await callAPI('factCheck', { text: exploration, issue: selectedIssue, maxClaims: 8 });
      if (!Array.isArray(result)) throw new Error('Hasil fact check tidak berbentuk daftar klaim.');
      setClaims(result);
    } catch (error) {
      setFactCheckError(formatApiError(error));
    } finally {
      setFactCheckLoading(false);
    }
  }

  async function addAndCheckClaim() {
    const claim = draftClaim.trim();
    if (!claim) return;
    setDraftClaim('');
    setRecheckingId(`new-${Date.now()}`);
    setFactCheckError(null);
    try {
      const result = FACT_CHECK_MODE === 'dummy'
        ? await mockFactCheck({ claim, issue: selectedIssue, maxClaims: 1 })
        : await callAPI('factCheck', { claim, issue: selectedIssue, maxClaims: 1 });
      if (!Array.isArray(result) || result.length === 0) throw new Error('Klaim tidak menghasilkan hasil pemeriksaan.');
      setClaims((previous) => [...previous, result[0]]);
    } catch (error) {
      setFactCheckError(formatApiError(error));
    } finally {
      setRecheckingId(null);
    }
  }

  async function recheckClaim(claim: ClaimResult) {
    setRecheckingId(claim.id);
    setFactCheckError(null);
    try {
      const result = FACT_CHECK_MODE === 'dummy'
        ? await mockFactCheck({ claim: claim.claim, issue: selectedIssue, maxClaims: 1 })
        : await callAPI('factCheck', { claim: claim.claim, issue: selectedIssue, maxClaims: 1 });
      if (!Array.isArray(result) || result.length === 0) throw new Error('Tidak ada hasil baru untuk klaim tersebut.');
      setClaims((previous) => previous.map((item) => (item.id === claim.id ? result[0] : item)));
    } catch (error) {
      setFactCheckError(formatApiError(error));
    } finally {
      setRecheckingId(null);
    }
  }

  function selectClaimForArgument(claim: ClaimResult) {
    const sourceEvidence = claim.sources.map((source) => [
      `Sumber: ${source.title}`,
      `Ringkasan Source Pack: ${source.summary || 'Ringkasan sumber belum tersedia.'}`,
      `URL: ${source.url}`,
    ].join('\n')).join('\n\n');

    setArgument({
      claim: claim.claim,
      reason: '',
      evidence: FACT_CHECK_MODE === 'dummy'
        ? mockEvidenceForClaim(selectedIssue, claim.claim)
        : sourceEvidence,
    });
    setReview('');
    goTo(4);
  }

  function buildLocalReviewFallback() {
    const claim = argument.claim.trim();
    const reason = argument.reason.trim();
    const evidence = argument.evidence.trim();

    if (!claim || !reason || !evidence) {
      return [
        'Review AI',
        '',
        '1. Relevansi bukti',
        'Argumen belum cukup lengkap untuk direview.',
        '',
        '2. Hubungan klaim dan alasan',
        'Lengkapi klaim, alasan, dan bukti yang berasal dari Source Pack.',
        '',
        '3. Catatan penting',
        'Pastikan bukti mendukung klaim secara langsung dan jangan memperluas kesimpulan melebihi isi sumber.',
        '',
        '4. Kesimpulan dan satu perbaikan prioritas',
        'Perjelas hubungan antara klaim dan temuan sumber yang paling relevan.',
      ].join('\n');
    }

    return [
      'Review AI',
      '',
      '1. Relevansi bukti',
      'Bukti yang diberikan berasal dari Source Pack dan relevan dengan klaim. Pastikan temuan yang digunakan benar-benar mendukung bagian utama klaim.',
      '',
      '2. Hubungan klaim dan alasan',
      'Alasan menjelaskan mengapa klaim masuk akal dan masih berada pada ruang lingkup mosi.',
      '',
      '3. Catatan penting',
      'Bukti ILO mendukung bahwa paparan GenAI sering berkaitan dengan perubahan tugas, tetapi ini belum dengan sendirinya membuktikan bahwa pekerjaan baru lebih banyak daripada pekerjaan yang hilang.',
      '',
      '4. Kesimpulan dan satu perbaikan prioritas',
      'Argumen sudah cukup koheren untuk dilanjutkan. Perbaikan prioritas: tambahkan bukti terpisah tentang penciptaan pekerjaan baru.',
    ].join('\n');
  }

  async function getReview() {
    setReviewLoading(true);
    try {
      if (ARGUMENT_REVIEW_MODE === 'dummy') {
        await fakeDelay();
        setReview(mockArgumentReview(selectedIssue, argument));
      } else {
        const reply = await callAPI('reviewArgument', {
          issue: selectedIssue,
          position: debatePosition,
          argument,
        });
        setReview(cleanAiText(String(reply || 'AI Reviewer tidak memberikan hasil.')));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI Reviewer gagal dijalankan.';
      const code = (error as ApiError)?.code || '';
      if (/terpotong|MAX_TOKENS|batas output|INCOMPLETE/i.test(`${message} ${code}`)) {
        setReview(buildLocalReviewFallback());
      } else {
        setReview(`AI Reviewer gagal: ${message}`);
      }
    } finally {
      setReviewLoading(false);
    }
  }

  async function sendDebateMessage() {
    const message = debateInput.trim();
    if (!message || debateLoading || sparringRound >= 3) return;

    const history = [...debateLog, { who: 'user' as const, text: message }];
    setDebateLog([...history, { who: 'ai', text: 'mengetik...' }]);
    setDebateInput('');
    setDebateLoading(true);

    try {
      let reply = '';
      if (AI_STAGE_MODE === 'dummy') {
        await fakeDelay();
        reply = mockDebateReply(sparringRound + 1);
      } else {
        reply = cleanAiText(String(await callAPI('debate', {
          msg: message,
          arg: argument,
          issue: selectedIssue,
          position: debatePosition,
          round: sparringRound + 1,
        })));
      }
      setDebateLog([...history, { who: 'ai', text: reply }]);
      setSparringRound((previous) => previous + 1);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Sparring gagal dijalankan.';
      const isTruncated = /terpotong|MAX_TOKENS|batas output/i.test(messageText);
      const fallbackReply = 'Pertanyaan penguji: bukti ILO mendukung perubahan tugas, tetapi belum membuktikan jumlah pekerjaan baru. Bukti tambahan apa yang akan kamu gunakan untuk mendukung bagian mosi tersebut?';
      setDebateLog([...history, {
        who: 'ai',
        text: isTruncated ? fallbackReply : `Sparring gagal: ${messageText}`,
      }]);
    } finally {
      setDebateLoading(false);
    }
  }

  async function getSolutionEvaluation() {
    if (!solution.trim()) return;
    setEvalLoading(true);
    try {
      if (SOLUTION_EVALUATOR_MODE === 'dummy') {
        await fakeDelay();
        setEvalReply(mockSolutionEvaluation());
      } else {
        const reply = await callAPI('evaluateSolution', {
          solution,
          issue: selectedIssue,
          position: debatePosition,
        });
        setEvalReply(cleanAiText(String(reply || 'AI Evaluator tidak memberikan hasil.')));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI Evaluator gagal dijalankan.';
      if (/terpotong|MAX_TOKENS|batas output|INCOMPLETE/i.test(message)) {
        setEvalReply(buildLocalSolutionEvaluationFallback());
      } else {
        setEvalReply(`AI Evaluator gagal: ${message}`);
      }
    } finally {
      setEvalLoading(false);
    }
  }

  function uniqueSources(sources: Source[]) {
    const seen = new Set<string>();
    return sources.filter((source) => {
      const key = `${source.title}|${source.domain}|${source.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function exportDebatePdf() {
    window.print();
  }

  function renderPanel() {
    const stage = STAGES[currentStage].id;

    if (stage === 'home') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">AI × SDGs Platform · SOURCE PACK</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Dari isu global<br />ke solusi nyata.</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[60ch] mb-8">Eksplorasi isu SDGs, periksa klaim dengan bukti, bangun argumen, uji argumenmu sebelum debat siswa, lalu kembangkan solusi.</p>
          <Btn onClick={() => goTo(1)}>Mulai Eksplorasi</Btn>
        </div>
      );
    }

    if (stage === 'issue-bank') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">01 — Issue Bank</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Pilih satu isu SDGs</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[60ch] mb-8">Pilih satu dari 4 mosi resmi pada Bank Mosi. Mosi yang dipilih menjadi konteks seluruh perjalanan.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {SAMPLE_ISSUES.filter((issue) => ENABLED_ISSUE_IDS.has(issue.id)).map((issue) => (
              <button key={issue.id} type="button" onClick={() => setSelectedIssue(issue)} className={`text-left h-full flex flex-col bg-white/90 border rounded-[20px] p-[18px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[#0F766E] ${selectedIssue?.id === issue.id ? 'border-[#F2A93B]/60 bg-[#FFF8EC]/10' : 'border-[#E6E7EF]'}`}>
                <div className="font-mono text-[11px] text-[#0F766E]">{issue.sdg}</div>
                <h3 className="font-display text-base my-1.5">{issue.title}</h3>
                <p className="text-[13px] text-[#70758B] m-0 leading-relaxed flex-grow">{issue.blurb}</p>
                <div className="mt-3 pt-3 border-t border-[#E6E7EF]/70">
                  <div className="font-mono text-[10px] text-[#B97819] uppercase tracking-wider mb-1">Mosi</div>
                  <p className="text-[12px] text-[#1D2030] m-0 leading-relaxed">{issue.motion}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-[#70758B]">{issue.sources.length} sumber dalam Source Pack</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#0F766E]">Evidence-first</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-7">
            <div className="font-mono text-[11px] text-[#0F766E] uppercase tracking-wider mb-2">Posisi debat (sesuai hasil undian)</div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setDebatePosition('PRO')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'PRO' ? 'bg-[#0F766E] border-[#0F766E] text-ink' : 'bg-transparent border-[#E6E7EF] text-[#1D2030] hover:border-[#B8BAC8]'}`}>PRO</button>
              <button type="button" onClick={() => setDebatePosition('KONTRA')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'KONTRA' ? 'bg-[#FFF8EC] border-[#F2A93B]/60 text-ink' : 'bg-transparent border-[#E6E7EF] text-[#1D2030] hover:border-[#B8BAC8]'}`}>KONTRA</button>
            </div>
            <p className="text-xs text-[#70758B] mt-2">Gunakan posisi yang benar-benar diberikan kepada siswa; platform tidak menentukan pemenang.</p>
          </div>
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn onClick={() => goTo(2)} disabled={!selectedIssue || !debatePosition}>Lanjut ke AI Exploration →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'ai-exploration') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">02 — AI Exploration</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Eksplorasi isu</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[68ch] mb-6">
            Isu: <strong>{selectedIssue?.title || '(belum dipilih)'}</strong><br />
            Mosi: <strong>{selectedIssue?.motion || '(belum ditentukan)'}</strong><br />
            Posisi: <strong>{debatePosition || '(belum ditentukan)'}</strong>
          </p>

          {selectedIssue && (
            <section className="bg-white/90 border border-[#E6E7EF] rounded-[22px] p-5 mb-6 shadow-[0_12px_30px_rgba(30,32,48,0.05)]">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <div className="font-mono text-[10px] text-[#0F766E] uppercase tracking-[0.16em] mb-1.5">Source Pack · Bukti Terkurasi</div>
                  <h2 className="font-display text-lg font-semibold text-[#1D2030]">Mulai dari sumber, bukan dari kesimpulan.</h2>
                  <p className="text-sm text-[#70758B] leading-relaxed mt-1.5 max-w-[70ch]">
                    Gunakan sumber berikut untuk memahami konteks, mencari bukti yang relevan, dan membangun klaim. Pada V1, Source Pack adalah basis evidence sebelum fact check.
                  </p>
                </div>
                <span className="rounded-full bg-[#EFF9F7] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#0F766E]">
                  {selectedIssue.sources.length} sumber
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {selectedIssue.sources.map((source, index) => (
                  <a
                    key={`${selectedIssue.id}-source-${index}-${source.url}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-[18px] border border-[#E6E7EF] bg-[#F9FAFC] p-4 transition-all hover:-translate-y-0.5 hover:border-[#0F766E]/50 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#0F766E]">
                        {qualityLabel[source.quality]}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.10em] text-[#8A8EA2]">
                        {source.year || '—'}
                      </span>
                    </div>

                    <div className="mt-2 font-display text-sm font-semibold leading-5 text-[#1D2030] group-hover:text-[#0F766E]">
                      {source.title}
                    </div>

                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.10em] text-[#8A8EA2]">
                      {source.domain}{source.scope ? ` · ${source.scope}` : ''}
                    </div>

                    {source.summary && (
                      <p className="mt-2 text-xs leading-5 text-[#70758B]">
                        {source.summary}
                      </p>
                    )}

                    <div className="mt-3 text-[11px] font-semibold text-[#0F766E]">
                      Buka sumber ↗
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-4 rounded-[16px] border border-[#E6E7EF] bg-[#FAFAFC] px-4 py-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A8EA2]">Cara menggunakan Source Pack</div>
                <p className="mt-1.5 text-xs leading-5 text-[#70758B]">
                  Baca ringkasan → buka sumber yang paling relevan → catat temuan yang mendukung atau menantang posisi → gunakan temuan tersebut saat menulis eksplorasi.
                </p>
              </div>
            </section>
          )}

          <div className="bg-white/90 border border-[#E6E7EF] border-l-[3px] border-l-[#0F766E] rounded-r-[16px] p-4 mb-6">
            <div className="font-mono text-[11px] text-[#0F766E] uppercase mb-1.5">AI · Explorer</div>
            <p className="m-0 text-sm leading-relaxed text-[#1D2030] whitespace-pre-line">
              {explorerLoading ? 'AI sedang menyiapkan eksplorasi...' : explorerReply}
            </p>
          </div>

          <InputField
            label="Catatan eksplorasimu"
            isTextarea
            value={exploration}
            onChange={(event) => setExploration(event.target.value)}
            placeholder="Tuliskan pemahamanmu berdasarkan Source Pack. Catat bukti yang paling relevan dan apa yang masih ingin kamu buktikan."
          />
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(1)}>← Kembali</Btn>
            <Btn onClick={() => goTo(3)} disabled={!exploration.trim()}>Lanjut ke Fact Check →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'fact-check') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">03 — Fact Check</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Periksa klaim dengan bukti</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[70ch] mb-4">Pada tahap ini siswa menguji klaim sebelum menggunakannya dalam argumen.</p>

          {FACT_CHECK_MODE === 'dummy' && (
            <div className="bg-[#FFF8EC]/10 border border-[#F2A93B]/60/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-[#1D2030]">
              <strong>MODE SIMULASI:</strong> hasil belum merupakan verifikasi web nyata. Gunakan tahap ini untuk menguji alur klaim → verdict → sumber → Argument Builder.
            </div>
          )}
          {FACT_CHECK_MODE === 'source-pack' && (
            <div className="bg-[#0F766E]/10 border border-[#0F766E]/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-[#1D2030]">
              <strong>MODE SOURCE PACK:</strong> AI menilai klaim terhadap sumber yang disiapkan untuk mosi, bukan melakukan web search otomatis.
            </div>
          )}

          <div className="flex gap-3 flex-wrap mb-5">
            <Btn onClick={runFactCheck} disabled={factCheckLoading || !exploration.trim()}>{factCheckLoading ? 'Memeriksa...' : 'Jalankan Fact Check'}</Btn>
            <Btn secondary onClick={() => setClaims([])} disabled={factCheckLoading || claims.length === 0}>Bersihkan hasil</Btn>
          </div>

          <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4 mb-6">
            <div className="font-mono text-[11px] text-[#0F766E] uppercase mb-2">Tambah klaim spesifik</div>
            <div className="flex gap-3 items-start flex-wrap">
              <textarea value={draftClaim} onChange={(event) => setDraftClaim(event.target.value)} placeholder="Tulis satu klaim yang bisa diperiksa." className="flex-1 min-w-[260px] bg-[#F6F7FB] border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm p-3.5 resize-y min-h-[90px] focus:outline focus:outline-2 focus:outline-[#0F766E] focus:outline-offset-2" />
              <Btn secondary onClick={addAndCheckClaim} disabled={!draftClaim.trim() || recheckingId !== null}>Periksa klaim</Btn>
            </div>
          </div>

          {factCheckError && (
            <div className="bg-coral/10 border border-coral/30 text-[#1D2030] rounded-[12px] p-4 mb-5 text-sm leading-relaxed">
              <strong>Fact check belum dapat dilakukan:</strong> {factCheckError}
            </div>
          )}

          {factCheckLoading && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4 mb-4"><p className="text-[#70758B] font-mono text-xs m-0">Memeriksa klaim...</p></div>
          )}

          {!factCheckLoading && claims.length === 0 && !factCheckError && (
            <div className="bg-white/90 border border-dashed border-[#E6E7EF] rounded-[20px] p-5 text-[#70758B] text-sm">Belum ada hasil. Jalankan Fact Check untuk memulai.</div>
          )}

          <div className="space-y-3">
            {claims.map((claim) => {
              const meta = verdictMeta[claim.verdict];
              const isRechecking = recheckingId === claim.id;
              return (
                <article key={claim.id} className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4">
                  <div className="flex gap-3 items-start justify-between flex-wrap">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap uppercase ${meta.color}`}>{meta.label}</span>
                      <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-slate/10 text-[#70758B] uppercase">{claim.type}</span>
                      <span className="font-mono text-[10px] text-[#70758B]">Confidence {claim.confidence}%</span>
                    </div>
                    <Btn secondary onClick={() => recheckClaim(claim)} disabled={isRechecking}>{isRechecking ? 'Memeriksa...' : 'Periksa ulang'}</Btn>
                  </div>
                  <h3 className="font-display text-base mt-3 mb-2">{claim.claim}</h3>
                  <p className="text-sm leading-relaxed text-[#1D2030] m-0">{claim.explanation}</p>
                  {claim.caveat && <div className="bg-[#FFF8EC]/10 border border-[#F2A93B]/60/20 rounded-[16px] p-3 mt-3 text-sm leading-relaxed"><strong>Catatan konteks:</strong> {claim.caveat}</div>}
                  {claim.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="font-mono text-[10px] text-[#0F766E] uppercase mb-2">{FACT_CHECK_MODE === 'dummy' ? 'Referensi simulasi' : 'Referensi source pack'}</div>
                      <div className="space-y-2">
                        {claim.sources.map((source) => (
                          <a key={`${claim.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="block bg-[#F6F7FB] border border-[#E6E7EF] rounded-[16px] p-3 hover:border-[#0F766E] transition-colors">
                            <div className="font-mono text-[10px] text-[#70758B] uppercase">{qualityLabel[source.quality]} · {source.domain}{source.year ? ` · ${source.year}` : ''}{source.scope ? ` · ${source.scope}` : ''}</div>
                            <div className="text-sm text-[#1D2030] mt-1">{source.title}</div>
                            {source.summary && <div className="text-xs text-[#70758B] mt-1 leading-relaxed">{source.summary}</div>}
                            <div className="text-[11px] text-[#0F766E] mt-2 font-semibold">Buka sumber ↗</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {claim.searchQueries.length > 0 && <div className="mt-3 font-mono text-[10px] text-[#70758B]">Query simulasi: {claim.searchQueries.join(' · ')}</div>}
                </article>
              );
            })}
          </div>

          {claims.length > 0 && (
            <div className="mt-5 bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4">
              <div className="flex gap-4 flex-wrap text-sm">
                <span><strong>{claims.length}</strong> klaim diperiksa</span>
                <span><strong>{verifiedClaims.length}</strong> bisa dipakai</span>
                <span><strong>{blockingClaims.length}</strong> perlu diperbaiki</span>
              </div>
              {FACT_CHECK_MODE === 'dummy' && <p className="text-xs text-[#70758B] mt-3 mb-0">Mode simulasi hanya untuk pengujian alur. Jangan gunakan verdict dummy sebagai bukti debat.</p>}
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(2)}>← Kembali</Btn>
            <Btn onClick={() => goTo(4)} disabled={!canProceedFactCheck}>Lanjut ke Argument Builder →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'argument-builder') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">04 — Argument Builder</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Susun argumenmu</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[60ch] mb-6">Gunakan struktur klaim → alasan → bukti.</p>

          {verifiedClaims.length > 0 && (
            <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4 mb-5">
              <div className="font-mono text-[10px] text-[#0F766E] uppercase mb-2">Klaim yang lolos fact check</div>
              <div className="space-y-2">
                {verifiedClaims.map((claim) => (
                  <button key={claim.id} type="button" onClick={() => selectClaimForArgument(claim)} className="block text-left w-full bg-[#F6F7FB] border border-[#E6E7EF] rounded-[16px] p-3 text-sm hover:border-[#0F766E]">
                    <span className="text-[#1D2030]">{claim.claim}</span>
                    <span className="block text-[11px] text-[#70758B] mt-1">{claim.sources.length} sumber referensi</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <InputField label="Klaim" value={argument.claim} onChange={(event) => setArgument({ ...argument, claim: event.target.value })} placeholder="Apa yang kamu nyatakan?" />
          <InputField label="Alasan" value={argument.reason} onChange={(event) => setArgument({ ...argument, reason: event.target.value })} placeholder="Mengapa klaim itu penting/masuk akal?" />
          <InputField label="Bukti" isTextarea value={argument.evidence} onChange={(event) => setArgument({ ...argument, evidence: event.target.value })} placeholder="Masukkan temuan spesifik dari Source Pack yang mendukung klaimmu. Pilih bukti yang paling relevan, bukan sekadar menyalin ringkasan sumber." />

          <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getReview} disabled={!canReviewArgument || reviewLoading}>{reviewLoading ? 'Mereview...' : 'Minta review AI'}</Btn></div>

          {!canReviewArgument && <p className="text-xs text-[#70758B] mt-2">Lengkapi klaim, alasan, dan bukti sebelum meminta review.</p>}
          {review && !reviewLoading && (
            <div className="bg-white/90 border border-[#E6E7EF] border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4">
              <div className="font-mono text-[11px] text-[#0F766E] uppercase mb-1.5">AI · Reviewer {ARGUMENT_REVIEW_MODE === 'api' ? '· API' : '· Simulasi'}</div>
              <p className="m-0 text-sm leading-relaxed text-[#1D2030] whitespace-pre-wrap">{review}</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(3)}>← Kembali</Btn>
            <Btn onClick={() => goTo(5)} disabled={!canProceedToDebate}>Lanjut ke Uji Argumen →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'debate') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">05 — Debate Preparation</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Uji argumenmu</h1>
          <p className="text-[#70758B] text-base leading-relaxed max-w-[65ch] mb-6">AI di sini hanya sebagai sparring partner sebelum debat. Debat resmi tetap dilakukan siswa PRO dan KONTRA.</p>

          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] text-[#0F766E] uppercase">Sparring {sparringRound}/3</span>
            {sparringRound >= 3 && <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-[#0F766E]/20 text-[#0F766E] uppercase">Selesai</span>}
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            {debateLog.map((message, index) => (
              <div key={index} className={`max-w-[85%] p-3 rounded-[20px] text-sm leading-relaxed break-words ${message.who === 'ai' ? 'bg-white/90 border border-[#E6E7EF] self-start rounded-bl-sm' : 'bg-[#0F766E] text-ink self-end rounded-br-sm'}`}>
                {message.text === 'mengetik...' ? <span className="text-[#70758B] font-mono text-xs">mengetik...</span> : message.text}
              </div>
            ))}
          </div>

          {sparringRound < 3 && (
            <div className="flex gap-3 items-center mt-7 flex-wrap">
              <input type="text" value={debateInput} onChange={(event) => setDebateInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendDebateMessage()} placeholder="Tulis responsmu..." className="flex-1 min-w-[200px] bg-white/90 border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm p-3.5 focus:outline-[#0F766E]" />
              <Btn onClick={sendDebateMessage} disabled={!debateInput.trim() || debateLoading}>{debateLoading ? 'Menilai...' : 'Kirim'}</Btn>
            </div>
          )}

          <div className="bg-white/90 border border-[#E6E7EF] rounded-[12px] p-3 mt-6 text-xs text-[#70758B] leading-relaxed">Batas sparring adalah 3 ronde agar AI tidak terus-menerus menantang tanpa akhir.</div>

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(4)}>← Kembali</Btn>
            <Btn onClick={() => goTo(6)} disabled={!canProceedToSolution}>Lanjut ke Solution Lab →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'solution-lab') {
      return (
        <div className="animate-[rise_0.25s_ease]">
          <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">06 — Solution Lab</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Rancang solusimu</h1>
          <InputField label="Rancangan solusi" isTextarea value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Jelaskan solusi konkretmu, siapa yang terlibat, dan bagaimana mengukur keberhasilannya." />
          <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getSolutionEvaluation} disabled={!solution.trim() || evalLoading}>{evalLoading ? 'Mengevaluasi...' : 'Evaluasi kelayakan'}</Btn></div>
          {evalReply && !evalLoading && (
            <div className="bg-white/90 border border-[#E6E7EF] border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4">
              <div className="font-mono text-[11px] text-[#0F766E] uppercase mb-1.5">AI · Evaluator {SOLUTION_EVALUATOR_MODE === 'api' ? '· API' : '· Simulasi'}</div>
              <p className="m-0 text-sm leading-relaxed text-[#1D2030] whitespace-pre-wrap">{evalReply}</p>
            </div>
          )}
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(5)}>← Kembali</Btn>
            <Btn onClick={() => goTo(7)} disabled={!canProceedToImpact}>Lihat Impact →</Btn>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-[rise_0.25s_ease]">
        <p className="font-mono text-xs tracking-wider text-[#0F766E] uppercase mb-2.5">07 — Impact</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,42px)] leading-[1.1] mb-4">Perjalananmu</h1>
        <p className="text-[#70758B] text-base leading-relaxed max-w-[65ch] mb-7">Ringkasan akhir perjalananmu dari isu, klaim, argumen, uji argumen, sampai solusi.</p>

        <div className="space-y-4">
          <div role="status">
            {debateRun.status}

            {debateRun.status.startsWith('Gagal') && (
              <button
                type="button"
                onClick={debateRun.retry}
              >
                {' '}· Coba simpan lagi
              </button>
            )}
          </div>
          <SummaryCard label="Isu" value={`${selectedIssue?.title || '-'}${debatePosition ? ` — Posisi ${debatePosition}` : ''}`} />
          <SummaryCard label="Klaim" value={argument.claim || '-'} />
          <SummaryCard label="Alasan" value={argument.reason || '-'} />
          <SummaryCard label="Bukti" value={argument.evidence || '-'} />
          <SummaryCard label="Solusi" value={solution || '-'} />
          <SummaryCard label="Evaluasi Solusi" value={evalReply || '-'} />
        </div>

        <div className="bg-white/90 border border-[#E6E7EF] rounded-[20px] p-4 mt-5 text-sm text-[#1D2030]">
          <strong>Catatan:</strong> debat resmi tetap dilakukan antara siswa PRO dan KONTRA. Sparring AI pada tahap 05 hanya membantu menguji argumen sebelum debat.
        </div>

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(6)}>← Kembali</Btn>
          <Btn secondary onClick={exportDebatePdf}>Export bahan debat PDF</Btn>
          <Btn
            secondary
            onClick={() => {
              const confirmed = window.confirm(
                'Mulai sesi baru? Pastikan Impact sudah tersimpan.',
              );

              if (confirmed) {
                window.location.reload();
              }
            }}
          >
            Mulai sesi baru
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-[#1D2030]">
      <style>{DEBATE_PRINT_CSS}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#0F766E]/8 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-[#F2A93B]/8 blur-3xl" />
      </div>

      <aside className="fixed left-0 bottom-0 top-[var(--team-topbar-height,74px)] z-50 w-[232px] border-r border-[#E6E7EF] bg-white/92 backdrop-blur-xl px-5 py-6 shadow-[8px_0_30px_rgba(30,32,48,0.04)] max-lg:w-[205px] max-md:left-3 max-md:right-3 max-md:bottom-3 max-md:top-auto max-md:w-auto max-md:h-[74px] max-md:px-3 max-md:py-0 max-md:border max-md:rounded-[20px] max-md:shadow-[0_16px_36px_rgba(30,32,48,0.12)]">
        <div className="flex h-full flex-col max-md:flex-row max-md:items-center max-md:gap-2">
          <div className="mb-7 flex items-center gap-3 max-md:mb-0 max-md:mr-2 max-md:shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#0F766E] text-white shadow-[0_10px_24px_rgba(15,118,110,0.20)]">
              <span className="font-display text-base font-bold">AI</span>
            </div>
            <div className="min-w-0 max-md:hidden">
              <div className="font-display text-sm font-semibold tracking-[-0.01em]">AI × SDGs</div>
              <div className="mt-0.5 text-[11px] text-[#8A8EA2]">Source Pack Mode</div>
            </div>
          </div>

          <div className="mb-6 rounded-[18px] bg-[#EFF9F7] px-4 py-3.5 max-md:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0F766E]">Source Pack</span>
              <span className="h-2 w-2 rounded-full bg-[#0F766E] shadow-[0_0_0_4px_rgba(15,118,110,0.10)]" />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#73778D]">Gunakan paket sumber terkurasi sebagai basis evidence untuk eksplorasi, fact-check, dan penyusunan argumen.</p>
          </div>

          <div className="hidden border-t border-[#E6E7EF] pt-4 max-md:flex max-md:flex-1 max-md:gap-1 max-md:overflow-x-auto max-md:border-t-0 max-md:pt-0">
            {STAGES.map((stage, index) => {
              const isActive = index === currentStage;
              const isDone = index < furthestStage;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-[14px] border px-3 font-mono text-[10px] font-semibold transition-all ${isActive ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-[0_8px_18px_rgba(15,118,110,0.20)]' : isDone ? 'border-[#F2A93B]/60 bg-[#FFF8EC] text-[#B97819]' : 'border-[#E6E7EF] bg-white text-[#7B7F93]'}`}
                  aria-label={stage.label}
                >
                  {stage.short}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 max-md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A8EA2]">Perjalanan</span>
              <span className="text-[10px] font-semibold text-[#0F766E]">{Math.round((furthestStage / (STAGES.length - 1 || 1)) * 100)}%</span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#EEF0F5]">
              <div className="h-full rounded-full bg-[#0F766E] transition-all duration-300" style={{ width: `${(furthestStage / (STAGES.length - 1 || 1)) * 100}%` }} />
            </div>
            <div className="space-y-1.5">
              {STAGES.map((stage, index) => {
                const isActive = index === currentStage;
                const isDone = index < furthestStage;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-all ${isActive ? 'bg-[#E8F6F4] text-[#0B665F]' : 'text-[#70758B] hover:bg-[#F8F8FC] hover:text-[#303246]'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border font-mono text-[9px] font-semibold ${isActive ? 'border-[#0F766E] bg-[#0F766E] text-white' : isDone ? 'border-[#F2A93B]/50 bg-[#FFF8EC] text-[#B97819]' : 'border-[#E6E7EF] bg-white text-[#8A8EA2]'}`}>
                      {stage.short}
                    </span>
                    <span className="truncate text-xs font-medium">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto max-md:hidden">
            <div className="border-t border-[#E6E7EF] pt-4 text-[10px] leading-5 text-[#9A9DAF]">
              Tetap pada mosi yang dipilih. Source Pack menjadi dasar bukti sebelum debat.
            </div>
          </div>
        </div>
      </aside>

      <main className="relative min-h-screen pl-[232px] max-lg:pl-[205px] max-md:pl-0 max-md:pb-[104px]">
        <div className="mx-auto w-full max-w-[1120px] px-9 py-8 max-lg:px-7 max-md:px-4 max-md:pt-5">
          <header className="mb-8 flex items-center justify-between gap-4 rounded-[22px] border border-[#E6E7EF] bg-white/85 px-5 py-4 shadow-[0_10px_28px_rgba(30,32,48,0.04)] backdrop-blur max-md:mb-5 max-md:px-4 max-md:py-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold tracking-[-0.01em]">AI × SDGs Platform</span>
                <span className="hidden h-1 w-1 rounded-full bg-[#C7C9D4] sm:block" />
                <span className="hidden text-[11px] font-medium text-[#8A8EA2] sm:block">Source Pack</span>
              </div>
              <div className="mt-1 truncate text-[11px] text-[#8A8EA2]">
                {selectedIssue ? selectedIssue.title : 'Eksplorasi isu berbasis Source Pack'}
                {debatePosition ? ` · ${debatePosition}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden rounded-full border border-[#E6E7EF] bg-[#FAFAFC] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#777B90] sm:block">Curated Evidence</div>
              <div className="rounded-full bg-[#0F766E] px-3.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_6px_14px_rgba(15,118,110,0.18)]">Tahap {String(currentStage).padStart(2,'0')}</div>
            </div>
          </header>

          {renderPanel()}

          <section className="debate-export-sheet" aria-hidden="true">
            <h1>Bahan Debat Siswa</h1>
            <p className="print-meta">
              AI × SDGs · {selectedIssue?.sdg || '-'} · {selectedIssue?.title || '-'} ·
              Posisi {debatePosition || '-'} · {new Date().toLocaleDateString('id-ID')}
            </p>

            <h2>1. Mosi</h2>
            <div className="print-card">
              <p><strong>{selectedIssue?.motion || '-'}</strong></p>
              <p className="print-muted">{selectedIssue?.context || ''}</p>
            </div>

            <h2>2. Source Pack & Eksplorasi</h2>
            <div className="print-card">
              <h3>Sumber terkurasi</h3>
              <ul>
                {uniqueSources(selectedIssue?.sources || []).map((source, index) => (
                  <li key={`print-source-${index}`} className="print-source">
                    <strong>{source.title || source.domain || 'Sumber'}</strong>
                    {source.domain ? ` · ${source.domain}` : ''}
                    {source.year ? ` · ${source.year}` : ''}
                    {source.scope ? ` · ${source.scope}` : ''}
                    {source.summary ? ` — ${source.summary}` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div className="print-card">
              <h3>AI Explorer</h3>
              <p>{explorerReply || '-'}</p>
            </div>
            {exploration && (
              <div className="print-card">
                <h3>Catatan eksplorasi siswa</h3>
                <p>{exploration}</p>
              </div>
            )}

            <h2>3. Fact Check</h2>
            {claims.length ? claims.map((claim) => (
              <div className="print-card" key={`print-claim-${claim.id}`}>
                <h3>{claim.claim}</h3>
                <p>
                  <strong>Verdict:</strong> {verdictMeta[claim.verdict].label}
                  {' · '}
                  <strong>Keyakinan AI:</strong> {claim.confidence}%
                </p>
                <p className="print-muted">
                  Keyakinan AI adalah estimasi model terhadap verdict, bukan probabilitas matematis bahwa klaim pasti benar.
                </p>
                <p>{claim.explanation}</p>
                {claim.caveat && <p className="print-muted"><strong>Catatan:</strong> {claim.caveat}</p>}
                {claim.sources?.length > 0 && (
                  <ul>
                    {uniqueSources(claim.sources).map((source, index) => (
                      <li key={`print-claim-source-${claim.id}-${index}`} className="print-source">
                        <strong>{source.title || source.domain || 'Sumber'}</strong>
                        {source.domain ? ` · ${source.domain}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )) : (
              <div className="print-card"><p>Belum ada klaim yang tersimpan.</p></div>
            )}

            <h2>4. Argumen</h2>
            <div className="print-card">
              <p><strong>Klaim:</strong> {argument.claim || '-'}</p>
              <p><strong>Alasan:</strong> {argument.reason || '-'}</p>
              <p><strong>Bukti:</strong> {argument.evidence || '-'}</p>
            </div>
            <div className="print-card">
              <h3>Review AI</h3>
              <p>{review || '-'}</p>
            </div>

            <h2>5. Uji Argumen / Sparring</h2>
            <div className="print-card">
              <p><strong>Jumlah ronde:</strong> {sparringRound}</p>
              {debateLog.length > 0 ? debateLog.map((item, index) => (
                <p key={`print-debate-${index}`}>
                  <strong>{item.who === 'ai' ? 'AI' : 'Siswa'}:</strong> {item.text}
                </p>
              )) : <p>Belum ada log sparring.</p>}
            </div>

            <h2>6. Solusi</h2>
            <div className="print-card"><p>{solution || '-'}</p></div>
            <div className="print-card">
              <h3>Evaluasi AI</h3>
              <p>{evalReply || '-'}</p>
            </div>

            <p className="print-muted">
              Catatan: AI digunakan sebagai alat bantu riset dan persiapan. Debat resmi tetap dilakukan oleh siswa PRO dan KONTRA.
              Sumber asli perlu dibuka dan diverifikasi sebelum digunakan sebagai bukti debat.
            </p>
          </section>
        </div>
      </main>
    </div>
  );

}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#E6E7EF] rounded-[20px] p-4 bg-gradient-to-br from-[#0F766E]/10 to-[#F2A93B]/5">
      <div className="font-mono text-[10px] text-[#0F766E] uppercase mb-2">{label}</div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-[#1D2030]">{value}</div>
    </div>
  );
}

function Btn({ children, onClick, secondary, disabled }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`font-body font-semibold text-sm px-5 py-2.5 rounded-[16px] transition-all whitespace-nowrap ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-px'} ${secondary ? 'bg-white text-[#3A3D4E] border border-[#E6E7EF] hover:border-[#B8BAC8] hover:bg-[#FAFAFC]' : 'bg-[#0F766E] text-white hover:bg-[#0C655F] shadow-[0_8px_22px_rgba(15,118,110,0.16)]'}`}>
      {children}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  isTextarea,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  isTextarea?: boolean;
}) {
  return (
    <div className="mb-4 w-full">
      <label className="font-mono text-[10px] text-[#70758B] uppercase tracking-[0.16em] block mb-2 mt-6">{label}</label>
      {isTextarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/90 border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm px-4 py-3.5 resize-y min-h-[104px] transition-colors focus:outline focus:outline-2 focus:outline-[#0F766E] focus:outline-offset-2 focus:border-[#0F766E]/50 placeholder:text-[#9A9DAF]" />
      ) : (
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-white/90 border border-[#E6E7EF] rounded-[16px] text-[#1D2030] font-body text-sm px-4 py-3 min-h-[50px] transition-colors focus:outline focus:outline-2 focus:outline-[#0F766E] focus:outline-offset-2 focus:border-[#0F766E]/50 placeholder:text-[#9A9DAF]" />
      )}
    </div>
  );
}
