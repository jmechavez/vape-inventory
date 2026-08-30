import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";

interface LayoutProps {
  children: ReactNode;
}

// Tooltip with touch support for iPad
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleTouchStart = () => {
    if (!text) return;
    setShowTooltip(prev => !prev);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 3000);
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice.current && text) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice.current) {
      setShowTooltip(false);
    }
  };

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && text && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50 animate-fade-in">
          {text}
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
        </div>
      )}
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

// Page title mapping for top bar
const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/inventory": "Inventory",
  "/sales": "Sales",
  "/sales/history": "Sales History",
  "/reports": "Reports",
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
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

  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (pageTitles[path]) return pageTitles[path];
    if (path.startsWith("/sales/")) return "Sale Details";
    return "Vape Inventory";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="h-dvh min-h-dvh bg-zinc-100 text-zinc-950 overflow-hidden">
      <div className="flex h-full min-h-0">

        {/* Sidebar */}
        <aside
          className={[
            "momentum-scroll hidden border-r border-zinc-200/50 bg-white/95 backdrop-blur-sm transition-all duration-300 ease-in-out lg:flex lg:flex-col lg:overflow-y-auto lg:shrink-0 gpu",
            collapsed ? "w-16" : "w-64",
          ].join(" ")}
        >
          {/* Brand - Simplified */}
          <div
            className={[
              "border-b border-zinc-200/50 transition-all duration-300 shrink-0",
              collapsed ? "px-3 py-4" : "px-5 py-5",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-zinc-900 to-zinc-700 text-sm font-black text-white shadow-sm transition-transform duration-300 active:scale-95 touch-feedback">
                VI
              </div>
              {!collapsed && (
                <div className="overflow-hidden transition-all duration-300">
                  <h1 className="text-base font-black tracking-tight text-zinc-950 whitespace-nowrap">
                    Vape Inventory
                  </h1>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 whitespace-nowrap">
                    Management System
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation - Cleaner */}
          <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto gpu-scroll">
            {!collapsed && (
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 animate-fade-in">
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
                      "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] touch-feedback shrink-0",
                      active
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 hover:text-zinc-950",
                      collapsed ? "justify-center min-h-11 px-2" : "min-h-11 px-3 py-2.5 gap-3",
                    ].join(" ")}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={[
                        "flex items-center justify-center rounded-lg transition-all duration-200 shrink-0",
                        active
                          ? "bg-white/15 text-white"
                          : "text-zinc-500 group-hover:text-zinc-900",
                        collapsed ? "h-9 w-9" : "h-9 w-9",
                      ].join(" ")}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="flex-1 text-sm font-medium transition-all duration-200 group-hover:translate-x-0.5">
                        {item.label}
                      </span>
                    )}

                    {collapsed && active && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/60" />
                    )}
                  </NavLink>
                </Tooltip>
              );
            })}
          </nav>

          {/* Footer - Simplified with Logout */}
          <div className="border-t border-zinc-200/50 p-3 shrink-0">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={[
                "w-full flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 active:scale-[0.97] touch-feedback",
                collapsed ? "justify-center min-h-11 px-2" : "px-3 py-2.5",
              ].join(" ")}
              aria-label="Logout"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!collapsed && <span>Logout</span>}
            </button>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200/50">
              <p className="text-xs text-zinc-400">
                {collapsed ? "v1.0" : "v1.0.0"}
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {!collapsed && (
                  <span className="text-xs font-medium text-emerald-600">Ready</span>
                )}
              </div>
            </div>
            {!collapsed && (
              <p className="mt-1 text-[10px] text-zinc-400">
                © {new Date().getFullYear()}
              </p>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">

          {/* Mobile Header - Cleaner */}
          <header className="sticky top-0 z-30 border-b border-zinc-200/50 bg-white/95 backdrop-blur-sm shrink-0 lg:hidden safe-area-top">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMobileMenu}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 active:scale-95 transition touch-feedback"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-zinc-900 to-zinc-700 text-[10px] font-black text-white shadow-sm">
                    VI
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-950 leading-none">Vape Inventory</p>
                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Management System
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500">{formatTime(currentTime)}</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <nav className="border-t border-zinc-200/50 bg-white/95 backdrop-blur-sm px-3 py-2 space-y-0.5 animate-slide-down shadow-lg">
                {navigation.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={[
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 active:scale-[0.97] touch-feedback",
                        active
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                      ].join(" ")}
                    >
                      <span className="h-5 w-5">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  );
                })}
                {/* Mobile Logout */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 active:scale-[0.97] touch-feedback"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </nav>
            )}
          </header>

          {/* Desktop Top Bar - Cleaner */}
          <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-zinc-200/50 bg-white/95 backdrop-blur-sm px-6 lg:flex shrink-0 safe-area-top">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition active:scale-95 touch-feedback"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {collapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  )}
                </svg>
              </button>
              <p className="text-sm font-bold text-zinc-900">
                {getCurrentPageTitle()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 active:scale-95 touch-feedback"
                aria-label="Logout"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
              <span className="text-xs text-zinc-400 hidden md:inline">
                {formatDate(currentTime)}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-700">
                {formatTime(currentTime)}
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto min-h-0 momentum-scroll">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
