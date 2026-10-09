import type { Insurance } from "../../types";
import { ChartCard, KpiCard, StatRow } from "../ui";
import { HorizontalBars, VerticalBars } from "../charts";
import { SectionHeading } from "./DemographicsSection";
import { fmtCompact, fmtNum } from "../../lib/format";
import { useDashboard } from "../../context/DashboardContext";

export function InsuranceSection({ data }: { data: Insurance }) {
  const { filters, toggleFilter } = useDashboard();
  return (
    <section>
      <SectionHeading
        title="Insurance insights"
        subtitle="Coverage, premium, claims and renewal across filtered customers"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Insured customers"
          value={fmtNum(data.insured)}
          sub={`${data.insured_pct}% of base`}
          tone="indigo"
        />
        <KpiCard
          label="Avg premium"
          value={`$${fmtCompact(data.avg_premium)}`}
          sub={`median $${fmtCompact(data.median_premium)}`}
          tone="sky"
        />
        <KpiCard
          label="Claims rate (3y)"
          value={`${data.claim_rate_pct}%`}
          sub={`avg ${data.avg_claims} claims`}
          tone="rose"
        />
        <KpiCard
          label="Insured via platform (%)"
          value={`${data.platform_share_pct}%`}
          sub="of insured customers"
          tone="emerald"
        />
        <KpiCard
          label="Value at stake (90d)"
          value={`$${fmtCompact(data.value_at_stake)}`}
          sub={`${fmtNum(data.expiring_90)} renewals due`}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Premium bands" subtitle="Annual premium distribution">
          <VerticalBars
            data={data.premium_bands}
            color="#4f46e5"
            onSelect={(label) => toggleFilter("premium_band", label)}
            selected={filters.premium_band}
          />
        </ChartCard>
        <ChartCard
          title="Avg premium by vehicle segment"
          subtitle="Per customer"
          className="lg:col-span-2"
        >
          <HorizontalBars
            data={data.premium_by_segment}
            color="#0ea5e9"
            name="Avg premium ($)"
            height={240}
            onSelect={(label) => toggleFilter("segment", label)}
            selected={filters.segment}
          />
        </ChartCard>

        <ChartCard title="Renewal pipeline" subtitle="Days to policy expiry">
          <VerticalBars
            data={data.renewal_pipeline}
            color="#f59e0b"
            onSelect={(label) => toggleFilter("renewal", label)}
            selected={filters.renewal}
          />
        </ChartCard>
        <ChartCard title="NCD distribution" subtitle="No-claim discount %" className="lg:col-span-2">
          <VerticalBars
            data={data.ncd_distribution}
            color="#10b981"
            onSelect={(label) => toggleFilter("ncd", label)}
            selected={filters.ncd}
          />
        </ChartCard>

        <ChartCard
          title="Claim rate by risk cohort"
          subtitle="% with a claim in the last 3 years"
          className="lg:col-span-2"
        >
          <HorizontalBars
            data={data.risk_cohorts}
            color="#f43f5e"
            name="Claim rate (%)"
            height={240}
          />
        </ChartCard>
        <ChartCard title="Insurer mix" subtitle="Top insurers by customers">
          <HorizontalBars
            data={data.insurer_mix.slice(0, 6)}
            color="#7c3aed"
            height={240}
            onSelect={(label) => toggleFilter("insurer", label)}
            selected={filters.insurer}
          />
        </ChartCard>

        <ChartCard title="EV vs petrol" subtitle="Average annual premium" className="lg:col-span-1">
          <div className="mt-1">
            <StatRow label="EV" value={`$${fmtCompact(data.ev_vs_ice.ev)}`} accent="text-emerald-600" />
            <StatRow label="Petrol / hybrid" value={`$${fmtCompact(data.ev_vs_ice.ice)}`} />
            <StatRow label="Avg NCD" value={`${fmtNum(data.avg_ncd, 1)}%`} />
            <StatRow label="Total premium" value={`$${fmtCompact(data.total_premium)}`} />
          </div>
        </ChartCard>
        <ChartCard title="Claims distribution" subtitle="Claims per customer (3y)" className="lg:col-span-2">
          <VerticalBars
            data={data.claims_distribution}
            color="#f43f5e"
            onSelect={(label) => toggleFilter("claims", label)}
            selected={filters.claims}
          />
        </ChartCard>
      </div>
    </section>
  );
}
