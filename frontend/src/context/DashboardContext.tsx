import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ApiError,
  fetchDashboard,
  fetchFilters,
  fetchUser,
  fetchUsers,
  logout as apiLogout,
  setAuthToken,
} from "../api";
import type { DashboardData } from "../api";
import type { DashboardFilters, Filters, Session, User, UsersResponse } from "../types";
import { canAccess } from "../permissions";

const STORAGE_KEY = "cis.session";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed.role !== "admin" && parsed.role !== "customer") return null;
    return parsed;
  } catch {
    return null;
  }
}

interface DashboardContextValue {
  session: Session | null;
  login: (session: Session) => void;
  handleLogout: () => void;

  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  toggleFilter: (key: keyof DashboardFilters, value: string) => void;
  options: Filters | null;
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  can: (section: Parameters<typeof canAccess>[1]) => boolean;

  usersData: UsersResponse | null;
  usersLoading: boolean;
  page: number;
  setPage: (page: number) => void;
  sort: string;
  order: "asc" | "desc";
  onSort: (key: string) => void;
  selectedUser: User | null;
  userLoading: boolean;
  selectUser: (id: string | null) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [options, setOptions] = useState<Filters | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [usersData, setUsersData] = useState<UsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("loyalty_points");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const login = useCallback((s: Session) => setSession(s), []);

  const toggleFilter = useCallback((key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  }, []);

  const handleLogout = useCallback(() => {
    apiLogout();
    setSession(null);
    setFilters({});
    setOptions(null);
    setData(null);
    setUsersData(null);
    setSelectedId(null);
    setSelectedUser(null);
  }, []);

  useEffect(() => {
    setAuthToken(session?.token ?? null);
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchFilters().then(setOptions).catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    fetchDashboard(filters, session.role)
      .then((d) => active && setData(d))
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) handleLogout();
        else setError(String(e));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, session, handleLogout]);

  useEffect(() => {
    if (!session || !canAccess(session.role, "users")) {
      setUsersData(null);
      return;
    }
    let active = true;
    setUsersLoading(true);
    fetchUsers(filters, page, 15, sort, order)
      .then((d) => active && setUsersData(d))
      .catch(() => {})
      .finally(() => active && setUsersLoading(false));
    return () => {
      active = false;
    };
  }, [filters, page, sort, order, session]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedUser(null);
      setUserLoading(false);
      return;
    }
    let active = true;
    setUserLoading(true);
    setSelectedUser(null);
    fetchUser(selectedId)
      .then((u) => active && setSelectedUser(u))
      .catch(() => {})
      .finally(() => active && setUserLoading(false));
    return () => {
      active = false;
    };
  }, [selectedId]);

  const onSort = useCallback(
    (key: string) => {
      if (key === sort) {
        setOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSort(key);
        setOrder("desc");
      }
    },
    [sort]
  );

  const can = useCallback(
    (section: Parameters<typeof canAccess>[1]) =>
      session ? canAccess(session.role, section) : false,
    [session]
  );

  const value: DashboardContextValue = {
    session,
    login,
    handleLogout,
    filters,
    setFilters,
    toggleFilter,
    options,
    data,
    loading,
    error,
    can,
    usersData,
    usersLoading,
    page,
    setPage,
    sort,
    order,
    onSort,
    selectedUser,
    userLoading,
    selectUser: setSelectedId,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}
