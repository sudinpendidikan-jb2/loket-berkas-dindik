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

export async function ensureSchema() {
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
