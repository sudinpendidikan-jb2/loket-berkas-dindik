// Header standar untuk endpoint yang mengembalikan data sensitif
// (data tamu, sesi admin, dsb). Mencegah response disimpan oleh
// browser, komputer bersama, atau proxy/CDN perantara.
// Lihat: WSTG-CONF - Cache-Control pada Data Sensitif.
export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;