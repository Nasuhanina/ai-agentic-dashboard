import { useEffect, useState } from "react";
import type { DashboardFilters, Filters } from "../types";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="min-w-[130px] rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  options,
  value,
  onChange,
  onReset,
  loading,
}: {
  options: Filters | null;
  value: DashboardFilters;
  onChange: (v: DashboardFilters) => void;
  onReset: () => void;
  loading?: boolean;
}) {
  const [search, setSearch] = useState(value.search ?? "");

  useEffect(() => {
    setSearch(value.search ?? "");
  }, [value.search]);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      if ((value.search ?? "") !== search) onChange({ ...value, search: search || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const set = (patch: Partial<DashboardFilters>) => onChange({ ...value, ...patch });
  const hasFilters = Object.values(value).some(Boolean);

  const FILTER_LABELS: Record<string, string> = {
    city: "City",
    sentiment: "Sentiment",
    tier: "Tier",
    activity_status: "Activity",
    gender: "Gender",
    user_type: "User type",
    age_band: "Age",
    housing_type: "Housing",
    life_stage: "Life stage",
    platform: "Platform",
    segment: "Segment",
    channel: "Channel",
    interaction_type: "Interaction",
    login_recency: "Login recency",
    tenure: "Tenure",
    follow_up_recency: "Follow-up",
    driving_band: "Driving band",
    insurer: "Insurer",
    renewal: "Renewal",
    premium_band: "Premium",
    ncd: "NCD",
    claims: "Claims",
    search: "Search",
  };
  const active = Object.entries(value).filter(([, v]) => v) as [string, string][];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Search</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, ID or email"
          className="w-52 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <Select
        label="User type"
        value={value.user_type}
        options={options?.user_types ?? []}
        onChange={(v) => set({ user_type: v })}
      />
      <Select label="City" value={value.city} options={options?.cities ?? []} onChange={(v) => set({ city: v })} />
      <Select
        label="Sentiment"
        value={value.sentiment}
        options={options?.sentiments ?? []}
        onChange={(v) => set({ sentiment: v })}
      />
      <Select label="Tier" value={value.tier} options={options?.tiers ?? []} onChange={(v) => set({ tier: v })} />
      <Select
        label="Activity"
        value={value.activity_status}
        options={options?.activity_statuses ?? []}
        onChange={(v) => set({ activity_status: v })}
      />
      <Select label="Gender" value={value.gender} options={options?.genders ?? []} onChange={(v) => set({ gender: v })} />

      <button
        onClick={onReset}
        disabled={!hasFilters}
        className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Reset
      </button>
      {loading && (
        <span className="flex items-center gap-2 text-xs text-ink-500">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-300 border-t-indigo-500" />
          Updating…
        </span>
      )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Active</span>
          {active.map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200"
            >
              {FILTER_LABELS[k] ?? k}: {String(v)}
              <button
                type="button"
                onClick={() => onChange({ ...value, [k]: undefined })}
                className="text-indigo-400 transition hover:text-indigo-700"
                aria-label={`Remove ${k} filter`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-ink-500 underline-offset-2 transition hover:text-ink-800 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
