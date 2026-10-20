export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Notice({ tone = "success", children }: { tone?: "success" | "info" | "warning" | "error"; children: React.ReactNode }) {
  const cls = {
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    info: "bg-brand-50 text-brand-800 ring-brand-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
    error: "bg-rose-50 text-rose-800 ring-rose-200",
  }[tone];
  return <div className={`mb-5 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${cls}`}>{children}</div>;
}
