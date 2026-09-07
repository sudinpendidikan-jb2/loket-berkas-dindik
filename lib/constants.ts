export const KEPERLUAN_OPTIONS = [
  "Mutasi masuk siswa",
  "Mutasi keluar siswa",
  "Legalisir dokumen",
  "Pengambilan berkas",
  "Pengaduan / keluhan",
  "Konsultasi",
  "Lainnya",
];

export const INSTANSI_OPTIONS = [
  "PAUD",
  "SD",
  "SMP",
  "SMA",
  "SMK",
  "Lainnya",
];

export const STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu",
  diproses: "Diproses",
  selesai: "Selesai",
};

/** Info resmi buat kop surat (dipakai di tampilan cetak/PDF). */
export const AGENCY_INFO = {
  lines: [
    "PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA",
    "DINAS PENDIDIKAN",
    "SUKU DINAS PENDIDIKAN WILAYAH II",
    "KOTA ADMINISTRASI JAKARTA BARAT",
  ],
  address: "Jalan Raya Kembangan No. 2 Kantor Walikota Gedung B Lt. XI",
  contact: "Telp (021) 58356235   Email: sudinpendidikanwil2jakbar@gmail.com",
};
