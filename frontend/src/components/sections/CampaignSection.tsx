import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAudienceCsv, fetchCampaign, fetchPropensityMeta } from "../../api";
import type { CampaignParams } from "../../api";
import { useDashboard } from "../../context/DashboardContext";
import type { CampaignResult, PropensityMeta, RateRow } from "../../propensity/types";
import { LikelihoodBar, LikelihoodSlider, Select, pct, sgd, useDebounced } from "../../propensity/ui";
import { Card, ChartCard, KpiCard, Skeleton } from "../ui";

export function CampaignSection() {
  const { filters, selectUser } = useDashboard();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const product = params.get("product") || "insurance_switch";
  const group = params.get("group") ?? "";
  const channel = params.get("channel") || "WhatsApp";
  const offer = params.get("offer") || "No offer";
  const [min, setMin] = useState(Number(params.get("min") ?? 20));
  const minDebounced = useDebounced(min);

  const [meta, setMeta] = useState<PropensityMeta | null>(null);
  const [res, setRes] = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    fetchPropensityMeta().then(setMeta).catch(() => setError("Could not load the campaign model"));
  }, []);

  useEffect(() => {
    update({ min: String(minDebounced) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDebounced]);

  const query: CampaignParams = { product, group, channel, offer, min_pct: minDebounced };

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCampaign(filters, query)
      .then((d) => {
        if (!active) return;
        setRes(d);
        setError(null);
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, product, group, channel, offer, minDebounced]);

  const download = async () => {
    setDownloading(true);
    try {
      const text = await fetchAudienceCsv(filters, query);
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `audience_${product}_${group || "all"}_${minDebounced}pct.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(String(e));
    } finally {
      setDownloading(false);
    }
  };

  if (meta && !meta.available) {
    return <Card className="p-6 text-sm text-ink-600">The campaign builder needs <code>customer360.csv</code> in the repo root.</Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Campaign builder</h2>
          <p className="text-xs text-ink-500">
            Only customers with marketing consent (duplicates removed{channel === "Push" ? ", push-off users removed" : ""}). Channel and offer
            effects are measured from past campaigns in the data. Follows the filter bar above.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Select label="Product" value={product} onChange={(v) => update({ product: v })} className="min-w-[210px]">
            {meta?.products.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </Select>
          <Select label="Group" value={group} onChange={(v) => update({ group: v })} className="min-w-[190px]">
            <option value="">All groups</option>
            {meta?.groups.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </Select>
          <Select label="Channel" value={channel} onChange={(v) => update({ channel: v })} className="min-w-[120px]">
            {(meta?.channels ?? ["WhatsApp"]).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select label="Offer" value={offer} onChange={(v) => update({ offer: v })} className="min-w-[170px]">
            {(meta?.offers ?? ["No offer"]).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
          <LikelihoodSlider value={min} onChange={setMin} />
        </div>
      </Card>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className={`grid grid-cols-2 gap-4 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
        <KpiCard label="Audience" value={res ? res.audience.toLocaleString() : "…"} sub={`at ≥${minDebounced}% likely`} />
        <KpiCard
          label="Expected sales"
          value={res ? res.expected_sales.toFixed(1) : "…"}
          sub={res ? `channel ×${res.channel_factor.toFixed(2)} · offer ×${res.offer_factor.toFixed(2)} (from history)` : ""}
          tone="sky"
        />
        <KpiCard label="Expected revenue" value={res ? sgd(res.revenue_sgd) : "…"} tone="emerald" />
        <KpiCard label="Net value" value={res ? sgd(res.net_sgd) : "…"} sub={res ? `after ${sgd(res.cost_sgd)} message + offer cost` : ""} tone="violet" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Audience</h3>
            <p className="text-xs text-ink-500">Top 50 by expected value · click a row to open the customer</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!res?.audience}
              onClick={() => navigate(`/likelihood?product=${product}&min=${minDebounced}${group ? `&group=${group}` : ""}`)}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"
            >
              See these people in Likelihood to buy →
            </button>
            <button
              disabled={!res?.audience || downloading}
              onClick={download}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {downloading ? "Preparing…" : "Download audience CSV"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Likelihood</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 text-right font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Main reason</th>
              </tr>
            </thead>
            <tbody>
              {!res && loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                  ))
                : res?.items.map((u) => (
                    <tr key={u.id} onClick={() => selectUser(u.id)} className="cursor-pointer border-b border-ink-50 transition hover:bg-indigo-50/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{u.name}</div>
                        <div className="text-xs text-ink-400">{u.id}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">{u.group_label}</td>
                      <td className="min-w-[170px] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><LikelihoodBar value={u.likelihood} threshold={minDebounced} /></div>
                          <span className="w-10 text-right text-xs font-semibold tabular-nums text-ink-800">{pct(u.likelihood)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-600">{sgd(u.value_sgd)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{sgd(u.expected_sgd)}</td>
                      <td className="px-4 py-3 text-xs text-ink-500">{u.reason}</td>
                    </tr>
                  ))}
              {res && res.audience === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-400">
                    No one reaches {minDebounced}% for {res.product_label}. Lower the slider or pick another group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {meta?.history && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RateCard title="Past campaigns by channel" rows={meta.history.by_channel} highlight={channel} />
          <RateCard title="Past campaigns by offer" rows={meta.history.by_offer} highlight={offer} />
        </div>
      )}
    </div>
  );
}

function RateCard({ title, rows, highlight }: { title: string; rows: RateRow[]; highlight: string }) {
  const max = Math.max(...rows.map((r) => r.rate), 0.01);
  return (
    <ChartCard title={title} subtitle="Share of customers who bought after the message">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[130px_minmax(0,1fr)_48px_70px] items-center gap-2 text-sm">
            <span className={r.key === highlight ? "font-semibold text-indigo-700" : "text-ink-600"}>{r.key}</span>
            <div className="h-2.5 rounded-full bg-ink-100">
              <div className={`h-full rounded-full ${r.key === highlight ? "bg-indigo-600" : "bg-indigo-300"}`} style={{ width: `${(r.rate / max) * 100}%` }} />
            </div>
            <span className="text-right font-semibold tabular-nums">{pct(r.rate)}</span>
            <span className="text-right text-xs tabular-nums text-ink-400">{r.sent} sent</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
