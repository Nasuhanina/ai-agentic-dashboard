export const PALETTE = {
  indigo: "#4f46e5",
  violet: "#7c3aed",
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  emerald: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  pink: "#ec4899",
  slate: "#64748b",
};

export const SERIES_COLORS = [
  PALETTE.indigo,
  PALETTE.sky,
  PALETTE.teal,
  PALETTE.amber,
  PALETTE.violet,
  PALETTE.rose,
  PALETTE.emerald,
  PALETTE.orange,
];

export const SENTIMENT_COLORS: Record<string, string> = {
  Positive: PALETTE.emerald,
  Neutral: PALETTE.amber,
  Negative: PALETTE.rose,
};

export const TIER_COLORS: Record<string, string> = {
  Bronze: "#b45309",
  Silver: "#94a3b8",
  Gold: "#d4a017",
  Platinum: "#6366f1",
};

export const STATUS_COLORS: Record<string, string> = {
  Active: PALETTE.emerald,
  Occasional: PALETTE.sky,
  Dormant: PALETTE.amber,
  "At Risk": PALETTE.rose,
};

export function colorForLabel(label: string, index: number, map?: Record<string, string>): string {
  if (map && map[label]) return map[label];
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export const SENTIMENT_BADGE: Record<string, string> = {
  Positive: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Neutral: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Negative: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export const STATUS_BADGE: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Occasional: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  Dormant: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "At Risk": "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};
