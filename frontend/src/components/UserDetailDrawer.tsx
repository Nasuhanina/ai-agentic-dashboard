import { useEffect } from "react";
import type { User } from "../types";
import { SENTIMENT_BADGE, STATUS_BADGE, TIER_COLORS } from "../lib/colors";
import { fmtCompact, fmtDate, fmtNum, fmtRelativeDays } from "../lib/format";
import { SentimentSparkline, TrendArea } from "./charts";
import { ProgressBar, StatRow } from "./ui";

export function UserDetailDrawer({
  user,
  loading,
  onClose,
}: {
  user: User | null;
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = loading || !!user;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-ink-900/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {loading || !user ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-400">Loading…</div>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-ink-100 p-5">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: TIER_COLORS[user.loyalty_tier] }}
                >
                  {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">{user.name}</h2>
                  <p className="text-xs text-ink-500">
                    {user.id} · {user.email}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`chip ${SENTIMENT_BADGE[user.sentiment]}`}>{user.sentiment}</span>
                    <span className={`chip ${STATUS_BADGE[user.activity_status]}`}>{user.activity_status}</span>
                    <span
                      className="chip"
                      style={{ backgroundColor: `${TIER_COLORS[user.loyalty_tier]}1a`, color: TIER_COLORS[user.loyalty_tier] }}
                    >
                      {user.loyalty_tier} member
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg border border-ink-200 p-1.5 text-ink-500 transition hover:bg-ink-50"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <DetailBlock title="Demographics">
                <StatRow label="Age" value={`${user.age} (${user.age_band})`} />
                <StatRow label="Gender" value={user.gender} />
                <StatRow label="Occupation" value={user.occupation} />
                <StatRow label="Income band" value={user.income_band} />
                <StatRow label="Location" value={`${user.city} · ${user.region}`} />
                <StatRow label="Household size" value={String(user.household_size)} />
              </DetailBlock>

              <DetailBlock title="In-app activity">
                <StatRow label="Tenure" value={`${fmtNum(user.tenure_days)} days (${(user.tenure_days / 365).toFixed(1)} yr)`} />
                <StatRow label="Member since" value={fmtDate(user.tenure_start)} />
                <StatRow label="Last login" value={`${fmtDate(user.last_login)} · ${fmtRelativeDays(user.days_since_last_login)}`} />
                <StatRow label="Sessions / week" value={fmtNum(user.sessions_per_week, 1)} />
                <StatRow label="Avg session" value={`${fmtNum(user.avg_session_minutes, 1)} min`} />
                <StatRow label="Logins (30d)" value={fmtNum(user.logins_30d)} />
                <StatRow label="Platform / version" value={`${user.platform} · v${user.app_version}`} />
              </DetailBlock>

              <DetailBlock title="Platform & CSO interactions">
                <StatRow label="Total interactions" value={fmtNum(user.total_interactions)} />
                <StatRow
                  label="Last follow-up"
                  value={`${fmtDate(user.last_follow_up)} · ${fmtRelativeDays(user.days_since_follow_up)}`}
                  accent={user.follow_up_needed ? "text-rose-600" : undefined}
                />
                <StatRow label="Last channel" value={user.last_interaction_channel} />
                <StatRow label="Last interaction" value={user.last_interaction_type} />
                <StatRow label="Open tickets" value={fmtNum(user.open_tickets)} />
                <StatRow label="CSAT" value={`${user.satisfaction_csat.toFixed(1)} / 5`} />
                {user.follow_up_needed && (
                  <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    Follow-up recommended — no recent contact or open tickets.
                  </div>
                )}
              </DetailBlock>

              <DetailBlock title="Driving insights (Sentiance SDK)">
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                    <span>Driving score</span>
                    <span className="font-semibold text-ink-800">{user.driving_score} / 100</span>
                  </div>
                  <ProgressBar pct={user.driving_score} color={user.driving_score >= 70 ? "#10b981" : "#f59e0b"} />
                </div>
                <StatRow label="Trips (30d)" value={fmtNum(user.trips_30d)} />
                <StatRow label="Distance (30d)" value={`${fmtNum(user.total_km_30d, 1)} km`} />
                <StatRow label="Avg trip" value={`${fmtNum(user.avg_trip_distance_km, 1)} km · ${fmtNum(user.avg_trip_duration_min, 1)} min`} />
                <StatRow label="Night driving" value={`${fmtNum(user.night_driving_pct, 1)}%`} />
                <StatRow label="Primary mode" value={user.primary_transport_mode} />
                <StatRow
                  label="Harsh events"
                  value={`${user.harsh_braking_30d} brake · ${user.harsh_acceleration_30d} accel`}
                />
                <StatRow label="Speeding / phone use" value={`${user.speeding_30d} · ${user.phone_usage_events_30d}`} />
              </DetailBlock>

              <DetailBlock title="Inferred sentiment">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-ink-500">Score</span>
                  <span className="text-sm font-semibold text-ink-900">{user.sentiment_score}</span>
                </div>
                <SentimentSparkline
                  data={user.sentiment_trend}
                  color={user.sentiment === "Negative" ? "#f43f5e" : user.sentiment === "Positive" ? "#10b981" : "#f59e0b"}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.sentiment_drivers.map((d) => (
                    <span key={d} className="chip bg-ink-100 text-ink-600">
                      {d}
                    </span>
                  ))}
                </div>
              </DetailBlock>

              <DetailBlock title="Loyalty points">
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                    <span>Balance · {user.loyalty_tier}</span>
                    <span className="font-semibold text-ink-800">{fmtCompact(user.loyalty_points)} pts</span>
                  </div>
                  <ProgressBar
                    pct={Math.min(100, (user.loyalty_points / user.next_tier_points) * 100)}
                    color={TIER_COLORS[user.loyalty_tier]}
                  />
                  <p className="mt-1 text-[11px] text-ink-400">
                    {user.loyalty_points >= user.next_tier_points
                      ? "Top tier reached"
                      : `${fmtNum(Math.max(0, user.next_tier_points - user.loyalty_points))} pts to next tier`}
                  </p>
                </div>
                <StatRow label="Earned (30d)" value={fmtNum(user.points_earned_30d)} accent="text-emerald-600" />
                <StatRow label="Redeemed (30d)" value={fmtNum(user.points_redeemed_30d)} accent="text-rose-600" />
                <div className="mt-3">
                  <TrendArea
                    data={user.points_trend}
                    xKey="month"
                    yKey="points"
                    height={160}
                    color={TIER_COLORS[user.loyalty_tier]}
                    name="Points"
                  />
                </div>
              </DetailBlock>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</h3>
      {children}
    </div>
  );
}
