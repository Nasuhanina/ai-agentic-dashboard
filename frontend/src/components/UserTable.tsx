import type { DashboardFilters, UsersResponse } from "../types";
import { SENTIMENT_BADGE, STATUS_BADGE, TIER_COLORS } from "../lib/colors";
import { fmtCompact, fmtNum, fmtRelativeDays } from "../lib/format";
import { Card, Skeleton } from "./ui";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Customer", sortable: true },
  { key: "sentiment", label: "Sentiment", sortable: true },
  { key: "activity_status", label: "Activity", sortable: true },
  { key: "loyalty_tier", label: "Tier", sortable: true },
  { key: "loyalty_points", label: "Points", align: "right", sortable: true },
  { key: "tenure_days", label: "Tenure", align: "right", sortable: true },
  { key: "days_since_last_login", label: "Last login", align: "right", sortable: true },
  { key: "days_since_follow_up", label: "Last follow-up", align: "right", sortable: true },
  { key: "driving_score", label: "Drive score", align: "right", sortable: true },
  { key: "satisfaction_csat", label: "CSAT", align: "right", sortable: true },
];

export function UserTable({
  data,
  loading,
  sort,
  order,
  page,
  onSort,
  onPage,
  onSelect,
  filters,
}: {
  data: UsersResponse | null;
  loading: boolean;
  sort: string;
  order: "asc" | "desc";
  page: number;
  onSort: (key: string) => void;
  onPage: (page: number) => void;
  onSelect: (id: string) => void;
  filters: DashboardFilters;
}) {
  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Customer explorer</h2>
          <p className="text-xs text-ink-500">
            {data ? `${fmtNum(data.total)} matching customers` : "Loading…"}
            {activeFilters.length > 0 && " · filtered"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <button
            className="rounded-md border border-ink-200 px-2 py-1 disabled:opacity-40"
            disabled={!data || page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Prev
          </button>
          <span className="px-2">
            Page {data?.page ?? 1} / {data?.pages ?? 1}
          </span>
          <button
            className="rounded-md border border-ink-200 px-2 py-1 disabled:opacity-40"
            disabled={!data || page >= (data?.pages ?? 1)}
            onClick={() => onPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-4 py-3 font-medium ${
                    c.align === "right" ? "text-right" : ""
                  } ${c.sortable ? "cursor-pointer select-none hover:text-ink-800" : ""}`}
                  onClick={() => c.sortable && onSort(c.key)}
                >
                  {c.label}
                  {sort === c.key && <span className="ml-1">{order === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !data
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-ink-50">
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.items.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => onSelect(u.id)}
                    className="cursor-pointer border-b border-ink-50 transition hover:bg-indigo-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: avatarColor(u.avatar_seed) }}
                        >
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink-900">{u.name}</div>
                          <div className="truncate text-xs text-ink-400">{u.id} · {u.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ${SENTIMENT_BADGE[u.sentiment]}`}>{u.sentiment}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ${STATUS_BADGE[u.activity_status]}`}>{u.activity_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip" style={{ backgroundColor: `${TIER_COLORS[u.loyalty_tier]}1a`, color: TIER_COLORS[u.loyalty_tier] }}>
                        {u.loyalty_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmtCompact(u.loyalty_points)}</td>
                    <td className="px-4 py-3 text-right text-ink-600">{Math.round(u.tenure_days / 30)} mo</td>
                    <td className="px-4 py-3 text-right text-ink-600">{fmtRelativeDays(u.days_since_last_login)}</td>
                    <td className="px-4 py-3 text-right text-ink-600">
                      <span className={u.follow_up_needed ? "font-medium text-rose-600" : ""}>
                        {fmtRelativeDays(u.days_since_follow_up)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={scoreColor(u.driving_score)}>{u.driving_score}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-600">{u.satisfaction_csat.toFixed(1)}</td>
                  </tr>
                ))}
            {!loading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-ink-400">
                  No customers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#7c3aed", "#ec4899", "#f43f5e", "#10b981"];
function avatarColor(seed: number): string {
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function scoreColor(score: number): string {
  if (score >= 85) return "font-medium text-emerald-600";
  if (score >= 70) return "font-medium text-sky-600";
  if (score >= 50) return "font-medium text-amber-600";
  return "font-medium text-rose-600";
}
