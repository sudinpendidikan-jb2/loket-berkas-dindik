"use client";

import { useState } from "react";
import { BIDANG_OPTIONS, KEPERLUAN_OPTIONS } from "@/lib/constants";

interface TicketResult {
  queue_number: string;
  nama: string;
  bidang_tujuan: string;
  created_at: string;
}

const initialForm = {
  nama: "",
  asal_instansi: "",
  no_hp: "",
  keperluan: KEPERLUAN_OPTIONS[0],
  bidang_tujuan: BIDANG_OPTIONS[0],
  nama_petugas: "",
  catatan: "",
};

export default function GuestFormPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketResult | null>(null);

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

      setTicket(data.guest);
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ticket) {
    return <TicketView ticket={ticket} onReset={() => { setTicket(null); setForm(initialForm); }} />;
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-navy text-paper">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center gap-3">
          <StampMark />
          <div>
            <p className="font-serif text-lg leading-tight">Dinas Pendidikan</p>
            <p className="text-sm text-paper/70 leading-tight">Loket Layanan Berkas</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="md:pt-2">
          <h1 className="font-serif text-4xl leading-tight text-navy">
            Ambil nomor antrian sebelum ke loket.
          </h1>
          <p className="mt-4 text-ink/80 leading-relaxed max-w-sm">
            Isi data di samping untuk mencatat kunjungan Anda. Setelah selesai,
            Anda akan mendapat nomor antrian — tunjukkan ke petugas saat dipanggil.
          </p>

          <dl className="mt-10 space-y-4 max-w-sm">
            <div className="flex gap-3 border-t border-line pt-4">
              <dt className="font-serif text-navy w-8 shrink-0">1</dt>
              <dd className="text-ink/80 text-sm leading-relaxed">Isi formulir dengan data yang sesuai KTP / surat tugas.</dd>
            </div>
            <div className="flex gap-3 border-t border-line pt-4">
              <dt className="font-serif text-navy w-8 shrink-0">2</dt>
              <dd className="text-ink/80 text-sm leading-relaxed">Simpan atau tunjukkan nomor antrian dari layar ini.</dd>
            </div>
            <div className="flex gap-3 border-t border-line pt-4 border-b pb-4">
              <dt className="font-serif text-navy w-8 shrink-0">3</dt>
              <dd className="text-ink/80 text-sm leading-relaxed">Tunggu nomor Anda dipanggil oleh petugas bidang terkait.</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded p-6 sm:p-8">
          <p className="font-serif text-xl text-navy mb-6">Data Kunjungan</p>

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

            <Field label="Asal instansi / sekolah">
              <input
                required
                value={form.asal_instansi}
                onChange={(e) => update("asal_instansi", e.target.value)}
                className="input"
                placeholder="Contoh: SDN 02 Menteng"
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

            <Field label="Keperluan">
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

            <Field label="Bidang yang dituju">
              <select
                value={form.bidang_tujuan}
                onChange={(e) => update("bidang_tujuan", e.target.value)}
                className="input"
              >
                {BIDANG_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>

            <Field label="Nama petugas yang dituju (opsional)">
              <input
                value={form.nama_petugas}
                onChange={(e) => update("nama_petugas", e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Catatan (opsional)">
              <textarea
                value={form.catatan}
                onChange={(e) => update("catatan", e.target.value)}
                className="input min-h-20 resize-none"
                placeholder="Detail berkas atau keperluan tambahan"
              />
            </Field>
          </div>

          {error && (
            <p className="mt-4 text-sm text-rust border-l-2 border-rust pl-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-8 w-full bg-navy text-paper font-medium py-3 rounded hover:bg-navy-light transition-colors disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Ambil nomor antrian"}
          </button>
        </form>
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
      <span className="block text-sm text-ink/70 mb-1.5">{label}</span>
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

function TicketView({ ticket, onReset }: { ticket: TicketResult; onReset: () => void }) {
  const time = new Date(ticket.created_at).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="bg-navy text-paper rounded overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <p className="text-sm text-paper/70">Nomor Antrian Anda</p>
            <p className="font-serif text-7xl mt-2 tracking-tight">{ticket.queue_number}</p>
          </div>
          <div className="border-t border-dashed border-gold-light/50 mx-8" />
          <div className="px-8 py-6 text-sm space-y-2">
            <Row label="Nama" value={ticket.nama} />
            <Row label="Bidang tujuan" value={ticket.bidang_tujuan} />
            <Row label="Waktu" value={time} />
          </div>
        </div>

        <p className="mt-6 text-center text-ink/70 text-sm leading-relaxed">
          Simpan halaman ini dan tunggu nomor Anda dipanggil petugas.
        </p>

        <button
          onClick={onReset}
          className="mt-6 w-full border border-navy text-navy font-medium py-3 rounded hover:bg-navy hover:text-paper transition-colors"
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
