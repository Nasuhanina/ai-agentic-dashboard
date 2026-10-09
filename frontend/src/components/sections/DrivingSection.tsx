import type { DrivingInsights } from "../../types";
import { ChartCard } from "../ui";
import { Donut, HorizontalBars, VerticalBars } from "../charts";
import { SectionHeading } from "./DemographicsSection";
import { fmtCompact, fmtNum } from "../../lib/format";

export function DrivingSection({ data }: { data: DrivingInsights }) {
  const events = [
    { label: "Harsh braking", value: data.harsh_braking_total },
    { label: "Harsh accel.", value: data.harsh_acceleration_total },
    { label: "Speeding", value: data.speeding_total },
    { label: "Phone usage", value: data.phone_usage_total },
  ];

  return (
    <section>
      <SectionHeading
        title="Driving insights"
        subtitle="Derived from Sentiance SDK telemetry (last 30 days)"
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Driving score bands" subtitle="Behaviour score out of 100">
          <VerticalBars data={data.driving_score_bands} color="#4f46e5" />
        </ChartCard>
        <ChartCard title="Vehicle segment" subtitle="Dominant segment per customer">
          <Donut data={data.transport_modes} height={240} />
        </ChartCard>
        <ChartCard title="Safety events (30d)" subtitle="Total risky-driving events">
          <HorizontalBars data={events} color="#f43f5e" height={240} />
        </ChartCard>
        <ChartCard title="Mobility averages" subtitle="Per customer, per month" className="lg:col-span-3">
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Avg driving score" value={fmtNum(data.avg_driving_score, 1)} unit="/100" />
            <Metric label="Avg trips" value={fmtNum(data.avg_trips_30d, 0)} unit="per 30d" />
            <Metric label="Avg distance" value={fmtNum(data.avg_total_km_30d, 0)} unit="km / 30d" />
            <Metric label="Avg trip length" value={fmtNum(data.avg_trip_distance_km, 1)} unit="km" />
            <Metric label="Avg night driving" value={fmtNum(data.avg_night_driving_pct, 0)} unit="%" />
            <Metric label="Fleet distance" value={fmtCompact(data.total_km_30d)} unit="km total" />
            <Metric
              label="Avg trip duration (est.)"
              value={data.avg_trip_duration_min ? fmtNum(data.avg_trip_duration_min, 1) : "—"}
              unit={data.avg_trip_duration_min ? "min" : ""}
            />
          </div>
        </ChartCard>
      </div>
    </section>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border-b border-ink-100 py-2 lg:border-0">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink-900">
        {value}
        <span className="ml-1 text-xs font-normal text-ink-400">{unit}</span>
      </div>
    </div>
  );
}
