import type { Sentiment } from "../../types";
import { ChartCard } from "../ui";
import { Donut, HorizontalBars, TrendArea } from "../charts";
import { SENTIMENT_COLORS } from "../../lib/colors";
import { SectionHeading } from "./DemographicsSection";
import { fmtNum } from "../../lib/format";
import { useDashboard } from "../../context/DashboardContext";

export function SentimentSection({ data }: { data: Sentiment }) {
  const { filters, toggleFilter } = useDashboard();
  const trend = data.trend.map((t) => ({ period: `P${t.index + 1}`, score: t.score }));
  return (
    <section>
      <SectionHeading
        title="Inferred sentiment"
        subtitle={`Model-inferred from behaviour · avg score ${fmtNum(data.avg_score, 2)} (-1 to 1)`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Sentiment mix" subtitle="Across filtered customers">
          <Donut
            data={data.distribution}
            colorMap={SENTIMENT_COLORS}
            height={240}
            onSelect={(label) => toggleFilter("sentiment", label)}
            selected={filters.sentiment}
          />
        </ChartCard>
        <ChartCard
          title="Sentiment trend"
          subtitle="Rolling 8-period average · P1 earliest → P8 latest (illustrative)"
          className="lg:col-span-2"
        >
          <TrendArea
            data={trend}
            xKey="period"
            yKey="score"
            name="Avg score"
            color="#7c3aed"
            valueFormatter={(v) => fmtNum(v, 1)}
          />
        </ChartCard>
        <ChartCard title="Top positive drivers" subtitle="Why customers feel good">
          <HorizontalBars data={data.top_positive_drivers} color="#10b981" height={220} />
        </ChartCard>
        <ChartCard title="Top negative drivers" subtitle="Sources of friction" className="lg:col-span-2">
          <HorizontalBars data={data.top_negative_drivers} color="#f43f5e" height={220} />
        </ChartCard>
      </div>
    </section>
  );
}
