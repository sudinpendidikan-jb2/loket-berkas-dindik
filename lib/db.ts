import postgres from "postgres";

// DATABASE_URL berasal dari Supabase: Project Settings -> Database -> Connection string
// (pakai versi "Connection pooling" / Transaction mode untuk environment serverless seperti Vercel).
const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  prepare: false, // wajib false saat memakai Supabase connection pooler (pgbouncer)
});

export type GuestStatus = "menunggu" | "diproses" | "selesai";

export interface Guest {
  id: number;
  nama: string;
  asal_instansi: string;
  no_hp: string;
  keperluan: string;
  nama_siswa: string | null;
  sekolah_asal: string | null;
  sekolah_tujuan: string | null;
  catatan: string | null;
  status: GuestStatus;
  status_updated_by: string | null;
  status_updated_at: string | null;
  created_at: string;
}

export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  nama: string;
  initials: string;
  created_at: string;
}

<<<<<<< HEAD
// ensureSchema() menjalankan DDL (CREATE TABLE / ALTER TABLE) yang sifatnya
// idempoten, tapi tetap mahal kalau dieksekusi ulang di SETIAP request publik
// (form tamu, status admin, dsb). Di lingkungan serverless tiap instance
// fungsi baru akan menjalankannya sekali (saat cold start pertama), lalu
// memori instance yang sama akan melewatinya selama instance itu hidup.
let schemaEnsured: Promise<void> | null = null;

export async function ensureSchema() {
  if (!schemaEnsured) {
    schemaEnsured = runEnsureSchema().catch((err) => {
      // Kalau gagal, jangan simpan promise yang gagal - biar percobaan
      // berikutnya boleh mencoba lagi (mis. DB sempat down sesaat).
      schemaEnsured = null;
      throw err;
    });
  }
  return schemaEnsured;
}

async function runEnsureSchema() {
=======
// ensureSchema() dipanggil di beberapa API route setiap ada request masuk,
// termasuk sekarang endpoint login (untuk memastikan tabel rate_limits
// ada). Supaya tidak mengulang ~10 query CREATE/ALTER di setiap request,
// hasilnya di-cache per instance server — request pertama (cold start)
// yang menanggung biayanya, request berikutnya di instance yang sama
// langsung skip. Kalau sempat gagal, cache direset supaya boleh dicoba lagi.
let schemaReadyPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = runSchemaMigrations().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

async function runSchemaMigrations(): Promise<void> {
>>>>>>> 69c12d67d8cf2038688a86594020f80e7fbb56ed
  await sql`
    CREATE TABLE IF NOT EXISTS guests (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      asal_instansi TEXT NOT NULL,
      no_hp TEXT NOT NULL,
      keperluan TEXT NOT NULL,
      catatan TEXT,
      status TEXT NOT NULL DEFAULT 'menunggu',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Migrasi dari skema versi lama: nomor antrian, bidang tujuan, dan nama
  // petugas tidak dipakai lagi. Aman dijalankan berulang kali.
  await sql`ALTER TABLE guests DROP COLUMN IF EXISTS queue_number;`;
  await sql`ALTER TABLE guests DROP COLUMN IF EXISTS bidang_tujuan;`;
  await sql`ALTER TABLE guests DROP COLUMN IF EXISTS nama_petugas;`;

  // Detail siswa, khusus untuk keperluan mutasi masuk/keluar.
  await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS nama_siswa TEXT;`;
  await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS sekolah_asal TEXT;`;
  await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS sekolah_tujuan TEXT;`;

  // Jejak siapa & kapan terakhir mengubah status tamu ("Keluar ... oleh ...").
  await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS status_updated_by TEXT;`;
  await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;`;

  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nama TEXT NOT NULL,
      initials TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Index buat mempercepat query daftar kunjungan (ORDER BY created_at DESC,
  // filter per status), makin berguna kalau data tamu sudah banyak.
  await sql`CREATE INDEX IF NOT EXISTS idx_guests_created_at ON guests (created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_guests_status ON guests (status);`;

  // Rate limiting (WSTG-ATHN-03). Disimpan di database, BUKAN di memori
  // proses Node.js — supaya batas percobaan login konsisten lintas semua
  // instance/region serverless (mis. Vercel), bukan cuma per-instance.
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INT NOT NULL DEFAULT 1,
      window_start TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

export async function insertGuest(input: {
  nama: string;
  asal_instansi: string;
  no_hp: string;
  keperluan: string;
  nama_siswa?: string;
  sekolah_asal?: string;
  sekolah_tujuan?: string;
  catatan?: string;
}): Promise<Guest> {
  const rows = await sql`
    INSERT INTO guests (nama, asal_instansi, no_hp, keperluan, nama_siswa, sekolah_asal, sekolah_tujuan, catatan)
    VALUES (
      ${input.nama},
      ${input.asal_instansi},
      ${input.no_hp},
      ${input.keperluan},
      ${input.nama_siswa ?? null},
      ${input.sekolah_asal ?? null},
      ${input.sekolah_tujuan ?? null},
      ${input.catatan ?? null}
    )
    RETURNING *;
  `;
  return rows[0] as unknown as Guest;
}

export async function listGuests(filters: {
  date?: string;
  status?: string;
  q?: string;
}): Promise<Guest[]> {
  const { date, status, q } = filters;

  const rows = await sql`
    SELECT * FROM guests
    WHERE
      (${date ?? null}::date IS NULL OR created_at::date = ${date ?? null}::date)
      AND (${status ?? null}::text IS NULL OR status = ${status ?? null}::text)
      AND (
        ${q ?? null}::text IS NULL
        OR nama ILIKE '%' || ${q ?? null}::text || '%'
        OR asal_instansi ILIKE '%' || ${q ?? null}::text || '%'
        OR nama_siswa ILIKE '%' || ${q ?? null}::text || '%'
        OR sekolah_asal ILIKE '%' || ${q ?? null}::text || '%'
        OR sekolah_tujuan ILIKE '%' || ${q ?? null}::text || '%'
      )
    ORDER BY created_at DESC;
  `;
  return rows as unknown as Guest[];
}

export async function updateGuestStatus(
  id: number,
  status: GuestStatus,
  updatedBy: string
): Promise<Guest | null> {
  const rows = await sql`
    UPDATE guests
    SET status = ${status}, status_updated_by = ${updatedBy}, status_updated_at = now()
    WHERE id = ${id}
    RETURNING *;
  `;
  return (rows[0] as unknown as Guest) ?? null;
}

export async function getGuestById(id: number): Promise<Guest | null> {
  const rows = await sql`SELECT * FROM guests WHERE id = ${id};`;
  return (rows[0] as unknown as Guest) ?? null;
}

export async function countAdmins(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int AS count FROM admins;`;
  return rows[0]?.count ?? 0;
}

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const rows = await sql`SELECT * FROM admins WHERE username = ${username};`;
  return (rows[0] as unknown as Admin) ?? null;
}

export async function createAdmin(input: {
  username: string;
  password_hash: string;
  nama: string;
  initials: string;
}): Promise<Admin> {
  const rows = await sql`
    INSERT INTO admins (username, password_hash, nama, initials)
    VALUES (${input.username}, ${input.password_hash}, ${input.nama}, ${input.initials})
    RETURNING *;
  `;
  return rows[0] as unknown as Admin;
}

// Angka acak apa saja, dipakai sebagai "kunci" advisory lock khusus untuk
// proses setup admin pertama. Nilainya bebas, yang penting konsisten dan
// tidak dipakai oleh lock lain di aplikasi ini.
const SETUP_LOCK_KEY = 872193456;

/**
 * Membuat admin pertama HANYA jika belum ada admin sama sekali - dan
 * melakukannya secara atomik (aman dari race condition).
 *
 * Sebelumnya, endpoint /api/admin/setup mengecek countAdmins() lalu
 * memanggil createAdmin() secara terpisah. Kalau dua request datang nyaris
 * bersamaan saat tabel admins masih kosong, keduanya bisa lolos pengecekan
 * "count === 0" sebelum salah satu sempat INSERT - hasilnya lebih dari satu
 * admin "pertama" berhasil dibuat lewat rute yang seharusnya cuma sekali
 * pakai (WSTG-IDNT-02).
 *
 * Di sini, pg_advisory_xact_lock membuat request kedua MENUNGGU sampai
 * transaksi request pertama selesai (commit/rollback) sebelum ia boleh
 * melanjutkan pengecekan count-nya sendiri. Jadi begitu satu admin berhasil
 * dibuat, request lain yang menyusul pasti melihat count > 0 dan ditolak.
 * Lock otomatis lepas saat transaksi berakhir (xact = per-transaction lock).
 */
export async function createFirstAdminIfNone(input: {
  username: string;
  password_hash: string;
  nama: string;
  initials: string;
}): Promise<Admin | null> {
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${SETUP_LOCK_KEY});`;

    const rows = await tx`SELECT COUNT(*)::int AS count FROM admins;`;
    const count = rows[0]?.count ?? 0;
    if (count > 0) {
      // Sudah ada admin (dibuat oleh request lain yang menang duluan).
      return null;
    }

    const inserted = await tx`
      INSERT INTO admins (username, password_hash, nama, initials)
      VALUES (${input.username}, ${input.password_hash}, ${input.nama}, ${input.initials})
      RETURNING *;
    `;
    return inserted[0] as unknown as Admin;
  });
}

// ---- Rate limiting (WSTG-ATHN-03) ----
//
// Disimpan di tabel Postgres (bukan Map di memori proses) supaya batasnya
// konsisten walau request mendarat di instance/region serverless yang
// berbeda-beda. `key` bebas (mis. "login:ip:1.2.3.4" atau
// "login:user:sudin01") supaya IP dan username masing-masing punya kuota
// sendiri (lihat pemakaiannya di app/api/admin/login/route.ts).
export async function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const rows = await sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
        THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
        THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start;
  `;
  const row = rows[0] as unknown as { count: number; window_start: string };
  const allowed = row.count <= limit;
  const resetAt = new Date(row.window_start).getTime() + windowMs;
  const retryAfterMs = allowed ? 0 : Math.max(0, resetAt - Date.now());
  return { allowed, retryAfterMs };
}

// Dipakai saat login BERHASIL, supaya percobaan sebelumnya (mis. salah
// ketik sandi beberapa kali) tidak terus menghitung ke arah lockout
// setelah pengguna akhirnya berhasil masuk dengan benar.
export async function resetRateLimit(key: string): Promise<void> {
  await sql`DELETE FROM rate_limits WHERE key = ${key};`;
}

// ---- Ganti kata sandi (WSTG-ATHN-08) ----
export async function updateAdminPassword(username: string, passwordHash: string): Promise<void> {
  await sql`UPDATE admins SET password_hash = ${passwordHash} WHERE username = ${username};`;
}