import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</span>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </Card>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function ProgressBar({ pct, color = "#4f46e5" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-2 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`text-sm font-semibold ${accent ?? "text-ink-900"}`}>{value}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-100 ${className}`} />;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-ink-400">{message}</div>
  );
}
