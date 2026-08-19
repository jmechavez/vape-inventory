import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

type InventoryItem = {
  product_id: number;
  sku: string;
  name: string;
  brand?: string | null;
  version?: string | null;
  flavor?: string | null;
  current_stock: number;
  minimum_stock: number;
};

type SaleItem = {
  id: number;
  sale_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Sale = {
  id: number;
  user_id?: number | null;
  reference?: string | null;
  sale_date: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  created_at: string;
  items: SaleItem[];
};

type DailySales = {
  label: string;
  date: string;
  total: number;
  transactions: number;
};

type TopProduct = {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getItemCount(sale: Sale) {
  return sale.items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isWithinDays(value: string, days: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return date >= start && date <= now;
}

function getDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatChartDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(value);
}

// ============================================================
// ANIMATED COUNTER COMPONENT (Fixed - removed unused duration)
// ============================================================
function AnimatedCounter({ value, prefix = '', suffix = '' }: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let frame: number;

    const animate = () => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        return;
      }
      setDisplayValue(Math.floor(current));
      frame = requestAnimationFrame(animate);
    };

    const timer = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, isVisible]);

  const formattedValue = typeof displayValue === 'number'
    ? displayValue.toLocaleString()
    : displayValue;

  return <span ref={ref}>{prefix}{formattedValue}{suffix}</span>;
}

// ============================================================
// ICONS
// ============================================================
const icons = {
  peso: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path
        d="M7 4h6a4 4 0 010 8H7m0-8v16m0-8h9m-9 4h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path
        d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <path
        d="M21 8l-9-5-9 5 9 5 9-5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3 8v8l9 5 9-5V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 13v8"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 11h18"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5h8l1.5 3.5h-11L8 3.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

// ============================================================
// SKELETON
// ============================================================
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-28 bg-zinc-200 rounded" />
                <div className="mt-3 h-10 w-36 bg-zinc-200 rounded" />
                <div className="mt-2 h-5 w-28 bg-zinc-200 rounded" />
              </div>
              <div className="h-12 w-12 bg-zinc-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="text-center p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm animate-pulse"
          >
            <div className="h-4 w-24 bg-zinc-200 rounded mx-auto" />
            <div className="mt-2 h-9 w-32 bg-zinc-200 rounded mx-auto" />
            <div className="mt-1 h-5 w-20 bg-zinc-200 rounded mx-auto" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="flex justify-between">
            <div>
              <div className="h-4 w-20 bg-zinc-200 rounded" />
              <div className="mt-1 h-9 w-44 bg-zinc-200 rounded" />
            </div>
            <div className="text-right">
              <div className="h-4 w-24 bg-zinc-200 rounded ml-auto" />
              <div className="mt-1 h-9 w-36 bg-zinc-200 rounded ml-auto" />
            </div>
          </div>
          <div className="mt-4 flex h-72 items-end gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="h-48 w-full bg-zinc-200 rounded-t-lg" />
                <div className="h-5 w-12 bg-zinc-200 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="h-4 w-24 bg-zinc-200 rounded" />
          <div className="mt-1 h-9 w-44 bg-zinc-200 rounded" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-28 bg-zinc-200 rounded-xl" />
            <div className="h-28 bg-zinc-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [inventoryResponse, salesResponse] = await Promise.all([
        fetch(`${API_URL}/api/inventory`),
        fetch(`${API_URL}/api/sales`),
      ]);

      if (!inventoryResponse.ok) {
        throw new Error(`Inventory API error: ${await inventoryResponse.text()}`);
      }
      if (!salesResponse.ok) {
        throw new Error(`Sales API error: ${await salesResponse.text()}`);
      }

      const inventoryData = await inventoryResponse.json();
      const salesData = await salesResponse.json();

      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setSales(
        Array.isArray(salesData)
          ? salesData
          : Array.isArray(salesData.items)
            ? salesData.items
            : [],
      );
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadDashboard();
    setTimeout(() => setIsRefreshing(false), 500);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const todaySales = useMemo(() => {
    return sales
      .filter((sale) => isToday(sale.sale_date))
      .reduce((sum, sale) => sum + Number(sale.total), 0);
  }, [sales]);

  const todayTransactions = useMemo(() => {
    return sales.filter((sale) => isToday(sale.sale_date)).length;
  }, [sales]);

  const todayItemsSold = useMemo(() => {
    return sales
      .filter((sale) => isToday(sale.sale_date))
      .reduce((sum, sale) => sum + getItemCount(sale), 0);
  }, [sales]);

  const weekSales = useMemo(() => {
    return sales
      .filter((sale) => isWithinDays(sale.sale_date, 7))
      .reduce((sum, sale) => sum + Number(sale.total), 0);
  }, [sales]);

  const monthSales = useMemo(() => {
    return sales
      .filter((sale) => isWithinDays(sale.sale_date, 30))
      .reduce((sum, sale) => sum + Number(sale.total), 0);
  }, [sales]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(
      (item) => Number(item.current_stock) <= Number(item.minimum_stock),
    );
  }, [inventory]);

  const outOfStockCount = useMemo(() => {
    return lowStockItems.filter((item) => Number(item.current_stock) <= 0).length;
  }, [lowStockItems]);

  const totalUnits = useMemo(() => {
    return inventory.reduce((sum, item) => sum + Number(item.current_stock), 0);
  }, [inventory]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
      .slice(0, 5);
  }, [sales]);

  const dailySales = useMemo<DailySales[]>(() => {
    const result: DailySales[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const key = getDateKey(date);
      const daySales = sales.filter(
        (sale) => getDateKey(new Date(sale.sale_date)) === key,
      );
      const total = daySales.reduce((sum, sale) => sum + Number(sale.total), 0);
      result.push({
        label: formatChartDate(date),
        date: key,
        total,
        transactions: daySales.length,
      });
    }
    return result;
  }, [sales]);

  const maxDailySales = useMemo(() => {
    return Math.max(...dailySales.map((item) => item.total), 1);
  }, [dailySales]);

  const topProducts = useMemo<TopProduct[]>(() => {
    const map = new Map<number, TopProduct>();
    for (const sale of sales) {
      if (!isWithinDays(sale.sale_date, 30)) continue;
      for (const item of sale.items ?? []) {
        const productId = Number(item.product_id);
        const existing = map.get(productId);
        if (existing) {
          existing.quantity += Number(item.quantity);
          existing.revenue += Number(item.subtotal);
        } else {
          map.set(productId, {
            product_id: productId,
            sku: item.sku,
            name: item.product_name,
            quantity: Number(item.quantity),
            revenue: Number(item.subtotal),
          });
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  const sevenDayTotal = useMemo(() => {
    return dailySales.reduce((sum, day) => sum + day.total, 0);
  }, [dailySales]);

  const dayOfWeekSales = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totals = days.map(() => 0);
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 30);

    for (const sale of sales) {
      const date = new Date(sale.sale_date);
      if (date >= start && date <= now) {
        let day = date.getDay();
        day = day === 0 ? 6 : day - 1;
        totals[day] += Number(sale.total);
      }
    }
    const max = Math.max(...totals, 1);
    return days.map((day, index) => ({
      day,
      total: totals[index],
      max,
    }));
  }, [sales]);

  const avgTransaction = useMemo(() => {
    if (todayTransactions === 0) return 0;
    return todaySales / todayTransactions;
  }, [todaySales, todayTransactions]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Overview</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Here's what's happening in your inventory today.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/sales"
            className="inline-flex h-[44px] items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target"
          >
            + New Sale
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target"
          >
            {isRefreshing ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 mb-3 shrink-0 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="font-bold underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 overflow-y-auto">
          <DashboardSkeleton />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Stats Cards - with hover effects and animated counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:0ms]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Today's Sales</p>
                  <p className="mt-1.5 text-4xl font-black tracking-tight text-zinc-950">
                    <AnimatedCounter value={todaySales} prefix="₱" />
                  </p>
                  <p className="mt-1 text-lg text-zinc-500">{todayTransactions} transactions</p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-transform duration-200 hover:scale-110">
                  {icons.peso}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:75ms]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Avg. Transaction</p>
                  <p className="mt-1.5 text-4xl font-black tracking-tight text-zinc-950">
                    <AnimatedCounter
                      value={todayTransactions > 0 ? avgTransaction : 0}
                      prefix="₱"
                    />
                  </p>
                  <p className="mt-1 text-lg text-zinc-500">
                    {todayTransactions > 0 ? `Based on ${todayTransactions} sales` : "No sales today"}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-transform duration-200 hover:scale-110">
                  {icons.receipt}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:150ms]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Items Sold</p>
                  <p className="mt-1.5 text-4xl font-black tracking-tight text-zinc-950">
                    <AnimatedCounter value={todayItemsSold} />
                  </p>
                  <p className="mt-1 text-lg text-zinc-500">
                    {todayItemsSold > 0 ? `${todayTransactions} orders` : "No items sold"}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-transform duration-200 hover:scale-110">
                  {icons.box}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly & Monthly Summary */}
          <div className="grid grid-cols-2 gap-2 animate-fade-in-up">
            <div className="text-center p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-zinc-300">
              <p className="text-base font-bold uppercase text-zinc-400">This Week</p>
              <p className="mt-1.5 text-3xl font-black text-zinc-950">
                <AnimatedCounter value={weekSales} prefix="₱" />
              </p>
              <p className="mt-1 text-lg text-zinc-400">7-day revenue</p>
            </div>
            <div className="text-center p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-zinc-300">
              <p className="text-base font-bold uppercase text-zinc-400">This Month</p>
              <p className="mt-1.5 text-3xl font-black text-zinc-950">
                <AnimatedCounter value={monthSales} prefix="₱" />
              </p>
              <p className="mt-1 text-lg text-zinc-400">30-day revenue</p>
            </div>
          </div>

          {/* Sales Chart + Inventory */}
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-zinc-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Sales</p>
                  <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Last 7 Days</h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-base font-bold text-zinc-400">7-day revenue</p>
                  <p className="mt-0.5 text-2xl font-black text-zinc-950">
                    <AnimatedCounter value={sevenDayTotal} prefix="₱" />
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex h-72 items-end gap-2 sm:gap-4">
                  {dailySales.map((day) => {
                    const height = Math.max((day.total / maxDailySales) * 100, day.total > 0 ? 4 : 0);
                    const today = isToday(`${day.date}T00:00:00`);
                    return (
                      <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2 group">
                        <div className="relative flex h-56 w-full items-end justify-center">
                          {day.total > 0 && (
                            <span className="absolute -top-7 text-base font-bold text-zinc-500 transition-opacity group-hover:opacity-100">
                              {formatCurrency(day.total)}
                            </span>
                          )}
                          <div
                            className="w-full max-w-14 rounded-t-lg transition-all duration-500 hover:opacity-80"
                            style={{
                              height: `${height}%`,
                              background: today ? "var(--accent)" : "#f4f4f5",
                              boxShadow: today ? "0 0 30px rgba(82, 82, 91, 0.2)" : "none",
                            }}
                            title={`${day.label}: ${formatCurrency(day.total)} · ${day.transactions} transactions`}
                          />
                        </div>
                        <div className="text-center">
                          <p className={`text-base font-bold ${today ? "text-zinc-950" : "text-zinc-400"}`}>
                            {day.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 p-6">
                <div>
                  <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Inventory</p>
                  <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Stock Summary</h2>
                </div>
                <Link
                  to="/inventory"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target"
                >
                  View
                </Link>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-50 p-4 transition-all duration-200 hover:bg-zinc-100">
                    <p className="text-base font-bold uppercase tracking-wider text-zinc-400">Total Units</p>
                    <p className="mt-1 text-3xl font-black text-zinc-950">
                      <AnimatedCounter value={totalUnits} />
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4 transition-all duration-200 hover:bg-zinc-100">
                    <p className="text-base font-bold uppercase tracking-wider text-zinc-400">Alerts</p>
                    <p className={`mt-1 text-3xl font-black ${lowStockItems.length > 0 ? "text-red-600" : "text-zinc-950"}`}>
                      <AnimatedCounter value={lowStockItems.length} />
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-base font-bold uppercase tracking-wider text-zinc-400">Needs Attention</p>
                    {outOfStockCount > 0 && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700 animate-pulse">
                        {outOfStockCount} out of stock
                      </span>
                    )}
                  </div>
                  {lowStockItems.length === 0 ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all duration-200 hover:bg-emerald-100">
                      <p className="text-lg font-bold text-emerald-800">✅ Stock looks good</p>
                      <p className="mt-0.5 text-base text-emerald-600">
                        No products are currently at or below minimum stock.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {lowStockItems.slice(0, 5).map((item) => {
                        const stock = Number(item.current_stock);
                        const out = stock <= 0;
                        const percent = Math.min((stock / (item.minimum_stock * 2)) * 100, 100);
                        return (
                          <div key={item.product_id} className="rounded-xl border border-zinc-200 p-3 transition-all duration-200 hover:bg-zinc-50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-lg font-bold text-zinc-900">{item.name}</p>
                                <p className="mt-0.5 text-base text-zinc-400">{item.sku}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-xl font-black ${out ? "text-red-600" : "text-amber-600"}`}>
                                  {item.current_stock}
                                </p>
                                <p className="text-base text-zinc-400">min {item.minimum_stock}</p>
                              </div>
                            </div>
                            <div className="mt-2 w-full">
                              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${out ? 'bg-red-500' :
                                    stock <= item.minimum_stock ? 'bg-amber-500' :
                                      'bg-emerald-500'
                                    }`}
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {lowStockItems.length > 5 && (
                        <Link to="/inventory" className="block pt-1 text-center text-base font-bold text-zinc-500 hover:text-black">
                          View all {lowStockItems.length} low-stock products →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Best Selling Days */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm animate-fade-in-up">
            <div className="border-b border-zinc-200 p-6">
              <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Analytics</p>
              <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Best Selling Days</h2>
              <p className="mt-0.5 text-base text-zinc-400">Revenue distribution by day of the week (last 30 days)</p>
            </div>
            <div className="p-6">
              <div className="flex h-44 items-end gap-2">
                {dayOfWeekSales.map((day) => {
                  const height = Math.max((day.total / day.max) * 100, day.total > 0 ? 4 : 0);
                  const isWeekend = day.day === "Sat" || day.day === "Sun";
                  return (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="relative flex w-full items-end justify-center h-36">
                        {day.total > 0 && (
                          <span className="absolute -top-6 text-base font-bold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatCurrency(day.total)}
                          </span>
                        )}
                        <div
                          className="w-full max-w-12 rounded-t-lg transition-all duration-500 hover:opacity-80"
                          style={{
                            height: `${height}%`,
                            background: isWeekend ? "var(--accent)" : "#e4e4e7",
                          }}
                        />
                      </div>
                      <p className={`text-base font-bold ${isWeekend ? "text-zinc-950" : "text-zinc-400"}`}>
                        {day.day}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm animate-fade-in-up">
            <div className="flex flex-col gap-2 border-b border-zinc-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Performance</p>
                <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Top Selling Products</h2>
                <p className="mt-0.5 text-base text-zinc-400">Based on the last 30 days of sales.</p>
              </div>
              <Link
                to="/sales/history"
                className="self-start rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target sm:self-auto"
              >
                Sales History
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <div className="p-8 text-center animate-bounce-slow">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
                  <svg className="h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-medium text-zinc-500">No product sales yet</p>
                <Link to="/sales" className="mt-3 inline-flex h-[44px] items-center rounded-xl bg-black px-5 text-sm font-bold text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target">
                  Create Sale
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {topProducts.map((product, index) => (
                  <div key={product.product_id} className="flex items-center gap-4 p-6 transition-all duration-200 hover:bg-zinc-50">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-lg font-black text-zinc-500 transition-all duration-200 group-hover:scale-110">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black text-zinc-950">{product.name}</p>
                      <p className="mt-0.5 text-base text-zinc-400">{product.sku}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-base font-bold uppercase tracking-wider text-zinc-400">Revenue</p>
                      <p className="mt-0.5 text-lg font-black text-zinc-950">{formatCurrency(product.revenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold uppercase tracking-wider text-zinc-400">Sold</p>
                      <p className="mt-0.5 text-lg font-black text-zinc-950">{product.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-zinc-200 p-6">
              <div>
                <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Sales</p>
                <h2 className="mt-0.5 text-2xl font-black text-zinc-950">Recent Sales</h2>
              </div>
              <Link
                to="/sales/history"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target"
              >
                View All
              </Link>
            </div>
            {recentSales.length === 0 ? (
              <div className="p-8 text-center animate-bounce-slow">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
                  <svg className="h-10 w-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0-1c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-medium text-zinc-500">No sales recorded yet</p>
                <Link to="/sales" className="mt-3 inline-flex h-[44px] items-center rounded-xl bg-black px-5 text-sm font-bold text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target">
                  Create Sale
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-6 transition-all duration-200 hover:bg-zinc-50">
                    <div className="min-w-0">
                      <Link to={`/sales/${sale.id}`} className="text-lg font-black text-zinc-950 hover:underline">
                        {sale.reference || `SALE-${String(sale.id).padStart(6, "0")}`}
                      </Link>
                      <p className="mt-0.5 text-base text-zinc-400">{formatDate(sale.sale_date)}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-base font-bold text-zinc-500">
                          {getItemCount(sale)} {getItemCount(sale) === 1 ? "item" : "items"}
                        </p>
                        <p className="mt-0.5 text-base text-zinc-400">{sale.payment_method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-zinc-950">{formatCurrency(Number(sale.total))}</p>
                        <Link to={`/sales/${sale.id}`} className="mt-0.5 inline-block text-base font-bold text-zinc-500 hover:text-black">
                          Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
