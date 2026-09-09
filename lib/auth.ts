import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

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

// Aturan username: 4-32 karakter, hanya huruf kecil, angka, titik,
// underscore, dan tanda hubung. Menutup celah username 1 karakter atau
// isi simbol aneh yang lolos begitu saja sebelumnya (WSTG-IDNT-04).
const USERNAME_PATTERN = /^[a-z0-9._-]+$/;
const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 32;

export type UsernameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateUsername(raw: string): UsernameValidation {
  const value = String(raw ?? "").trim().toLowerCase();

  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username harus ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} karakter.`,
    };
  }
  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Username hanya boleh berisi huruf kecil, angka, titik (.), underscore (_), atau tanda hubung (-).",
    };
  }
  return { ok: true, value };
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

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const secret = requireSessionSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSession(): SessionPayload | null {
  return verifySessionToken(cookies().get("admin_session")?.value);
}