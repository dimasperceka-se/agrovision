import type { LucideIcon } from "lucide-react";

/**
 * Empty state yang JUJUR.
 *
 * concept:40 — bila belum ada data, tampilkan "belum ada data", jangan diisi
 * angka placeholder. Angka fabrikasi di dashboard finansial disebut *fatal
 * failure* oleh dokumen konsep, dan komponen ini adalah alternatifnya.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
