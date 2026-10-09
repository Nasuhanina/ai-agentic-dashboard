import { useCallback, useState } from "react";
import type { SegmentsResponse } from "../../types";
import { SectionHeading } from "./DemographicsSection";
import { fmtNum } from "../../lib/format";

const ACCENTS: Record<string, string> = {
  high_spenders: "#4f46e5",
  occasional: "#0ea5e9",
  at_risk: "#f43f5e",
  new_users: "#10b981",
  phv_drivers: "#7c3aed",
  multi_vehicle: "#f59e0b",
  web_unregistered: "#06b6d4",
  insurance_renewal_due: "#e11d48",
  ev_owners: "#16a34a",
  high_mileage_drivers: "#ea580c",
};

export function SegmentsSection({ data, focus }: { data: SegmentsResponse; focus?: string }) {
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));

  const scrollToFocused = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section>
      <SectionHeading
        title="Customer segments"
        subtitle={`${fmtNum(data.total)} customers · rule-based clusters`}
      />
      <div className="grid grid-cols-1 gap-4">
        {data.segments.map((s) => {
          const isFocused = s.key === focus;
          return (
            <div
              key={s.key}
              ref={isFocused ? scrollToFocused : undefined}
              className={`card flex scroll-mt-24 flex-col gap-4 p-5 transition lg:flex-row lg:items-center lg:gap-8 ${
                isFocused ? "bg-indigo-50/60 ring-2 ring-indigo-400" : ""
              }`}
            >
              <div className="lg:w-[46%] lg:shrink-0">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ACCENTS[s.key] ?? "#4f46e5" }}
                  />
                  <h3 className="text-sm font-semibold text-ink-900">{s.label}</h3>
                  <span className="chip bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                    {s.pct}%
                  </span>
                  {isFocused && (
                    <span className="chip bg-indigo-600 text-white">selected</span>
                  )}

                  <span className="group/info relative inline-flex">
                    <button
                      type="button"
                      aria-label={`About ${s.label}`}
                      className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-ink-300 text-[10px] font-bold leading-none text-ink-400 transition group-hover/info:border-indigo-400 group-hover/info:text-indigo-600"
                    >
                      i
                    </button>
                    <span className="pointer-events-none absolute left-0 top-6 z-30 hidden w-64 rounded-lg border border-ink-200 bg-white p-3 text-left text-xs text-ink-600 shadow-lg group-hover/info:block">
                      {s.criteria}
                    </span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-ink-500">{s.criteria}</p>
                {s.detail && <p className="mt-0.5 text-xs text-ink-400">{s.detail}</p>}

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-ink-900">
                    {fmtNum(s.count)}
                  </span>
                  <span className="text-xs text-ink-400">customers</span>
                </div>

                <button
                  type="button"
                  onClick={() => toggle(s.key)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className={`transition-transform ${openKeys[s.key] ? "rotate-90" : ""}`}
                  >
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {openKeys[s.key] ? "Hide customers" : `Show customers (${fmtNum(s.count)})`}
                </button>

                {openKeys[s.key] && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-ink-100 bg-white">
                    {s.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between border-b border-ink-50 px-3 py-1.5 text-xs last:border-0"
                      >
                        <span className="truncate text-ink-700">{m.name}</span>
                        <span className="ml-2 shrink-0 text-ink-400">{m.id}</span>
                      </div>
                    ))}
                    {s.members.length === 0 && (
                      <div className="px-3 py-2 text-xs text-ink-400">No customers</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 rounded-lg bg-ink-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Recommendation
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      s.recommendation_source && s.recommendation_source !== "default"
                        ? "text-indigo-600"
                        : "text-ink-400"
                    }`}
                  >
                    {s.recommendation_source && s.recommendation_source !== "default"
                      ? `AI · ${s.recommendation_source}`
                      : "Rule-based"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-600">{s.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
