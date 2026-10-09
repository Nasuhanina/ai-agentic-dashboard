import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { DashboardProvider, useDashboard } from "./context/DashboardContext";
import type { SectionKey } from "./permissions";
import { LoginScreen } from "./components/LoginScreen";
import { Sidebar, MobileNav } from "./components/Sidebar";
import { FilterBar } from "./components/FilterBar";
import { KpiRow } from "./components/sections/KpiRow";
import { DemographicsSection } from "./components/sections/DemographicsSection";
import { ActivitySection } from "./components/sections/ActivitySection";
import { InteractionsSection } from "./components/sections/InteractionsSection";
import { DrivingSection } from "./components/sections/DrivingSection";
import { SentimentSection } from "./components/sections/SentimentSection";
import { LoyaltySection } from "./components/sections/LoyaltySection";
import { InsuranceSection } from "./components/sections/InsuranceSection";
import { SegmentsSection } from "./components/sections/SegmentsSection";
import { UserTable } from "./components/UserTable";
import { UserDetailDrawer } from "./components/UserDetailDrawer";
import { Skeleton } from "./components/ui";

export default function App() {
  return (
    <DashboardProvider>
      <Shell />
    </DashboardProvider>
  );
}

function Shell() {
  const { session, login } = useDashboard();
  if (!session) return <LoginScreen onLogin={login} />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="demographics" element={<DemographicsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route
          path="interactions"
          element={
            <Guarded section="interactions">
              <InteractionsPage />
            </Guarded>
          }
        />
        <Route path="driving" element={<DrivingPage />} />
        <Route
          path="sentiment"
          element={
            <Guarded section="sentiment">
              <SentimentPage />
            </Guarded>
          }
        />
        <Route path="loyalty" element={<LoyaltyPage />} />
        <Route
          path="insurance"
          element={
            <Guarded section="insurance">
              <InsurancePage />
            </Guarded>
          }
        />
        <Route
          path="segments"
          element={
            <Guarded section="segments">
              <SegmentsPage />
            </Guarded>
          }
        />
        <Route
          path="segments/:segmentKey"
          element={
            <Guarded section="segments">
              <SegmentsPage />
            </Guarded>
          }
        />
        <Route
          path="customers"
          element={
            <Guarded section="users">
              <CustomersPage />
            </Guarded>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Guarded({ section, children }: { section: SectionKey; children: ReactNode }) {
  const { can } = useDashboard();
  return can(section) ? <>{children}</> : <Navigate to="/" replace />;
}

function Layout() {
  const {
    session,
    handleLogout,
    filters,
    setFilters,
    options,
    loading,
    error,
    can,
    selectedUser,
    userLoading,
    selectUser,
    data,
  } = useDashboard();

  if (!session) return null;

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <path d="M4 20l5-11 5 7 3-4 3 8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-ink-900">
                Customer Insights Dashboard
              </h1>
              <p className="text-xs text-ink-500">Mobility &amp; insurance analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-ink-400 sm:block">
              <div>Data as of 09 Oct 2026</div>
              <div>{data ? data.summary.total_users.toLocaleString() : "…"} customers</div>
            </div>
            <span className="chip bg-indigo-50 capitalize text-indigo-700 ring-1 ring-indigo-200">
              {session.role}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-6 py-6">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <div className="lg:hidden">
            <MobileNav />
          </div>

          <div className="card p-4">
            <FilterBar
              options={options}
              value={filters}
              onChange={setFilters}
              onReset={() => setFilters({})}
              loading={loading}
            />
          </div>

          {session.role === "customer" && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
              Customer view — CSO interactions, sentiment analysis and the customer explorer are
              restricted to admins.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}. Make sure the backend is running on <code>http://localhost:8000</code>.
            </div>
          )}

          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Outlet />
          </div>

          <footer className="pb-6 text-center text-xs text-ink-400">
            Customer Insights Dashboard · FastAPI + React · customer360 sample data
          </footer>
        </main>
      </div>

      {can("users") && (
        <UserDetailDrawer
          user={selectedUser}
          loading={userLoading}
          onClose={() => selectUser(null)}
        />
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function OverviewPage() {
  const { data } = useDashboard();
  if (!data) return <PageSkeleton />;
  return <KpiRow summary={data.summary} />;
}

function DemographicsPage() {
  const { data } = useDashboard();
  if (!data?.demographics) return <PageSkeleton />;
  return <DemographicsSection data={data.demographics} />;
}

function ActivityPage() {
  const { data } = useDashboard();
  if (!data?.activity) return <PageSkeleton />;
  return <ActivitySection data={data.activity} />;
}

function InteractionsPage() {
  const { data } = useDashboard();
  if (!data?.interactions) return <PageSkeleton />;
  return <InteractionsSection data={data.interactions} />;
}

function DrivingPage() {
  const { data } = useDashboard();
  if (!data?.driving) return <PageSkeleton />;
  return <DrivingSection data={data.driving} />;
}

function SentimentPage() {
  const { data } = useDashboard();
  if (!data?.sentiment) return <PageSkeleton />;
  return <SentimentSection data={data.sentiment} />;
}

function LoyaltyPage() {
  const { data } = useDashboard();
  if (!data?.loyalty) return <PageSkeleton />;
  return <LoyaltySection data={data.loyalty} />;
}

function SegmentsPage() {
  const { data } = useDashboard();
  const { segmentKey } = useParams();
  if (!data?.segments) return <PageSkeleton />;
  return <SegmentsSection data={data.segments} focus={segmentKey} />;
}

function InsurancePage() {
  const { data } = useDashboard();
  if (!data?.insurance) return <PageSkeleton />;
  return <InsuranceSection data={data.insurance} />;
}

function CustomersPage() {
  const { usersData, usersLoading, sort, order, page, onSort, setPage, selectUser, filters } =
    useDashboard();
  return (
    <UserTable
      data={usersData}
      loading={usersLoading}
      sort={sort}
      order={order}
      page={page}
      onSort={onSort}
      onPage={setPage}
      onSelect={selectUser}
      filters={filters}
    />
  );
}
