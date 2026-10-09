import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchPropensityMeta, fetchPropensityUser, fetchPropensityUsers } from "../../api";
import { useDashboard } from "../../context/DashboardContext";
import type { PropensityMeta, PropensityUser, PropensityUsers } from "../../propensity/types";
import { LikelihoodBar, LikelihoodSlider, Select, pct, sgd, useDebounced } from "../../propensity/ui";
import { Card, KpiCard, Skeleton } from "../ui";

const PAGE_SIZE = 25;

export function LikelihoodSection() {
  const { filters, selectUser } = useDashboard();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const product = params.get("product") ?? "";
  const group = params.get("group") ?? "";
  const sort = params.get("sort") ?? "likelihood";
  const [min, setMin] = useState(Number(params.get("min") ?? 30));
  const minDebounced = useDebounced(min);

  const [meta, setMeta] = useState<PropensityMeta | null>(null);
  const [data, setData] = useState<PropensityUsers | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PropensityUser | null>(null);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    fetchPropensityMeta().then(setMeta).catch(() => setError("Could not load the likelihood model"));
  }, []);

  useEffect(() => {
    update({ min: String(minDebounced) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDebounced]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPropensityUsers(filters, { product, min_pct: minDebounced, group, page, page_size: PAGE_SIZE, sort })
      .then((d) => {
        if (!active) return;
        setData(d);
        setError(null);
        if (!selected || !d.items.some((x) => x.id === selected)) setSelected(d.items[0]?.id ?? null);
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, product, minDebounced, group, page, sort]);

  useEffect(() => {
    if (!selected) return setDetail(null);
    let active = true;
    fetchPropensityUser(selected).then((d) => active && setDetail(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, [selected]);

  if (meta && !meta.available) {
    return <Card className="p-6 text-sm text-ink-600">The likelihood model needs <code>customer360.csv</code> in the repo root.</Card>;
  }

  const productLabel =
    product === "app_download" ? "download the app" : meta?.products.find((p) => p.key === product)?.label ?? "any product";
  const isWeb = product === "app_download";

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">Likelihood to buy</h2>
          <p className="text-xs text-ink-500">
            Estimated chance each customer buys in the next 30 days, scored from customer360.csv. Follows the filter bar above.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Select label="Product" value={product} onChange={(v) => update({ product: v })} className="min-w-[220px]">
            <option value="">Best offer (any product)</option>
            {meta?.products.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
            {meta && <option value={meta.app_download.key}>{meta.app_download.label}</option>}
          </Select>
          <Select label="Group" value={group} onChange={(v) => update({ group: v })} className="min-w-[200px]">
            <option value="">All groups</option>
            {(isWeb ? meta?.web_groups : meta?.groups)?.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </Select>
          <Select label="Sort" value={sort} onChange={(v) => update({ sort: v === "likelihood" ? "" : v })} className="min-w-[150px]">
            <option value="likelihood">Most likely</option>
            <option value="value">Highest expected value</option>
            <option value="id">Customer ID</option>
          </Select>
          <LikelihoodSlider value={min} onChange={setMin} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={`At ≥${min}% likely`} value={data ? data.total.toLocaleString() : "…"} sub={`people likely to ${productLabel.toLowerCase()}`} />
        <KpiCard label="Can be marketed to" value={data ? data.reachable.toLocaleString() : "…"} sub="marketing consent, duplicates removed" tone="emerald" />
        <KpiCard label="Expected value" value={data ? sgd(data.expected_sgd) : "…"} sub={isWeb ? "if these visitors download the app" : "from customers we can market to"} tone="violet" />
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
            <p className="text-xs text-ink-500">
              {data ? `${data.total.toLocaleString()} people at ≥${minDebounced}% likely: ${productLabel}` : "Loading…"}
            </p>
            <div className="flex items-center gap-1 text-xs text-ink-500">
              <button className="rounded-md border border-ink-200 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="px-2">Page {data?.page ?? 1} / {data?.pages ?? 1}</span>
              <button className="rounded-md border border-ink-200 px-2 py-1 disabled:opacity-40" disabled={!data || page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
          <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">{product ? "Likelihood" : "Best offer"}</th>
                  <th className="px-4 py-3 text-right font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Main reason</th>
                </tr>
              </thead>
              <tbody>
                {!data && loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                    ))
                  : data?.items.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => setSelected(u.id)}
                        className={`cursor-pointer border-b border-ink-50 transition hover:bg-indigo-50/40 ${selected === u.id ? "bg-indigo-50/70" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink-900">{u.name}</div>
                          <div className="text-xs text-ink-400">
                            {u.id}
                            {!u.reachable && u.user_type === "App user" && " · not marketable"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-600">{u.group_label}</td>
                        <td className="min-w-[180px] px-4 py-3">
                          {!product && <div className="mb-1 text-xs text-ink-500">{u.product_label}</div>}
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><LikelihoodBar value={u.likelihood} threshold={minDebounced} /></div>
                            <span className="w-10 text-right text-xs font-semibold tabular-nums text-ink-800">{pct(u.likelihood)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">{sgd(u.expected_sgd)}</td>
                        <td className="px-4 py-3 text-xs text-ink-500">{u.reason}</td>
                      </tr>
                    ))}
                {data && data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-ink-400">
                      No one reaches {minDebounced}% for {productLabel}. Lower the slider or change the group.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CustomerLikelihood
          detail={detail}
          product={product}
          threshold={minDebounced}
          onOpenProfile={(id) => selectUser(id)}
          onCampaign={(p) => navigate(`/campaign?product=${p}&min=${minDebounced}${group && !isWeb ? `&group=${group}` : ""}`)}
        />
      </div>
    </div>
  );
}

function CustomerLikelihood({
  detail,
  product,
  threshold,
  onOpenProfile,
  onCampaign,
}: {
  detail: PropensityUser | null;
  product: string;
  threshold: number;
  onOpenProfile: (id: string) => void;
  onCampaign: (product: string) => void;
}) {
  if (!detail) return <Card className="p-5 text-sm text-ink-400">Pick a customer to see their likelihood for every product.</Card>;
  const chosen = detail.products.find((p) => p.key === product);
  const above = detail.products.filter((p) => threshold > 0 && p.likelihood * 100 >= threshold);
  const top = chosen ?? detail.products[0];
  return (
    <Card className="space-y-4 self-start p-5">
      <div>
        <div className="text-xs text-ink-400">{detail.id} · {detail.group_label}</div>
        <h3 className="text-lg font-semibold text-ink-900">{detail.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chosen && threshold > 0 && (
            <span className={`chip ${chosen.likelihood * 100 >= threshold ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-ink-100 text-ink-600"}`}>
              {chosen.likelihood * 100 >= threshold ? "Meets" : "Below"} {threshold}% for {chosen.label}
            </span>
          )}
          {!detail.is_web && !detail.marketing_consent && <span className="chip bg-amber-50 text-amber-700">No marketing consent</span>}
          {!detail.is_web && !detail.push_enabled && <span className="chip bg-ink-100 text-ink-600">Push off</span>}
          {detail.duplicate_of && <span className="chip bg-rose-50 text-rose-700">Duplicate of {detail.duplicate_of}</span>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs text-ink-500">
          <span>Likelihood to buy, next 30 days</span>
          {threshold > 0 && <span className="text-amber-600">dashed line = {threshold}%</span>}
        </div>
        {detail.products.map((p) => (
          <div key={p.key} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_40px_52px] items-center gap-2 text-xs" title={p.why.join(" · ")}>
            <span className={`truncate ${p.key === product ? "font-semibold text-indigo-700" : "text-ink-600"}`}>{p.label}</span>
            <LikelihoodBar value={p.likelihood} threshold={threshold} highlight={p.key === product} />
            <span className="text-right font-semibold tabular-nums text-ink-800">{pct(p.likelihood)}</span>
            <span className="text-right tabular-nums text-ink-400">{sgd(p.expected_sgd)}</span>
          </div>
        ))}
        {threshold > 0 && (
          <p className="text-xs text-ink-500">
            {above.length ? `Above ${threshold}%: ${above.map((p) => p.label).join(", ")}` : `No product reaches ${threshold}%`}
          </p>
        )}
      </div>

      {top && (
        <div className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
          <span className="font-semibold text-ink-800">Why {top.label}: </span>
          {top.why.join(" · ") || "baseline"}
        </div>
      )}

      {detail.campaigns.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-ink-500">Past campaigns</div>
          {detail.campaigns.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs text-ink-600">
              <span className="truncate">{c.date} · {c.product.replace(/_/g, " ")} · {c.channel}</span>
              <span className={c.converted ? "font-semibold text-emerald-600" : "text-ink-400"}>{c.converted ? "Bought" : "No"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!detail.is_web && (
          <button onClick={() => onOpenProfile(detail.id)} className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50">
            Open full profile
          </button>
        )}
        {!detail.is_web && top && (
          <button onClick={() => onCampaign(top.key)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
            Build campaign: {top.label}
          </button>
        )}
      </div>
    </Card>
  );
}
