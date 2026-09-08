"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonasBackdrop, AgencyLogos } from "@/components/brand";

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAdmins, setHasAdmins] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/status")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Gagal memuat status (mis. koneksi DB sempat bermasalah) — JANGAN
          // anggap belum ada admin. Default ke form login supaya tidak
          // memicu "buat akun pertama" secara keliru saat admin sudah ada.
          throw new Error(data.error ?? "Gagal memuat status.");
        }
        setHasAdmins(Boolean(data.hasAdmins));
      })
      .catch((err) => {
        setHasAdmins(true);
        setStatusError(err.message ?? "Gagal memuat status.");
      })
      .finally(() => setChecking(false));
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1830] flex items-center justify-center px-6 py-16">
      <MonasBackdrop />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-paper text-center">
          <AgencyLogos />
          <div>
            <p className="font-serif text-lg leading-tight">Dinas Pendidikan</p>
            <p className="text-sm text-paper/60 leading-tight">Buku Tamu Digital</p>
          </div>
        </div>

        {checking ? (
          <div className="rounded-lg border border-gold-light/20 bg-white/95 p-8 text-center text-sm text-ink/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur">
            Memuat...
          </div>
        ) : (
          <>
            {statusError && (
              <p className="mb-3 rounded border-l-2 border-rust bg-white/90 px-3 py-2 text-sm text-rust">
                Gagal mengecek status akun ({statusError}). Menampilkan form login.
              </p>
            )}
            {hasAdmins ? (
              <LoginForm onSuccess={() => { router.push("/admin/dashboard"); router.refresh(); }} />
            ) : (
              <SetupForm onSuccess={() => { router.push("/admin/dashboard"); router.refresh(); }} />
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .admin-input {
          width: 100%;
          border: 1px solid #DAD5C8;
          border-radius: 4px;
          padding: 0.6rem 0.75rem;
          background: white;
          color: #201F1D;
        }
        .admin-input:focus {
          border-color: #1B2A4A;
        }
      `}</style>
    </main>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal masuk.");
        return;
      }
      onSuccess();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gold-light/20 bg-white/95 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur"
    >
      <p className="font-serif text-2xl text-navy">Panel Petugas</p>
      <p className="mt-1 mb-6 text-sm text-ink/60">Masuk untuk mengelola daftar tamu.</p>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Username</span>
          <input
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Kata sandi</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
          />
        </label>
      </div>

      {error && <p className="mt-3 border-l-2 border-rust pl-3 text-sm text-rust">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded bg-navy py-2.5 font-medium text-paper transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {loading ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}

function SetupForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ nama: "", initials: "", username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat akun.");
        return;
      }
      onSuccess();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gold-light/20 bg-white/95 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur"
    >
      <p className="font-serif text-2xl text-navy">Buat Akun Petugas Pertama</p>
      <p className="mt-1 mb-6 text-sm text-ink/60">
        Belum ada akun petugas. Buat akun pertama untuk mulai mengelola dashboard.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Nama lengkap</span>
          <input
            required
            autoFocus
            value={form.nama}
            onChange={(e) => update("nama", e.target.value)}
            className="admin-input"
            placeholder="Contoh: Ilyas Maulana"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Inisial singkat (untuk jejak status)</span>
          <input
            required
            maxLength={4}
            value={form.initials}
            onChange={(e) => update("initials", e.target.value.toUpperCase())}
            className="admin-input uppercase"
            placeholder="Contoh: YAS"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Username</span>
          <input
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            className="admin-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Kata sandi (minimal 8 karakter)</span>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="admin-input"
          />
        </label>
      </div>

      {error && <p className="mt-3 border-l-2 border-rust pl-3 text-sm text-rust">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded bg-navy py-2.5 font-medium text-paper transition-colors hover:bg-navy-light disabled:opacity-60"
      >
        {loading ? "Membuat akun..." : "Buat akun & masuk"}
      </button>
    </form>
  );
}
