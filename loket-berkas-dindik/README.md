# Loket Layanan Berkas — Daftar Tamu Dinas Pendidikan

Aplikasi web untuk mencatat kunjungan tamu yang mengurus berkas (izin operasional,
legalisir, SK, dapodik, dll). Dibangun dengan **Next.js**, data disimpan di
**Supabase (Postgres)**, siap deploy ke **Vercel**.

## Fitur

- Formulir publik untuk tamu mengisi data kunjungan → otomatis dapat nomor antrian
- Halaman admin (dilindungi kata sandi) untuk melihat, mencari, memfilter,
  mengubah status ("menunggu" / "diproses" / "selesai"), dan mengunduh CSV
- Nomor antrian otomatis per bidang, reset setiap hari

## Menjalankan di komputer sendiri (opsional)

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Untuk database lokal, Anda tetap perlu membuat
project Supabase (lihat langkah 3 di bawah) lalu salin connection string-nya
ke file `.env.local` (contoh ada di `.env.example`).

## Deploy ke Vercel + Supabase (langkah demi langkah)

1. **Buat project di Supabase**
   - Buka https://supabase.com, daftar/login, klik **New Project**.
   - Pilih nama project, buat kata sandi database (simpan baik-baik), pilih region
     terdekat (misalnya Singapore), lalu klik **Create new project**. Tunggu
     sampai selesai provisioning (sekitar 1-2 menit).

2. **Ambil connection string**
   - Di dashboard project Supabase, buka **Project Settings** (ikon gerigi) → **Database**.
   - Cari bagian **Connection string**, pilih tab **Connection pooling** (mode
     **Transaction**, biasanya port `6543`) — bukan yang "Direct connection".
   - Salin URL-nya, ganti bagian `[YOUR-PASSWORD]` dengan kata sandi database yang
     Anda buat di langkah 1.

3. **Buat tabel di Supabase**
   - Masih di dashboard Supabase, buka menu **SQL Editor** → **New query**.
   - Salin isi file `schema.sql` dari project ini, tempel, lalu klik **Run**.
     (Tabel juga akan otomatis dibuat sendiri saat pertama kali dipakai, jadi
     langkah ini opsional tapi disarankan.)

4. **Unggah project ini ke GitHub**
   - Buat repository baru di GitHub, lalu push folder ini ke sana. Contoh:
     ```bash
     git init
     git add .
     git commit -m "Inisialisasi loket layanan berkas"
     git branch -M main
     git remote add origin <URL_REPO_ANDA>
     git push -u origin main
     ```

5. **Import ke Vercel**
   - Buka https://vercel.com/new, pilih repository yang baru dibuat.
   - Sebelum klik Deploy, buka bagian **Environment Variables** dan tambahkan:
     - `DATABASE_URL` = connection string dari langkah 2
     - `ADMIN_PASSWORD` = kata sandi pilihan Anda untuk masuk ke `/admin`
   - Klik **Deploy**.

6. **Selesai**
   - Halaman tamu: `https://nama-project-anda.vercel.app/`
   - Halaman admin: `https://nama-project-anda.vercel.app/admin`

Kalau lupa mengisi Environment Variables sebelum deploy pertama, tambahkan
belakangan di **Settings → Environment Variables**, lalu buka tab
**Deployments** → **Redeploy** pada deployment terakhir.

## Menyesuaikan pilihan formulir

Daftar opsi "Keperluan" dan "Bidang yang dituju" ada di `lib/constants.ts` —
ubah sesuai struktur bidang di dinas Anda. Jika menambah bidang baru, tambahkan
juga singkatannya di `BIDANG_PREFIX` pada `lib/db.ts` supaya format nomor
antrian tetap rapi (misalnya "D-001").

## Struktur project

```
app/
  page.tsx                  Formulir tamu + tampilan tiket
  admin/page.tsx            Halaman login admin
  admin/dashboard/page.tsx  Daftar & pengelolaan tamu
  api/guests/route.ts       Simpan & ambil data tamu
  api/guests/[id]/route.ts  Ubah status tamu
  api/guests/export/route.ts  Ekspor CSV
  api/admin/login/route.ts    Login admin
lib/
  db.ts           Query ke Postgres
  constants.ts    Pilihan formulir
middleware.ts     Proteksi halaman /admin/dashboard
schema.sql        Skema tabel (opsional, untuk setup manual)
```
