import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

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

type DateFilter =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "CUSTOM";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLongDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
  }).format(date);
}

function getItemCount(sale: Sale) {
  return sale.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

function startOfMonth(date: Date) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isDateInRange(
  value: string,
  filter: DateFilter,
  customDate: string,
) {
  const saleDate = new Date(value);
  if (Number.isNaN(saleDate.getTime())) return false;
  const now = new Date();
  switch (filter) {
    case "TODAY":
      return saleDate >= startOfDay(now) && saleDate <= endOfDay(now);
    case "YESTERDAY": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return (
        saleDate >= startOfDay(yesterday) &&
        saleDate <= endOfDay(yesterday)
      );
    }
    case "THIS_WEEK":
      return saleDate >= startOfWeek(now) && saleDate <= endOfDay(now);
    case "THIS_MONTH":
      return saleDate >= startOfMonth(now) && saleDate <= endOfDay(now);
    case "CUSTOM": {
      if (!customDate) return true;
      const selectedDate = new Date(`${customDate}T00:00:00`);
      if (Number.isNaN(selectedDate.getTime())) return false;
      return (
        saleDate >= startOfDay(selectedDate) &&
        saleDate <= endOfDay(selectedDate)
      );
    }
    case "ALL":
    default:
      return true;
  }
}

// Loading Skeleton Component
function SalesHistorySkeleton() {
  return (
    <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100 gpu">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-7 animate-pulse">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="h-7 w-48 bg-zinc-200 rounded"></div>
              <div className="h-7 w-24 bg-zinc-200 rounded-full"></div>
            </div>
            <div className="mt-2.5 flex items-center gap-4">
              <div className="h-6 w-40 bg-zinc-200 rounded"></div>
              <div className="h-6 w-4 bg-zinc-200 rounded-full"></div>
              <div className="h-6 w-24 bg-zinc-200 rounded"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-7 w-28 bg-zinc-200 rounded ml-auto"></div>
            <div className="mt-1.5 h-5 w-24 bg-zinc-200 rounded ml-auto"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Summary Card Skeleton
function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm animate-pulse gpu">
      <div className="h-5 w-24 bg-zinc-200 rounded"></div>
      <div className="mt-1.5 h-10 w-28 bg-zinc-200 rounded"></div>
    </div>
  );
}

const PAYMENT_METHODS = ["CASH", "GCASH", "MAYA", "MARIBANK", "BANK_TRANSFER", "CARD"];

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [customDate, setCustomDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadSales() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/sales`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load sales history.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadSales();
    setTimeout(() => setIsRefreshing(false), 500);
  }

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sales.filter((sale) => {
      const reference = sale.reference?.toLowerCase() ?? "";
      const matchesSearch =
        !query ||
        reference.includes(query) ||
        String(sale.id).includes(query);
      const matchesPayment =
        paymentFilter === "ALL" || sale.payment_method === paymentFilter;
      const matchesDate = isDateInRange(
        sale.sale_date,
        dateFilter,
        customDate,
      );
      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [sales, search, paymentFilter, dateFilter, customDate]);

  const paginatedSales = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredSales.slice(start, end);
  }, [filteredSales, page]);

  const totalPages = Math.ceil(filteredSales.length / limit);
  const totalFiltered = filteredSales.length;

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0,
  );
  const totalItems = filteredSales.reduce(
    (sum, sale) => sum + getItemCount(sale),
    0,
  );

  const hasFilters =
    Boolean(search) || paymentFilter !== "ALL" || dateFilter !== "ALL";

  function clearFilters() {
    setSearch("");
    setPaymentFilter("ALL");
    setDateFilter("ALL");
    setCustomDate("");
    setPage(1);
  }

  useEffect(() => {
    setPage(1);
  }, [search, paymentFilter, dateFilter, customDate]);

  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<string>();
    sales.forEach((sale) => {
      if (sale.payment_method) {
        methods.add(sale.payment_method);
      }
    });
    return Array.from(methods).sort();
  }, [sales]);

  return (
    <div className="h-full flex flex-col min-h-0 gpu overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Sales</p>
          <h1 className="mt-1.5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Sales History</h1>
          <p className="mt-1.5 text-xl text-zinc-500">View previous sales and transaction details.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/sales"
            className="inline-flex h-[52px] items-center justify-center rounded-xl bg-black px-6 text-lg font-bold text-white shadow-sm transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
          >
            + New Sale
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="inline-flex h-[52px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-lg font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
          >
            {isRefreshing ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "⟳ Refresh"
            )}
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 shrink-0 animate-fade-in-up">
        {loading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300">
              <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Transactions</p>
              <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">{totalFiltered}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300">
              <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Items Sold</p>
              <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">{totalItems}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300">
              <p className="text-lg font-bold uppercase tracking-[0.2em] text-zinc-400">Total Sales</p>
              <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">{formatCurrency(totalSales)}</p>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm mb-6 shrink-0 card-hover gpu transition-all duration-200 hover:shadow-md hover:border-zinc-300">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-500">
              Search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sale reference..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
              style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
              aria-label="Search sales by reference"
            />
          </label>

          <label className="lg:w-56">
            <span className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-500">
              Payment Method
            </span>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg font-medium outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
              aria-label="Filter by payment method"
            >
              <option value="ALL">All Methods</option>
              {availablePaymentMethods.length > 0 ? (
                availablePaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))
              ) : (
                PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="lg:w-56">
            <span className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-500">
              Date
            </span>
            <select
              value={dateFilter}
              onChange={(event) => {
                const value = event.target.value as DateFilter;
                setDateFilter(value);
                if (value !== "CUSTOM") {
                  setCustomDate("");
                }
              }}
              className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg font-medium outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
              aria-label="Filter by date range"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>

          {dateFilter === "CUSTOM" && (
            <label className="lg:w-56">
              <span className="mb-2 block text-lg font-bold uppercase tracking-wider text-zinc-500">
                Custom Date
              </span>
              <input
                type="date"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-lg font-medium outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 tap-target gpu"
                style={{ fontSize: '16px', WebkitTextSizeAdjust: '100%' }}
                aria-label="Select custom date"
              />
            </label>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-lg font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Info */}
      {dateFilter !== "ALL" && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-4 text-xl text-zinc-600 mb-6 shrink-0 animate-fade-in gpu">
          Showing sales for{" "}
          <span className="font-bold text-zinc-950">
            {dateFilter === "TODAY" && "Today"}
            {dateFilter === "YESTERDAY" && "Yesterday"}
            {dateFilter === "THIS_WEEK" && "This Week"}
            {dateFilter === "THIS_MONTH" && "This Month"}
            {dateFilter === "CUSTOM" &&
              (customDate ? formatLongDate(customDate) : "Custom Date")}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-xl font-medium text-red-700 mb-4 shrink-0 animate-fade-in gpu">
          {error}
        </div>
      )}

      {/* Loading / Results */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <SalesHistorySkeleton />
        ) : filteredSales.length === 0 ? (
          <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col items-center justify-center p-12 animate-fade-in-up gpu">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-linear-to-br from-zinc-900 to-zinc-700 shadow-sm animate-bounce-slow">
              <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-white">
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
            </div>
            <h2 className="mt-6 text-3xl font-black text-zinc-950">No sales found</h2>
            <p className="mt-1.5 text-xl text-zinc-500">
              {hasFilters
                ? "No sales match your filters."
                : "No sales have been recorded yet."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-xl bg-black px-8 py-3.5 text-lg font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm gpu-scroll">
              <div className="divide-y divide-zinc-100">
                {paginatedSales.map((sale) => (
                  <Link
                    key={sale.id}
                    to={`/sales/${sale.id}`}
                    className="flex items-center justify-between p-7 transition hover:bg-zinc-50 card-hover gpu min-h-[88px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-4 flex-wrap">
                        <p className="font-mono text-xl font-black text-zinc-950">
                          {sale.reference ?? `SALE-${String(sale.id).padStart(6, "0")}`}
                        </p>
                        <span className="rounded-full bg-zinc-100 px-4 py-1.5 text-lg font-black text-zinc-700">
                          {sale.payment_method}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-lg text-zinc-400">
                        <span>{formatDate(sale.sale_date)}</span>
                        <span>•</span>
                        <span>{getItemCount(sale)} {getItemCount(sale) === 1 ? "item" : "items"}</span>
                        {Number(sale.discount) > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">Discount {formatCurrency(Number(sale.discount))}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black text-zinc-950 number-transition">
                        {formatCurrency(Number(sale.total))}
                      </p>
                      <p className="mt-0.5 text-lg text-zinc-400">
                        {sale.items.length} product{sale.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-zinc-200 bg-white px-6 py-5 mt-4 rounded-2xl shadow-sm sm:flex-row sm:items-center sm:justify-between shrink-0 gpu">
                <p className="text-lg text-zinc-500">
                  {filteredSales.length === 0
                    ? "No results"
                    : `Page ${page} of ${totalPages} · ${filteredSales.length} total sales`}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:scale-[1.02] active:scale-95 disabled:opacity-30 tap-target touch-feedback gpu"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:scale-[1.02] active:scale-95 disabled:opacity-30 tap-target touch-feedback gpu"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
