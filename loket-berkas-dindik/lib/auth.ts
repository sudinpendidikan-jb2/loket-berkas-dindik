import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { createSessionRecord, isSessionRevoked, deleteSessionRecord, deleteAllSessionsForUser } from "@/lib/db";

// Batas panjang kata sandi - dipakai bersama oleh /api/admin/login,
// /api/admin/change-password, dll, supaya aturannya konsisten di satu
// tempat. MAX di sini disamakan dengan batas yang sudah dipakai di
// /api/admin/login (mencegah payload password raksasa membebani scrypt -
// WSTG-ATHN-07); MIN mengikuti kebijakan kata sandi minimal 8 karakter.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;


// SESSION_SECRET dipakai untuk menandatangani cookie sesi admin, supaya
// orang lain tidak bisa memalsukan cookie tanpa tahu secret ini.
// Set di Vercel Environment Variables (string acak, minimal 32 karakter),
// misalnya lewat: openssl rand -hex 32
//
// PENTING: pengecekan ini sengaja dibuat "lazy" (baru jalan saat fungsi di
// bawah dipanggil), BUKAN dijalankan langsung saat file ini di-import.
// Kalau dijalankan saat import, proses `next build` di Vercel akan ikut
// meng-import file ini untuk mengumpulkan data halaman — dan build akan
// gagal walau env var-nya sudah benar di runtime, karena env var belum
// tentu tersedia di tahap build. Dengan lazy check, build tetap jalan,
// tapi aplikasi tetap menolak berjalan (error jelas) kalau secret belum
// diset saat benar-benar dipakai untuk membuat/verifikasi sesi.
function requireSessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.trim().length < 32) {
    throw new Error(
      "SESSION_SECRET belum diset atau kurang dari 32 karakter. " +
        "Set env var SESSION_SECRET (contoh: `openssl rand -hex 32`) di Environment Variables."
    );
  }
  return value;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, 64);
  if (candidate.length !== hashBuffer.length) return false;
  return timingSafeEqual(candidate, hashBuffer);
}

export interface SessionPayload {
  username: string;
  name: string;
  initials: string;
  exp: number;
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const secret = requireSessionSecret();
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function tokenHash(token: string): string {
  // Simpan HASH token di DB, bukan token mentahnya - kalau baris tabel
  // sessions ini bocor (mis. lewat backup DB), penyerang tetap tidak bisa
  // memakainya langsung sebagai cookie sesi.
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Terbitkan sesi baru: buat token bertanda tangan HMAC seperti sebelumnya,
 * DAN catat hash-nya di tabel sessions supaya bisa dicabut lewat logout /
 * ganti password (WSTG-SESS-06). Dipanggil dari login, setup, dan register.
 */
export async function issueSession(payload: SessionPayload): Promise<string> {
  const token = createSessionToken(payload);
  await createSessionRecord(tokenHash(token), payload.username, new Date(payload.exp));
  return token;
}

/** Cabut satu sesi (dipakai oleh /api/admin/logout). */
export async function revokeSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await deleteSessionRecord(tokenHash(token));
}

/** Cabut semua sesi milik satu akun (dipakai setelah ganti password). */
export async function revokeAllSessions(username: string): Promise<void> {
  await deleteAllSessionsForUser(username);
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const secret = requireSessionSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
  } catch {
    return null;
  }

  // Tanda tangan valid & belum kedaluwarsa secara waktu, tapi tetap cek ke
  // DB: kalau baris sesinya sudah dihapus (logout / ganti password / dicabut
  // manual), tolak walau HMAC-nya cocok. Ini yang menutup WSTG-SESS-06.
  if (await isSessionRevoked(tokenHash(token))) return null;

  return payload;
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySessionToken(cookies().get("admin_session")?.value);
}