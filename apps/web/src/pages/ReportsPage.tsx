import { useEffect, useMemo, useState } from "react";

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
  status?: string;
  created_at: string;
  items: SaleItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date);
}

function getItemCount(sale: Sale) {
  return sale.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}

function getDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA");
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6 gpu">
      <div className="animate-pulse">
        <div className="h-8 w-32 rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-64 rounded bg-zinc-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="mt-4 h-8 w-32 rounded bg-zinc-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-80 animate-pulse rounded-2xl border border-zinc-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50">
      <p className="text-lg font-medium text-zinc-500">{message}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
            : "Failed to load sales reports.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSales();
  }, []);

  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce(
      (total, sale) => total + Number(sale.total || 0),
      0,
    );

    const totalTransactions = sales.length;

    const totalUnits = sales.reduce(
      (total, sale) => total + getItemCount(sale),
      0,
    );

    const averageSale =
      totalTransactions > 0
        ? totalRevenue / totalTransactions
        : 0;

    const totalDiscount = sales.reduce(
      (total, sale) => total + Number(sale.discount || 0),
      0,
    );

    return {
      totalRevenue,
      totalTransactions,
      totalUnits,
      averageSale,
      totalDiscount,
    };
  }, [sales]);

  const paymentReport = useMemo(() => {
    const map = new Map<
      string,
      {
        paymentMethod: string;
        transactions: number;
        revenue: number;
      }
    >();

    for (const sale of sales) {
      const paymentMethod =
        sale.payment_method || "UNKNOWN";

      const existing = map.get(paymentMethod);

      if (existing) {
        existing.transactions += 1;
        existing.revenue += Number(sale.total || 0);
      } else {
        map.set(paymentMethod, {
          paymentMethod,
          transactions: 1,
          revenue: Number(sale.total || 0),
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
  }, [sales]);

  const productReport = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: number;
        sku: string;
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items || []) {
        const key = String(item.product_id);

        const existing = map.get(key);

        if (existing) {
          existing.quantity += Number(item.quantity || 0);
          existing.revenue += Number(item.subtotal || 0);
        } else {
          map.set(key, {
            productId: item.product_id,
            sku: item.sku,
            name: item.product_name,
            quantity: Number(item.quantity || 0),
            revenue: Number(item.subtotal || 0),
          });
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );
  }, [sales]);

  const dailyReport = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        transactions: number;
        revenue: number;
        units: number;
      }
    >();

    for (const sale of sales) {
      const key = getDateKey(sale.sale_date);

      if (!key) continue;

      const existing = map.get(key);

      if (existing) {
        existing.transactions += 1;
        existing.revenue += Number(sale.total || 0);
        existing.units += getItemCount(sale);
      } else {
        map.set(key, {
          date: key,
          transactions: 1,
          revenue: Number(sale.total || 0),
          units: getItemCount(sale),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [sales]);

  const maxProductRevenue = useMemo(() => {
    return Math.max(
      ...productReport.map((product) => product.revenue),
      0,
    );
  }, [productReport]);

  const maxPaymentRevenue = useMemo(() => {
    return Math.max(
      ...paymentReport.map((payment) => payment.revenue),
      0,
    );
  }, [paymentReport]);

  const maxDailyRevenue = useMemo(() => {
    return Math.max(
      ...dailyReport.map((day) => day.revenue),
      0,
    );
  }, [dailyReport]);

  if (loading) {
    return <ReportsSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6 gpu">
        <div>
          <h1 className="text-2xl font-black text-zinc-950">
            Reports
          </h1>

          <p className="mt-1 text-lg text-zinc-500">
            Sales performance and business overview.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 animate-fade-in gpu">
          <p className="text-lg font-semibold text-red-700">
            Failed to load reports
          </p>

          <p className="mt-1 text-base text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white transition hover:bg-red-700 touch-feedback gpu"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="space-y-6 gpu">
        <div>
          <h1 className="text-2xl font-black text-zinc-950">
            Reports
          </h1>

          <p className="mt-1 text-lg text-zinc-500">
            Sales performance and business overview.
          </p>
        </div>

        <EmptyState message="No sales data available yet." />
      </div>
    );
  }

  return (
    <div className="space-y-6 gpu relative overflow-hidden h-[calc(100vh-12rem)]">
      {/* Coming Soon Overlay - Fixed and covers everything */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md animate-fade-in gpu pointer-events-auto">
        <div className="text-center p-8 max-w-lg">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 animate-bounce-slow">
            <svg className="h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-zinc-950">Coming Soon</h2>
          <p className="mt-3 text-xl text-zinc-500">
            We're working hard to bring you detailed reports and analytics.
          </p>
          <p className="mt-2 text-lg text-zinc-400">
            Check back soon for sales insights, trends, and performance metrics.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-base font-medium text-zinc-500">Development in progress</span>
          </div>
        </div>
      </div>

      {/* Header - Blurred */}
      <div className="blur-sm select-none pointer-events-none">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Analytics</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Reports</h1>
        <p className="mt-1 text-lg text-zinc-500">Sales performance and business overview.</p>
      </div>

      {/* Summary Cards - Blurred */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 blur-sm select-none pointer-events-none">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:0ms]">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Total Revenue
          </p>

          <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">
            {formatCurrency(metrics.totalRevenue)}
          </p>

          <p className="mt-1 text-lg text-zinc-400">
            Across all completed sales
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:75ms]">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Transactions
          </p>

          <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">
            {metrics.totalTransactions.toLocaleString()}
          </p>

          <p className="mt-1 text-lg text-zinc-400">
            Completed sales
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:150ms]">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Units Sold
          </p>

          <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">
            {metrics.totalUnits.toLocaleString()}
          </p>

          <p className="mt-1 text-lg text-zinc-400">
            Total quantity sold
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300 animate-fade-in-up [animation-delay:225ms]">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Average Sale
          </p>

          <p className="mt-2 text-4xl font-black text-zinc-950 number-transition">
            {formatCurrency(metrics.averageSale)}
          </p>

          <p className="mt-1 text-lg text-zinc-400">
            Average transaction value
          </p>
        </div>
      </div>

      {/* Secondary Summary - Blurred */}
      <div className="grid gap-4 sm:grid-cols-2 animate-fade-in-up blur-sm select-none pointer-events-none">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-zinc-300">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Total Discounts
          </p>

          <p className="mt-2 text-3xl font-black text-zinc-950 number-transition">
            {formatCurrency(metrics.totalDiscount)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-zinc-300">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">
            Products Sold
          </p>

          <p className="mt-2 text-3xl font-black text-zinc-950 number-transition">
            {productReport.length.toLocaleString()}
          </p>

          <p className="mt-1 text-lg text-zinc-400">
            Unique products appearing in sales
          </p>
        </div>
      </div>

      {/* Product + Payment - Blurred */}
      <div className="grid gap-6 lg:grid-cols-2 blur-sm select-none pointer-events-none">
        {/* Top Products */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm gpu">
          <div className="border-b border-zinc-100 p-6">
            <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Products</p>
            <h2 className="mt-0.5 text-2xl font-black text-zinc-950">
              Top Products
            </h2>

            <p className="mt-0.5 text-lg text-zinc-400">
              Products ranked by sales revenue.
            </p>
          </div>

          <div className="p-6">
            {productReport.length === 0 ? (
              <EmptyState message="No product sales available." />
            ) : (
              <div className="space-y-5">
                {productReport.slice(0, 8).map((product) => {
                  const percentage =
                    maxProductRevenue > 0
                      ? (product.revenue / maxProductRevenue) * 100
                      : 0;

                  return (
                    <div key={product.productId} className="gpu">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-zinc-950">
                            {product.name}
                          </p>

                          <p className="mt-0.5 text-base text-zinc-500">
                            {product.sku} ·{" "}
                            {product.quantity.toLocaleString()} sold
                          </p>
                        </div>

                        <p className="shrink-0 text-lg font-black text-zinc-950 number-transition">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-zinc-900 transition-all duration-700 ease-out gpu"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Payment Methods */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm gpu">
          <div className="border-b border-zinc-100 p-6">
            <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Payments</p>
            <h2 className="mt-0.5 text-2xl font-black text-zinc-950">
              Payment Methods
            </h2>

            <p className="mt-0.5 text-lg text-zinc-400">
              Revenue grouped by payment method.
            </p>
          </div>

          <div className="p-6">
            {paymentReport.length === 0 ? (
              <EmptyState message="No payment data available." />
            ) : (
              <div className="space-y-5">
                {paymentReport.map((payment) => {
                  const percentage =
                    maxPaymentRevenue > 0
                      ? (payment.revenue /
                        maxPaymentRevenue) *
                      100
                      : 0;

                  return (
                    <div key={payment.paymentMethod} className="gpu">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-zinc-950">
                            {payment.paymentMethod}
                          </p>

                          <p className="mt-0.5 text-base text-zinc-500">
                            {payment.transactions.toLocaleString()}{" "}
                            transaction
                            {payment.transactions !== 1
                              ? "s"
                              : ""}
                          </p>
                        </div>

                        <p className="text-lg font-black text-zinc-950 number-transition">
                          {formatCurrency(payment.revenue)}
                        </p>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-zinc-700 transition-all duration-700 ease-out gpu"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Daily Sales - Blurred */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm gpu blur-sm select-none pointer-events-none">
        <div className="border-b border-zinc-100 p-6">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Activity</p>
          <h2 className="mt-0.5 text-2xl font-black text-zinc-950">
            Daily Sales
          </h2>

          <p className="mt-0.5 text-lg text-zinc-400">
            Revenue and transaction activity by day.
          </p>
        </div>

        <div className="overflow-x-auto gpu-scroll">
          {dailyReport.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No daily sales available." />
            </div>
          ) : (
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-zinc-100 text-base uppercase tracking-wide text-zinc-500">
                  <th className="px-6 py-4 font-bold">
                    Date
                  </th>

                  <th className="px-6 py-4 text-right font-bold">
                    Transactions
                  </th>

                  <th className="px-6 py-4 text-right font-bold">
                    Units
                  </th>

                  <th className="px-6 py-4 text-right font-bold">
                    Revenue
                  </th>
                </tr>
              </thead>

              <tbody>
                {dailyReport.map((day) => {
                  const percentage =
                    maxDailyRevenue > 0
                      ? (day.revenue / maxDailyRevenue) * 100
                      : 0;

                  return (
                    <tr
                      key={day.date}
                      className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors duration-150 gpu"
                    >
                      <td className="px-6 py-4">
                        <p className="text-lg font-bold text-zinc-950">
                          {formatDate(day.date)}
                        </p>

                        <div className="mt-2 h-1.5 max-w-48 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-900 transition-all duration-700 ease-out gpu"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right text-lg text-zinc-700 number-transition">
                        {day.transactions.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-right text-lg text-zinc-700 number-transition">
                        {day.units.toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-right text-lg font-bold text-zinc-950 number-transition">
                        {formatCurrency(day.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Recent Sales - Blurred */}
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm gpu blur-sm select-none pointer-events-none">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 p-6">
          <div>
            <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Recent</p>
            <h2 className="mt-0.5 text-2xl font-black text-zinc-950">
              Recent Sales
            </h2>

            <p className="mt-0.5 text-lg text-zinc-400">
              Latest transactions recorded in the system.
            </p>
          </div>

          <a
            href="/sales/history"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-lg font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
          >
            View all
          </a>
        </div>

        <div className="divide-y divide-zinc-100">
          {sales.slice(0, 5).map((sale) => (
            <a
              key={sale.id}
              href={`/sales/${sale.id}`}
              className="flex items-center justify-between gap-4 p-6 transition hover:bg-zinc-50 card-hover gpu"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xl font-bold text-zinc-950">
                    {sale.reference ||
                      `SALE-${String(sale.id).padStart(6, "0")}`}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-base font-bold text-emerald-700 status-badge status-in-stock">
                    {sale.status || "COMPLETED"}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-3 text-base text-zinc-500">
                  <span>{formatDate(sale.sale_date)}</span>
                  <span>·</span>
                  <span>
                    {getItemCount(sale)} unit
                    {getItemCount(sale) !== 1 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span className="font-medium text-zinc-700">
                    {sale.payment_method}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-zinc-950 number-transition">
                  {formatCurrency(sale.total)}
                </p>

                {Number(sale.discount || 0) > 0 && (
                  <p className="mt-0.5 text-base text-zinc-500">
                    Discount:{" "}
                    {formatCurrency(sale.discount)}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
