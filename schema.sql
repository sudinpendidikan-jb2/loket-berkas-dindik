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
  status_updated_by TEXT,
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama TEXT NOT NULL,
  initials TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limit login/change-password, disimpan di DB (bukan memori proses)
-- supaya konsisten lintas instance serverless. Lihat lib/rate-limit.ts.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);
