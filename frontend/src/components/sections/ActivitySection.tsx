import type { Activity } from "../../types";
import { ChartCard, StatRow } from "../ui";
import { Donut, VerticalBars } from "../charts";
import { STATUS_COLORS } from "../../lib/colors";
import { SectionHeading } from "./DemographicsSection";
import { fmtNum } from "../../lib/format";

export function ActivitySection({ data }: { data: Activity }) {
  return (
    <section>
      <SectionHeading title="In-app activity" subtitle="Tenure, sessions and login recency" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Activity status" subtitle="Based on last login recency">
          <Donut
            data={data.status}
            colorMap={STATUS_COLORS}
            centerLabel={{ value: `${data.status[0]?.pct ?? 0}%`, caption: data.status[0]?.label ?? "" }}
          />
        </ChartCard>
        <ChartCard title="Login recency" subtitle="Days since last login">
          <VerticalBars data={data.login_recency} color="#0ea5e9" />
        </ChartCard>
        <ChartCard title="Tenure cohorts" subtitle="Length of relationship">
          <VerticalBars data={data.tenure_buckets} color="#7c3aed" />
        </ChartCard>
        <ChartCard title="Platform" subtitle="Device split">
          <Donut data={data.platform} colorMap={{ iOS: "#4f46e5", Android: "#14b8a6" }} height={220} />
        </ChartCard>
        <ChartCard title="Engagement metrics" subtitle="Averages per customer" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-8">
            <StatRow label="Avg sessions / week" value={fmtNum(data.avg_sessions_per_week, 1)} />
            <StatRow label="Avg session length" value={data.avg_session_minutes ? `${fmtNum(data.avg_session_minutes, 1)} min` : "—"} />
            <StatRow label="Avg logins (30d)" value={fmtNum(data.avg_logins_30d, 1)} />
            <StatRow label="Avg days since login" value={fmtNum(data.avg_days_since_login, 1)} />
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
