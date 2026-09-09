"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
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

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD

    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username dan kata sandi wajib diisi." }, { status: 400 });
    }
    // Batas panjang input, supaya orang tidak bisa mengirim string raksasa
    // (mis. jutaan karakter) untuk memicu scrypt memproses payload besar
    // secara berulang-ulang (DoS pada CPU/memori server).
    if (String(username).length > 100 || String(password).length > 200) {
      return NextResponse.json({ error: "Username atau kata sandi terlalu panjang." }, { status: 400 });
    }

    const admin = await getAdminByUsername(String(username).trim().toLowerCase());
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    }

    const token = createSessionToken({
      username: admin.username,
      name: admin.nama,
      initials: admin.initials,
      exp: Date.now() + 1000 * 60 * 60 * 8,
    });

    const res = NextResponse.json({ ok: true, nama: admin.nama, initials: admin.initials });
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 jam
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal masuk. Coba lagi." }, { status: 500 });
=======
>>>>>>> 69c12d67d8cf2038688a86594020f80e7fbb56ed
  }

  return (
    <main className="min-h-screen bg-[#0E1830] flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gold-light/20 bg-white/95 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur"
      >
        <p className="font-serif text-2xl text-navy">Buku Tamu Sudin Pendidikan</p>
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