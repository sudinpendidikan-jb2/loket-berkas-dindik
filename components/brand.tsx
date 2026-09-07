import Image from "next/image";
import { AGENCY_INFO } from "@/lib/constants";

/**
 * Deret 3 logo resmi kop surat: Pemprov DKI Jakarta (Jaya Raya), Dinas Pendidikan,
 * dan Kota Administrasi Jakarta Barat. File gambar ada di /public/logos.
 * Ukuran diatur lewat class Tailwind (bukan pixel tetap) supaya menyusut otomatis
 * di layar sempit dan tidak memotong/overflow header.
 */
export function AgencyLogos({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  // h-8 md:h-9 (sm) / h-10 md:h-12 (lg) — semua pakai width:auto biar rasio tetap.
  const sizeClass =
    size === "lg" ? "h-10 w-auto md:h-12" : "h-8 w-auto md:h-9";
  const logos = [
    { src: "/logos/jaya-raya.png", alt: "Logo Pemerintah Provinsi DKI Jakarta", w: 132, h: 167 },
    { src: "/logos/disdik.png", alt: "Logo Dinas Pendidikan DKI Jakarta", w: 140, h: 167 },
    { src: "/logos/jakarta-barat.png", alt: "Logo Kota Administrasi Jakarta Barat", w: 141, h: 167 },
  ];
  return (
    <div className={`flex flex-shrink-0 items-center gap-2 sm:gap-3 ${className}`}>
      {logos.map((logo) => (
        <Image
          key={logo.src}
          src={logo.src}
          alt={logo.alt}
          height={logo.h}
          width={logo.w}
          className={`${sizeClass} shrink-0 object-contain`}
          priority
        />
      ))}

    </div>
  );
}

/** Latar siluet Monas dengan langit navy-emas — SVG asli, bukan foto. Dipakai bersama di form tamu dan halaman admin biar tampilannya senada. */
export function MonasBackdrop() {
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
          <radialGradient id="glow" cx="30%" cy="42%" r="45%">
            <stop offset="0%" stopColor="#D9AE6E" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#D9AE6E" stopOpacity="0.08" />
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
        <g fill="#080E20">
          <rect x="30" y="600" width="55" height="200" />
          <rect x="440" y="560" width="45" height="240" />
          <rect x="960" y="580" width="50" height="220" />
          <rect x="1040" y="620" width="70" height="180" />
          <rect x="1000" y="540" width="35" height="260" />
        </g>

        {/* Monas: dasar, tugu, dan lidah api emas */}
        <g fill="#080E20" stroke="#D9AE6E" strokeOpacity="0.35" strokeWidth="1.5">
          <rect x="260" y="700" width="160" height="30" rx="2" />
          <rect x="280" y="660" width="120" height="42" />
          <polygon points="305,660 375,660 355,300 325,300" />
        </g>
        <polygon points="328,300 352,300 345,255 335,255" fill="url(#flame)" />
      </svg>
    </div>
  );
}

export function StampMark({ color = "#D9AE6E" }: { color?: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="17" cy="17" r="15.5" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
      <path d="M11 18.5L15 22L23 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Kop surat resmi untuk tampilan cetak/PDF (window.print). Disembunyikan di
 * layar (hidden) dan hanya muncul saat mencetak (print:block), supaya hasil
 * cetak berformat surat dinas: logo kiri-kanan, nama instansi, alamat/kontak,
 * garis pemisah tebal, lalu baris judul laporan + tanggal & waktu cetak.
 */
export function PrintLetterhead({
  reportTitle,
  tanggalLabel,
}: {
  reportTitle: string;
  tanggalLabel: string;
}) {
  const dicetak = new Date().toLocaleString("id-ID");

  return (
    <div className="hidden print:block">
      <div className="flex items-center justify-between gap-4">
        <Image
          src="/logos/jaya-raya.png"
          alt="Logo Pemerintah Provinsi DKI Jakarta"
          width={132}
          height={167}
          className="h-16 w-auto shrink-0"
        />
        <div className="flex-1 text-center leading-tight text-black">
          {AGENCY_INFO.lines.map((line, i) => (
            <p
              key={line}
              className={`font-bold uppercase tracking-wide ${i < 2 ? "text-[13px]" : "text-[15px]"}`}
            >
              {line}
            </p>
          ))}
          <p className="mt-1 text-[11px] font-normal normal-case tracking-normal">
            {AGENCY_INFO.address}
          </p>
          <p className="text-[11px] font-normal normal-case tracking-normal">
            {AGENCY_INFO.contact}
          </p>
        </div>
        <Image
          src="/logos/disdik.png"
          alt="Logo Dinas Pendidikan DKI Jakarta"
          width={140}
          height={167}
          className="h-16 w-auto shrink-0"
        />
      </div>

      <div className="mt-2 border-b-[3px] border-black" />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/60 py-2">
        <p className="font-serif text-base font-bold text-black">{reportTitle}</p>
        <p className="text-xs text-black/60">
          Tanggal: {tanggalLabel} — Dicetak: {dicetak}
        </p>
      </div>
    </div>
  );
}
