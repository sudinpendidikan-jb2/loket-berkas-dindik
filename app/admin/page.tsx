"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAdmins, setHasAdmins] = useState(true);

  useEffect(() => {
    fetch("/api/admin/status")
      .then((res) => res.json())
      .then((data) => setHasAdmins(Boolean(data.hasAdmins)))
      .catch(() => setHasAdmins(true))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <p className="text-ink/50 text-sm">Memuat...</p>
      </main>
    );
  }

  return hasAdmins ? (
    <LoginForm onSuccess={() => { router.push("/admin/dashboard"); router.refresh(); }} />
  ) : (
    <SetupForm onSuccess={() => { router.push("/admin/dashboard"); router.refresh(); }} />
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
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-line rounded p-8">
        <p className="font-serif text-2xl text-navy">Panel Petugas</p>
        <p className="text-sm text-ink/60 mt-1 mb-6">Masuk untuk mengelola daftar tamu.</p>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm text-ink/70 mb-1.5">Username</span>
            <input
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-line rounded px-3 py-2.5 focus:border-navy"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-ink/70 mb-1.5">Kata sandi</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded px-3 py-2.5 focus:border-navy"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-navy text-paper font-medium py-2.5 rounded hover:bg-navy-light transition-colors disabled:opacity-60"
        >
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </main>
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
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-line rounded p-8">
        <p className="font-serif text-2xl text-navy">Buat Akun Petugas Pertama</p>
        <p className="text-sm text-ink/60 mt-1 mb-6">
          Belum ada akun petugas. Buat akun pertama untuk mulai mengelola dashboard.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm text-ink/70 mb-1.5">Nama lengkap</span>
            <input
              required
              autoFocus
              value={form.nama}
              onChange={(e) => update("nama", e.target.value)}
              className="w-full border border-line rounded px-3 py-2.5 focus:border-navy"
              placeholder="Contoh: Ilyas Maulana"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-ink/70 mb-1.5">Inisial singkat (untuk jejak status)</span>
            <input
              required
              maxLength={4}
              value={form.initials}
              onChange={(e) => update("initials", e.target.value.toUpperCase())}
              className="w-full border border-line rounded px-3 py-2.5 focus:border-navy uppercase"
              placeholder="Contoh: YAS"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-ink/70 mb-1.5">Username</span>
            <input
              required
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              className="w-full border border-line rounded px-3 py-2.5 focus:border-navy"
            />
          </label>

          <label className="block">
            <span className="block text-sm text-ink/70 mb-1.5">Kata sandi (minimal 6 karakter)</span>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full border border-line rounded px-3 py-2.5 focus:border-navy"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-rust">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-navy text-paper font-medium py-2.5 rounded hover:bg-navy-light transition-colors disabled:opacity-60"
        >
          {loading ? "Membuat akun..." : "Buat akun & masuk"}
        </button>
      </form>
    </main>
  );
}
