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
  queue_number: string;
  nama: string;
  asal_instansi: string;
  no_hp: string;
  keperluan: string;
  bidang_tujuan: string;
  nama_petugas: string | null;
  catatan: string | null;
  status: GuestStatus;
  created_at: string;
}

export async function ensureSchema() {
  await sql`
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
  `;
}

const BIDANG_PREFIX: Record<string, string> = {
  Sekretariat: "S",
  "PAUD dan Dikdas": "D",
  "Pendidikan Menengah": "M",
  "Guru dan Tenaga Kependidikan": "G",
  Kebudayaan: "K",
  Lainnya: "L",
};

export async function nextQueueNumber(bidangTujuan: string): Promise<string> {
  const prefix = BIDANG_PREFIX[bidangTujuan] ?? "U";
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM guests
    WHERE created_at::date = CURRENT_DATE
      AND bidang_tujuan = ${bidangTujuan};
  `;
  const count = rows[0]?.count ?? 0;
  const nextNumber = String(count + 1).padStart(3, "0");
  return `${prefix}-${nextNumber}`;
}

export async function insertGuest(input: {
  nama: string;
  asal_instansi: string;
  no_hp: string;
  keperluan: string;
  bidang_tujuan: string;
  nama_petugas?: string;
  catatan?: string;
}): Promise<Guest> {
  const queueNumber = await nextQueueNumber(input.bidang_tujuan);
  const rows = await sql`
    INSERT INTO guests (queue_number, nama, asal_instansi, no_hp, keperluan, bidang_tujuan, nama_petugas, catatan)
    VALUES (
      ${queueNumber},
      ${input.nama},
      ${input.asal_instansi},
      ${input.no_hp},
      ${input.keperluan},
      ${input.bidang_tujuan},
      ${input.nama_petugas ?? null},
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
        OR queue_number ILIKE '%' || ${q ?? null}::text || '%'
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
