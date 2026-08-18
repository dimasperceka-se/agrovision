import type { MetadataRoute } from "next";

/**
 * Web App Manifest (konvensi Next 16: app/manifest.ts).
 * Warna mengikuti identitas RSPO: hijau hutan #182e18 & krem #f2f0eb.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgroVision — Agroforestry Platform",
    short_name: "AgroVision",
    description:
      "Platform manajemen agroforestry: budidaya, traceability, karbon & pelaporan.",
    lang: "id",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f0eb",
    theme_color: "#182e18",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
