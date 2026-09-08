import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// SESSION_SECRET dipakai untuk menandatangani cookie sesi admin, supaya
// orang lain tidak bisa memalsukan cookie tanpa tahu secret ini.
// Set di Vercel Environment Variables (string acak, minimal 32 karakter).
//
// PENTING: sengaja TIDAK diberi default kosong. Kalau env var ini lupa
// di-set, aplikasi harus gagal jelas saat start, bukan diam-diam pakai
// kunci HMAC kosong yang bisa ditebak siapa saja (celah pemalsuan sesi).
const SESSION_SECRET = requireSessionSecret();

function requireSessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.trim().length < 32) {
    throw new Error(
      "SESSION_SECRET belum diset atau kurang dari 32 karakter. " +
        "Set env var SESSION_SECRET (contoh: `openssl rand -hex 32`) sebelum menjalankan aplikasi."
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
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
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
