CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  asal_instansi TEXT NOT NULL,
  no_hp TEXT NOT NULL,
  keperluan TEXT NOT NULL,
  nama_siswa TEXT,
  sekolah_asal TEXT,
  sekolah_tujuan TEXT,
  catatan TEXT,
  status TEXT NOT NULL DEFAULT 'menunggu',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
