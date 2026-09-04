CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  queue_number TEXT NOT NULL,
  nama TEXT NOT NULL,
  asal_instansi TEXT NOT NULL,
  no_hp TEXT NOT NULL,
  keperluan TEXT NOT NULL,
  bidang_tujuan TEXT NOT NULL,
  nama_petugas TEXT,
  catatan TEXT,
  status TEXT NOT NULL DEFAULT 'menunggu',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
