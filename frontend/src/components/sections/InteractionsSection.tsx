import type { Interactions } from "../../types";
import { ChartCard, StatRow } from "../ui";
import { Donut, HorizontalBars, VerticalBars } from "../charts";
import { SectionHeading } from "./DemographicsSection";
import { fmtNum } from "../../lib/format";
import { useDashboard } from "../../context/DashboardContext";

export function InteractionsSection({ data }: { data: Interactions }) {
  const { filters, toggleFilter } = useDashboard();
  return (
    <section>
      <SectionHeading
        title="Platform & CSO interactions"
        subtitle="Contact history and follow-up status"
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Last contact channel" subtitle="How customers last reached out">
          <Donut
            data={data.channel}
            height={240}
            onSelect={(label) => toggleFilter("channel", label)}
            selected={filters.channel}
          />
        </ChartCard>
        <ChartCard title="Interaction type" subtitle="Reason for latest interaction" className="lg:col-span-2">
          <HorizontalBars
            data={data.type.slice(0, 7)}
            color="#f59e0b"
            height={240}
            onSelect={(label) => toggleFilter("interaction_type", label)}
            selected={filters.interaction_type}
          />
        </ChartCard>
        <ChartCard title="Follow-up recency" subtitle="Days since last follow-up">
          <VerticalBars
            data={data.follow_up_recency}
            color="#f43f5e"
            onSelect={(label) => toggleFilter("follow_up_recency", label)}
            selected={filters.follow_up_recency}
          />
        </ChartCard>
        <ChartCard title="Service metrics" subtitle="Across filtered customers" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-8">
            <StatRow label="Total interactions" value={fmtNum(data.total_interactions)} />
            <StatRow label="Avg interactions / customer" value={fmtNum(data.avg_interactions, 1)} />
            <StatRow label="Open tickets" value={fmtNum(data.open_tickets_total)} />
            <StatRow label="Avg CSAT" value={`${fmtNum(data.avg_csat, 2)} / 5`} />
            <StatRow label="Follow-ups due" value={fmtNum(data.follow_up_due)} accent="text-rose-600" />
            <StatRow label="Avg days since follow-up" value={`${fmtNum(data.avg_days_since_follow_up, 0)} days`} />
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
