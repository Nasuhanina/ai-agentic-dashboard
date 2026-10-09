// Types for the likelihood-to-buy model and campaign builder (backend/app/propensity.py).

export interface Option {
  key: string;
  label: string;
}

export interface RateRow {
  key: string;
  sent: number;
  bought: number;
  rate: number;
}

export interface PropensityMeta {
  available: boolean;
  products: Option[];
  app_download: Option;
  groups: Option[];
  web_groups: Option[];
  channels: string[];
  offers: string[];
  channel_cost: Record<string, number>;
  value_per_sale: Record<string, number>;
  as_of: string;
  history: { by_channel: RateRow[]; by_offer: RateRow[]; by_product: RateRow[] } | null;
}

export interface PropensityRow {
  id: string;
  name: string;
  user_type: string;
  group: string;
  group_label: string;
  product: string;
  product_label: string;
  likelihood: number;
  value_sgd: number;
  expected_sgd: number;
  reachable: boolean;
  reason: string;
  duplicate_of: string | null;
}

export interface PropensityUsers {
  total: number;
  page: number;
  pages: number;
  reachable: number;
  expected_sgd: number;
  items: PropensityRow[];
}

export interface ProductScore {
  key: string;
  label: string;
  likelihood: number;
  value_sgd: number;
  expected_sgd: number;
  why: string[];
}

export interface CampaignTouch {
  date: string;
  product: string;
  channel: string;
  offer: string;
  converted: boolean;
}

export interface PropensityUser {
  id: string;
  name: string;
  group: string;
  group_label: string;
  reachable: boolean;
  duplicate_of: string | null;
  is_web: boolean;
  marketing_consent: boolean;
  push_enabled: boolean;
  campaigns: CampaignTouch[];
  products: ProductScore[];
}

export interface CampaignResult {
  product: string;
  product_label: string;
  group: string;
  channel: string;
  offer: string;
  min_pct: number;
  audience: number;
  expected_sales: number;
  revenue_sgd: number;
  cost_sgd: number;
  net_sgd: number;
  channel_factor: number;
  offer_factor: number;
  items: PropensityRow[];
}
