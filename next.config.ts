import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Target deploy: Cloud Run dalam container. `standalone` menghasilkan server.js
  // minimal tanpa perlu node_modules lengkap di image.
  // CATATAN Dockerfile: public/ dan .next/static TIDAK ikut otomatis --
  //   cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
  output: "standalone",

  // @react-pdf/renderer (dipakai untuk ekspor Laporan → PDF di route handler)
  // punya dependensi native-ish (fontkit dll) yang harus di-bundle apa adanya,
  // bukan di-transpile oleh bundler.
  serverExternalPackages: ["@react-pdf/renderer"],

  experimental: {
    serverActions: {
      // Default 1MB terlalu kecil untuk foto struk/invoice yang wajib diunggah
      // di form Pengeluaran (concept:160). Dinaikkan, tapi tetap dibatasi --
      // batas ini juga pertahanan terhadap penyalahgunaan sumber daya.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
