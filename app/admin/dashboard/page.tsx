"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/lib/constants";
import type { Guest, GuestStatus } from "@/lib/db";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

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
    await fetch(`/api/guests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-navy text-paper">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="font-serif text-lg leading-tight">Buku Register Tamu</p>
            <p className="text-sm text-paper/70 leading-tight">Dinas Pendidikan — Loket Layanan Berkas</p>
          </div>
          <button onClick={logout} className="text-sm border border-paper/40 rounded px-3 py-1.5 hover:bg-navy-light transition-colors">
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end gap-4 pb-6 border-b border-line">
          <label className="text-sm">
            <span className="block text-ink/60 mb-1">Tanggal</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-line rounded px-2.5 py-1.5"
            />
          </label>

          <label className="text-sm">
            <span className="block text-ink/60 mb-1">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-line rounded px-2.5 py-1.5"
            >
              <option value="">Semua</option>
              {Object.entries(STATUS_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm flex-1 min-w-40">
            <span className="block text-ink/60 mb-1">Cari nama / instansi / no. antrian</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border border-line rounded px-2.5 py-1.5"
              placeholder="Ketik untuk mencari..."
            />
          </label>

          <a
            href={`/api/guests/export${date ? `?date=${date}` : ""}`}
            className="text-sm border border-navy text-navy rounded px-3 py-1.5 hover:bg-navy hover:text-paper transition-colors"
          >
            Unduh CSV
          </a>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-ink/60 border-b border-line">
                <th className="py-2 pr-4 font-medium">No.</th>
                <th className="py-2 pr-4 font-medium">Waktu</th>
                <th className="py-2 pr-4 font-medium">Nama</th>
                <th className="py-2 pr-4 font-medium">Instansi</th>
                <th className="py-2 pr-4 font-medium">Keperluan</th>
                <th className="py-2 pr-4 font-medium">Bidang</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="py-8 text-center text-ink/50">Memuat data...</td></tr>
              )}
              {!loading && guests.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-ink/50">Belum ada tamu pada filter ini.</td></tr>
              )}
              {!loading && guests.map((g) => (
                <tr key={g.id} className="border-b border-line/70 align-top">
                  <td className="py-3 pr-4 font-serif text-navy">{g.queue_number}</td>
                  <td className="py-3 pr-4 text-ink/70 whitespace-nowrap">
                    {new Date(g.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3 pr-4">{g.nama}</td>
                  <td className="py-3 pr-4 text-ink/70">{g.asal_instansi}</td>
                  <td className="py-3 pr-4 text-ink/70">{g.keperluan}</td>
                  <td className="py-3 pr-4 text-ink/70">{g.bidang_tujuan}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={g.status}
                      onChange={(e) => updateStatus(g.id, e.target.value as GuestStatus)}
                      className={`text-xs rounded px-2 py-1 border ${
                        g.status === "selesai"
                          ? "border-moss text-moss"
                          : g.status === "diproses"
                          ? "border-gold-dark text-gold-dark"
                          : "border-line text-ink/60"
                      }`}
                    >
                      {Object.entries(STATUS_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
