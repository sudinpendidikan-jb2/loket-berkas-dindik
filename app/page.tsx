"use client";

import { useEffect, useState } from "react";
import { KEPERLUAN_OPTIONS } from "@/lib/constants";
import { MonasBackdrop, AgencyLogos } from "@/components/brand";

const MUTASI_KEPERLUAN = ["Mutasi masuk siswa", "Mutasi keluar siswa"];

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
  nama_siswa: "",
  sekolah_asal: "",
  sekolah_tujuan: "",
  catatan: "",
};

export default function GuestFormPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestResult | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "keperluan" && !MUTASI_KEPERLUAN.includes(value)) {
        next.nama_siswa = "";
        next.sekolah_asal = "";
        next.sekolah_tujuan = "";
      }
      return next;
    });
  }

  const isMutasi = MUTASI_KEPERLUAN.includes(form.keperluan);

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

      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-12 pt-24 sm:pt-28 md:pb-16 md:pt-28">
        <header className="absolute left-6 top-6 z-20 flex items-center gap-3 text-paper sm:left-8 sm:top-8 sm:gap-4">
          <AgencyLogos />
          <div className="hidden h-9 w-px bg-paper/20 sm:block" />
          <div>
            <p className="font-serif text-lg leading-snug">Dinas Pendidikan</p>
            <p className="text-sm text-paper/60 leading-snug">Buku Tamu Digital</p>
          </div>
        </header>

        <div className="grid gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="text-paper md:pt-4">
            <h1 className="font-serif text-2xl leading-tight sm:text-3xl md:text-4xl">
              Daftar Kunjungan Tamu Suku Dinas Pendidikan Wilayah II Kota Administrasi Jakarta Barat
            </h1>
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

              {isMutasi && (
                <div className="space-y-5 border-t border-dashed border-line pt-5">
                  <p className="text-sm font-medium text-navy">
                    Detail siswa <span className="font-normal text-ink/50">(khusus urusan mutasi)</span>
                  </p>

                  <Field label="Nama siswa yang diurus">
                    <input
                      required
                      value={form.nama_siswa}
                      onChange={(e) => update("nama_siswa", e.target.value)}
                      className="input"
                      placeholder="Nama siswa"
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Sekolah asal">
                      <input
                        required
                        value={form.sekolah_asal}
                        onChange={(e) => update("sekolah_asal", e.target.value)}
                        className="input"
                        placeholder="Sekolah asal siswa"
                      />
                    </Field>

                    <Field label="Sekolah tujuan">
                      <input
                        required
                        value={form.sekolah_tujuan}
                        onChange={(e) => update("sekolah_tujuan", e.target.value)}
                        className="input"
                        placeholder="Sekolah tujuan siswa"
                      />
                    </Field>
                  </div>
                </div>
              )}

              <Field label="Keterangan tambahan (opsional)">
                <textarea
                  value={form.catatan}
                  onChange={(e) => update("catatan", e.target.value)}
                  className="input min-h-20 resize-none"
                  placeholder="Hal lain yang perlu diketahui petugas"
                />
              </Field>

              <Field label="Jam masuk">
                <div className="input flex items-center justify-between bg-paper/60 text-ink/70">
                  <span>
                    {now.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "medium" })}
                  </span>
                  <span className="text-xs text-ink/40">otomatis</span>
                </div>
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
