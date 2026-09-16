import postgres from "postgres";
import { createHash } from "crypto";

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
  email: string;
  created_at: string;
}

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

  // Email dipakai untuk mengirim kode OTP (mis. sebelum ganti kata sandi).
  // Nullable di level kolom supaya tidak merusak baris admin lama yang
  // dibuat sebelum kolom ini ada - tapi endpoint setup/register SEKARANG
  // mewajibkan email diisi untuk akun BARU. Admin lama yang belum punya
  // email perlu diisi manual sekali lewat query database:
  //   UPDATE admins SET email = 'nama@contoh.com' WHERE username = '...';
  await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email TEXT;`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS admins_email_unique ON admins (email) WHERE email IS NOT NULL;`;

  await sql`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // WSTG-SESS-06: sesi sebelumnya cuma token HMAC stateless (tidak tercatat
  // di server), jadi logout hanya menghapus cookie di browser -- token yang
  // sudah beredar (dicuri, atau device lupa logout) tetap SAH sampai
  // kedaluwarsa 8 jam kemudian, tidak ada cara mencabutnya paksa. Tabel ini
  // menyimpan HASH dari setiap sesi yang diterbitkan; getSession() sekarang
  // mengecek keberadaan barisnya di sini juga (bukan cuma tanda tangan HMAC).
  // Logout / ganti password menghapus baris terkait -> sesi lama langsung
  // mati walau token fisiknya belum kedaluwarsa.
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

export async function createSessionRecord(tokenHash: string, username: string, expiresAt: Date): Promise<void> {
  await sql`
    INSERT INTO sessions (token_hash, username, expires_at)
    VALUES (${tokenHash}, ${username}, ${expiresAt.toISOString()}::timestamptz)
    ON CONFLICT (token_hash) DO NOTHING;
  `;
  // Bersihkan sesi kedaluwarsa milik user ini sekalian, biar tabel tidak
  // membengkak tanpa perlu cron job terpisah.
  await sql`DELETE FROM sessions WHERE username = ${username} AND expires_at <= now();`;
}

export async function isSessionRevoked(tokenHash: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM sessions WHERE token_hash = ${tokenHash} AND expires_at > now();
  `;
  return rows.length === 0;
}

export async function deleteSessionRecord(tokenHash: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash};`;
}

/** Cabut SEMUA sesi aktif milik satu username sekaligus (dipakai saat ganti password). */
export async function deleteAllSessionsForUser(username: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE username = ${username};`;
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
  email: string;
}): Promise<Admin> {
  const rows = await sql`
    INSERT INTO admins (username, password_hash, nama, initials, email)
    VALUES (${input.username}, ${input.password_hash}, ${input.nama}, ${input.initials}, ${input.email})
    RETURNING *;
  `;
  return rows[0] as unknown as Admin;
}

/**
 * Mengganti password_hash admin berdasarkan username. Dipakai oleh
 * /api/admin/change-password (WSTG-ATHN-08) - endpoint itu sendiri yang
 * sudah memverifikasi kata sandi lama sebelum memanggil fungsi ini.
 */
export async function updateAdminPassword(username: string, passwordHash: string): Promise<void> {
  await sql`UPDATE admins SET password_hash = ${passwordHash} WHERE username = ${username};`;
}

// ===== Kode OTP email (WSTG-ATHN-08 - proteksi tambahan untuk ganti password) =====

const OTP_TTL_MS = 10 * 60 * 1000; // kode berlaku 10 menit
const OTP_MAX_ATTEMPTS = 5; // maksimal 5x salah tebak per kode

/**
 * Membuat kode OTP 6 digit baru untuk satu admin + tujuan (purpose) tertentu
 * (mis. "change_password"). Kode OTP lama milik admin+purpose yang sama
 * otomatis dianggap tidak berlaku lagi, supaya cuma kode PALING BARU yang
 * aktif.
 *
 * Yang disimpan ke database HANYA hash-nya (SHA-256, dicampur dengan
 * admin_id+purpose supaya hash terikat konteksnya) - kode mentahnya
 * dikembalikan sekali di sini untuk dikirim lewat email.
 */
export async function createOtpCode(adminId: number, purpose: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digit: 100000-999999
  const codeHash = createHash("sha256").update(`${adminId}:${purpose}:${code}`).digest("hex");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await sql.begin(async (tx) => {
    await tx`
      DELETE FROM otp_codes
      WHERE admin_id = ${adminId} AND purpose = ${purpose} AND used_at IS NULL;
    `;
    await tx`
      INSERT INTO otp_codes (admin_id, purpose, code_hash, expires_at)
      VALUES (${adminId}, ${purpose}, ${codeHash}, ${expiresAt}::timestamptz);
    `;
  });

  return code;
}

export type OtpVerifyResult = "ok" | "invalid" | "expired_or_used" | "too_many_attempts";

/**
 * Memverifikasi kode OTP yang dimasukkan user. Kalau kodenya BENAR, langsung
 * ditandai used_at (satu kode cuma bisa sukses dipakai sekali). Kalau SALAH,
 * attempts bertambah - setelah OTP_MAX_ATTEMPTS kali salah, kode itu
 * dianggap habis (harus minta kode baru), supaya tidak bisa ditebak dengan
 * mencoba semua 900.000 kemungkinan 6 digit.
 */
export async function verifyOtpCode(
  adminId: number,
  purpose: string,
  rawCode: string
): Promise<OtpVerifyResult> {
  const codeHash = createHash("sha256").update(`${adminId}:${purpose}:${rawCode}`).digest("hex");

  return sql.begin(async (tx) => {
    const rows = await tx`
      SELECT id, code_hash, attempts FROM otp_codes
      WHERE admin_id = ${adminId} AND purpose = ${purpose} AND used_at IS NULL AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE;
    `;
    const row = rows[0];
    if (!row) return "expired_or_used";
    if (row.attempts >= OTP_MAX_ATTEMPTS) return "too_many_attempts";

    if (row.code_hash !== codeHash) {
      await tx`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${row.id};`;
      return "invalid";
    }

    await tx`UPDATE otp_codes SET used_at = now() WHERE id = ${row.id};`;
    return "ok";
  });
}