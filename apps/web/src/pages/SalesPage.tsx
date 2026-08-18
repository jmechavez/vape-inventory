import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Product = {
  id: number;
  sku: string;
  name: string;
  brand?: string;
  version?: string;
  flavor?: string;
  selling_price: number;
  minimum_stock: number;
};

type InventoryItem = {
  product_id: number;
  sku: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
};

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

type CartItem = {
  product: Product;
  quantity: number;
};

const API_URL = "http://localhost:8080";

const RECEIPT_COMPANY_NAME = "";
const RECEIPT_COMPANY_ADDRESS = "";
const RECEIPT_MESSAGE = "Thank you for your purchase!";

const PAYMENT_METHODS = [
  "CASH",
  "GCASH",
  "MAYA",
  "MARIBANK",
  "BANK_TRANSFER",
  "CARD",
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Quick quantity presets for faster input
const QUICK_QUANTITIES = [1, 2, 3, 5, 10];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
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

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getItemCount(sale: Sale) {
  return (sale.items ?? []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}

function getSaleReference(sale: Sale) {
  return sale.reference ?? `SALE-${String(sale.id).padStart(6, "0")}`;
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
  const companyLines = [RECEIPT_COMPANY_NAME.trim(), RECEIPT_COMPANY_ADDRESS.trim()].filter(Boolean);
  const companyBlock = companyLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");

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

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleDate, setSaleDate] = useState(toDateTimeLocalValue(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState("0");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showConfirmSaleModal, setShowConfirmSaleModal] = useState(false);

  function getStock(productID: number) {
    const item = inventory.find((inventoryItem) => inventoryItem.product_id === productID);
    return item ? Number(item.current_stock) : 0;
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/inventory`),
      ]);
      if (!productsResponse.ok) throw new Error(`Products API error: ${await productsResponse.text()}`);
      if (!inventoryResponse.ok) throw new Error(`Inventory API error: ${await inventoryResponse.text()}`);
      const productsData: Product[] = await productsResponse.json();
      const inventoryData: InventoryItem[] = await inventoryResponse.json();
      setProducts(Array.isArray(productsData) ? productsData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSales() {
    try {
      setLoadingSales(true);
      const response = await fetch(`${API_URL}/api/sales`);
      if (!response.ok) throw new Error(await response.text());
      const data: Sale[] = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load sales.");
    } finally {
      setLoadingSales(false);
    }
  }

  // Combined refresh function like Dashboard
  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([loadProducts(), loadSales()]);
    setTimeout(() => setIsRefreshing(false), 500);
  }

  useEffect(() => {
    loadProducts();
    loadSales();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    if (!showForm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to complete sale
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (cart.length > 0) {
          e.preventDefault();
          setShowConfirmSaleModal(true);
        }
      }
      // Escape to close form
      if (e.key === 'Escape') {
        if (showClearCartModal) {
          setShowClearCartModal(false);
        } else if (showConfirmSaleModal) {
          setShowConfirmSaleModal(false);
        } else {
          closeForm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, cart, showClearCartModal, showConfirmSaleModal]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return [product.sku, product.name, product.brand, product.version, product.flavor]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [products, search]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
      .slice(0, 5);
  }, [sales]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => total + Number(item.product.selling_price) * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const value = Number(discount);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }, [discount]);

  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  function openNewSale() {
    setError("");
    setSuccessMessage("");
    setCart([]);
    setSearch("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setSaleDate(toDateTimeLocalValue(new Date()));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    if (submitting) return;
    setShowForm(false);
    setCart([]);
    setSearch("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setError("");
    setShowClearCartModal(false);
    setShowConfirmSaleModal(false);
  }

  function clearCart() {
    if (cart.length === 0) return;
    setShowClearCartModal(true);
  }

  function confirmClearCart() {
    setCart([]);
    setShowClearCartModal(false);
  }

  function handleCompleteSale() {
    if (cart.length === 0) return;
    setShowConfirmSaleModal(true);
  }

  async function confirmCompleteSale() {
    setShowConfirmSaleModal(false);
    const form = document.querySelector('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }

  function addToCart(product: Product) {
    setError("");
    setSuccessMessage("");
    const stock = getStock(product.id);
    if (stock <= 0) {
      setError(`${product.name} is out of stock.`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= stock) {
        setError(`Only ${stock} unit${stock === 1 ? "" : "s"} of ${product.name} available.`);
        setTimeout(() => setError(""), 3000);
        return;
      }
      setCart((current) =>
        current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
      return;
    }
    setCart((current) => [...current, { product, quantity: 1 }]);
  }

  function changeQuantity(productID: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productID);
      return;
    }
    const stock = getStock(productID);
    if (quantity > stock) {
      setError(`Only ${stock} unit${stock === 1 ? "" : "s"} available.`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    setCart((current) =>
      current.map((item) => (item.product.id === productID ? { ...item, quantity } : item)),
    );
  }

  function removeFromCart(productID: number) {
    setCart((current) => current.filter((item) => item.product.id !== productID));
  }

  // Swipe to remove handlers
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<{ [key: number]: number }>({});

  function handleTouchStart(event: React.TouchEvent, productId: number) {
    setSwipeStartX(event.touches[0].clientX);
    setSwipeOffset((prev) => ({ ...prev, [productId]: 0 }));
  }

  function handleTouchMove(event: React.TouchEvent, productId: number) {
    if (swipeStartX === null) return;
    const currentX = event.touches[0].clientX;
    const diff = currentX - swipeStartX;
    if (diff < 0) {
      const offset = Math.max(diff, -80);
      setSwipeOffset((prev) => ({ ...prev, [productId]: offset }));
    }
  }

  function handleTouchEnd(productId: number) {
    setSwipeStartX(null);
    const offset = swipeOffset[productId] || 0;
    if (offset < -40) {
      removeFromCart(productId);
    }
    setSwipeOffset((prev) => ({ ...prev, [productId]: 0 }));
  }

  async function createSale(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setError("Add at least one product to the sale.");
      return;
    }

    for (const item of cart) {
      const currentStock = getStock(item.product.id);
      if (item.quantity > currentStock) {
        setError(`${item.product.name} only has ${currentStock} unit${currentStock === 1 ? "" : "s"} available.`);
        return;
      }
      if (currentStock <= 0) {
        setError(`${item.product.name} is out of stock.`);
        return;
      }
    }

    const numericDiscount = Number(discount);
    if (!Number.isFinite(numericDiscount) || numericDiscount < 0) {
      setError("Discount cannot be negative.");
      return;
    }
    if (numericDiscount > cartSubtotal) {
      setError("Discount cannot be greater than the subtotal.");
      return;
    }
    if (!paymentMethod) {
      setError("Payment method is required.");
      return;
    }

    const selectedDate = new Date(saleDate);
    if (Number.isNaN(selectedDate.getTime())) {
      setError("Invalid sale date.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        sale_date: selectedDate.toISOString(),
        discount: numericDiscount,
        payment_method: paymentMethod,
      };

      const response = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const createdSale: Sale = await response.json();

      const receiptItems: SaleItem[] = cart.map((cartItem, index) => {
        const returnedItem = (createdSale.items ?? []).find(
          (item) => Number(item.product_id) === cartItem.product.id,
        );
        const quantity = returnedItem ? Number(returnedItem.quantity) : cartItem.quantity;
        const unitPrice = returnedItem ? Number(returnedItem.unit_price) : Number(cartItem.product.selling_price);
        const subtotal = returnedItem ? Number(returnedItem.subtotal) : unitPrice * quantity;

        return {
          id: returnedItem?.id ?? index + 1,
          sale_id: createdSale.id,
          product_id: cartItem.product.id,
          sku: returnedItem?.sku ?? cartItem.product.sku,
          product_name: returnedItem?.product_name ?? cartItem.product.name,
          brand: returnedItem?.brand ?? cartItem.product.brand,
          version: returnedItem?.version ?? cartItem.product.version,
          flavor: returnedItem?.flavor ?? cartItem.product.flavor,
          quantity,
          unit_price: unitPrice,
          subtotal,
        };
      });

      const saleForReceipt: Sale = {
        ...createdSale,
        items: receiptItems,
        subtotal: Number(createdSale.subtotal ?? cartSubtotal),
        discount: Number(createdSale.discount ?? numericDiscount),
        total: Number(createdSale.total ?? cartTotal),
        payment_method: createdSale.payment_method ?? paymentMethod,
        sale_date: createdSale.sale_date ?? selectedDate.toISOString(),
      };

      await Promise.all([loadProducts(), loadSales()]);
      setShowForm(false);
      setCart([]);
      setSearch("");
      setDiscount("0");
      setPaymentMethod("CASH");
      setSaleDate(toDateTimeLocalValue(new Date()));
      setSuccessMessage(`Sale ${getSaleReference(saleForReceipt)} created successfully.`);
      setReceiptSale(saleForReceipt);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create sale.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalSales = useMemo(() => {
    return sales.reduce((total, sale) => total + Number(sale.total || 0), 0);
  }, [sales]);

  const transactionCount = sales.length;

  const todaySales = useMemo(() => {
    const today = new Date();
    return sales
      .filter((sale) => {
        const date = new Date(sale.sale_date);
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      })
      .reduce((total, sale) => total + Number(sale.total || 0), 0);
  }, [sales]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-full flex flex-col gpu">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Sales</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Sales</h1>
          <p className="mt-1 text-lg text-zinc-500">Record sales and track your transaction history.</p>
        </div>
        <div className="flex gap-2">
          {!showForm && (
            <button
              type="button"
              onClick={openNewSale}
              className="inline-flex h-[44px] items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
            >
              + New Sale
            </button>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || loadingSales || isRefreshing}
            className="inline-flex h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
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

      {/* Success */}
      {successMessage && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-base font-medium text-zinc-900 shadow-sm mb-3 shrink-0 animate-fade-in gpu">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-black" />
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && !showForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700 mb-3 shrink-0 animate-fade-in gpu">
          {error}
        </div>
      )}

      {/* Statistics - Extra Large Fonts */}
      {!showForm && (
        <div className="grid grid-cols-3 gap-3 mb-4 shrink-0 animate-fade-in-up">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300">
            <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Sales Today</p>
            <p className="mt-2 text-3xl font-black text-zinc-950 number-transition">{formatCurrency(todaySales)}</p>
            <p className="mt-1 text-lg text-zinc-400">Today's revenue</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300">
            <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Total Sales</p>
            <p className="mt-2 text-3xl font-black text-zinc-950 number-transition">{formatCurrency(totalSales)}</p>
            <p className="mt-1 text-lg text-zinc-400">All time revenue</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm card-hover gpu transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-zinc-300">
            <p className="text-base font-bold uppercase tracking-[0.2em] text-zinc-400">Transactions</p>
            <p className="mt-2 text-3xl font-black text-zinc-950 number-transition">{transactionCount}</p>
            <p className="mt-1 text-lg text-zinc-400">Total sales</p>
          </div>
        </div>
      )}

      {/* New Sale Form */}
      {showForm && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm flex-1 flex flex-col overflow-hidden gpu">
            <form onSubmit={createSale} className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Transaction</p>
                  <h2 className="mt-0.5 text-xl font-black text-zinc-950">New Sale</h2>
                  <p className="mt-0.5 text-base text-zinc-500">
                    {cart.length} items • {totalCartItems} units • Total: {formatCurrency(cartTotal)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    ⌘+Enter to complete • Esc to close
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-xl text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50 touch-feedback gpu"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-base font-medium text-red-700 shrink-0 animate-fade-in gpu">
                  {error}
                </div>
              )}

              {/* Main Form */}
              <div className="flex-1 overflow-hidden grid gap-5 p-5 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
                {/* Left: Product Selection */}
                <div className="flex flex-col min-h-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Products</p>
                      <h3 className="mt-0.5 text-lg font-black text-zinc-950">Add Products</h3>
                    </div>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search product..."
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-zinc-200 sm:max-w-xs tap-target gpu"
                    />
                  </div>

                  {/* Product Grid */}
                  <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-2 gpu-scroll">
                    {loading ? (
                      <div className="rounded-xl border border-zinc-200 p-8 text-center gpu">
                        <div className="relative mx-auto mb-3">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 gpu">
                            <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin gpu"></div>
                          </div>
                        </div>
                        <p className="text-base text-zinc-500">Loading products...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="rounded-xl border border-zinc-200 p-8 text-center">
                        <p className="text-base font-medium text-zinc-500">No products found.</p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const stock = getStock(product.id);
                        const cartItem = cart.find((item) => item.product.id === product.id);
                        const remainingStock = Math.max(0, stock - (cartItem?.quantity ?? 0));
                        const isOutOfStock = stock <= 0;
                        const isLowStock = stock <= Number(product.minimum_stock || 0);

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock || remainingStock <= 0}
                            className={[
                              "w-full rounded-xl border bg-white p-4 text-left transition touch-feedback gpu card-hover",
                              isOutOfStock || remainingStock <= 0
                                ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60"
                                : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="truncate text-base font-black text-zinc-950">{product.name}</h4>
                                  {product.version && (
                                    <span className="rounded bg-black px-2 py-0.5 text-xs font-bold uppercase text-white">
                                      {product.version}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-zinc-500">
                                  {product.sku}
                                  {product.flavor ? ` • ${product.flavor}` : ""}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                                    Available
                                  </span>
                                  <span
                                    className={[
                                      "rounded px-2 py-0.5 text-sm font-black status-badge",
                                      isOutOfStock
                                        ? "bg-red-100 text-red-700 status-out-of-stock"
                                        : isLowStock
                                          ? "bg-amber-100 text-amber-700 status-low-stock"
                                          : "bg-emerald-100 text-emerald-700 status-in-stock",
                                    ].join(" ")}
                                  >
                                    {isOutOfStock ? "Out of stock" : stock}
                                  </span>
                                  {cartItem && !isOutOfStock && (
                                    <span className="text-sm font-semibold text-zinc-400">
                                      {cartItem.quantity} in cart
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-base font-black text-zinc-950">
                                  {formatCurrency(Number(product.selling_price))}
                                </p>
                                <p
                                  className={[
                                    "mt-0.5 text-sm font-bold uppercase tracking-wider",
                                    isOutOfStock
                                      ? "text-red-600"
                                      : remainingStock <= 0
                                        ? "text-zinc-400"
                                        : "text-zinc-500",
                                  ].join(" ")}
                                >
                                  {isOutOfStock ? "Unavailable" : remainingStock <= 0 ? "Max" : cartItem ? "+1" : "Add"}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Cart & Checkout */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col h-full min-h-0 gpu">
                  {/* Cart Header */}
                  <div className="border-b border-zinc-200 p-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Cart</p>
                        <p className="mt-0.5 text-xl font-black text-zinc-950">
                          {totalCartItems}{" "}
                          <span className="font-normal text-zinc-400">units</span>
                          <span className="mx-2 text-zinc-300">•</span>
                          {cart.length} <span className="font-normal text-zinc-400">items</span>
                        </p>
                      </div>
                      {cart.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCart}
                          className="text-sm font-bold text-red-600 hover:text-red-800 tap-target touch-feedback gpu"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cart Items - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 gpu-scroll">
                    {cart.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center animate-fade-in gpu">
                        <p className="text-base font-semibold text-zinc-500">Cart is empty</p>
                        <p className="mt-1 text-sm text-zinc-400">Select a product to add it.</p>
                      </div>
                    ) : (
                      cart.map((item) => {
                        const stock = getStock(item.product.id);
                        const offset = swipeOffset[item.product.id] || 0;

                        return (
                          <div
                            key={item.product.id}
                            className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-transform duration-200 gpu"
                            style={{ transform: `translateX(${offset}px)` }}
                            onTouchStart={(e) => handleTouchStart(e, item.product.id)}
                            onTouchMove={(e) => handleTouchMove(e, item.product.id)}
                            onTouchEnd={() => handleTouchEnd(item.product.id)}
                          >
                            <div className="absolute right-0 top-0 flex h-full w-20 items-center justify-center bg-red-500">
                              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </div>

                            <div className="relative bg-white p-4">
                              <div className="flex justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-base font-bold text-zinc-950">{item.product.name}</p>
                                  <p className="mt-0.5 text-sm text-zinc-400">{item.product.sku}</p>
                                  {(item.product.version || item.product.flavor) && (
                                    <p className="mt-0.5 text-sm text-zinc-500">
                                      {[item.product.version, item.product.flavor].filter(Boolean).join(" • ")}
                                    </p>
                                  )}
                                  <p className="mt-0.5 text-sm font-bold text-zinc-400">
                                    Available:{" "}
                                    <span
                                      className={
                                        stock <= Number(item.product.minimum_stock || 0) ? "text-amber-600" : "text-zinc-600"
                                      }
                                    >
                                      {stock}
                                    </span>
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-sm font-bold text-red-600 hover:text-red-800 tap-target touch-feedback gpu"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center rounded-lg border border-zinc-200">
                                    <button
                                      type="button"
                                      onClick={() => changeQuantity(item.product.id, item.quantity - 1)}
                                      className="px-3 py-1.5 text-base font-bold text-zinc-600 hover:bg-zinc-100 tap-target touch-feedback gpu"
                                    >
                                      −
                                    </button>
                                    <span className="min-w-10 text-center text-base font-black number-transition">{item.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => changeQuantity(item.product.id, item.quantity + 1)}
                                      disabled={item.quantity >= stock}
                                      className="px-3 py-1.5 text-base font-bold text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 tap-target touch-feedback gpu"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <div className="hidden gap-1 sm:flex">
                                    {QUICK_QUANTITIES.map((qty) => (
                                      <button
                                        key={qty}
                                        type="button"
                                        onClick={() => changeQuantity(item.product.id, qty)}
                                        disabled={qty > stock}
                                        className="rounded border border-zinc-200 px-2.5 py-1 text-sm font-bold text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 tap-target touch-feedback gpu"
                                      >
                                        {qty}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-base font-black text-zinc-950 number-transition">
                                  {formatCurrency(Number(item.product.selling_price) * item.quantity)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Cart Footer */}
                  <div className="border-t border-zinc-200 p-4 shrink-0">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-zinc-400">
                        Sale Date
                      </span>
                      <input
                        required
                        type="datetime-local"
                        value={saleDate}
                        onChange={(event) => setSaleDate(event.target.value)}
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 tap-target gpu"
                      />
                    </label>

                    <label className="mt-3 block">
                      <span className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-zinc-400">
                        Payment Method
                      </span>
                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                        disabled={submitting}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base font-semibold outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 tap-target gpu"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="mt-3 block">
                      <span className="mb-1.5 block text-sm font-bold uppercase tracking-wider text-zinc-400">
                        Discount
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                        disabled={submitting}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-base outline-none focus:border-black focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 tap-target gpu"
                      />
                    </label>

                    <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4">
                      <div className="flex justify-between text-base">
                        <span className="text-zinc-500">Subtotal</span>
                        <span className="font-bold text-zinc-900 number-transition">{formatCurrency(cartSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="text-zinc-500">Discount</span>
                        <span className="font-bold text-zinc-900 number-transition">− {formatCurrency(discountAmount)}</span>
                      </div>
                      <div className="flex items-end justify-between border-t border-zinc-200 pt-3">
                        <span className="text-base font-bold uppercase tracking-wider text-zinc-500">Total</span>
                        <span className="text-2xl font-black text-zinc-950 number-transition">{formatCurrency(cartTotal)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={handleCompleteSale}
                        disabled={submitting || cart.length === 0}
                        className="inline-flex h-[52px] items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 tap-target btn-ripple gpu"
                        onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          e.currentTarget.style.setProperty('--x', x + 'px');
                          e.currentTarget.style.setProperty('--y', y + 'px');
                        }}
                      >
                        {submitting ? "Creating Sale..." : "Complete Sale"}
                      </button>
                      <button
                        type="button"
                        onClick={closeForm}
                        disabled={submitting}
                        className="inline-flex h-[52px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-target touch-feedback gpu"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Sales - Extra Large Fonts */}
      {!showForm && (
        <section className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Transactions</p>
              <h2 className="mt-0.5 text-xl font-black text-zinc-950">Recent Sales</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSales}
                disabled={loadingSales}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                {loadingSales ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Refresh"
                )}
              </button>
              <Link
                to="/sales/history"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                View All
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm gpu-scroll">
            {loadingSales ? (
              <div className="flex items-center justify-center p-8 gpu">
                <div className="relative">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 gpu">
                    <div className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin gpu"></div>
                  </div>
                  <p className="mt-3 text-base text-zinc-500">Loading sales...</p>
                </div>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="p-10 text-center">
                <h3 className="text-xl font-black text-zinc-950">No sales yet</h3>
                <p className="mt-1 text-base text-zinc-500">Create your first sale above to see it here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentSales.map((sale) => (
                  <Link
                    key={sale.id}
                    to={`/sales/${sale.id}`}
                    className="flex items-center justify-between p-5 transition hover:bg-zinc-50 card-hover gpu"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-lg font-black text-zinc-950">
                          {getSaleReference(sale)}
                        </p>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-black text-zinc-700">
                          {sale.payment_method}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-base text-zinc-400">
                        <span>{formatDate(sale.sale_date)}</span>
                        <span>•</span>
                        <span className="font-medium">
                          {getItemCount(sale)} {getItemCount(sale) === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black text-zinc-950 number-transition">
                        {formatCurrency(Number(sale.total))}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in backdrop-gpu gpu">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in gpu">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-950">Clear Cart?</h3>
                  <p className="mt-1 text-base text-zinc-500">
                    This will remove all {totalCartItems} items from your cart. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowClearCartModal(false)}
                className="inline-flex h-[48px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearCart}
                className="inline-flex h-[48px] items-center justify-center rounded-xl bg-red-600 px-6 text-base font-bold text-white transition hover:bg-red-700 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Sale Modal */}
      {showConfirmSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in backdrop-gpu gpu">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col animate-slide-up gpu">
            <div className="border-b border-zinc-200 p-5 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-zinc-950">Review Order</h3>
                  <p className="mt-0.5 text-base text-zinc-500">
                    Please review the items before completing the sale.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmSaleModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-xl text-zinc-500 hover:bg-zinc-100 touch-feedback gpu"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 gpu-scroll">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 card-hover gpu">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black text-zinc-950">{item.product.name}</p>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {item.product.sku}
                        {item.product.version && ` • ${item.product.version}`}
                        {item.product.flavor && ` • ${item.product.flavor}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">{item.quantity} × {formatCurrency(item.product.selling_price)}</p>
                      <p className="text-base font-black text-zinc-950 number-transition">{formatCurrency(item.product.selling_price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-zinc-50 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-base">
                    <span className="text-zinc-500">Subtotal</span>
                    <span className="font-bold text-zinc-900 number-transition">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-zinc-500">Discount</span>
                    <span className="font-bold text-zinc-900 number-transition">− {formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="border-t border-zinc-200 pt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold text-zinc-900">Total</span>
                      <span className="text-2xl font-black text-zinc-950 number-transition">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-base text-zinc-500">
                    <span>Payment Method</span>
                    <span className="font-semibold text-zinc-700">{paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmSaleModal(false)}
                className="inline-flex h-[48px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmCompleteSale}
                className="inline-flex h-[48px] items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target btn-ripple gpu"
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty('--x', x + 'px');
                  e.currentTarget.style.setProperty('--y', y + 'px');
                }}
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in backdrop-gpu gpu">
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-up gpu">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Completed</p>
                <h2 className="mt-0.5 text-xl font-black text-zinc-950">Sale Receipt</h2>
              </div>
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-xl text-zinc-500 hover:bg-zinc-100 touch-feedback gpu"
              >
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5 gpu-scroll">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 font-mono text-sm text-zinc-900">
                {RECEIPT_COMPANY_NAME && <div className="text-center font-bold">{RECEIPT_COMPANY_NAME}</div>}
                {RECEIPT_COMPANY_ADDRESS && <div className="mt-1 text-center text-zinc-500">{RECEIPT_COMPANY_ADDRESS}</div>}
                <div className="py-3 text-center text-lg font-black">RECEIPT</div>
                <div className="border-t border-dashed border-zinc-400 pt-3">
                  <div className="flex justify-between gap-3">
                    <span>Sale Reference:</span>
                    <span className="text-right font-bold">{getSaleReference(receiptSale)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>Transaction ID:</span>
                    <span>#{receiptSale.id}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>Date:</span>
                    <span className="text-right">{formatReceiptDate(receiptSale.sale_date)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <span>Payment:</span>
                    <span>{receiptSale.payment_method}</span>
                  </div>
                </div>
                <div className="my-3 border-t border-dashed border-zinc-400" />
                <p className="font-black">ITEMS</p>
                <div className="mt-2 space-y-4">
                  {(receiptSale.items ?? []).map((item) => {
                    const details = getProductDetails(item);
                    return (
                      <div key={item.id}>
                        <p className="font-bold">{item.product_name || "Product"}</p>
                        {details && <p className="mt-0.5 text-sm font-semibold text-zinc-500">{details}</p>}
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
                  <span>{receiptMoney(Number(receiptSale.subtotal))}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Discount:</span>
                  <span>-{receiptMoney(Number(receiptSale.discount))}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-dashed border-zinc-400 pt-2 text-base font-bold">
                  <span>TOTAL:</span>
                  <span>{receiptMoney(Number(receiptSale.total))}</span>
                </div>
                <div className="mt-4 text-center text-sm font-semibold text-zinc-600">
                  {RECEIPT_MESSAGE}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-200 p-4 shrink-0 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => printReceipt(receiptSale)}
                className="inline-flex h-[48px] flex-1 items-center justify-center rounded-xl bg-black px-6 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
              >
                🖨️ Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setReceiptSale(null)}
                className="inline-flex h-[48px] flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-base font-bold text-zinc-700 transition hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
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
