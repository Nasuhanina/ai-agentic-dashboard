import type { Demographics } from "../../types";
import { ChartCard } from "../ui";
import { HorizontalBars, VerticalBars } from "../charts";
import { fmtNum } from "../../lib/format";

export function DemographicsSection({ data }: { data: Demographics }) {
  return (
    <section>
      <SectionHeading
        title="Demographics"
        subtitle={`${fmtNum(data.total)} customers · avg age ${data.avg_age} · avg household ${data.avg_household_size}`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Age distribution" subtitle="Customers by age band">
          <VerticalBars data={data.age_bands} color="#4f46e5" />
        </ChartCard>
        <ChartCard title="Gender split" subtitle="Customer self-reported gender">
          <VerticalBars
            data={data.gender}
            colorMap={{ Male: "#4f46e5", Female: "#ec4899", Other: "#14b8a6" }}
          />
        </ChartCard>
        <ChartCard title="Housing type" subtitle="Customer housing type">
          <HorizontalBars data={data.income} color="#0ea5e9" height={240} labelWidth={170} />
        </ChartCard>
        <ChartCard title="Top regions" subtitle="Customers per planning area" className="lg:col-span-1">
          <HorizontalBars data={data.regions.slice(0, 6)} color="#7c3aed" />
        </ChartCard>
        <ChartCard title="Life stage" subtitle="Customer life stage" className="lg:col-span-2">
          <HorizontalBars data={data.occupation.slice(0, 8)} color="#14b8a6" height={260} />
        </ChartCard>
      </div>
    </section>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 mt-2 flex items-baseline gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
      {subtitle && <span className="text-xs text-ink-500">{subtitle}</span>}
    </div>
  );
}
