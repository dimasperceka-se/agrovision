"use client";

import { RotateCw } from "lucide-react";

/** Tombol muat ulang untuk halaman offline. */
export function RetryButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <RotateCw className="h-4 w-4" /> {label}
    </button>
  );
}
