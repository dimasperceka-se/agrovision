export function PageHeader({
  title,
  subtitle,
  actions,
  titleAdornment,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Elemen kecil di samping judul, mis. ikon info yang membuka infobox. */
  titleAdornment?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          {titleAdornment}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
