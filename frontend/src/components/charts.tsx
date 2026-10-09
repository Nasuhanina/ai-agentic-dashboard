import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForLabel, SENTIMENT_COLORS } from "../lib/colors";
import { fmtCompact, fmtNum } from "../lib/format";
import { EmptyState } from "./ui";

const AXIS = { fontSize: 11, fill: "#62799a" };

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-semibold text-ink-700">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-ink-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span>{p.name}:</span>
          <span className="font-medium text-ink-900">{fmtNum(p.value, Number.isInteger(p.value) ? 0 : 2)}</span>
        </div>
      ))}
    </div>
  );
}

export interface Datum {
  label: string;
  value: number;
}

export function VerticalBars({
  data,
  colorMap,
  color = "#4f46e5",
  height = 240,
  name = "Users",
}: {
  data: Datum[];
  colorMap?: Record<string, string>;
  color?: string;
  height?: number;
  name?: string;
}) {
  if (!data.length) return <EmptyState message="No data" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeef4" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        <Bar dataKey="value" name={name} radius={[4, 4, 0, 0]} maxBarSize={46}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={colorForLabel(d.label, i, colorMap) ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({
  data,
  colorMap,
  height = 260,
  name = "Users",
  color = "#4f46e5",
  labelWidth = 110,
}: {
  data: Datum[];
  colorMap?: Record<string, string>;
  height?: number;
  name?: string;
  color?: string;
  labelWidth?: number;
}) {
  if (!data.length) return <EmptyState message="No data" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eaeef4" />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={labelWidth}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        <Bar dataKey="value" name={name} radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={colorForLabel(d.label, i, colorMap) ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data,
  colorMap,
  height = 240,
  centerLabel,
}: {
  data: Datum[];
  colorMap?: Record<string, string>;
  height?: number;
  centerLabel?: { value: string; caption: string };
}) {
  if (!data.length || data.every((d) => d.value === 0)) return <EmptyState message="No data" />;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={d.label} fill={colorForLabel(d.label, i, colorMap)} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-ink-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
          <div className="text-2xl font-semibold text-ink-900">{centerLabel.value}</div>
          <div className="text-xs text-ink-500">{centerLabel.caption}</div>
        </div>
      )}
    </div>
  );
}

export function TrendArea({
  data,
  xKey,
  yKey,
  height = 240,
  color = "#4f46e5",
  name = "Points",
  valueFormatter = (v: number) => fmtCompact(v),
}: {
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  name?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (!data.length) return <EmptyState message="No data" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeef4" />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v) => valueFormatter(v as number)}
        />
        <Tooltip content={<TooltipBox />} />
        <Area
          type="monotone"
          dataKey={yKey}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#grad-${yKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SentimentSparkline({
  data,
  height = 50,
  color = "#4f46e5",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
        <YAxis domain={[-1, 1]} hide />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StackedTierBars({
  columns,
  rows,
  height = 260,
}: {
  columns: string[];
  rows: { row: string; values: Datum[] }[];
  height?: number;
}) {
  if (!rows.length) return <EmptyState message="No data" />;
  const data = rows.map((r) => {
    const base: Record<string, any> = { row: r.row };
    r.values.forEach((v) => (base[v.label] = v.value));
    return base;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeef4" />
        <XAxis dataKey="row" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-ink-600">{value}</span>}
        />
        {columns.map((c) => (
          <Bar key={c} dataKey={c} name={c} stackId="a" fill={SENTIMENT_COLORS[c] ?? "#4f46e5"} maxBarSize={46} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
