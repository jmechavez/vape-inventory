import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

type SaleItem = {
  id: number;
  sale_id: number;
  product_id: number;
  sku?: string;
  product_name?: string;
  brand?: string;
  version?: string;
  flavor?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Sale = {
  id: number;
  reference?: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  created_at: string;
  items?: SaleItem[];
};

const API_URL = import.meta.env.VITE_API_URL;

const RECEIPT_COMPANY_NAME = "";
const RECEIPT_COMPANY_ADDRESS = "";
const RECEIPT_MESSAGE = "Thank you for your purchase!";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function receiptMoney(value: number) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSaleReference(sale: Sale) {
  return sale.reference ?? `SALE-${String(sale.id).padStart(6, "0")}`;
}

function getItemCount(sale: Sale) {
  return (sale.items ?? []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}

function getProductDetails(item: SaleItem) {
  return [item.version, item.flavor]
    .filter(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    )
    .map((value) => String(value).trim())
    .join(" • ");
}

function printReceipt(sale: Sale) {
  const reference = getSaleReference(sale);

  const companyLines = [
    RECEIPT_COMPANY_NAME.trim(),
    RECEIPT_COMPANY_ADDRESS.trim(),
  ].filter(Boolean);

  const companyBlock = companyLines
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");

  const itemsHtml = (sale.items ?? [])
    .map((item) => {
      const details = getProductDetails(item);

      return `
        <div class="item">
          <div class="item-name">${escapeHtml(item.product_name || "Product")}</div>
          ${details ? `<div class="item-details">${escapeHtml(details)}</div>` : ""}
          <div class="item-code">Item Code: ${escapeHtml(item.sku || "-")}</div>
          <div class="item-row">
            <span>${Number(item.quantity)} x ${receiptMoney(Number(item.unit_price))}</span>
            <strong>${receiptMoney(Number(item.subtotal))}</strong>
          </div>
        </div>
      `;
    })
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(reference)}</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; width: 100%; font-family: "Courier New", Courier, monospace; font-size: 12px; line-height: 1.4; color: #000; background: #fff; }
          .receipt { width: 100%; max-width: 72mm; margin: 0 auto; }
          .center { text-align: center; }
          .company { font-weight: bold; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: bold; letter-spacing: 1px; margin: 8px 0; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .double-line { border-top: 2px solid #000; margin: 8px 0; }
          .meta-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
          .meta-label { white-space: nowrap; }
          .meta-value { text-align: right; word-break: break-word; }
          .section-title { font-weight: bold; margin: 8px 0 4px; }
          .item { padding: 6px 0; }
          .item-name { font-weight: bold; }
          .item-details { font-size: 10px; margin-top: 2px; color: #333; }
          .item-code { font-size: 10px; margin-top: 2px; }
          .item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-top: 3px; }
          .total { font-size: 15px; font-weight: bold; }
          .thank-you { margin-top: 14px; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div class="receipt">
          ${companyBlock ? `<div class="company center">${companyBlock}</div>` : ""}
          <div class="title center">RECEIPT</div>
          <div class="double-line"></div>
          <div class="meta-row"><span class="meta-label">Sale Reference:</span><span class="meta-value">${escapeHtml(reference)}</span></div>
          <div class="meta-row"><span class="meta-label">Transaction ID:</span><span class="meta-value">#${sale.id}</span></div>
          <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">${escapeHtml(formatReceiptDate(sale.sale_date))}</span></div>
          <div class="meta-row"><span class="meta-label">Payment:</span><span class="meta-value">${escapeHtml(sale.payment_method)}</span></div>
          <div class="double-line"></div>
          <div class="section-title">ITEMS</div>
          <div class="line"></div>
          ${itemsHtml}
          <div class="line"></div>
          <div class="meta-row"><span>Subtotal:</span><span>${receiptMoney(Number(sale.subtotal))}</span></div>
          <div class="meta-row"><span>Discount:</span><span>-${receiptMoney(Number(sale.discount))}</span></div>
          <div class="double-line"></div>
          <div class="meta-row total"><span>TOTAL:</span><span>${receiptMoney(Number(sale.total))}</span></div>
          <div class="double-line"></div>
          <div class="thank-you">${escapeHtml(RECEIPT_MESSAGE)}</div>
        </div>
        <script>
          window.onload = function () { window.print(); };
          window.onafterprint = function () { window.close(); };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=420,height=700");

  if (!printWindow) {
    alert("Please allow pop-ups to print the receipt.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// Loading Skeleton
function SaleDetailsSkeleton() {
  return (
    <div className="flex-1 flex flex-col gpu">
      {/* Header Skeleton */}
      <div className="mb-4">
        <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse"></div>
        <div className="mt-1 h-10 w-56 bg-zinc-200 rounded animate-pulse"></div>
        <div className="mt-1 h-5 w-72 bg-zinc-200 rounded animate-pulse"></div>
      </div>

      {/* Main Card Skeleton */}
      <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-5 border-b border-zinc-200 animate-pulse">
          <div className="flex justify-between">
            <div>
              <div className="h-4 w-28 bg-zinc-200 rounded"></div>
              <div className="mt-1 h-7 w-48 bg-zinc-200 rounded"></div>
              <div className="mt-1 h-5 w-36 bg-zinc-200 rounded"></div>
            </div>
            <div className="text-right">
              <div className="h-4 w-20 bg-zinc-200 rounded ml-auto"></div>
              <div className="mt-1 h-8 w-28 bg-zinc-200 rounded ml-auto"></div>
            </div>
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-4 gap-px bg-zinc-200 p-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-3">
              <div className="h-4 w-20 bg-zinc-200 rounded"></div>
              <div className="mt-1 h-5 w-24 bg-zinc-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Items List Skeleton */}
        <div className="p-5">
          <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse"></div>
          <div className="mt-3 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between p-4 border border-zinc-100 rounded animate-pulse">
                <div className="flex-1">
                  <div className="h-5 w-36 bg-zinc-200 rounded"></div>
                  <div className="mt-1 h-4 w-28 bg-zinc-200 rounded"></div>
                </div>
                <div className="text-right">
                  <div className="h-5 w-24 bg-zinc-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SaleDetailsPage() {
  const { id } = useParams();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    async function loadSale() {
      try {
        setLoading(true);
        setError("");
        if (!id) {
          throw new Error("Sale ID is missing.");
        }
        const response = await fetch(`${API_URL}/api/sales/${id}`);
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to load sale.");
        }
        const data: Sale = await response.json();
        setSale(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sale.");
      } finally {
        setLoading(false);
      }
    }
    loadSale();
  }, [id]);

  const itemCount = useMemo(() => {
    if (!sale) return 0;
    return getItemCount(sale);
  }, [sale]);

  function viewReceipt() {
    if (!sale) return;
    setShowReceipt(true);
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <SaleDetailsSkeleton />
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="h-full flex flex-col gpu">
        <header className="mb-4 shrink-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Sales</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Sale Details</h1>
          <p className="mt-1 text-lg text-zinc-500">View transaction information and receipt.</p>
        </header>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4 shrink-0 animate-fade-in gpu">
          <p className="text-base font-medium text-red-700">{error || "Sale not found."}</p>
        </div>
        <Link
          to="/sales"
          className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
        >
          ← Back to Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gpu">
      {/* Header */}
      <header className="mb-4 shrink-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Sales</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Sale Details</h1>
        <p className="mt-1 text-lg text-zinc-500">View transaction information and receipt.</p>
      </header>

      {/* Sale Summary */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm card-hover gpu">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Transaction</p>
              <h2 className="mt-0.5 font-mono text-xl font-black text-zinc-950">
                {getSaleReference(sale)}
              </h2>
              <p className="mt-0.5 text-base text-zinc-400">Transaction ID #{sale.id}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Total</p>
              <p className="mt-0.5 text-3xl font-black text-zinc-950 number-transition">
                {formatCurrency(Number(sale.total))}
              </p>
            </div>
          </div>

          {/* Transaction Information */}
          <div className="grid grid-cols-2 gap-px border-b border-zinc-200 bg-zinc-200 sm:grid-cols-4">
            <div className="bg-white p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Date</p>
              <p className="mt-1 text-base font-bold text-zinc-900">{formatDate(sale.sale_date)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Payment</p>
              <p className="mt-1 text-base font-bold text-zinc-900">{sale.payment_method}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Items</p>
              <p className="mt-1 text-base font-bold text-zinc-900">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Created</p>
              <p className="mt-1 text-base font-bold text-zinc-900">{formatDate(sale.created_at)}</p>
            </div>
          </div>

          {/* Items */}
          <div className="p-5">
            <div className="mb-3">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Products</p>
              <h3 className="mt-0.5 text-lg font-black text-zinc-950">Purchased Products</h3>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="hidden grid-cols-[1fr_140px_120px_140px] border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-base font-bold uppercase tracking-wider text-zinc-400 sm:grid">
                <span>Product</span>
                <span>Unit Price</span>
                <span>Quantity</span>
                <span className="text-right">Subtotal</span>
              </div>

              <div className="divide-y divide-zinc-100">
                {(sale.items ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_140px_120px_140px] sm:items-center hover:bg-zinc-50 transition-colors duration-150 gpu"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-zinc-950">
                        {item.product_name || "Product"}
                      </p>
                      <p className="mt-0.5 font-mono text-sm text-zinc-400">
                        {item.sku || "-"}
                      </p>
                      {getProductDetails(item) && (
                        <p className="mt-0.5 text-base text-zinc-500">
                          {getProductDetails(item)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-zinc-400 sm:hidden">
                        Unit Price
                      </p>
                      <p className="mt-0.5 text-base font-bold text-zinc-900 sm:mt-0">
                        {formatCurrency(Number(item.unit_price))}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-zinc-400 sm:hidden">
                        Quantity
                      </p>
                      <p className="mt-0.5 text-base font-bold text-zinc-900 sm:mt-0">
                        {Number(item.quantity)}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-sm font-bold uppercase tracking-wider text-zinc-400 sm:hidden">
                        Subtotal
                      </p>
                      <p className="mt-0.5 text-base font-black text-zinc-950 sm:mt-0 number-transition">
                        {formatCurrency(Number(item.subtotal))}
                      </p>
                    </div>
                  </div>
                ))}

                {(sale.items ?? []).length === 0 && (
                  <div className="px-4 py-6 text-center text-base text-zinc-400">
                    No items on this sale.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Totals + Actions */}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px] shrink-0">
          {/* Receipt Action */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-zinc-300">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Receipt</p>
            <h2 className="mt-0.5 text-lg font-black text-zinc-950">Transaction Receipt</h2>
            <p className="mt-1 text-base text-zinc-500">View the receipt for this completed transaction.</p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/sales"
                className="inline-flex h-[48px] flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                ← Back
              </Link>
              <button
                type="button"
                onClick={viewReceipt}
                className="inline-flex h-[48px] flex-1 items-center justify-center rounded-xl bg-black px-5 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target btn-ripple gpu"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty('--x', x + 'px');
                  e.currentTarget.style.setProperty('--y', y + 'px');
                }}
              >
                View Receipt
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:border-zinc-300">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Summary</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-base">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-bold text-zinc-900 number-transition">
                  {formatCurrency(Number(sale.subtotal))}
                </span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-zinc-500">Discount</span>
                <span className="font-bold text-zinc-900 number-transition">
                  − {formatCurrency(Number(sale.discount))}
                </span>
              </div>
              <div className="border-t border-zinc-200 pt-3">
                <div className="flex items-end justify-between">
                  <span className="text-sm font-bold uppercase tracking-wider text-zinc-500">Total</span>
                  <span className="text-2xl font-black text-zinc-950 number-transition">
                    {formatCurrency(Number(sale.total))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in backdrop-gpu gpu">
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-up gpu">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 p-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Completed</p>
                <h2 className="mt-0.5 text-xl font-black text-zinc-950">Sale Receipt</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-xl text-zinc-500 hover:bg-zinc-100 touch-feedback gpu"
              >
                ×
              </button>
            </div>

            {/* Receipt */}
            <div className="max-h-[65vh] overflow-y-auto p-5 gpu-scroll">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 font-mono text-sm text-zinc-900">
                {RECEIPT_COMPANY_NAME && (
                  <div className="text-center font-bold">{RECEIPT_COMPANY_NAME}</div>
                )}
                {RECEIPT_COMPANY_ADDRESS && (
                  <div className="mt-1 text-center text-zinc-500">{RECEIPT_COMPANY_ADDRESS}</div>
                )}
                <div className="py-3 text-center text-lg font-black">RECEIPT</div>

                <div className="border-t border-dashed border-zinc-400 pt-3">
                  <div className="flex justify-between gap-3">
                    <span>Sale Reference:</span>
                    <span className="text-right font-bold">{getSaleReference(sale)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>Transaction ID:</span>
                    <span>#{sale.id}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>Date:</span>
                    <span className="text-right">{formatReceiptDate(sale.sale_date)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>Payment:</span>
                    <span>{sale.payment_method}</span>
                  </div>
                </div>

                <div className="my-3 border-t border-dashed border-zinc-400" />
                <p className="font-black">ITEMS</p>
                <div className="mt-2 space-y-4">
                  {(sale.items ?? []).map((item) => {
                    const details = getProductDetails(item);
                    return (
                      <div key={item.id}>
                        <p className="font-bold">{item.product_name || "Product"}</p>
                        {details && (
                          <p className="mt-0.5 text-sm font-semibold text-zinc-500">{details}</p>
                        )}
                        <p className="mt-1 text-sm text-zinc-500">Item Code: {item.sku || "-"}</p>
                        <div className="mt-1 flex justify-between gap-3">
                          <span>
                            {Number(item.quantity)} x {receiptMoney(Number(item.unit_price))}
                          </span>
                          <span className="font-bold">{receiptMoney(Number(item.subtotal))}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="my-3 border-t border-dashed border-zinc-400" />
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{receiptMoney(Number(sale.subtotal))}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Discount:</span>
                  <span>-{receiptMoney(Number(sale.discount))}</span>
                </div>
                <div className="my-3 border-t-2 border-zinc-900" />
                <div className="flex justify-between text-base font-black">
                  <span>TOTAL:</span>
                  <span>{receiptMoney(Number(sale.total))}</span>
                </div>
                <div className="my-3 border-t-2 border-zinc-900" />
                <p className="text-center font-bold">{RECEIPT_MESSAGE}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid gap-2 border-t border-zinc-200 p-5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => printReceipt(sale)}
                className="inline-flex h-[48px] items-center justify-center rounded-xl bg-black px-5 text-base font-bold text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target btn-ripple gpu"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty('--x', x + 'px');
                  e.currentTarget.style.setProperty('--y', y + 'px');
                }}
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="inline-flex h-[48px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-bold text-zinc-700 hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
