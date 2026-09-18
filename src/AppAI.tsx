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

const FACT_CHECK_MODE: 'web-search' | 'dummy' = 'web-search';

const AI_STAGE_MODE: 'api' | 'dummy' = 'api';

const ARGUMENT_REVIEW_MODE: 'api' | 'dummy' = 'api';

const SOLUTION_EVALUATOR_MODE: 'api' | 'dummy' = 'api';

const SAMPLE_ISSUES: Issue[] = [
  {
    id: 1,
    sdg: 'SDG 8',
    title: 'Dampak Perkembangan AI terhadap Lapangan Kerja',
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
    title: 'Manfaat Pengembangan AI dan Dampak Lingkungannya',
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
    title: 'Penggunaan AI dalam Pembelajaran',
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
    title: 'Penyebaran Informasi Palsu: AI-generated vs Human-generated',
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

const verdictMeta: Record<ClaimResult['verdict'], { label: string; color: string }> = {
  verified: { label: 'Terverifikasi', color: 'bg-teal/20 text-teal' },
  mostly_true: { label: 'Sebagian besar benar', color: 'bg-teal/20 text-teal' },
  misleading: { label: 'Menyesatkan', color: 'bg-amber/20 text-amber' },
  false: { label: 'Bertentangan', color: 'bg-coral/20 text-coral' },
  unverifiable: { label: 'Belum terverifikasi', color: 'bg-amber/20 text-amber' },
  not_fact: { label: 'Bukan klaim fakta', color: 'bg-slate/20 text-slate' },
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
      try {
        const result = await callAPI('explore', { issue: selectedIssue, position: debatePosition, focus: debatePosition === 'PRO' ? selectedIssue.proFocus : selectedIssue.contraFocus, starterQuestions: selectedIssue.starterQuestions });
        if (!cancelled) {
          setExplorerReply(cleanAiText(String(result || 'AI Explorer tidak memberikan hasil.')));
          setExplorerIssueId(selectedIssue.id);
        }
      } catch (error) {
        if (!cancelled) setExplorerReply(error instanceof Error ? `AI Explorer gagal: ${error.message}` : 'AI Explorer gagal dijalankan.');
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
        text: `Argumenmu: "${argument.claim || '(belum diisi)'}". Jelaskan mengapa bukti yang kamu punya cukup kuat. Ingat, saya hanya sparring partner sebelum debat dengan siswa lain.`,
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

  async function callAPI(action: string, payload: unknown) {
    const response = await fetch('/api/ai/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
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
      `Ringkasan sumber web: ${source.summary || 'Ringkasan sumber belum tersedia.'}`,
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
      setReview(error instanceof Error ? `AI Reviewer gagal: ${error.message}` : 'AI Reviewer gagal dijalankan.');
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
      setDebateLog([...history, { who: 'ai', text: error instanceof Error ? `Sparring gagal: ${error.message}` : 'Sparring gagal dijalankan.' }]);
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
      setEvalReply(error instanceof Error ? `AI Evaluator gagal: ${error.message}` : 'AI Evaluator gagal dijalankan.');
    } finally {
      setEvalLoading(false);
    }
  }

  function renderPanel() {
    const stage = STAGES[currentStage].id;

    if (stage === 'home') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">AI × SDGs Platform · AI RESEARCH MODE</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Dari isu global<br />ke solusi nyata.</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Eksplorasi isu SDGs, periksa klaim dengan bukti, bangun argumen, uji argumenmu sebelum debat siswa, lalu kembangkan solusi.</p>
          <Btn onClick={() => goTo(1)}>Mulai Eksplorasi</Btn>
        </div>
      );
    }

    if (stage === 'issue-bank') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">01 — Issue Bank</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Pilih satu isu SDGs</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-8">Pilih satu dari 8 mosi pada Bank Mosi. Mosi yang dipilih menjadi konteks seluruh perjalanan.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {SAMPLE_ISSUES.map((issue) => (
              <button key={issue.id} type="button" onClick={() => setSelectedIssue(issue)} className={`text-left h-full flex flex-col bg-ink-2 border rounded-[14px] p-[18px] cursor-pointer transition-all hover:-translate-y-0.5 hover:border-teal ${selectedIssue?.id === issue.id ? 'border-amber bg-amber/10' : 'border-line'}`}>
                <div className="font-mono text-[11px] text-teal">{issue.sdg}</div>
                <h3 className="font-display text-base my-1.5">{issue.title}</h3>
                <p className="text-[13px] text-slate m-0 leading-relaxed flex-grow">{issue.blurb}</p>
                <div className="mt-3 pt-3 border-t border-line/70">
                  <div className="font-mono text-[10px] text-amber uppercase tracking-wider mb-1">Mosi</div>
                  <p className="text-[12px] text-paper m-0 leading-relaxed">{issue.motion}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-7">
            <div className="font-mono text-[11px] text-teal uppercase tracking-wider mb-2">Posisi debat (sesuai hasil undian)</div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={() => setDebatePosition('PRO')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'PRO' ? 'bg-teal border-teal text-ink' : 'bg-transparent border-line text-paper hover:border-paper'}`}>PRO</button>
              <button type="button" onClick={() => setDebatePosition('KONTRA')} className={`px-5 py-3 rounded-full border font-semibold text-sm transition-all ${debatePosition === 'KONTRA' ? 'bg-amber border-amber text-ink' : 'bg-transparent border-line text-paper hover:border-paper'}`}>KONTRA</button>
            </div>
            <p className="text-xs text-slate mt-2">Gunakan posisi yang benar-benar diberikan kepada siswa; platform tidak menentukan pemenang.</p>
          </div>
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn onClick={() => goTo(2)} disabled={!selectedIssue || !debatePosition}>Lanjut ke AI Exploration →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'ai-exploration') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">02 — AI Exploration</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Eksplorasi isu</h1>
          <p className="text-slate text-base leading-relaxed max-w-[68ch] mb-8">Isu: <strong>{selectedIssue?.title || '(belum dipilih)'}</strong><br />Mosi: <strong>{selectedIssue?.motion || '(belum ditentukan)'}</strong><br />Posisi: <strong>{debatePosition || '(belum ditentukan)'}</strong></p>
          <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mb-6">
            <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Explorer</div>
            <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-line">{explorerLoading ? 'AI sedang menyiapkan eksplorasi...' : explorerReply}</p>
          </div>
          <InputField label="Catatan eksplorasimu" isTextarea value={exploration} onChange={(event) => setExploration(event.target.value)} placeholder="Tuliskan apa yang kamu pahami dan apa yang ingin kamu buktikan. Jangan sekadar menyalin jawaban AI." />
          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(1)}>← Kembali</Btn>
            <Btn onClick={() => goTo(3)} disabled={!exploration.trim()}>Lanjut ke Fact Check →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'fact-check') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">03 — Fact Check</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Periksa klaim dengan bukti</h1>
          <p className="text-slate text-base leading-relaxed max-w-[70ch] mb-4">Pada tahap ini siswa menguji klaim sebelum menggunakannya dalam argumen.</p>

          {FACT_CHECK_MODE === 'dummy' && (
            <div className="bg-amber/10 border border-amber/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-paper">
              <strong>MODE SIMULASI:</strong> hasil belum merupakan verifikasi web nyata. Gunakan tahap ini untuk menguji alur klaim → verdict → sumber → Argument Builder.
            </div>
          )}
          {FACT_CHECK_MODE === 'web-search' && (
            <div className="bg-teal/10 border border-teal/20 rounded-[12px] p-3 mb-6 text-sm leading-relaxed text-paper">
              <strong>MODE WEB SEARCH:</strong> AI mencari sumber dari internet secara langsung menggunakan Google Search grounding.
            </div>
          )}

          <div className="flex gap-3 flex-wrap mb-5">
            <Btn onClick={runFactCheck} disabled={factCheckLoading || !exploration.trim()}>{factCheckLoading ? 'Memeriksa...' : 'Jalankan Fact Check'}</Btn>
            <Btn secondary onClick={() => setClaims([])} disabled={factCheckLoading || claims.length === 0}>Bersihkan hasil</Btn>
          </div>

          <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-6">
            <div className="font-mono text-[11px] text-teal uppercase mb-2">Tambah klaim spesifik</div>
            <div className="flex gap-3 items-start flex-wrap">
              <textarea value={draftClaim} onChange={(event) => setDraftClaim(event.target.value)} placeholder="Tulis satu klaim yang bisa diperiksa." className="flex-1 min-w-[260px] bg-ink border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[90px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2" />
              <Btn secondary onClick={addAndCheckClaim} disabled={!draftClaim.trim() || recheckingId !== null}>Periksa klaim</Btn>
            </div>
          </div>

          {factCheckError && (
            <div className="bg-coral/10 border border-coral/30 text-paper rounded-[12px] p-4 mb-5 text-sm leading-relaxed">
              <strong>Fact check belum dapat dilakukan:</strong> {factCheckError}
            </div>
          )}

          {factCheckLoading && (
            <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-4"><p className="text-slate font-mono text-xs m-0">Memeriksa klaim...</p></div>
          )}

          {!factCheckLoading && claims.length === 0 && !factCheckError && (
            <div className="bg-ink-2 border border-dashed border-line rounded-[14px] p-5 text-slate text-sm">Belum ada hasil. Jalankan Fact Check untuk memulai.</div>
          )}

          <div className="space-y-3">
            {claims.map((claim) => {
              const meta = verdictMeta[claim.verdict];
              const isRechecking = recheckingId === claim.id;
              return (
                <article key={claim.id} className="bg-ink-2 border border-line rounded-[14px] p-4">
                  <div className="flex gap-3 items-start justify-between flex-wrap">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap uppercase ${meta.color}`}>{meta.label}</span>
                      <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-slate/10 text-slate uppercase">{claim.type}</span>
                      <span className="font-mono text-[10px] text-slate">Confidence {claim.confidence}%</span>
                    </div>
                    <Btn secondary onClick={() => recheckClaim(claim)} disabled={isRechecking}>{isRechecking ? 'Memeriksa...' : 'Periksa ulang'}</Btn>
                  </div>
                  <h3 className="font-display text-base mt-3 mb-2">{claim.claim}</h3>
                  <p className="text-sm leading-relaxed text-paper m-0">{claim.explanation}</p>
                  {claim.caveat && <div className="bg-amber/10 border border-amber/20 rounded-[10px] p-3 mt-3 text-sm leading-relaxed"><strong>Catatan konteks:</strong> {claim.caveat}</div>}
                  {claim.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="font-mono text-[10px] text-teal uppercase mb-2">{FACT_CHECK_MODE === 'dummy' ? 'Referensi simulasi' : 'Referensi hasil web'}</div>
                      <div className="space-y-2">
                        {claim.sources.map((source) => (
                          <a key={`${claim.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="block bg-ink border border-line rounded-[10px] p-3 hover:border-teal transition-colors">
                            <div className="font-mono text-[10px] text-slate uppercase">{qualityLabel[source.quality]} · {source.domain}{source.year ? ` · ${source.year}` : ''}{source.scope ? ` · ${source.scope}` : ''}</div>
                            <div className="text-sm text-paper mt-1">{source.title}</div>
                            {source.summary && <div className="text-xs text-slate mt-1 leading-relaxed">{source.summary}</div>}
                            <div className="text-[11px] text-teal break-all mt-1">{source.url}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {claim.searchQueries.length > 0 && <div className="mt-3 font-mono text-[10px] text-slate">Query simulasi: {claim.searchQueries.join(' · ')}</div>}
                </article>
              );
            })}
          </div>

          {claims.length > 0 && (
            <div className="mt-5 bg-ink-2 border border-line rounded-[14px] p-4">
              <div className="flex gap-4 flex-wrap text-sm">
                <span><strong>{claims.length}</strong> klaim diperiksa</span>
                <span><strong>{verifiedClaims.length}</strong> bisa dipakai</span>
                <span><strong>{blockingClaims.length}</strong> perlu diperbaiki</span>
              </div>
              {FACT_CHECK_MODE === 'dummy' && <p className="text-xs text-slate mt-3 mb-0">Mode simulasi hanya untuk pengujian alur. Jangan gunakan verdict dummy sebagai bukti debat.</p>}
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
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">04 — Argument Builder</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Susun argumenmu</h1>
          <p className="text-slate text-base leading-relaxed max-w-[60ch] mb-6">Gunakan struktur klaim → alasan → bukti.</p>

          {verifiedClaims.length > 0 && (
            <div className="bg-ink-2 border border-line rounded-[14px] p-4 mb-5">
              <div className="font-mono text-[10px] text-teal uppercase mb-2">Klaim yang lolos fact check</div>
              <div className="space-y-2">
                {verifiedClaims.map((claim) => (
                  <button key={claim.id} type="button" onClick={() => selectClaimForArgument(claim)} className="block text-left w-full bg-ink border border-line rounded-[10px] p-3 text-sm hover:border-teal">
                    <span className="text-paper">{claim.claim}</span>
                    <span className="block text-[11px] text-slate mt-1">{claim.sources.length} sumber referensi</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <InputField label="Klaim" value={argument.claim} onChange={(event) => setArgument({ ...argument, claim: event.target.value })} placeholder="Apa yang kamu nyatakan?" />
          <InputField label="Alasan" value={argument.reason} onChange={(event) => setArgument({ ...argument, reason: event.target.value })} placeholder="Mengapa klaim itu penting/masuk akal?" />
          <InputField label="Bukti" isTextarea value={argument.evidence} onChange={(event) => setArgument({ ...argument, evidence: event.target.value })} placeholder="Masukkan temuan spesifik dari sumber, lalu sertakan URL sumber." />

          <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getReview} disabled={!canReviewArgument || reviewLoading}>{reviewLoading ? 'Mereview...' : 'Minta review AI'}</Btn></div>

          {!canReviewArgument && <p className="text-xs text-slate mt-2">Lengkapi klaim, alasan, dan bukti sebelum meminta review.</p>}
          {review && !reviewLoading && (
            <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4">
              <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Reviewer {ARGUMENT_REVIEW_MODE === 'api' ? '· API' : '· Simulasi'}</div>
              <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-wrap">{review}</p>
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
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">05 — Debate Preparation</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Uji argumenmu</h1>
          <p className="text-slate text-base leading-relaxed max-w-[65ch] mb-6">AI di sini hanya sebagai sparring partner sebelum debat. Debat resmi tetap dilakukan siswa PRO dan KONTRA.</p>

          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[10px] text-teal uppercase">Sparring {sparringRound}/3</span>
            {sparringRound >= 3 && <span className="font-mono text-[10px] px-2 py-1 rounded-full bg-teal/20 text-teal uppercase">Selesai</span>}
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            {debateLog.map((message, index) => (
              <div key={index} className={`max-w-[85%] p-3 rounded-[14px] text-sm leading-relaxed break-words ${message.who === 'ai' ? 'bg-ink-2 border border-line self-start rounded-bl-sm' : 'bg-teal text-ink self-end rounded-br-sm'}`}>
                {message.text === 'mengetik...' ? <span className="text-slate font-mono text-xs">mengetik...</span> : message.text}
              </div>
            ))}
          </div>

          {sparringRound < 3 && (
            <div className="flex gap-3 items-center mt-7 flex-wrap">
              <input type="text" value={debateInput} onChange={(event) => setDebateInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendDebateMessage()} placeholder="Tulis responsmu..." className="flex-1 min-w-[200px] bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 focus:outline-teal" />
              <Btn onClick={sendDebateMessage} disabled={!debateInput.trim() || debateLoading}>{debateLoading ? 'Menilai...' : 'Kirim'}</Btn>
            </div>
          )}

          <div className="bg-ink-2 border border-line rounded-[12px] p-3 mt-6 text-xs text-slate leading-relaxed">Batas sparring adalah 3 ronde agar AI tidak terus-menerus menantang tanpa akhir.</div>

          <div className="flex gap-3 flex-wrap mt-7">
            <Btn secondary onClick={() => goTo(4)}>← Kembali</Btn>
            <Btn onClick={() => goTo(6)} disabled={!canProceedToSolution}>Lanjut ke Solution Lab →</Btn>
          </div>
        </div>
      );
    }

    if (stage === 'solution-lab') {
      return (
        <div className="animate-[rise_0.35s_ease]">
          <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">06 — Solution Lab</p>
          <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Rancang solusimu</h1>
          <InputField label="Rancangan solusi" isTextarea value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Jelaskan solusi konkretmu, siapa yang terlibat, dan bagaimana mengukur keberhasilannya." />
          <div className="flex gap-3 flex-wrap mt-7 mb-4"><Btn secondary onClick={getSolutionEvaluation} disabled={!solution.trim() || evalLoading}>{evalLoading ? 'Mengevaluasi...' : 'Evaluasi kelayakan'}</Btn></div>
          {evalReply && !evalLoading && (
            <div className="bg-ink-2 border border-line border-l-[3px] border-l-teal rounded-r-[14px] p-4 mt-4">
              <div className="font-mono text-[11px] text-teal uppercase mb-1.5">AI · Evaluator {SOLUTION_EVALUATOR_MODE === 'api' ? '· API' : '· Simulasi'}</div>
              <p className="m-0 text-sm leading-relaxed text-paper whitespace-pre-wrap">{evalReply}</p>
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
      <div className="animate-[rise_0.35s_ease]">
        <p className="font-mono text-xs tracking-wider text-teal uppercase mb-2.5">07 — Impact</p>
        <h1 className="font-display font-semibold text-[clamp(28px,4vw,44px)] leading-[1.1] mb-4">Perjalananmu</h1>
        <p className="text-slate text-base leading-relaxed max-w-[65ch] mb-7">Ringkasan akhir perjalananmu dari isu, klaim, argumen, uji argumen, sampai solusi.</p>

        <div className="space-y-4">
          <SummaryCard label="Isu" value={`${selectedIssue?.title || '-'}${debatePosition ? ` — Posisi ${debatePosition}` : ''}`} />
          <SummaryCard label="Klaim" value={argument.claim || '-'} />
          <SummaryCard label="Alasan" value={argument.reason || '-'} />
          <SummaryCard label="Bukti" value={argument.evidence || '-'} />
          <SummaryCard label="Solusi" value={solution || '-'} />
          <SummaryCard label="Evaluasi Solusi" value={evalReply || '-'} />
        </div>

        <div className="bg-ink-2 border border-line rounded-[14px] p-4 mt-5 text-sm text-paper">
          <strong>Catatan:</strong> debat resmi tetap dilakukan antara siswa PRO dan KONTRA. Sparring AI pada tahap 05 hanya membantu menguji argumen sebelum debat.
        </div>

        <div className="flex gap-3 flex-wrap mt-7">
          <Btn secondary onClick={() => goTo(6)}>← Kembali</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[88px_1fr] min-h-screen max-md:grid-cols-1">
      <nav className="relative border-r border-line flex flex-col items-center pt-7 pb-7 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:w-full max-md:h-[76px] max-md:flex-row max-md:px-3 max-md:py-0 max-md:border-t max-md:border-r-0 max-md:overflow-x-auto max-md:bg-ink max-md:z-[100] max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="relative flex flex-col items-center gap-0.5 w-full max-md:w-max max-md:flex-row max-md:h-full max-md:items-center">
          <div className="absolute left-1/2 top-[20px] bottom-[20px] w-[2px] bg-line -translate-x-1/2 z-[0] max-md:hidden" />
          <div className="absolute left-1/2 top-[20px] w-[2px] bg-gradient-to-b from-teal to-amber -translate-x-1/2 z-[1] transition-[height] duration-400 ease-[ease] max-md:hidden" style={{ height: `calc((100% - 40px) * ${furthestStage / (STAGES.length - 1 || 1)})` }} />
          {STAGES.map((stage, index) => {
            const isActive = index === currentStage;
            const isDone = index < furthestStage;
            return (
              <button key={stage.id} type="button" onClick={() => goTo(index)} className={`relative z-[2] w-10 h-10 shrink-0 rounded-full border flex items-center justify-center font-mono text-xs cursor-pointer m-0 transition-all duration-200 group max-md:flex-[0_0_40px] max-md:mx-2 ${isActive ? 'bg-teal border-teal text-ink font-semibold' : isDone ? 'bg-ink-2 border-amber text-amber' : 'bg-ink-2 border-line text-slate'}`}>
                {stage.short}
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-ink-2 border border-line px-2.5 py-1.5 rounded-lg font-body text-xs whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 max-md:hidden text-paper font-normal">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <main className="py-14 px-16 max-w-[1080px] max-md:py-8 max-md:px-5 max-md:pb-[120px]">
        {renderPanel()}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-[14px] p-4 bg-gradient-to-br from-teal/10 to-amber/5">
      <div className="font-mono text-[10px] text-teal uppercase mb-2">{label}</div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-paper">{value}</div>
    </div>
  );
}

function Btn({ children, onClick, secondary, disabled }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`font-body font-semibold text-sm px-6 py-3 rounded-full transition-all whitespace-nowrap ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-px'} ${secondary ? 'bg-transparent text-paper border border-line hover:border-paper' : 'bg-teal text-ink hover:bg-[#1ec4b6]'}`}>
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
      <label className="font-mono text-[11px] text-slate uppercase tracking-wider block mb-2 mt-5">{label}</label>
      {isTextarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 resize-y min-h-[96px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2" />
      ) : (
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-ink-2 border border-line rounded-[10px] text-paper font-body text-sm p-3.5 min-h-[48px] focus:outline focus:outline-2 focus:outline-teal focus:outline-offset-2" />
      )}
    </div>
  );
}
