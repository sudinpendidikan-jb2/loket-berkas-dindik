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
  catatan: string | null;
  status: GuestStatus;
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
}

export async function insertGuest(input: {
  nama: string;
  asal_instansi: string;
  no_hp: string;
  keperluan: string;
  catatan?: string;
}): Promise<Guest> {
  const rows = await sql`
    INSERT INTO guests (nama, asal_instansi, no_hp, keperluan, catatan)
    VALUES (
      ${input.nama},
      ${input.asal_instansi},
      ${input.no_hp},
      ${input.keperluan},
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
      )
    ORDER BY created_at DESC;
  `;
  return rows as unknown as Guest[];
}

export async function updateGuestStatus(id: number, status: GuestStatus): Promise<Guest | null> {
  const rows = await sql`
    UPDATE guests SET status = ${status} WHERE id = ${id} RETURNING *;
  `;
  return (rows[0] as unknown as Guest) ?? null;
}

export async function getGuestById(id: number): Promise<Guest | null> {
  const rows = await sql`SELECT * FROM guests WHERE id = ${id};`;
  return (rows[0] as unknown as Guest) ?? null;
}
