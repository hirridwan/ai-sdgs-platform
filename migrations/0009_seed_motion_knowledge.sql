-- Migration number: 0009
-- Seed motion knowledge from Buku Panduan SDGs

-- =========================================================
-- SDG MASTER DATA
-- =========================================================

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(4, 'Quality Eduction', 'Pendidikan Berkualitas');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(7, 'Affordable and Clean Energy', 'Energi Bersih dan Terjangkau');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(8, 'Decent Work and Economic Growth', 'Pekerjaan Layak dan Pertumbuhan Ekonomi');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(9, 'Industry, Innovation and Infrastructure', 'Industri, Inovasi dan Infrastruktur');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(10, 'Reduced Inequalities', 'Berkurangnya Kesenjangan');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(12, 'Responsible Consumption and Production', 'Konsumsi dan Produksi yang Bertanggung Jawab');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(13, 'Climate Action', 'Penanganan Perubahan Iklim');

INSERT OR IGNORE INTO sdgs (number, title, description) VALUES
(16, 'Peace, Justice and Strong Intuitions', 'Perdamaian, Keadilan, dan Kelembagaan yang Tangguh');


-- =========================================================
-- KEEP THE LEGACY SDG FIELD IN MOTIONS
-- =========================================================

UPDATE motions SET sdg_number = 8 WHERE id = 1;
UPDATE motions SET sdg_number = 12 WHERE id = 2;
UPDATE motions SET sdg_number = 4 WHERE id = 3;
UPDATE motions SET sdg_number = 16 WHERE id = 4;


-- =========================================================
-- MOTION <-> SDG RELATIONS
-- =========================================================

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 1, id, 1 FROM sdgs WHERE number = 8;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 1, id, 0 FROM sdgs WHERE number = 4;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 1, id, 0 FROM sdgs WHERE number = 9;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 1, id, 0 FROM sdgs WHERE number = 10;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 2, id, 1 FROM sdgs WHERE number = 12;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 2, id, 1 FROM sdgs WHERE number = 13;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 2, id, 0 FROM sdgs WHERE number = 7;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 2, id, 0 FROM sdgs WHERE number = 9;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 3, id, 1 FROM sdgs WHERE number = 4;

INSERT OR IGNORE INTO motion_sdgs (motion_id, sdg_id, is_primary)
SELECT 4, id, 1 FROM sdgs WHERE number = 16;


-- =========================================================
-- MOTION CONTEXT
-- =========================================================

INSERT OR REPLACE INTO motion_context
(motion_id, background, focus_issue, sdg_context, key_considerations, analysis_framework)
VALUES
(
1,
'Perkembangan AI membawa perubahan terhadap cara manusia bekerja. AI dapat melakukan berbagai tugas yang sebelumnya membutuhkan waktu dan tenaga manusia, seperti mengolah data, membuat rangkuman, menghasilkan gambar, membantu pemrograman, menganalisis dokumen, hingga memberikan rekomendasi berdasarkan data. Perubahan tersebut menimbulkan pertanyaan mengenai masa depan pekerjaan. Di satu sisi, AI dapat meningkatkan produktivitas dan menciptakan kebutuhan terhadap pekerjaan atau keterampilan baru. Di sisi lain, otomatisasi dapat mengurangi kebutuhan terhadap manusia pada pekerjaan tertentu, terutama pekerjaan yang memiliki tugas rutin dan dapat dilakukan oleh sistem.',
'Persoalan dalam mosi ini bukan hanya tentang apakah AI mengambil pekerjaan manusia, tetapi juga tentang bagaimana AI mengubah jenis pekerjaan, keterampilan yang dibutuhkan, serta kesempatan kerja bagi kelompok masyarakat yang berbeda. Peserta perlu membedakan antara pekerjaan yang benar-benar hilang, pekerjaan yang mengalami perubahan tugas, dan pekerjaan baru yang muncul.',
'Mosi ini terutama berkaitan dengan SDG 8 – Pekerjaan Layak dan Pertumbuhan Ekonomi. Perkembangan AI dapat mendukung produktivitas dan menciptakan aktivitas ekonomi baru, tetapi perubahan teknologi juga dapat memengaruhi pekerja yang keterampilannya tidak lagi sesuai. Mosi ini juga dapat dikaitkan dengan SDG 4, SDG 9, dan SDG 10 karena perubahan pekerjaan berkaitan dengan peningkatan keterampilan, inovasi teknologi, dan kesenjangan akses adaptasi.',
'Bedakan pekerjaan yang hilang dengan tugas pekerjaan yang berubah. Pertimbangkan jumlah pekerjaan, kualitas dan upah pekerjaan, perubahan keterampilan, kesempatan adaptasi, siapa yang memperoleh manfaat, dan apakah pekerjaan baru dapat diakses oleh pekerja yang terdampak.',
'Lapis 1 – Apa yang terjadi? Identifikasi perubahan yang ditimbulkan AI. Lapis 2 – Apa dampaknya terhadap pekerjaan? Tentukan apakah AI menggantikan, membantu, atau mengubah tugas manusia. Lapis 3 – Siapa yang terdampak? Identifikasi kelompok yang memperoleh manfaat atau menghadapi risiko. Lapis 4 – Apa dampak jangka panjangnya? Pertimbangkan perubahan keterampilan, pendidikan, produktivitas, pendapatan, dan kesempatan kerja. Lapis 5 – Apa kaitannya dengan pembangunan berkelanjutan? Hubungkan hasil analisis dengan SDGs.'
);

INSERT OR REPLACE INTO motion_context
(motion_id, background, focus_issue, sdg_context, key_considerations, analysis_framework)
VALUES
(
2,
'Perkembangan AI dapat digunakan untuk menganalisis data lingkungan, memprediksi cuaca, mengoptimalkan penggunaan energi, meningkatkan efisiensi produksi, serta membantu pemantauan perubahan iklim. Di sisi lain, pengembangan dan penggunaan AI membutuhkan perangkat komputasi, pusat data, jaringan, energi, bahan mentah, dan pada akhirnya dapat menghasilkan limbah elektronik.',
'Perdebatan tidak cukup hanya membandingkan AI membantu lingkungan dengan AI menggunakan banyak energi. Peserta perlu mempertimbangkan besar manfaat lingkungan, besar sumber daya yang digunakan, sumber energi, pihak yang memperoleh manfaat, dan cara mengurangi dampak lingkungan. Siklus hidup teknologi perlu dipertimbangkan mulai dari produksi perangkat, penggunaan energi, penggunaan AI, hingga pengelolaan perangkat setelah digunakan.',
'Mosi ini terutama berkaitan dengan SDG 12 dan SDG 13, serta dapat dikaitkan dengan SDG 7 dan SDG 9. SDG 12 berkaitan dengan penggunaan sumber daya dan limbah; SDG 13 dengan perubahan iklim; SDG 7 dengan kebutuhan energi; dan SDG 9 dengan infrastruktur serta inovasi teknologi.',
'Bandingkan manfaat dan dampak pada kasus konkret. Pertimbangkan energi, sumber energi, emisi, pusat data, perangkat keras, limbah elektronik, efisiensi, skala penggunaan, dan pihak yang menikmati manfaat serta menanggung dampak.',
'Lapis 1 – Apa yang terjadi? Identifikasi penggunaan AI dan sumber daya yang dibutuhkan. Lapis 2 – Apa manfaatnya? Tentukan manfaat lingkungan yang dihasilkan. Lapis 3 – Apa dampaknya? Identifikasi sumber daya yang digunakan untuk menghasilkan manfaat tersebut. Lapis 4 – Bagaimana membandingkannya? Tentukan ukuran untuk membandingkan manfaat dan dampak. Lapis 5 – Apa kaitannya dengan SDGs? Hubungkan analisis dengan tujuan pembangunan berkelanjutan.'
);

INSERT OR REPLACE INTO motion_context
(motion_id, background, focus_issue, sdg_context, key_considerations, analysis_framework)
VALUES
(
3,
'AI semakin mudah digunakan oleh siswa untuk membantu kegiatan belajar, misalnya meminta penjelasan konsep, mencari contoh, membuat rangkuman, memperoleh ide, menerjemahkan teks, dan mendapatkan umpan balik terhadap tugas. Penggunaan AI dapat membuat proses belajar lebih personal dan membantu siswa ketika mengalami kesulitan, tetapi penggunaan yang tidak tepat dapat menimbulkan ketergantungan, menerima informasi keliru, atau menyelesaikan tugas tanpa memahami prosesnya.',
'Peserta perlu membedakan AI sebagai alat belajar dan AI sebagai pengganti proses berpikir siswa. Siswa dapat menggunakan AI untuk memahami konsep lalu memeriksa penjelasan dan mengerjakan soal secara mandiri; penggunaan yang berbeda adalah menyalin jawaban AI tanpa memahami prosesnya. Dampak penggunaan AI dapat berbeda bergantung pada cara siswa dan guru menggunakannya.',
'Mosi ini berkaitan dengan SDG 4 – Pendidikan Berkualitas. Pendidikan berkualitas mencakup berpikir kritis, pemecahan masalah, komunikasi, kolaborasi, dan belajar mandiri. AI dapat mendukung pembelajaran apabila digunakan secara tepat, tetapi siswa tetap perlu memahami materi, memeriksa informasi, mempertimbangkan sumber, dan bertanggung jawab terhadap hasil pekerjaannya.',
'Pertimbangkan ketergantungan pada AI, kualitas jawaban AI, kesempatan berlatih berpikir, integritas akademik, akses dan literasi AI, serta manfaat AI untuk penjelasan, belajar mandiri, latihan, eksplorasi ide, dan umpan balik guru.',
''
);

INSERT OR REPLACE INTO motion_context
(motion_id, background, focus_issue, sdg_context, key_considerations, analysis_framework)
VALUES
(
4,
'AI generatif memungkinkan seseorang membuat teks, gambar, suara, dan video dengan lebih cepat dan mudah. Kemampuan tersebut dapat digunakan untuk tujuan positif maupun untuk membuat informasi palsu atau menyesatkan yang terlihat meyakinkan dan dapat diproduksi dalam jumlah besar. Informasi palsu buatan manusia telah ada sebelum perkembangan AI, termasuk hoaks, manipulasi informasi, propaganda, dan berbagai bentuk informasi menyesatkan.',
'Peserta perlu membedakan AI-generated information, false information, dan disinformation. Dibuat oleh AI tidak otomatis berarti palsu, sebagaimana informasi yang dibuat manusia juga tidak otomatis benar atau salah. Pertimbangan perlu mencakup kebenaran informasi, niat menyesatkan, luas penyebaran, kemudahan pembuatan ulang, tingkat kesulitan deteksi, dan dampak terhadap individu dan masyarakat.',
'Mosi ini berkaitan dengan SDG 16 – Perdamaian, Keadilan, dan Kelembagaan yang Tangguh, terutama karena kualitas informasi memengaruhi kemampuan masyarakat memperoleh informasi yang dapat dipercaya dan mengambil keputusan berdasarkan informasi tersebut.',
'Pertimbangkan isi, tujuan, jangkauan, konteks, respons masyarakat, kemampuan produksi ulang, kemudahan deteksi, dan dampak informasi terhadap individu serta masyarakat.',
''
);


-- =========================================================
-- MOTION QUESTIONS
-- =========================================================

INSERT INTO motion_questions (motion_id, category, question, position) VALUES
(1, 'dasar', 'Apa yang dimaksud dengan lapangan pekerjaan dalam mosi ini?', 1),
(1, 'dasar', 'Apa perbedaan antara pekerjaan yang hilang dan pekerjaan yang berubah?', 2),
(1, 'dasar', 'Apa saja pekerjaan yang saat ini sudah menggunakan AI?', 3),
(1, 'dasar', 'Pekerjaan baru apa yang muncul karena perkembangan AI?', 4),
(1, 'dasar', 'Apakah semua jenis pekerjaan memiliki risiko otomatisasi yang sama?', 5),
(1, 'analitis', 'Jika AI menggantikan beberapa tugas manusia, apakah pekerjaan tersebut dapat dikatakan hilang?', 6),
(1, 'analitis', 'Jika AI meningkatkan produktivitas perusahaan, apakah peningkatan produktivitas selalu menghasilkan lebih banyak pekerjaan?', 7),
(1, 'analitis', 'Apakah pekerjaan baru yang muncul dapat diisi oleh pekerja yang pekerjaannya terdampak AI?', 8),
(1, 'analitis', 'Kelompok pekerja seperti apa yang paling membutuhkan peningkatan keterampilan?', 9),
(1, 'analitis', 'Apakah manfaat ekonomi dari AI dapat dirasakan secara merata oleh pekerja?', 10),
(1, 'kritis', 'Bagaimana kita membandingkan jumlah pekerjaan yang hilang dengan pekerjaan yang tercipta?', 11),
(1, 'kritis', 'Apakah jumlah pekerjaan merupakan satu-satunya ukuran keberhasilan?', 12),
(1, 'kritis', 'Bagaimana kualitas dan upah pekerjaan yang tercipta perlu dipertimbangkan?', 13),
(1, 'kritis', 'Apakah perkembangan AI akan menciptakan kesempatan kerja baru dalam jangka panjang, meskipun terjadi perubahan besar dalam jangka pendek?', 14),
(1, 'kritis', 'Siapa yang memperoleh manfaat terbesar dari peningkatan produktivitas akibat AI?', 15),
(1, 'posisi_debat', 'Apa klaim utama kelompok kami?', 16),
(1, 'posisi_debat', 'Apa bukti yang mendukung klaim tersebut?', 17),
(1, 'posisi_debat', 'Apakah bukti tersebut menunjukkan hubungan sebab-akibat atau hanya menunjukkan adanya hubungan?', 18),
(1, 'posisi_debat', 'Siapa yang memperoleh manfaat dari perkembangan AI?', 19),
(1, 'posisi_debat', 'Siapa yang berpotensi mengalami kerugian?', 20),
(1, 'posisi_debat', 'Apakah dampaknya berbeda antara jangka pendek dan jangka panjang?', 21),
(1, 'posisi_debat', 'Apakah pekerjaan baru dapat diakses oleh pekerja yang pekerjaannya terdampak?', 22),
(1, 'posisi_debat', 'Bagaimana pendidikan dan pelatihan dapat memengaruhi dampak AI terhadap pekerjaan?', 23),
(1, 'posisi_debat', 'Apa kelemahan argumen kelompok kami?', 24),
(1, 'posisi_debat', 'Apa kemungkinan argumen terkuat dari pihak lawan?', 25);

INSERT INTO motion_questions (motion_id, category, question, position) VALUES
(2, 'dasar', 'Apa saja manfaat AI bagi kehidupan manusia?', 1),
(2, 'dasar', 'Mengapa AI membutuhkan energi?', 2),
(2, 'dasar', 'Apa hubungan antara pusat data dan konsumsi energi?', 3),
(2, 'dasar', 'Apakah semua penggunaan AI memiliki dampak lingkungan yang sama?', 4),
(2, 'dasar', 'Apa saja sumber daya yang diperlukan untuk membangun infrastruktur AI?', 5),
(2, 'analitis', 'Apakah manfaat AI dalam menghemat energi dapat menutupi energi yang digunakan untuk menjalankan AI?', 6),
(2, 'analitis', 'Apakah AI dapat membantu mengurangi emisi di sektor tertentu?', 7),
(2, 'analitis', 'Bagaimana membandingkan manfaat AI yang sulit diukur dengan dampak lingkungan yang dapat diukur?', 8),
(2, 'analitis', 'Apakah dampak lingkungan AI lebih besar pada tahap pengembangan, penggunaan, atau produksi perangkat keras?', 9),
(2, 'analitis', 'Apakah semakin banyak penggunaan AI selalu berarti semakin besar dampaknya terhadap lingkungan?', 10),
(2, 'kritis', 'Jika AI menggunakan banyak energi tetapi membantu mengurangi penggunaan energi pada sektor lain, bagaimana dampaknya harus dinilai?', 11),
(2, 'kritis', 'Apakah manfaat AI harus dibandingkan dengan dampaknya secara keseluruhan atau berdasarkan masing-masing sektor?', 12),
(2, 'kritis', 'Siapa yang menikmati manfaat AI dan siapa yang menanggung dampak lingkungannya?', 13),
(2, 'kritis', 'Apakah penggunaan AI untuk tujuan yang kurang penting dapat dibenarkan jika membutuhkan sumber daya besar?', 14),
(2, 'kritis', 'Apakah perkembangan AI tetap dapat dianggap berkelanjutan jika kebutuhan energinya terus meningkat?', 15),
(2, 'posisi_debat', 'Apa manfaat utama AI yang ingin kami buktikan?', 16),
(2, 'posisi_debat', 'Apa dampak lingkungan utama yang perlu kami pertimbangkan?', 17),
(2, 'posisi_debat', 'Apakah manfaat tersebut dapat diukur?', 18),
(2, 'posisi_debat', 'Apakah dampaknya dapat diukur?', 19),
(2, 'posisi_debat', 'Apa satuan yang dapat digunakan untuk membandingkannya?', 20),
(2, 'posisi_debat', 'Apakah manfaat dan dampak terjadi pada waktu yang sama?', 21),
(2, 'posisi_debat', 'Apakah dampaknya berbeda berdasarkan jenis penggunaan AI?', 22),
(2, 'posisi_debat', 'Apakah AI dapat dibuat lebih hemat energi?', 23),
(2, 'posisi_debat', 'Siapa yang memperoleh manfaat dan siapa yang menanggung dampaknya?', 24),
(2, 'posisi_debat', 'Apakah perkembangan AI dapat tetap berlangsung dengan cara yang lebih berkelanjutan?', 25);

INSERT INTO motion_questions (motion_id, category, question, position) VALUES
(3, 'pendalaman', 'Apakah keberadaan AI yang menentukan kualitas pembelajaran, atau cara siswa dan guru menggunakan AI yang lebih menentukan dampaknya?', 1);

INSERT INTO motion_questions (motion_id, category, question, position) VALUES
(4, 'kritis', 'Apakah informasi tersebut benar atau salah?', 1),
(4, 'kritis', 'Apakah pembuatnya sengaja menyesatkan?', 2),
(4, 'kritis', 'Seberapa luas informasi tersebut tersebar?', 3),
(4, 'kritis', 'Seberapa mudah informasi tersebut dibuat ulang?', 4),
(4, 'kritis', 'Seberapa sulit masyarakat mendeteksinya?', 5),
(4, 'kritis', 'Apa dampaknya terhadap individu dan masyarakat?', 6);


-- =========================================================
-- MOTION ARGUMENTS
-- =========================================================

INSERT INTO motion_arguments
(motion_id, side, title, explanation, reasoning, evidence_to_find, position) VALUES
(1, 'PRO', 'Munculnya pekerjaan baru',
'Perkembangan AI membutuhkan tenaga kerja dengan keterampilan baru. Muncul kebutuhan terhadap pekerjaan yang berkaitan dengan pengembangan, pengelolaan, penerapan, keamanan, evaluasi, dan pemanfaatan AI.',
'Perkembangan AI → kebutuhan teknologi dan layanan baru → kebutuhan keterampilan baru → muncul pekerjaan baru.',
'Contoh pekerjaan baru yang berkaitan dengan AI; perubahan kebutuhan keterampilan di dunia kerja; data mengenai pertumbuhan pekerjaan yang berkaitan dengan teknologi AI.', 1),
(1, 'PRO', 'AI meningkatkan produktivitas',
'AI dapat membantu manusia menyelesaikan tugas tertentu dengan lebih cepat. Peningkatan produktivitas dapat membantu perusahaan mengembangkan produk atau layanan baru dan memperluas kegiatan ekonominya.',
'AI → produktivitas meningkat → kapasitas produksi/layanan meningkat → aktivitas ekonomi berkembang → peluang pekerjaan dapat bertambah.',
'Studi mengenai peningkatan produktivitas setelah penggunaan AI; contoh perusahaan atau sektor yang menggunakan AI; data mengenai hubungan produktivitas, inovasi, dan penciptaan pekerjaan.', 2),
(1, 'PRO', 'AI tidak selalu menggantikan pekerjaan secara keseluruhan',
'Dalam banyak pekerjaan, AI dapat mengambil alih tugas tertentu tanpa menghilangkan seluruh pekerjaan manusia. Manusia tetap dibutuhkan untuk mengambil keputusan, berkomunikasi, bekerja dengan orang lain, menangani situasi yang kompleks, atau bertanggung jawab terhadap hasil pekerjaan.',
'AI menggantikan sebagian tugas → pekerjaan berubah → manusia bekerja bersama AI → jenis keterampilan yang dibutuhkan berubah.',
'Analisis mengenai proporsi tugas yang dapat diotomatisasi dan tugas yang masih membutuhkan manusia.', 3),
(1, 'KONTRA', 'Otomatisasi dapat mengurangi kebutuhan tenaga kerja',
'AI dapat mengerjakan berbagai tugas yang sebelumnya dilakukan manusia. Jika perusahaan dapat menyelesaikan pekerjaan dengan lebih sedikit tenaga kerja, kebutuhan terhadap pekerja tertentu dapat menurun.',
'AI mampu mengerjakan tugas → kebutuhan tenaga manusia berkurang → sebagian pekerjaan terdampak → kesempatan kerja tertentu dapat menyusut.',
'Contoh pekerjaan yang mengalami otomatisasi; data perubahan kebutuhan tenaga kerja pada sektor yang menggunakan AI; studi mengenai pekerjaan yang memiliki paparan tinggi terhadap AI.', 4),
(1, 'KONTRA', 'Pekerjaan baru tidak otomatis dapat menggantikan pekerjaan lama',
'Munculnya pekerjaan baru tidak berarti pekerja yang kehilangan pekerjaan dapat langsung berpindah ke pekerjaan tersebut. Pekerjaan baru mungkin membutuhkan keterampilan, pendidikan, pengalaman, atau kemampuan teknologi yang berbeda.',
'Pekerjaan lama berkurang → pekerjaan baru muncul → keterampilan yang dibutuhkan berbeda → tidak semua pekerja dapat langsung berpindah.',
'Studi mengenai reskilling, upskilling, dan transisi pekerja.', 5),
(1, 'KONTRA', 'Dampak AI dapat berbeda antar kelompok pekerja',
'Tidak semua pekerja memiliki tingkat pendidikan, akses teknologi, pengalaman, dan kesempatan pelatihan yang sama. Jika perubahan teknologi berlangsung cepat, pekerja yang memiliki akses terhadap pendidikan dan pelatihan dapat lebih mudah beradaptasi dibandingkan kelompok yang memiliki keterbatasan akses.',
'Perubahan teknologi berlangsung cepat → kemampuan adaptasi tidak sama → dampak terhadap pekerjaan dan pendapatan berbeda.',
'Data mengenai perbedaan dampak berdasarkan sektor atau kelompok pekerja.', 6);

INSERT INTO motion_arguments
(motion_id, side, title, explanation, reasoning, evidence_to_find, position) VALUES
(2, 'PRO', 'AI dapat meningkatkan efisiensi penggunaan sumber daya',
'AI dapat membantu manusia menganalisis data dalam jumlah besar dan menemukan pola yang sulit dilakukan secara manual. Dalam bidang tertentu, kemampuan tersebut dapat digunakan untuk mengoptimalkan penggunaan energi, bahan baku, air, maupun sumber daya lainnya.',
'AI → analisis data → penggunaan sumber daya lebih tepat → pemborosan berkurang → efisiensi meningkat.',
'Contoh penggunaan AI untuk efisiensi energi; studi mengenai AI dalam pengelolaan sumber daya; data pengurangan pemborosan setelah penggunaan teknologi AI.', 1),
(2, 'PRO', 'AI dapat membantu menangani persoalan lingkungan',
'AI dapat digunakan untuk menganalisis data lingkungan dan membantu manusia memahami perubahan yang terjadi, termasuk pemantauan perubahan iklim, analisis kondisi lingkungan, prediksi cuaca, pemantauan penggunaan energi, pemantauan hutan atau lahan, dan pengelolaan sistem energi.',
'Persoalan lingkungan menghasilkan data dalam jumlah besar → AI membantu menganalisis data → informasi menjadi lebih cepat dan akurat → pengambilan keputusan dapat menjadi lebih tepat.',
'Contoh penggunaan AI untuk lingkungan dan studi yang menunjukkan manfaatnya.', 2),
(2, 'PRO', 'AI dapat mendukung transisi menuju sistem yang lebih efisien',
'AI dapat membantu mengoptimalkan sistem yang kompleks, misalnya penggunaan energi, transportasi, distribusi barang, dan proses produksi. Jika sistem tersebut menjadi lebih efisien, penggunaan sumber daya dapat ditekan.',
'AI → optimasi sistem → penggunaan sumber daya lebih efisien → pemborosan berkurang → dampak lingkungan dapat ditekan.',
'Data yang menunjukkan seberapa besar manfaat dan dalam kondisi apa manfaat itu terjadi.', 3),
(2, 'KONTRA', 'AI membutuhkan energi dan infrastruktur',
'Pengembangan dan penggunaan AI membutuhkan komputasi dalam jumlah besar. Infrastruktur seperti pusat data membutuhkan listrik dan sistem pendingin. Jika penggunaan AI semakin luas, kebutuhan terhadap infrastruktur tersebut juga dapat meningkat.',
'Pengembangan AI → kebutuhan komputasi meningkat → kebutuhan energi dan infrastruktur meningkat → tekanan terhadap lingkungan dapat meningkat.',
'Data konsumsi energi pusat data; perkembangan kebutuhan listrik akibat AI; data mengenai penggunaan energi dalam pengembangan dan penggunaan AI.', 4),
(2, 'KONTRA', 'Dampak AI tidak hanya berasal dari konsumsi listrik',
'Perangkat komputasi membutuhkan bahan baku dan proses produksi. Setelah masa penggunaan berakhir, perangkat tersebut juga dapat menjadi limbah elektronik. Karena itu, peserta perlu melihat siklus hidup teknologi, bukan hanya listrik yang digunakan ketika AI beroperasi.',
'Pengembangan AI → kebutuhan perangkat keras → penggunaan bahan dan sumber daya → produksi perangkat → penggunaan → limbah elektronik.',
'Data mengenai bahan, perangkat keras, dan limbah elektronik.', 5),
(2, 'KONTRA', 'Manfaat AI tidak otomatis berarti manfaat lingkungan',
'AI dapat digunakan untuk tujuan lingkungan, tetapi tidak semua penggunaan AI memiliki manfaat tersebut. Jika AI digunakan untuk menghasilkan konten dalam jumlah besar, hiburan, atau aktivitas lain yang tidak berkaitan langsung dengan efisiensi sumber daya, manfaat lingkungannya tidak selalu sebanding dengan sumber daya yang digunakan.',
'Penggunaan AI tidak selalu menghasilkan manfaat lingkungan → manfaat dan sumber daya perlu dibandingkan pada kasus konkret.',
'Contoh penggunaan AI non-lingkungan dan analisis dampak sumber daya.', 6);

INSERT INTO motion_arguments
(motion_id, side, title, explanation, reasoning, evidence_to_find, position) VALUES
(3, 'PRO', 'Ketergantungan pada AI dapat mengurangi usaha memahami materi',
'Ketergantungan pada AI dapat mengurangi usaha siswa dalam memahami materi.', '', '', 1),
(3, 'PRO', 'AI dapat memberikan jawaban yang salah atau tidak sesuai konteks',
'AI dapat memberikan jawaban yang salah atau tidak sesuai konteks.', '', '', 2),
(3, 'PRO', 'AI dapat mengurangi kesempatan siswa berlatih berpikir',
'Penggunaan AI untuk mengerjakan tugas dapat mengurangi kesempatan siswa berlatih berpikir.', '', '', 3),
(3, 'PRO', 'AI dapat digunakan untuk plagiarisme',
'Siswa dapat menggunakan AI untuk melakukan plagiarisme atau menyamarkan pekerjaan yang bukan hasil pemikirannya.', '', '', 4),
(3, 'PRO', 'Tidak semua siswa memiliki akses dan kemampuan menggunakan AI secara kritis',
'Tidak semua siswa memiliki akses dan kemampuan menggunakan AI secara kritis.', '', '', 5),
(3, 'KONTRA', 'AI dapat memberikan penjelasan alternatif',
'AI dapat memberikan penjelasan alternatif ketika siswa belum memahami materi.', '', '', 6),
(3, 'KONTRA', 'AI dapat membantu belajar mandiri',
'AI dapat membantu siswa belajar secara lebih mandiri.', '', '', 7),
(3, 'KONTRA', 'AI dapat memberikan contoh dan latihan tambahan',
'AI dapat memberikan contoh dan latihan tambahan.', '', '', 8),
(3, 'KONTRA', 'AI dapat memperluas sumber belajar',
'AI dapat membantu siswa mengeksplorasi ide dan memperluas sumber belajar.', '', '', 9),
(3, 'KONTRA', 'AI dapat mendukung guru',
'AI dapat mendukung guru dalam menyiapkan materi dan memberikan umpan balik.', '', '', 10);

INSERT INTO motion_arguments
(motion_id, side, title, explanation, reasoning, evidence_to_find, position) VALUES
(4, 'PRO', 'AI dapat menghasilkan konten sangat cepat',
'AI dapat menghasilkan konten dalam waktu yang sangat cepat.', '', '', 1),
(4, 'PRO', 'Konten AI dapat tampak meyakinkan',
'AI dapat digunakan untuk membuat teks, gambar, suara, dan video yang tampak meyakinkan.', '', '', 2),
(4, 'PRO', 'Produksi informasi palsu dapat berskala besar',
'Produksi informasi palsu dapat dilakukan dalam skala yang lebih besar.', '', '', 3),
(4, 'PRO', 'Konten sintetis dapat meniru identitas atau peristiwa',
'Konten sintetis dapat digunakan untuk meniru identitas atau membuat peristiwa yang tidak pernah terjadi.', '', '', 4),
(4, 'PRO', 'Masyarakat dapat kesulitan membedakan konten',
'Masyarakat dapat mengalami kesulitan membedakan konten asli dan buatan AI.', '', '', 5),
(4, 'KONTRA', 'Informasi palsu buatan manusia juga berdampak besar',
'Informasi palsu buatan manusia juga dapat memiliki dampak yang sangat besar.', '', '', 6),
(4, 'KONTRA', 'Manusia menentukan tujuan penggunaan AI',
'Manusia tetap menjadi pihak yang menentukan tujuan dan penggunaan teknologi AI.', '', '', 7),
(4, 'KONTRA', 'AI dapat membantu pemeriksaan informasi',
'AI juga dapat digunakan untuk membantu memeriksa informasi dan mendeteksi pola tertentu.', '', '', 8),
(4, 'KONTRA', 'Tidak semua informasi buatan AI palsu atau berbahaya',
'Tidak semua informasi yang dibuat AI merupakan informasi palsu atau berbahaya.', '', '', 9),
(4, 'KONTRA', 'Bahaya informasi dipengaruhi isi, tujuan, jangkauan, konteks, dan respons',
'Bahaya informasi tidak hanya ditentukan oleh siapa atau apa yang membuatnya, tetapi juga oleh isi, tujuan, jangkauan, konteks, dan respons masyarakat terhadap informasi tersebut.', '', '', 10);


-- =========================================================
-- COUNTERARGUMENT + REBUTTAL
-- =========================================================

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 1, id, 'PRO',
'Pekerjaan baru belum tentu dapat diakses oleh pekerja yang kehilangan pekerjaan.',
'Perlu melihat apakah terdapat program pelatihan dan transisi keterampilan yang memungkinkan pekerja berpindah bidang.',
1
FROM motion_arguments
WHERE motion_id = 1 AND side = 'PRO'
AND title = 'Munculnya pekerjaan baru'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 1, id, 'PRO',
'Produktivitas yang meningkat dapat membuat perusahaan membutuhkan lebih sedikit pekerja.',
'Peningkatan produktivitas juga dapat mendorong ekspansi usaha, tetapi perlu dibuktikan melalui data pada sektor yang dibahas.',
2
FROM motion_arguments
WHERE motion_id = 1 AND side = 'PRO'
AND title = 'AI meningkatkan produktivitas'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 1, id, 'PRO',
'Jika sebagian besar tugas utama dapat dilakukan AI, kebutuhan terhadap pekerjaan tersebut tetap dapat menurun.',
'Perlu melihat seberapa besar proporsi tugas yang dapat diotomatisasi dan tugas apa yang masih membutuhkan manusia.',
3
FROM motion_arguments
WHERE motion_id = 1 AND side = 'PRO'
AND title = 'AI tidak selalu menggantikan pekerjaan secara keseluruhan'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 1, id, 'PRO',
'Jumlah pekerjaan baru mungkin lebih kecil daripada pekerjaan yang terdampak otomatisasi.',
'Perlu dibandingkan data pekerjaan yang hilang atau berkurang dengan pekerjaan baru yang muncul dalam periode dan sektor yang sama.',
4
FROM motion_arguments
WHERE motion_id = 1 AND side = 'PRO'
AND title = 'Munculnya pekerjaan baru'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 1, id, 'PRO',
'Kemampuan beradaptasi tidak sama pada semua pekerja.',
'Pendidikan, pelatihan, dan kebijakan transisi tenaga kerja menjadi faktor penting dalam menentukan dampaknya.',
5
FROM motion_arguments
WHERE motion_id = 1 AND side = 'PRO'
AND title = 'Dampak AI dapat berbeda antar kelompok pekerja'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 2, id, 'PRO',
'AI sendiri membutuhkan energi dalam jumlah besar.',
'Perbandingan perlu dilakukan pada penggunaan AI tertentu: berapa energi yang digunakan dan berapa energi yang dapat dihemat?',
1
FROM motion_arguments
WHERE motion_id = 2 AND side = 'PRO'
AND title = 'AI dapat meningkatkan efisiensi penggunaan sumber daya'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 2, id, 'PRO',
'Kemampuan tersebut tidak menghilangkan dampak dari pusat data dan perangkat keras.',
'Manfaat dan dampak perlu dihitung secara terpisah lalu dibandingkan berdasarkan kasus yang konkret.',
2
FROM motion_arguments
WHERE motion_id = 2 AND side = 'PRO'
AND title = 'AI dapat membantu menangani persoalan lingkungan'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 2, id, 'PRO',
'Efisiensi per sistem tidak selalu berarti konsumsi total turun jika penggunaan AI terus meningkat.',
'Perlu melihat apakah peningkatan efisiensi diikuti peningkatan penggunaan secara besar-besaran.',
3
FROM motion_arguments
WHERE motion_id = 2 AND side = 'PRO'
AND title = 'AI dapat mendukung transisi menuju sistem yang lebih efisien'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 2, id, 'PRO',
'Produksi perangkat AI juga membutuhkan bahan dan sumber daya.',
'Analisis harus mencakup seluruh siklus hidup teknologi.',
4
FROM motion_arguments
WHERE motion_id = 2 AND side = 'KONTRA'
AND title = 'Dampak AI tidak hanya berasal dari konsumsi listrik'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 2, id, 'PRO',
'Tidak semua manfaat AI berkaitan dengan keberlanjutan lingkungan.',
'Perlu membedakan manfaat sosial atau ekonomi dari manfaat lingkungan.',
5
FROM motion_arguments
WHERE motion_id = 2 AND side = 'KONTRA'
AND title = 'Manfaat AI tidak otomatis berarti manfaat lingkungan'
LIMIT 1;

INSERT INTO motion_rebuttals
(motion_id, argument_id, side, counterargument, rebuttal, position)
SELECT 2, id, 'PRO',
'Kemajuan teknologi tetap dapat menimbulkan dampak lingkungan.',
'Teknologi perlu dikembangkan dengan prinsip efisiensi energi, penggunaan sumber daya yang bertanggung jawab, dan pengelolaan limbah.',
6
FROM motion_arguments
WHERE motion_id = 2 AND side = 'PRO'
AND title = 'AI dapat mendukung transisi menuju sistem yang lebih efisien'
LIMIT 1;


-- =========================================================
-- RECOMMENDED SOURCES
-- =========================================================

INSERT INTO motion_sources (motion_id, organization, title, url, description, position) VALUES
(1, 'International Labour Organization', 'AI, pekerjaan, otomatisasi, dan kualitas kerja', 'https://www.ilo.org/publications/artificial-intelligence-adoption-and-its-impact-jobs', NULL, 1),
(1, 'World Economic Forum', 'Laporan mengenai pekerjaan dan keterampilan masa depan', NULL, NULL, 2),
(1, 'OECD', 'Kajian teknologi, produktivitas, dan dunia kerja', NULL, NULL, 3),
(1, 'World Bank', 'Data ekonomi dan ketenagakerjaan', NULL, NULL, 4),
(1, 'Badan Pusat Statistik (BPS)', 'Data ketenagakerjaan Indonesia', NULL, NULL, 5);

INSERT INTO motion_sources (motion_id, organization, title, url, description, position) VALUES
(2, 'International Energy Agency (IEA)', 'Data energi dan AI', 'https://www.iea.org/reports/energy-and-ai', NULL, 1),
(2, 'United Nations / UN SDGs', 'Konteks pembangunan berkelanjutan', 'https://sdgs.un.org/goals', NULL, 2),
(2, 'International Telecommunication Union (ITU)', 'Teknologi dan keberlanjutan', NULL, NULL, 3),
(2, 'UNEP', 'Isu lingkungan dan teknologi', NULL, NULL, 4),
(2, 'Jurnal ilmiah / laporan penelitian', 'Kajian AI dan lingkungan', NULL, NULL, 5);

INSERT INTO motion_sources (motion_id, organization, title, url, description, position) VALUES
(3, 'UNESCO', 'AI, pendidikan, literasi, informasi, dan demokrasi', 'https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research', NULL, 1);

INSERT INTO motion_sources (motion_id, organization, title, url, description, position) VALUES
(4, 'OECD', 'Misinformasi, disinformasi, AI, dan integritas informasi', 'https://www.oecd.org/en/topics/disinformation-and-misinformation.html', NULL, 1),
(4, 'OECD', 'Facts, disinformation, dan information integrity', 'https://www.oecd.org/en/publications/facts-not-fakes-tackling-disinformation-strengthening-information-integrity_d909ff7a-en/full-report/component-4.html', NULL, 2);


-- =========================================================
-- EXPLORATION KEYWORDS
-- =========================================================

INSERT INTO motion_keywords (motion_id, language, keyword, position) VALUES
(1, 'id', 'AI dan lapangan pekerjaan', 1),
(1, 'id', 'AI dan perubahan pekerjaan', 2),
(1, 'id', 'AI dan otomatisasi pekerjaan', 3),
(1, 'id', 'dampak AI terhadap tenaga kerja', 4),
(1, 'id', 'pekerjaan baru akibat AI', 5),
(1, 'id', 'keterampilan masa depan AI', 6),
(1, 'id', 'reskilling tenaga kerja AI', 7),
(1, 'id', 'produktivitas dan AI', 8),
(1, 'en', 'AI and jobs', 9),
(1, 'en', 'AI and employment', 10),
(1, 'en', 'AI job displacement', 11),
(1, 'en', 'AI job creation', 12),
(1, 'en', 'AI and productivity', 13),
(1, 'en', 'AI workforce transformation', 14),
(1, 'en', 'AI reskilling and upskilling', 15),
(1, 'en', 'generative AI and jobs', 16);

INSERT INTO motion_keywords (motion_id, language, keyword, position) VALUES
(2, 'id', 'AI dan konsumsi energi', 1),
(2, 'id', 'dampak AI terhadap lingkungan', 2),
(2, 'id', 'AI dan perubahan iklim', 3),
(2, 'id', 'pusat data dan konsumsi listrik', 4),
(2, 'id', 'AI untuk efisiensi energi', 5),
(2, 'id', 'AI dan limbah elektronik', 6),
(2, 'id', 'AI untuk lingkungan', 7),
(2, 'id', 'kecerdasan buatan dan keberlanjutan', 8),
(2, 'en', 'AI environmental impact', 9),
(2, 'en', 'AI energy consumption', 10),
(2, 'en', 'AI and climate change', 11),
(2, 'en', 'AI and sustainability', 12),
(2, 'en', 'data centers and energy consumption', 13),
(2, 'en', 'AI energy efficiency', 14),
(2, 'en', 'AI and electronic waste', 15),
(2, 'en', 'AI for environmental sustainability', 16),
(2, 'en', 'AI and carbon emissions', 17);

-- End of migration 0009
