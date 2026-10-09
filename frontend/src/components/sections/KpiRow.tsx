import type { Summary } from "../../types";
import { fmtCompact, fmtNum } from "../../lib/format";
import { KpiCard } from "../ui";

export function KpiRow({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Total customers"
        value={fmtNum(summary.total_users)}
        sub={`${fmtNum(summary.active_users)} active (${summary.active_pct}%)`}
        tone="indigo"
        icon={<IconUsers />}
      />
      <KpiCard
        label="Avg tenure"
        value={`${summary.avg_tenure_years} yr`}
        sub={`${fmtNum(summary.avg_tenure_days)} days since signup`}
        tone="violet"
        icon={<IconClock />}
      />
      <KpiCard
        label="Avg days since login"
        value={fmtNum(summary.avg_days_since_login, 1)}
        sub="Last login recency"
        tone="sky"
        icon={<IconLogin />}
      />
      <KpiCard
        label="Follow-ups due"
        value={fmtNum(summary.follow_up_due)}
        sub={`${summary.follow_up_due_pct}% of base need contact`}
        tone="amber"
        icon={<IconBell />}
      />
      <KpiCard
        label="Avg CSAT"
        value={`${summary.avg_csat} / 5`}
        sub="From last interaction"
        tone="emerald"
        icon={<IconStar />}
      />
      <KpiCard
        label="Avg driving score"
        value={fmtNum(summary.avg_driving_score, 1)}
        sub="Sentiance SDK / 100"
        tone="indigo"
        icon={<IconCar />}
      />
      <KpiCard
        label="Net positive sentiment (%)"
        value={`${summary.net_sentiment > 0 ? "+" : ""}${summary.net_sentiment}`}
        sub={`${summary.positive_pct}% pos · ${summary.negative_pct}% neg`}
        tone={summary.net_sentiment >= 0 ? "emerald" : "rose"}
        icon={<IconHeart />}
      />
      <KpiCard
        label="Avg loyalty points"
        value={fmtCompact(summary.avg_loyalty_points)}
        sub="Per customer balance"
        tone="amber"
        icon={<IconGift />}
      />
    </div>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconLogin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}
function IconCar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 17h14M6 17l-1.5-5.5a2 2 0 0 1 1.9-2.5h11.2a2 2 0 0 1 1.9 2.5L18 17M6 17v2M18 17v2M7.5 11.5h9" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
function IconGift() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
    </svg>
  );
}
