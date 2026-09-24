/**
 * DAFTAR SDG
 *
 * Fungsi:
 * - Referensi 17 tujuan SDG (Sustainable Development Goals) resmi.
 * - Dipakai untuk validasi sdg_number saat update identitas tim,
 *   dan untuk mengisi dropdown pilihan SDG di frontend (via GET /api/sdgs).
 */

export type SdgOption = {
  number: number;
  title: string;
};

export const SDG_LIST: SdgOption[] = [
  { number: 1, title: 'Tanpa Kemiskinan' },
  { number: 2, title: 'Tanpa Kelaparan' },
  { number: 3, title: 'Kehidupan Sehat dan Sejahtera' },
  { number: 4, title: 'Pendidikan Berkualitas' },
  { number: 5, title: 'Kesetaraan Gender' },
  { number: 6, title: 'Air Bersih dan Sanitasi Layak' },
  { number: 7, title: 'Energi Bersih dan Terjangkau' },
  { number: 8, title: 'Pekerjaan Layak dan Pertumbuhan Ekonomi' },
  { number: 9, title: 'Industri, Inovasi, dan Infrastruktur' },
  { number: 10, title: 'Berkurangnya Kesenjangan' },
  { number: 11, title: 'Kota dan Permukiman yang Berkelanjutan' },
  { number: 12, title: 'Konsumsi dan Produksi yang Bertanggung Jawab' },
  { number: 13, title: 'Penanganan Perubahan Iklim' },
  { number: 14, title: 'Ekosistem Lautan' },
  { number: 15, title: 'Ekosistem Daratan' },
  { number: 16, title: 'Perdamaian, Keadilan, dan Kelembagaan yang Tangguh' },
  { number: 17, title: 'Kemitraan untuk Mencapai Tujuan' },
];

export function findSdgTitle(number: number): string | null {
  return SDG_LIST.find((item) => item.number === number)?.title ?? null;
}
