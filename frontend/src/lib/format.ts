export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtRelativeDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} mo ago`;
}

export function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}

export function sentimentScoreLabel(score: number): { label: string; color: string } {
  if (score > 0.2) return { label: "Positive", color: "text-emerald-600" };
  if (score < -0.2) return { label: "Negative", color: "text-rose-600" };
  return { label: "Neutral", color: "text-amber-600" };
}
