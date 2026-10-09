import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../nav";
import type { SectionKey } from "../permissions";
import { useDashboard } from "../context/DashboardContext";

export function Sidebar() {
  const { can } = useDashboard();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of NAV_ITEMS) {
        if (item.children && location.pathname.startsWith(item.path)) {
          next[item.key] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

  const items = NAV_ITEMS.filter((item) => item.key === "overview" || can(item.key as SectionKey));
  const toggle = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-20 space-y-1">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
          Insight areas
        </p>
        {items.map((item) => (
          <div key={item.key}>
            <div className="flex items-center">
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
              {item.children && (
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  aria-label={openGroups[item.key] ? "Collapse" : "Expand"}
                  className="ml-1 rounded-md p-1.5 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className={`transition-transform ${openGroups[item.key] ? "rotate-90" : ""}`}
                  >
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {item.children && openGroups[item.key] && (
              <div className="mb-1 ml-3 mt-1 space-y-0.5 border-l border-ink-200 pl-2">
                {item.children.map((child) => (
                  <NavLink
                    key={child.key}
                    to={child.path}
                    className={({ isActive }) =>
                      `block rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
                      }`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const { can } = useDashboard();
  const items = NAV_ITEMS.filter((item) => item.key === "overview" || can(item.key as SectionKey));

  return (
    <div className="flex gap-1 overflow-x-auto lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? "bg-indigo-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
