import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: ReactNode;
}

// Tooltip component for collapsed navigation icons
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
        {text}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
      </div>
    </div>
  );
}

const navigation = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
        <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Products",
    to: "/products",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
        <path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Inventory",
    to: "/inventory",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
        <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 11h18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5h8l1.5 3.5h-11L8 3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Sales",
    to: "/sales",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
        <path d="M3 17l6-6 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 7h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Reports",
    to: "/reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
        <path d="M4 20h16M4 20V8M4 20l4-6 3 2 5-8 4 5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 20V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 20V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 20V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="h-screen overflow-hidden bg-zinc-100 text-zinc-950">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside
          className={[
            "momentum-scroll hidden border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out lg:flex lg:flex-col lg:overflow-y-auto lg:shrink-0 gpu",
            collapsed ? "w-20" : "w-64",
          ].join(" ")}
        >
          {/* Brand */}
          <div
            className={[
              "border-b border-zinc-200 transition-all duration-300 shrink-0",
              collapsed ? "px-3 py-4" : "px-6 py-5",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-base font-black text-white shadow-sm transition-transform duration-300 hover:scale-105">
                VI
              </div>
              {!collapsed && (
                <div className="overflow-hidden transition-all duration-300">
                  <h1 className="text-base font-black tracking-tight text-zinc-950 whitespace-nowrap">
                    Vape Inventory
                  </h1>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 whitespace-nowrap">
                    Management System
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={toggleSidebar}
            className="mx-3 mt-3 shrink-0 flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300 active:scale-95 touch-feedback gpu"
          >
            {!collapsed ? (
              <>
                <span>Collapse</span>
                <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </>
            ) : (
              <svg className="h-4 w-4 transition-transform duration-300 hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto gpu-scroll">
            {!collapsed && (
              <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 animate-fade-in">
                Menu
              </p>
            )}

            {navigation.map((item) => {
              const active = isActive(item.to);

              return (
                <Tooltip key={item.to} text={collapsed ? item.label : ""}>
                  <NavLink
                    to={item.to}
                    className={[
                      "group relative flex min-h-[52px] items-center rounded-xl px-3 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.97] touch-feedback shrink-0",
                      active
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-950",
                      collapsed ? "justify-center" : "",
                    ].join(" ")}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && !collapsed && (
                      <span
                        className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-300"
                        style={{ background: "var(--accent)" }}
                      />
                    )}

                    {active && collapsed && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-zinc-950 transition-all duration-300" />
                    )}

                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 shrink-0",
                        active
                          ? "bg-white/15 text-white"
                          : "bg-zinc-100 text-zinc-500 group-hover:bg-white group-hover:text-zinc-900 group-hover:scale-105",
                        collapsed ? "mx-auto" : "mr-3",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="text-sm transition-all duration-200 group-hover:translate-x-0.5">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                </Tooltip>
              );
            })}
          </nav>

          {/* Footer */}
          {!collapsed && (
            <div className="border-t border-zinc-200 p-4 shrink-0">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 transition-all duration-200 hover:bg-zinc-100">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  System
                </p>
                <p className="mt-0.5 text-xs font-semibold text-zinc-600">
                  Vape Inventory
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[10px] text-zinc-400">v1.0.0</p>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="border-t border-zinc-200 p-3 shrink-0">
              <div className="flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-base font-black text-white shadow-sm transition-transform duration-300 hover:scale-105">
                  VI
                </div>
              </div>
            </div>
          )}

          {/* All Rights Reserved Footer */}
          <div className="border-t border-zinc-200 p-3 shrink-0">
            <p className={[
              "text-center text-[10px] text-zinc-400 transition-all duration-300",
              collapsed ? "text-[8px]" : ""
            ].join(" ")}>
              © {new Date().getFullYear()} Vape Inventory
              {!collapsed && " · All Rights Reserved"}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-md shrink-0 lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 text-sm font-black text-white shadow-sm transition-transform duration-300 hover:scale-105">
                  VI
                </div>
                <div>
                  <h1 className="text-sm font-black text-zinc-950">Vape Inventory</h1>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                    Management System
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500">{formatTime(currentTime)}</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 gpu-scroll">
              {navigation.map((item) => {
                const active = isActive(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={[
                      "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 min-h-[44px] shrink-0 active:scale-95 touch-feedback",
                      active
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                    ].join(" ")}
                  >
                    <span className="h-4 w-4">{item.icon}</span>
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </header>

          {/* Desktop Top Bar */}
          <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur-md px-6 lg:flex shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Overview
              </p>
              <p className="mt-0.5 text-sm font-bold text-zinc-900">
                Inventory Management
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* System Status */}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">System Ready</span>
              </div>
              {/* Date & Time */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 border-l border-zinc-200 pl-4">
                <span>{formatDate(currentTime)}</span>
                <span className="font-mono font-bold text-zinc-700">{formatTime(currentTime)}</span>
              </div>
              <div className="h-6 w-px bg-zinc-200" />
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-[10px] font-black text-white shadow-sm transition-transform duration-300 hover:scale-105">
                VI
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto min-h-0 gpu-scroll">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
