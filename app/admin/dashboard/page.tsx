"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, KEPERLUAN_OPTIONS } from "@/lib/constants";
import type { Guest, GuestStatus } from "@/lib/db";
import { MonasBackdrop, AgencyLogos, PrintLetterhead } from "@/components/brand";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const BADGE_PALETTE = [
  "bg-rust/10 text-rust",
  "bg-gold/15 text-gold-dark",
  "bg-moss/10 text-moss",
  "bg-navy/10 text-navy",
];

function badgeClass(keperluan: string) {
  const idx = KEPERLUAN_OPTIONS.indexOf(keperluan);
  return BADGE_PALETTE[(idx < 0 ? 0 : idx) % BADGE_PALETTE.length];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ nama: string; initials: string } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [showAddPetugas, setShowAddPetugas] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setMe(data))
      .catch(() => router.push("/admin"));
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    if (q) params.set("q", q);

    const res = await fetch(`/api/guests?${params.toString()}`);
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    const data = await res.json();
    setGuests(data.guests ?? []);
    setLoading(false);
  }, [date, status, q, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: number, newStatus: GuestStatus) {
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, status: newStatus } : g)));
    const res = await fetch(`/api/guests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.guest) {
      setGuests((gs) => gs.map((g) => (g.id === id ? data.guest : g)));
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  const isToday = date === todayStr();
  const total = guests.length;
  const sedangDilayani = guests.filter((g) => g.status === "diproses").length;
  const selesaiDilayani = guests.filter((g) => g.status === "selesai").length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1830] py-10 print:bg-white print:py-0">
      <div className="print:hidden">
        <MonasBackdrop />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div className="rounded-lg border border-gold-light/20 bg-white/95 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-navy pb-6 print:hidden">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <AgencyLogos />
            <div className="hidden h-9 w-px bg-navy/15 sm:block" />
            <div>
              <p className="font-serif text-2xl leading-tight text-navy">Buku Tamu Sudin Pendidikan</p>
              <p className="text-sm text-ink/60 leading-tight">Dasbor petugas — pemantauan kehadiran tamu</p>
            </div>
          </div>

          <div className="text-right text-sm print:hidden">
            <p className="font-serif text-navy">
              {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-lg font-medium text-gold-dark">
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
            {me && (
              <div className="relative mt-1 inline-block text-left" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-ink/80 hover:border-navy/40 hover:text-navy"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-paper">
                    {me.initials}
                  </span>
                  <span className="font-medium">{me.nama}</span>
                  <svg
                    className={`h-3.5 w-3.5 text-ink/40 transition-transform ${showProfileMenu ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md border border-line bg-white py-1 shadow-lg">
                    <button
                      onClick={() => {
                        setShowAddPetugas((v) => !v);
                        setShowProfileMenu(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-navy/5"
                    >
                      Tambah petugas
                    </button>
                    <button
                      onClick={() => {
                        setShowChangePassword((v) => !v);
                        setShowProfileMenu(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-navy/5"
                    >
                      Ubah kata sandi
                    </button>
                    <div className="my-1 border-t border-line" />
                    <button
                      onClick={logout}
                      className="block w-full px-4 py-2 text-left text-sm text-rust hover:bg-rust/5"
                    >
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <PrintLetterhead
          reportTitle="Daftar Kehadiran"
          tanggalLabel={new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />

        {showAddPetugas && (
          <Modal title="Tambah petugas" onClose={() => setShowAddPetugas(false)}>
            <AddPetugasForm onDone={() => setShowAddPetugas(false)} />
          </Modal>
        )}

        {showChangePassword && (
          <Modal title="Ubah kata sandi" onClose={() => setShowChangePassword(false)}>
            <ChangePasswordForm onDone={() => setShowChangePassword(false)} />
          </Modal>
        )}

        <div className="mt-6 grid grid-cols-3 divide-x divide-line border border-line print:hidden">
          <StatCard value={total} label={isToday ? "Tamu hari ini" : "Tamu pada tanggal ini"} />
          <StatCard value={sedangDilayani} label="Sedang dilayani" />
          <StatCard value={selesaiDilayani} label="Selesai dilayani" />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="font-serif text-lg text-navy">Daftar Kehadiran</p>
          <p className="text-sm text-ink/50">
            {total} entri — {isToday ? "hari ini" : new Date(date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-line pb-5 print:hidden">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-line rounded px-2.5 py-1.5 text-sm"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 min-w-40 border border-line rounded px-2.5 py-1.5 text-sm"
            placeholder="Cari nama tamu, siswa, atau sekolah..."
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-line rounded px-2.5 py-1.5 text-sm"
          >
            <option value="">Semua status</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setDate(todayStr())}
            className="text-sm border border-line rounded px-3 py-1.5 hover:bg-navy hover:text-paper hover:border-navy transition-colors"
          >
            Hari ini
          </button>
          <a
            href={`/api/guests/export${date ? `?date=${date}` : ""}`}
            className="text-sm border border-navy text-navy rounded px-3 py-1.5 hover:bg-navy hover:text-paper transition-colors"
          >
            Unduh CSV
          </a>
          <button
            onClick={() => window.print()}
            className="text-sm border border-navy text-navy rounded px-3 py-1.5 hover:bg-navy hover:text-paper transition-colors"
          >
            Cetak PDF
          </button>
        </div>

        <div className="mt-4 divide-y divide-line">
          {loading && <p className="py-8 text-center text-sm text-ink/50">Memuat data...</p>}
          {!loading && guests.length === 0 && (
            <p className="py-8 text-center text-sm text-ink/50">Belum ada tamu pada filter ini.</p>
          )}
          {!loading && guests.map((g, i) => (
            <GuestRow key={g.id} guest={g} index={i + 1} onStatusChange={updateStatus} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink/40 print:mt-4">
          Data tersimpan otomatis dan dibagikan ke semua petugas yang membuka dasbor ini.
        </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, header button, .no-print { display: none !important; }
        }
      `}</style>
    </main>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-6 py-5 text-center">
      <p className="font-serif text-4xl text-navy">{value}</p>
      <p className="mt-1 text-sm text-ink/60">{label}</p>
    </div>
  );
}

function GuestRow({
  guest,
  index,
  onStatusChange,
}: {
  guest: Guest;
  index: number;
  onStatusChange: (id: number, status: GuestStatus) => void;
}) {
  const masuk = new Date(guest.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const keluar = guest.status === "selesai" && guest.status_updated_at
    ? new Date(guest.status_updated_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-serif text-navy">#{index} {guest.nama}</span>{" "}
          <span className="ml-1 text-ink/50">Masuk {masuk}</span>
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass(guest.keperluan)}`}>
            {guest.keperluan}
          </span>
          <span className="text-xs text-ink/60">
            <span className="font-medium text-ink/80">Instansi:</span> {guest.asal_instansi}{" "}
            <span className="font-medium text-ink/80">HP:</span> {guest.no_hp}
          </span>
        </div>

        {guest.nama_siswa && (
          <p className="mt-1 text-xs text-ink/60">
            <span className="font-medium text-ink/80">Siswa:</span> {guest.nama_siswa}{" "}
            <span className="font-medium text-ink/80">Dari:</span> {guest.sekolah_asal}{" "}
            <span className="font-medium text-ink/80">Ke:</span> {guest.sekolah_tujuan}
          </p>
        )}
        {guest.catatan && <p className="mt-1 text-xs italic text-ink/50">{guest.catatan}</p>}
      </div>

      <div className="text-right text-sm shrink-0">
        <select
          value={guest.status}
          onChange={(e) => onStatusChange(guest.id, e.target.value as GuestStatus)}
          className={`rounded px-2 py-1 text-xs border no-print ${
            guest.status === "selesai"
              ? "border-moss text-moss"
              : guest.status === "diproses"
              ? "border-gold-dark text-gold-dark"
              : "border-line text-ink/60"
          }`}
        >
          {Object.entries(STATUS_LABEL).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {keluar && (
          <p className="mt-1 text-xs text-ink/50">
            Keluar {keluar}
            {guest.status_updated_by && <span> oleh {guest.status_updated_by}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      {/* Backdrop - klik di luar kartu untuk menutup */}
      <div className="absolute inset-0 bg-navy-dark/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)]">
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <p className="font-serif text-lg text-navy">{title}</p>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 text-ink/40 hover:bg-navy/5 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddPetugasForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ nama: "", initials: "", username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah petugas.");
        return;
      }
      setSuccess(true);
      setForm({ nama: "", initials: "", username: "", password: "" });
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <input required placeholder="Nama lengkap" value={form.nama} onChange={(e) => update("nama", e.target.value)} className="border border-line rounded px-2.5 py-1.5 text-sm sm:col-span-2" />
      <input required maxLength={4} placeholder="Inisial (YAS)" value={form.initials} onChange={(e) => update("initials", e.target.value.toUpperCase())} className="border border-line rounded px-2.5 py-1.5 text-sm uppercase" />
      <input required placeholder="Username" value={form.username} onChange={(e) => update("username", e.target.value)} className="border border-line rounded px-2.5 py-1.5 text-sm" />
      <input required type="password" minLength={8} placeholder="Kata sandi" value={form.password} onChange={(e) => update("password", e.target.value)} className="border border-line rounded px-2.5 py-1.5 text-sm" />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={loading} className="bg-navy text-paper text-sm px-4 py-1.5 rounded hover:bg-navy-light disabled:opacity-60">
          {loading ? "Menyimpan..." : "Tambah petugas"}
        </button>
        {error && <span className="text-sm text-rust">{error}</span>}
        {success && <span className="text-sm text-moss">Petugas baru berhasil ditambahkan.</span>}
      </div>
    </form>
  );
}


function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengganti kata sandi.");
        return;
      }
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <input
        required
        type="password"
        placeholder="Kata sandi saat ini"
        value={form.currentPassword}
        onChange={(e) => update("currentPassword", e.target.value)}
        className="border border-line rounded px-2.5 py-1.5 text-sm"
      />
      <input
        required
        type="password"
        minLength={8}
        placeholder="Kata sandi baru"
        value={form.newPassword}
        onChange={(e) => update("newPassword", e.target.value)}
        className="border border-line rounded px-2.5 py-1.5 text-sm"
      />
      <input
        required
        type="password"
        minLength={8}
        placeholder="Ulangi kata sandi baru"
        value={form.confirmPassword}
        onChange={(e) => update("confirmPassword", e.target.value)}
        className="border border-line rounded px-2.5 py-1.5 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-navy text-paper text-sm px-4 py-1.5 rounded hover:bg-navy-light disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
      {error && <span className="text-sm text-rust">{error}</span>}
      {success && <span className="text-sm text-moss">Kata sandi berhasil diganti.</span>}
    </form>
  );
}