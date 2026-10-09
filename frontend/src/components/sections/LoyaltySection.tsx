import type { Loyalty } from "../../types";
import { ChartCard, StatRow } from "../ui";
import { Donut, StackedTierBars, TrendArea } from "../charts";
import { TIER_COLORS } from "../../lib/colors";
import { SectionHeading } from "./DemographicsSection";
import { fmtCompact, fmtNum } from "../../lib/format";

export function LoyaltySection({ data }: { data: Loyalty }) {
  return (
    <section>
      <SectionHeading
        title="Loyalty points"
        subtitle={`${fmtCompact(data.total_points)} points issued · avg ${fmtCompact(data.avg_points)} per customer`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Tier distribution" subtitle="Members per loyalty tier">
          <Donut data={data.tier_distribution} colorMap={TIER_COLORS} height={240} />
        </ChartCard>
        <ChartCard title="Points trend" subtitle="Average balance by month" className="lg:col-span-2">
          <TrendArea data={data.trend} xKey="month" yKey="points" color="#d4a017" name="Avg points" />
        </ChartCard>
        <ChartCard title="Tier × sentiment" subtitle="Sentiment mix within each tier" className="lg:col-span-2">
          <StackedTierBars
            columns={data.tier_by_sentiment.columns}
            rows={data.tier_by_sentiment.rows}
            height={240}
          />
        </ChartCard>
        <ChartCard title="Points movement (30d)" subtitle="Earned vs redeemed">
          <div className="mt-1">
            <StatRow label="Earned" value={fmtNum(data.points_earned_30d)} accent="text-emerald-600" />
            <StatRow label="Redeemed" value={fmtNum(data.points_redeemed_30d)} accent="text-rose-600" />
            <StatRow
              label="Net change"
              value={`${data.net_points_30d >= 0 ? "+" : ""}${fmtNum(data.net_points_30d)}`}
              accent={data.net_points_30d >= 0 ? "text-emerald-600" : "text-rose-600"}
            />
            <StatRow label="Total balance" value={fmtCompact(data.total_points)} />
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
