"use client";

import { useState } from "react";
import { KEPERLUAN_OPTIONS } from "@/lib/constants";

interface GuestResult {
  nama: string;
  asal_instansi: string;
  created_at: string;
}

const initialForm = {
  nama: "",
  asal_instansi: "",
  no_hp: "",
  keperluan: KEPERLUAN_OPTIONS[0],
  catatan: "",
};

export default function GuestFormPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestResult | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan data.");
        return;
      }

      setResult(data.guest);
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ConfirmationView
        result={result}
        onReset={() => {
          setResult(null);
          setForm(initialForm);
        }}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1830]">
      <MonasBackdrop />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 md:py-16">
        <header className="flex items-center gap-3 text-paper">
          <StampMark />
          <div>
            <p className="font-serif text-lg leading-tight">Dinas Pendidikan</p>
            <p className="text-sm text-paper/60 leading-tight">Buku Tamu Digital</p>
          </div>
        </header>

        <div className="mt-14 grid gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:mt-20">
          <div className="text-paper md:pt-4">
            <p className="text-sm tracking-wide text-gold-light/90">Selamat datang</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight md:text-[2.75rem]">
              Silakan catat kunjungan Anda.
            </h1>
            <p className="mt-4 max-w-sm leading-relaxed text-paper/70">
              Isi data di samping sebelum menunggu dipanggil petugas. Waktu
              kedatangan Anda tercatat otomatis begitu formulir dikirim.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-gold-light/20 bg-white/95 p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8"
          >
            <p className="mb-6 font-serif text-xl text-navy">Data Kunjungan</p>

            <div className="space-y-5">
              <Field label="Nama lengkap">
                <input
                  required
                  value={form.nama}
                  onChange={(e) => update("nama", e.target.value)}
                  className="input"
                  placeholder="Sesuai KTP"
                />
              </Field>

              <Field label="Nomor HP / WhatsApp">
                <input
                  required
                  value={form.no_hp}
                  onChange={(e) => update("no_hp", e.target.value)}
                  className="input"
                  placeholder="08xxxxxxxxxx"
                  type="tel"
                />
              </Field>

              <Field label="Asal instansi / sekolah">
                <input
                  required
                  value={form.asal_instansi}
                  onChange={(e) => update("asal_instansi", e.target.value)}
                  className="input"
                  placeholder="Contoh: SDN 02 Menteng"
                />
              </Field>

              <Field label="Keperluan kunjungan">
                <select
                  value={form.keperluan}
                  onChange={(e) => update("keperluan", e.target.value)}
                  className="input"
                >
                  {KEPERLUAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>

              <Field label="Keterangan tambahan (opsional)">
                <textarea
                  value={form.catatan}
                  onChange={(e) => update("catatan", e.target.value)}
                  className="input min-h-20 resize-none"
                  placeholder="Hal lain yang perlu diketahui petugas"
                />
              </Field>
            </div>

            {error && (
              <p className="mt-4 border-l-2 border-rust pl-3 text-sm text-rust">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full rounded bg-navy py-3 font-medium text-paper transition-colors hover:bg-navy-light disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Kirim data kunjungan"}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #DAD5C8;
          border-radius: 4px;
          padding: 0.6rem 0.75rem;
          background: white;
          color: #201F1D;
        }
        .input:focus {
          border-color: #1B2A4A;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink/70">{label}</span>
      {children}
    </label>
  );
}

function StampMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="17" cy="17" r="15.5" stroke="#D9AE6E" strokeWidth="1.5" strokeDasharray="2 3" />
      <path d="M11 18.5L15 22L23 12" stroke="#D9AE6E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Latar siluet Monas dengan langit senja navy-emas — dibuat sebagai SVG asli, bukan foto. */
function MonasBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A1226" />
            <stop offset="55%" stopColor="#152443" />
            <stop offset="100%" stopColor="#1B2A4A" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="38%" r="55%">
            <stop offset="0%" stopColor="#D9AE6E" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#D9AE6E" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#D9AE6E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F1D28E" />
            <stop offset="100%" stopColor="#B8863A" />
          </linearGradient>
        </defs>

        <rect width="1200" height="800" fill="url(#sky)" />
        <rect width="1200" height="800" fill="url(#glow)" />

        {/* bintang */}
        {[
          [120, 90], [260, 150], [340, 60], [520, 110], [700, 70],
          [860, 140], [980, 90], [1080, 180], [180, 220], [980, 240],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.6 : 1} fill="#F4F1EA" opacity="0.55" />
        ))}

        {/* siluet gedung kota, biar konteksnya Jakarta */}
        <g fill="#0F1B36">
          <rect x="60" y="600" width="60" height="200" />
          <rect x="140" y="560" width="45" height="240" />
          <rect x="960" y="580" width="50" height="220" />
          <rect x="1040" y="620" width="70" height="180" />
          <rect x="1000" y="540" width="35" height="260" />
        </g>

        {/* Monas: dasar, tugu, dan lidah api emas */}
        <g fill="#0F1B36">
          <rect x="520" y="700" width="160" height="30" rx="2" />
          <rect x="540" y="660" width="120" height="42" />
          <polygon points="565,660 635,660 615,300 585,300" />
        </g>
        <polygon points="588,300 612,300 605,255 595,255" fill="url(#flame)" />
      </svg>
    </div>
  );
}

function ConfirmationView({ result, onReset }: { result: GuestResult; onReset: () => void }) {
  const time = new Date(result.created_at).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0E1830] px-6 py-16">
      <MonasBackdrop />

      <div className="relative z-10 w-full max-w-sm">
        <div className="overflow-hidden rounded-lg border border-gold-light/20 bg-navy/90 text-paper shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur">
          <div className="px-8 pb-6 pt-8 text-center">
            <p className="text-sm text-paper/70">Terima kasih, kunjungan Anda tercatat</p>
            <p className="mt-2 font-serif text-2xl leading-snug">{result.nama}</p>
          </div>
          <div className="mx-8 border-t border-dashed border-gold-light/40" />
          <div className="space-y-2 px-8 py-6 text-sm">
            <Row label="Instansi" value={result.asal_instansi} />
            <Row label="Jam masuk" value={time} />
          </div>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-paper/70">
          Silakan tunggu di area loket sampai nama Anda dipanggil petugas.
        </p>

        <button
          onClick={onReset}
          className="mt-6 w-full rounded border border-paper/40 py-3 font-medium text-paper transition-colors hover:bg-paper hover:text-navy"
        >
          Catat kunjungan lain
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-paper/60">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
