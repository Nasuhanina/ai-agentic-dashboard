import type { SectionKey } from "./permissions";

export interface NavChild {
  key: string;
  label: string;
  path: string;
}

export interface NavItem {
  key: "overview" | SectionKey;
  label: string;
  path: string;
  children?: NavChild[];
}

export const SEGMENT_CHILDREN: NavChild[] = [
  { key: "high_spenders", label: "High spenders", path: "/segments/high_spenders" },
  { key: "occasional", label: "Occasional visitors", path: "/segments/occasional" },
  { key: "at_risk", label: "At risk of churn", path: "/segments/at_risk" },
  { key: "new_users", label: "New users", path: "/segments/new_users" },
  { key: "phv_drivers", label: "Private-hire drivers", path: "/segments/phv_drivers" },
  { key: "multi_vehicle", label: "Multi-vehicle owners", path: "/segments/multi_vehicle" },
  { key: "web_unregistered", label: "Unregistered web users", path: "/segments/web_unregistered" },
  { key: "insurance_renewal_due", label: "Insurance renewal due", path: "/segments/insurance_renewal_due" },
  { key: "ev_owners", label: "EV owners", path: "/segments/ev_owners" },
  { key: "high_mileage_drivers", label: "High-mileage drivers", path: "/segments/high_mileage_drivers" },
];

export const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", path: "/" },
  { key: "demographics", label: "Demographics", path: "/demographics" },
  { key: "activity", label: "In-app activity", path: "/activity" },
  { key: "interactions", label: "Interactions", path: "/interactions" },
  { key: "driving", label: "Driving insights", path: "/driving" },
  { key: "sentiment", label: "Sentiment", path: "/sentiment" },
  { key: "loyalty", label: "Loyalty", path: "/loyalty" },
  { key: "insurance", label: "Insurance insights", path: "/insurance" },
  { key: "segments", label: "Segments", path: "/segments", children: SEGMENT_CHILDREN },
  { key: "likelihood", label: "Likelihood to buy", path: "/likelihood" },
  { key: "campaign", label: "Campaign builder", path: "/campaign" },
  { key: "users", label: "Customers", path: "/customers" },
];
