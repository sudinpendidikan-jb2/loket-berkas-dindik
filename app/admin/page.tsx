"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
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
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal masuk.");
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
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

        <label className="block">
          <span className="block text-sm text-ink/70 mb-1.5">Kata sandi</span>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line rounded px-3 py-2.5 focus:border-navy"
          />
        </label>

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
