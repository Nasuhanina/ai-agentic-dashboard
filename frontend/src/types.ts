export interface DistItem {
  label: string;
  value: number;
  pct: number;
}

export interface Summary {
  total_users: number;
  active_users: number;
  active_pct: number;
  follow_up_due: number;
  follow_up_due_pct: number;
  avg_tenure_days: number;
  avg_tenure_years: number;
  avg_days_since_login: number;
  avg_csat: number;
  avg_driving_score: number;
  avg_loyalty_points: number;
  positive_pct: number;
  negative_pct: number;
  net_sentiment: number;
}

export interface Demographics {
  total: number;
  age_bands: DistItem[];
  gender: DistItem[];
  income: DistItem[];
  regions: DistItem[];
  occupation: DistItem[];
  avg_age: number;
  avg_household_size: number;
}

export interface Activity {
  status: DistItem[];
  platform: DistItem[];
  avg_session_minutes: number;
  avg_sessions_per_week: number;
  avg_logins_30d: number;
  avg_days_since_login: number;
  tenure_buckets: DistItem[];
  login_recency: DistItem[];
}

export interface Interactions {
  channel: DistItem[];
  type: DistItem[];
  total_interactions: number;
  avg_interactions: number;
  open_tickets_total: number;
  avg_csat: number;
  follow_up_due: number;
  avg_days_since_follow_up: number;
  follow_up_recency: DistItem[];
}

export interface DrivingInsights {
  avg_driving_score: number;
  avg_trips_30d: number;
  avg_total_km_30d: number;
  avg_trip_distance_km: number;
  avg_trip_duration_min: number;
  avg_night_driving_pct: number;
  total_km_30d: number;
  harsh_braking_total: number;
  harsh_acceleration_total: number;
  speeding_total: number;
  phone_usage_total: number;
  transport_modes: DistItem[];
  driving_score_bands: DistItem[];
}

export interface Sentiment {
  distribution: DistItem[];
  avg_score: number;
  trend: { index: number; score: number }[];
  top_positive_drivers: { label: string; value: number }[];
  top_negative_drivers: { label: string; value: number }[];
}

export interface Loyalty {
  tier_distribution: DistItem[];
  total_points: number;
  avg_points: number;
  points_earned_30d: number;
  points_redeemed_30d: number;
  net_points_30d: number;
  trend: { month: string; points: number }[];
  tier_by_sentiment: {
    columns: string[];
    rows: { row: string; values: DistItem[] }[];
  };
}

export interface Segment {
  key: string;
  label: string;
  criteria: string;
  recommendation: string;
  recommendation_source?: "opencode" | "deepseek" | "default";
  detail?: string;
  count: number;
  pct: number;
  members: { id: string; name: string }[];
}

export interface SegmentsResponse {
  total: number;
  segments: Segment[];
  recommendation_source?: "opencode" | "deepseek" | "default";
}

export interface ValueCount {
  label: string;
  value: number;
  count: number;
}

export interface Insurance {
  total: number;
  insured: number;
  insured_pct: number;
  avg_premium: number;
  median_premium: number;
  total_premium: number;
  platform_share_pct: number;
  claim_rate_pct: number;
  avg_claims: number;
  avg_ncd: number;
  value_at_stake: number;
  expiring_90: number;
  premium_bands: DistItem[];
  premium_by_segment: ValueCount[];
  insurer_mix: DistItem[];
  ncd_distribution: DistItem[];
  claims_distribution: DistItem[];
  renewal_pipeline: DistItem[];
  risk_cohorts: ValueCount[];
  ev_vs_ice: { ev: number; ice: number };
}

export interface Filters {
  cities: string[];
  sentiments: string[];
  tiers: string[];
  activity_statuses: string[];
  genders: string[];
  user_types: string[];
}

export interface PointsTrendPoint {
  month: string;
  points: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_seed: number;
  user_type: string;
  age: number;
  age_band: string;
  gender: string;
  occupation: string;
  income_band: string;
  city: string;
  region: string;
  household_size: number;
  tenure_days: number;
  tenure_start: string;
  last_login: string;
  days_since_last_login: number;
  logins_30d: number;
  sessions_per_week: number;
  avg_session_minutes: number;
  platform: string;
  app_version: string;
  activity_status: string;
  total_interactions: number;
  last_follow_up: string;
  days_since_follow_up: number;
  last_interaction_channel: string;
  last_interaction_type: string;
  open_tickets: number;
  satisfaction_csat: number;
  follow_up_needed: boolean;
  driving_score: number;
  trips_30d: number;
  total_km_30d: number;
  avg_trip_distance_km: number;
  avg_trip_duration_min: number;
  night_driving_pct: number;
  harsh_braking_30d: number;
  harsh_acceleration_30d: number;
  speeding_30d: number;
  phone_usage_events_30d: number;
  primary_transport_mode: string;
  transport_mode_mix: Record<string, number>;
  sentiment: string;
  sentiment_score: number;
  sentiment_trend: number[];
  sentiment_drivers: string[];
  loyalty_points: number;
  loyalty_tier: string;
  points_earned_30d: number;
  points_redeemed_30d: number;
  points_trend: PointsTrendPoint[];
  next_tier_points: number;
}

export interface UsersResponse {
  total: number;
  page: number;
  page_size: number;
  pages: number;
  items: User[];
}

export interface DashboardFilters {
  city?: string;
  sentiment?: string;
  tier?: string;
  activity_status?: string;
  gender?: string;
  user_type?: string;
  age_band?: string;
  housing_type?: string;
  life_stage?: string;
  platform?: string;
  segment?: string;
  search?: string;
}

export type Role = "admin" | "customer";

export interface Session {
  token: string;
  role: Role;
  username: string;
  name: string;
}
