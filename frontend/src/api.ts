import type {
  Activity,
  DashboardFilters,
  Demographics,
  DrivingInsights,
  Filters,
  Interactions,
  Insurance,
  Loyalty,
  Role,
  Sentiment,
  Session,
  SegmentsResponse,
  Summary,
  User,
  UsersResponse,
} from "./types";
import { canAccess } from "./permissions";
import type {
  CampaignResult,
  PropensityMeta,
  PropensityUser,
  PropensityUsers,
} from "./propensity/types";

const BASE = "/api";

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra;
}

function toQuery(filters: DashboardFilters, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, String(v));
  }
  for (const [k, v] of Object.entries(extra)) {
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function get<T>(
  path: string,
  filters: DashboardFilters = {},
  extra: Record<string, string | number> = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}${toQuery(filters, extra)}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

export async function login(username: string, password: string): Promise<Session> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Invalid username or password");
  }
  return (await res.json()) as Session;
}

export function logout(): Promise<void> {
  return fetch(`${BASE}/logout`, { method: "POST", headers: authHeaders() })
    .then(() => undefined)
    .catch(() => undefined);
}

export interface DashboardData {
  summary: Summary;
  demographics?: Demographics;
  activity?: Activity;
  interactions?: Interactions;
  driving?: DrivingInsights;
  sentiment?: Sentiment;
  loyalty?: Loyalty;
  insurance?: Insurance;
  segments?: SegmentsResponse;
}

export async function fetchDashboard(
  filters: DashboardFilters,
  role: Role
): Promise<DashboardData> {
  const data: DashboardData = { summary: await get<Summary>("/summary", filters) };
  const jobs: Promise<void>[] = [];

  if (canAccess(role, "demographics")) {
    jobs.push(get<Demographics>("/demographics", filters).then((v) => void (data.demographics = v)));
  }
  if (canAccess(role, "activity")) {
    jobs.push(get<Activity>("/activity", filters).then((v) => void (data.activity = v)));
  }
  if (canAccess(role, "interactions")) {
    jobs.push(get<Interactions>("/interactions", filters).then((v) => void (data.interactions = v)));
  }
  if (canAccess(role, "driving")) {
    jobs.push(get<DrivingInsights>("/driving-insights", filters).then((v) => void (data.driving = v)));
  }
  if (canAccess(role, "sentiment")) {
    jobs.push(get<Sentiment>("/sentiment", filters).then((v) => void (data.sentiment = v)));
  }
  if (canAccess(role, "loyalty")) {
    jobs.push(get<Loyalty>("/loyalty", filters).then((v) => void (data.loyalty = v)));
  }
  if (canAccess(role, "insurance")) {
    jobs.push(get<Insurance>("/insurance", filters).then((v) => void (data.insurance = v)));
  }
  if (canAccess(role, "segments")) {
    jobs.push(
      get<SegmentsResponse>("/segments", filters, { ai: "true" }).then(
        (v) => void (data.segments = v)
      )
    );
  }

  await Promise.all(jobs);
  return data;
}

export function fetchFilters(): Promise<Filters> {
  return get<Filters>("/filters");
}

export function fetchUsers(
  filters: DashboardFilters,
  page: number,
  pageSize: number,
  sort: string,
  order: "asc" | "desc"
): Promise<UsersResponse> {
  return get<UsersResponse>("/users", filters, { page, page_size: pageSize, sort, order });
}

export function fetchUser(id: string): Promise<User> {
  return get<User>(`/users/${id}`);
}

// --- Likelihood to buy + campaign builder -----------------------------------

export function fetchPropensityMeta(): Promise<PropensityMeta> {
  return get<PropensityMeta>("/propensity/meta");
}

export function fetchPropensityUsers(
  filters: DashboardFilters,
  params: { product: string; min_pct: number; group: string; page: number; page_size: number; sort: string }
): Promise<PropensityUsers> {
  return get<PropensityUsers>("/propensity/users", filters, params);
}

export function fetchPropensityUser(id: string): Promise<PropensityUser> {
  return get<PropensityUser>(`/propensity/users/${id}`);
}

export interface CampaignParams {
  product: string;
  group: string;
  channel: string;
  offer: string;
  min_pct: number;
}

export function fetchCampaign(filters: DashboardFilters, params: CampaignParams): Promise<CampaignResult> {
  return get<CampaignResult>("/campaign", filters, { ...params });
}

export async function fetchAudienceCsv(filters: DashboardFilters, params: CampaignParams): Promise<string> {
  const res = await fetch(`${BASE}/campaign/audience.csv${toQuery(filters, { ...params })}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `Request failed: ${res.status} /campaign/audience.csv`);
  return res.text();
}
