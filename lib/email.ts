// Kirim email lewat Resend (https://resend.com) pakai fetch langsung ke
// HTTP API mereka - tidak perlu tambah dependency SDK baru.
//
// Env var yang dibutuhkan (isi di Vercel Environment Variables):
// - RESEND_API_KEY   : API key dari dashboard Resend.
// - RESEND_FROM_EMAIL: alamat pengirim. Untuk testing, boleh pakai
//   "onboarding@resend.dev" (bawaan Resend, tanpa perlu verifikasi domain).
//   Untuk production, sebaiknya pakai alamat di domain sendiri yang sudah
//   diverifikasi di dashboard Resend.
//
// Pengecekan env var ini sengaja "lazy" (baru dicek saat fungsi dipanggil,
// bukan saat file di-import) supaya proses `next build` di Vercel tidak
// gagal gara-gara env var belum tersedia saat tahap build.
function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey) throw new Error("RESEND_API_KEY belum diset di Environment Variables.");
  if (!from) throw new Error("RESEND_FROM_EMAIL belum diset di Environment Variables.");
  return { apiKey, from };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const { apiKey, from } = getResendConfig();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gagal mengirim email lewat Resend (status ${res.status}): ${body}`);
  }
}

export async function sendOtpEmail(input: { to: string; nama: string; code: string }): Promise<void> {
  await sendEmail(
    input.to,
    "Kode verifikasi - Buku Tamu Digital",
    `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #201F1D;">
        <p>Halo ${escapeHtml(input.nama)},</p>
        <p>Kode verifikasi kamu untuk mengganti kata sandi:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1B2A4A; margin: 16px 0;">
          ${escapeHtml(input.code)}
        </p>
        <p style="font-size: 13px; color: #666;">
          Kode ini berlaku 10 menit. Kalau kamu tidak merasa meminta ini,
          abaikan saja email ini dan kata sandi kamu tidak akan berubah.
        </p>
      </div>
    `
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}