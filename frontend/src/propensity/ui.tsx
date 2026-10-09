import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export const sgd = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

export const pct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : `${(n * 100).toFixed(digits)}%`;

/** Value that only updates after `ms` without changes (keeps slider drags smooth). */
export function useDebounced<T>(value: T, ms = 150): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function LikelihoodSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="block min-w-[240px] flex-1">
      <span className="text-xs font-medium text-ink-500">Likely to buy at least</span>
      <span className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-indigo-600"
          aria-label="Minimum likelihood to buy"
        />
        <span className="w-12 text-right text-sm font-semibold tabular-nums text-ink-900">{value}%</span>
      </span>
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  children,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        {children}
      </select>
    </label>
  );
}

/** Horizontal likelihood bar with an optional dashed threshold marker. */
export function LikelihoodBar({
  value,
  threshold,
  highlight = false,
}: {
  value: number;
  threshold?: number;
  highlight?: boolean;
}) {
  const below = threshold !== undefined && threshold > 0 && value * 100 < threshold;
  return (
    <div className="relative h-2.5 w-full rounded-full bg-ink-100">
      <div
        className={`h-full rounded-full ${highlight ? "bg-indigo-600" : below ? "bg-indigo-300" : "bg-indigo-500"}`}
        style={{ width: `${Math.max(1, Math.min(100, value * 100))}%` }}
      />
      {threshold !== undefined && threshold > 0 && (
        <span
          className="absolute -bottom-1 -top-1 border-l-2 border-dashed border-amber-500"
          style={{ left: `${threshold}%` }}
          title={`Threshold ${threshold}%`}
        />
      )}
    </div>
  );
}
